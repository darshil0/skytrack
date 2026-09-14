import { Flight } from "../types";

export async function searchFlights(query: string): Promise<Flight[]> {
  try {
    const res = await fetch("/api/gemini/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch and process flight query. Status: ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.warn("AI Search API request warning:", err);
    return [];
  }
}

export async function getInitialFlights(): Promise<Flight[]> {
  return searchFlights("Show 5 major active international flights right now");
}

export async function getFlightTelemetry(flight: Flight): Promise<Flight['telemetry']> {
  try {
    const res = await fetch("/api/gemini/telemetry", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ flight }),
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch flight telemetry. Status: ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.warn("AI Telemetry API request warning:", err);
    return undefined;
  }
}
