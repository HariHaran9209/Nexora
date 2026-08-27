// web/src/pages/SyncPage.jsx
import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  Laptop, 
  FolderSync, 
  ShieldCheck, 
  Wifi, 
  Download, 
  CheckCircle2, 
  RefreshCw, 
  Copy, 
  Check, 
  Terminal,
  Layers,
  ArrowRight
} from 'lucide-react';
import { syncApi } from '../services/api';

export const SyncPage = () => {
  const [androidStats, setAndroidStats] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchSyncStats = async () => {
    setLoading(true);
    try {
      const res = await syncApi.getAndroidStatus();
      setAndroidStats(res.data.data);
    } catch (err) {
      console.warn('Sync stats load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSyncStats();
  }, []);

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const formatSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    return `${(mb / 1024).toFixed(2)} GB`;
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-3 sm:p-6 md:p-8 select-none">
      {/* Header Banner */}
      <div className="relative rounded-2xl sm:rounded-3xl bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-black/60 p-4 sm:p-6 md:p-8 border border-indigo-500/10 mb-4 sm:mb-8 shrink-0 shadow-lg">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-indigo-500 flex items-center justify-center text-white shadow-xl shadow-indigo-500/20 shrink-0">
            <FolderSync className="w-6 h-6 sm:w-8 sm:h-8" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-indigo-400">Device Integration</p>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight">Devices & Sync</h1>
            <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5">
              Manage automatic Android camera backup and single-folder Windows 11 synchronization
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8 mb-4 sm:mb-8">
        {/* Android Camera Auto-Backup Card */}
        <div className="flex flex-col p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-[#18181b] border border-white/5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
                <Smartphone className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white">Android Phone Auto-Backup</h3>
                <p className="text-[11px] sm:text-xs text-zinc-400">Background Camera & DCIM Sync</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold shrink-0">
              Ready
            </span>
          </div>

          <p className="text-xs sm:text-sm text-zinc-300 mb-4 sm:mb-6">
            Native Kotlin WorkManager foreground service that watches your camera roll and uploads new photos and videos automatically in the background over Wi-Fi.
          </p>

          {/* Stats Box */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-[#121214] border border-white/5 mb-4 sm:mb-6">
            <div>
              <p className="text-[11px] sm:text-xs text-zinc-400">Backed Up Items</p>
              <p className="text-base sm:text-xl font-extrabold text-white mt-1">
                {androidStats?.totalBackedUpFiles || 0} files
              </p>
            </div>
            <div>
              <p className="text-[11px] sm:text-xs text-zinc-400">Storage Used</p>
              <p className="text-base sm:text-xl font-extrabold text-emerald-400 mt-1">
                {formatSize(androidStats?.totalSizeBytes)}
              </p>
            </div>
          </div>

          {/* Android App Setup Steps */}
          <div className="flex flex-col gap-2.5 sm:gap-3 text-xs text-zinc-300">
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
                1
              </span>
              <span>Install the <strong>Nexora Backup APK</strong> located in <code>/android</code> on your phone.</span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
                2
              </span>
              <span>Open the app and input your server Tailscale IP and auth credentials.</span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
                3
              </span>
              <span>Enable <strong>Background Camera Backup</strong>. Photos will sync smoothly without opening the app!</span>
            </div>
          </div>
        </div>

        {/* Windows Single-Folder Sync Card */}
        <div className="flex flex-col p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-[#18181b] border border-white/5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
                <Laptop className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white">Windows 11 Synced Folder</h3>
                <p className="text-[11px] sm:text-xs text-zinc-400">Two-Way Designated Folder Sync</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold shrink-0">
              Isolated
            </span>
          </div>

          <p className="text-xs sm:text-sm text-zinc-300 mb-4 sm:mb-6">
            Lightweight desktop daemon client that watches <strong>one specific user-designated folder</strong> on your Windows machine and keeps it bidirectionally synchronized with the Arch server. No other files on Windows are touched.
          </p>

          {/* Terminal Command Box */}
          <div className="bg-[#121214] p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-white/5 mb-4 sm:mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] sm:text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-indigo-400" /> Run Windows Sync Client
              </span>
              <button
                onClick={() => handleCopy('cd desktop-sync && npm start', 'win_cmd')}
                className="text-zinc-400 hover:text-white p-1"
                title="Copy command"
              >
                {copiedKey === 'win_cmd' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <code className="text-[11px] sm:text-xs font-mono text-indigo-300 block bg-black/40 p-2.5 rounded-lg break-all whitespace-pre-wrap">
              cd desktop-sync && npm install && npm start
            </code>
          </div>

          <div className="flex flex-col gap-2 sm:gap-2.5 text-xs text-zinc-300">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0" /> Two-Way Realtime Chokidar File Watcher
            </div>
            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0" /> SHA256 Diff & Conflict Resolution
            </div>
            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0" /> Zero-footprint borrowed machine safety
            </div>
          </div>
        </div>
      </div>

      {/* Tailscale Zero-Config Remote Access Setup Guide */}
      <div className="p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl bg-[#18181b] border border-white/5 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-400 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white">Tailscale VPN Remote Access Setup</h3>
            <p className="text-[11px] sm:text-xs text-zinc-400">Secure, encrypted zero-config connection from anywhere</p>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-zinc-300 mb-4 sm:mb-6">
          Tailscale connects your Arch Linux laptop, Windows laptop, and Android phone into a secure private mesh network. You can access Nexora seamlessly from anywhere in the world without exposing your server to the public internet or configuring router port forwarding.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 text-xs">
          <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-[#121214] border border-white/5">
            <h4 className="font-bold text-white mb-2">1. On Arch Linux Server</h4>
            <pre className="font-mono text-zinc-400 bg-black/40 p-2.5 rounded-lg mb-2 text-[11px] whitespace-pre-wrap break-all">
              sudo pacman -S tailscale{"\n"}
              sudo systemctl enable --now tailscaled{"\n"}
              sudo tailscale up
            </pre>
            <p className="text-zinc-400 text-[11px]">Note down the <code>100.x.y.z</code> IP assigned to your server.</p>
          </div>

          <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-[#121214] border border-white/5">
            <h4 className="font-bold text-white mb-2">2. On Windows 11 Laptop</h4>
            <p className="text-zinc-300 mb-2 sm:mb-3">Install Tailscale for Windows and sign in with the same account.</p>
            <p className="text-zinc-400 text-[11px]">
              Open your browser and navigate to <code>http://[ARCH-TAILSCALE-IP]:5000</code> to access Nexora!
            </p>
          </div>

          <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-[#121214] border border-white/5">
            <h4 className="font-bold text-white mb-2">3. On Android Phone</h4>
            <p className="text-zinc-300 mb-2 sm:mb-3">Install Tailscale from Google Play Store or F-Droid and turn it ON.</p>
            <p className="text-zinc-400 text-[11px]">
              Your background backup app and mobile browser will now stream and backup automatically anywhere you go.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
