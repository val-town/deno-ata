export function ensureTsExtension(fileName: string) {
  // If we're looking at an HTTP import that doesn't have
  // an extension like cjs, mjs, jsx, tsx, or ts,
  // add one.
  if (!fileName.match(/\.(t|[mc]?j)sx?$/)) {
    return `${fileName}.tsx`;
  }
  return fileName;
}

/**
 * All right, so as other comments talk about, Deno uses https://
 * imports and TypeScript doesn't support them. TypeScript doesn't
 * support setting a 'file' with a URL as the path.
 *
 * Note: this does normalize both https and http to https, but
 * it doesn't matter that much: in reality, we are never
 * going to be loading http content.
 */
export function urlToFilepath(path: string) {
  return ensureTsExtension(path.replace(/https?:\/\//, "/https/"));
}
