import { maybeAddDtsToSkypackUrls } from "./maybeAddDtsToSkypackUrls";

// FIXME: this needs to be resolved before this is used.
const config = { MODULE_BASE_URL: "https://esm.town/", token: "xxx" };

/**
 * Determine whether we're looking at a val or not. If we are, then
 * we should treat relative imports as being relative to our server
 * and we should expand the import_map subsitutions.
 */
export function isValPath(path: string) {
  return path.includes(config.MODULE_BASE_URL);
}

/**
 * Just a wrapper around a fetch response that gives us text and
 * the resolved url. res.url is useful here because it is the
 * _redirected_ url that we ended up at.
 *
 * We need to keep track of redirected URLs because imports are relative
 * to them. For example, if I import https://esm.sh/got and it redirects
 * to https://esm.sh/v135/got and that file includes an import against
 * `./foo`, then we want https://esm.sh/v135/foo, not https://esm.sh/foo -
 * we want to resolve the relative import against the final URL,
 * not the initial one.
 */
async function fromResponse(
  res: Response,
): Promise<{ code: string; url: string }> {
  return {
    code: await res.text(),
    url: res.url,
  };
}

/**
 * These are dependencies from URLs, include esm.sh.
 *
 * Because a URL like https://esm.sh/lodash-es
 * will redirect to a URL like https://esm.sh/lodash-es@4.17.21
 * and we need to manage relative imports _relative to the redirected
 * url_, we return both the code and the final URL.
 */
export const loadDependency = async function loadDependency(
  url: string,
): Promise<{ code: string; url: string } | null> {
  try {
    if (isValPath(url)) {
      const res = await fetch(url, {
        headers: {
          Accept: "text/tsx",
          ...(config.token
            ? {
                Authorization: `Bearer ${config.token}`,
              }
            : {}),
        },
      });
      const valResp = await fromResponse(res);
      return valResp;
    }

    // It'd be nice to use an OPTIONS request here,
    // but we just get the redirect 302, which doesn't include
    // the X-Typescript-Types header.
    // biome-ignore lint/style/noParameterAssign: legacy code
    url = maybeAddDtsToSkypackUrls(url);

    const res = await fetch(url);
    if (!res.ok) {
      console.error("Failed to load", url);
      return null;
    }

    /**
     * esm.sh includes an X-TypeScript-Types header that points
     * to .d.ts files if there are any:
     * https://esm.sh/#docs
     */
    const typesHeader = res.headers.get("X-Typescript-Types");
    if (typesHeader) {
      try {
        const resolvedDts = new URL(typesHeader, url).toString();
        const dts = await fetch(resolvedDts);
        return fromResponse(dts);
      } catch (e) {
        return fromResponse(res);
      }
    } else {
      return fromResponse(res);
    }
  } catch (e) {
    console.error(e);
    // fetch could fail for reasons like CORS
    return null;
  }
};
