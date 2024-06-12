import ts from "typescript";

/**
 * Pull out any potential references to other modules.
 */
export function extractReferences(code: string): string[] {
  const meta = ts.preProcessFile(code);

  // Ensure we don't try download TypeScript lib references
  // @ts-expect-error - private but likely to never change
  const libMap: Map<string, string> = ts.libMap || new Map();

  // TODO: strip /// <reference path='X' />?

  return meta.referencedFiles
    .concat(meta.importedFiles)
    .concat(meta.typeReferenceDirectives)
    .concat(meta.libReferenceDirectives)
    .filter((d) => !libMap.has(d.fileName))
    .map((r) => {
      return r.fileName;
    });
}
