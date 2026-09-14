import { describe, it, expect } from 'vitest';
import { serverSearchFlights, serverGetFlightTelemetry, serverGetLiveWeatherOverlay } from '../aiService';
import { Flight } from '../../src/types';

describe('aiService fallbacks and vector calculations', () => {
  it('returns fallback flight templates when search query matches', async () => {
    const results = await serverSearchFlights('United');
    expect(results).not.toHaveLength(0);
    expect(results[0].airline).toBe('United Airlines');
    expect(results[0].flightNumber).toBe('UA904');
  });

  it('calculates fallback telemetry accurately', async () => {
    const sampleFlight: Flight = {
      id: 'f1',
      flightNumber: 'BA123',
      airline: 'British Airways',
      origin: { code: 'LHR', city: 'London', lat: 51.47, lng: -0.4543 },
      destination: { code: 'JFK', city: 'New York', lat: 40.6413, lng: -73.7781 },
      departureTime: new Date().toISOString(),
      arrivalTime: new Date().toISOString(),
      status: 'on-time',
      progress: 50,
      currentPosition: { lat: 52.0, lng: -20.0, altitude: 35000, speed: 450, heading: 270 },
    };

    const telemetry = await serverGetFlightTelemetry(sampleFlight);
    expect(telemetry).toBeDefined();
    expect(telemetry?.predictedFuelBurn).toContain('lbs');
    expect(telemetry?.estimatedTimeToDestination).toBeDefined();
    expect(telemetry?.weatherAdvisories?.length).toBeGreaterThan(0);
  });

  it('returns global weather overlay data', async () => {
    const weather = await serverGetLiveWeatherOverlay();
    expect(weather).not.toHaveLength(0);
    expect(weather[0]).toHaveProperty('id');
    expect(weather[0]).toHaveProperty('lat');
    expect(weather[0]).toHaveProperty('lng');
    expect(weather[0]).toHaveProperty('intensity');
  });
});
