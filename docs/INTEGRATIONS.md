# Capture and integrations

## Browser path: available in the app

Use Record gameplay on a desktop browser that supports display capture. Pick the RuneScape window. Recordings contain no audio. Mark moments during play; review only after stopping. The capture layer never detects a death visually or gives live combat instructions. Screen-sharing permission is required on each new capture. If your browser refuses display capture, record using OBS or the device recorder and import the result.

## RuneLite recorder: development source

`integrations/runelite` contains a local observation plugin and development launcher. It records own HP, prayer points and protection prayer on game ticks; local prayer and interacting-target overhead changes between game ticks; own inventory and equipment slot changes; animations of self and the interacting player; visible hitsplat amounts; and own-player death. Item/animation IDs are raw. Hitsplats do not identify the attacker or damage type. It does not determine incoming attack style, opponent inventory/special energy, or exact death causation. A death ends the current recording; start a new one for the next fight. The source defaults to LMS; edit the completed JSON mode if you recorded another mode. Logs are bounded at 9,000 events.

This is not a compiled release and is not reviewed or approved by RuneLite/Jagex. Before distributing, build it against the current RuneLite release, verify the event semantics in a permitted development environment, and follow the official Plugin Hub review process. It must not be presented as a sanctioned plugin just because RuneLite itself is approved.

Prerequisites: a compatible JDK, Gradle, and the RuneLite development setup. No Gradle wrapper binary is bundled. In `integrations/runelite`, run `gradle build` and use the launcher via `gradle run` only after reviewing the source and current development guidance. Version 1.13.1 is the API reference used in this draft; verify dependency availability before updating it.

Export directory: `.runelite/nextplay` under your user directory. No login credentials, chat, usernames, locations, or opponent account metadata are exported. JSON is finalized with a rename so the optional watcher sees complete files.

## OBS replay helper: local developer integration

1. Configure your RuneScape game/window source in OBS. Disable microphones if you do not intend to record them.
2. Enable Replay Buffer in OBS Output settings and choose about 60 seconds. Choose a browser-playable output format, or remux to MP4 after saving. Start the replay buffer yourself.
3. Enable OBS WebSocket with password authentication. Keep it local on port 4455.
4. Create a Python environment and install `integrations/obs/requirements.txt`.
5. Set `OBS_WEBSOCKET_PASSWORD` locally to the OBS password; do not commit or paste it into the app.
6. Run `python integrations/obs/replay_helper.py` to save once. The script connects only to `127.0.0.1`.
7. After the RuneLite plugin has been built and validated, run `python integrations/obs/replay_helper.py --watch ~/.runelite/nextplay --output ./nextplay-captures` to save when a NEW completed log contains a player death.

The watcher does not replay old death files, does not control game input and does not upload files. It copies the OBS replay and original log with a note that they are not yet synchronized. API documentation was checked, but an actual OBS/RuneLite end-to-end run was not possible in this environment.

## AI setup

The app's server needs an authorized OpenAI API key plus a compatible model ID. Installing OpenAI Developers in ChatGPT is separate from configuring this deployed app's secret. The tool must be available and key setup explicitly authorized before connecting it. Until then the UI correctly reports AI as not connected.

When connected, **Save & analyze with AI** starts a review immediately after a RuneLite JSON import. The server sends every saved event in that fight, with no video frames by default; optional video remains available for replay. A video-only import or **Stop & analyze** still sends up to 24 sampled frames. A saved fight can be retried from **My sessions**. The model is instructed to ignore instructions embedded in gameplay text, avoid hidden-state claims, and produce cautious timestamped suggestions. Output structure, lengths and time bounds are validated before saving. A log over 500,000 JSON characters is rejected with a clear split-session message, never silently truncated. This has not been verified against a live game client or successful AI provider response.

## Official and primary references checked October 2, 2026

- Jagex third-party client guidelines: https://secure.runescape.com/m=news/third-party-client-guidelines?oldschool=1
- RuneLite Plugin Hub creation and review: https://github.com/runelite/plugin-hub
- RuneLite tick event: https://static.runelite.net/runelite-api/apidocs/net/runelite/api/events/GameTick.html
- RuneLite death event: https://static.runelite.net/runelite-api/apidocs/net/runelite/api/events/ActorDeath.html
- OBS WebSocket replay requests: https://github.com/obsproject/obs-websocket/blob/master/docs/generated/protocol.md
- OBS Python client documentation: https://github.com/aatikturk/obsws-python
- OpenAI image inputs: https://developers.openai.com/api/docs/guides/images-vision

Jagex lists live prayer instructions and opponent freeze-duration indicators among unacceptable features. This architecture confines coaching to explicit post-session review; that design choice does not itself establish approval for the custom recorder.
