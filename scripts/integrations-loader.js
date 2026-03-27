/**
 * TLC Models - Universal Integration Loader
 * Phase 2: Third-Party Integration Layer
 *
 * Drop this single script tag into any TLC Models landing page to inject:
 *   - Tidio Live Chat Widget
 *   - Google Tag Manager (GTM)
 *   - Meta (Facebook) Pixel
 *   - Standard event listeners (PageView, Lead, Schedule)
 *
 * Usage:
 *   <script src="/scripts/integrations-loader.js"></script>
 *
 * Configuration is set via constants below. Replace placeholders before deploying.
 *
 * Design Tokens:
 *   Gold:  #C9A84C
 *   Dark:  #0A0A0A
 *   Glass: rgba(255,255,255,0.05)
 */

(function () {
  'use strict';

  /* =========================================================================
   * CONFIGURATION - Replace placeholders before production deployment
   * ======================================================================= */

  var CONFIG = {
    tidioKey:      'ldaaed9wpuayclkmydwfcomhlqxgfqzz',
    gtmId:         'GTM-NGS336',           // Replace with your GTM container ID
    metaPixelId:   '2331056137634152',     // Replace with your Meta Pixel ID
    // Page-specific Calendly URLs (auto-detected by hostname)
    calendlySlugs: {
      'f1.tlcmodels.com':       'tlcmodels-info/f1-staffing-consultation',
      'fifa2026.tlcmodels.com': 'tlcmodels-info/fifa-2026-discovery-call',
      'lasvegas.tlcmodels.com': 'tlcmodels-info/las-vegas-corporate-staffing',
      'default':                'tlcmodels-info/tlc-talent-consultation'
    },
    calendlySlug:  null // auto-set from calendlySlugs based on hostname
  };

  /* =========================================================================
   * UTILITY HELPERS
   * ======================================================================= */

  /** Safely push to dataLayer (creates it if missing). */
  function dlPush(obj) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(obj);
  }

  /** Insert a script element into <head>. */
  function injectScript(src, attrs) {
    var s = document.createElement('script');
    s.async = true;
    s.src = src;
    if (attrs) {
      Object.keys(attrs).forEach(function (k) { s.setAttribute(k, attrs[k]); });
    }
    document.head.appendChild(s);
  }

  /** Insert an inline script block into <head>. */
  function injectInlineScript(code) {
    var s = document.createElement('script');
    s.textContent = code;
    document.head.appendChild(s);
  }

  /* =========================================================================
   * 1. TIDIO LIVE CHAT
   * ======================================================================= */

  function initTidio() {
    injectScript('//code.tidio.co/' + CONFIG.tidioKey + '.js');

    // Fire dataLayer event when Tidio chat is opened
    document.addEventListener('tidio:open', function () {
      dlPush({ event: 'tidio_chat_open' });
    });
  }

  /* =========================================================================
   * 2. GOOGLE TAG MANAGER
   * ======================================================================= */

  function initGTM() {
    // dataLayer bootstrap
    dlPush({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });

    // GTM script
    injectScript(
      'https://www.googletagmanager.com/gtm.js?id=' + CONFIG.gtmId
    );

    // GTM noscript iframe (fallback for no-JS browsers)
    var noscript = document.createElement('noscript');
    var iframe = document.createElement('iframe');
    iframe.src = 'https://www.googletagmanager.com/ns.html?id=' + CONFIG.gtmId;
    iframe.height = '0';
    iframe.width = '0';
    iframe.style.display = 'none';
    iframe.style.visibility = 'hidden';
    noscript.appendChild(iframe);
    document.body.insertBefore(noscript, document.body.firstChild);
  }

  /* =========================================================================
   * 3. META (FACEBOOK) PIXEL
   * ======================================================================= */

  function initMetaPixel() {
    // Standard Meta Pixel base code
    injectInlineScript(
      "!function(f,b,e,v,n,t,s)" +
      "{if(f.fbq)return;n=f.fbq=function(){n.callMethod?" +
      "n.callMethod.apply(n,arguments):n.queue.push(arguments)};" +
      "if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';" +
      "n.queue=[];t=b.createElement(e);t.async=!0;" +
      "t.src=v;s=b.getElementsByTagName(e)[0];" +
      "s.parentNode.insertBefore(t,s)}(window,document,'script'," +
      "'https://connect.facebook.net/en_US/fbevents.js');" +
      "fbq('init','" + CONFIG.metaPixelId + "');" +
      "fbq('track','PageView');"
    );

    // Noscript fallback pixel
    var ns = document.createElement('noscript');
    var img = document.createElement('img');
    img.height = '1';
    img.width = '1';
    img.style.display = 'none';
    img.src = 'https://www.facebook.com/tr?id=' + CONFIG.metaPixelId +
              '&ev=PageView&noscript=1';
    ns.appendChild(img);
    document.body.appendChild(ns);
  }

  /* =========================================================================
   * 4. STANDARD EVENT LISTENERS
   * ======================================================================= */

  function initEventListeners() {

    /* --- PageView (fires immediately) --- */
    dlPush({ event: 'page_view', page_path: window.location.pathname });

    /* --- Lead: Form Submission --- */
    document.addEventListener('submit', function (e) {
      var form = e.target;
      if (!form || form.tagName !== 'FORM') return;

      // Push to dataLayer
      dlPush({
        event:     'form_submit',
        form_id:   form.id || form.getAttribute('data-form-id') || 'unknown',
        form_name: form.getAttribute('data-form-name') || form.id || 'lead_form'
      });

      // GA4 generate_lead via gtag (if available)
      if (typeof gtag === 'function') {
        gtag('event', 'generate_lead', {
          event_category: 'engagement',
          event_label:    form.id || 'lead_form'
        });
      }

      // Meta Pixel Lead event
      if (typeof fbq === 'function') {
        fbq('track', 'Lead');
      }
    }, true); // useCapture to catch before preventDefault

    /* --- Schedule: Calendly Link Click --- */
    document.addEventListener('click', function (e) {
      var target = e.target.closest ? e.target.closest('a') : null;
      if (!target) return;

      var href = target.getAttribute('href') || '';
      if (href.indexOf('calendly.com') !== -1 ||
          href.indexOf(CONFIG.calendlySlug) !== -1) {

        dlPush({
          event:     'calendly_click',
          link_url:  href
        });

        if (typeof gtag === 'function') {
          gtag('event', 'schedule_call', {
            event_category: 'engagement',
            event_label:    href
          });
        }

        if (typeof fbq === 'function') {
          fbq('track', 'Schedule');
        }
      }
    }, false);

    /* --- CTA Click Tracking --- */
    document.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('[data-cta]') : null;
      if (!btn) return;

      dlPush({
        event:     'cta_click',
        cta_name:  btn.getAttribute('data-cta') || 'unknown',
        cta_text:  btn.textContent.trim().substring(0, 100)
      });
    }, false);

    /* --- Contact Click (phone / email) --- */
    document.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a') : null;
      if (!a) return;
      var href = a.getAttribute('href') || '';
      if (href.indexOf('tel:') === 0 || href.indexOf('mailto:') === 0) {
        dlPush({ event: 'contact_click', contact_method: href.split(':')[0], contact_value: href });
        if (typeof fbq === 'function') {
          fbq('track', 'Contact');
        }
      }
    }, false);
  }

  /* =========================================================================
   * 5. BOOTSTRAP - Run all injectors after DOM is ready
   * ======================================================================= */

  function bootstrap() {
    // Auto-detect Calendly slug based on hostname
    CONFIG.calendlySlug = CONFIG.calendlySlugs[window.location.hostname] || CONFIG.calendlySlugs['default'];

    initGTM();
    initMetaPixel();
    initTidio();
    initEventListeners();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }

})();
