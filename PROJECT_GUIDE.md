# NextPlay

A working, private OSRS post-fight coaching MVP, designed to grow into a multi-game review product.

## Try it

1. Open the app. The first fight is clearly labeled **Demo fight** and contains synthetic telemetry, not real gameplay.
2. Choose **Import session** to upload a completed RuneLite event log, an MP4/WebM/Ogg clip (80 MB maximum), or both. When AI is connected, **Save & analyze with AI** starts a review in the same flow. The downloadable JSON template starts empty and accepts your own observed events.
3. Choose **Record gameplay** to share a game window. Mark up to three recent moments, then **Stop & analyze** when AI is connected. No audio is captured. With no marks, the final buffered clip saves.
4. The AI result appears first on the fight review page. For a fight saved before AI was connected, choose **Analyze latest saved fight** in **My sessions** without importing it again.
5. Imported events also produce rule-based review signals. Choose a drill and track patterns across your own saved sessions.

Video files alone do not produce rule-based combat conclusions. The RuneLite log records observed state each game tick and selected changes between ticks. When an event log exists, AI reviews all of its events without sending video frames; a video-only review samples up to 24 frames. AI needs a working server-side OpenAI connection.

## Included

| Component | Status |
|---|---|
| Responsive review workspace, timeline and HP chart | Implemented |
| Private session database and clip storage | Implemented: D1 + R2 |
| Upload, save, export and delete session | Implemented |
| Browser rolling recording | Implemented; requires device/browser permission and real-device acceptance testing |
| OSRS event validation and review rules | Implemented with meaningful unit tests |
| Recurring-pattern report and practice plan | Implemented; excludes synthetic demo data |
| OpenAI event-log or sampled-frame review | Implemented endpoint; live provider response remains unverified |
| RuneLite own-state recorder | Java development source; not built against RuneLite here, not Plugin Hub reviewed |
| OBS death-to-replay helper and timestamp alignment | Python development source; needs a local OBS integration test |
| Multi-game architecture | OSRS adapter implemented; Minecraft and COD Mobile planned |
| Hidden-state prediction, automatic inputs, live combat directives | Not implemented |

## Development

Node 22.13+ is required. Keep the supplied package manager and lockfile.

```sh
npm run install:ci
npm run db:generate
npm run build
```

Apply the generated migration locally using the bundled Wrangler setup, then run the development server. The managed environment uses its supervised preview. In standalone development, `npm run dev` is available. Hosted identity comes from the platform's authenticated user header; there is no insecure production fallback user.

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_amusing_the_hand.sql
npm run dev
```

Run checks:

```sh
node node_modules/typescript/bin/tsc --noEmit
node --experimental-strip-types --test tests/engine.test.mjs tests/capture.test.mjs tests/range.test.mjs
python tests/alignment_test.py
```

See [Architecture](docs/ARCHITECTURE.md), [Integrations](docs/INTEGRATIONS.md), [Event contract](docs/EVENTS.md), [Launch plan](docs/LAUNCH_PLAN.md), and [Verification](docs/VERIFICATION.md).

## AI connection

Configure `OPENAI_API_KEY` as a server-side secret and `OPENAI_MODEL` as a Responses API vision-capable model supported by your account. Keys must never be pasted into a browser bundle, query string or source repository. The optional OpenAI Developers plugin can assist with account setup when its key-management skill is available.

**Save & analyze with AI** and **Stop & analyze** are informed, user-triggered actions. A RuneLite import sends the complete bounded event timeline and no video frames; video-only sessions send up to 24 JPEG frames. Requests use `store: false` and reserve at most 20 attempts per user per UTC day. Provider billing still applies. Sampled frames are too sparse for reliable per-tick judgment. A prior live video analysis request returned an upstream error; the site now reports the provider's status and error code on retry, but the provider connection still needs a successful end-to-end test.

## Important implementation boundaries

Browser capture keeps approximately 60–75 seconds in complete 15-second media segments, with a 32 MiB ring limit. Segment restarts can create small gaps. It requires the tab to remain open and is not a native always-on background recorder. Marked clips stay in memory until stopping; close/reload discards unsaved clips. Do not use capture failure as evidence of a game event.

Rule-based findings are review candidates, not optimal-play claims. Low HP is a configurable review threshold, not a verified max-hit model. Protection prayer assertions require correctly labeled protection at attack evaluation, not the prayer visible when damage lands. Attack damage is not labeled “avoidable damage.” Opponent special energy is unknown.

This is a functional first MVP, not a production-certified game client or a universal Stockfish engine. NextPlay is not affiliated with Jagex or RuneLite.
