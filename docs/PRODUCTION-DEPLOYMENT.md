# SellerSalt Production Deployment Guide

**Authoritative Specification: Production Infrastructure, Database Migrations, Connection Pooling, Health Routing, Private Beta & Rollback Procedures**  
**Version:** 1.0 (Batch 31)  
**Status:** Canonical & Production Verified  

---

## 1. Executive Summary

This guide outlines the production deployment procedure for SellerSalt. The application is built on **Next.js 14 (App Router)**, **TypeScript**, **PostgreSQL (Prisma ORM)**, and **Redis (BullMQ)**. It supports standard containerized and cloud platforms (Coolify, Docker, AWS ECS, GCP Cloud Run, Railway, Vercel).

---

## 2. Infrastructure Requirements

| Component | Specification | Production Recommendation |
|---|---|---|
| **Runtime** | Node.js 18.x or 20.x LTS | Standalone container / Linux x86_64 |
| **Web Server** | Next.js 14 App Router | Standalone build (`npm run build` $\to$ `npm run start`) |
| **Primary Database** | PostgreSQL 15+ | AWS RDS / Supabase / Neon with automated daily backups |
| **Connection Pooler** | PgBouncer / Prisma Client Pool | Max connection pool limit: 20–50 |
| **Queue / Cache** | Redis 7+ | Upstash / Redis Cloud / AWS ElastiCache |
| **SSL / HTTPS** | TLS 1.3 | Terminated at Reverse Proxy / Cloudflare / ALB |

---

## 3. Database Migration Deployment Procedure

Prisma migrations must be executed safely prior to application boot during deployment pipelines:

```bash
# 1. Validate Prisma schema integrity
npx prisma validate

# 2. Apply pending production database migrations
npx prisma migrate deploy

# 3. Build optimized Next.js production bundle
npx next build

# 4. Start production web server
npm run start
```

---

## 4. Health Probe & Load Balancer Routing

Configure your load balancer (ALB, Traefik, Nginx, Coolify) health check probes as follows:

| Endpoint | Probe Type | Purpose | Expected Status |
|---|---|---|---|
| `GET /api/health/live` | **Liveness** | Verifies process responsiveness; fails only on unhandled crash | HTTP `200 OK` |
| `GET /api/health/ready` | **Readiness** | Verifies PostgreSQL connectivity and core schema queries | HTTP `200 OK` (or `503` if DB down) |

---

## 5. Private Beta Activation

To restrict access during closed beta operations:
1. Set `PRIVATE_BETA_MODE="true"` in your environment variables.
2. Define comma-separated invitation codes in `BETA_INVITE_CODES="SALT-BETA-2026,EARLY-FOUNDER"`.
3. Uninvited users attempting signup/login will be prompted for a valid beta invite code.
4. Admins listed in `ADMIN_EMAILS` automatically bypass beta restrictions.

---

## 6. Rollback & Disaster Recovery Runbook

If a critical incident occurs post-deployment:
1. **Application Rollback:** Revert git deployment to the previous stable release tag (`git checkout tags/<tag>`).
2. **Database Point-in-Time Recovery:** Restore database to pre-migration snapshot via cloud provider console.
3. **Stale Run Recovery:** Trigger `GET /api/admin/diagnostics?recoverStale=true` to reset any jobs stuck in `RUNNING`.
