# Nexora — Agent Quick Reference

## Monorepo Structure
```
Nexora/
├── server/            # Node.js + Express + MongoDB backend (port 5000)
├── web/               # React + Vite + Tailwind frontend (port 5173 dev)
├── android/           # Native Kotlin Android app (WorkManager background backup)
├── desktop-sync/      # Node.js Windows 11 single-folder sync daemon
└── deploy/            # Arch Linux systemd, Caddy, Tailscale scripts
```

## Essential Commands

### Local Development
```bash
# Start backend (requires MongoDB running)
cd server && npm install && npm run dev

# Start frontend
cd web && npm install && npm run dev

# Desktop sync client setup + run
cd desktop-sync && npm install && npm run setup && npm start
```

### Production Deployment (Arch Linux)
```bash
# Automated setup (run on Arch server)
chmod +x deploy/arch-linux/setup-arch.sh
./deploy/arch-linux/setup-arch.sh

# Manual steps if needed:
# 1. sudo pacman -S nodejs npm ffmpeg caddy tailscale mongodb-bin
# 2. sudo systemctl enable --now mongodb caddy tailscaled
# 3. sudo tailscale up
# 4. Copy server/web to /var/nexora/, npm install --production, npm run build
# 5. sudo cp deploy/arch-linux/nexora-server.service /etc/systemd/system/
# 6. sudo systemctl enable --now nexora-server
```

### Android Build
```bash
cd android
./gradlew assembleDebug
# APK at app/build/outputs/apk/debug/app-debug.apk
```

## Critical Architecture Decisions (Non-Negotiable)

1. **No live transcoding** — Server hardware (AMD PRO A4-4350B) is too weak. All media served via HTTP 206 byte-range; ffmpeg only for remuxing/extracting subtitles at index time.
2. **Metadata indexed once at upload** — `music-metadata` (ID3) and `ffprobe` (video streams) run during upload, stored in MongoDB. Never re-parse on request.
3. **Chunked resumable uploads** — 5MB chunks in `/.chunks`, assembled on complete. Required for large video files over spotty mobile connections.
4. **Virtualized lists mandatory** — Use `@tanstack/react-virtual` for all file/music lists (10k+ items). Never render full DOM.
5. **GPU-accelerated animations only** — `transform`/`opacity` for all transitions. No `top`/`left`/`width` animation.
6. **Tailscale-only remote access** — Server never exposed to public internet. All clients connect via Tailscale mesh (100.x.y.z).
6. **Single-user JWT auth** — Structured for multi-user but currently single-user. All API routes require auth.

## Environment Variables (server/.env)
```
PORT=5000
HOST=0.0.0.0
MONGO_URI=mongodb://127.0.0.1:27017/nexora
JWT_SECRET=<strong-random-secret>
STORAGE_ROOT=/var/nexora/storage  # or ./storage_data for dev
CLIENT_ORIGIN=http://100.x.y.z:5173  # Tailscale IP of frontend
```

## Key Server Entry Points
- `server/src/server.js` — Main entry, connects DB, starts HTTP + Socket.io
- `server/src/config/env.js` — All config, reads from `.env` at `server/.env`
- `server/src/services/chunkUploadService.js` — Handles resumable uploads
- `server/src/services/musicMetadataService.js` — ID3 parsing on upload
- `server/src/services/mediaProbeService.js` — ffprobe video stream inspection
- `server/src/websocket/socketHandler.js` — Real-time sync progress, playback state

## Key Web Entry Points
- `web/src/main.jsx` — App entry, providers (Auth, Drive, Player)
- `web/src/App.jsx` — Routes: /drive, /music, /video, /sync, /login
- `web/src/context/DriveContext.jsx` — File tree state, virtualized list data
- `web/src/context/PlayerContext.jsx` — Shared music/video player state
- `web/src/services/api.js` — Axios instance with auth interceptors
- `web/src/services/chunkUploader.js` — Client-side chunked upload logic

## Performance Rules (Enforced)
- All long lists virtualized (`@tanstack/react-virtual`)
- Code-split routes: `React.lazy` for MusicPage, VideoPage, SyncPage
- Optimistic UI for rename/delete/favorite (update local state, reconcile after)
- Paginated file listings (`?page=1&limit=100`), never full folder dump
- Framer Motion only for mount/unmount transitions; CSS `transform` for drag/scroll

## Testing / Verification
- No formal test suite yet. Verify manually:
  - `cd server && npm run dev` → check logs for "Nexora Server running"
  - `cd web && npm run dev` → open http://localhost:5173
  - Upload a large video (>100MB), verify chunked upload + resume
  - Play video → verify audio/subtitle track switching works
  - Play music → verify persistent bottom bar, queue, shuffle

## Common Gotchas
- **MongoDB must be running** before `npm run dev` in server
- **Storage dirs** auto-created by `storageService.ensureDirectories()` on startup
- **CORS**: `CLIENT_ORIGIN` in `.env` must match frontend Tailscale URL exactly
- **FFmpeg/ffprobe** must be in PATH on server (installed via `pacman -S ffmpeg`)
- **Android app** requires `ANDROID_HOME` and JDK 17 for Gradle build
- **Desktop sync** uses Chokidar; Windows paths need double backslashes or forward slashes in config

## Files to Reference for Context
- `Instructions.md` — Full product spec and phased roadmap
- `README.md` — Architecture diagram, feature list, quickstart
- `deploy/README.md` — Step-by-step Arch Linux deployment
- `android/README.md` — Android build/install instructions
- `desktop-sync/README.md` — Windows sync client setup