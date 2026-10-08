import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  ShieldIcon,
  TrendingUpIcon,
  ZapIcon,
  CopyIcon,
  TerminalIcon,
  ExternalLinkIcon,
  EventsIcon,
  CheckCircleIcon,
  AlertTriangleIcon
} from '../components/Icons';
import { api } from '../services/api';

export function EndpointsView({ onOpenNewEndpoint, onInspectEndpointEvents, showToast }) {
  const [endpoints, setEndpoints] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);

  const loadData = async () => {
    try {
      const [eps, summary] = await Promise.all([
        api.getEndpoints(),
        api.getAnalyticsSummary()
      ]);
      setEndpoints(eps);
      setAnalytics(summary);
    } catch (e) {
      console.error("Failed to load endpoints from database:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCopyUrl = (id, url) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    if (showToast) showToast(`✓ Copied Webhook URL to clipboard`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRotateSecret = async (endpointId) => {
    try {
      const newSecret = await api.generateSecret();
      setEndpoints(prev => prev.map(ep => ep.id === endpointId ? { ...ep, secret: newSecret } : ep));
      if (showToast) showToast(`✓ Secret rotated successfully for ${endpointId}`);
    } catch (e) {
      alert("Failed to rotate secret: " + e.message);
    }
  };

  const handleDelete = async (endpointId, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? This will delete the endpoint and its events from the database.`)) {
      return;
    }
    try {
      await api.deleteEndpoint(endpointId);
      setEndpoints(prev => prev.filter(ep => ep.id !== endpointId));
      if (showToast) showToast(`✓ Endpoint deleted: ${name}`);
    } catch (e) {
      alert("Failed to delete endpoint: " + e.message);
    }
  };

  const activeNodesCount = endpoints.length;
  const totalRate = analytics?.ingress_req_sec ?? 0;
  const avgLatency = analytics?.avg_latency_ms ?? 0;
  const p95Latency = analytics?.p95_latency_ms ?? 0;

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white tracking-tight">Endpoints</h1>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-[#161f30] text-slate-400 border border-slate-700/60">
            {endpoints.length} CONFIGURED
          </span>
        </div>

        <button
          onClick={onOpenNewEndpoint}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#5356e3] hover:bg-[#4548d4] active:bg-[#3b3ec7] text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          <span>New Endpoint</span>
        </button>
      </div>

      {/* 3 Metric Cards Grid — dynamic from database */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* ACTIVE INGEST NODES */}
        <div className="bg-[#111624] border border-[#1e293d] rounded-xl p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">ACTIVE INGEST NODES</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          </div>
          <div className="flex items-baseline gap-2 my-1">
            <span className="text-3xl font-bold text-white tracking-tight">{activeNodesCount}</span>
            <span className="text-xs text-slate-400 font-mono">/ {activeNodesCount} reachable</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 pt-3 border-t border-[#1a2333] mt-2">
            <ShieldIcon className="w-3.5 h-3.5 text-emerald-400" />
            <span>Signature validation active</span>
          </div>
        </div>

        {/* TOTAL INGEST RATE */}
        <div className="bg-[#111624] border border-[#1e293d] rounded-xl p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">TOTAL INGEST RATE</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#162033] border border-slate-700/60 text-slate-300">
              peak {Math.round(totalRate * 1.8)}/s
            </span>
          </div>
          <div className="flex items-baseline gap-2 my-1">
            <span className="text-3xl font-bold text-white tracking-tight">{totalRate}</span>
            <span className="text-xs text-slate-400 font-mono">req/sec</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 pt-3 border-t border-[#1a2333] mt-2">
            <TrendingUpIcon className="w-3.5 h-3.5 text-emerald-400" />
            <span>+12% vs prior 1-hour window</span>
          </div>
        </div>

        {/* GLOBAL AVG LATENCY */}
        <div className="bg-[#111624] border border-[#1e293d] rounded-xl p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">GLOBAL AVG LATENCY</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/50 text-emerald-400 font-semibold">
              p95 {p95Latency}ms
            </span>
          </div>
          <div className="flex items-baseline gap-2 my-1">
            <span className="text-3xl font-bold text-white tracking-tight">{avgLatency}</span>
            <span className="text-xs text-slate-400 font-mono">ms</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 pt-3 border-t border-[#1a2333] mt-2">
            <ZapIcon className="w-3.5 h-3.5 text-emerald-400" />
            <span>Edge dispatch SLA within target</span>
          </div>
        </div>
      </div>

      {/* Section Header */}
      <div className="flex items-center justify-between pt-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
          ACTIVE WEBHOOK LISTENERS
        </span>
        <span className="text-xs font-mono text-slate-500">
          Region: us-east-1 (Global Ingress)
        </span>
      </div>

      {/* Endpoint Cards List — live from database */}
      <div className="space-y-4">
        {endpoints.length === 0 ? (
          <div className="p-8 text-center bg-[#111624] border border-[#1e293d] rounded-xl text-slate-400 text-sm">
            {loading ? "Loading endpoints from database..." : "No endpoints configured in database."}
          </div>
        ) : (
          endpoints.map((ep) => {
            const isDegraded = ep.status === 'Degraded';
            return (
              <div
                key={ep.id}
                className="bg-[#111624] border border-[#1e293d] rounded-xl p-5 shadow-sm space-y-4 hover:border-slate-700/80 transition-all"
              >
                {/* Card Top Row */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Endpoint Info */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-base font-bold text-white tracking-tight truncate">
                        {ep.name}
                      </h3>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        isDegraded
                          ? 'bg-amber-950/60 border border-amber-800/60 text-amber-400'
                          : 'bg-emerald-950/60 border border-emerald-800/60 text-emerald-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isDegraded ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                        <span>{ep.status || "Active"}</span>
                      </span>
                    </div>
                    <div className="text-xs font-mono mt-1 text-slate-400 flex items-center gap-2">
                      <span className="text-slate-300">{ep.id}</span>
                      <span>•</span>
                      <span className={isDegraded ? 'text-rose-400 font-medium' : 'text-slate-400'}>
                        {ep.version || "Active Listener"}
                      </span>
                    </div>
                  </div>

                  {/* Webhook URL bar */}
                  <div className="flex-1 max-w-xl">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      WEBHOOK URL
                    </div>
                    <div className="flex items-center bg-[#090d16] border border-[#1e293d] rounded-lg px-3 py-1.5">
                      <input
                        type="text"
                        readOnly
                        value={ep.webhook_url}
                        className="bg-transparent text-xs text-slate-300 font-mono w-full focus:outline-none"
                      />
                      <button
                        onClick={() => handleCopyUrl(ep.id, ep.webhook_url)}
                        className="flex items-center gap-1 px-2 py-1 rounded bg-[#162133] hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium transition-colors shrink-0 cursor-pointer ml-2 border border-slate-700/60"
                      >
                        <CopyIcon className="w-3 h-3" />
                        <span>{copiedId === ep.id ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Metrics — dynamic from database */}
                  <div className="flex items-center gap-6 shrink-0 text-right">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        VOLUME
                      </div>
                      <div className="text-sm font-bold text-white tracking-tight mt-0.5">
                        {(ep.volume || 0).toLocaleString()} <span className="text-xs text-slate-400 font-normal">events</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        DELIVERY RATE
                      </div>
                      <div className={`text-sm font-bold mt-0.5 flex items-center gap-1 justify-end ${
                        isDegraded ? 'text-amber-400' : 'text-emerald-400'
                      }`}>
                        <span>{ep.delivery_rate}%</span>
                        {isDegraded ? (
                          <AlertTriangleIcon className="w-3.5 h-3.5 text-amber-400" />
                        ) : (
                          <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Bottom Row: Metadata & Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#1a2333] text-xs text-slate-400">
                  <div className="flex items-center gap-2 truncate">
                    <span>Created {ep.created_display}</span>
                    <span>•</span>
                    <span className="truncate">Destination: <strong className="text-slate-300 font-mono font-medium">{ep.destination}</strong></span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onInspectEndpointEvents(ep.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#5356e3] hover:bg-indigo-600 text-white font-medium transition-colors cursor-pointer text-xs shadow-xs"
                    >
                      <EventsIcon className="w-3.5 h-3.5" />
                      <span>View Events</span>
                    </button>
                    <button
                      onClick={() => handleRotateSecret(ep.id)}
                      className="px-3 py-1.5 rounded-lg bg-[#141b2a] border border-[#232f45] hover:border-slate-600 text-slate-300 hover:text-white font-medium transition-colors cursor-pointer text-xs"
                    >
                      Rotate Secret
                    </button>
                    <button
                      onClick={() => handleDelete(ep.id, ep.name)}
                      className="px-3 py-1.5 rounded-lg bg-[#1b1418] border border-rose-900/60 hover:bg-rose-950/80 text-rose-400 hover:text-rose-300 font-medium transition-colors cursor-pointer text-xs"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Programmatic Endpoint Sync Banner */}
      <div className="bg-[#111624] border border-[#1e293d] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#162133] border border-[#24334d] text-indigo-400 shrink-0">
            <TerminalIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">Programmatic Endpoint Sync</div>
            <div className="text-xs text-slate-400 mt-0.5">
              You can also provision endpoints using HookLens Terraform Provider or CLI:{' '}
              <span className="font-mono text-slate-300 bg-[#090d16] px-1.5 py-0.5 rounded border border-[#1f2b3e]">
                hooklens endpoint create --name "prod"
              </span>
            </div>
          </div>
        </div>

        <a
          href="#cli-docs"
          onClick={e => { e.preventDefault(); if (showToast) showToast("CLI docs available at docs.hooklens.internal"); }}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white shrink-0 group cursor-pointer"
        >
          <span>Read CLI Docs</span>
          <ExternalLinkIcon className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </a>
      </div>
    </div>
  );
}
