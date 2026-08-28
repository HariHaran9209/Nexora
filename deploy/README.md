# Nexora — Arch Linux Server Deployment Guide

This guide walks you through setting up and running **Nexora** on your dedicated **Arch Linux laptop** (AMD PRO A4-4350B, 50GB OS Root + 365GB Storage Partition at `/run/media/hariharan9209/Mine`).

---

## 💻 Hardware & Storage Architecture

- **Hardware Profile**: AMD PRO A4-4350B APU, integrated Radeon R4 GPU.
- **Partition Layout**:
  - **OS Root Partition (50GB)**: Hosts the operating system, MongoDB binaries, and Nexora application server/web build at `/var/nexora` (~200MB).
  - **Data Storage Partition (365GB at `/run/media/hariharan9209/Mine`)**: Dedicated storage for all uploaded files, video/audio media, chunk caches, thumbnails, and subtitle caches at `/run/media/hariharan9209/Mine/nexora_storage`.
- **Key Architectural Rules**:
  - **No Real-Time Re-Encoding**: All media files are served via direct HTTP 206 Byte-Range requests and container remuxing, completely avoiding CPU-exhausting live video transcode cycles.
  - **Metadata Offloading**: ID3 audio tags (`music-metadata`) and video streams (`ffprobe`) are inspected once at upload time and indexed into MongoDB.
  - **Asynchronous Disk I/O**: Chunk assembly and thumbnail extraction run asynchronously to keep the main Express HTTP thread responsive.

---

## 🚀 Quick Automated Installation

We provide an automated setup script that configures everything on Arch Linux and automatically sets up storage on your 365GB partition:

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

### 3. Initialize Dedicated System User and 365GB Storage

Create the `nexora` system user and initialize the storage directories on your **365GB partition** (`/run/media/hariharan9209/Mine`):

```bash
# Create dedicated system user
sudo useradd -r -s /bin/false -d /var/nexora nexora

# Create storage directory structure on 365GB partition
sudo mkdir -p /run/media/hariharan9209/Mine/nexora_storage/files
sudo mkdir -p /run/media/hariharan9209/Mine/nexora_storage/.chunks
sudo mkdir -p /run/media/hariharan9209/Mine/nexora_storage/.thumbnails
sudo mkdir -p /run/media/hariharan9209/Mine/nexora_storage/.subtitles_cache

# Set permissions for nexora user to access and write to the partition
sudo chown -R nexora:nexora /run/media/hariharan9209/Mine/nexora_storage
sudo chmod -R 775 /run/media/hariharan9209/Mine/nexora_storage
sudo chmod o+rx /run/media/hariharan9209
```

> **Tip for Persistent Boot Mount**:
> If `/run/media/hariharan9209/Mine` is mounted dynamically by your desktop environment, ensure it mounts on headless boot by adding it to `/etc/fstab` (or keeping your desktop session auto-login active).

### 4. Build and Install Nexora Application

Install the application codebase to `/var/nexora` (on your 50GB OS partition):

```bash
# Create application directories
sudo mkdir -p /var/nexora/server
sudo mkdir -p /var/nexora/web

# Copy files
sudo cp -r server/* /var/nexora/server/
sudo cp -r web/* /var/nexora/web/

# Configure Environment
sudo bash -c 'cat <<EOF > /var/nexora/server/.env
PORT=5000
HOST=0.0.0.0
STORAGE_ROOT=/run/media/hariharan9209/Mine/nexora_storage
MONGO_URI=mongodb://127.0.0.1:27017/nexora
JWT_SECRET=nexora_super_secret_jwt_key_arch_linux_2026
NODE_ENV=production
CLIENT_ORIGIN=*
EOF'

# Install server dependencies
cd /var/nexora/server
sudo npm install --production

# Build web frontend
cd /var/nexora/web
sudo npm install
sudo npm run build

# Set application permissions
sudo chown -R nexora:nexora /var/nexora
```

### 5. Configure Systemd Service

Copy and enable the systemd service (configured with `STORAGE_ROOT=/run/media/hariharan9209/Mine/nexora_storage`):

```bash
sudo cp deploy/arch-linux/nexora-server.service /etc/systemd/system/
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
3. Install the **Nexora Backup APK** (from `/android`) to automatically back up your camera photos and videos in the background over Wi-Fi directly to your 365GB partition!
