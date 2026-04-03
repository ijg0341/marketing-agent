# Mac Mini Server Setup Guide

## Prerequisites
- macOS with Docker Desktop installed
- Git
- Claude Code CLI (for scheduled tasks)

## 1. Clone & Configure

```bash
git clone https://github.com/ijg0341/marketing-agent.git
cd marketing-agent

# Create .env from template
cp .env.example .env
```

Edit `.env` with your API keys:
```
# Twitter/X — https://developer.x.com/en/portal
TWITTER_API_KEY=your_key
TWITTER_API_SECRET=your_secret
TWITTER_ACCESS_TOKEN=your_token
TWITTER_ACCESS_SECRET=your_token_secret
TWITTER_BEARER_TOKEN=your_bearer

# Instagram — https://developers.facebook.com (Business Account required)
INSTAGRAM_ACCESS_TOKEN=your_token
INSTAGRAM_BUSINESS_ACCOUNT_ID=your_id

# Facebook — https://developers.facebook.com (Page Access Token)
FACEBOOK_PAGE_ACCESS_TOKEN=your_token
FACEBOOK_PAGE_ID=your_page_id

# WordPress — Settings > App Passwords
WORDPRESS_URL=https://your-blog.com
WORDPRESS_USERNAME=admin
WORDPRESS_APP_PASSWORD=xxxx xxxx xxxx xxxx

# SendGrid — https://app.sendgrid.com/settings/api_keys
SENDGRID_API_KEY=SG.xxxx
SENDGRID_FROM_EMAIL=marketing@yourdomain.com
```

## 2. Enable Channels

Edit `config/channels.yaml` — set `enabled: true` for channels you have API keys for.

## 3. Set Product Info

Edit `config/agent.yaml` with your product details, brand voice, and target audience.

## 4. Start with Docker

```bash
docker compose up -d
```

Verify:
```bash
curl http://localhost:8000/api/health
# {"status":"ok","service":"marketing-agent"}

# Check Swagger UI
open http://localhost:8000/docs
```

## 5. Setup Claude Code Scheduled Tasks

Install Claude Code on the Mac Mini, then run from the project directory:

```bash
cd marketing-agent
claude
```

The scheduled tasks are already defined in `scheduled_tasks/` — Claude Code will pick them up. Run each one manually first to pre-approve tool permissions:

- Sidebar > Scheduled > marketing-daily-analysis > Run now
- Sidebar > Scheduled > marketing-content-planning > Run now
- (repeat for all 5 tasks)

## 6. Keep Running After Reboot

Docker Desktop has "Start Docker Desktop when you sign in" option. Enable it.
The `restart: unless-stopped` policy in docker-compose.yml ensures the container auto-restarts.

For Claude Code scheduled tasks to persist, keep a Claude Code session running:
```bash
# Run in a tmux/screen session
tmux new -s claude
cd ~/marketing-agent
claude
# Detach with Ctrl+B, D
```

## Updating

```bash
cd marketing-agent
git pull
docker compose up -d --build
```

## Monitoring

```bash
# Server logs
docker compose logs -f

# Check health
curl http://localhost:8000/api/health

# View today's report
cat reports/daily_$(date +%Y-%m-%d).md

# Check evolution history
curl http://localhost:8000/api/strategy/evolution
```
