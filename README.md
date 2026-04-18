# DnD Table

Operator console for a smart DnD table. The app is built mock-first, so the UI can be demonstrated without the ESP32 hardware, while real device communication stays isolated in `src/lib/api` and `src/lib/ws`.

## Stack

- React + TypeScript
- Vite
- Tauri 2
- Zustand
- Tailwind CSS
- Rust desktop bridge for local HTTP/WebSocket helpers

## Requirements

- Node.js LTS
- npm
- Rust toolchain
- Tauri system prerequisites for your OS

For Windows, install the Microsoft C++ build tools and WebView2 runtime if they are not already present.

## Install

```powershell
npm install
```

## Run In Browser

```powershell
npm run dev -- --host 127.0.0.1
```

Vite serves the console on the port configured in `vite.config.ts`. In this workspace it is typically:

```text
http://127.0.0.1:1420
```

## Run As Desktop App

```powershell
npm run tauri dev
```

The Tauri shell uses the same React app and adds native commands for table HTTP requests and Foundry bridge helpers.

## Build

Frontend production build:

```powershell
npm run build
```

Desktop production build:

```powershell
npm run tauri build
```

The desktop installer/bundle is written under `src-tauri/target/release/bundle/`.

## Device Setup

The table endpoint is configured in the app settings:

- `hostname`: ESP32 hostname or IP, for example `table.local`
- `restPort`: REST API port, usually `80`
- `wsPort`: WebSocket API port, usually `81`

The UI remains usable in degraded/mock mode if the table is offline.

## Current Device APIs

OLED:

- `GET /api/player`
- `POST /api/player`
- `POST /api/player` with `{ "clear": true }`

LED:

- `GET /api/segments/config`
- `PUT /api/segments/config`
- `GET /api/segments/state`
- `PUT /api/segments/state`
- `GET /api/focus`
- `POST /api/focus`

Segment mapping:

- Segments `0-5`: player seats `1-6`
- Segment `6`: table

## Deployment Checklist

1. Install dependencies with `npm install`.
2. Confirm the ESP32 is reachable from the target machine.
3. Set the table hostname and ports in Settings.
4. Run `npm run build` to verify the frontend.
5. Run `npm run tauri build` to create the desktop bundle.
6. Install the generated bundle from `src-tauri/target/release/bundle/`.
7. Launch the app and press Connect.
8. Test OLED with one occupied seat and one free seat.
9. Test LED segment state and focus overlay from Lighting or the table overview.
10. Keep Foundry integration disabled unless a Foundry client is configured.

## Development Notes

- Use TypeScript everywhere.
- Keep device communication in `src/lib/api` and `src/lib/ws`.
- Keep UI mock-first and independent from the transport layer.
- Foundry integration is optional and should not block manual table control.
