import React, { useState, useEffect } from 'react';
import {
  ArrowLeftIcon,
  RefreshIcon,
  InfoIcon,
  AlertCircleIcon,
  CodeIcon,
  CopyIcon,
  ClockIcon,
  NodesIcon,
  ExternalLinkIcon,
  EyeIcon,
  EyeOffIcon
} from '../components/Icons';
import { api } from '../services/api';

export function EventDetailView({ eventId, onBack, showToast }) {
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  useEffect(() => {
    async function fetchEvent() {
      if (!eventId) return;
      setLoading(true);
      try {
        const data = await api.getEventById(eventId);
        setEvent(data);
      } catch (e) {
        console.error("Failed to load event details from DB:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchEvent();
  }, [eventId]);

  const handleRetry = async () => {
    if (!event) return;
    setRetrying(true);
    try {
      await api.retryEvent(event.id);
      if (showToast) showToast(`↺ Requeued retry for event ${event.id}`);
      const updated = await api.getEventById(event.id);
      setEvent(updated);
    } catch (err) {
      alert("Retry failed: " + err.message);
    } finally {
      setRetrying(false);
    }
  };

  const handleCopyPayload = () => {
    if (!event) return;
    navigator.clipboard.writeText(event.payload);
    setCopiedPayload(true);
    if (showToast) showToast("✓ Copied payload JSON to clipboard");
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  const handleCopyUrl = (url) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    if (showToast) showToast("✓ Copied Webhook URL");
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  if (loading || !event) {
    return (
      <div className="p-8 max-w-7xl mx-auto flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-slate-400 text-sm font-mono">
          <RefreshIcon className="w-5 h-5 animate-spin text-indigo-400" />
          <span>Loading event from database...</span>
        </div>
      </div>
    );
  }

  // Syntax highlight JSON
  const renderFormattedJson = (jsonString) => {
    try {
      const obj = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
      const formatted = JSON.stringify(obj, null, 2);

      const lines = formatted.split('\n');
      return lines.map((line, idx) => {
        const keyMatch = line.match(/^(\s*)(".*?"):(.*)$/);
        if (keyMatch) {
          const indent = keyMatch[1];
          const key = keyMatch[2];
          const val = keyMatch[3];
          return (
            <div key={idx} className="leading-relaxed">
              <span>{indent}</span>
              <span className="text-[#a5b4fc]">{key}</span>
              <span className="text-slate-500">:</span>
              {renderVal(val)}
            </div>
          );
        }
        return <div key={idx} className="text-slate-300 leading-relaxed">{line}</div>;
      });
    } catch (e) {
      return <pre className="text-slate-300">{jsonString}</pre>;
    }
  };

  const renderVal = (val) => {
    const trimmed = val.trim();
    if (trimmed.startsWith('"')) {
      return <span className="text-[#4ade80] ml-1">{val}</span>;
    }
    if (!isNaN(Number(trimmed.replace(/,$/, '')))) {
      return <span className="text-[#fb923c] ml-1">{val}</span>;
    }
    if (trimmed.startsWith('true') || trimmed.startsWith('false') || trimmed.startsWith('null')) {
      return <span className="text-[#38bdf8] ml-1">{val}</span>;
    }
    return <span className="text-slate-300 ml-1">{val}</span>;
  };

  const isFailed = event.status === 'FAILED';
  const isRetrying = event.status === 'RETRYING';
  const attemptsList = event.attempts || [];

  const secretMasked = event.endpoint_secret && event.endpoint_secret.length > 12
    ? `${event.endpoint_secret.substring(0, 10)}...${event.endpoint_secret.substring(event.endpoint_secret.length - 4)}`
    : (event.endpoint_secret || "whsec_••••••••");

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Back button */}
      <div>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer group"
        >
          <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Events</span>
        </button>
      </div>

      {/* Title & Retry Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#1a2333]/80">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-2xl font-bold text-white tracking-tight font-mono">
            {event.event_type}
          </h1>
          <span className="text-xs font-mono text-slate-500">
            {event.id}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Badge */}
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
            isFailed ? 'bg-[#450a0a]/80 text-rose-300 border border-rose-800/80 shadow-xs' :
            isRetrying ? 'bg-[#082f49]/80 text-sky-300 border border-sky-800/80 shadow-xs' :
            'bg-[#064e3b]/80 text-emerald-300 border border-emerald-800/80 shadow-xs'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isFailed ? 'bg-rose-400' : isRetrying ? 'bg-sky-400' : 'bg-emerald-400'}`} />
            <span>{event.status}</span>
          </span>

          {/* Retry Button */}
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#3a1920] border border-[#782935] hover:bg-[#4d222b] text-[#fca5a5] hover:text-white text-xs font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshIcon className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`} />
            <span>{retrying ? "Retrying..." : "Retry Event"}</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Span 2) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Event Information — live from database */}
          <div className="bg-[#111624] border border-[#1e293d] rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[#1a2333] pb-3">
              <div className="flex items-center gap-2 text-white font-semibold text-sm">
                <InfoIcon className="w-4 h-4 text-slate-400" />
                <span>Event Information</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                ID: {event.short_id || event.id.substring(0, 8)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-xs">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Event Type
                </div>
                <div className="font-mono text-indigo-400 font-medium">
                  {event.event_type}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Status
                </div>
                <div className="font-semibold text-rose-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  <span>{event.status_label || `${event.status} (${event.attempt_count} Attempts Exhausted)`}</span>
                </div>
              </div>

              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Endpoint
                </div>
                <div className="flex items-center gap-2 text-slate-200">
                  <span className="font-semibold">{event.endpoint_name || "Stripe Demo"}</span>
                  <span className="font-mono text-slate-400 text-[11px]">{event.endpoint_id}</span>
                </div>
              </div>

              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Attempts
                </div>
                <div className="font-mono text-emerald-400 font-bold">
                  {event.attempts_display || `${event.attempt_count} / 3`}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Received At
                </div>
                <div className="font-mono text-slate-300">
                  {event.received_at}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Processed At
                </div>
                <div className="font-mono text-slate-300">
                  {event.processed_at || "—"}
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Processing Error Banner */}
          {event.last_error && (
            <div className="bg-[#240a0e] border border-[#6b1e27] rounded-xl p-5 shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-rose-300 font-semibold text-xs uppercase tracking-wider">
                <AlertCircleIcon className="w-4 h-4 text-rose-400" />
                <span>Processing Error</span>
              </div>
              <div className="text-xs text-rose-200 leading-relaxed font-mono">
                {event.last_error}
              </div>
            </div>
          )}

          {/* Card 3: Payload Viewer */}
          <div className="bg-[#111624] border border-[#1e293d] rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1e293d] bg-[#121927]">
              <div className="flex items-center gap-2 text-white font-semibold text-xs uppercase tracking-wider">
                <CodeIcon className="w-4 h-4 text-slate-400" />
                <span>Payload</span>
              </div>
              <button
                onClick={handleCopyPayload}
                className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#162133] hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors cursor-pointer border border-slate-700/60"
              >
                <CopyIcon className="w-3.5 h-3.5" />
                <span>{copiedPayload ? "Copied JSON" : "Copy JSON"}</span>
              </button>
            </div>

            <div className="p-5 bg-[#090d16] overflow-x-auto text-xs font-mono">
              {renderFormattedJson(event.payload)}
            </div>
          </div>
        </div>

        {/* Right Column (Span 1) */}
        <div className="space-y-6">
          {/* Card 1: Retry History — live attempts from database */}
          <div className="bg-[#111624] border border-[#1e293d] rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[#1a2333] pb-3">
              <div className="flex items-center gap-2 text-white font-semibold text-sm">
                <ClockIcon className="w-4 h-4 text-slate-400" />
                <span>Retry History</span>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {attemptsList.length} Entries
              </span>
            </div>

            {/* Timeline */}
            {attemptsList.length === 0 ? (
              <div className="text-xs text-slate-500 py-4 text-center font-mono">
                No retry attempts recorded in database.
              </div>
            ) : (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#202d44]">
                {attemptsList.map((attempt, index) => {
                  const isFailedAttempt = attempt.status === 'FAILED';
                  return (
                    <div key={attempt.id || index} className="relative">
                      {/* Node marker */}
                      <span className={`absolute -left-6 top-1 w-2.5 h-2.5 rounded-full ring-4 ring-[#111624] ${
                        isFailedAttempt ? 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)]' : 'bg-emerald-500'
                      }`} />

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">
                            Attempt {attempt.attempt_number}
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#450a0a] text-rose-400 border border-rose-800/60">
                            {attempt.status}
                          </span>
                        </div>
                        <div className="text-xs font-mono text-rose-300/90 font-medium">
                          {attempt.error || "HTTP 500 Internal Error"}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {attempt.created_display || attempt.created_at}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Card 2: Endpoint Details — live from database */}
          <div className="bg-[#111624] border border-[#1e293d] rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[#1a2333] pb-3">
              <div className="flex items-center gap-2 text-white font-semibold text-sm">
                <NodesIcon className="w-4 h-4 text-indigo-400" />
                <span>Endpoint Details</span>
              </div>
              <ExternalLinkIcon className="w-3.5 h-3.5 text-slate-400" />
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Endpoint Name
                </div>
                <div className="text-white font-bold text-sm">
                  {event.endpoint_name || "Stripe Demo"}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Endpoint ID
                </div>
                <div className="font-mono text-slate-300">
                  {event.endpoint_id}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Webhook URL
                </div>
                <div className="flex items-center bg-[#090d16] border border-[#1e293d] rounded-lg px-2.5 py-1.5">
                  <span className="font-mono text-[11px] text-slate-300 truncate">
                    {`https://api.hooklens.internal/v1/wh/${event.endpoint_id}`}
                  </span>
                  <button
                    onClick={() => handleCopyUrl(`https://api.hooklens.internal/v1/wh/${event.endpoint_id}`)}
                    className="p-1 text-slate-400 hover:text-white transition-colors shrink-0 ml-1.5 cursor-pointer"
                    title="Copy URL"
                  >
                    <CopyIcon className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Secret
                </div>
                <div className="flex items-center justify-between bg-[#090d16] border border-[#1e293d] rounded-lg px-2.5 py-1.5">
                  <span className="font-mono text-[11px] text-slate-300 truncate">
                    {showSecret ? event.endpoint_secret : secretMasked}
                  </span>
                  <button
                    onClick={() => setShowSecret(!showSecret)}
                    className="p-1 text-slate-400 hover:text-white transition-colors shrink-0 ml-1.5 cursor-pointer"
                    title={showSecret ? "Hide secret" : "Reveal secret"}
                  >
                    {showSecret ? <EyeOffIcon className="w-3 h-3" /> : <EyeIcon className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Created
                </div>
                <div className="text-slate-300 font-mono">
                  {event.endpoint_created_at || "Sep 12, 2025"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
