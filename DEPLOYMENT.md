# VPS Deployment Guide

## Prerequisites
- Ubuntu VPS (18.04+)
- Root or sudo access
- Domain name pointing to your VPS IP

## Step 1: Server Setup

### Install Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Install PM2
```bash
sudo npm install -g pm2
```

### Install Nginx
```bash
sudo apt update
sudo apt install nginx
```

## Step 2: Deploy Application

### Upload files to server
```bash
# On your local machine
scp -r /Users/tobiasskytteaaskov/Desktop/portfolio-website root@YOUR_VPS_IP:/var/www/portfolio-website
```

### Install dependencies
```bash
# On VPS
cd /var/www/portfolio-website
npm install --production
```

### Start with PM2
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Step 3: Configure Nginx

Create `/etc/nginx/sites-available/portfolio-website`:
```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN.com www.YOUR_DOMAIN.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/portfolio-website /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Step 4: SSL Certificate (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d YOUR_DOMAIN.com -d www.YOUR_DOMAIN.com
```

## Step 5: Firewall

```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
```

## File Permissions

```bash
sudo chown -R www-data:www-data /var/www/portfolio-website
sudo chmod -R 755 /var/www/portfolio-website
```

## Monitoring

```bash
pm2 status
pm2 logs
pm2 restart portfolio-website
```
