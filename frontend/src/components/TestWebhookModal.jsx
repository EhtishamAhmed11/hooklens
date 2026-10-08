import React, { useState } from 'react';
import { ZapIcon, XIcon, CheckCircleIcon, AlertCircleIcon } from './Icons';
import { api } from '../services/api';

const PRESETS = [
  {
    label: "payment.failed (Fails -> Retries exhausted)",
    type: "payment.failed",
    payload: {
      event: "payment.failed",
      id: "evt_98f420ac8b1e42a9b3d02f",
      object: "event",
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: "pi_3MtwBwLkdlwHu7ix28a3tqPa",
          amount: 14900,
          currency: "usd",
          status: "failed",
          last_payment_error: {
            code: "card_declined",
            decline_code: "insufficient_funds",
            message: "The customer account has insufficient funds."
          }
        }
      }
    }
  },
  {
    label: "payment.intermittent (Transient fail -> Retries & succeeds)",
    type: "payment.intermittent",
    payload: {
      event: "payment.intermittent",
      id: "evt_int_" + Math.random().toString(36).substring(2, 8),
      amount: 4500,
      currency: "usd",
      attempt_simulation: "70% first fail, 40% second fail, 10% third fail"
    }
  },
  {
    label: "payment.created (Success 200)",
    type: "payment.created",
    payload: {
      event: "payment.created",
      id: "evt_pay_" + Math.random().toString(36).substring(2, 8),
      amount: 9900,
      currency: "usd",
      customer: "cus_99214a"
    }
  },
  {
    label: "invoice.payment_failed (Failure 500)",
    type: "invoice.payment_failed",
    payload: {
      event: "invoice.payment_failed",
      id: "evt_inv_" + Math.random().toString(36).substring(2, 8),
      amount_due: 12000,
      attempt_count: 3
    }
  },
  {
    label: "customer.subscription.deleted",
    type: "customer.subscription.deleted",
    payload: {
      event: "customer.subscription.deleted",
      id: "evt_sub_" + Math.random().toString(36).substring(2, 8),
      subscription_id: "sub_1092aa"
    }
  },
  {
    label: "order.fulfilled",
    type: "order.fulfilled",
    payload: {
      event: "order.fulfilled",
      order_id: "ord_5521",
      fulfillment_status: "shipped"
    }
  }
];

export function TestWebhookModal({ isOpen, onClose, endpoints = [], onEventSent, showToast }) {
  const [selectedEndpoint, setSelectedEndpoint] = useState(endpoints[0]?.id || "demo-endpoint");
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);
  const [payloadString, setPayloadString] = useState(JSON.stringify(PRESETS[0].payload, null, 2));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  if (!isOpen) return null;

  const handlePresetChange = (idx) => {
    setSelectedPresetIndex(idx);
    setPayloadString(JSON.stringify(PRESETS[idx].payload, null, 2));
  };

  const handleSend = async () => {
    setLoading(true);
    setResult(null);
    try {
      let parsed;
      try {
        parsed = JSON.parse(payloadString);
      } catch (err) {
        alert("Invalid JSON payload: " + err.message);
        setLoading(false);
        return;
      }

      const res = await api.sendTestWebhook(selectedEndpoint, parsed);
      setResult({
        success: true,
        message: `Webhook received & dispatched! Event ID: ${res.event_id}`,
        eventId: res.event_id
      });
      if (showToast) {
        showToast(`⚡ Test Webhook queued successfully (${parsed.event || parsed.type})`);
      }
      if (onEventSent) {
        onEventSent();
      }
    } catch (err) {
      setResult({
        success: false,
        message: err.message || "Failed to deliver webhook"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl bg-[#0f1523] border border-[#222d42] rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f293d] bg-[#121927]">
          <div className="flex items-center gap-2.5 text-white font-semibold">
            <div className="p-1.5 rounded-lg bg-indigo-950/80 border border-indigo-700/50 text-indigo-400">
              <ZapIcon className="w-4 h-4" />
            </div>
            <span>Send Test Webhook</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Target Endpoint selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Destination Webhook Endpoint
            </label>
            <select
              value={selectedEndpoint}
              onChange={e => setSelectedEndpoint(e.target.value)}
              className="w-full bg-[#131b2c] border border-[#232f45] rounded-lg px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
            >
              {endpoints.map(ep => (
                <option key={ep.id} value={ep.id}>
                  {ep.name} ({ep.id}) — {ep.destination}
                </option>
              ))}
            </select>
          </div>

          {/* Preset templates */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Simulation Scenario / Preset
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((p, idx) => (
                <button
                  key={p.type}
                  type="button"
                  onClick={() => handlePresetChange(idx)}
                  className={`text-left p-2.5 rounded-lg border text-xs font-medium transition-all ${
                    selectedPresetIndex === idx
                      ? 'bg-indigo-950/40 border-indigo-500/80 text-indigo-300'
                      : 'bg-[#141c2c] border-[#222e43] text-slate-400 hover:border-slate-600 hover:text-slate-300'
                  }`}
                >
                  <div className="font-semibold text-slate-200">{p.type}</div>
                  <div className="text-[11px] text-slate-400 truncate mt-0.5">{p.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* JSON Payload editor */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Webhook Payload (JSON)
              </label>
              <button
                type="button"
                onClick={() => setPayloadString(JSON.stringify(PRESETS[selectedPresetIndex].payload, null, 2))}
                className="text-[11px] text-indigo-400 hover:underline"
              >
                Reset to preset
              </button>
            </div>
            <textarea
              rows={8}
              value={payloadString}
              onChange={e => setPayloadString(e.target.value)}
              className="w-full bg-[#0a0e17] border border-[#212c40] rounded-lg p-3.5 font-mono text-xs text-emerald-400 focus:outline-none focus:border-indigo-500/80 transition-colors resize-none leading-relaxed"
            />
          </div>

          {/* Feedback banner */}
          {result && (
            <div className={`p-3.5 rounded-lg border flex items-center gap-3 text-xs ${
              result.success
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
            }`}>
              {result.success ? (
                <CheckCircleIcon className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircleIcon className="w-5 h-5 text-rose-400 shrink-0" />
              )}
              <div className="font-mono">{result.message}</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#111726] border-t border-[#1f293d] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
          >
            <ZapIcon className="w-3.5 h-3.5" />
            <span>{loading ? "Dispatching..." : "Send Webhook"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
