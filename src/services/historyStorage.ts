/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FlightHistoryEntry, Flight } from '../types';

const STORAGE_KEY = 'skytrack_flight_history_v1';
const MAX_HISTORY_ITEMS = 100;

export function loadFlightHistory(): FlightHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(item => item && item.id && item.flightNumber);
    }
  } catch {
    // Fail gracefully on corrupted localStorage
  }
  return [];
}

export function saveFlightHistory(entries: FlightHistoryEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY_ITEMS)));
  } catch {
    // Handle storage quota issues gracefully
  }
}

export function recordFlightHistory(
  flight: Flight,
  actionType: 'searched' | 'tracked',
  searchQuery?: string
): FlightHistoryEntry[] {
  const currentHistory = loadFlightHistory();
  const now = new Date().toISOString();

  // Check if flight already exists by flightNumber
  const normalizedFlightNumber = flight.flightNumber.trim().toUpperCase();
  const existingIndex = currentHistory.findIndex(
    h => h.flightNumber.trim().toUpperCase() === normalizedFlightNumber
  );

  const newEntry: FlightHistoryEntry = {
    id: existingIndex >= 0 ? currentHistory[existingIndex].id : `hist_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    flightNumber: flight.flightNumber,
    airline: flight.airline || 'Unknown Sector',
    origin: {
      code: flight.origin?.code || '---',
      city: flight.origin?.city || 'UNKNOWN',
      lat: flight.origin?.lat,
      lng: flight.origin?.lng,
    },
    destination: {
      code: flight.destination?.code || '---',
      city: flight.destination?.city || 'UNKNOWN',
      lat: flight.destination?.lat,
      lng: flight.destination?.lng,
    },
    status: flight.status || 'scheduled',
    actionType,
    timestamp: now,
    searchQuery: searchQuery || (existingIndex >= 0 ? currentHistory[existingIndex].searchQuery : undefined),
    aircraftType: flight.aircraftType,
    currentPosition: flight.currentPosition ? { ...flight.currentPosition } : undefined,
    flightSnapshot: flight,
  };

  let updated: FlightHistoryEntry[];
  if (existingIndex >= 0) {
    // Remove previous instance and put updated entry at the top
    const withoutExisting = currentHistory.filter((_, idx) => idx !== existingIndex);
    updated = [newEntry, ...withoutExisting];
  } else {
    updated = [newEntry, ...currentHistory];
  }

  const capped = updated.slice(0, MAX_HISTORY_ITEMS);
  saveFlightHistory(capped);
  return capped;
}

export function removeFlightHistoryItem(id: string): FlightHistoryEntry[] {
  const current = loadFlightHistory();
  const updated = current.filter(item => item.id !== id);
  saveFlightHistory(updated);
  return updated;
}

export function clearFlightHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Silent fail
  }
}
