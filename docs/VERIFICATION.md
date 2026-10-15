# Verification record

## Available checks

- TypeScript compile check for the web app and route code.
- Rule-engine tests: missing evidence, low HP, observation gaps, healing boundaries, death snapshots, prayer evidence, deliberate pressure, new RuneLite state events, input immutability and unsupported games.
- Capture state-machine test for concurrent mark/stop behavior and track cleanup using a mock MediaRecorder.
- Event-alignment test for correct timestamp shift, cropping and original-data preservation.
- Byte-range parsing tests for seeking, suffix requests and invalid ranges.
- Generated migration inspection and production bundle validation.

## Not verified by those checks

Mock recording tests do not establish actual media quality, browser background behavior, system permissions or real WebM/MP4 playback. The RuneLite Java source has not been built or run against a live RuneLite client here. The OBS helper has not connected to a live OBS instance. A previous AI video request returned an upstream error; a successful provider response and this new event-log path remain unverified.

The available environment did not expose the required browser-control skill, so browser visual QA and WebMCP runtime validation are unavailable. WebMCP is feature-detected and failure does not block the normal UI. A production build is not a substitute for a live-game acceptance test.
