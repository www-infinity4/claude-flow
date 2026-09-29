/**
 * Browser verification provider for Phi agents.
 *
 * The host adapter may be agent-browser, Playwright, or a cloud browser.
 * This provider intentionally exposes observation/test primitives only.
 */
function need(value, name) {
  if (value === undefined || value === null || value === "") throw new TypeError(`${name} is required`);
  return value;
}

export function createPhiBrowserProvider(adapter) {
  need(adapter, "browser adapter");

  return {
    "browser.navigate": async ({ url, device = "android-mobile" }) => {
      need(url, "url");
      const result = await adapter.navigate({ url, device });
      return { url, device, ...result };
    },
    "browser.inspect": async ({ selector = null, interactive = true } = {}) =>
      adapter.snapshot({ selector, interactive }),
    "browser.screenshot": async ({ name = "phi-runtime", fullPage = true } = {}) =>
      adapter.screenshot({ name, fullPage }),
    "browser.console.read": async () => adapter.console(),
    "browser.media.test": async ({ selector, observeMs = 5000 }) => {
      need(selector, "selector");
      return adapter.mediaTest({ selector, observeMs });
    }
  };
}

export async function verifyMercuryCollectRuntime({ browser, runtimeUrl }) {
  need(browser, "browser capabilities");
  need(runtimeUrl, "runtimeUrl");

  const evidence = {
    runtime_url: runtimeUrl,
    checked_at: new Date().toISOString(),
    device_profile: "android-mobile",
    steps: [],
    observations: {}
  };

  evidence.steps.push(await browser.navigate({ url: runtimeUrl, device: "android-mobile" }));
  evidence.observations.before = await browser.snapshot({ interactive: true });

  const collect = await browser.find({ role: "button", name: "Collect" });
  if (!collect) return { passed: false, evidence, notes: "Collect button not found" };

  await browser.click(collect);
  evidence.steps.push({ action: "click", target: "Collect" });
  evidence.observations.afterCollect = await browser.snapshot({ interactive: true });

  const collected = await browser.find({ role: "button", name: "Collected" });
  const cartText = await browser.text({ selector: "body" });
  const mercuryVisible = /Mercury dime/i.test(cartText) && /100 Quants/i.test(cartText);
  const cartVisible = /Shop cart/i.test(cartText);

  evidence.observations.assertions = {
    collected_label: Boolean(collected),
    cart_visible: cartVisible,
    mercury_card_visible: mercuryVisible
  };
  evidence.observations.console_errors = await browser.console();
  evidence.observations.screenshot = await browser.screenshot({ name: "mercury-after-collect", fullPage: true });

  return {
    passed: Boolean(collected && cartVisible && mercuryVisible),
    evidence,
    notes: "This verifier does not submit checkout or perform a Quant transfer."
  };
}
