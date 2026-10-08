import React, { useState, useEffect } from 'react';
import {
  FilterIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  RefreshIcon,
  ZapIcon,
  ArrowRightIcon,
  EventsIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '../components/Icons';
import { api } from '../services/api';

export function OverviewView({ onOpenTestWebhook, onInspectEvent }) {
  const [activeTab, setActiveTab] = useState('ALL');
  const [analytics, setAnalytics] = useState(null);
  const [events, setEvents] = useState([]);
  const [totalEventsCount, setTotalEventsCount] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const summary = await api.getAnalyticsSummary();
      setAnalytics(summary);

      const offset = (page - 1) * pageSize;
      const res = await api.getEvents({
        status: activeTab === 'ALL' ? null : activeTab,
        limit: pageSize,
        offset: offset,
      });
      setEvents(res.events || []);
      setTotalEventsCount(res.total || 0);
    } catch (e) {
      console.error("Failed to load overview data from DB:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [activeTab, page]);

  const total = analytics?.total ?? 0;
  const success = analytics?.SUCCESS ?? 0;
  const failed = analytics?.FAILED ?? 0;
  const retrying = analytics?.RETRYING ?? 0;
  const successRate = analytics?.success_rate ?? 0.0;
  const failureRate = analytics?.failure_rate ?? 0.0;
  const ingressRate = analytics?.ingress_req_sec ?? 0.0;
  const p95Latency = analytics?.p95_latency_ms ?? 0;

  const totalPages = Math.max(1, Math.ceil(totalEventsCount / pageSize));

  const sparklineBars = [
    { h: '35%', color: 'bg-slate-700' },
    { h: '60%', color: 'bg-slate-700' },
    { h: '85%', color: 'bg-emerald-500' },
    { h: '45%', color: 'bg-slate-700' },
    { h: '30%', color: 'bg-slate-700' },
    { h: '100%', color: 'bg-emerald-400' },
    { h: '55%', color: 'bg-slate-700' },
    { h: '40%', color: 'bg-slate-700' },
    { h: '65%', color: 'bg-rose-500' },
    { h: '25%', color: 'bg-slate-700' },
    { h: '90%', color: 'bg-emerald-400' },
    { h: '45%', color: 'bg-slate-700' },
  ];

  const getStatusBadge = (status, code) => {
    switch (status) {
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-[#064e3b]/50 text-emerald-400 border border-emerald-800/40">
            ✓ SUCCESS {code || 200}
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-[#450a0a]/60 text-rose-400 border border-rose-800/50">
            ✕ FAILED {code || 500}
          </span>
        );
      case 'RETRYING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-[#082f49]/60 text-sky-400 border border-sky-800/50">
            ↺ RETRYING {code || 429}
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-[#172554]/60 text-indigo-400 border border-indigo-800/50">
            ⊝ PROCESSING
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-slate-800/80 text-slate-300 border border-slate-700">
            RECEIVED 202
          </span>
        );
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-1">
            <span>telemetry</span>
            <span>/</span>
            <span>cluster-alpha</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">Overview</h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#141d2d] text-slate-400 border border-slate-800">
              v2.4.12-prod
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0c2419] border border-emerald-800/60 text-emerald-400 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live</span>
          </div>
          <button
            onClick={onOpenTestWebhook}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#141b2a] border border-[#232f45] hover:border-slate-600 text-white text-xs font-semibold transition-all cursor-pointer shadow-sm hover:bg-[#1a2337]"
          >
            <ZapIcon className="w-3.5 h-3.5 text-indigo-400" />
            <span>Send Test Webhook</span>
          </button>
        </div>
      </div>

      {/* 4 Metric Cards Grid — dynamically calculated from database */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* TOTAL EVENTS */}
        <div className="bg-[#111624] border border-[#1e293d] rounded-xl p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider">TOTAL EVENTS</span>
            <FilterIcon className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-1.5 my-1">
            <span className="text-3xl font-bold text-white tracking-tight">
              {total.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400 font-mono">ev</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-3 border-t border-[#1a2333] mt-2">
            <span>Ingress timeline</span>
            <span className="text-slate-300 font-medium">All time</span>
          </div>
        </div>

        {/* SUCCESSFUL */}
        <div className="bg-[#111624] border border-[#1e293d] rounded-xl p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400/90">SUCCESSFUL</span>
            <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2 my-1">
            <span className="text-3xl font-bold text-emerald-400 tracking-tight">
              {success.toLocaleString()}
            </span>
            <span className="text-xs text-emerald-500 font-mono">delivered</span>
          </div>
          <div className="flex items-center justify-between text-[11px] pt-3 border-t border-[#1a2333] mt-2">
            <span className="text-slate-400">Reliability score</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/60 border border-emerald-800/40 text-emerald-400">
              {successRate}% success rate
            </span>
          </div>
        </div>

        {/* FAILED */}
        <div className="bg-[#111624] border border-[#1e293d] rounded-xl p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400/90">FAILED</span>
            <AlertCircleIcon className="w-4 h-4 text-rose-400" />
          </div>
          <div className="flex items-baseline gap-2 my-1">
            <span className="text-3xl font-bold text-rose-400 tracking-tight">
              {failed.toLocaleString()}
            </span>
            <span className="text-xs text-rose-500 font-mono">dead-lettered</span>
          </div>
          <div className="flex items-center justify-between text-[11px] pt-3 border-t border-[#1a2333] mt-2">
            <span className="text-slate-400">Unresolved drops</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-950/60 border border-rose-800/40 text-rose-400">
              {failureRate}% failure rate
            </span>
          </div>
        </div>

        {/* RETRYING */}
        <div className="bg-[#111624] border border-[#1e293d] rounded-xl p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400/90">RETRYING</span>
            <RefreshIcon className="w-4 h-4 text-sky-400" />
          </div>
          <div className="flex items-baseline gap-2 my-1">
            <span className="text-3xl font-bold text-sky-400 tracking-tight">
              {retrying.toLocaleString()}
            </span>
            <span className="text-xs text-sky-500 font-mono">in backoff queue</span>
          </div>
          <div className="flex items-center justify-between text-[11px] pt-3 border-t border-[#1a2333] mt-2">
            <span className="text-slate-400">Exponential schedule</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-950/60 border border-sky-800/40 text-sky-400">
              Pending resolution
            </span>
          </div>
        </div>
      </div>

      {/* Ingress Velocity & Buffer Bar — dynamic from DB */}
      <div className="bg-[#111624] border border-[#1e293d] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              CLUSTER INGRESS VELOCITY
            </span>
            <span className="text-sm font-bold text-white tracking-tight">
              {ingressRate} req/sec avg
            </span>
          </div>
          <div className="text-xs text-slate-400 mt-1 flex items-center gap-2 font-mono">
            <span>p95 Latency: <strong className="text-slate-300 font-semibold">{p95Latency}ms</strong></span>
            <span>•</span>
            <span>Zero-loss buffer: <strong className="text-emerald-400 font-semibold">Active</strong></span>
          </div>
        </div>

        {/* Mini sparkline histogram */}
        <div className="flex items-end gap-1.5 h-8 px-2 py-1 bg-[#0b0f17] rounded-lg border border-[#1a2333]">
          {sparklineBars.map((bar, i) => (
            <div
              key={i}
              className={`w-2.5 rounded-xs transition-all duration-300 ${bar.color}`}
              style={{ height: bar.h }}
            />
          ))}
        </div>
      </div>

      {/* Recent Events Section */}
      <div className="bg-[#111624] border border-[#1e293d] rounded-xl shadow-sm overflow-hidden">
        {/* Table Header Controls */}
        <div className="p-4 border-b border-[#1e293d] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#131929]">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-white font-semibold text-sm">
              <EventsIcon className="w-4 h-4 text-indigo-400" />
              <span>Recent Events</span>
            </div>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#1a2436] text-slate-400 border border-slate-700/60">
              {totalEventsCount.toLocaleString()} logged
            </span>
          </div>

          {/* Filter Tabs — dynamic counts from database */}
          <div className="flex items-center bg-[#0d121c] p-1 rounded-lg border border-[#1e283d] text-xs font-medium">
            <button
              onClick={() => { setActiveTab('ALL'); setPage(1); }}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                activeTab === 'ALL' ? 'bg-[#1e293b] text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({total.toLocaleString()})
            </button>
            <button
              onClick={() => { setActiveTab('SUCCESS'); setPage(1); }}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                activeTab === 'SUCCESS' ? 'bg-[#1e293b] text-emerald-400 shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Success ({success.toLocaleString()})
            </button>
            <button
              onClick={() => { setActiveTab('FAILED'); setPage(1); }}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                activeTab === 'FAILED' ? 'bg-[#1e293b] text-rose-400 shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Failed ({failed.toLocaleString()})
            </button>
            <button
              onClick={() => { setActiveTab('RETRYING'); setPage(1); }}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                activeTab === 'RETRYING' ? 'bg-[#1e293b] text-sky-400 shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Retrying ({retrying.toLocaleString()})
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1e293d] text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-[#0f1422]/60">
                <th className="py-3 px-4">EVENT TYPE</th>
                <th className="py-3 px-4">ENDPOINT DESTINATION</th>
                <th className="py-3 px-4">STATUS</th>
                <th className="py-3 px-4 text-center">ATTEMPTS</th>
                <th className="py-3 px-4">RECEIVED</th>
                <th className="py-3 px-4 text-right">INSPECT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#172030] text-xs">
              {events.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    {loading ? "Loading events from database..." : "No webhook events found matching filter."}
                  </td>
                </tr>
              ) : (
                events.map((evt) => (
                  <tr
                    key={evt.id}
                    onClick={() => onInspectEvent(evt.id)}
                    className="hover:bg-[#151c2d] transition-colors cursor-pointer group"
                  >
                    {/* Event Type */}
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-200">
                      <div className="flex items-center gap-2.5">
                        <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                        <span>{evt.event_type}</span>
                      </div>
                    </td>

                    {/* Endpoint Destination */}
                    <td className="py-3.5 px-4 text-slate-300">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{evt.endpoint_name || "Stripe Demo"}</span>
                        <span className="text-[11px] font-mono text-slate-400">{evt.endpoint_id}</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {getStatusBadge(evt.status, evt.status_code)}
                    </td>

                    {/* Attempts */}
                    <td className="py-3.5 px-4 text-center font-mono font-medium">
                      <span className={
                        evt.status === 'SUCCESS' ? 'text-emerald-400' :
                        evt.status === 'FAILED' ? 'text-rose-400 font-bold' :
                        evt.status === 'RETRYING' ? 'text-sky-400 font-bold' : 'text-slate-400'
                      }>
                        {evt.attempts_display || evt.attempt_count}
                      </span>
                    </td>

                    {/* Received */}
                    <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                      {evt.received_relative || "Just now"}
                    </td>

                    {/* Inspect link */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onInspectEvent(evt.id);
                        }}
                        className="p-1 rounded text-slate-400 group-hover:text-indigo-400 transition-colors"
                      >
                        <ArrowRightIcon className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination — dynamic from database count */}
        <div className="p-4 border-t border-[#1e293d] flex items-center justify-between text-xs text-slate-400 bg-[#0f1422]/60 select-none">
          <span>
            Showing {totalEventsCount > 0 ? (page - 1) * pageSize + 1 : 0}-{Math.min(page * pageSize, totalEventsCount)} of {totalEventsCount.toLocaleString()} events
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#131b2c] border border-slate-800 text-slate-400 hover:text-white disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeftIcon className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>
            <span className="text-slate-300 font-mono font-medium px-1">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#131b2c] border border-slate-800 text-slate-400 hover:text-white disabled:opacity-40 cursor-pointer"
            >
              <span>Next</span>
              <ChevronRightIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
