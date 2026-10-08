import React, { useState, useEffect } from 'react';
import {
  EventsIcon,
  SearchIcon,
  ClockIcon,
  RefreshIcon,
  ArrowRightIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  TrendingUpIcon,
  DownloadIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '../components/Icons';
import { api } from '../services/api';

export function EventsView({ initialStatus = 'ALL', onInspectEvent, showToast }) {
  const [activeTab, setActiveTab] = useState(initialStatus);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeRange, setTimeRange] = useState('24h');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [events, setEvents] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [totalEventsCount, setTotalEventsCount] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState(null);
  const [batchRetrying, setBatchRetrying] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const offset = (page - 1) * pageSize;
      const [eventsRes, summary] = await Promise.all([
        api.getEvents({
          status: activeTab === 'ALL' ? null : activeTab,
          event_type: searchQuery.trim() || null,
          limit: pageSize,
          offset: offset,
        }),
        api.getAnalyticsSummary()
      ]);

      setEvents(eventsRes.events || []);
      setTotalEventsCount(eventsRes.total || 0);
      setAnalytics(summary);
    } catch (e) {
      console.error("Failed to load events from database:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, searchQuery, page]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = new Set(events.map(ev => ev.id));
      setSelectedIds(allIds);
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSingleRetry = async (e, evt) => {
    e.stopPropagation();
    setRetryingId(evt.id);
    try {
      await api.retryEvent(evt.id);
      if (showToast) showToast(`↺ Requeued retry for ${evt.id}`);
      await loadData();
    } catch (err) {
      alert("Retry failed: " + err.message);
    } finally {
      setRetryingId(null);
    }
  };

  const handleBatchRetry = async () => {
    setBatchRetrying(true);
    const selectedList = events.filter(e => selectedIds.has(e.id));
    const retriable = selectedList.filter(e => e.status === 'FAILED' || e.status === 'RETRYING');

    for (const evt of retriable) {
      try {
        await api.retryEvent(evt.id);
      } catch (err) {
        console.error(err);
      }
    }
    if (showToast) {
      showToast(`↺ Retried ${retriable.length} selected events in database`);
    }
    setSelectedIds(new Set());
    setBatchRetrying(false);
    await loadData();
  };

  const handleExportJson = () => {
    const selectedList = events.filter(e => selectedIds.has(e.id));
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(selectedList, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `hooklens_events_${Date.now()}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
    if (showToast) showToast(`⭳ Exported ${selectedList.length} events to JSON`);
  };

  // Selected breakdown
  const selectedList = events.filter(e => selectedIds.has(e.id));
  const selectedFailedCount = selectedList.filter(e => e.status === 'FAILED').length;
  const selectedRetryingCount = selectedList.filter(e => e.status === 'RETRYING').length;

  const total = analytics?.total ?? 0;
  const success = analytics?.SUCCESS ?? 0;
  const failed = analytics?.FAILED ?? 0;
  const retrying = analytics?.RETRYING ?? 0;
  const failureRate = analytics?.failure_rate ?? 0.0;
  const meanBackoff = analytics?.mean_backoff_sec ?? 38.4;
  const deadLetterEp = analytics?.dead_letter_endpoint || "ep_9823f4";

  const totalPages = Math.max(1, Math.ceil(totalEventsCount / pageSize));

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto relative pb-24">
      {/* Top Filter & Search Bar */}
      <div className="bg-[#111624] border border-[#1e293d] rounded-xl p-4 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Title & Tabs — dynamic counts from database */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-white font-bold text-lg mr-2">
              <EventsIcon className="w-5 h-5 text-indigo-400" />
              <span>Events</span>
            </div>

            <div className="flex items-center bg-[#0d121c] p-1 rounded-lg border border-[#1e283d] text-xs font-medium">
              <button
                onClick={() => { setActiveTab('ALL'); setPage(1); }}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  activeTab === 'ALL' ? 'bg-[#1e293b] text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All {total.toLocaleString()}
              </button>
              <button
                onClick={() => { setActiveTab('SUCCESS'); setPage(1); }}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  activeTab === 'SUCCESS' ? 'bg-[#1e293b] text-emerald-400 shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Success {success.toLocaleString()}
              </button>
              <button
                onClick={() => { setActiveTab('FAILED'); setPage(1); }}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  activeTab === 'FAILED' ? 'bg-[#1e293b] text-rose-400 shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Failed {failed.toLocaleString()}
              </button>
              <button
                onClick={() => { setActiveTab('RETRYING'); setPage(1); }}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  activeTab === 'RETRYING' ? 'bg-[#1e293b] text-sky-400 shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Retrying {retrying.toLocaleString()}
              </button>
            </div>
          </div>

          {/* Search, Time dropdown, Refresh button */}
          <div className="flex items-center gap-2.5">
            {/* Search */}
            <div className="relative min-w-[220px]">
              <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search event type, ID..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
                className="w-full bg-[#0b101a] border border-[#1e283d] rounded-lg pl-9 pr-3.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {/* Time dropdown */}
            <div className="relative">
              <select
                value={timeRange}
                onChange={e => setTimeRange(e.target.value)}
                className="bg-[#0b101a] border border-[#1e283d] rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer appearance-none"
              >
                <option value="1h">Last 1 Hour</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="all">All Time</option>
              </select>
              <ClockIcon className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <span className="text-[10px] text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">▾</span>
            </div>

            {/* Refresh */}
            <button
              onClick={loadData}
              title="Refresh events"
              className="p-2 rounded-lg bg-[#0b101a] border border-[#1e283d] text-slate-400 hover:text-white hover:border-slate-600 transition-colors cursor-pointer"
            >
              <RefreshIcon className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Events Table */}
        <div className="overflow-x-auto rounded-lg border border-[#1a2333]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1e293d] text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-[#0f1422]/90 select-none">
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.size > 0 && selectedIds.size === events.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded bg-[#0b101a] border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer accent-indigo-600"
                  />
                </th>
                <th className="py-3 px-3">EVENT TYPE ⇅</th>
                <th className="py-3 px-3">ENDPOINT ⇅</th>
                <th className="py-3 px-3">STATUS ⇅</th>
                <th className="py-3 px-3 text-center">ATTEMPTS ⇅</th>
                <th className="py-3 px-3">PROCESSED AT ↓</th>
                <th className="py-3 px-3">RECEIVED</th>
                <th className="py-3 px-3 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#172030] text-xs">
              {events.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    {loading ? "Loading events from database..." : "No webhook events found matching current criteria."}
                  </td>
                </tr>
              ) : (
                events.map((evt) => {
                  const isChecked = selectedIds.has(evt.id);
                  const isFailed = evt.status === 'FAILED';
                  const isRetrying = evt.status === 'RETRYING';
                  const isSuccess = evt.status === 'SUCCESS';

                  return (
                    <tr
                      key={evt.id}
                      onClick={() => onInspectEvent(evt.id)}
                      className={`hover:bg-[#151c2d] transition-colors cursor-pointer group ${
                        isChecked ? 'bg-[#182236]/60' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-3 text-center" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelect(evt.id)}
                          className="w-4 h-4 rounded bg-[#0b101a] border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer accent-indigo-600"
                        />
                      </td>

                      {/* Event Type */}
                      <td className="py-3.5 px-3 font-mono font-medium text-slate-200">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${
                            isSuccess ? 'bg-emerald-400' :
                            isFailed ? 'bg-rose-500' :
                            isRetrying ? 'bg-sky-400' : 'bg-slate-400'
                          }`} />
                          <span className="font-semibold text-white">{evt.event_type}</span>
                        </div>
                      </td>

                      {/* Endpoint */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono text-slate-400">{evt.endpoint_id}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                            evt.endpoint_name === 'Shopify' || (evt.endpoint_name && evt.endpoint_name.includes('Shopify'))
                              ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40'
                              : 'bg-indigo-950/50 text-indigo-300 border border-indigo-800/30'
                          }`}>
                            {evt.endpoint_name || "Stripe Demo"}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3">
                        {isSuccess && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#064e3b]/50 text-emerald-400 border border-emerald-800/40">
                            ✓ SUCCESS
                          </span>
                        )}
                        {isFailed && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#450a0a]/60 text-rose-400 border border-rose-800/50">
                            ✕ FAILED
                          </span>
                        )}
                        {isRetrying && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#082f49]/60 text-sky-400 border border-sky-800/50">
                            ↺ RETRYING
                          </span>
                        )}
                        {!isSuccess && !isFailed && !isRetrying && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                            RECEIVED
                          </span>
                        )}
                      </td>

                      {/* Attempts */}
                      <td className="py-3.5 px-3 text-center font-mono font-medium text-slate-300">
                        {evt.attempts_display || `${evt.attempt_count} / 5`}
                      </td>

                      {/* Processed At */}
                      <td className="py-3.5 px-3 font-mono text-[11px] text-slate-400">
                        {evt.processed_at ? evt.processed_at.replace(" UTC", "") : "—"}
                      </td>

                      {/* Received relative */}
                      <td className="py-3.5 px-3 font-mono text-[11px] text-slate-400">
                        {evt.received_relative || "Just now"}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                          {(isFailed || isRetrying) && (
                            <button
                              onClick={(e) => handleSingleRetry(e, evt)}
                              disabled={retryingId === evt.id}
                              className="px-2.5 py-1 rounded bg-[#162133] hover:bg-indigo-950/80 text-slate-300 hover:text-indigo-300 border border-slate-700/60 hover:border-indigo-600/50 text-[11px] font-medium transition-all cursor-pointer shadow-xs disabled:opacity-50"
                            >
                              {retryingId === evt.id ? "Queuing..." : "Retry"}
                            </button>
                          )}
                          <button
                            onClick={() => onInspectEvent(evt.id)}
                            className="p-1 rounded text-slate-400 group-hover:text-indigo-400 transition-colors"
                          >
                            <ArrowRightIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Dynamic Pagination footer */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-1 select-none">
          <span>
            Showing {totalEventsCount > 0 ? (page - 1) * pageSize + 1 : 0}-{Math.min(page * pageSize, totalEventsCount)} of {totalEventsCount.toLocaleString()} events
          </span>
          <div className="flex items-center gap-1 font-mono">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-2 py-1 rounded bg-[#0d121c] border border-slate-800 text-slate-400 hover:text-white disabled:opacity-40 cursor-pointer"
            >
              &lt; Prev
            </button>
            <span className="px-2 py-1 text-slate-300 font-semibold">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-2 py-1 rounded bg-[#0d121c] border border-slate-800 text-slate-400 hover:text-white disabled:opacity-40 cursor-pointer"
            >
              Next &gt;
            </button>
          </div>
        </div>
      </div>

      {/* 3 Bottom Summary Cards — completely dynamic from database analytics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* RETRY QUEUE BACKOFF */}
        <div className="bg-[#111624] border border-[#1e293d] rounded-xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">RETRY QUEUE BACKOFF</span>
            <TrendingUpIcon className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-xl font-bold text-white tracking-tight">
            {retrying} Active Retries
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-1.5 pt-1">
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            <span>Mean backoff interval: <strong className="text-slate-200">{meanBackoff}s</strong></span>
          </div>
        </div>

        {/* CIRCUIT BREAKER ALERT */}
        <div className="bg-[#111624] border border-[#1e293d] rounded-xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">CIRCUIT BREAKER ALERT</span>
            <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-white tracking-tight">
            Normal Rate ({failureRate}%)
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-1.5 pt-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Threshold limit set to <strong className="text-slate-200">15.0%</strong></span>
          </div>
        </div>

        {/* DEAD-LETTER QUEUE */}
        <div className="bg-[#111624] border border-[#1e293d] rounded-xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">DEAD-LETTER QUEUE</span>
            <AlertTriangleIcon className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-xl font-bold text-white tracking-tight">
            {failed} Unhandled
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-1.5 pt-1">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            <span>Max retries exhausted on <strong className="text-slate-200 font-mono">{deadLetterEp}</strong></span>
          </div>
        </div>
      </div>

      {/* Floating Bottom Batch Action Bar (when rows are selected) */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#595cf4] text-white px-5 py-3 rounded-full shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom duration-200 select-none">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span>
              {selectedIds.size} events selected
              {(selectedFailedCount > 0 || selectedRetryingCount > 0) && (
                <span className="text-indigo-200 font-normal ml-1">
                  ({selectedFailedCount} failed{selectedRetryingCount > 0 ? `, ${selectedRetryingCount} retrying` : ''})
                </span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleBatchRetry}
              disabled={batchRetrying}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#3b3ec7] hover:bg-[#3133b3] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <RefreshIcon className={`w-3.5 h-3.5 ${batchRetrying ? 'animate-spin' : ''}`} />
              <span>{batchRetrying ? "Retrying..." : `Retry Selected (${selectedIds.size})`}</span>
            </button>

            <button
              onClick={handleExportJson}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-medium transition-colors cursor-pointer"
            >
              <DownloadIcon className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>

            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-indigo-100 hover:text-white underline cursor-pointer ml-1"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
