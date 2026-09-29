# PHI MASTER RED BACKLOG — 2026-09-28

RED means unresolved. Claude-Flow, Monitor, ChatGPT, and future agents must not mark an item complete from discussion, a mockup, a commit, or a successful build alone. Verify the deployed behavior first.

## Control Phi / unified wallet / coins
- [ ] Make Control Phi authoritative for Quants, Infinity tokens, StarCoins, Music Quants, and other Phi assets.
- [ ] Move authoritative balances/history from browser-only storage to Cloudflare/D1 and verify cross-device persistence.
- [ ] Preserve convenient same-device recognition while completing secure recovery/account linking.
- [ ] Resolve Music Quant persistence and verify created Music Quants reach the cloud wallet.
- [ ] Visibly verify Collect = 0.1 StarCoin and Share = 0.1 StarCoin exactly once per eligible action.
- [ ] Finish authenticated user-to-user transfers and atomic ledger settlement.
- [ ] Preserve immutable Quant provenance/serial/commit data through transfer.
- [ ] Carry permitted creator-approved Quant context for receiving-AI matching while keeping private fulfillment data outside transferable assets.
- [ ] Make NEC/transfer and Phi wallet/search/collect/share reusable components with server-side policy enforcement.
- [ ] Audit Phi pages for one wallet source and remove conflicting local counters.
- [ ] Make the channel remote a Control Phi interface: channel selection, current/next program, schedule status, playback health, and repair hooks.

## Marketplace / Mercury dime
- [ ] Runtime-verify Collect changes to Collected on the deployed test card.
- [ ] Runtime-verify the exact Mercury card immediately appears in the visible cart.
- [ ] Runtime-verify Collect credits exactly 0.1 StarCoin through Control Phi.
- [ ] Replace the browser-local 100-Quant test checkout with a server-verified wallet transaction.
- [ ] Buy Now uses the displayed price without typed amounts or manual ledger choice.
- [ ] Create Cloudflare/D1 order records and private fulfillment records.
- [ ] Seller wallet message: Sale received · Mercury dime · 100 Quants · Ship item.
- [ ] Ship Item opens seller-authorized fulfillment details; seller can mark shipped and add tracking; buyer sees status.
- [ ] One verified payment creates one order/receipt.
- [ ] Never display paid until server-side wallet settlement confirms it.

## Shop Phi / ads / merchant feeds
- [ ] eBay tab stays inside Shop Phi and renders actual eBay inventory for the active seed such as Mercury dimes.
- [ ] Connect real eBay inventory through a server-side Worker/API-Phi provider.
- [ ] Render real listing image/title/price/metadata; only individual product checkout may leave Shop Phi.
- [ ] Remove synthetic generic cards where they masquerade as merchant inventory.
- [ ] Keep the light Infinity/Quanta card style and normalize abnormal ad styling.
- [ ] Sponsored ads use real purchasable items/images with rotating nonrepeating multi-source catalogs.
- [ ] Finish metadata-driven product relevance from collected/search/activity signals.
- [ ] Measure Cloudflare page views/unique visitors and verify placement of an additional ad service on the appropriate high-traffic Phi surface.
- [ ] Build Phi owns the reusable advertisement/card contract and image-cleanup pipeline.
- [ ] Image cleanup removes flat backgrounds without recoloring the item or falsifying condition/provenance.

## TV channels / Cloudflare scheduler
- [ ] Cartoon Network: fix looping/restart/time-position bug reported on Android.
- [ ] Cinemax: replace stale content and verify fresh Cloudflare schedule feed on Android.
- [ ] Showtime: replace stale content and verify fresh Cloudflare schedule feed on Android.
- [ ] Preserve HBO newer-playlist behavior and verify both video and audio.
- [ ] Eliminate stale background program/title state.
- [ ] Fill the daily slot skeleton from the Cloudflare catalog for every channel.
- [ ] Slot changes have no loops, gaps, stale timers, duplicate players, or old bundles.
- [ ] Expand catalog depth; verify all nine current schedules end to end and extend the structure to remaining channels.
- [ ] Use a browser/verification agent to test rendered playback, not only source files and schedule data.
- [ ] Handle Android cache/versioning so fixes reliably reach the phone.
- [ ] Monitor detects stale schedules, repeated segments, restarts, missing video, and old-catalog regressions and creates repair jobs.

## Alien Coin / generated feed
- [ ] Connect Alien Coin to the scheduled movie/video feed discussed for token content.
- [ ] Finish remaining generated token sections rather than stopping at the initial skeleton.
- [ ] Generate relevant media/content categories from permitted signals, including discussed music, planting/tree, recipe, collectible, and article/poem sections.
- [ ] Make the page consistently Android-first.
- [ ] Verify token media sections render/play and preserve source/provenance metadata.

## Infinity Radio / Music Quants
- [ ] Persist one Music Quant per song to the unified Cloudflare wallet, including listening-only events.
- [ ] Attach permitted cross-Phi activity during a song to that Music Quant.
- [ ] Verify long queues continue beyond the first song without stopping/repeating.
- [ ] Maintain the known-good audio catalog and remove dead/silent media.
- [ ] Verify the piano/music Quant builder saves every created Quant.
- [ ] Continue piano requirements: black keys, continuous capture, five-note segmentation after capture, editable notes, timing/holds/chords.
- [ ] Keep player running while browsing/searching other Phi surfaces where designed.
- [ ] Finish Shop Now/ad integration without breaking playback.

## Quanta Phi / Infinity Phi / News Phi
- [ ] Quanta entity lock persists resolved entity/symbol/atomic number through retrieval/writing and rejects mismatches.
- [ ] Each image/video/sound card gets a unique media-specific write-up.
- [ ] Preserve Red/Yellow/Blue/Orange/Purple overview roles.
- [ ] Restore/verify 24+ image results and Load More.
- [ ] Verify playable video/audio inside Phi.
- [ ] Quant persistence survives refresh using Cloudflare.
- [ ] Infinity/Omni have separate verified Images/Video/Audio feeds with token continuity.
- [ ] News Phi fresh-story flow removes stale counts/duplicates and verifies collected-card handoff.
- [ ] Verify News → Web → Builder metadata/index handoff and Builder Reserve canonical-feed wiring.
- [ ] Final Deploy Website publishes a durable Web Phi revision.
- [ ] Cloudflare Browser /code-phi/inspect needs end-to-end runtime/media/layout/accessibility verification and repair evidence.

## Quant click/event data pipeline
- [ ] Treat structured, permitted interaction history as core Quant metadata: searches, result/card clicks, media interactions, product/category clicks, collects, shares, purchases, sequence, timestamps, source Phi surface, and active media context where appropriate.
- [ ] Maintain an active-Quant/session association so events are attached to the correct originating Quant rather than a global undifferentiated click log.
- [ ] Normalize events into a versioned schema with event ID, Quant ID, actor/owner scope, event type, target/entity IDs, timestamp, source surface, provenance, and allowed metadata.
- [ ] Persist events durably in Cloudflare/D1 and index them for Quant-level retrieval and permitted aggregate analysis.
- [ ] Preserve provenance and ordering so a receiving AI can distinguish search → click → collect → purchase relationships.
- [ ] Make the creator's unified wallet expose the Quant's useful indexed activity summary without dumping unnecessary raw personal data into the UI.
- [ ] Define transfer permissions for Quant metadata. Transfer only data the system is permitted to carry; keep shipping addresses, payment credentials, private messages, authentication secrets, and other sensitive fulfillment/account data outside transferable Quant metadata.
- [ ] Provide recipient-AI interpretation interfaces for permitted matching/recommendation/advertising use without claiming that data guarantees a monetary token value.
- [ ] Add retention/deletion/privacy controls and document which event classes are collected and why.
- [ ] Verify click/event capture across Infinity Phi, Quanta Phi, Shop Phi, Infinity Radio, News Phi, and other participating Phi surfaces without double-counting events.

## Claude-Flow / Monitor
- [ ] Deploy and verify Monitor flow routes described in docs/phi-cloudflare.md.
- [ ] Persist flow runs/tasks/events in Monitor D1 and reference existing Quant IDs.
- [ ] Claude-Flow reads this master backlog plus subsystem implementation ledgers.
- [ ] Agent loop: Observe → unmet item → Flow job → specialist → scoped repair → deploy → runtime verify → evidence → complete.
- [ ] Implement specialized reader/sensor/router/writer/verifier bot roles.
- [ ] Prioritize broken runtime behavior over speculative new features.
- [ ] Store verification evidence: deployment SHA, tested route, timestamp, result, and repair notes.
- [ ] Agents may create repos/modules when separation helps while this file remains the master index.
- [ ] Add repository discovery/mapping for the Phi ecosystem.
- [ ] Add a session-close audit that appends discussed-but-unverified work to a durable ledger automatically.

## Completion rule
An item becomes complete only after its owning implementation is identified, code/config/data changes exist, deployed/runtime behavior is tested where applicable, persistence/security requirements are checked, and verification evidence is recorded. Otherwise leave it unresolved.
