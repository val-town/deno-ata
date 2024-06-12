import { maybeAddDtsToSkypackUrls } from "./maybeAddDtsToSkypackUrls";
import { test, expect, describe } from "vitest";

describe("maybeAddDtsToSkypackUrls", () => {
  test.each([
    ["https://google.com/", "https://google.com/"],
    ["https://cdn.skypack.dev/foo", "https://cdn.skypack.dev/foo?dts"],
    ["\\invalid url", "\\invalid url"],
  ])("%s -> %s", (input, output) => {
    expect(maybeAddDtsToSkypackUrls(input)).toEqual(output);
  });
});
