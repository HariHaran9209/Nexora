#!/bin/bash
# Tailscale Secure Remote Access Configuration Script
# Connects Arch Linux Laptop, Windows 11 Laptop, and Android phone

set -e

echo "=== Nexora Tailscale Setup ==="

if ! command -v tailscale &> /dev/null; then
    echo "Installing Tailscale..."
    sudo pacman -S --noconfirm tailscale
fi

echo "Enabling tailscaled daemon..."
sudo systemctl enable --now tailscaled.service

echo "Authenticating Tailscale mesh network..."
sudo tailscale up --ssh --accept-routes

TAILSCALE_IP=$(tailscale ip -4)

echo ""
echo "==============================================================="
echo "  ✅ Tailscale is active!"
echo "  Server IP on Tailscale Mesh: ${TAILSCALE_IP}"
echo ""
echo "  Use this IP to access Nexora from:"
echo "  - Windows 11 Laptop Web Browser: http://${TAILSCALE_IP}:5000"
echo "  - Android Mobile Browser / PWA:  http://${TAILSCALE_IP}:5000"
echo "  - Android Auto-Backup App:       http://${TAILSCALE_IP}:5000"
echo "  - Windows Single-Folder Sync:    http://${TAILSCALE_IP}:5000"
echo "==============================================================="
