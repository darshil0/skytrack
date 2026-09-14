# SkyTrack - Tactical Flight Surveillance System

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19.0.0-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-6.2.0-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.1.14-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Express](https://img.shields.io/badge/Express-4.21.2-000000?logo=express&logoColor=white)](https://expressjs.com)
[![Vitest](https://img.shields.io/badge/Vitest-5.0.0-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev)

SkyTrack is a high-performance, real-time flight tracking application built with React 19, Vite, and D3.js. It features a tactical, air traffic control-inspired interface for monitoring global aviation data with secure, server-side AI integration.

## Features

- **Tactical Map Interface**: A high-contrast map built with D3.js supporting natural earth projections, smooth zooming, animated flight trajectories, and interactive map layers.
- **AI Weather Radar Layer**: Live global weather system tracking powered by Gemini with Search Grounding, identifying storms and precipitation centers in real-time.
- **Tactical Airspace Sectors**: Visualization of major Flight Information Regions (FIRs) and tactical airspace boundaries.
- **Advanced Telemetry History**: High-fidelity data visualization for flight paths, featuring scaled Lat/Lng progression charts, interactive tooltips, predictive fuel burn calculations, and estimated time to destination with algorithmic fallbacks.
- **Intelligent Proximity Alerts**: Real-time detection of aircraft within a user-defined radius (up to 250NM), featuring pulsing visual highlights, callsign identification in the HUD, and optional audible alerts.
- **Live Radar Ingestion**: Real-time flight data fetching from OpenSky Network and Google Search Grounding to provide current aircraft positions.
- **AI-Powered Search & Quota Resilience**: Natural language search powered by Gemini 3.8 Flash, reinforced with an automated quota circuit breaker and aerodynamic vector contingency engine.
- **ATC Communication Decryption**: Anonymized, simulated ATC transcripts based on current flight sectors for enhanced situational awareness.
- **Flight Management**: Full CRUD operations for managing a personal database of tracked flights.
- **Flight History & Surveillance Archive**: Persistent local storage log recording both searched flights and tracked aircraft, featuring search filtering, sort controls, route cards, instant map tracking, and JSON data export.
- **Deep Linking & Sharing**: Easily share specific flight tracking data via generated URLs.
- **Adaptive Mobile Experience**: Fully optimized for mobile with a collapsible flight manifest and specialized touch interactions.

## Technical Stack

- **Frontend**: React 19, Vite 6, Tailwind CSS 4
- **Animations**: Motion (`motion/react`)
- **Backend**: Node.js, Express 4, Zod 4 (Validation), Esbuild (Server bundle)
- **Data Visualization**: D3.js 7, Recharts 3
- **Testing**: Vitest 5
- **AI Engine**: `@google/genai` (Gemini 3.8 Flash via Server-Side Proxies) with Search Grounding and Rate-Limit Circuit Breaker
- **Icons**: Lucide React
- **Styling**: Tactical UI System with custom scanline effects and grid overlays
- **Security**: Cryptographically secure ID generation (`crypto.randomBytes`), CORS validation, environment-based configuration

## Prerequisites & Setup

### Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### Environment Variables

| Variable | Description | Required |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | Your Google AI Studio API key for flight search and telemetry analysis. | ✅ Yes |
| `APP_URL` | The public URL of the application, used for CORS and sharing links. | ❌ Optional |
| `PORT` | Server port (default: 3000). | ❌ Optional |
| `NODE_ENV` | Set to `production` for production builds (enables static file serving). | ❌ Optional |

Configure environment variables by copying `.env.example`:
```bash
cp .env.example .env
```

## Development & Verification Commands

- **Install Dependencies**:
  ```bash
  npm install
  ```

- **Start Development Server** (Express + Vite HMR):
  ```bash
  npm run dev
  ```
  App is accessible at `http://localhost:3000`.

- **Type-Check & Lint**:
  ```bash
  npm run lint
  ```

- **Run Unit & Integration Tests**:
  ```bash
  npm test
  ```

- **Build Production Bundle**:
  ```bash
  npm run build
  ```

- **Start Production Server**:
  ```bash
  npm start
  ```

## Architecture & API Specification

All interactive AI features and external APIs are encapsulated into server-side endpoints to prevent API key exposure and enforce security boundaries:

- `GET /api/flights`: Retrieves the stored manifest of tracked flights.
- `POST /api/flights`: Registers a new flight record in the system (validated with Zod).
- `PATCH /api/flights/:id`: Updates an existing flight record.
- `DELETE /api/flights/:id`: Removes a flight record from the system.
- `GET /api/external/live-flights`: Proxy route for real-time ADS-B state vectors from OpenSky Network.
- `POST /api/gemini/search`: Secure proxy that leverages Google Gen AI to synthesize real-time flight vectors using Search Grounding.
- `POST /api/gemini/telemetry`: Calculates safety bulletins, fuel burn predictions, and ETD estimates server-side.
- `GET /api/weather/overlay`: Performs real-time meteorological sweeps using search models to locate major weather anomalies globally.

### Security & Resilience

- **API Key Protection**: Server-side proxying ensures `GEMINI_API_KEY` is never sent to the browser.
- **Quota Circuit Breaker**: Upstream Gemini rate limits (HTTP 429) automatically activate a 2-minute cooldown circuit breaker.
- **Aerodynamic Vector Fallbacks**: When AI services are in cooldown or unconfigured, telemetry (fuel burn, ETD, weather safety bulletins) is computed algorithmically via Great-Circle distance, aircraft speed, and route progress.
- **Input Validation**: All inbound flight payloads are schema-validated with Zod before processing.

## Known Limitations

- **OpenSky Public API Rate Limits**: The OpenSky Network public endpoint enforces rate limiting for unauthenticated requests. If rate limited, the application gracefully alerts the user via HUD status notifications.
- **Gemini AI Quotas**: High traffic or free-tier quotas on Google Gemini AI Studio may trigger rate limits (429), at which point SkyTrack seamlessly switches to local Great-Circle algorithmic calculations.

## License

MIT
