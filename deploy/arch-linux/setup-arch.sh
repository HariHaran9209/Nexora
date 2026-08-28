#!/bin/bash
# Nexora Automated Setup Script for Arch Linux Server
# Target Hardware: AMD PRO A4-4350B, 500GB HDD

set -e

echo "========================================================="
echo "  🚀 Installing Nexora Server on Arch Linux"
echo "========================================================="

# 1. Update system packages
echo "[1/6] Updating Arch Linux pacman mirrors and packages..."
sudo pacman -Syu --noconfirm

# 2. Install essential dependencies: Node.js, npm, ffmpeg, mongodb-bin, caddy, tailscale
echo "[2/6] Installing Node.js, FFmpeg, Caddy, Tailscale, and build tools..."
sudo pacman -S --needed --noconfirm nodejs npm ffmpeg caddy tailscale git base-devel

# Install MongoDB from AUR if not present
if ! command -v mongod &> /dev/null; then
    echo "Installing MongoDB..."
    # Ensure yay or paru is available, or install mongodb-bin
    if command -v yay &> /dev/null; then
        yay -S --noconfirm mongodb-bin
    else
        sudo pacman -S --noconfirm docker docker-compose
        sudo systemctl enable --now docker
        echo "Docker enabled for running containerized MongoDB instance."
    fi
fi

# Enable & configure MongoDB (workaround for Linux kernel 6.19+ SERVER-121912 rseq crash)
sudo mkdir -p /etc/systemd/system/mongodb.service.d
sudo bash -c 'cat <<EOF > /etc/systemd/system/mongodb.service.d/override.conf
[Service]
Environment="GLIBC_TUNABLES=glibc.pthread.rseq=1"
EOF'
sudo systemctl daemon-reload

if systemctl list-unit-files | grep -q mongodb.service; then
    sudo systemctl enable --now mongodb.service
fi

# 3. Create dedicated system user for Nexora
echo "[3/6] Setting up nexora system user..."
if ! id "nexora" &>/dev/null; then
    sudo useradd -r -s /bin/false -d /var/nexora nexora
fi

# 4. Setup directories on 365GB storage partition (/run/media/hariharan9209/Mine)
STORAGE_ROOT="${STORAGE_ROOT:-/run/media/hariharan9209/Mine/nexora_storage}"
echo "[4/6] Initializing storage directories at ${STORAGE_ROOT}..."

sudo mkdir -p "${STORAGE_ROOT}/files"
sudo mkdir -p "${STORAGE_ROOT}/.chunks"
sudo mkdir -p "${STORAGE_ROOT}/.thumbnails"
sudo mkdir -p "${STORAGE_ROOT}/.subtitles_cache"
sudo mkdir -p /var/nexora/server
sudo mkdir -p /var/nexora/web

# Copy application files to OS root (/var/nexora)
sudo cp -r server/* /var/nexora/server/
sudo cp -r web/* /var/nexora/web/

# Generate production .env file
sudo bash -c "cat <<EOF > /var/nexora/server/.env
PORT=5000
HOST=0.0.0.0
STORAGE_ROOT=${STORAGE_ROOT}
MONGO_URI=mongodb://127.0.0.1:27017/nexora
JWT_SECRET=nexora_super_secret_jwt_key_arch_linux_2026
NODE_ENV=production
CLIENT_ORIGIN=*
EOF"

# Build Web frontend
cd /var/nexora/web
sudo npm install
sudo npm run build

# Install Server dependencies
cd /var/nexora/server
sudo npm install --production

# Fix permissions
sudo chown -R nexora:nexora /var/nexora
sudo chown -R nexora:nexora "${STORAGE_ROOT}"
sudo chmod -R 775 "${STORAGE_ROOT}"
if [ -d "/run/media/hariharan9209" ]; then
    sudo chmod o+rx /run/media/hariharan9209 || true
fi

# 5. Setup systemd service & Caddy
echo "[5/6] Configuring systemd services..."
sudo cp /var/nexora/server/../deploy/arch-linux/nexora-server.service /etc/systemd/system/
sudo cp /var/nexora/server/../deploy/arch-linux/Caddyfile /etc/caddy/Caddyfile

sudo systemctl daemon-reload
sudo systemctl enable --now nexora-server.service
sudo systemctl enable --now caddy.service

# 6. Setup Tailscale
echo "[6/6] Enabling Tailscale VPN..."
sudo systemctl enable --now tailscaled.service
echo ""
echo "========================================================="
echo "  ✅ Nexora Installation Complete!"
echo "  Run 'sudo tailscale up' to connect to your private mesh."
echo "  Access Nexora at: http://$(tailscale ip -4 2>/dev/null || echo 'YOUR_TAILSCALE_IP')"
echo "========================================================="
