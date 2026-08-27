// web/src/pages/LoginPage.jsx
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { HardDrive, Lock, User, Mail, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';

export const LoginPage = () => {
  const { login, register, setupRequired } = useAuth();
  const [isRegisterMode, setIsRegisterMode] = useState(setupRequired);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegisterMode || setupRequired) {
        await register(username, email, password);
      } else {
        await login(username || email, password);
      }
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-[#09090b] flex items-center justify-center p-4 select-none relative overflow-y-auto">
      {/* Dynamic Background Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-teal-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[#121214]/90 backdrop-blur-2xl border border-white/10 p-6 sm:p-10 rounded-2xl sm:rounded-3xl shadow-2xl z-10 my-auto">
        {/* Logo & Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-black font-extrabold text-2xl shadow-xl shadow-emerald-500/20 mb-4">
            N
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Nexora Cloud</h1>
          <p className="text-xs text-zinc-400 mt-1">
            {setupRequired
              ? 'Initialize your personal Arch Linux server'
              : isRegisterMode
              ? 'Create a new user account'
              : 'Sign in to access Drive, Spotify & VLC'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
              {isRegisterMode || setupRequired ? 'Username' : 'Username or Email'}
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={isRegisterMode || setupRequired ? 'yourname' : 'user or user@example.com'}
                className="w-full bg-[#18181b] border border-white/10 focus:border-emerald-500 text-white placeholder-zinc-400 text-sm pl-10 pr-4 py-2.5 rounded-xl outline-none transition-all"
              />
            </div>
          </div>

          {(isRegisterMode || setupRequired) && (
            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@nexora.local"
                  className="w-full bg-[#18181b] border border-white/10 focus:border-emerald-500 text-white placeholder-zinc-400 text-sm pl-10 pr-4 py-2.5 rounded-xl outline-none transition-all"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#18181b] border border-white/10 focus:border-emerald-500 text-white placeholder-zinc-400 text-sm pl-10 pr-4 py-2.5 rounded-xl outline-none transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-3 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all duration-150 active:scale-95"
          >
            <span>
              {loading
                ? 'Authenticating...'
                : setupRequired
                ? 'Complete Setup & Enter'
                : isRegisterMode
                ? 'Create Account'
                : 'Sign In'}
            </span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </form>

        {!setupRequired && (
          <div className="mt-6 text-center">
            <button
              onClick={() => setIsRegisterMode(!isRegisterMode)}
              className="text-xs text-zinc-400 hover:text-emerald-400 transition-colors"
            >
              {isRegisterMode ? 'Already have an account? Sign In' : "Don't have an account? Register"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
