/**
 * TLC Models -- Geo-Personalization Script
 * =========================================
 * Dynamically personalizes landing page content based on visitor's city.
 *
 * Detection chain: URL override (?city=) -> sessionStorage cache -> ipapi.co -> navigator.geolocation
 * Targets elements with: data-geo-headline, data-geo-subheadline, data-geo-stat
 * Fires GA4 event: geo_detected { city, region }
 *
 * TLC Design Tokens (reference):
 *   --tlc-gold:       #C8A951
 *   --tlc-black:      #1A1A1A
 *   --tlc-white:      #FFFFFF
 *   --tlc-font-hero:  'Playfair Display', serif
 *   --tlc-font-body:  'Inter', sans-serif
 *
 * Zero dependencies. Self-executing IIFE.
 */
(function () {
  'use strict';

  /* ──────────────────────────────────────────────
   * City-specific content configuration
   * ────────────────────────────────────────────── */
  var CITY_CONTENT = {
    'las vegas': {
      headline: "Las Vegas's #1 Event Staffing Agency",
      subheadline: 'Powering conventions, nightlife launches & luxury brand activations on The Strip and beyond.',
      stats: {
        events: '2,400+',
        talent: '800+',
        rating: '4.9/5',
        label_events: 'LV Events Staffed',
        label_talent: 'Las Vegas Talent',
        label_rating: 'Client Rating'
      }
    },
    'miami': {
      headline: "Miami's Premier Event Staffing Partner",
      subheadline: 'From Art Basel to South Beach soirees -- elite talent for Miami\'s most iconic events.',
      stats: {
        events: '1,800+',
        talent: '650+',
        rating: '4.9/5',
        label_events: 'Miami Events Staffed',
        label_talent: 'Miami Talent',
        label_rating: 'Client Rating'
      }
    },
    'dallas': {
      headline: "Texas's Elite Event Staffing Agency",
      subheadline: 'Premium promotional models and brand ambassadors across Dallas, Austin & Houston.',
      stats: {
        events: '3,200+',
        talent: '1,100+',
        rating: '4.8/5',
        label_events: 'Texas Events Staffed',
        label_talent: 'Texas Talent',
        label_rating: 'Client Rating'
      }
    },
    'austin': {
      headline: "Texas's Elite Event Staffing Agency",
      subheadline: 'Premium promotional models and brand ambassadors across Austin, Dallas & Houston.',
      stats: {
        events: '3,200+',
        talent: '1,100+',
        rating: '4.8/5',
        label_events: 'Texas Events Staffed',
        label_talent: 'Texas Talent',
        label_rating: 'Client Rating'
      }
    },
    'houston': {
      headline: "Texas's Elite Event Staffing Agency",
      subheadline: 'Premium promotional models and brand ambassadors across Houston, Dallas & Austin.',
      stats: {
        events: '3,200+',
        talent: '1,100+',
        rating: '4.8/5',
        label_events: 'Texas Events Staffed',
        label_talent: 'Texas Talent',
        label_rating: 'Client Rating'
      }
    },
    'new york': {
      headline: "New York's Luxury Event Staffing Agency",
      subheadline: 'Fashion week, product launches & corporate galas -- NYC\'s most trusted staffing partner.',
      stats: {
        events: '4,500+',
        talent: '1,500+',
        rating: '4.9/5',
        label_events: 'NYC Events Staffed',
        label_talent: 'New York Talent',
        label_rating: 'Client Rating'
      }
    },
    'los angeles': {
      headline: "LA's Top Event Staffing Agency",
      subheadline: 'Red carpets, premieres & experiential activations staffed by LA\'s finest talent.',
      stats: {
        events: '3,800+',
        talent: '1,200+',
        rating: '4.9/5',
        label_events: 'LA Events Staffed',
        label_talent: 'Los Angeles Talent',
        label_rating: 'Client Rating'
      }
    }
  };

  var DEFAULT_CONTENT = {
    headline: "America's Premier Event Staffing Agency",
    subheadline: 'Nationwide promotional models, brand ambassadors & event staff for every occasion.',
    stats: {
      events: '15,000+',
      talent: '5,000+',
      rating: '4.9/5',
      label_events: 'Events Staffed Nationwide',
      label_talent: 'Nationwide Talent',
      label_rating: 'Client Rating'
    }
  };

  var STORAGE_KEY = 'tlc_geo_city';
  var STORAGE_REGION_KEY = 'tlc_geo_region';

  /* ──────────────────────────────────────────────
   * Utility: read URL parameter
   * ────────────────────────────────────────────── */
  function getUrlParam(name) {
    var params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  /* ──────────────────────────────────────────────
   * Utility: normalize city name for lookup
   * ────────────────────────────────────────────── */
  function normalizeCity(raw) {
    if (!raw) return '';
    return raw.trim().toLowerCase();
  }

  /* ──────────────────────────────────────────────
   * Apply content to the DOM
   * ────────────────────────────────────────────── */
  function applyContent(content) {
    // Headline
    var headlines = document.querySelectorAll('[data-geo-headline]');
    headlines.forEach(function (el) {
      el.textContent = content.headline;
    });

    // Subheadline
    var subs = document.querySelectorAll('[data-geo-subheadline]');
    subs.forEach(function (el) {
      el.textContent = content.subheadline;
    });

    // Stats -- data-geo-stat="events" | "talent" | "rating"
    // Also supports data-geo-stat="label_events" etc.
    var statEls = document.querySelectorAll('[data-geo-stat]');
    statEls.forEach(function (el) {
      var key = el.getAttribute('data-geo-stat');
      if (content.stats && content.stats[key] !== undefined) {
        el.textContent = content.stats[key];
      }
    });
  }

  /* ──────────────────────────────────────────────
   * Resolve content for a city string
   * ────────────────────────────────────────────── */
  function resolveContent(city) {
    var normalized = normalizeCity(city);
    return CITY_CONTENT[normalized] || DEFAULT_CONTENT;
  }

  /* ──────────────────────────────────────────────
   * Fire GA4 custom event
   * ────────────────────────────────────────────── */
  function fireGA4Event(city, region) {
    if (typeof gtag === 'function') {
      gtag('event', 'geo_detected', {
        city: city || 'unknown',
        region: region || 'unknown'
      });
    }
  }

  /* ──────────────────────────────────────────────
   * Reverse-geocode coordinates via ipapi (lat/lon
   * fallback is not supported by ipapi, so we use
   * a simple Nominatim call for geolocation fallback)
   * ────────────────────────────────────────────── */
  function reverseGeocode(lat, lon, callback) {
    var url = 'https://nominatim.openstreetmap.org/reverse?format=json&lat=' +
      encodeURIComponent(lat) + '&lon=' + encodeURIComponent(lon);
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.timeout = 5000;
    xhr.onload = function () {
      try {
        var data = JSON.parse(xhr.responseText);
        var city = (data.address && (data.address.city || data.address.town || data.address.village)) || '';
        var region = (data.address && data.address.state) || '';
        callback(city, region);
      } catch (e) {
        callback('', '');
      }
    };
    xhr.onerror = function () { callback('', ''); };
    xhr.ontimeout = function () { callback('', ''); };
    xhr.send();
  }

  /* ──────────────────────────────────────────────
   * Fallback: navigator.geolocation
   * ────────────────────────────────────────────── */
  function fallbackGeolocation(callback) {
    if (!navigator.geolocation) {
      callback('', '');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        reverseGeocode(pos.coords.latitude, pos.coords.longitude, callback);
      },
      function () {
        // User denied or error -- fall back to default
        callback('', '');
      },
      { timeout: 5000 }
    );
  }

  /* ──────────────────────────────────────────────
   * Primary detection: ipapi.co
   * ────────────────────────────────────────────── */
  function detectViaIpapi(callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://ipapi.co/json/', true);
    xhr.timeout = 5000;

    // Handle CORS and network errors gracefully
    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          var data = JSON.parse(xhr.responseText);
          var city = data.city || '';
          var region = data.region || '';
          callback(city, region);
        } catch (e) {
          // JSON parse failed -- try geolocation
          fallbackGeolocation(callback);
        }
      } else {
        // Non-2xx status -- try geolocation
        fallbackGeolocation(callback);
      }
    };

    xhr.onerror = function () {
      // CORS error or network failure -- try geolocation
      fallbackGeolocation(callback);
    };

    xhr.ontimeout = function () {
      fallbackGeolocation(callback);
    };

    xhr.send();
  }

  /* ──────────────────────────────────────────────
   * Main initialization
   * ────────────────────────────────────────────── */
  function init() {
    // 1. Check for manual URL override: ?city=miami
    var override = getUrlParam('city');
    if (override) {
      var content = resolveContent(override);
      applyContent(content);
      fireGA4Event(override, 'url-override');
      // Cache the override so subsequent page views stay consistent
      try {
        sessionStorage.setItem(STORAGE_KEY, override);
        sessionStorage.setItem(STORAGE_REGION_KEY, 'url-override');
      } catch (e) { /* storage unavailable */ }
      return;
    }

    // 2. Check sessionStorage cache
    try {
      var cached = sessionStorage.getItem(STORAGE_KEY);
      if (cached) {
        var cachedRegion = sessionStorage.getItem(STORAGE_REGION_KEY) || '';
        applyContent(resolveContent(cached));
        fireGA4Event(cached, cachedRegion);
        return;
      }
    } catch (e) { /* storage unavailable -- continue to API */ }

    // 3. Apply default content immediately (prevents FOUC)
    applyContent(DEFAULT_CONTENT);

    // 4. Detect city via ipapi.co (falls back to geolocation)
    detectViaIpapi(function (city, region) {
      if (city) {
        // Cache for the session
        try {
          sessionStorage.setItem(STORAGE_KEY, city);
          sessionStorage.setItem(STORAGE_REGION_KEY, region);
        } catch (e) { /* storage unavailable */ }

        // Swap in city-specific content (or keep default if no match)
        applyContent(resolveContent(city));
        fireGA4Event(city, region);
      } else {
        // No city detected -- default content already applied
        fireGA4Event('unknown', 'unknown');
      }
    });
  }

  /* ──────────────────────────────────────────────
   * Run when DOM is ready
   * ────────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
