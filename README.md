# Field Unit

A personal multi-instrument for iPhone — compass, weather, internet radio, alarm, clock,
timer & stopwatch, calendar, audio recorder, notes and optional AI note assistance, unified
into one calm, tactile device. Built as an installable, offline-capable PWA.

> Working title was “Instrument OS”; the repo name **Field Unit** stuck — it describes the
> product better: one piece of field equipment with multiple operating modes.

The design system draws on Dieter Rams / Braun-era industrial electronics: Swiss typography,
warm instrument white and instrument black, signal yellow used sparingly, precise circular
geometry, dot-matrix displays and perforated speaker patterns — original work in that spirit,
not a copy of any product.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript (strict)**
- **Tailwind CSS 4** over a CSS-variable design-token system
- **Framer Motion** for purposeful, reduced-motion-aware animation
- **Zustand** stores over an **IndexedDB** repository layer (`idb`)
- **Lucide** icons only where custom geometric SVG isn't warranted
- Vercel serverless API routes for optional AI features
- Web App Manifest + hand-rolled service worker (offline app shell)

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run lint     # eslint
npm run typecheck
```

## Deploying to Vercel

1. Push this repository to GitHub.
2. In Vercel: **Add New → Project**, import the repo. The defaults work — no configuration
   needed (`npm install` / `next build`).
3. Optional, for AI note actions and transcription, set environment variables
   (Project → Settings → Environment Variables):

| Variable | Purpose |
| --- | --- |
| `AI_PROVIDER` | `anthropic` (default) or `openai` |
| `ANTHROPIC_API_KEY` | enables note actions (summarize, title, tags, …) |
| `OPENAI_API_KEY` | enables Whisper transcription (and can serve as chat provider) |
| `AI_MODEL` | optional model override |

Keys live only on the server; the client never sees them. With no keys set, the AI routes
return a clear “not configured” response and every local feature keeps working.

## Installing on iPhone

Open the deployed URL in Safari → Share → **Add to Home Screen**. The app runs standalone,
respects safe areas and the Dynamic Island, and works offline for all locally stored data.

## Honest platform limitations

Field Unit tells the truth about what a web app can do on iOS:

- **Alarms/timers** ring while the app is open or foregrounded. iOS does not let web apps
  ring after being fully closed; missed alarms are flagged on return.
- **Recording** stops if iOS suspends the app.
- **Radio** playback may pause when backgrounded for long periods (Media Session metadata
  and lock-screen controls are wired up where supported).
- **Compass** requires the iOS motion-permission prompt (triggered only by your tap); a
  clearly labelled demo mode exists for devices without sensors — simulated readings are
  never presented as real.

## Privacy

- All personal data (notes, events, alarms, recordings, stations, preferences) is stored
  **locally** in IndexedDB. No accounts, no analytics, no ads.
- Nothing is sent to an AI provider unless you explicitly tap an AI action, and the UI says
  so at the point of use. Audio sent for transcription is not stored on the server.
- Settings → Your data: JSON export/import and a confirmed “delete everything”.
- Calendar supports ICS export/import.

## Project layout

```
src/
  app/               # routes: home board, one route per instrument, api/
  components/        # design-system components (DotMatrixDisplay, RotaryDial, …)
    shell/           # app frame: bottom nav, alarm engine, offline indicator
  lib/
    db.ts            # IndexedDB repository layer (swap point for future sync)
    types.ts         # strongly typed data models
    stores/          # zustand stores per domain
    weather/         # provider abstraction + Open-Meteo implementation
    ai/              # provider abstraction (server) + client + action catalog
scripts/
  generate-icons.mjs # procedural PNG app-icon generator (no image deps)
public/
  manifest.webmanifest, sw.js, icons/
```
