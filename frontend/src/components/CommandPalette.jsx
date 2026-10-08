import React, { useState, useEffect } from 'react';
import { SearchIcon, XIcon, RefreshIcon, ZapIcon, EndpointsIcon, OverviewIcon, EventsIcon } from './Icons';

export function CommandPalette({ isOpen, onClose, onNavigate, onTriggerTestWebhook, onFilterFailed }) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onClose(); // toggle or parent handles
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const actions = [
    {
      id: 'failed-triage',
      title: 'Triage Failed Webhooks',
      subtitle: 'Filter and review 42 dead-lettered events',
      icon: RefreshIcon,
      badge: '42 Failed',
      badgeColor: 'bg-rose-950/80 text-rose-300 border-rose-800/60',
      action: () => {
        onFilterFailed();
        onClose();
      }
    },
    {
      id: 'test-webhook',
      title: 'Send Test Webhook Event',
      subtitle: 'Simulate payment.failed, intermittent, or success payloads',
      icon: ZapIcon,
      badge: 'Simulation',
      badgeColor: 'bg-indigo-950/80 text-indigo-300 border-indigo-800/60',
      action: () => {
        onClose();
        onTriggerTestWebhook();
      }
    },
    {
      id: 'go-overview',
      title: 'Go to Overview Dashboard',
      subtitle: 'Cluster ingress velocity & live telemetry',
      icon: OverviewIcon,
      action: () => {
        onNavigate('overview');
        onClose();
      }
    },
    {
      id: 'go-events',
      title: 'Go to Events Explorer',
      subtitle: 'Inspect payload headers, attempts, and audit logs',
      icon: EventsIcon,
      action: () => {
        onNavigate('events');
        onClose();
      }
    },
    {
      id: 'go-endpoints',
      title: 'Manage Webhook Endpoints',
      subtitle: 'Configure signing secrets & downstream destinations',
      icon: EndpointsIcon,
      action: () => {
        onNavigate('endpoints');
        onClose();
      }
    }
  ];

  const filtered = actions.filter(
    a => a.title.toLowerCase().includes(query.toLowerCase()) ||
         a.subtitle.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-xl bg-[#0f1523] border border-[#222d42] rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Search header */}
        <div className="flex items-center px-4 py-3.5 border-b border-[#1f293d] gap-3">
          <SearchIcon className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            autoFocus
            type="text"
            placeholder="Type a command or search events, endpoints..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-transparent text-white placeholder-slate-500 text-sm focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Results list */}
        <div className="p-2 max-h-80 overflow-y-auto space-y-1">
          <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Quick Actions & Navigation
          </div>
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500">
              No actions found matching "{query}"
            </div>
          ) : (
            filtered.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={item.action}
                  className="w-full flex items-center justify-between p-3 rounded-lg text-left hover:bg-[#182133] transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#141b2a] border border-[#243046] flex items-center justify-center text-slate-400 group-hover:text-indigo-400 group-hover:border-indigo-500/40 transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-200 group-hover:text-white">
                        {item.title}
                      </div>
                      <div className="text-xs text-slate-400">
                        {item.subtitle}
                      </div>
                    </div>
                  </div>
                  {item.badge && (
                    <span className={`text-[11px] px-2 py-0.5 rounded border font-medium ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 bg-[#0c111c] border-t border-[#1a2333] flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span><strong className="text-slate-300">↑↓</strong> Navigate</span>
            <span><strong className="text-slate-300">↵</strong> Select</span>
          </div>
          <span><strong className="text-slate-300">ESC</strong> Close</span>
        </div>
      </div>
    </div>
  );
}
