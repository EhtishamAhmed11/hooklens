import React from 'react';
import { UserIcon } from './Icons';

export function TopNav({ onOpenTriage }) {
  return (
    <header className="h-14 border-b border-[#1a2333] bg-[#0c111c] px-6 flex items-center justify-between shrink-0 select-none">
      {/* Cluster Status Indicator */}
      <div className="flex items-center gap-2.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="font-mono text-[11px] font-semibold tracking-wider text-slate-300 uppercase">
          CLUSTER STATUS: OPERATIONAL
        </span>
      </div>

      {/* Right Tools */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenTriage}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#141b2a] border border-[#212b3e] text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-all text-xs font-medium cursor-pointer shadow-sm"
        >
          <span className="text-[10px] bg-[#1d273a] px-1.5 py-0.5 rounded border border-slate-700/60 font-mono text-slate-300">
            ⌘
          </span>
          <span>Press <strong className="font-semibold text-slate-300">Cmd+K</strong> to triage</span>
        </button>

        <div className="w-8 h-8 rounded-full bg-[#1b253b] border border-[#2a364f] flex items-center justify-center text-slate-300 shadow-sm cursor-pointer hover:border-indigo-500/50 transition-colors">
          <UserIcon className="w-4 h-4" />
        </div>
      </div>
    </header>
  );
}
