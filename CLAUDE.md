# TLC Models -- Project Context (CLAUDE.md)

> This file is the persistent memory for every Claude Code session working in this repository.
> It was initialized as Task 1.1 of the TLC Models Claude Code & GitHub Task Master List.

---

## Brand Identity: "Obsidian Sovereign" Design Philosophy

- **Background:** Obsidian black `oklch(0.06 0.01 280)`
- **Primary Accent:** Gold `#D9B88C`
- **Panel Style:** Liquid glass panels with frosted-glass blur (`backdrop-filter: blur(16px)`)
- **Strict Rule:** NO emojis anywhere in the codebase. Use SVG icons only (see `client/src/components/Icons.tsx`).
- **Headline Font:** Playfair Display SC (Google Fonts)
- **Body Font:** DM Sans (Google Fonts)
- **Font Import:**
  ```html
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display+SC:wght@400;700;900&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
  ```

---

## Technology Stack

| Layer            | Technology                              |
|------------------|-----------------------------------------|
| Frontend         | React 18, TypeScript, Tailwind CSS, Vite |
| CMS              | Webflow (Data API v2)                   |
| Automation       | n8n Cloud (`anthonyt.app.n8n.cloud`)    |
| Cloud            | AWS (Bedrock, Rekognition, S3, SES, Cognito, CloudFront) |
| CDN / DNS        | Cloudflare                              |
| CRM              | HubSpot (Starter)                       |
| Talent Database  | Airtable (Pro), Syngency API            |
| Chat             | Tidio (Lyro AI)                         |
| Forms            | Formspree (Gold)                        |
| Booking          | Calendly (Standard)                     |
| Analytics        | Google Analytics 4, Google Tag Manager  |
| Ads / Retargeting| Meta Pixel, Meta Ads, Google Ads        |
| Email            | SendGrid, Amazon SES                    |
| SMS              | Twilio                                  |

---

## Domain Structure

| Domain                      | Purpose                          |
|-----------------------------|----------------------------------|
| `www.tlcmodels.com`         | Main Webflow site                |
| `f1.tlcmodels.com`          | F1 event landing page (Cloudflare) |
| `fifa2026.tlcmodels.com`    | FIFA event landing page (Cloudflare) |
| `lasvegas.tlcmodels.com`    | Las Vegas landing page (Cloudflare) |

---

## Build & Dev Commands

```bash
# Development
npm run dev          # Start Vite dev server
npm run lint         # ESLint check
npx tsc --noEmit     # TypeScript type check (zero errors required)
npm test             # Run test suite
npm run build        # Production build

# Deployment (use the /deploy skill)
# The deploy skill enforces: lint -> tsc -> test -> git push
```

---

## Coding Standards

1. **TypeScript strict mode** -- `"strict": true` in `tsconfig.json`. Zero `any` types.
2. **Tailwind CSS** -- All styling via Tailwind utility classes. No raw CSS files unless for design tokens.
3. **SVG icons only** -- All icons live in `client/src/components/Icons.tsx`. No emoji. No icon font libraries.
4. **Image optimization** -- All images: WebP format, 1920x1080px max, under 500kb, `loading="lazy"` (except nav logo which uses `loading="eager"`).
5. **Alt text formula** -- `[Brand] [Staff Role] -- [Event Name] [Service Category] [City]`
6. **SEO-friendly filenames** -- Kebab-case: `tlc-models-f1-promotional-hostess-miami.webp`
7. **GA4 event tracking** -- All form submissions fire `generate_lead`. All Calendly links fire `schedule_call`.
8. **No hardcoded secrets** -- All API keys, Pixel IDs, and widget keys must come from environment variables or be clearly marked as `YOUR_*` placeholders.

---

## Repository Structure

```
tlc-models/
  .claude/
    skills/deploy/SKILL.md    # Deployment checklist skill (Task 1.3)
    skills/qa/SKILL.md        # QA audit skill (Task 1.4)
    agents/qa-agent.md        # @QAAgent subagent config
  .github/
    workflows/ci.yml          # CI/CD pipeline (Task 1.5)
  client/
    public/                   # Static assets (sitemap.xml, robots.txt)
    src/
      components/Icons.tsx    # SVG icon library (Task 7.4)
  mcp-servers/
    github_mcp.py             # GitHub Issues MCP server (Task 1.2)
  scripts/                    # Utility scripts (Syngency sync, etc.)
  CLAUDE.md                   # This file
```

---

## Active Placeholder IDs (Must Be Replaced)

These placeholders exist across landing pages and must be replaced with real values:

| Credential / Placeholder   | Service         | Value / Status                                  |
|----------------------------|-----------------|-------------------------------------------------|
| Tidio Key                  | Tidio           | `ldaaed9wpuayclkmydwfcomhlqxgfqzz` (LIVE)      |
| GA4 (Las Vegas)            | Google Analytics| `G-0T937F6M3H` (LIVE)                           |
| GA4 (F1 + FIFA)            | Google Analytics| `G-5215213387` (LIVE)                            |
| Formspree (SEMA)           | Formspree       | `meernvvb` (LIVE)                                |
| Formspree (F1)             | Formspree       | `FORMSPREE_F1_ID` -- NEEDS REPLACEMENT          |
| Formspree (Las Vegas)      | Formspree       | `FORMSPREE_LV_ID` -- NEEDS REPLACEMENT          |
| Formspree (FIFA)           | Formspree       | `FORMSPREE_FIFA_ID` -- NEEDS REPLACEMENT         |
| Calendly (General)         | Calendly        | `calendly.com/tlcmodels-info/tlc-talent-consultation` (LIVE) |
| Calendly (F1)              | Calendly        | `calendly.com/tlcmodels-info/f1-staffing-consultation` (LIVE) |
| Calendly (FIFA)            | Calendly        | `calendly.com/tlcmodels-info/fifa-2026-discovery-call` (LIVE) |
| Calendly (Las Vegas)       | Calendly        | `calendly.com/tlcmodels-info/las-vegas-corporate-staffing` (LIVE) |
| `GTM-XXXXXXX`             | Google Tag Manager | NEEDS REPLACEMENT -- create at tagmanager.google.com |
| `YOUR_META_PIXEL_ID`      | Meta Business   | NEEDS REPLACEMENT -- create at business.facebook.com |

---

## GitHub Labels

All issues must use the label taxonomy defined in the Task Master List:
`setup`, `claude-code`, `critical`, `mcp`, `infrastructure`, `ci-cd`, `skills`,
`qa`, `subagents`, `landing-pages`, `tidio`, `formspree`, `calendly`, `gtm`,
`analytics`, `meta-pixel`, `ads`, `webflow`, `syngency`, `api-integration`,
`homepage`, `personalization`, `javascript`, `n8n`, `booking-engine`,
`lead-routing`, `proposals`, `outreach`, `seo`, `programmatic`, `talent-management`,
`marketing`, `aws`, `bedrock`, `ai-agent`, `rekognition`, `lambda`, `s3`, `cloudfront`,
`ses`, `email`, `cognito`, `auth`, `frontend`, `icons`, `design`, `responsive`,
`mobile`, `deliverables`, `pdf`, `high`, `medium`, `medium-high`
