# SkyTrack - Tactical Flight Surveillance System

SkyTrack is a high-performance, real-time flight tracking application built with React, Vite, and D3.js. It features a tactical, air traffic control-inspired interface for monitoring global aviation data with secure, server-side AI integration.

## Features

-   **Tactical Map Interface**: A high-contrast, black-ops style map built with D3.js, supporting natural earth projections, smooth zooming, **animated flight trajectories**, and interactive map layers.
-   **AI Weather Radar Layer**: Live global weather system tracking powered by Gemini with Search Grounding, identifying storms and precipitation centers in real-time.
-   **Tactical Airspace Sectors**: Visualization of major Flight Information Regions (FIRs) and tactical airspace boundaries.
-   **Advanced Telemetry History**: High-fidelity data visualization for flight paths, featuring scaled Lat/Lng progression charts, interactive tooltips, predictive fuel burn calculations, and estimated time to destination.
-   **Intelligent Proximity Alerts**: Real-time detection of aircraft within a user-defined radius (up to 250NM), featuring pulsing visual highlights, callsign identification in the HUD, and optional audible alerts.
-   **Live Radar Ingestion**: Real-time flight data fetching from OpenSky Network and Google Search Grounding to provide current aircraft positions.
-   **AI-Powered Search**: Natural language search capabilities powered by Gemini 1.5/3.5 Flash to find specific flights or simulate data.
-   **ATC Communication Decryption**: Anonymized, simulated ATC transcripts based on current flight sectors for enhanced situational awareness.
-   **Flight Management**: Full CRUD operations for managing a personal database of tracked flights.
-   **Deep Linking & Sharing**: Easily share specific flight tracking data via generated URLs.
-   **Adaptive Mobile Experience**: Fully optimized for mobile with a collapsible flight manifest and specialized touch interactions.

## Technical Stack

-   **Frontend**: React 19, Vite 6, Tailwind CSS 4
-   **Animations**: Motion (`motion/react`)
-   **Backend**: Node.js, Express, Zod (Validation), Esbuild (Server bundle)
-   **Data Visualization**: D3.js, Recharts (equipped with sync reference trackers)
-   **AI Engine**: Google Generative AI (Gemini 1.5/3.5 Flash via Server-Side Proxies) with Search Grounding
-   **Icons**: Lucide React
-   **Styling**: Tactical UI System with custom scanline effects and grid overlays
-   **Security**: Cryptographically secure ID generation, CORS validation, environment-based configuration

## API Configuration & Security Architecture

To prevent API key exposure and secure client sessions, all interactive AI features are encapsulated into server-side routes. The `GEMINI_API_KEY` is **never** exposed to the client—all requests are proxied securely through Express middleware:

-   `GET /api/flights`: Retrieves the manifest of tracked flights.
-   `POST /api/flights`: Adds a new flight to the tracking database.
-   `PATCH /api/flights/:id`: Updates existing flight telemetry.
-   `DELETE /api/flights/:id`: Removes a flight from the system.
-   `GET /api/external/live-flights`: Proxy route for real-time ADS-B data from the OpenSky Network.
-   `POST /api/gemini/search`: Secure proxy that leverages Google Gen AI to synthesize real-time flight vectors using Search Grounding.
-   `POST /api/gemini/telemetry`: Computes safety bulletins, fuel burn predictions, and ETD estimates server-side.
-   `GET /api/weather/overlay`: Performs real-time meteorological sweeps using search models to locate major weather anomalies globally.

### Security Considerations

- **API Key Protection**: Environment variables are read only on the server; the client never receives credentials.
- **CORS Configuration**: Configurable origin allowlist with proper validation to prevent unauthorized cross-origin requests.
- **Secure ID Generation**: Flight IDs use cryptographic random bytes instead of `Math.random()`.
- **Input Validation**: All API requests validated with Zod schemas on the server before processing.

## Environment Variables

| Variable | Description | Required |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | Your Google AI Studio API key for flight search and telemetry analysis. | ✅ Yes |
| `APP_URL` | The public URL of the application, used for CORS and sharing links. | ❌ Optional |
| `PORT` | Server port (default: 3000). | ❌ Optional |
| `NODE_ENV` | Set to `production` for production builds (enables static file serving). | ❌ Optional |

## Development

### Quick Start

1.  **Install dependencies**:
    ```bash
    npm install
    ```

2.  **Configure environment**:
    ```bash
    cp .env.example .env
    # Edit .env and add your GEMINI_API_KEY
    ```

3.  **Start the development server** (includes Express + Vite HMR):
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:3000`.

4.  **Build for production**:
    ```bash
    npm run build
    ```
    This bundles the client with Vite and the server with esbuild into `dist/`.

5.  **Start production server**:
    ```bash
    npm start
    ```
    Serves the compiled client and runs the Express backend.

### Linting

Run TypeScript type checking:
```bash
npm run lint
```

## Deployment

### Docker / Cloud Platforms

SkyTrack can be deployed to any Node.js-compatible platform (Vercel, Railway, Heroku, etc.). Ensure:

- `GEMINI_API_KEY` environment variable is set securely.
- `APP_URL` is configured to your production domain for CORS and sharing links.
- `PORT` can be customized if needed (default: 3000).

### Production Build Output

- `dist/index.html` - Client application
- `dist/server.cjs` - Compiled Express server
- All assets bundled and optimized for performance.

## License

MIT
