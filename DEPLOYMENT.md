# 🚀 Deployment Guide

This guide will help you deploy the Intelligent Kitchen AI application to production.

## 📋 Pre-Deployment Checklist

### ✅ Repository Status
- [x] All code committed to git
- [x] Sensitive data excluded via .gitignore
- [x] Environment variables properly configured
- [x] Documentation complete
- [x] License added

### ✅ Code Quality
- [x] No console errors in production build
- [x] All API endpoints tested and working
- [x] Responsive design verified
- [x] Error handling implemented
- [x] Security best practices followed

## 🌐 GitHub Repository Setup

### 1. Create GitHub Repository
```bash
# Go to https://github.com and create a new repository
# Name: intelligent-kitchen
# Description: AI-powered kitchen management system
# Visibility: Public (or Private as needed)
```

### 2. Add Remote Origin
```bash
# Replace YOUR_USERNAME with your GitHub username
git remote add origin https://github.com/YOUR_USERNAME/intelligent-kitchen.git
```

### 3. Push to GitHub
```bash
# Push main branch to GitHub
git push -u origin main

# Or if you want to push to a different branch
git push -u origin main:main
```

### 4. Configure GitHub Repository
- Add repository description
- Add topics: `react`, `nodejs`, `typescript`, `kitchen-management`, `meal-planning`
- Enable GitHub Pages for documentation (optional)
- Set up branch protection rules
- Add issue templates

## 🏗 Production Deployment Options

### Option 1: Docker Deployment (Recommended)

#### Prerequisites
- Docker and Docker Compose installed
- Production server with SSH access
- Domain name (optional)

#### Steps
1. **Clone repository on production server**
   ```bash
   git clone https://github.com/YOUR_USERNAME/intelligent-kitchen.git
   cd intelligent-kitchen
   ```

2. **Set up production environment**
   ```bash
   # Copy environment templates
   cp .env.example .env
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   
   # Edit with production values
   nano .env
   nano backend/.env
   nano frontend/.env
   ```

3. **Build and start containers**
   ```bash
   docker-compose up -d
   ```

4. **Set up SSL certificate**
   ```bash
   # Using Let's Encrypt with Certbot
   sudo apt install certbot
   sudo certbot --nginx -d yourdomain.com
   ```

### Option 2: Manual Deployment

#### Backend Deployment
```bash
cd backend
npm install --production
npm run build
pm2 start ecosystem.config.js
```

#### Frontend Deployment
```bash
cd frontend
npm install
npm run build
# Serve build folder with nginx or apache
```

## 🔧 Environment Configuration

### Production Environment Variables

#### Backend (.env)
```env
NODE_ENV=production
PORT=3002
DB_HOST=your-production-db-host
DB_PORT=5432
DB_NAME=intelligent_kitchen_prod
DB_USER=production_user
DB_PASSWORD=secure-production-password
JWT_SECRET=super-secure-production-jwt-secret
FRONTEND_URL=https://yourdomain.com
```

#### Frontend (.env)
```env
VITE_API_URL=https://api.yourdomain.com
VITE_NODE_ENV=production
VITE_ENABLE_VOICE_COMMANDS=true
VITE_ENABLE_BARCODE_SCANNING=true
```

## 🔒 Security Considerations

### Database Security
- Use strong database passwords
- Enable SSL connections
- Regular database backups
- Limit database user permissions

### API Security
- Rate limiting implemented
- CORS properly configured
- JWT tokens with expiration
- Input validation on all endpoints

### SSL/HTTPS
- Enable HTTPS in production
- Use valid SSL certificates
- Redirect HTTP to HTTPS
- Secure cookies and headers

## 📊 Monitoring and Logging

### Application Monitoring
```bash
# Use PM2 for process monitoring
pm2 monit

# Check logs
pm2 logs

# Restart application
pm2 restart all
```

### Database Monitoring
- Set up database monitoring
- Monitor query performance
- Set up alerts for errors
- Regular maintenance tasks

## 🔄 CI/CD Pipeline

### GitHub Actions Example
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to server
        run: |
          # Your deployment script
```

## 🌍 Domain and DNS Setup

### DNS Configuration
```
A Record: @ -> YOUR_SERVER_IP
A Record: api -> YOUR_SERVER_IP
CNAME: www -> yourdomain.com
```

### Nginx Configuration
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomain.com;
    
    # SSL configuration
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    # Frontend
    location / {
        root /var/www/intelligent-kitchen/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
    
    # Backend API
    location /api {
        proxy_pass http://localhost:3002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 📱 Mobile App Considerations

### Progressive Web App (PWA)
- Add service worker
- Create app manifest
- Enable offline functionality
- Optimize for mobile devices

### Native App Development
- React Native for cross-platform
- Flutter for single codebase
- Native iOS/Android development

## 🧪 Testing in Production

### Smoke Tests
```bash
# Test critical functionality
curl -f https://yourdomain.com/api/grocery-lists
curl -f https://yourdomain.com/api/recipes
```

### Load Testing
- Use tools like Artillery or k6
- Test API endpoints under load
- Monitor server resources
- Optimize performance bottlenecks

## 📈 Scaling Considerations

### Horizontal Scaling
- Load balancer setup
- Multiple server instances
- Database replication
- Caching layer (Redis)

### Vertical Scaling
- Increase server resources
- Optimize database queries
- Implement caching strategies
- Use CDN for static assets

## 🔄 Backup and Recovery

### Database Backups
```bash
# Daily backup script
pg_dump intelligent_kitchen_prod > backup_$(date +%Y%m%d).sql

# Automated backup with cron
0 2 * * * pg_dump intelligent_kitchen_prod > /backups/daily_$(date +\%Y\%m\%d).sql
```

### File Backups
- Backup user uploads
- Backup configuration files
- Version control for code
- Disaster recovery plan

## 📞 Support and Maintenance

### Regular Maintenance
- Update dependencies
- Security patches
- Performance monitoring
- User feedback collection

### Support Channels
- GitHub Issues for bug reports
- Documentation for self-help
- Community forums (optional)
- Email support for enterprise

---

**Ready to deploy! 🚀**

Follow this guide carefully and test thoroughly before going live.