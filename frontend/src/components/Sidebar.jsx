import React from 'react';
import {
  HookLensLogo,
  OverviewIcon,
  EndpointsIcon,
  EventsIcon,
  AnalyticsIcon,
  UserIcon,
  LogOutIcon
} from './Icons';

export function Sidebar({ currentView, setView, onLogout, user = "admin" }) {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: OverviewIcon },
    { id: 'endpoints', label: 'Endpoints', icon: EndpointsIcon },
    { id: 'events', label: 'Events', icon: EventsIcon },
    { id: 'analytics', label: 'Analytics', icon: AnalyticsIcon, badge: 'Soon' },
  ];

  return (
    <aside className="w-64 bg-[#0e131f] border-r border-[#1a2333] flex flex-col justify-between shrink-0 min-h-screen select-none">
      <div>
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 gap-3 border-b border-[#1a2333]/60">
          <HookLensLogo className="w-8 h-8" />
          <span className="text-white text-lg font-bold tracking-tight">HookLens</span>
        </div>

        {/* Section Title */}
        <div className="px-6 pt-6 pb-2">
          <span className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
            OBSERVABILITY
          </span>
        </div>

        {/* Nav Items */}
        <nav className="px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            const isSoon = !!item.badge;

            return (
              <button
                key={item.id}
                onClick={() => !isSoon && setView(item.id)}
                disabled={isSoon}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[#1b253b] text-white shadow-sm shadow-indigo-950/20'
                    : isSoon
                    ? 'text-slate-500 cursor-not-allowed hover:bg-transparent'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#151c2d]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-2 py-0.5 text-[10px] font-medium bg-[#1a2233] text-slate-400 rounded-md border border-slate-800">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Profile Footer */}
      <div className="p-3 border-t border-[#1a2333]/80">
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#121927]/60 border border-[#1a2333]/40">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white text-xs font-semibold shrink-0 shadow-inner">
              <UserIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white truncate">{user}</div>
              <div className="text-[11px] text-slate-400 truncate">Administrator</div>
            </div>
          </div>
          <button
            onClick={onLogout}
            title="Log out"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800/60 rounded-md transition-colors"
          >
            <LogOutIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
