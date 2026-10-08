import React, { useState } from 'react';
import { XIcon, PlusIcon, RefreshIcon, NodesIcon } from './Icons';
import { api } from '../services/api';

export function NewEndpointModal({ isOpen, onClose, onCreated, showToast }) {
  const [name, setName] = useState('');
  const [secret, setSecret] = useState('');
  const [destination, setDestination] = useState('https://core-api.internal/v1/stripe');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  if (!isOpen) return null;

  const handleGenerateSecret = async () => {
    setGenerating(true);
    try {
      const generated = await api.generateSecret();
      setSecret(generated);
    } catch (e) {
      setSecret("whsec_" + Math.random().toString(36).substring(2, 18));
    } finally {
      setGenerating(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const epSecret = secret.trim() || ("whsec_" + Math.random().toString(36).substring(2, 18));
      const newEp = await api.createEndpoint(name.trim(), epSecret, destination.trim());
      if (showToast) {
        showToast(`✓ Endpoint "${newEp.name}" created successfully`);
      }
      onCreated(newEp);
      onClose();
      setName('');
      setSecret('');
    } catch (err) {
      alert("Failed to create endpoint: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-[#0f1523] border border-[#222d42] rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f293d] bg-[#121927]">
          <div className="flex items-center gap-2.5 text-white font-semibold">
            <div className="p-1.5 rounded-lg bg-indigo-950/80 border border-indigo-700/50 text-indigo-400">
              <NodesIcon className="w-4 h-4" />
            </div>
            <span>New Webhook Endpoint</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleCreate} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Endpoint Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Stripe Production or Shopify Webhook"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-[#131b2c] border border-[#232f45] rounded-lg px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Signing Secret (HMAC-SHA256)
              </label>
              <button
                type="button"
                onClick={handleGenerateSecret}
                disabled={generating}
                className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-medium"
              >
                <RefreshIcon className={`w-3 h-3 ${generating ? 'animate-spin' : ''}`} />
                <span>Generate Secure Secret</span>
              </button>
            </div>
            <input
              type="text"
              placeholder="whsec_..."
              value={secret}
              onChange={e => setSecret(e.target.value)}
              className="w-full bg-[#131b2c] border border-[#232f45] rounded-lg px-3.5 py-2.5 font-mono text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Destination URL
            </label>
            <input
              type="url"
              required
              placeholder="https://your-service.internal/webhook"
              value={destination}
              onChange={e => setDestination(e.target.value)}
              className="w-full bg-[#131b2c] border border-[#232f45] rounded-lg px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="p-3 bg-[#111726] border border-[#1f2b3e] rounded-lg text-xs text-slate-400 space-y-1">
            <div className="font-medium text-slate-300">Automatic Ingress URL Provisioning</div>
            <div>Upon creation, HookLens generates a dedicated ingress URL: <span className="font-mono text-indigo-300">https://api.hooklens.com/wh/ep_...</span></div>
          </div>

          {/* Footer */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              <span>{loading ? "Creating..." : "Create Endpoint"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
