#!/bin/bash
set -e

SERVICE_DIR="/opt/jarvis/service"
SYSTEMD_DIR="/etc/systemd/system"

echo "=== Updating Jarvis systemd services ==="

if [ "$EUID" -ne 0 ]; then
  echo "ERROR: Please run as root (use sudo)"
  exit 1
fi

if [ ! -d "$SERVICE_DIR" ]; then
  echo "ERROR: $SERVICE_DIR does not exist"
  exit 1
fi

echo "Stopping existing services..."
systemctl stop jarvis.service || true
systemctl stop jarvis-camera.service || true

echo "Installing service files..."
cp "$SERVICE_DIR/jarvis.service" "$SYSTEMD_DIR/jarvis.service"
cp "$SERVICE_DIR/jarvis-camera.service" "$SYSTEMD_DIR/jarvis-camera.service"

chmod 644 "$SYSTEMD_DIR/jarvis.service"
chmod 644 "$SYSTEMD_DIR/jarvis-camera.service"

echo "Reloading systemd..."
systemctl daemon-reexec
systemctl daemon-reload

echo "Enabling services at boot..."
systemctl enable jarvis.service
systemctl enable jarvis-camera.service

echo "Starting services..."
systemctl start jarvis-camera.service
systemctl start jarvis.service

echo "Resetting failure counters..."
systemctl reset-failed jarvis.service
systemctl reset-failed jarvis-camera.service

echo ""
echo "=== Service status ==="
systemctl --no-pager status jarvis.service
systemctl --no-pager status jarvis-camera.service

echo ""
echo "=== Done ==="
