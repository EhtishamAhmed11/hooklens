import React, { useState } from 'react';
import { HookLensLogo, EyeIcon, EyeOffIcon, AlertCircleIcon } from '../components/Icons';
import { api } from '../services/api';

export function LoginView({ onLoginSuccess }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await api.login(username, password);
      onLoginSuccess(username);
    } catch (err) {
      setError(err.message || 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#090d16] flex flex-col items-center justify-center p-4 relative select-none">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Login Card */}
      <div className="w-full max-w-[420px] bg-[#121826] border border-[#1e293b] rounded-2xl p-8 shadow-2xl relative z-10 flex flex-col">
        {/* Brand */}
        <div className="flex items-center justify-center gap-2.5 mb-6">
          <HookLensLogo className="w-8 h-8" />
          <span className="text-xl font-bold text-white tracking-tight">HookLens</span>
        </div>

        {/* Heading */}
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-white tracking-tight">
            Sign in to your account
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Monitor, investigate, and retry failed webhooks.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              USERNAME
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-[#0b101a] border border-[#1e2a3e] rounded-lg px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              PASSWORD
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-[#0b101a] border border-[#1e2a3e] rounded-lg pl-3.5 pr-10 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 px-4 bg-[#5b5ef4] hover:bg-[#4f52e8] active:bg-[#4346dc] text-white font-medium text-sm rounded-lg shadow-lg shadow-indigo-600/25 transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <span>Sign in</span>
            )}
          </button>

          {/* Error Banner matching screenshot */}
          {error && (
            <div className="mt-4 p-3 bg-[#540909] border border-[#7a1818] rounded-lg text-rose-200 text-xs flex items-center gap-2.5 animate-in fade-in duration-200">
              <div className="w-4 h-4 rounded-full bg-rose-500 flex items-center justify-center text-[#540909] shrink-0 font-bold text-[10px]">
                ✕
              </div>
              <span className="font-medium">{error}</span>
            </div>
          )}
        </form>

        {/* Footer info inside card */}
        <div className="mt-8 pt-4 border-t border-[#1a2333] flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <span>v2.14.0-prod</span>
          <div className="flex items-center gap-1.5 text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            <span>INGRESS OK</span>
          </div>
        </div>
      </div>
    </div>
  );
}
