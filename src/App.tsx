/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Map as FlightMap } from './components/Map';
import { FlightModal } from './components/FlightModal';
import { SettingsModal } from './components/SettingsModal';
import { FlightHistoryPanel } from './components/FlightHistoryPanel';
import { Sidebar } from './components/layout/Sidebar';
import { FlightDetailSidebar } from './components/layout/FlightDetailSidebar';
import { HUD } from './components/layout/HUD';
import { Flight, FlightHistoryEntry, LiveRadarFlight, UserLocation, UserPreferences } from './types';
import { getFlightTelemetry, getInitialFlights, searchFlights } from './services/geminiService';
import {
  clearFlightHistory,
  loadFlightHistory,
  recordFlightHistory,
  removeFlightHistoryItem,
} from './services/historyStorage';
import { Activity, AlertTriangle, Radio, Terminal, Trash2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { clsx as cn } from 'clsx';
import { calculateDistance } from './lib/utils';

const DEFAULT_PREFERENCES: UserPreferences = {
  units: {
    altitude: 'ft',
    speed: 'kts',
    distance: 'nm',
  },
  mapStyle: 'dark',
  notifications: {
    statusChanges: true,
    proximityAlerts: false,
    proximityRadius: 50,
    audibleAlerts: false,
  },
  mapLayers: {
    weather: false,
    airspace: false,
  },
  defaultView: 'global',
};

const isBrowser = typeof window !== 'undefined';

function loadPreferences(): UserPreferences {
  if (!isBrowser) {
    return DEFAULT_PREFERENCES;
  }

  try {
    const saved = window.localStorage.getItem('skytrack_preferences');

    if (!saved) {
      return DEFAULT_PREFERENCES;
    }

    const parsed = JSON.parse(saved) as Partial<UserPreferences>;

    return {
      ...DEFAULT_PREFERENCES,
      ...parsed,
      units: {
        ...DEFAULT_PREFERENCES.units,
        ...parsed.units,
      },
      notifications: {
        ...DEFAULT_PREFERENCES.notifications,
        ...parsed.notifications,
      },
      mapLayers: {
        ...DEFAULT_PREFERENCES.mapLayers,
        ...parsed.mapLayers,
      },
    };
  } catch (error) {
    console.warn('Failed to load saved preferences:', error);
    return DEFAULT_PREFERENCES;
  }
}


function toLiveFlight(radarFlight: LiveRadarFlight): Flight {
  const callsign = radarFlight.callsign?.trim();

  return {
    id: radarFlight.id,
    flightNumber:
      callsign && callsign !== 'N/A'
        ? callsign
        : `H-${radarFlight.id.slice(0, 4).toUpperCase()}`,
    airline: radarFlight.origin_country || 'Unknown Sector',
    origin: {
      code: '---',
      city: 'LIVE',
      lat: radarFlight.lat,
      lng: radarFlight.lng,
    },
    destination: {
      code: '---',
      city: 'LIVE',
      lat: radarFlight.lat,
      lng: radarFlight.lng,
    },
    departureTime: radarFlight.timestamp ?? new Date().toISOString(),
    arrivalTime: radarFlight.timestamp ?? new Date().toISOString(),
    status: radarFlight.on_ground ? 'landed' : 'on-time',
    progress: radarFlight.on_ground ? 100 : 50,
    currentPosition: {
      lat: radarFlight.lat,
      lng: radarFlight.lng,
      altitude: radarFlight.altitude,
      speed: radarFlight.velocity,
      heading: radarFlight.heading,
    },
  };
}

export default function App() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [selectedFlightId, setSelectedFlightId] = useState<string>();
  const [isSearching, setIsSearching] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobileListOpen, setIsMobileListOpen] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyEntries, setHistoryEntries] = useState<FlightHistoryEntry[]>(() =>
    isBrowser ? loadFlightHistory() : [],
  );
  const [editingFlight, setEditingFlight] = useState<Flight>();
  const [liveRadarActive, setLiveRadarActive] = useState(false);
  const [liveRadarFlights, setLiveRadarFlights] = useState<LiveRadarFlight[]>([]);
  const [userLocation, setUserLocation] = useState<UserLocation>();
  const [locationError, setLocationError] = useState<string>();
  const [preferences, setPreferences] = useState<UserPreferences>(loadPreferences);
  const [activeAlerts, setActiveAlerts] = useState<Set<string>>(new Set());
  const [isTelemetryLoading, setIsTelemetryLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [flightToDelete, setFlightToDelete] = useState<Flight | null>(null);
  const [clock, setClock] = useState(() => new Date());

  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousStatusMapRef = useRef<Map<string, string>>(new Map());
  const attemptedTelemetryIdsRef = useRef<Set<string>>(new Set());
  const telemetryInFlightIdsRef = useRef<Set<string>>(new Set());
  const activeAlertsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const intervalId = window.setInterval(() => setClock(new Date()), 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const showToast = useCallback((message: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }

    setToastMessage(message);

    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
      toastTimeoutRef.current = null;
    }, 4000);
  }, []);

  const playAlertSound = useCallback(async () => {
    if (!preferences.notifications.audibleAlerts || !isBrowser) {
      return;
    }

    const AudioContextConstructor =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextConstructor) {
      return;
    }

    try {
      const audioContext = new AudioContextConstructor();

      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(440, audioContext.currentTime + 0.1);

      gain.gain.setValueAtTime(0.1, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      oscillator.connect(gain);
      gain.connect(audioContext.destination);

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.3);

      oscillator.onended = () => {
        void audioContext.close();
      };
    } catch (error) {
      console.warn('Audio alerts are unavailable:', error);
    }
  }, [preferences.notifications.audibleAlerts]);

  const fetchFlights = useCallback(async (): Promise<Flight[]> => {
    try {
      const response = await fetch('/api/flights');

      if (!response.ok) {
        throw new Error(`Flight API returned ${response.status}`);
      }

      const data = (await response.json()) as Flight[];
      setFlights(data);

      setSelectedFlightId((currentSelection) => {
        if (currentSelection && data.some((flight) => flight.id === currentSelection)) {
          return currentSelection;
        }

        return !liveRadarActive && data.length > 0 ? data[0].id : undefined;
      });

      return data;
    } catch (error) {
      console.warn('Failed to fetch flights from API:', error);
      showToast('Unable to refresh flight records');
      return [];
    }
  }, [liveRadarActive, showToast]);

  const fetchLiveRadar = useCallback(async () => {
    try {
      const response = await fetch('/api/external/live-flights');

      if (!response.ok) {
        throw new Error(`Live radar API returned ${response.status}`);
      }

      const data = (await response.json()) as LiveRadarFlight[];
      setLiveRadarFlights(data);
    } catch (error) {
      console.warn('Live radar fetch failed:', error);
      showToast('Live radar feed is temporarily unavailable');
    }
  }, [showToast]);

  const getUserLocation = useCallback(() => {
    if (!isBrowser || !('geolocation' in navigator)) {
      setLocationError('UNSUPPORTED');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationError(undefined);
      },
      (error) => {
        const message = error.code === error.PERMISSION_DENIED ? 'PERM_DENIED' : `ERR_${error.code}`;
        console.warn(`Geolocation unavailable (${error.code}): ${error.message}`);
        setLocationError(message);
      },
      {
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 300000,
      },
    );
  }, []);

  useEffect(() => {
    if (!preferences.notifications.statusChanges) {
      previousStatusMapRef.current.clear();
      return;
    }

    for (const flight of flights) {
      const previousStatus = previousStatusMapRef.current.get(flight.id);

      if (previousStatus && previousStatus !== flight.status) {
        showToast(
          `STATUS ADVISORY: Flight ${flight.flightNumber} changed to ${flight.status.toUpperCase()}`,
        );
      }

      previousStatusMapRef.current.set(flight.id, flight.status);
    }
  }, [flights, preferences.notifications.statusChanges, showToast]);

  useEffect(() => {
    if (!preferences.notifications.proximityAlerts || !userLocation) {
      activeAlertsRef.current = new Set();
      setActiveAlerts((current) => (current.size > 0 ? new Set() : current));
      return;
    }

    const candidateFlights: Flight[] = [
      ...flights,
      ...liveRadarFlights.map(toLiveFlight),
    ];

    const newAlerts = new Set<string>();

    for (const flight of candidateFlights) {
      const position = flight.currentPosition;

      if (!position) {
        continue;
      }

      const distanceNm = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        position.lat,
        position.lng,
      );

      if (distanceNm <= preferences.notifications.proximityRadius) {
        newAlerts.add(flight.id);
      }
    }

    const hasNewAlert = [...newAlerts].some((id) => !activeAlertsRef.current.has(id));
    const alertsChanged =
      newAlerts.size !== activeAlertsRef.current.size ||
      [...newAlerts].some((id) => !activeAlertsRef.current.has(id));

    if (hasNewAlert) {
      void playAlertSound();
      showToast(
        `RADAR ALERT: Aircraft entered proximity sector (< ${preferences.notifications.proximityRadius} NM)`,
      );
    }

    if (alertsChanged) {
      activeAlertsRef.current = newAlerts;
      setActiveAlerts(newAlerts);
    }
  }, [
    flights,
    liveRadarFlights,
    playAlertSound,
    preferences.notifications.proximityAlerts,
    preferences.notifications.proximityRadius,
    showToast,
    userLocation,
  ]);

  useEffect(() => {
    if (!liveRadarActive) {
      setLiveRadarFlights([]);
      return;
    }

    let cancelled = false;

    const refreshRadar = async () => {
      try {
        const response = await fetch('/api/external/live-flights');

        if (!response.ok) {
          throw new Error(`Live radar API returned ${response.status}`);
        }

        const data = (await response.json()) as LiveRadarFlight[];

        if (!cancelled) {
          setLiveRadarFlights(data);
        }
      } catch (error) {
        if (!cancelled) {
          console.warn('Live radar fetch failed:', error);
        }
      }
    };

    void refreshRadar();
    const intervalId = window.setInterval(() => void refreshRadar(), 15000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [liveRadarActive]);

  useEffect(() => {
    let cancelled = false;

    const initializeData = async () => {
      setIsSearching(true);

      try {
        const response = await fetch('/api/flights');

        if (!response.ok) {
          throw new Error(`Flight API returned ${response.status}`);
        }

        const existingFlights = (await response.json()) as Flight[];

        if (cancelled) {
          return;
        }

        if (existingFlights.length > 0) {
          setFlights(existingFlights);
          setSelectedFlightId((currentSelection) => currentSelection ?? existingFlights[0].id);
          return;
        }

        const initialFlights = await getInitialFlights();

        if (cancelled) {
          return;
        }

        const saveResults = await Promise.allSettled(
          initialFlights.map(async (flight) => {
            const saveResponse = await fetch('/api/flights', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(flight),
            });

            if (!saveResponse.ok) {
              throw new Error(`Could not save ${flight.flightNumber}`);
            }
          }),
        );

        const failedSaves = saveResults.filter((result) => result.status === 'rejected');

        if (failedSaves.length > 0) {
          console.warn('Some initial flights could not be saved:', failedSaves);
        }

        const finalResponse = await fetch('/api/flights');

        if (!finalResponse.ok) {
          throw new Error(`Flight refresh returned ${finalResponse.status}`);
        }

        const finalFlights = (await finalResponse.json()) as Flight[];

        if (!cancelled) {
          setFlights(finalFlights);
          setSelectedFlightId((currentSelection) => currentSelection ?? finalFlights[0]?.id);
        }
      } catch (error) {
        console.warn('Flight initialization failed:', error);

        if (!cancelled) {
          showToast('Unable to initialize flight data');
        }
      } finally {
        if (!cancelled) {
          setIsSearching(false);
        }
      }
    };

    getUserLocation();
    void initializeData();

    return () => {
      cancelled = true;
    };
  }, [getUserLocation, showToast]);

  useEffect(() => {
    if (!isBrowser) {
      return;
    }

    const sharedFlightId = new URLSearchParams(window.location.search).get('flightId');

    if (sharedFlightId) {
      setSelectedFlightId(sharedFlightId);
      setIsSidebarOpen(true);
    }
  }, []);

  const selectedFlight = useMemo(
    () => flights.find((flight) => flight.id === selectedFlightId),
    [flights, selectedFlightId],
  );

  const selectedLiveFlight = useMemo(
    () => liveRadarFlights.find((flight) => flight.id === selectedFlightId),
    [liveRadarFlights, selectedFlightId],
  );

  useEffect(() => {
    if (!selectedFlight || selectedFlight.telemetry) {
      return;
    }

    const flightId = selectedFlight.id;

    if (
      attemptedTelemetryIdsRef.current.has(flightId) ||
      telemetryInFlightIdsRef.current.has(flightId)
    ) {
      return;
    }

    let cancelled = false;

    const loadTelemetry = async () => {
      attemptedTelemetryIdsRef.current.add(flightId);
      telemetryInFlightIdsRef.current.add(flightId);
      setIsTelemetryLoading(true);

      try {
        const telemetry = await getFlightTelemetry(selectedFlight);

        if (!cancelled && telemetry) {
          setFlights((currentFlights) =>
            currentFlights.map((flight) =>
              flight.id === flightId ? { ...flight, telemetry } : flight,
            ),
          );
        }
      } catch (error) {
        attemptedTelemetryIdsRef.current.delete(flightId);
        console.warn(`Telemetry fetch failed for ${flightId}:`, error);
      } finally {
        telemetryInFlightIdsRef.current.delete(flightId);

        if (!cancelled) {
          setIsTelemetryLoading(false);
        }
      }
    };

    void loadTelemetry();

    return () => {
      cancelled = true;
    };
  }, [selectedFlight]);

  const handleSavePreferences = useCallback((newPreferences: UserPreferences) => {
    setPreferences(newPreferences);

    if (isBrowser) {
      try {
        window.localStorage.setItem('skytrack_preferences', JSON.stringify(newPreferences));
      } catch (error) {
        console.warn('Could not persist preferences:', error);
      }
    }
  }, []);

  const handleShareFlight = useCallback(async () => {
    const flight =
      flights.find((item) => item.id === selectedFlightId) ??
      liveRadarFlights.find((item) => item.id === selectedFlightId);

    if (!flight || !isBrowser) {
      return;
    }

    const flightNumber =
      'flightNumber' in flight
        ? flight.flightNumber
        : flight.callsign?.trim() || flight.id;

    const airline =
      'airline' in flight
        ? flight.airline
        : flight.origin_country || 'Unknown airline';

    const shareUrl = `${window.location.origin}${window.location.pathname}?flightId=${encodeURIComponent(
      flight.id,
    )}`;

    const shareData = {
      title: `Track Flight ${flightNumber} on SkyTrack`,
      text: `Check out the real-time status of ${flightNumber} (${airline}).`,
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        console.warn('Native sharing failed:', error);
      }
    }

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard API unavailable');
      }

      await navigator.clipboard.writeText(shareUrl);
      showToast('Tracking link copied to clipboard');
    } catch (error) {
      console.warn('Could not copy share URL:', error);
      showToast('Could not copy tracking link');
    }
  }, [flights, liveRadarFlights, selectedFlightId, showToast]);

  const handleSearch = useCallback(
    async (query: string) => {
      const normalizedQuery = query.trim();

      if (!normalizedQuery) {
        showToast('Enter a flight number, route, airport, or airline');
        return;
      }

      setIsSearching(true);

      try {
        const foundFlights = await searchFlights(normalizedQuery);

        if (foundFlights.length === 0) {
          showToast(`No flights detected matching "${normalizedQuery}"`);
          return;
        }

        const saveResults = await Promise.allSettled(
          foundFlights.map(async (flight) => {
            const response = await fetch('/api/flights', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...flight,
                source: 'tracked',
              }),
            });

            if (!response.ok) {
              throw new Error(`Unable to persist ${flight.flightNumber}`);
            }
          }),
        );

        if (saveResults.some((result) => result.status === 'rejected')) {
          showToast('Flights found, but some could not be saved');
        }

        const response = await fetch('/api/flights');
        let nextFlights = foundFlights;

        if (response.ok) {
          nextFlights = (await response.json()) as Flight[];
        }

        setFlights(nextFlights);

        const firstFound = foundFlights[0];
        const matchingFlight = nextFlights.find(
          (flight) =>
            flight.id === firstFound.id ||
            flight.flightNumber.toUpperCase() === firstFound.flightNumber.toUpperCase(),
        );

        setSelectedFlightId(matchingFlight?.id ?? firstFound.id);
        setIsSidebarOpen(true);

        let updatedHistory = loadFlightHistory();

        for (const flight of foundFlights) {
          updatedHistory = recordFlightHistory(flight, 'searched', normalizedQuery);
        }

        setHistoryEntries(updatedHistory);
        showToast(`Radar targeted ${foundFlights.length} flights matching "${normalizedQuery}"`);
      } catch (error) {
        console.warn('Search failed:', error);
        showToast('Search encountered an error');
      } finally {
        setIsSearching(false);
      }
    },
    [showToast],
  );

  const handleSaveFlight = useCallback(
    async (payload: Partial<Flight>) => {
      const url = editingFlight ? `/api/flights/${editingFlight.id}` : '/api/flights';
      const method = editingFlight ? 'PATCH' : 'POST';

      try {
        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`Save failed with status ${response.status}`);
        }

        const refreshedFlights = await fetchFlights();

        const savedFlight = refreshedFlights.find(
          (flight) =>
            flight.id === editingFlight?.id ||
            flight.flightNumber === payload.flightNumber,
        );

        if (savedFlight) {
          setSelectedFlightId(savedFlight.id);
        }

        setShowModal(false);
        setEditingFlight(undefined);
        showToast(`Flight ${payload.flightNumber ?? 'record'} updated`);
      } catch (error) {
        console.warn('Flight save failed:', error);
        showToast(`Unable to save flight ${payload.flightNumber ?? 'record'}`);
      }
    },
    [editingFlight, fetchFlights, showToast],
  );

  const handleDeleteFlight = useCallback(
    (id: string, event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();

      const flight = flights.find((item) => item.id === id);

      if (flight) {
        setFlightToDelete(flight);
      }
    },
    [flights],
  );

  const confirmDeleteFlight = useCallback(async () => {
    if (!flightToDelete) {
      return;
    }

    const { id, flightNumber } = flightToDelete;

    try {
      const response = await fetch(`/api/flights/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Delete failed with status ${response.status}`);
      }

      attemptedTelemetryIdsRef.current.delete(id);
      telemetryInFlightIdsRef.current.delete(id);

      setFlights((currentFlights) => currentFlights.filter((flight) => flight.id !== id));

      setSelectedFlightId((currentSelection) =>
        currentSelection === id ? undefined : currentSelection,
      );

      showToast(`Flight ${flightNumber} erased from matrix`);
    } catch (error) {
      console.warn('Delete flight failed:', error);
      showToast(`Failed to erase flight ${flightNumber}`);
    } finally {
      setFlightToDelete(null);
    }
  }, [flightToDelete, showToast]);

  const handleSelectFlight = useCallback(
    (id: string) => {
      setSelectedFlightId(id);
      setIsSidebarOpen(true);

      const trackedFlight = flights.find((flight) => flight.id === id);

      if (trackedFlight) {
        setHistoryEntries(recordFlightHistory(trackedFlight, 'tracked'));
        return;
      }

      const liveFlight = liveRadarFlights.find((flight) => flight.id === id);

      if (liveFlight) {
        setHistoryEntries(recordFlightHistory(toLiveFlight(liveFlight), 'tracked'));
      }
    },
    [flights, liveRadarFlights],
  );

  const handleSelectFlightFromHistory = useCallback(
    (entry: FlightHistoryEntry) => {
      const existingFlight = flights.find(
        (flight) =>
          flight.id === entry.id ||
          flight.flightNumber.toUpperCase() === entry.flightNumber.toUpperCase(),
      );

      if (existingFlight) {
        setSelectedFlightId(existingFlight.id);
        setHistoryEntries(recordFlightHistory(existingFlight, 'tracked'));
      } else if (entry.flightSnapshot) {
        const snapshot = entry.flightSnapshot;

        setFlights((currentFlights) => [
          snapshot,
          ...currentFlights.filter((flight) => flight.id !== snapshot.id),
        ]);
        setSelectedFlightId(snapshot.id);
        setHistoryEntries(recordFlightHistory(snapshot, 'tracked'));
      } else {
        const restoredFlight: Flight = {
          id: entry.id,
          flightNumber: entry.flightNumber,
          airline: entry.airline,
          origin: {
            code: entry.origin.code,
            city: entry.origin.city,
            lat: entry.origin.lat ?? 0,
            lng: entry.origin.lng ?? 0,
          },
          destination: {
            code: entry.destination.code,
            city: entry.destination.city,
            lat: entry.destination.lat ?? 0,
            lng: entry.destination.lng ?? 0,
          },
          departureTime: new Date().toISOString(),
          arrivalTime: new Date().toISOString(),
          status: entry.status ?? 'on-time',
          progress: 50,
          aircraftType: entry.aircraftType,
          currentPosition: entry.currentPosition
            ? {
                lat: entry.currentPosition.lat,
                lng: entry.currentPosition.lng,
                altitude: entry.currentPosition.altitude ?? 35000,
                speed: entry.currentPosition.speed ?? 450,
                heading: entry.currentPosition.heading ?? 90,
              }
            : undefined,
        };

        setFlights((currentFlights) => [
          restoredFlight,
          ...currentFlights.filter((flight) => flight.id !== restoredFlight.id),
        ]);
        setSelectedFlightId(restoredFlight.id);
        setHistoryEntries(recordFlightHistory(restoredFlight, 'tracked'));
      }

      setIsSidebarOpen(true);
    },
    [flights],
  );

  const handleRemoveHistoryItem = useCallback((id: string) => {
    setHistoryEntries(removeFlightHistoryItem(id));
  }, []);

  const handleClearHistory = useCallback(() => {
    clearFlightHistory();
    setHistoryEntries([]);
  }, []);

  const transformedLiveRadarFlights = useMemo(
    () => liveRadarFlights.map(toLiveFlight),
    [liveRadarFlights],
  );

  const mapFlights = liveRadarActive ? transformedLiveRadarFlights : flights;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#0B0F19] font-sans selection:bg-blue-500/30">
      <Sidebar
        isMobileListOpen={isMobileListOpen}
        setIsMobileListOpen={setIsMobileListOpen}
        liveRadarActive={liveRadarActive}
        setLiveRadarActive={setLiveRadarActive}
        setShowSettings={setShowSettings}
        setShowHistory={setShowHistory}
        setShowModal={setShowModal}
        setEditingFlight={setEditingFlight}
        flights={flights}
        liveRadarFlights={liveRadarFlights}
        isSearching={isSearching}
        handleSearch={handleSearch}
        fetchFlights={fetchFlights}
        fetchLiveRadar={fetchLiveRadar}
        selectedFlightId={selectedFlightId}
        handleSelectFlight={handleSelectFlight}
        handleDeleteFlight={handleDeleteFlight}
        historyCount={historyEntries.length}
      />

      <main className="relative flex h-full flex-1 flex-col bg-[#080B14]">
        <button
          type="button"
          aria-label="Open flight list"
          onClick={() => setIsMobileListOpen(true)}
          className={cn(
            'lg:hidden absolute top-4 left-4 z-20 rounded-full bg-blue-600 p-3 text-white shadow-2xl transition-all active:scale-90',
            isMobileListOpen && 'pointer-events-none opacity-0',
          )}
        >
          <Terminal className="h-6 w-6" />
        </button>

        <div className="relative min-h-0 flex-1">
          <HUD
            activeAlerts={activeAlerts}
            preferences={preferences}
            liveRadarActive={liveRadarActive}
            liveRadarFlights={liveRadarFlights}
            flights={flights}
          />

          <FlightMap
            flights={mapFlights}
            selectedFlightId={selectedFlightId}
            onSelectFlight={handleSelectFlight}
            userLocation={userLocation}
            preferences={preferences}
            activeAlerts={activeAlerts}
          />

          <AnimatePresence>
            {isSidebarOpen && (selectedFlight || selectedLiveFlight) && (
              <FlightDetailSidebar
                isSidebarOpen={isSidebarOpen}
                setIsSidebarOpen={setIsSidebarOpen}
                selectedFlight={selectedFlight}
                selectedLiveFlight={selectedLiveFlight}
                handleShareFlight={handleShareFlight}
                preferences={preferences}
                isTelemetryLoading={isTelemetryLoading}
              />
            )}
          </AnimatePresence>
        </div>

        <div className="flex h-12 items-center justify-between border-t border-gray-800 bg-black px-4 font-mono text-[10px]">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Radio className="h-3 w-3 text-emerald-500" />
              <span className="tracking-tighter text-emerald-500/80">
                DATA LINK: ACTIVE @ {clock.getSeconds()}s
              </span>
            </div>

            <div className="hidden items-center gap-2 text-gray-600 md:flex">
              <Activity className="h-3 w-3" />
              <span className="truncate">PACKET FEED: OK / CRC CHECKED</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-gray-600">
            <div className="flex items-center gap-2">
              <div className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </div>
              <span className="text-[9px] font-bold text-emerald-500">
                SYSTEMS_OPERATIONAL
              </span>
            </div>

            <span className="hidden text-blue-500/50 lg:inline">
              SYSTEM_UPTIME:{' '}
              {isBrowser ? `${Math.floor(window.performance.now() / 1000)}s` : '0s'}
            </span>

            {locationError && (
              <div className="flex items-center gap-2 text-red-500/80">
                <AlertTriangle className="h-3 w-3" />
                <span className="cursor-default text-[9px] font-mono uppercase tracking-widest">
                  {locationError === 'PERM_DENIED'
                    ? 'LOC_PERM_DENIED'
                    : 'LOC_UNAVAILABLE'}
                </span>
                <button
                  type="button"
                  onClick={getUserLocation}
                  className="ml-1 rounded border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 text-[8px] font-bold text-red-400 transition-all hover:bg-red-500/20 active:scale-95"
                >
                  RETRY_LOCK
                </button>
              </div>
            )}

            {userLocation && (
              <div className="hidden items-center gap-2 text-emerald-500/50 xl:flex">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>
                  POS_LOCK: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                </span>
              </div>
            )}

            <span className="text-white">
              UTC {clock.toISOString().split('T')[1].split('.')[0]}
            </span>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-0 crt-overlay opacity-20" />
      </main>

      <AnimatePresence>
        {showModal && (
          <FlightModal
            flight={editingFlight}
            onClose={() => {
              setShowModal(false);
              setEditingFlight(undefined);
            }}
            onSave={handleSaveFlight}
          />
        )}

        {showSettings && (
          <SettingsModal
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
            preferences={preferences}
            onSave={handleSavePreferences}
          />
        )}

        {showHistory && (
          <FlightHistoryPanel
            isOpen={showHistory}
            onClose={() => setShowHistory(false)}
            historyEntries={historyEntries}
            onSelectFlightFromHistory={handleSelectFlightFromHistory}
            onRemoveHistoryItem={handleRemoveHistoryItem}
            onClearHistory={handleClearHistory}
          />
        )}

        {flightToDelete && (
          <div
            role="presentation"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-flight-title"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-lg border border-red-900/60 bg-[#0B0F19] p-6 font-mono shadow-[0_0_50px_rgba(220,38,38,0.2)]"
            >
              <div className="mb-4 flex items-center gap-3 text-red-400">
                <div className="rounded border border-red-500/40 bg-red-950/60 p-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <h3
                    id="delete-flight-title"
                    className="text-sm font-bold uppercase tracking-wider text-white"
                  >
                    Erase Flight Trajectory
                  </h3>
                  <p className="text-[10px] text-gray-500">
                    De-registering flight vector from memory and database
                  </p>
                </div>
              </div>

              <div className="mb-5 space-y-1 rounded border border-gray-800 bg-black/60 p-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">CALLSIGN:</span>
                  <span className="font-bold text-white">{flightToDelete.flightNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">AIRLINE:</span>
                  <span className="text-gray-300">{flightToDelete.airline}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">ROUTING:</span>
                  <span className="text-blue-400">
                    {flightToDelete.origin.code} → {flightToDelete.destination.code}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setFlightToDelete(null)}
                  className="cursor-pointer rounded border border-gray-700 bg-gray-900 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 transition-all hover:bg-gray-800 hover:text-white"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => void confirmDeleteFlight()}
                  className="flex cursor-pointer items-center gap-1.5 rounded border border-red-500 bg-red-600 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white shadow-[0_0_15px_rgba(220,38,38,0.3)] transition-all hover:bg-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Erase From Matrix
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {toastMessage && (
          <motion.div
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="pointer-events-auto fixed bottom-14 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded border border-blue-500/40 bg-[#0B0F19]/95 px-4 py-2.5 font-mono text-xs text-white shadow-2xl backdrop-blur-xl"
          >
            <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
            <span className="tracking-tight text-blue-200">{toastMessage}</span>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => setToastMessage(null)}
              className="ml-2 cursor-pointer text-gray-500 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
