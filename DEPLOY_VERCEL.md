# Vercel Deployment Notes

This project has been adapted for a single Vercel deployment:

- `frontend` builds to static files
- `api/[...all].ts` forwards `/api/*` requests to the Express app
- the backend uses `/tmp/calcmaster.db` on Vercel unless `DB_PATH` is set

## Before deploying

1. Push this project to GitHub.
2. Import the repository into Vercel.
3. Keep the project root as the repository root.

## Recommended environment variables

Set these in the Vercel dashboard:

- `NODE_ENV=production`
- `JWT_SECRET=your-secret`
- `JWT_REFRESH_SECRET=your-refresh-secret`
- `CORS_ORIGIN=https://your-project-name.vercel.app`
- `VITE_API_BASE_URL=/api/v1`

Optional:

- `DB_PATH=/tmp/calcmaster.db`
- `REDIS_HOST=...`
- `REDIS_PORT=...`
- `REDIS_PASSWORD=...`

## What to expect

- Static pages and API routes deploy together in one Vercel project.
- SQLite on Vercel is only suitable for demos or coursework.
- Redis is optional in this codebase because it falls back to an in-memory store if Redis is unavailable.

## Local build commands

```bash
npm run build --prefix backend
npm run build --prefix frontend
```
