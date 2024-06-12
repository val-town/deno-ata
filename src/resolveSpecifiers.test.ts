import { describe, it, expect } from "vitest";
import {
  isPackageManagerProtocol,
  parseUrl,
  resolveImportSpecifier,
} from "./resolveSpecifiers";

const BASE = "https://esm.town/v/foo/bar";

describe("resolveImportSpecifier", () => {
  it.each([
    ["https://esm.sh/foo", { url: "https://esm.sh/foo" }, BASE, false],
    ["../foo", { url: "https://esm.town/v/foo" }, BASE, false],
    [
      "npm:lodash-es",
      { url: "https://esm.sh/v135/lodash-es", specifierShouldBeAdded: true },
      BASE,
      true,
    ],
    [
      "jsr:lodash-es",
      {
        url: "https://esm.sh/v135/jsr/lodash-es",
        specifierShouldBeAdded: true,
      },
      BASE,
      true,
    ],
  ])("%s -> %s", (input, output, base, isProtocol) => {
    expect(resolveImportSpecifier(input, base)).toEqual(output);
    expect(isPackageManagerProtocol(input)).toEqual(isProtocol);
  });
});

describe("parseUrl", () => {
  it("handles failure", () => {
    expect(parseUrl("x")).toEqual(null);
  });

  it("parses a fully-formed url", () => {
    expect(parseUrl("https://google.com/")!.toString()).toEqual(
      "https://google.com/",
    );
  });

  it("handles relative paths", () => {
    expect(parseUrl("./foo", "https://google.com/")!.toString()).toEqual(
      "https://google.com/foo",
    );
  });
});
