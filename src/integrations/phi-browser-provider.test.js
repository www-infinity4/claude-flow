import { verifyMercuryCollectRuntime } from "./phi-browser-provider.js";

describe("Mercury runtime verifier", () => {
  test("passes only when Collected and visible cart/card are observed", async () => {
    let clicked = false;
    const browser = {
      navigate: jest.fn(async x => x),
      snapshot: jest.fn(async () => ({ clicked })),
      find: jest.fn(async ({ name }) => name === "Collect" ? (!clicked ? "@collect" : null) : (clicked ? "@collected" : null)),
      click: jest.fn(async () => { clicked = true; }),
      text: jest.fn(async () => clicked ? "Shop cart Mercury dime 100 Quants" : "Mercury dime"),
      console: jest.fn(async () => []),
      screenshot: jest.fn(async () => ({ path: "evidence.png" }))
    };
    const result = await verifyMercuryCollectRuntime({ browser, runtimeUrl: "https://example.test" });
    expect(result.passed).toBe(true);
    expect(result.evidence.observations.assertions.mercury_card_visible).toBe(true);
  });

  test("fails rather than inventing evidence when Collect is missing", async () => {
    const browser = {
      navigate: jest.fn(async x => x),
      snapshot: jest.fn(async () => ({})),
      find: jest.fn(async () => null)
    };
    const result = await verifyMercuryCollectRuntime({ browser, runtimeUrl: "https://example.test" });
    expect(result.passed).toBe(false);
    expect(result.notes).toMatch(/not found/);
  });
});
