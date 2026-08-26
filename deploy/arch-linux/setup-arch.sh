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

# Enable & start MongoDB
if systemctl list-unit-files | grep -q mongodb.service; then
    sudo systemctl enable --now mongodb.service
fi

# 3. Create dedicated system user for Nexora
echo "[3/6] Setting up nexora system user..."
if ! id "nexora" &>/dev/null; then
    sudo useradd -r -s /bin/false -d /var/nexora nexora
fi

# 4. Setup directories on 500GB HDD storage partition
echo "[4/6] Initializing storage directories at /var/nexora/storage..."
sudo mkdir -p /var/nexora/storage/files
sudo mkdir -p /var/nexora/storage/.chunks
sudo mkdir -p /var/nexora/storage/.thumbnails
sudo mkdir -p /var/nexora/storage/.subtitles_cache
sudo mkdir -p /var/nexora/server
sudo mkdir -p /var/nexora/web

# Copy files
sudo cp -r server/* /var/nexora/server/
sudo cp -r web/* /var/nexora/web/

# Build Web frontend
cd /var/nexora/web
sudo npm install
sudo npm run build

# Install Server dependencies
cd /var/nexora/server
sudo npm install --production

# Fix permissions
sudo chown -R nexora:nexora /var/nexora

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
