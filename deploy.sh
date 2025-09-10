#!/bin/bash

# VPS Deployment Script
# Usage: ./deploy.sh YOUR_VPS_IP

if [ -z "$1" ]; then
    echo "Usage: ./deploy.sh YOUR_VPS_IP"
    exit 1
fi

VPS_IP=$1
APP_DIR="/var/www/portfolio-website"

echo "Deploying to VPS at $VPS_IP..."

# Upload files
echo "Uploading files..."
scp -r . root@$VPS_IP:$APP_DIR

# Install dependencies and restart
echo "Installing dependencies and restarting..."
ssh root@$VPS_IP "cd $APP_DIR && npm install --production && pm2 restart portfolio-website"

echo "Deployment complete!"
echo "Your site should be available at http://$VPS_IP"
