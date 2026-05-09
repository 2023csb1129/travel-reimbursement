# Reimbursify Deployment Guide

**Version**: 1.0  
**Last Updated**: April 15, 2026  
**Target Environments**: Development, Staging, Production

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Vercel Deployment](#vercel-deployment)
3. [Docker Deployment](#docker-deployment)
4. [Database Migration](#database-migration)
5. [Environment Configuration](#environment-configuration)
6. [Security Configuration](#security-configuration)
7. [Monitoring & Logging](#monitoring--logging)
8. [Rollback Procedures](#rollback-procedures)

---

## Pre-Deployment Checklist

- [ ] All tests passing: `npm run test`
- [ ] No TypeScript errors: `npm run build`
- [ ] ESLint clean: `npm run lint`
- [ ] Database migrations created: `npx prisma migrate dev`
- [ ] Environment variables defined in `.env.production`
- [ ] SSL certificates obtained and configured
- [ ] Security headers configured in `next.config.ts`
- [ ] Rate limiting configured
- [ ] Database backups automated
- [ ] Error tracking (Sentry) configured
- [ ] Email notifications tested
- [ ] CDN cache policies configured
- [ ] Analytics integrated
- [ ] API rate limits documented
- [ ] Admin credentials changed from defaults

---

## Vercel Deployment

### Option 1: Vercel CLI (Recommended)

**Prerequisites**:
- Vercel account created
- GitHub repository connected to Vercel
- Vercel CLI installed: `npm install -g vercel`

**Step 1: Prepare Code**
```bash
# Ensure all changes are committed
git add .
git commit -m "Production deployment"
git push origin main
```

**Step 2: Deploy**
```bash
# Option A: Deploy from command line
vercel deploy --prod

# Option B: Deploy from GitHub (automatic)
# Push to main branch, Vercel automatically deploys
```

**Step 3: Configure Environment**
```bash
# Set production environment variables
vercel env add DATABASE_URL
vercel env add NEXTAUTH_SECRET
vercel env add NEXTAUTH_URL
vercel env add EMAIL_SERVICE_API_KEY
```

**Verification**:
```bash
# Check deployment status
vercel projects

# View logs
vercel logs [project-name]

# Test deployed app
curl https://reimbursify.vercel.app/api/health
```

### Option 2: GitHub Actions CI/CD

**Step 1: Create Workflow File**
```bash
# File: .github/workflows/deploy.yml
```

```yaml
name: Deploy to Vercel

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm install
      
      - name: Run tests
        run: npm run test
      
      - name: Build
        run: npm run build
      
      - name: Deploy to Vercel
        uses: vercel/action@v6
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          production: true
```

**Step 2: Configure GitHub Secrets**
```bash
# In GitHub repo settings > Secrets and variables > Actions:
- VERCEL_TOKEN: <vercel-token>
- VERCEL_ORG_ID: <org-id>
- VERCEL_PROJECT_ID: <project-id>
```

---

## Docker Deployment

### Step 1: Create Dockerfile

```dockerfile
# File: Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Build
RUN npm run build

# Expose port
EXPOSE 3000

# Set production environment
ENV NODE_ENV=production

# Start application
CMD ["npm", "start"]
```

### Step 2: Create Docker Compose

```yaml
# File: docker-compose.prod.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://user:pass@postgres:5432/reimbursify
      NEXTAUTH_URL: https://reimbursify.example.com
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
    depends_on:
      - postgres
    restart: always
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: reimbursify
      POSTGRES_USER: user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: always
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user"]
      interval: 10s
      timeout: 5s
      retries: 5

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      - app
    restart: always

volumes:
  postgres_data:
    driver: local
```

### Step 3: Deploy with Docker Compose

```bash
# Pull image and start containers
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f app

# Stop services
docker-compose -f docker-compose.prod.yml down

# Restart after configuration changes
docker-compose -f docker-compose.prod.yml restart app
```

---

## Database Migration

### Step 1: Backup Current Database

```bash
# PostgreSQL backup
pg_dump -U postgres reimbursify > backup_$(date +%Y%m%d_%H%M%S).sql

# Or use Prisma migration history
npx prisma migrate resolve --rolled-back <migration_name>
```

### Step 2: Run Migrations

```bash
# Generate migration
npx prisma migrate dev --name feature_description

# Deploy to production
npx prisma migrate deploy

# Verify schema
npx prisma db pull
npx prisma db push --skip-generate
```

### Step 3: Seed Production Data

```bash
# DO NOT run seed.js in production (creates test data)!
# Instead, manually create:
# 1. Institute records
# 2. Admin user
# 3. Form templates

# Verify data integrity
npx prisma studio
```

### Step 4: Verify Migration

```bash
# Check Prisma schema matches database
npx prisma validate

# Run data integrity checks
npm run test:db
```

---

## Environment Configuration

### Step 1: Create `.env.production`

```bash
# Database
DATABASE_URL=postgresql://user:password@postgres-prod.example.com:5432/reimbursify

# Next.js
NEXT_PUBLIC_API_BASE_URL=https://api.reimbursify.example.com
NODE_ENV=production

# NextAuth
NEXTAUTH_URL=https://reimbursify.example.com
NEXTAUTH_SECRET=$(openssl rand -base64 32)

# Email Service
EMAIL_SERVICE=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASS=<app-password>
SMTP_FROM=noreply@example.com

# Error Tracking (Sentry)
SENTRY_DSN=https://xxxxx@sentry.io/project_id

# Analytics
GOOGLE_ANALYTICS_ID=UA-XXXXXXXXX-X

# AWS S3 (for file uploads)
AWS_ACCESS_KEY_ID=<access-key>
AWS_SECRET_ACCESS_KEY=<secret-key>
AWS_S3_BUCKET=reimbursify-prod
AWS_REGION=us-east-1

# Security
CORS_ORIGIN=https://reimbursify.example.com
API_RATE_LIMIT=100
BCRYPT_ROUNDS=12

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

### Step 2: Verify Environment Variables

```bash
# Check required variables are set
npm run check:env

# Test database connection
npx prisma db push --skip-generate

# Test email (if configured)
npm run test:email
```

---

## Security Configuration

### Step 1: Configure Security Headers (next.config.ts)

```typescript
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains'
  },
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net"
  }
];

export const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};
```

### Step 2: Enable HTTPS/SSL

```bash
# For Vercel: Automatic (included with deployment)

# For Docker: Use Let's Encrypt
docker run --rm --name certbot \
  -v /etc/letsencrypt:/etc/letsencrypt \
  certbot/certbot certonly --standalone \
  -d reimbursify.example.com \
  -d api.reimbursify.example.com
```

### Step 3: Configure Rate Limiting

```typescript
// File: src/lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';

export const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 m'),
});

// Usage in API routes
import { ratelimit } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const { success, pending, limit, reset, remaining } = await ratelimit.limit(
    `ip:${request.ip}`
  );

  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    );
  }

  // ... rest of handler
}
```

### Step 4: Enable Password Requirements

Update seed logic to enforce:
- Minimum 12 characters
- Uppercase, lowercase, numbers, special characters
- Change password on first login

---

## Monitoring & Logging

### Step 1: Configure Sentry (Error Tracking)

```bash
# Install Sentry
npm install @sentry/nextjs

# Initialize in root
npx @sentry/wizard@latest -i nextjs
```

```typescript
// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});

// sentry.server.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

### Step 2: Set Up Logging

```typescript
// File: src/lib/logger.ts
export const logger = {
  info: (message: string, data?: any) => {
    console.log(JSON.stringify({ level: 'info', message, ...data }));
  },
  error: (message: string, error?: any) => {
    console.error(JSON.stringify({ level: 'error', message, error: error?.message }));
  },
  warn: (message: string, data?: any) => {
    console.warn(JSON.stringify({ level: 'warn', message, ...data }));
  },
};
```

### Step 3: Monitor Performance

```typescript
// Enable Next.js Analytics
// In app/layout.tsx
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout() {
  return (
    <html>
      <body>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

---

## Rollback Procedures

### Step 1: Identify Issue

```bash
# Check Sentry or logs
# Determine what needs to be rolled back
```

### Step 2: Rollback Code

**Vercel**:
```bash
# From Vercel Dashboard:
# Deployments → Previous Deployment → Redeploy

# Or via CLI:
vercel rollback --prod
```

**Docker**:
```bash
# Stop current container
docker-compose -f docker-compose.prod.yml down

# Switch to previous image
docker-compose -f docker-compose.prod.yml up -d
```

**GitHub**:
```bash
# Revert commit
git revert <commit-hash>
git push origin main

# GitHub Actions will auto-deploy
```

### Step 3: Rollback Database

```bash
# If schema changed and broke app:
npx prisma migrate resolve --rolled-back migration_name

# Or restore from backup:
psql -U postgres reimbursify < backup_file.sql

# Verify data integrity
npx prisma validate
```

### Step 4: Post-Rollback

1. **Communicate status** to stakeholders
2. **Root cause analysis** - document what failed
3. **Code review** - prevent similar issues
4. **Testing improvement** - add test case for failure
5. **Re-deploy fixed version** once issue resolved

---

## Post-Deployment Verification

```bash
# Health Check
curl https://reimbursify.example.com/api/health

# Database connectivity
curl -X GET https://reimbursify.example.com/api/auth/session

# Protected route access
curl -X GET https://reimbursify.example.com/api/trips

# Expect 401 without auth, not 500 error

# Performance monitoring
lighthouse https://reimbursify.example.com
```

---

## Performance Optimization

### Image Optimization
```typescript
// next.config.ts
export const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000,
  },
};
```

### Database Connection Pooling
```typescript
// For production with PostgreSQL
const datasource = {
  url: `${process.env.DATABASE_URL}?schema=public&connection_limit=5&pool_timeout=10`,
};
```

### Caching Strategy
```typescript
// API route with caching
export const revalidate = 60; // 60 seconds

export async function GET() {
  // Responses cached for 60 seconds
}
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Database connection timeout | Check DATABASE_URL, verify PostgreSQL container health |
| "NEXTAUTH_SECRET not configured" | Set NEXTAUTH_SECRET in environment variables |
| Slow page load | Enable caching, optimize images, check CDN configuration |
| 502 Bad Gateway | Check app container health, view logs with `docker logs` |
| Email not sending | Verify SMTP credentials, check firewall rules |
| Storage quota exceeded | Delete old bill files, implement cleanup job |

---

## Support

- **Documentation**: See API_DOCUMENTATION.md
- **Issues**: Check deployment logs in Vercel/Docker
- **Emergency**: Contact DevOps team with error logs and timestamps
