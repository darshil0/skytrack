/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  History, 
  X, 
  Search, 
  Trash2, 
  Radio, 
  Plane, 
  Clock, 
  ArrowRight, 
  Download, 
  ExternalLink, 
  RotateCcw,
  SlidersHorizontal,
  Compass
} from 'lucide-react';
import { clsx as cn } from 'clsx';
import { FlightHistoryEntry, Flight } from '../types';

interface FlightHistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  historyEntries: FlightHistoryEntry[];
  onSelectFlightFromHistory: (entry: FlightHistoryEntry) => void;
  onRemoveHistoryItem: (id: string) => void;
  onClearHistory: () => void;
}

export const FlightHistoryPanel: React.FC<FlightHistoryPanelProps> = ({
  isOpen,
  onClose,
  historyEntries,
  onSelectFlightFromHistory,
  onRemoveHistoryItem,
  onClearHistory,
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'tracked' | 'searched'>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [confirmClear, setConfirmClear] = useState(false);
  const [copiedStatus, setCopiedStatus] = useState<string | null>(null);

  // Filtered and sorted entries
  const filteredEntries = useMemo(() => {
    let result = [...historyEntries];

    // Filter by tab
    if (activeTab === 'tracked') {
      result = result.filter(e => e.actionType === 'tracked');
    } else if (activeTab === 'searched') {
      result = result.filter(e => e.actionType === 'searched');
    }

    // Filter by text search
    if (filterQuery.trim()) {
      const q = filterQuery.toLowerCase().trim();
      result = result.filter(e => 
        e.flightNumber.toLowerCase().includes(q) ||
        e.airline.toLowerCase().includes(q) ||
        e.origin.code.toLowerCase().includes(q) ||
        e.origin.city.toLowerCase().includes(q) ||
        e.destination.code.toLowerCase().includes(q) ||
        e.destination.city.toLowerCase().includes(q) ||
        (e.searchQuery && e.searchQuery.toLowerCase().includes(q))
      );
    }

    // Sort order
    result.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });

    return result;
  }, [historyEntries, activeTab, filterQuery, sortOrder]);

  const stats = useMemo(() => {
    const total = historyEntries.length;
    const trackedCount = historyEntries.filter(e => e.actionType === 'tracked').length;
    const searchedCount = historyEntries.filter(e => e.actionType === 'searched').length;
    const uniqueAirlines = new Set(historyEntries.map(e => e.airline)).size;
    return { total, trackedCount, searchedCount, uniqueAirlines };
  }, [historyEntries]);

  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHours = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSec < 45) return 'Just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      return `${diffDays}d ago`;
    } catch {
      return 'Unknown';
    }
  };

  const formatUtcTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return `${date.toISOString().slice(0, 10)} ${date.toISOString().slice(11, 19)} UTC`;
    } catch {
      return isoString;
    }
  };

  const handleExportJson = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(historyEntries, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `skytrack_flight_history_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setCopiedStatus('Exported JSON');
      setTimeout(() => setCopiedStatus(null), 2500);
    } catch {
      // Fallback
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      {/* Slide-over Panel */}
      <motion.aside
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative w-full max-w-xl bg-[#0B0F19] border-l border-gray-800 h-full flex flex-col shadow-2xl z-10"
      >
        {/* Background Grid Accent */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.02] select-none z-0">
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff15_1px,transparent_1px)] bg-[size:16px_16px]" />
        </div>

        {/* Panel Header */}
        <header className="p-5 border-b border-gray-800 bg-[#0D121F] relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600/20 rounded border border-blue-500/40 flex items-center justify-center text-blue-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white uppercase italic tracking-wider">Flight History</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 font-semibold">
                  LOCAL_STORE
                </span>
              </div>
              <p className="text-[11px] font-mono text-gray-400 mt-0.5">
                Archived log of searched queries and tracked flight telemetry
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportJson}
              title="Export Flight History JSON"
              disabled={historyEntries.length === 0}
              className="p-2 bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white rounded border border-gray-700/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white bg-gray-800/80 hover:bg-gray-700 rounded border border-gray-700/60 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Metrics Strip */}
        <section className="px-5 py-3 border-b border-gray-800/80 bg-[#080B14] relative z-10 grid grid-cols-4 gap-2 text-center font-mono">
          <div className="bg-gray-900/60 rounded p-2 border border-gray-800/60">
            <span className="text-[9px] text-gray-500 uppercase block tracking-wider">Total Logged</span>
            <span className="text-sm font-bold text-white">{stats.total}</span>
          </div>
          <div className="bg-gray-900/60 rounded p-2 border border-gray-800/60">
            <span className="text-[9px] text-blue-400 uppercase block tracking-wider">Tracked</span>
            <span className="text-sm font-bold text-blue-400">{stats.trackedCount}</span>
          </div>
          <div className="bg-gray-900/60 rounded p-2 border border-gray-800/60">
            <span className="text-[9px] text-emerald-400 uppercase block tracking-wider">Searched</span>
            <span className="text-sm font-bold text-emerald-400">{stats.searchedCount}</span>
          </div>
          <div className="bg-gray-900/60 rounded p-2 border border-gray-800/60">
            <span className="text-[9px] text-amber-400 uppercase block tracking-wider">Carriers</span>
            <span className="text-sm font-bold text-amber-400">{stats.uniqueAirlines}</span>
          </div>
        </section>

        {/* Search & Filter Controls */}
        <div className="p-4 border-b border-gray-800 bg-[#090D18] space-y-3 relative z-10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Search history by flight, airline, city, or airport code..."
              className="w-full pl-9 pr-8 py-2 bg-gray-900/80 border border-gray-800 rounded-lg text-xs font-mono text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/50 transition-all"
            />
            {filterQuery && (
              <button
                onClick={() => setFilterQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            {/* Filter Tabs */}
            <div className="flex items-center bg-gray-900 rounded p-0.5 border border-gray-800 text-[11px] font-mono">
              <button
                onClick={() => setActiveTab('all')}
                className={cn(
                  "px-3 py-1 rounded transition-colors uppercase",
                  activeTab === 'all' ? "bg-blue-600 text-white font-bold shadow-sm" : "text-gray-400 hover:text-white"
                )}
              >
                All ({historyEntries.length})
              </button>
              <button
                onClick={() => setActiveTab('tracked')}
                className={cn(
                  "px-3 py-1 rounded transition-colors uppercase",
                  activeTab === 'tracked' ? "bg-blue-600 text-white font-bold shadow-sm" : "text-gray-400 hover:text-white"
                )}
              >
                Tracked ({stats.trackedCount})
              </button>
              <button
                onClick={() => setActiveTab('searched')}
                className={cn(
                  "px-3 py-1 rounded transition-colors uppercase",
                  activeTab === 'searched' ? "bg-blue-600 text-white font-bold shadow-sm" : "text-gray-400 hover:text-white"
                )}
              >
                Searched ({stats.searchedCount})
              </button>
            </div>

            {/* Sort Toggle */}
            <button
              onClick={() => setSortOrder(s => s === 'desc' ? 'asc' : 'desc')}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white rounded border border-gray-800 text-[10px] font-mono transition-colors"
              title="Toggle Sort Order"
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>{sortOrder === 'desc' ? 'NEWEST' : 'OLDEST'}</span>
            </button>
          </div>
        </div>

        {/* History Records List */}
        <section className="flex-1 overflow-y-auto p-4 space-y-3 relative z-10">
          {copiedStatus && (
            <div className="mb-2 p-2 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-mono text-center">
              {copiedStatus}
            </div>
          )}

          {filteredEntries.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gray-500">
              <div className="w-16 h-16 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center mb-4 text-gray-600">
                <History className="w-8 h-8 opacity-40" />
              </div>
              <h3 className="text-sm font-mono uppercase text-gray-300 font-bold mb-1">
                {historyEntries.length === 0 ? "No Flight History Found" : "No Matching Records"}
              </h3>
              <p className="text-xs text-gray-500 max-w-sm font-sans leading-relaxed">
                {historyEntries.length === 0
                  ? "Your historical log is currently empty. Track any flight on the radar map or search via the AI search bar to automatically record flights into local storage."
                  : `No historical flights match "${filterQuery}". Try clearing search filters.`}
              </p>
            </div>
          ) : (
            filteredEntries.map((entry) => {
              const isTracked = entry.actionType === 'tracked';

              return (
                <div
                  key={entry.id}
                  className="bg-[#0D121F]/90 hover:bg-[#111728] border border-gray-800/80 hover:border-gray-700/80 rounded-xl p-4 transition-all group relative overflow-hidden shadow-lg"
                >
                  {/* Top Bar: Action Badge + Flight Number + Airline + Timestamp */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn(
                        "text-[9px] font-mono px-2 py-0.5 rounded border uppercase tracking-wider font-semibold flex items-center gap-1",
                        isTracked 
                          ? "bg-blue-500/10 text-blue-400 border-blue-500/30" 
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      )}>
                        {isTracked ? <Radio className="w-2.5 h-2.5 animate-pulse" /> : <Search className="w-2.5 h-2.5" />}
                        {isTracked ? 'TRACKED' : 'SEARCHED'}
                      </span>

                      <span className="text-base font-mono font-black text-white tracking-tight">
                        {entry.flightNumber}
                      </span>

                      <span className="text-xs text-gray-400 font-medium">
                        {entry.airline}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] font-mono text-gray-400 block">
                          {formatRelativeTime(entry.timestamp)}
                        </span>
                        <span className="text-[9px] font-mono text-gray-600 block">
                          {formatUtcTime(entry.timestamp).slice(11, 19)}
                        </span>
                      </div>
                      
                      <button
                        onClick={() => onRemoveHistoryItem(entry.id)}
                        title="Remove from history"
                        className="p-1 text-gray-600 hover:text-red-400 rounded hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Route Display */}
                  <div className="flex items-center justify-between bg-black/40 rounded-lg p-2.5 border border-gray-800/60 mb-3">
                    <div className="flex-1">
                      <div className="text-xs font-mono font-bold text-white">
                        {entry.origin.code}
                      </div>
                      <div className="text-[11px] text-gray-400 truncate max-w-[120px]">
                        {entry.origin.city}
                      </div>
                    </div>

                    <div className="flex flex-col items-center px-4 shrink-0">
                      <div className="flex items-center gap-2 text-gray-600">
                        <div className="w-6 h-[1px] bg-gray-700" />
                        <Plane className="w-3.5 h-3.5 text-blue-400 rotate-90" />
                        <div className="w-6 h-[1px] bg-gray-700" />
                      </div>
                      <span className="text-[8px] font-mono text-gray-500 uppercase mt-0.5">
                        {entry.status}
                      </span>
                    </div>

                    <div className="flex-1 text-right">
                      <div className="text-xs font-mono font-bold text-white">
                        {entry.destination.code}
                      </div>
                      <div className="text-[11px] text-gray-400 truncate max-w-[120px]">
                        {entry.destination.city}
                      </div>
                    </div>
                  </div>

                  {/* Context Chips & Quick Track Action */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-2 text-[10px] font-mono text-gray-500 flex-wrap">
                      {entry.searchQuery && (
                        <span className="px-1.5 py-0.5 rounded bg-gray-800/80 text-gray-400 border border-gray-700/50 truncate max-w-[150px]" title={`Search query: "${entry.searchQuery}"`}>
                          "{entry.searchQuery}"
                        </span>
                      )}
                      {entry.aircraftType && (
                        <span className="px-1.5 py-0.5 rounded bg-gray-800/80 text-gray-400 border border-gray-700/50">
                          {entry.aircraftType}
                        </span>
                      )}
                      {entry.currentPosition?.altitude && (
                        <span className="text-gray-400">
                          {entry.currentPosition.altitude.toLocaleString()} FT
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        onSelectFlightFromHistory(entry);
                        onClose();
                      }}
                      className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-mono font-semibold transition-all active:scale-95 shadow-md shadow-blue-600/20"
                    >
                      <Compass className="w-3 h-3" />
                      <span>Track Now</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </section>

        {/* Panel Footer */}
        <footer className="p-4 border-t border-gray-800 bg-[#080B14] relative z-10 flex items-center justify-between">
          <div>
            {confirmClear ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-red-400">Wipe all history?</span>
                <button
                  onClick={() => {
                    onClearHistory();
                    setConfirmClear(false);
                  }}
                  className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-500 text-white text-xs font-mono font-semibold transition-colors"
                >
                  Yes, Erase
                </button>
                <button
                  onClick={() => setConfirmClear(false)}
                  className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-400 text-xs font-mono transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmClear(true)}
                disabled={historyEntries.length === 0}
                className="flex items-center gap-1.5 text-xs font-mono text-gray-500 hover:text-red-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All History</span>
              </button>
            )}
          </div>

          <span className="text-[10px] font-mono text-gray-600 uppercase">
            Showing {filteredEntries.length} of {historyEntries.length}
          </span>
        </footer>
      </motion.aside>
    </div>
  );
};
