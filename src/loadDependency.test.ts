import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { loadDependency } from "./loadDependency";
import { setupServer } from "msw/node";
import { HttpResponse, http } from "msw";

const FAIL = "https://fail.com/";
const ARBITRARY = "https://foo.com/bar.ts";
const HAS_TYPES = "https://esm.sh/foo";
const TYPES_URL = "https://esm.sh/foo.d.ts";
const MODULE_BASE_URL = "https://val.test/";
const MODULE_URL = "https://val.test/v/foo/bar";

// FIXME: this needs to be resolved before this is used.
const config = { MODULE_BASE_URL: "https://esm.town/", token: "xxx" };

const restHandlers = [
  http.get(FAIL, async (_req) => {
    return HttpResponse.text("", { status: 500 });
  }),
  http.get(ARBITRARY, async (_req) => {
    return HttpResponse.text("42");
  }),
  http.get(HAS_TYPES, async (_req) => {
    return HttpResponse.text("42", {
      headers: {
        "X-Typescript-Types": TYPES_URL,
      },
    });
  }),
  http.get(TYPES_URL, async (_req) => {
    return HttpResponse.text("42");
  }),
  http.get(MODULE_URL, async (req) => {
    return HttpResponse.text(req.request.headers.get("Authorization"));
  }),
];

describe("loadDependency", () => {
  const server = setupServer(...restHandlers);
  const originalBase = config.MODULE_BASE_URL;
  beforeAll(() => {
    config.token = "xxx";
    config.MODULE_BASE_URL = MODULE_BASE_URL;
    server.listen({ onUnhandledRequest: "error" });
  });
  afterAll(() => {
    config.MODULE_BASE_URL = originalBase;
    server.close();
  });
  afterEach(() => server.resetHandlers());

  it("handles failure", async () => {
    await expect(loadDependency(FAIL)).resolves.toEqual(null);
  });

  it("loads an arbitrary route", async () => {
    await expect(loadDependency(ARBITRARY)).resolves.toEqual({
      url: ARBITRARY,
      code: "42",
    });
  });

  it("uses x-typescript-types", async () => {
    await expect(loadDependency(HAS_TYPES)).resolves.toEqual({
      url: TYPES_URL,
      code: "42",
    });
  });

  it.skip("sends a token with local requests", async () => {
    await expect(loadDependency(MODULE_URL)).resolves.toEqual({
      url: MODULE_URL,
      code: "Bearer xxx",
    });
  });
});
