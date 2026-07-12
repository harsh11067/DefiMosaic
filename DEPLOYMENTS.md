# 🚀 Deployments

DeFi Mosaic ships to three targets from one repo (`main` branch auto-deploys where supported).

| Target | URL | Role | Auto-deploy |
|---|---|---|---|
| ▲ **Vercel** | https://defi-mosaic-kharsh-projects.vercel.app | Primary frontend + API routes | ✅ on push to `main` |
| 🎨 **Render** | https://defimosaic.onrender.com | Backend web service (full Next server) | ✅ on push to `main` |
| ☁️ **AWS (EC2 + CloudFront)** | https://d2oynp5hsg4w3r.cloudfront.net | Self-hosted edge deployment | manual (see below) |

## Vercel
- Project `defi-mosaic` (team `kharsh-projects`), GitHub-linked, root dir `web/`.
- Public config ships in `web/.env.production` (Supabase URL + anon key — public by design).
- Secrets (`SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`) → Vercel dashboard env vars.

## Render
- Web service `defimosaic` (`srv-d9a17rreo5us7399qphg`), region Singapore, plan free.
- Root dir `web`, build `npm install && npm run build`, start `npm start`.
- Env vars set via API: Supabase URL/anon/service-role, `OPENAI_API_KEY`, `NODE_VERSION=20.11.0`.
- Free tier sleeps after idle — first request takes ~30s to wake.

## AWS Free Tier (ap-south-1)
Only free-tier services; no NAT/RDS/ElastiCache/OpenSearch.

| Resource | ID / Name |
|---|---|
| EC2 (t3.micro) | `i-02c2c28eeb896e975` — Amazon Linux 2023, 2 GB swap, systemd service `defimosaic` |
| Elastic IP | `13.203.245.74` (free while attached) |
| Security group | `defimosaic-sg` (80, 3000, 22) |
| S3 (public assets) | `defimosaic-assets-912392206182` |
| CloudFront | `E1AEBLNJODS201` → `d2oynp5hsg4w3r.cloudfront.net` (HTTPS edge → EC2 origin) |
| CloudWatch | alarm `defimosaic-cpu-high` (CPU > 85%) |
| SSH key | `defimosaic-key.pem` (local only, gitignored) |

**Redeploy on EC2** (artifact deploy — t3.micro can't build Next itself):
```bash
# locally
cd web && BUILD_STANDALONE=1 npm run build
cp -r .next/static .next/standalone/OneDrive/Desktop/DefiMosaic/web/.next/static
cp -r public       .next/standalone/OneDrive/Desktop/DefiMosaic/web/public
cd .next/standalone && tar czf /tmp/defimosaic-standalone.tar.gz .
scp -i defimosaic-key.pem /tmp/defimosaic-standalone.tar.gz ec2-user@13.203.245.74:/tmp/
ssh -i defimosaic-key.pem ec2-user@13.203.245.74 "sudo bash -c 'cd /opt/defimosaic-app && tar xzf /tmp/defimosaic-standalone.tar.gz && systemctl restart defimosaic'"
```
App runs as systemd service `defimosaic` (standalone `server.js`, port 3000, port 80 via iptables redirect).

## Supabase (project `ghpgpvfkjjhcpotcvhli`)
- Auth: **Google + email enabled**. Storage + Realtime healthy.
- ⚠️ One-time: run [`web/supabase_migration.sql`](web/supabase_migration.sql) in the SQL editor
  (creates `strategy_messages` + `arena_chat`; chat runs on the in-memory engine until then).
- ⚠️ Add the deployed URLs to Auth → URL Configuration → Redirect URLs so Google
  sign-in returns to production instead of localhost.
