# NextPlay OSRS Coach

I built this version of NextPlay around reviewing completed OSRS fights. I wanted a place to bring together event logs, recordings, and practice goals so I could see what to work on next.

I included a session library, a health timeline, browser recording, event validation, and recurring pattern tracking. Event logs drive the deterministic review rules. Optional AI review can use event data or sampled video frames; video alone does not establish every combat event.

## Built with

I used TypeScript and React, with Cloudflare D1 for session data and R2 for clips.

## Inside the project

* `app/`: the application routes and interface.
* `lib/`: review logic and shared services.
* `integrations/`: telemetry integration files.
* `db/`: database definitions.
* `tests/`: review and capture checks.

## Running it

I use Node.js 22.13 or later and pnpm. I install dependencies with `pnpm install`, set up my own values from `.env.example`, and start development with `pnpm dev`. Database and clip storage configuration are covered in the project guide.

## More detail

* [Setup and review limitations](PROJECT_GUIDE.md)
