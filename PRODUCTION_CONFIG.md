# Reimbursify Production Configuration Guide

**Version**: 1.0  
**Last Updated**: April 15, 2026  
**Environment**: Production

---

## Table of Contents

1. [Environment Variables](#environment-variables)
2. [Database Configuration](#database-configuration)
3. [Email Configuration](#email-configuration)
4. [Cloud Storage Configuration](#cloud-storage-configuration)
5. [Authentication Configuration](#authentication-configuration)
6. [Performance Configuration](#performance-configuration)
7. [Monitoring & Alerts](#monitoring--alerts)
8. [Backup & Recovery](#backup--recovery)
9. [Security Hardening](#security-hardening)
10. [Compliance Configuration](#compliance-configuration)

---

## Environment Variables

### Configuration Strategy

All sensitive values should be stored in your deployment platform's secure secrets manager:
- **Vercel**: Settings → Environment Variables
- **Docker**: Use `.env.production` (git-ignored) or secrets manager
- **AWS**: Use AWS Secrets Manager or Parameter Store
- **Cloud Run**: Use Google Cloud Secret Manager

### Required Variables

Create `.env.production` with:

```bash
# ============ CORE APPLICATION ============
NODE_ENV=production
NEXT_PUBLIC_API_BASE_URL=https://api.reimbursify.example.com
NEXT_PUBLIC_APP_URL=https://reimbursify.example.com

# ============ DATABASE ============
DATABASE_URL=postgresql://reimbursify_user:${SECURE_PASSWORD}@postgres-prod.example.com:5432/reimbursify?schema=public&ssl=require&sslmode=require&connection_limit=20

# ============ NEXTAUTH ============
NEXTAUTH_URL=https://reimbursify.example.com
NEXTAUTH_SECRET=$(openssl rand -base64 32)  # Generate unique secret

# ============ AUTHENTICATION ============
AUTH_ENABLED=true
AUTH_PROVIDERS_CREDENTIALS=true
PASSWORD_MIN_LENGTH=12
PASSWORD_REQUIRE_UPPERCASE=true
PASSWORD_REQUIRE_LOWERCASE=true
PASSWORD_REQUIRE_NUMBERS=true
PASSWORD_REQUIRE_SPECIAL_CHARS=true
SESSION_TIMEOUT_MINUTES=30
BCRYPT_ROUNDS=12

# ============ EMAIL CONFIGURATION ============
EMAIL_SERVICE=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER=${SECURE_SMTP_USER}
SMTP_PASSWORD=${SECURE_SMTP_PASSWORD}
SMTP_FROM=noreply@reimbursify.example.com
SMTP_FROM_NAME="Reimbursify System"
EMAIL_VERIFICATION_REQUIRED=true
PASSWORD_RESET_EXPIRY_MINUTES=30

# ============ FILE STORAGE ============
FILE_STORAGE_TYPE=s3
AWS_S3_BUCKET=reimbursify-prod
AWS_S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=${SECURE_AWS_ACCESS_KEY}
AWS_SECRET_ACCESS_KEY=${SECURE_AWS_SECRET_KEY}
MAX_UPLOAD_SIZE_MB=50
MAX_MONTHLY_UPLOADS_MB=5000
ALLOWED_FILE_TYPES=pdf,jpg,jpeg,png,xlsx,xls,doc,docx

# ============ ERROR TRACKING & LOGGING ============
SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
LOG_LEVEL=info
LOG_FORMAT=json
LOG_RETENTION_DAYS=90

# ============ ANALYTICS ============
GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
ENABLE_ANALYTICS=true

# ============ RATE LIMITING ============
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW_MINUTES=1
RATE_LIMIT_STORAGE=redis

# ============ REDIS (for rate limiting & caching) ============
REDIS_URL=redis://reimbursify:${SECURE_REDIS_PASSWORD}@redis-prod.example.com:6379

# ============ FEATURES ============
FEATURE_PAYMENT_INTEGRATION=false
FEATURE_BULK_UPLOAD=true
FEATURE_EMAIL_NOTIFICATIONS=true
FEATURE_EXPENSE_SPLITTING=false
FEATURE_MOBILE_APP=false

# ============ SECURITY ============
CORS_ALLOWED_ORIGINS=https://reimbursify.example.com,https://api.reimbursify.example.com
ENFORCE_HTTPS=true
SECURE_COOKIES=true
SAME_SITE_COOKIES=Strict
CSRF_PROTECTION=true

# ============ API KEYS (Third-party Services) ============
SENDGRID_API_KEY=${SECURE_SENDGRID_KEY}  # Alternative to SMTP
STRIPE_PUBLIC_KEY=${SECURE_STRIPE_PUBLIC}
STRIPE_SECRET_KEY=${SECURE_STRIPE_SECRET}

# ============ BACKUP & MAINTENANCE ============
BACKUP_SCHEDULE=daily
BACKUP_RETENTION_DAYS=30
MAINTENANCE_WINDOW_DAY=sunday
MAINTENANCE_WINDOW_TIME=02:00
```

### Generate Secure Values

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Generate API keys (examples)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Keep in password manager, NOT in git
```

---

## Database Configuration

### PostgreSQL Setup

**Create Database User**:
```sql
CREATE USER reimbursify_user WITH PASSWORD 'strong_password_here';

CREATE DATABASE reimbursify
  OWNER reimbursify_user
  ENCODING 'UTF8'
  LC_COLLATE 'en_US.UTF-8'
  LC_CTYPE 'en_US.UTF-8';

GRANT ALL PRIVILEGES ON DATABASE reimbursify TO reimbursify_user;

-- Connection pooling permissions
ALTER ROLE reimbursify_user SET application_name = 'reimbursify_prod';

-- Enable extensions
\c reimbursify
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For text search
```

### Connection Pooling

**PgBouncer Configuration** (`/etc/pgbouncer/pgbouncer.ini`):

```ini
[databases]
reimbursify = host=localhost port=5432 dbname=reimbursify user=reimbursify_user password=secret

[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
min_pool_size = 10
reserve_pool_size = 5
reserve_pool_timeout = 3
max_idle_time = 900
server_idle_timeout = 600
```

### Prisma Configuration

**Update `prisma/schema.prisma`**:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // Enable connection pooling
  extensions = [uuidOssp(map: "uuid-ossp"), pgTrgm]
}

// Connection string with pooling
// DATABASE_URL="postgresql://user:pass@pgbouncer:6432/reimbursify?schema=public&connection_limit=20"
```

### Create Indexes for Performance

```sql
-- File indexes for fast retrieval
CREATE INDEX idx_bills_expense_id ON bills(expense_id);
CREATE INDEX idx_bills_created_at ON bills(created_at);

-- Trip indexes
CREATE INDEX idx_trips_user_id ON trips(user_id);
CREATE INDEX idx_trips_created_at ON trips(created_at DESC);

-- Expense indexes
CREATE INDEX idx_expenses_trip_id ON expenses(trip_id);
CREATE INDEX idx_expenses_status ON expenses(status);
CREATE INDEX idx_expenses_submitted_by ON expenses("submittedById");

-- Submission indexes
CREATE INDEX idx_submissions_user_id ON submissions("userId");
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_submissions_template_id ON submissions("templateId");

-- Composite indexes
CREATE INDEX idx_expenses_trip_status ON expenses(trip_id, status);
CREATE INDEX idx_submissions_user_status ON submissions("userId", status);
```

### Backup Strategy

**Automated Daily Backup**:
```bash
#!/bin/bash
# File: scripts/backup-db.sh

BACKUP_DIR="/backups/postgresql"
DB_NAME="reimbursify"
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_$(date +%Y%m%d_%H%M%S).sql.gz"

mkdir -p "$BACKUP_DIR"

# Create backup
pg_dump -U reimbursify_user -h localhost "$DB_NAME" | gzip > "$BACKUP_FILE"

# Keep only last 30 days
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 -delete

echo "Backup created: $BACKUP_FILE"
```

**Cron Job**:
```bash
# Add to crontab -e
0 2 * * * /app/scripts/backup-db.sh
```

---

## Email Configuration

### Option 1: SMTP (Gmail)

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER=noreply@example.com
SMTP_PASSWORD=<app_password>  # Generate in Gmail settings
SMTP_FROM=noreply@example.com
SMTP_FROM_NAME="Reimbursify System"
```

**Gmail Setup**:
1. Enable 2-Factor Authentication on Gmail account
2. Create App Password: https://support.google.com/accounts/answer/185833
3. Use the app password in `SMTP_PASSWORD`

### Option 2: SendGrid

```bash
SENDGRID_API_KEY=${SECURE_SENDGRID_KEY}
```

**Update `src/lib/email.ts`**:
```typescript
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export async function sendEmail(to: string, subject: string, html: string) {
  try {
    await sgMail.send({
      to,
      from: process.env.SMTP_FROM!,
      subject,
      html,
    });
  } catch (error) {
    console.error('Email send failed:', error);
    throw error;
  }
}
```

### Email Templates

Create templates for:
- User registration confirmation
- Password reset link
- Submission status updates (SUBMITTED, APPROVED, REJECTED)
- Weekly digest of pending approvals
- Bill upload confirmation

---

## Cloud Storage Configuration

### AWS S3 Setup

**Create S3 Bucket**:
```bash
aws s3api create-bucket \
  --bucket reimbursify-prod \
  --region us-east-1 \
  --create-bucket-configuration LocationConstraint=us-east-1
```

**Enable Versioning**:
```bash
aws s3api put-bucket-versioning \
  --bucket reimbursify-prod \
  --versioning-configuration Status=Enabled
```

**Create IAM User**:
```bash
aws iam create-user --user-name reimbursify-app

# Attach policy
aws iam attach-user-policy \
  --user-name reimbursify-app \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess  # Too permissive, use custom policy below
```

**Custom S3 Policy**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::reimbursify-prod/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::reimbursify-prod"
    }
  ]
}
```

**Generate Access Keys**:
```bash
aws iam create-access-key --user-name reimbursify-app
```

Store the output in environment variables.

---

## Authentication Configuration

### Two-Factor Authentication (2FA) Setup

**Install 2FA Library**:
```bash
npm install speakeasy qrcode
```

**Add to User Schema** (`prisma/schema.prisma`):
```prisma
model User {
  // ... existing fields
  twoFactorEnabled  Boolean   @default(false)
  twoFactorSecret   String?   // Encrypted
  twoFactorBackupCodes String[]  // Encrypted array
}
```

**2FA Verification Function**:
```typescript
import speakeasy from 'speakeasy';

export function verifyTwoFactorToken(secret: string, token: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 2, // Allow 30-second window
  });
}
```

### Session Security

```typescript
// src/lib/auth.ts
export const authOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 30 * 60, // 30 minutes
    updateAge: 5 * 60, // 5 minutes
  },
  cookies: {
    sessionToken: {
      name: 'sessionToken',
      options: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 60,
        path: '/',
      },
    },
  },
};
```

---

## Performance Configuration

### Next.js Optimization

**Update `next.config.ts`**:
```typescript
export const nextConfig = {
  // Compression
  compress: true,
  
  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000,
    deviceSizes: [640, 750, 828, 1080, 1200],
  },
  
  // Build output
  productionBrowserSourceMaps: false,
  
  // API routes
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },
};
```

### Database Query Optimization

```typescript
// Avoid N+1 queries
const expenses = await prisma.expense.findMany({
  include: {
    bills: true,       // Fetch related bills in one query
    submittedBy: true,
    trip: true,
  },
  where: { tripId },
});

// Use select to fetch only needed fields
const trips = await prisma.trip.findMany({
  select: {
    id: true,
    title: true,
    totalAmount: true,
  },
  where: { userId },
  take: 20,  // Pagination
  skip: 0,
});
```

### Redis Caching

```typescript
// src/lib/redis.ts
import { createClient } from 'redis';

const redis = createClient({
  url: process.env.REDIS_URL,
  password: process.env.REDIS_PASSWORD,
});

export const cache = {
  async get(key: string) {
    return redis.get(key);
  },
  
  async set(key: string, value: string, ttl: number = 3600) {
    return redis.setEx(key, ttl, value);
  },
  
  async delete(key: string) {
    return redis.del(key);
  },
};
```

---

## Monitoring & Alerts

### Sentry Integration

```typescript
// src/instrumentation.node.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT,
  tracesSampleRate: 0.1,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Postgres(),
  ],
  beforeSend(event) {
    // Filter out 404 errors
    if (event.exception) {
      const error = event.exception.values?.[0];
      if (error?.value?.includes('404')) {
        return null;
      }
    }
    return event;
  },
});
```

### Custom Alerts

**Alert Conditions**:
- Error rate > 5% in last hour
- Database query time > 5 seconds
- Failed deployments
- High memory usage (> 80%)
- File upload failures
- Authentication failures (> 10 in 5 minutes)

**Webhook Notifications**:
```typescript
// Send alerts to Slack
async function sendAlert(message: string, severity: 'critical' | 'warning' | 'info') {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  
  await fetch(webhookUrl, {
    method: 'POST',
    body: JSON.stringify({
      text: message,
      attachments: [{
        color: severity === 'critical' ? 'danger' : 'warning',
        fields: [{
          title: 'Severity',
          value: severity,
          short: true,
        }],
      }],
    }),
  });
}
```

---

## Backup & Recovery

### Database Backup

```bash
#!/bin/bash
# scripts/backup-and-push.sh

BACKUP_FILE="reimbursify_$(date +%Y%m%d_%H%M%S).sql.gz"
pg_dump -U reimbursify_user reimbursify | gzip > "/tmp/$BACKUP_FILE"

# Push to S3
aws s3 cp "/tmp/$BACKUP_FILE" "s3://reimbursify-backups/$BACKUP_FILE"

# Keep local copy for 7 days
find /tmp -name "reimbursify_*.sql.gz" -mtime +7 -delete
```

### Application Rollback

```bash
# Using git tags
git tag -a v1.0.0 -m "Production release 1.0.0"
git push origin v1.0.0

# Rollback if needed
git checkout v1.0.0
npm run build
npm start
```

---

## Security Hardening

### DDoS Protection

- Enable Cloudflare or AWS Shield
- Configure rate limiting (100 req/min per IP)
- Implement request throttling in API routes

### SQL Injection Prevention

Prisma handles this automatically via parameterized queries. Never use string interpolation in queries.

### CSRF Protection

```typescript
// Automatically handled by NextAuth
// Verify CSRF token on POST/PATCH/DELETE requests
```

### Password Security

```typescript
import bcrypt from 'bcryptjs';

export async function hashPassword(password: string) {
  const rounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
  return bcrypt.hash(password, rounds);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}
```

---

## Compliance Configuration

### Data Retention Policy

```typescript
// Archive submissions after 7 years
// Delete personally identifiable info after retention period
// Backup retention: 30 days online, 365 days cold storage
```

### Audit Logging

```typescript
// Log all administrative actions
model AuditLog {
  id        String   @id @default(cuid())
  userId    String
  action    String   // e.g., "CREATED_SUBMISSION"
  entityId  String
  entityType String  // "Submission", "Expense", etc.
  changes   Json     // What changed
  createdAt DateTime @default(now())
}
```

### GDPR Compliance

- [ ] Implement data export functionality
- [ ] Implement data deletion (right to be forgotten)
- [ ] Document data processing activities
- [ ] Ensure data transfers are encrypted
- [ ] Regular privacy audits

---

## Final Checklist

- [ ] All environment variables configured
- [ ] Database optimized and indexed
- [ ] Email service tested
- [ ] S3 bucket created and secured
- [ ] Monitoring and alerts configured
- [ ] Automated backups running
- [ ] Security headers in place
- [ ] Rate limiting enabled
- [ ] HTTPS/SSL configured
- [ ] Error tracking (Sentry) active
- [ ] Admin dashboard configured
- [ ] Load testing completed
- [ ] Documentation updated
- [ ] Team trained on runbooks
- [ ] Incident response plan created

---

## Support & Escalation

**For Issues**:
1. Check logs: `docker logs reimbursify-app`
2. Check Sentry: https://sentry.io/organizations/
3. Read runbooks in `/docs/runbooks/`
4. Contact: devops@example.com

**Emergency Contacts**:
- DevOps Lead: +1-XXX-XXX-XXXX
- Database Admin: +1-XXX-XXX-XXXX
- Security Team: security@example.com
