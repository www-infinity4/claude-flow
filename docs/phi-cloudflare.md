# Phi + Cloudflare adapter

This fork keeps upstream Claude-Flow intact and adds a thin Phi integration layer.

## Why

Claude-Flow is a Node 20+/CLI/MCP orchestration runtime. GitHub Pages cannot run that backend. Phi already has a Cloudflare backend, so duplicating storage or pretending the browser is the server would make the system less reliable.

## Architecture

```
Android / Phi UI / GitHub Pages
            |
            v
 Cloudflare Monitor Worker
            |
       monitor-phi D1
      /      |       \
  Quants   Observer   News
            ^
            |
     Claude-Flow agents
```

**Cloudflare is the durable control/data plane. Claude-Flow is the agent/orchestration plane.**

The adapter is `src/integrations/phi-monitor-client.js`.

## First integration

```js
import { createPhiMonitorClient } from "./src/integrations/phi-monitor-client.js";

const phi = createPhiMonitorClient();

console.log(await phi.health());
console.log(await phi.programs());

await phi.collectQuant({
  topic: "example task",
  source: "claude-flow",
  metadata: { kind: "orchestration" }
});
```

No Cloudflare API key is placed in browser code. Secrets required by future model/provider integrations belong in Cloudflare Worker secrets or the server-side agent runtime, never in GitHub Pages.

## Design rules

1. Do not replace Monitor's Quant graph or D1 persistence with browser localStorage.
2. Do not create a second Phi database when Monitor already owns the data.
3. Keep upstream Claude-Flow changes isolated so the fork can still absorb upstream fixes.
4. Agent runs may read/write through explicit Monitor program routes; privileged actions need authenticated server-side routes.
5. GitHub Pages is a control/display surface, not the Node runtime.
6. Cloudflare Workers handle edge APIs and lightweight coordination. Tasks that truly require Node/native Claude-Flow dependencies stay in a compatible runtime and use Monitor as their durable state bridge.

## Next backend layer

Add a Monitor `flow` program with durable run/task/event records and authenticated action routes. It should reference existing Quant IDs instead of copying Quant payloads. This lets a run connect QuantaPhi, Infinity Radio, News Phi, wallet, and future Phi applications without losing provenance.
