import { describe, test, expect } from "vitest";
import { extractReferences } from "./extractReferences";

describe("extractReferences", () => {
  test.each([
    ["", []],
    ["const x = 1;", []],
    ["invalid\\typescript", []],
    [`import { min } from "npm:simple-statistics"`, ["npm:simple-statistics"]],
    [
      `import { min } from "npm:simple-statistics@8"`,
      ["npm:simple-statistics@8"],
    ],
    [
      `import { min } from "https://esm.sh/simple-statistics"`,
      ["https://esm.sh/simple-statistics"],
    ],
    [`/// <reference types="npm:@types/node" />\n`, ["npm:@types/node"]],
  ])("%s -> %s", (input, output) => {
    expect(extractReferences(input)).toEqual(output);
  });
});
