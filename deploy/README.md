# Nexora — Arch Linux Server Deployment Guide

This guide walks you through setting up and running **Nexora** on your dedicated **Arch Linux laptop** (AMD PRO A4-4350B, 500GB HDD).

---

## 💻 Hardware Context & Performance Decisions

- **Hardware Profile**: AMD PRO A4-4350B APU, weak integrated Radeon R4 GPU, 500GB 5400RPM HDD.
- **Key Architectural Rules**:
  - **No Real-Time Re-Encoding**: All media files (audio/video) are served via direct HTTP 206 Byte-Range requests and container remuxing, completely avoiding CPU-exhausting live video transcode cycles.
  - **Metadata Offloading**: ID3 audio tags (`music-metadata`) and video streams (`ffprobe`) are inspected once at upload time and indexed into MongoDB.
  - **Asynchronous Disk I/O**: Chunk assembly and thumbnail extraction run asynchronously to keep the main Express HTTP thread responsive.

---

## 🚀 Quick Automated Installation

We provide an automated setup script that configures everything on Arch Linux:

```bash
chmod +x deploy/arch-linux/setup-arch.sh
./deploy/arch-linux/setup-arch.sh
```

---

## 🛠️ Step-by-Step Manual Deployment

### 1. Install System Dependencies

Update packages and install Node.js, FFmpeg, Caddy, and Tailscale:

```bash
sudo pacman -Syu
sudo pacman -S --needed nodejs npm ffmpeg caddy tailscale git base-devel
```

### 2. Install & Start MongoDB

Install MongoDB using `yay` (or your preferred AUR helper):

```bash
yay -S mongodb-bin
sudo systemctl enable --now mongodb.service
```

### 3. Initialize Dedicated System User and Storage

Create a dedicated `nexora` user and mount your 500GB HDD storage partition:

```bash
sudo useradd -r -s /bin/false -d /var/nexora nexora
sudo mkdir -p /var/nexora/storage/files
sudo mkdir -p /var/nexora/storage/.chunks
sudo mkdir -p /var/nexora/storage/.thumbnails
sudo mkdir -p /var/nexora/storage/.subtitles_cache
sudo chown -R nexora:nexora /var/nexora
```

### 4. Build and Install Nexora

```bash
# Copy files
sudo cp -r server /var/nexora/
sudo cp -r web /var/nexora/

# Install server dependencies
cd /var/nexora/server
sudo npm install --production

# Build web frontend
cd /var/nexora/web
sudo npm install
sudo npm run build

# Set permissions
sudo chown -R nexora:nexora /var/nexora
```

### 5. Configure Systemd Service

Copy the systemd service file:

```bash
sudo cp /var/nexora/server/../deploy/arch-linux/nexora-server.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now nexora-server.service
```

Check service status:
```bash
sudo systemctl status nexora-server.service
```

### 6. Setup Caddy Reverse Proxy

```bash
sudo cp deploy/arch-linux/Caddyfile /etc/caddy/Caddyfile
sudo systemctl enable --now caddy.service
```

### 7. Configure Tailscale Zero-Config Remote Access

Connect your server to your secure private Tailscale mesh network:

```bash
sudo systemctl enable --now tailscaled.service
sudo tailscale up
```

Get your Tailscale IP:
```bash
tailscale ip -4
# Example output: 100.85.120.44
```

---

## 📱 Connecting Devices

### From Borrowed Windows 11 Laptop
1. Install [Tailscale for Windows](https://tailscale.com/download/windows) and sign in.
2. Open your browser and navigate to:
   ```
   http://100.85.120.44:5000
   ```
3. To sync a designated folder on Windows without touching the rest of the machine:
   ```powershell
   cd desktop-sync
   npm install
   npm run setup
   npm start
   ```

### From Android Phone
1. Install Tailscale from the Play Store and activate it.
2. In Chrome / Firefox on Android, open:
   ```
   http://100.85.120.44:5000
   ```
   (Tap "Add to Home Screen" for a full-screen native Spotify PWA experience).
3. Install the **Nexora Backup APK** (from `/android`) to automatically back up your camera photos and videos in the background over Wi-Fi!
