import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadFlightHistory,
  recordFlightHistory,
  removeFlightHistoryItem,
  clearFlightHistory,
} from '../historyStorage';
import { Flight } from '../../types';

const sampleFlight: Flight = {
  id: 'test_123',
  flightNumber: 'AA100',
  airline: 'American Airlines',
  origin: { code: 'JFK', city: 'New York', lat: 40.6413, lng: -73.7781 },
  destination: { code: 'LHR', city: 'London', lat: 51.47, lng: -0.4543 },
  departureTime: '2026-05-09T10:00:00Z',
  arrivalTime: '2026-05-09T18:00:00Z',
  status: 'on-time',
  progress: 50,
  aircraftType: 'Boeing 777',
};

describe('historyStorage', () => {
  beforeEach(() => {
    clearFlightHistory();
  });

  it('starts with empty history', () => {
    expect(loadFlightHistory()).toEqual([]);
  });

  it('records a new flight entry', () => {
    const updated = recordFlightHistory(sampleFlight, 'tracked');
    expect(updated).toHaveLength(1);
    expect(updated[0].flightNumber).toBe('AA100');
    expect(updated[0].actionType).toBe('tracked');
  });

  it('deduplicates history when recording the same flight number', () => {
    recordFlightHistory(sampleFlight, 'searched', 'AA100 search');
    const updated = recordFlightHistory(sampleFlight, 'tracked');
    expect(updated).toHaveLength(1);
    expect(updated[0].actionType).toBe('tracked');
  });

  it('removes an item by ID', () => {
    const updated = recordFlightHistory(sampleFlight, 'tracked');
    const itemId = updated[0].id;
    const remaining = removeFlightHistoryItem(itemId);
    expect(remaining).toHaveLength(0);
  });

  it('clears all history', () => {
    recordFlightHistory(sampleFlight, 'tracked');
    clearFlightHistory();
    expect(loadFlightHistory()).toEqual([]);
  });
});
