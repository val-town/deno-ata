import { loadDependency } from "./loadDependency";
import { extractReferences } from "./extractReferences";
import { resolveImportSpecifier } from "./resolveSpecifiers";
import type { VirtualTypeScriptEnvironment } from "./vfs_utils";
import { urlToFilepath } from "./tsUrlInterop";

const NODE_FILE_PATH = "node_types.d.ts";
const NODE_FILE = `/// <reference types="npm:@types/node@20.11.20" />\n`;

/**
 * The function which starts up type acquisition,
 * returns a function which you then pass the initial
 * source code for the app with.
 *
 * This is effectively the main export, everything else is
 * basically exported for tests and should be considered
 * implementation details by consumers.
 */
export function setupTypeAcquisition(
  typescriptEnvironment: VirtualTypeScriptEnvironment,
) {
  const downloadedPaths = new Set<string>();

  let total = 0;
  let downloaded = 0;

  // Used for debugging
  const debugLinks: [string, string][] = [];
  const debugIds = new Map<string, number>();
  let debugCounter = 0;

  function getDebugId(url: string) {
    if (!debugIds.has(url)) {
      debugIds.set(url, debugCounter++);
    }
    return `   ${debugIds.get(url)}["${url}"]`;
  }

  return {
    async update(initialSourceFile: string, path: string) {
      total = 0;
      downloaded = 0;

      try {
        await resolveDeps(initialSourceFile, 0, path);
        if (downloaded > 0) {
          console.info("%cata finished", "color: green");
        }

        /*console.log(`flowchart TD
${debugLinks
  .map((link) => {
    return `${getDebugId(link[0])} --> ${getDebugId(link[1])}`;
  })
  .join("\n")}
`)*/
      } catch (e) {
        console.error(e);
      }
    },
    /**
     * Generally used when someone has saved a val in
     * another tab, we want to clear the moduleMap so that
     * the next call to `update()` will re-fetch modules and
     * get current versions.
     */
    refetch() {
      downloadedPaths.clear();
    },
  };

  /**
   * NOTE: this is a recursive function - we track its
   * recursive depth with the recursive parameter.
   */
  async function resolveDeps(
    code: string,
    depth: number,
    fromUrl: string,
  ): Promise<void> {
    await Promise.all(
      extractReferences(code).map(async (importSpecifier) => {
        debugLinks.push([fromUrl, importSpecifier]);

        /**
         * When someone imports node:path or node:buffer, we want to
         * "do the right thing". The right thing is extremely hard
         * to determine here.
         */
        if (importSpecifier.startsWith("node:")) {
          if (downloadedPaths.has(NODE_FILE_PATH)) return;
          downloadedPaths.add(NODE_FILE_PATH);
          typescriptEnvironment.createFile(NODE_FILE_PATH, NODE_FILE);
          await resolveDeps(NODE_FILE, depth + 1, fromUrl);
          return;
        }

        const resolvedUrl = resolveImportSpecifier(importSpecifier, fromUrl);
        if (!resolvedUrl) return null;
        debugLinks.push([importSpecifier, resolvedUrl.url]);
        if (downloadedPaths.has(resolvedUrl.url)) return;
        downloadedPaths.add(resolvedUrl.url);
        total++;
        const dep = await loadDependency(resolvedUrl.url);
        downloaded++;
        if (dep === null) {
          console.error(`Failed to get ${importSpecifier}`);
          return null;
        }

        /**
         * This has a few hours into it, so… I should explain how we got here.
         *
         * - Node.js supports importing its built-in modules by both literal names like
         *   'stream' and also a prefixed version like 'node:stream'.
         * - Deno only supports the latter, with a prefix.
         * - @types/node is where we get our types from. The package has re-exports
         *   of each module under the node:prefix, conveniently:
         *   https://unpkg.com/browse/@types/node@20.12.11/assert.d.ts
         * - However, we're requesting @types/node via esm.sh, and it unhelpfully
         *   transforms that alias for us, which neuters its effect.
         * - There are a LOT of potential ways to work around this, most of which
         *   do not work. This code rewrites the first export to be _only_
         *   the prefixed version.
         */
        if (dep.url.startsWith("https://esm.sh/v135/@types/node")) {
          dep.code = dep.code.replace(
            /declare module ["']([\w/]+)['"]/,
            (_str, match) => {
              return `declare module "node:${match}"`;
            },
          );

          // Try to prevent the global Buffer and process objects from leaking
          if (dep.url.endsWith("buffer.d.ts")) {
            dep.code = dep.code.replace("var Buffer", "export const Buffer");
          }
          if (dep.url.endsWith("process.d.ts")) {
            dep.code = dep.code.replace("var process", "export const process");
          }
        }

        const { code: importedCode, url: redirectedUrl } = dep;

        console.info(
          `%cata progress: ${downloaded} / ${total}`,
          "color: orange",
        );

        // esm.sh/simple-statistics
        //
        // esm.sh/simple-statistics/foo/bar
        // import x from "./x";
        typescriptEnvironment.createFile(
          urlToFilepath(redirectedUrl),
          importedCode,
        );

        // If we were redirected on the way, create a "redirect" file
        // that lets relative resolution work.
        if (redirectedUrl !== resolvedUrl.url) {
          debugLinks.push([resolvedUrl.url, redirectedUrl]);
          typescriptEnvironment.createFile(
            urlToFilepath(resolvedUrl.url),

            // export * from … doesn't re-export default exports. But we
            // want to re-export default exports. So we have turned
            // allowSyntheticDefaultImports on, which makes the next
            // line of code work, but on the other hand, doesn't _actually_
            // work in Deno because they don't support the option because
            // Node.js doesn't support the option in their native ESM
            // loading strategy.
            //
            // So, if we can find a way to essentially "link" or "redirect"
            // typescript modules other than this one, let's switch,
            // but for now this lets us do a sort of 'transparent' redirect
            // from one val to another.
            //
            // The purpose of this whole redirecting dance is because of relative
            // paths: when you import from a url that is a redirect, and the
            // code that's at that path uses relative paths, we need to resolve
            // those relative paths relative to the final resolved url, not the
            // initial one.
            //
            // https://github.com/denoland/deno/issues/17058
            `export * from '${redirectedUrl}'; import e from '${redirectedUrl}'; export default e;`,
          );
        }

        // Recurse through deps
        await resolveDeps(importedCode, depth + 1, redirectedUrl);
      }),
    );
  }
}
