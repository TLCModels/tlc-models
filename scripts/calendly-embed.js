/**
 * TLC Models - Calendly Widget Injection Script
 * Phase 2: Scheduling Integration
 *
 * Creates an inline Calendly embed widget styled to match the TLC luxury theme.
 * Fires GA4 schedule_call event on Calendly interaction.
 *
 * Usage:
 *   1. Add a container element: <div id="tlc-calendly"></div>
 *   2. Include this script:     <script src="/scripts/calendly-embed.js"></script>
 *
 * The script will automatically find the container and mount the Calendly widget.
 * You can also call TLCCalendly.init('#my-custom-container') manually.
 *
 * Design Tokens:
 *   Gold:  #C9A84C
 *   Dark:  #0A0A0A
 *   Glass: rgba(255,255,255,0.05)
 */

(function () {
  'use strict';

  /* =========================================================================
   * CONFIGURATION
   * ======================================================================= */

  var CONFIG = {
    // Page-specific Calendly URLs (auto-detected by hostname)
    calendlyUrls: {
      'f1.tlcmodels.com':          'https://calendly.com/tlcmodels-info/f1-staffing-consultation',
      'fifa2026.tlcmodels.com':    'https://calendly.com/tlcmodels-info/fifa-2026-discovery-call',
      'lasvegas.tlcmodels.com':    'https://calendly.com/tlcmodels-info/las-vegas-corporate-staffing',
      'default':                   'https://calendly.com/tlcmodels-info/tlc-talent-consultation'
    },
    calendlyUrl:   null, // auto-set from calendlyUrls based on hostname
    containerId:   'tlc-calendly',
    minHeight:     '700px',
    primaryColor:  'c9a84c',   // Calendly accepts hex without #
    textColor:     'f5f5f5',
    bgColor:       '0a0a0a'
  };

  /* =========================================================================
   * INJECT CALENDLY CSS + JS FROM CDN
   * ======================================================================= */

  function loadCalendlyAssets(callback) {
    // CSS
    if (!document.querySelector('link[href*="calendly.com/assets/external/widget.css"]')) {
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://assets.calendly.com/assets/external/widget.css';
      document.head.appendChild(link);
    }

    // JS
    if (window.Calendly) {
      callback();
      return;
    }

    var script = document.createElement('script');
    script.src = 'https://assets.calendly.com/assets/external/widget.js';
    script.async = true;
    script.onload = callback;
    script.onerror = function () {
      console.error('[TLC Calendly] Failed to load Calendly widget script.');
    };
    document.head.appendChild(script);
  }

  /* =========================================================================
   * INJECT LUXURY-THEMED WRAPPER STYLES
   * ======================================================================= */

  function injectStyles() {
    var styleId = 'tlc-calendly-styles';
    if (document.getElementById(styleId)) return;

    var css = [
      '.tlc-calendly-wrapper {',
      '  max-width: 720px;',
      '  margin: 3rem auto;',
      '  padding: 2rem;',
      '  background: rgba(255, 255, 255, 0.05);',
      '  border: 1px solid rgba(255, 255, 255, 0.08);',
      '  border-radius: 12px;',
      '  backdrop-filter: blur(20px);',
      '  -webkit-backdrop-filter: blur(20px);',
      '}',
      '',
      '.tlc-calendly-wrapper h2 {',
      '  margin: 0 0 0.25rem;',
      '  font-size: 1.75rem;',
      '  font-weight: 700;',
      '  color: #C9A84C;',
      '  letter-spacing: -0.02em;',
      '  font-family: "Inter", "Helvetica Neue", Arial, sans-serif;',
      '}',
      '',
      '.tlc-calendly-wrapper .tlc-calendly-subtitle {',
      '  margin: 0 0 1.5rem;',
      '  font-size: 0.95rem;',
      '  color: #999999;',
      '  font-family: "Inter", "Helvetica Neue", Arial, sans-serif;',
      '}',
      '',
      '.tlc-calendly-embed {',
      '  min-height: ' + CONFIG.minHeight + ';',
      '  border-radius: 8px;',
      '  overflow: hidden;',
      '}',
      '',
      '@media (max-width: 640px) {',
      '  .tlc-calendly-wrapper {',
      '    margin: 1.5rem 1rem;',
      '    padding: 1.25rem;',
      '  }',
      '  .tlc-calendly-embed {',
      '    min-height: 600px;',
      '  }',
      '}'
    ].join('\n');

    var style = document.createElement('style');
    style.id = styleId;
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* =========================================================================
   * BUILD THE WIDGET DOM
   * ======================================================================= */

  function buildWidget(container) {
    // Wrapper
    var wrapper = document.createElement('div');
    wrapper.className = 'tlc-calendly-wrapper';

    // Header
    var heading = document.createElement('h2');
    heading.textContent = 'Schedule a Talent Consultation';
    wrapper.appendChild(heading);

    var subtitle = document.createElement('p');
    subtitle.className = 'tlc-calendly-subtitle';
    subtitle.textContent = 'Pick a time that works for you and our team will prepare a custom staffing proposal.';
    wrapper.appendChild(subtitle);

    // Calendly embed container
    var embed = document.createElement('div');
    embed.className = 'calendly-inline-widget tlc-calendly-embed';
    embed.setAttribute('data-url', CONFIG.calendlyUrl +
      '?hide_gdpr_banner=1' +
      '&primary_color=' + CONFIG.primaryColor +
      '&text_color=' + CONFIG.textColor +
      '&background_color=' + CONFIG.bgColor);
    wrapper.appendChild(embed);

    container.appendChild(wrapper);

    return embed;
  }

  /* =========================================================================
   * GA4 EVENT TRACKING VIA CALENDLY postMessage API
   * ======================================================================= */

  function attachEventListeners() {
    /**
     * Calendly emits postMessage events for scheduling interactions:
     *   - calendly.profile_page_viewed
     *   - calendly.event_type_viewed
     *   - calendly.date_and_time_selected
     *   - calendly.event_scheduled
     */
    window.addEventListener('message', function (e) {
      if (!e.data || !e.data.event) return;
      if (typeof e.data.event !== 'string') return;
      if (e.data.event.indexOf('calendly.') !== 0) return;

      var eventName = e.data.event;

      // Push all Calendly events to dataLayer
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event:           'calendly_interaction',
        calendly_event:  eventName,
        calendly_url:    CONFIG.calendlyUrl
      });

      // Fire GA4 schedule_call on successful booking
      if (eventName === 'calendly.event_scheduled') {
        window.dataLayer.push({
          event:           'calendly_click',
          calendly_action: 'scheduled'
        });

        if (typeof gtag === 'function') {
          gtag('event', 'schedule_call', {
            event_category: 'engagement',
            event_label:    'calendly_booking',
            calendly_url:   CONFIG.calendlyUrl
          });
        }

        // Meta Pixel Schedule event
        if (typeof fbq === 'function') {
          fbq('track', 'Schedule');
        }
      }

      // Also fire on date/time selection as an engagement signal
      if (eventName === 'calendly.date_and_time_selected') {
        if (typeof gtag === 'function') {
          gtag('event', 'calendly_date_selected', {
            event_category: 'engagement',
            event_label:    'date_time_selected'
          });
        }
      }
    });
  }

  /* =========================================================================
   * PUBLIC API
   * ======================================================================= */

  var TLCCalendly = {
    /**
     * Initialize the Calendly widget.
     * @param {string} [selector] - CSS selector for the container. Defaults to #tlc-calendly.
     */
    init: function (selector) {
      var containerSel = selector || '#' + CONFIG.containerId;
      var container = document.querySelector(containerSel);

      if (!container) {
        console.warn('[TLC Calendly] Container not found: ' + containerSel +
                     '. Create a <div id="' + CONFIG.containerId + '"></div> element.');
        return;
      }

      injectStyles();
      var embedEl = buildWidget(container);

      loadCalendlyAssets(function () {
        if (window.Calendly && window.Calendly.initInlineWidget) {
          // Re-init if the Calendly library needs explicit initialization
          window.Calendly.initInlineWidget({
            url: CONFIG.calendlyUrl +
                 '?hide_gdpr_banner=1' +
                 '&primary_color=' + CONFIG.primaryColor +
                 '&text_color=' + CONFIG.textColor +
                 '&background_color=' + CONFIG.bgColor,
            parentElement: embedEl
          });
        }
      });

      attachEventListeners();
    }
  };

  // Expose globally
  window.TLCCalendly = TLCCalendly;

  /* =========================================================================
   * AUTO-INIT ON DOM READY
   * ======================================================================= */

  // Auto-detect Calendly URL based on hostname
  CONFIG.calendlyUrl = CONFIG.calendlyUrls[window.location.hostname] || CONFIG.calendlyUrls['default'];

  function autoInit() {
    if (document.getElementById(CONFIG.containerId)) {
      TLCCalendly.init();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }

})();
