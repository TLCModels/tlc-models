---
name: qa-audit
description: Full mobile audit and quality checklist for all TLC Models pages
trigger: When the user asks to run QA, audit, or quality check on any page
---

# QA Audit Skill -- Mobile & Quality Checklist

Run this complete checklist against all TLC Models pages before any paid advertising
campaign launch or client-facing delivery.

## 1. TypeScript & Build Health

```bash
npx tsc --noEmit        # Must return zero errors
npm run lint             # Must return zero warnings/errors
npm run build            # Must complete without errors
```

## 2. Browser Console Check
- Open each page in Chrome DevTools
- **Requirement:** Zero console errors (warnings are acceptable but should be reviewed)

## 3. Image Optimization Audit
For every `<img>` tag on every page:
- [ ] Has `loading="lazy"` attribute (EXCEPT the nav logo which must use `loading="eager"`)
- [ ] Has keyword-rich `alt` text following the formula: `[Brand] [Staff Role] -- [Event Name] [Service Category] [City]`
- [ ] Image format is WebP
- [ ] Image file size is under 500kb
- [ ] Image dimensions do not exceed 1920x1080px
- [ ] Filename is SEO-friendly kebab-case (e.g., `tlc-models-f1-grid-girl-miami.webp`)

## 4. Analytics & Tracking Verification
- [ ] GA4 `gtag.js` is the FIRST script in `<head>` on all pages
- [ ] Google Tag Manager `<head>` snippet present on all pages
- [ ] Google Tag Manager `<noscript>` snippet present immediately after `<body>` on all pages
- [ ] Meta Pixel base code present on all pages
- [ ] Meta Pixel fires `PageView` event on every page load
- [ ] Meta Pixel fires `Lead` event on form submission
- [ ] Meta Pixel fires `Schedule` event on Calendly link click

## 5. Form Validation
For every `<form>` on every page:
- [ ] Form `action` points to a valid Formspree endpoint (not `YOUR_FORM_ID`)
- [ ] All required fields present: Name, Company, Email, Phone, Event Type, Event Date, City, Talent Needed, Budget Range, Message
- [ ] Successful submission fires GA4 `generate_lead` event via `window.gtag('event', 'generate_lead', ...)`
- [ ] Form shows user-friendly success/error messages

## 6. Calendly Integration
- [ ] Calendly embed script present on all pages
- [ ] Every Calendly link includes `onClick` handler firing GA4 `schedule_call` event
- [ ] Booking link format: `https://calendly.com/[handle]/talent-consultation`
- [ ] Calendly widget loads and displays correctly on mobile

## 7. Tidio Chat Widget
- [ ] Tidio script present in `<head>` on all three landing pages
- [ ] No placeholder `YOUR_TIDIO_KEY` in any page source
- [ ] Lyro AI persona configured with the TLC booking concierge prompt
- [ ] Chat widget is visible and functional on mobile

## 8. SEO Audit
- [ ] `<title>` tag present and under 60 characters
- [ ] `<meta name="description">` present and under 160 characters
- [ ] `<meta name="keywords">` present
- [ ] `<meta name="robots" content="index, follow">` present
- [ ] `<link rel="canonical">` present with correct URL
- [ ] Open Graph tags: `og:title`, `og:description`, `og:image`, `og:url`, `og:type`
- [ ] Twitter Card tags: `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`
- [ ] JSON-LD schemas present: `Organization`, `WebSite` + `SearchAction`, `BreadcrumbList`, `FAQPage`
- [ ] `sitemap.xml` exists at `/sitemap.xml` with `<lastmod>`, `<changefreq>`, `<priority>`, and `<image:image>` blocks
- [ ] `robots.txt` exists at `/robots.txt` and references the sitemap URL

## 9. Responsive Breakpoints
- [ ] Stats grid: `grid-template-columns: repeat(auto-fit, minmax(140px, 1fr))`
- [ ] Service cards: `grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr))`
- [ ] "Why TLC" split layout stacks vertically below 768px
- [ ] Testimonial carousel shows single card on mobile
- [ ] Navigation collapses to hamburger menu on mobile
- [ ] All text remains readable (minimum 16px body text on mobile)
- [ ] No horizontal scroll on any viewport width

## 10. Placeholder Audit
Search all page source for these strings -- NONE should remain in production:
- `YOUR_TIDIO_KEY`
- `YOUR_META_PIXEL_ID`
- `YOUR_FORM_ID`
- `YOUR_GA_MEASUREMENT_ID`
- `YOUR_GTM_CONTAINER_ID`
- `YOUR_CALENDLY_HANDLE`

## Reporting
After running this audit, produce a summary table:

| Category          | Status | Issues Found |
|-------------------|--------|--------------|
| TypeScript/Build  |        |              |
| Console Errors    |        |              |
| Images            |        |              |
| Analytics         |        |              |
| Forms             |        |              |
| Calendly          |        |              |
| Tidio             |        |              |
| SEO               |        |              |
| Responsive        |        |              |
| Placeholders      |        |              |
