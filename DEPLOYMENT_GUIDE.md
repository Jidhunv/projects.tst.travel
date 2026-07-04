# CRM Platform - Complete Deployment Guide

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start (Docker)](#quick-start-docker)
3. [Manual Setup (Linux/Unix)](#manual-setup-linuxunix)
4. [Cloud Deployments](#cloud-deployments)
5. [Configuration](#configuration)
6. [SSL/TLS Setup](#ssltls-setup)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements

- **CPU**: 2 cores minimum (4+ recommended)
- **RAM**: 4 GB minimum (8+ recommended)
- **Storage**: 50 GB SSD minimum
- **OS**: Ubuntu 20.04+ / CentOS 7+ / Debian 10+
- **Docker**: 20.10+ (for Docker deployment)
- **PostgreSQL**: 12+ (for manual setup)
- **Node.js**: 18+ (for manual setup)

### Network Requirements

- Inbound: HTTP (80), HTTPS (443), SSH (22)
- Outbound: SMTP (587), DNS (53), NTP (123)
- Firewall: Allow traffic from users' locations

---

## Quick Start (Docker)

### 1. Install Docker & Docker Compose

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y docker.io docker-compose
sudo usermod -aG docker $USER
newgrp docker

# CentOS/RHEL
sudo yum install -y docker docker-compose
sudo systemctl start docker
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version
docker-compose --version
```

### 2. Clone Repository

```bash
git clone https://github.com/your-org/crm-platform.git
cd crm-platform
```

### 3. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit with your values
nano .env

# Required values to update:
# - DB_PASSWORD
# - JWT_SECRET
# - SMTP_USER
# - SMTP_PASSWORD
# - FRONTEND_URL
```

### 4. Start Services

```bash
# Pull latest images
docker-compose pull

# Build custom images
docker-compose build

# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Specific service logs
docker-compose logs -f backend
docker-compose logs -f postgres
```

### 5. Verify Deployment

```bash
# Wait for services to be healthy (30-60 seconds)
sleep 60

# Test frontend
curl http://localhost:3000

# Test backend
curl http://localhost:3001/api/users -H "Authorization: Bearer test"

# Test database
docker-compose exec postgres psql -U crm_user -d crm_db -c "SELECT COUNT(*) FROM users;"

# View admin credentials
docker-compose exec postgres psql -U crm_user -d crm_db << EOF
SELECT email, firstName, lastName FROM users WHERE email LIKE '%admin%';
EOF
```

### 6. Access Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Default Login**: admin@tst.travel / Admin@12345

---

## Manual Setup (Linux/Unix)

### 1. Install Dependencies

```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Node.js
curl -sL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib

# Install Git
sudo apt-get install -y git

# Install Nginx (optional, for reverse proxy)
sudo apt-get install -y nginx

# Verify installations
node --version
npm --version
psql --version
```

### 2. Setup Database

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user (in psql prompt)
CREATE DATABASE crm_db ENCODING 'UTF8' LOCALE 'en_US.UTF-8';
CREATE USER crm_user WITH ENCRYPTED PASSWORD 'your_secure_password';

\c crm_db

GRANT CONNECT ON DATABASE crm_db TO crm_user;
GRANT CREATE ON DATABASE crm_db TO crm_user;
GRANT ALL PRIVILEGES ON SCHEMA public TO crm_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO crm_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO crm_user;

\q
```

### 3. Apply Database Schema

```bash
# Clone repository (if not already done)
git clone https://github.com/your-org/crm-platform.git
cd crm-platform

# Apply schema
psql -U crm_user -d crm_db -h localhost -f backend/schema.sql

# Verify
psql -U crm_user -d crm_db -h localhost << EOF
SELECT name FROM roles;
SELECT COUNT(*) as role_count FROM roles;
SELECT COUNT(*) as permission_count FROM permissions;
EOF
```

### 4. Setup Backend

```bash
cd backend

# Install dependencies
npm install

# Build TypeScript
npm run build

# Copy environment file
cp ../.env.example .env

# Update .env with your values
nano .env

# Important: Update these values
# - DATABASE_URL
# - DB_PASSWORD
# - JWT_SECRET
# - SMTP credentials
```

### 5. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Build production bundle
npm run build

# Verify build
ls -la dist/
```

### 6. Setup Systemd Services

#### Backend Service

```bash
# Create service file
sudo nano /etc/systemd/system/crm-backend.service

# Add content:
[Unit]
Description=CRM Platform Backend
After=network.target postgresql.service

[Service]
Type=simple
User=nodejs
WorkingDirectory=/opt/crm-platform/backend
ExecStart=/usr/bin/node dist/app.js
Restart=on-failure
RestartSec=10

Environment="NODE_ENV=production"
EnvironmentFile=/opt/crm-platform/backend/.env

[Install]
WantedBy=multi-user.target

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable crm-backend
sudo systemctl start crm-backend
sudo systemctl status crm-backend
```

#### Frontend Service (if serving directly)

```bash
# Setup Nginx as reverse proxy instead (see next section)
```

### 7. Setup Nginx Reverse Proxy

```bash
# Create nginx config
sudo nano /etc/nginx/sites-available/crm

# Add content:
upstream backend {
    server 127.0.0.1:3001;
}

upstream frontend {
    server 127.0.0.1:3000;
}

server {
    listen 80;
    server_name crm.example.com;

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Backend API
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/crm /etc/nginx/sites-enabled/crm

# Test config
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

### 8. Verify Installation

```bash
# Check backend
curl http://localhost:3001/api/users -H "Authorization: Bearer test"

# Check database
psql -U crm_user -d crm_db -c "SELECT COUNT(*) FROM users;"

# View logs
sudo journalctl -u crm-backend -f
```

---

## Cloud Deployments

### AWS EC2 + RDS

```bash
# 1. Launch EC2 instance (Ubuntu 20.04, t3.medium)
# 2. Create RDS PostgreSQL instance

# 3. SSH into EC2
ssh -i key.pem ubuntu@your-instance-ip

# 4. Follow "Manual Setup" steps above

# 5. Update .env with RDS endpoint:
DATABASE_URL=postgresql://crm_user:password@your-rds-endpoint.rds.amazonaws.com:5432/crm_db
```

### Google Cloud Run

```bash
# 1. Create Cloud SQL PostgreSQL instance
# 2. Build and push Docker image:

docker build -t gcr.io/PROJECT-ID/crm-backend ./backend
docker push gcr.io/PROJECT-ID/crm-backend

# 3. Deploy:
gcloud run deploy crm-backend \
  --image gcr.io/PROJECT-ID/crm-backend \
  --memory 2Gi \
  --cpu 2 \
  --env-vars-file .env.gcp
```

### Heroku

```bash
# 1. Create Heroku app
heroku create crm-platform

# 2. Add PostgreSQL addon
heroku addons:create heroku-postgresql:hobby-dev

# 3. Deploy
git push heroku main

# 4. Run migrations
heroku run npm run build
```

### DigitalOcean App Platform

```bash
# 1. Connect GitHub repository
# 2. Create app.yaml:

name: crm-platform
services:
  - name: backend
    github:
      repo: your-org/crm-platform
      branch: main
    build_command: npm run build
    run_command: node dist/app.js
    http_port: 3001
    env:
      - key: NODE_ENV
        value: production
  
  - name: frontend
    github:
      repo: your-org/crm-platform
      branch: main
    build_command: cd frontend && npm run build
    static_sites:
      - source_dir: frontend/dist

databases:
  - name: postgres
    engine: PG
    version: "15"

# 3. Deploy via DigitalOcean dashboard
```

---

## Configuration

### Environment Variables

See `.env.example` for all available options. Key variables:

```env
# Required
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=32+ character random string
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=app-password

# Recommended for production
NODE_ENV=production
FORCE_HTTPS=true
LOG_LEVEL=warn
```

### Database Tuning

```bash
# Edit postgresql.conf
sudo nano /etc/postgresql/15/main/postgresql.conf

# For 4GB RAM server:
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 64MB
checkpoint_completion_target = 0.9
```

### Backup Strategy

```bash
# Daily automated backup
0 2 * * * pg_dump -U crm_user crm_db | gzip > /backups/crm_$(date +\%Y\%m\%d).sql.gz

# Weekly to S3
0 3 * * 0 aws s3 cp /backups/crm_$(date +\%Y\%m\%d).sql.gz s3://my-bucket/backups/
```

---

## SSL/TLS Setup

### Let's Encrypt (Recommended)

```bash
# Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --nginx -d crm.example.com

# Auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Update Nginx:
sudo nano /etc/nginx/sites-available/crm

# Add:
listen 443 ssl;
ssl_certificate /etc/letsencrypt/live/crm.example.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/crm.example.com/privkey.pem;

# Redirect HTTP to HTTPS:
server {
    listen 80;
    server_name crm.example.com;
    return 301 https://$server_name$request_uri;
}
```

---

## Monitoring & Maintenance

### Monitoring Tools

```bash
# Install monitoring stack
docker-compose -f monitoring-compose.yml up -d

# Includes:
# - Prometheus (metrics collection)
# - Grafana (dashboards)
# - Alertmanager (alerts)

# Access Grafana: http://localhost:3000
# Default: admin / admin
```

### Health Checks

```bash
# Backend health
curl http://localhost:3001/api/health

# Database health
psql -U crm_user -d crm_db -c "SELECT 1;"

# Frontend health
curl http://localhost:3000/health
```

### Log Rotation

```bash
# Create logrotate config
sudo nano /etc/logrotate.d/crm

# Content:
/var/log/crm/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 nodejs nodejs
    sharedscripts
    postrotate
        systemctl reload crm-backend > /dev/null 2>&1
    endscript
}
```

---

## Troubleshooting

### Cannot connect to database

```bash
# Check PostgreSQL running
sudo systemctl status postgresql

# Check credentials
psql -U crm_user -h localhost -d crm_db

# View logs
sudo tail -f /var/log/postgresql/postgresql.log
```

### Backend won't start

```bash
# Check logs
sudo journalctl -u crm-backend -n 50

# Manual test
cd /opt/crm-platform/backend
node dist/app.js

# Check port
sudo netstat -tlnp | grep 3001
```

### Frontend blank page

```bash
# Check browser console (F12)
# Check Nginx logs:
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Check frontend service
sudo systemctl status nginx
```

### Email not sending

```bash
# Test SMTP connection
telnet smtp.gmail.com 587

# Check credentials in .env
# Verify app password for Gmail
# Check backend logs for email errors
sudo journalctl -u crm-backend | grep -i email
```

---

## Performance Optimization Checklist

- [ ] Enable Gzip compression (Nginx)
- [ ] Setup CDN for static assets (Cloudflare)
- [ ] Enable database query caching
- [ ] Setup Redis for session caching
- [ ] Configure connection pooling
- [ ] Enable HTTPS/HTTP2
- [ ] Optimize images (WebP format)
- [ ] Minify CSS/JavaScript
- [ ] Setup database indexes
- [ ] Monitor slow queries
- [ ] Setup APM (Application Performance Monitoring)

---

## Security Hardening Checklist

- [ ] Update all packages to latest versions
- [ ] Change default passwords
- [ ] Enable firewall (ufw/firewalld)
- [ ] Setup SSH key authentication
- [ ] Disable SSH password login
- [ ] Enable auto-updates
- [ ] Setup intrusion detection (fail2ban)
- [ ] Enable HTTPS only
- [ ] Setup DDoS protection
- [ ] Regular security audits
- [ ] Enable database encryption
- [ ] Setup VPN for admin access

---

## Support & Resources

- **Documentation**: [DATABASE_SETUP.md](./backend/DATABASE_SETUP.md)
- **API Docs**: Check `backend/API.md`
- **Issues**: GitHub Issues
- **Email**: support@example.com

---

**Last Updated**: 2026-06-30  
**Version**: 1.0  
**Status**: Production Ready ✅
