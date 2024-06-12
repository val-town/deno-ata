/**
 * Parse a URL, but instead of throwing, return null.
 */
export function parseUrl(str: string, relative?: string): URL | null {
  try {
    return new URL(str, relative);
  } catch (_e) {
    return null;
  }
}

const ESM_SH_PREFIX = "https://esm.sh/v135/";

function mapNpmSpecifier(importSpecifier: string): string {
  return `${ESM_SH_PREFIX}${importSpecifier.replace(/^npm:/, "")}`;
}

function mapJsrSpecifier(importSpecifier: string): string {
  return `${ESM_SH_PREFIX}${importSpecifier.replace(/^jsr:/, "jsr/")}`;
}

export function isPackageManagerProtocol(importSpecifier: string): boolean {
  return /^(npm|jsr):/.test(importSpecifier);
}

/**
 * Turn npm: and jsr: protocol imports into imports
 * against esm.sh
 */
export function mapProtocol(importSpecifier: string): {
  url: string;
  specifierShouldBeAdded?: boolean;
} {
  // npm: imports are supported at the base level for esm.sh
  if (importSpecifier.startsWith("npm:")) {
    return {
      url: mapNpmSpecifier(importSpecifier),
      specifierShouldBeAdded: true,
    };
  }
  if (importSpecifier.startsWith("jsr:")) {
    return {
      url: mapJsrSpecifier(importSpecifier),
      specifierShouldBeAdded: true,
    };
  }
  throw new Error(`This should never happen, we've checked the protocol`);
}

/**
 * "Resolve" an import specifier from what is defined in code
 * `importSpecifier`, to what we will actually request with
 * fetch - the output URL.
 */
export function resolveImportSpecifier(
  importSpecifier: string,
  fromUrl: string,
): { url: string; specifierShouldBeAdded?: boolean } | null {
  const asUrl = parseUrl(importSpecifier);
  // Absolute URLs are treated as-is
  if (asUrl && (asUrl.protocol === "https:" || asUrl.protocol === "http:")) {
    return { url: importSpecifier };
  }

  if (isPackageManagerProtocol(importSpecifier)) {
    return mapProtocol(importSpecifier);
  }

  const relative = parseUrl(importSpecifier, fromUrl);
  if (relative) {
    return { url: relative.toString() };
  }
  console.error(`Could not resolve ${importSpecifier} against ${fromUrl}`);
  return null;
}
