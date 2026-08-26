# Project Brief: Nexora (Drive + Spotify + VLC, self-hosted)

You are acting as a senior full-stack engineer and architect. Read this entire brief before writing any code. Ask clarifying questions ONLY if something below is genuinely ambiguous or blocks a decision — otherwise make a reasonable choice, state the assumption in a comment/README, and keep moving. Work incrementally (see Phased Roadmap) and produce runnable code at the end of each phase, not just scaffolding.

## 1. Project Goal

Build a self-hosted personal cloud system that replaces Google Drive for me, with three integrated pieces:

1. A file storage & sync system ("Drive") — server-side storage lives on my old Arch Linux laptop's 500GB HDD.
2. A Spotify-styled music player (web + mobile) that plays my own music library with full metadata.
3. A VLC-equivalent media/video player (web) with audio-track and subtitle-track switching.

Primary motivation: Google Drive's 30GB free tier fills up instantly from phone photo/video backups. I want unlimited (disk-limited) storage I control, with a UI that feels instant and native, not laggy like typical self-hosted file UIs.

## 2. Devices & Roles (be precise about this — it's a common source of confusion)

- **Old laptop (Arch Linux, AMD PRO A4-4350B, weak AMD Radeon R4 iGPU, 500GB HDD)** → this is the SERVER. It runs the backend, holds all files, and does any media processing. Assume modest CPU/GPU — avoid GPU-dependent transcoding; prefer direct-play/remux where possible (like VLC/Jellyfin do) over full re-encoding.
- **New laptop (Windows 11, borrowed, temporary)** → a CLIENT only. Access via a web app in the browser. Do NOT build a full-phone/full-disk backup for this device — I explicitly do NOT want to back up this whole machine (it's not mine). I only want **one specific folder** on it to sync bidirectionally with the Drive (like a Google Drive Desktop / Dropbox synced folder).
- **Android phone** → a CLIENT with two needs:
  a) A Spotify-like music player app/PWA to browse and play the library stored on the server.
  b) **Automatic background backup** of the camera/media folder (DCIM/Camera + any other folder I choose) to the server — this must work in the background without me opening the app every time, similar to Google Photos auto-backup.

## 3. Recommended Architecture

Use this unless you have a strong reason to deviate (explain if you do):

- **Backend**: Node.js + Express (or Fastify) — I'm already comfortable with the MERN stack, so stay in that ecosystem.
- **Database**: MongoDB for metadata only (file index, folder tree, users, playlists, play history, sync state, subtitle/audio-track info). Actual file bytes stay on the HDD filesystem, never in the DB.
- **Auth**: JWT-based. Start single-user (just me), but structure it so multi-user could be added later.
- **File storage layer**: A well-defined internal API (upload, download, list, move, delete, chunked upload for large video files, resumable uploads for spotty phone connections).
- **Remote access**: The server lives on my home network. Use **Tailscale** (or an equivalent zero-config VPN/tunnel) so my phone and Windows laptop can reach it securely from anywhere without port-forwarding or exposing it directly to the internet. Set this up as part of the deployment docs.
- **Reverse proxy**: Caddy or nginx in front of the Node backend for HTTPS and clean routing.
- **Frontend (web app, used by both laptops and phone browser)**: React + Vite + TailwindCSS. Use Framer Motion (or CSS transforms/GPU-accelerated animations only) for transitions. This is the single most important technical requirement — see Section 6 (Performance).
- **Realtime**: Socket.io (or WS) for live upload/sync progress, "currently playing" state, etc.
- **Music metadata**: Parse ID3/FLAC/etc. tags server-side with `music-metadata` (npm) when files are added to the library folder — extract title, artist, album, artwork, duration, genre.
- **Media (video) inspection**: Use `ffprobe` (part of ffmpeg) server-side to enumerate audio tracks, subtitle tracks, and codecs per video file at index time. Use `ffmpeg` only for remuxing/extracting subtitle tracks or transcoding when direct browser playback isn't possible — avoid full re-encodes given the server's weak hardware.
- **Video streaming**: HTTP range-request byte-serving for direct play (like a normal `<video>` src), falling back to HLS (via ffmpeg segmenting) only for formats the browser can't play natively. Use a player library like `vidstack` or `video.js` with custom Spotify/VLC-style skins rather than the bare browser controls.
- **Android background backup**: A browser/PWA cannot reliably do background camera-folder uploads on Android (OS restrictions kill background web workers). Build a **small native Android app** (Kotlin, using WorkManager + a foreground service for reliable background sync) whose only job is: watch the camera folder, queue new files, upload to the server API when on Wi-Fi (configurable), show progress/notifications. This can be a thin app — it doesn't need the full music-player UI, just background sync + a status screen. (I've previously had AI write Kotlin for me since I don't know it myself — same approach here.)
- **Windows single-folder sync**: A lightweight desktop sync client (Electron menu-bar app, or even a scheduled script) that watches one designated folder and two-way syncs it with the server, similar to Dropbox/Drive Desktop. Does not need to touch anything else on the machine.

## 4. Feature Breakdown

### 4a. Drive (file storage)

- Folder tree, upload/download, drag-and-drop, rename, move, delete, search by filename.
- Chunked + resumable uploads (critical for large video files over mobile data/Wi-Fi).
- Storage usage dashboard (used/free out of 500GB).
- Shareable internal links (view file in browser) — no need for public internet sharing, this is just for me.

### 4b. Music Player — "exactly Spotify-like"

- Library view: albums, artists, tracks, grouped by folder-derived metadata + ID3 tags.
- Persistent bottom player bar: album art, title/artist, scrubber, play/pause/skip, shuffle, repeat, volume.
- Queue system, "Now Playing" view, playlist creation, like/favorite tracks.
- Search across the library.
- Same component library/design system shared between the web app (Windows laptop) and the Android app, so both look and feel like Spotify.

### 4c. Media Player — "exactly VLC-like"

- Full-screen and windowed playback.
- Audio track switching (when a file has multiple audio streams).
- Subtitle track switching, including toggling subtitles on/off, and support for both embedded and external `.srt`/`.vtt` subtitle files.
- Playback speed control, seek bar with thumbnail preview if feasible, volume, fullscreen, keyboard shortcuts (space = play/pause, arrows = seek, etc., matching VLC conventions).
- Resume playback position per file (store progress in MongoDB).

### 4d. Phone Backup

- Auto-upload new photos/videos from the camera folder in the background, Wi-Fi-only by default (configurable to allow mobile data), with a visible sync status/notification.
- Duplicate detection (hash-based) so re-running backup doesn't re-upload existing files.

### 4e. Windows Folder Sync

- One user-chosen folder kept in sync (two-way) between the Windows laptop and the server. Nothing else on that machine is touched.

## 5. Performance Requirement (non-negotiable)

The UI must feel instant — the whole reason for this project is that Google Drive and typical self-hosted dashboards feel laggy. Concretely:

- Target a consistently smooth 60fps minimum, ideally rendering in a way that scales cleanly to 120fps+ displays (no fixed low frame-rate animations, no layout-thrashing).
- Virtualize long lists (file lists, music libraries) — never render thousands of DOM nodes at once.
- Use GPU-accelerated CSS (`transform`/`opacity`) for all transitions, never animate `top`/`left`/`width` etc.
- Code-split routes; lazy-load the video/music player chunks so the initial Drive view loads fast.
- Optimistic UI updates for actions like rename/delete/favorite (update UI immediately, reconcile with server response after).
- Server responses for file listings should be paginated/streamed, not "load entire folder JSON at once" for huge folders.

## 6. Non-Functional Requirements

- Security: server should not be exposed directly to the public internet — access only via Tailscale/VPN. Auth required for all API routes.
- Resilience: uploads must survive a dropped connection (resumable), and the backup queue must retry failed uploads.
- The old laptop is weak hardware — avoid CPU/GPU-heavy operations (live transcoding, thumbnail generation for large batches) blocking the main server thread; use a background job queue (e.g., BullMQ) for anything expensive.

## 7. Phased Roadmap (build in this order, each phase should be runnable/demoable)

1. **Phase 1 — Core Drive MVP**: Backend file API + MongoDB metadata + basic React file browser (upload/download/list/delete) running on the Arch server, reachable from the Windows laptop via Tailscale.
2. **Phase 2 — Music Player**: Metadata indexing on library folder + Spotify-styled web player (library, queue, now-playing).
3. **Phase 3 — Video Player**: ffprobe indexing + VLC-styled player with audio/subtitle track switching, resume position.
4. **Phase 4 — Android app**: PWA or wrapped web view for the music player + native background camera-backup module.
5. **Phase 5 — Windows folder sync client**.
6. **Phase 6 — Polish pass**: performance profiling (Lighthouse, React DevTools Profiler), animation smoothing, storage dashboard.

## 8. Deliverables Expected From You (the agent)

- A monorepo structure (e.g., `/server`, `/web`, `/android`, `/desktop-sync`) with clear READMEs.
- A step-by-step Arch Linux deployment guide for the server piece (systemd service files, Tailscale setup, Caddy/nginx config).
- Clear setup instructions for running the web app against the server from both the Windows laptop and phone browser.
- Inline comments explaining any non-obvious architectural decision.
- After each phase, a short summary of what was built, how to run/test it, and what's left.

Do not silently skip the Android native background-sync module or the Windows folder-sync client by substituting a "just use the web app" shortcut — both are core requirements, not nice-to-haves.
