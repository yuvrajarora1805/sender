#!/bin/bash

# WhatsApp Sender macOS Build Script
# This script packages the app into a standalone macOS .app bundle.

echo "=========================================="
echo "  Building WhatsApp Sender for macOS"
echo "=========================================="

# 1. Install dependencies
echo "📦 Installing requirements..."
pip install -r requirements.txt
pip install pyinstaller

# 2. Build the app
echo "🛠 Building single macOS app bundle..."
pyinstaller --noconfirm --onefile --windowed \
    --name "WhatsApp_Sender" \
    --icon "static/favicon.ico" \
    --add-data "templates:templates" \
    --add-data "static:static" \
    --collect-all undetected_chromedriver \
    app.py

echo "=========================================="
echo "  BUILD SUCCESS!"
echo "  App is at: dist/WhatsApp_Sender.app"
echo "=========================================="
