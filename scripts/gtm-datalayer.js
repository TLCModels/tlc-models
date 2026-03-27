/**
 * TLC Models - Google Tag Manager Data Layer Setup
 * Phase 2: Analytics & Event Infrastructure
 *
 * Initializes the GTM dataLayer with custom event definitions and
 * attaches DOM listeners that push structured events for:
 *   - form_submit       (generate_lead)
 *   - calendly_click    (schedule_call)
 *   - tidio_chat_open
 *   - cta_click
 *   - scroll_depth      (25%, 50%, 75%, 90%, 100% milestones)
 *
 * Usage:
 *   Include in <head> BEFORE the GTM container snippet:
 *   <script src="/scripts/gtm-datalayer.js"></script>
 *
 * All events are pushed to window.dataLayer for GTM tag consumption.
 */

(function () {
  'use strict';

  /* =========================================================================
   * DATA LAYER INITIALIZATION
   * ======================================================================= */

  window.dataLayer = window.dataLayer || [];

  /**
   * Push an event object to the dataLayer.
   * Automatically adds a timestamp to every push.
   */
  function dlPush(eventName, data) {
    var payload = { event: eventName, event_timestamp: new Date().toISOString() };
    if (data && typeof data === 'object') {
      Object.keys(data).forEach(function (key) {
        payload[key] = data[key];
      });
    }
    window.dataLayer.push(payload);
  }

  /* =========================================================================
   * PAGE CONTEXT - Push initial page data
   * ======================================================================= */

  dlPush('page_data', {
    page_path:     window.location.pathname,
    page_hostname: window.location.hostname,
    page_title:    document.title,
    page_referrer: document.referrer || '(direct)',
    page_url:      window.location.href
  });

  /* =========================================================================
   * EVENT 1: form_submit (generate_lead)
   *
   * GTM Trigger: Custom Event -> form_submit
   * Fires on any <form> submission. Captures form ID and name.
   * ======================================================================= */

  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (!form || form.tagName !== 'FORM') return;

    var formId   = form.id || form.getAttribute('data-form-id') || 'unknown';
    var formName = form.getAttribute('data-form-name') || form.id || 'lead_form';

    dlPush('form_submit', {
      form_id:        formId,
      form_name:      formName,
      form_action:    form.action || '',
      form_method:    form.method || 'GET',
      generate_lead:  true,
      // GA4-compatible parameters
      ga4_event:      'generate_lead',
      currency:       'USD',
      value:          0
    });
  }, true);

  /* =========================================================================
   * EVENT 2: calendly_click (schedule_call)
   *
   * GTM Trigger: Custom Event -> calendly_click
   * Fires on:
   *   a) Click on any link containing "calendly.com"
   *   b) Calendly iframe postMessage event for scheduling
   * ======================================================================= */

  // (a) Link click detection
  document.addEventListener('click', function (e) {
    var anchor = e.target.closest ? e.target.closest('a') : null;
    if (!anchor) return;

    var href = anchor.getAttribute('href') || '';
    if (href.indexOf('calendly.com') === -1) return;

    dlPush('calendly_click', {
      link_url:       href,
      link_text:      anchor.textContent.trim().substring(0, 100),
      schedule_call:  true,
      ga4_event:      'schedule_call'
    });
  }, false);

  // (b) Calendly iframe postMessage detection
  window.addEventListener('message', function (e) {
    if (!e.data || typeof e.data.event !== 'string') return;
    if (e.data.event.indexOf('calendly.') !== 0) return;

    var calendlyEvent = e.data.event;

    // Always push raw Calendly event
    dlPush('calendly_interaction', {
      calendly_event: calendlyEvent
    });

    // Fire schedule_call on actual booking
    if (calendlyEvent === 'calendly.event_scheduled') {
      dlPush('calendly_click', {
        calendly_action: 'event_scheduled',
        schedule_call:   true,
        ga4_event:       'schedule_call'
      });
    }
  });

  /* =========================================================================
   * EVENT 3: tidio_chat_open
   *
   * GTM Trigger: Custom Event -> tidio_chat_open
   * Fires when the Tidio chat widget is opened by the visitor.
   * ======================================================================= */

  // Tidio dispatches a custom DOM event "tidio:open"
  document.addEventListener('tidio:open', function () {
    dlPush('tidio_chat_open', {
      chat_provider: 'tidio',
      ga4_event:     'tidio_chat_open'
    });
  });

  // Also listen for Tidio API ready event to track widget load
  document.addEventListener('tidio:ready', function () {
    dlPush('tidio_ready', {
      chat_provider: 'tidio'
    });
  });

  /* =========================================================================
   * EVENT 4: cta_click
   *
   * GTM Trigger: Custom Event -> cta_click
   * Fires on click of any element with a data-cta attribute.
   *
   * Example markup: <a href="/quote" data-cta="hero-get-quote">Get a Quote</a>
   * ======================================================================= */

  document.addEventListener('click', function (e) {
    var ctaEl = e.target.closest ? e.target.closest('[data-cta]') : null;
    if (!ctaEl) return;

    dlPush('cta_click', {
      cta_name:     ctaEl.getAttribute('data-cta'),
      cta_text:     ctaEl.textContent.trim().substring(0, 100),
      cta_url:      ctaEl.getAttribute('href') || '',
      cta_element:  ctaEl.tagName.toLowerCase(),
      ga4_event:    'cta_click'
    });
  }, false);

  /* =========================================================================
   * EVENT 5: scroll_depth
   *
   * GTM Trigger: Custom Event -> scroll_depth
   * Fires at 25%, 50%, 75%, 90%, and 100% scroll milestones.
   * Each milestone fires only once per page load.
   * ======================================================================= */

  (function () {
    var milestones = [25, 50, 75, 90, 100];
    var fired = {};

    function getScrollPercent() {
      var docHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight
      );
      var viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      var scrollTop = window.pageYOffset || document.documentElement.scrollTop;

      if (docHeight <= viewportHeight) return 100;
      return Math.round((scrollTop / (docHeight - viewportHeight)) * 100);
    }

    function checkMilestones() {
      var pct = getScrollPercent();

      milestones.forEach(function (milestone) {
        if (pct >= milestone && !fired[milestone]) {
          fired[milestone] = true;

          dlPush('scroll_depth', {
            scroll_percent:    milestone,
            scroll_threshold:  milestone + '%',
            page_path:         window.location.pathname,
            ga4_event:         'scroll_depth'
          });
        }
      });
    }

    // Throttled scroll listener (fires at most every 200ms)
    var scrollTimer = null;
    window.addEventListener('scroll', function () {
      if (scrollTimer) return;
      scrollTimer = setTimeout(function () {
        scrollTimer = null;
        checkMilestones();
      }, 200);
    }, { passive: true });

    // Check on load (in case page is short or already scrolled)
    checkMilestones();
  })();

  /* =========================================================================
   * EXPOSE HELPER FOR MANUAL EVENT PUSHING
   * ======================================================================= */

  window.TLCDataLayer = {
    push: dlPush
  };

})();
