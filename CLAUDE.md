# TLC Models — Project Context (CLAUDE.md)

> This file is the persistent memory for every Claude Code / Manus session working in this repository.
> Last updated: April 6, 2026. **Read this file in full before executing any task.**

---

## CRITICAL: Project Phase Roadmap

TLC Models operates on a **three-phase architecture migration plan**. Every task must be executed within the correct phase. Do not build for a future phase unless explicitly instructed.

### Phase 1 — Manus-Hosted Landing Pages + Google Ads (CURRENT)

**Status: Active — in progress**

The three event landing pages (F1, FIFA 2026, Las Vegas) are **Manus-hosted React apps** deployed via Manus's internal hosting infrastructure. This is the current production environment.

- **Hosting:** Manus (React + Vite, deployed via Manus space system)
- **DNS:** Cloudflare CNAME records pointing subdomains to Manus-hosted URLs
- **Deployment:** Changes are made directly to the Manus space, NOT via Cloudflare Pages or Vercel
- **Ads:** Google Ads campaigns running against these Manus-hosted URLs
- **Purpose:** Capture leads immediately while the permanent Webflow build is completed

**Subdomains and Manus Space IDs:**

| Domain | Manus Space ID | Purpose |
|---|---|---|
| `f1.tlcmodels.com` | `drYSyL6gTpYKiDW3jaTGjs` | F1 Grand Prix staffing |
| `fifa2026.tlcmodels.com` | `BPRT9YhRh7AcCBfYPqPBNt` | FIFA 2026 staffing |
| `lasvegas.tlcmodels.com` | `TZYdJwL6CTjZ8uDmdjyPc4` | Las Vegas corporate staffing |

**Phase 1 Checklist (must be complete before running ads):**
- [ ] All Formspree endpoints verified and returning HTTP 200 on submission
- [ ] Meta Pixel `fbq('track', 'Lead')` event fires on every successful form submission
- [ ] `gtag('event', 'generate_lead')` fires only on successful form submission (not on error)
- [ ] No competitor branding in any image (Aurum Event Staffing, Premier Staffing Collective, etc.)
- [ ] No duplicate Meta Pixel code blocks on any page
- [ ] No placeholder text (`YOUR_META_PIXEL_ID`, `YOUR_TIDIO_KEY`) in any page source
- [ ] F1 OG image returns HTTP 200 (not 404)
- [ ] FIFA canonical tag is singular and points to `https://fifa2026.tlcmodels.com/`
- [ ] Calendly booking links present on all three pages
- [ ] Google Ads conversion actions linked to `generate_lead` GA4 events

---

### Phase 2 — n8n Automation Engine (NEXT)

**Status: Pending Phase 1 completion**

Build and activate all n8n workflows that automate lead routing, follow-up sequences, and CRM sync.

- Lead capture from Formspree → n8n → Klaviyo + email notification
- Calendly booking → n8n → CRM entry + confirmation email
- Talent inquiry routing by service type and event location
- Weekly performance report automation

---

### Phase 3 — Permanent Webflow Build + Syngency Backend (FINAL)

**Status: Pending Phase 2 completion**

Rebuild all pages permanently in Webflow with Syngency as the backend talent database.

- **Frontend:** Webflow CMS (Site ID: `69c2cce6f370e22554aa466e`)
- **Backend:** Syngency API (`tlcmodels.syngency.com`, Collection ID: `69c2da68be50ddcdcf84372f`)
- **Design:** All "Obsidian Sovereign" customizations applied through Webflow Designer
- **Backend functions:** All booking, talent filtering, and CRM logic through Syngency
- **DNS cutover:** Only after 100% QA pass — update Cloudflare DNS records from Manus-hosted URLs to Syngency/Webflow hosts

**CRITICAL DNS RULE:** Do NOT update DNS records from the current Manus-hosted subdomains until Phase 3 is fully QA-approved. The current `tlcmodels.com` main domain runs on Syngency hosting — the subdomains must not be pointed there until the Webflow build is complete.

---

## Brand Identity: "Obsidian Sovereign" Design System

- **Background:** Obsidian black `#0A0A0A` / `oklch(0.06 0.01 280)`
- **Primary Accent:** Warm gold `#C9A84C`
- **Secondary Accent:** Rose-gold `#C4956A`
- **Gold Hover:** `#d4b85e`
- **Panel Style:** Liquid glass — `backdrop-filter: blur(20px); background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px`
- **Headline Font:** Playfair Display SC (Google Fonts), weights 700/900
- **Body Font:** DM Sans (Google Fonts), weights 400/500/700
- **Strict Rule:** NO emojis anywhere. Use SVG icons only (`client/src/components/Icons.tsx`).
- **Font Import:**
  ```html
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display+SC:wght@400;700;900&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
  ```

---

## Technology Stack

| Layer | Technology | Notes |
|---|---|---|
| Landing Pages (Phase 1) | React 18, TypeScript, Tailwind CSS, Vite | Manus-hosted |
| CMS (Phase 3) | Webflow Data API v2 | Site ID: `69c2cce6f370e22554aa466e` |
| Talent Backend (Phase 3) | Syngency | `tlcmodels.syngency.com` |
| Automation | n8n Cloud | `anthonyt.app.n8n.cloud` |
| Cloud | AWS | S3, CloudFront, SES, Lambda |
| CDN / DNS | Cloudflare | Domain: `tlcmodels.com` |
| Chat | Tidio (Lyro AI) | Key: `ldaaed9wpuayclkmydwfcomhlqxgfqzz` |
| Forms | Formspree | Per-page IDs below |
| Booking | Calendly | Handle: `tlcmodels-info` |
| Analytics | GA4 + GTM | GTM: `GTM-NGS336` |
| Ads | Meta Pixel + Google Ads | Pixel: `2331056137634152` |
| Email | Klaviyo | 3,161 contacts |
| GitHub | TLCModels org | Repos: `tlc-models`, `tlc-syngency-sync` |

---

## Domain & Hosting Map

| Domain | Current Host | Phase 1 Space ID | Phase 3 Target |
|---|---|---|---|
| `www.tlcmodels.com` | Syngency | N/A | Webflow (stays) |
| `f1.tlcmodels.com` | **Manus** | `drYSyL6gTpYKiDW3jaTGjs` | Webflow (Phase 3) |
| `fifa2026.tlcmodels.com` | **Manus** | `BPRT9YhRh7AcCBfYPqPBNt` | Webflow (Phase 3) |
| `lasvegas.tlcmodels.com` | **Manus** | `TZYdJwL6CTjZ8uDmdjyPc4` | Webflow (Phase 3) |

---

## Live Credentials & Integration IDs

| Credential | Value | Used On |
|---|---|---|
| Tidio Key | `ldaaed9wpuayclkmydwfcomhlqxgfqzz` | All 4 sites |
| GTM Container | `GTM-NGS336` | All 4 sites |
| Meta Pixel | `2331056137634152` | All 4 sites |
| GA4 (Las Vegas) | `G-0T937F6M3H` | `lasvegas.tlcmodels.com` |
| GA4 (F1 + FIFA) | `G-5215213387` | `f1.tlcmodels.com`, `fifa2026.tlcmodels.com` |
| Formspree (F1) | `xreyjrlq` | `f1.tlcmodels.com` |
| Formspree (FIFA) | `xjgajjjy` | `fifa2026.tlcmodels.com` |
| Formspree (Las Vegas) | `mbdzwpge` | `lasvegas.tlcmodels.com` |
| Formspree (SEMA/Main) | `meernvvb` | Main site |
| Calendly (General) | `tlcmodels-info/tlc-talent-consultation` | Main site |
| Calendly (F1) | `tlcmodels-info/f1-staffing-consultation` | F1 page |
| Calendly (FIFA) | `tlcmodels-info/fifa-2026-discovery-call` | FIFA page |
| Calendly (Las Vegas) | `tlcmodels-info/las-vegas-corporate-staffing` | Las Vegas page |
| Webflow Site ID | `69c2cce6f370e22554aa466e` | Phase 3 |
| Syngency Collection ID | `69c2da68be50ddcdcf84372f` | Phase 3 |

---

## Coding Standards

1. **TypeScript strict mode** — `"strict": true` in `tsconfig.json`. Zero `any` types.
2. **Tailwind CSS** — All styling via Tailwind utility classes. No raw CSS files unless for design tokens.
3. **SVG icons only** — All icons live in `client/src/components/Icons.tsx`. No emoji. No icon font libraries.
4. **Image standards** — WebP format, 1920×1080px max, under 500kb, `loading="lazy"` (except nav logo: `loading="eager"`). All images must be TLC-branded — zero competitor branding allowed.
5. **Alt text formula** — `[Brand] [Staff Role] — [Event Name] [Service Category] [City]`
6. **SEO filenames** — Kebab-case: `tlc-models-f1-promotional-hostess-miami.webp`
7. **GA4 tracking** — All form submissions fire `gtag('event', 'generate_lead')` **only on HTTP 200 success**. All Calendly links fire `gtag('event', 'calendly_button_click')`.
8. **Meta Pixel tracking** — All form submissions fire `fbq('track', 'Lead')` **only on HTTP 200 success**. Page views fire `fbq('track', 'PageView')` on load.
9. **No hardcoded secrets** — All API keys must come from environment variables. No `YOUR_*` placeholders in production code.
10. **No duplicate scripts** — Each tracking script (GTM, Meta Pixel, Tidio, GA4) must appear exactly once per page.

---

## Image Quality Rules

- **Zero competitor branding** — Before using any AI-generated or stock image, verify no competitor names, logos, or brand marks are visible. Known competitors to watch for: Aurum Event Staffing, Premier Staffing Collective, Elite Staffing, Viper Girls.
- **TLC branding preferred** — Use TLC Models logo/brand overlay on hero images where appropriate.
- **Realistic event photography style** — Dark, luxurious, gold-accented. No overly bright or generic stock photo aesthetics.

---

## Repository Structure

```
tlc-models/
  client/
    public/
      landing/           # Static HTML reference files (NOT the live pages)
    src/
      components/        # React components for Manus-hosted apps
        Icons.tsx        # SVG icon library
  scripts/               # Utility scripts (Syngency sync, n8n, etc.)
  CLAUDE.md              # This file — persistent project memory
```

**Note:** The `client/public/landing/` directory contains static HTML reference files. The **live production pages** are the Manus-hosted React apps identified by their Space IDs above. Changes to the live pages must be made through the Manus space system, not by editing the static HTML files.

---

## GitHub Labels

`setup`, `claude-code`, `critical`, `mcp`, `infrastructure`, `ci-cd`, `skills`,
`qa`, `landing-pages`, `tidio`, `formspree`, `calendly`, `gtm`,
`analytics`, `meta-pixel`, `ads`, `webflow`, `syngency`, `api-integration`,
`homepage`, `n8n`, `booking-engine`, `lead-routing`, `seo`, `talent-management`,
`marketing`, `aws`, `ai-agent`, `email`, `frontend`, `icons`, `design`,
`phase-1`, `phase-2`, `phase-3`, `manus-hosted`, `image-quality`
