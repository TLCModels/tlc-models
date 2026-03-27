/**
 * TLC Models - Meta (Facebook) Pixel Event Helper
 * Phase 2: Conversion Tracking
 *
 * Fires Meta Pixel standard and custom events:
 *   - PageView       on every page load
 *   - Lead           on form submission
 *   - Schedule       on Calendly booking
 *   - ViewContent    on service section scroll into view
 *   - Contact        on phone (tel:) or email (mailto:) click
 *
 * Prerequisites:
 *   The Meta Pixel base code must be loaded before this script.
 *   (integrations-loader.js handles this, or add the base code manually.)
 *
 * Usage:
 *   <script src="/scripts/meta-pixel-events.js"></script>
 *
 * Replace 2331056137634152 in the base code with your actual Pixel ID.
 */

(function () {
  'use strict';

  /* =========================================================================
   * SAFETY CHECK - Ensure fbq is available
   * ======================================================================= */

  function waitForFbq(callback, retries) {
    retries = retries || 0;
    if (typeof fbq === 'function') {
      callback();
      return;
    }
    if (retries < 20) {
      setTimeout(function () { waitForFbq(callback, retries + 1); }, 250);
    } else {
      console.warn('[TLC Meta Pixel] fbq not found after 5s. Ensure the Meta Pixel base code is loaded.');
    }
  }

  /* =========================================================================
   * EVENT 1: PageView
   *
   * Fires automatically on every page load.
   * The base pixel code fires PageView too, but this provides additional
   * page context parameters for custom audience building.
   * ======================================================================= */

  function firePageView() {
    fbq('track', 'PageView');

    // Custom event with extended page data for retargeting segments
    fbq('trackCustom', 'TLCPageView', {
      page_path:     window.location.pathname,
      page_hostname: window.location.hostname,
      page_referrer: document.referrer || '(direct)',
      page_title:    document.title
    });
  }

  /* =========================================================================
   * EVENT 2: Lead
   *
   * Fires on any <form> submission within the page.
   * Captures the form ID and source page for ad attribution.
   * ======================================================================= */

  function initLeadTracking() {
    document.addEventListener('submit', function (e) {
      var form = e.target;
      if (!form || form.tagName !== 'FORM') return;

      var formId   = form.id || form.getAttribute('data-form-id') || 'unknown';
      var formName = form.getAttribute('data-form-name') || formId;
      var source   = form.querySelector('input[name="_source"]');

      fbq('track', 'Lead', {
        content_name:     formName,
        content_category: 'lead_form',
        content_ids:      [formId],
        source_page:      source ? source.value : window.location.hostname
      });
    }, true);
  }

  /* =========================================================================
   * EVENT 3: Schedule
   *
   * Fires when a Calendly booking is completed (via postMessage API).
   * Also fires on direct Calendly link clicks as a fallback signal.
   * ======================================================================= */

  function initScheduleTracking() {
    // Calendly iframe postMessage event
    window.addEventListener('message', function (e) {
      if (!e.data || typeof e.data.event !== 'string') return;

      if (e.data.event === 'calendly.event_scheduled') {
        fbq('track', 'Schedule', {
          content_name:     'talent_consultation',
          content_category: 'calendly_booking'
        });
      }
    });

    // Calendly link click fallback
    document.addEventListener('click', function (e) {
      var anchor = e.target.closest ? e.target.closest('a') : null;
      if (!anchor) return;

      var href = anchor.getAttribute('href') || '';
      if (href.indexOf('calendly.com') !== -1) {
        fbq('trackCustom', 'CalendlyClick', {
          link_url:  href,
          link_text: anchor.textContent.trim().substring(0, 100)
        });
      }
    }, false);
  }

  /* =========================================================================
   * EVENT 4: ViewContent
   *
   * Fires when a service section scrolls into the viewport.
   * Targets elements with [data-service-section] or class .tlc-service-section.
   * Each section fires ViewContent only once.
   *
   * Example markup:
   *   <section data-service-section="brand-ambassadors" class="tlc-service-section">
   * ======================================================================= */

  function initViewContentTracking() {
    var sections = document.querySelectorAll('[data-service-section], .tlc-service-section');
    if (!sections.length) return;

    // Use IntersectionObserver if available, otherwise skip gracefully
    if (!('IntersectionObserver' in window)) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;

        var el = entry.target;
        var sectionName = el.getAttribute('data-service-section') ||
                          el.id ||
                          'service_section';

        fbq('track', 'ViewContent', {
          content_name:     sectionName,
          content_category: 'service_section',
          content_type:     'product'
        });

        // Unobserve so it only fires once
        observer.unobserve(el);
      });
    }, {
      threshold: 0.5  // Fire when 50% of the section is visible
    });

    sections.forEach(function (section) {
      observer.observe(section);
    });
  }

  /* =========================================================================
   * EVENT 5: Contact
   *
   * Fires when a visitor clicks a tel: or mailto: link.
   * ======================================================================= */

  function initContactTracking() {
    document.addEventListener('click', function (e) {
      var anchor = e.target.closest ? e.target.closest('a') : null;
      if (!anchor) return;

      var href = anchor.getAttribute('href') || '';
      var method = null;
      var value  = null;

      if (href.indexOf('tel:') === 0) {
        method = 'phone';
        value  = href.replace('tel:', '');
      } else if (href.indexOf('mailto:') === 0) {
        method = 'email';
        value  = href.replace('mailto:', '').split('?')[0]; // Strip query params
      }

      if (!method) return;

      fbq('track', 'Contact', {
        content_name:     method,
        content_category: 'contact_click',
        contact_method:   method,
        contact_value:    value
      });
    }, false);
  }

  /* =========================================================================
   * BOOTSTRAP
   * ======================================================================= */

  waitForFbq(function () {
    firePageView();
    initLeadTracking();
    initScheduleTracking();
    initViewContentTracking();
    initContactTracking();
  });

})();
