/**
 * This just fixes skypack URLs to request types
 * from SkyPack using a ?dts query string.
 */
export function maybeAddDtsToSkypackUrls(urlString: string) {
  try {
    const url = new URL(urlString);
    // Adds `?dts` to skypack URLs
    if (url.host === "cdn.skypack.dev") {
      if (!url.search) {
        url.search = "dts";
      } else {
        url.searchParams.set("dts", "");
      }
      return url.toString();
    }
  } catch (_e) {
    // URL constructor may fail
  }
  return urlString;
}
