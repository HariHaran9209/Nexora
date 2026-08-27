# Nexora Windows 11 Single-Folder Sync Client

Lightweight, high-performance background sync daemon for Windows 11 that keeps **one specific user-designated folder** synchronized bidirectionally with your Nexora personal cloud server (Arch Linux 500GB HDD).

## 🔒 Zero Footprint & Machine Safety
This client **only** reads and writes to the one single folder you configure (e.g. `C:\Users\username\NexoraSync`). It strictly ignores the rest of your Windows machine, making it completely safe for borrowed, shared, or temporary laptops.

## 🚀 Features
- **Realtime Watcher**: Uses Chokidar for instant file addition/modification/deletion detection with smart debouncing.
- **SHA-256 Checksums**: Fast differential sync that prevents redundant re-uploads of existing files.
- **Two-Way Synchronization**: Automatically pulls updates made on Drive/phone and pushes local edits.
- **Resilient Retry**: Handles intermittent network disconnects smoothly.

## 🛠️ Quick Setup

1. Open PowerShell or Command Prompt:
   ```bash
   cd desktop-sync
   npm install
   ```

2. Run the interactive setup wizard:
   ```bash
   npm run setup
   ```
   Follow the prompts to enter:
   - Server URL (e.g., `http://100.x.y.z:5000` over Tailscale)
   - Your Nexora Username & Password
   - Your chosen local sync folder (e.g., `C:\Users\username\NexoraSync`)

3. Enable Automatic Background Sync on Boot (No Terminal Needed):
   ```bash
   npm run autostart:enable
   ```
   Nexora will now run automatically in the background whenever your laptop turns on or logs in. No command prompt or terminal window will stay open!

4. Useful Management Commands:
   - Check sync status: `npm run autostart:status`
   - View recent sync logs: `npm run autostart:logs`
   - Stop background sync: `npm run stop:bg`
   - Disable auto-start on boot: `npm run autostart:disable`
   - Manual foreground run: `npm start`

