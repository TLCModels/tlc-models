#!/usr/bin/env bash
# =============================================================================
# TLC Models - Phase 2 Integration Injection Helper
# =============================================================================
#
# Shows exactly which script tags need to be added to each landing page's
# HTML <head> and before </body> to enable all Phase 2 integrations.
#
# Usage:
#   ./scripts/inject-all.sh <page-url>
#
# Examples:
#   ./scripts/inject-all.sh lasvegas.tlcmodels.com
#   ./scripts/inject-all.sh f1.tlcmodels.com
#   ./scripts/inject-all.sh fifa2026.tlcmodels.com
#
# This script does NOT modify any files. It outputs the required snippets
# for manual or automated insertion.
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Design tokens (for reference)
# ---------------------------------------------------------------------------
GOLD="#C9A84C"
DARK="#0A0A0A"

# ---------------------------------------------------------------------------
# Configuration per landing page
# ---------------------------------------------------------------------------
TIDIO_KEY="ldaaed9wpuayclkmydwfcomhlqxgfqzz"
GTM_ID="GTM-NGS336"
META_PIXEL_ID="2331056137634152"
CALENDLY_URL="https://calendly.com/tlcmodels/talent-consultation"

# GA4 measurement IDs per page
declare -A GA4_IDS=(
  ["lasvegas.tlcmodels.com"]="G-0T937F6M3H"
  ["f1.tlcmodels.com"]="G-5215213387"
  ["fifa2026.tlcmodels.com"]="G-5215213387"
)

# Formspree IDs per page
declare -A FORMSPREE_IDS=(
  ["lasvegas.tlcmodels.com"]="FORMSPREE_LV_ID"
  ["f1.tlcmodels.com"]="FORMSPREE_F1_ID"
  ["fifa2026.tlcmodels.com"]="FORMSPREE_FIFA_ID"
)

# ---------------------------------------------------------------------------
# Parse arguments
# ---------------------------------------------------------------------------
if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <page-url>"
  echo ""
  echo "Supported pages:"
  echo "  lasvegas.tlcmodels.com"
  echo "  f1.tlcmodels.com"
  echo "  fifa2026.tlcmodels.com"
  exit 1
fi

PAGE_URL="$1"

# Strip protocol if provided
PAGE_URL="${PAGE_URL#https://}"
PAGE_URL="${PAGE_URL#http://}"
PAGE_URL="${PAGE_URL%%/*}"

# Validate page
if [[ -z "${GA4_IDS[$PAGE_URL]+_}" ]]; then
  echo "ERROR: Unknown page '$PAGE_URL'"
  echo "Supported: lasvegas.tlcmodels.com, f1.tlcmodels.com, fifa2026.tlcmodels.com"
  exit 1
fi

GA4_ID="${GA4_IDS[$PAGE_URL]}"
FORMSPREE_ID="${FORMSPREE_IDS[$PAGE_URL]}"

# ---------------------------------------------------------------------------
# Fetch current page (informational only)
# ---------------------------------------------------------------------------
echo "============================================================="
echo " TLC Models - Phase 2 Integration Snippets"
echo " Target: $PAGE_URL"
echo " GA4 ID: $GA4_ID"
echo "============================================================="
echo ""

# Check if the page is reachable
if command -v curl &>/dev/null; then
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://$PAGE_URL" 2>/dev/null || echo "000")
  if [[ "$HTTP_STATUS" == "200" ]]; then
    echo "[OK] Page is reachable (HTTP $HTTP_STATUS)"
  else
    echo "[INFO] Page returned HTTP $HTTP_STATUS (may not be deployed yet)"
  fi
  echo ""
fi

# ---------------------------------------------------------------------------
# Output: <head> scripts
# ---------------------------------------------------------------------------
cat <<HEADEOF
-------------------------------------------------------------
 ADD THE FOLLOWING INSIDE <head> (before closing </head>):
-------------------------------------------------------------

<!-- Phase 2: GA4 (Google Analytics 4) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA4_ID}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${GA4_ID}');
</script>

<!-- Phase 2: GTM Data Layer Setup -->
<script src="/scripts/gtm-datalayer.js"></script>

<!-- Phase 2: Google Tag Manager Container -->
<script>
  (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
  new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
  j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
  'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
  })(window,document,'script','dataLayer','${GTM_ID}');
</script>

<!-- Phase 2: Meta Pixel Base Code -->
<script>
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window,document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', '${META_PIXEL_ID}');
  fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
  src="https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1" /></noscript>

HEADEOF

# ---------------------------------------------------------------------------
# Output: before </body> scripts
# ---------------------------------------------------------------------------
cat <<BODYEOF

-------------------------------------------------------------
 ADD THE FOLLOWING BEFORE </body>:
-------------------------------------------------------------

<!-- Phase 2: GTM noscript fallback -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${GTM_ID}"
  height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>

<!-- Phase 2: Tidio Live Chat -->
<script src="//code.tidio.co/${TIDIO_KEY}.js" async></script>

<!-- Phase 2: Meta Pixel Event Helper -->
<script src="/scripts/meta-pixel-events.js"></script>

<!-- Phase 2: Calendly Embed Widget -->
<div id="tlc-calendly"></div>
<script src="/scripts/calendly-embed.js"></script>

<!-- Phase 2: Universal Integration Loader (alternative: use this INSTEAD of individual scripts above) -->
<!-- <script src="/scripts/integrations-loader.js"></script> -->

BODYEOF

# ---------------------------------------------------------------------------
# Output: Formspree form embed
# ---------------------------------------------------------------------------
cat <<FORMEOF

-------------------------------------------------------------
 FORMSPREE FORM (embed where the lead form should appear):
-------------------------------------------------------------

Replace ${FORMSPREE_ID} in formspree-forms.html with your
actual Formspree endpoint ID, then embed the relevant form
section (id="form-${PAGE_URL%%.*}") into the page.

Formspree action URL:
  https://formspree.io/f/${FORMSPREE_ID}

FORMEOF

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo "============================================================="
echo " INTEGRATION SUMMARY FOR $PAGE_URL"
echo "============================================================="
echo " GA4 Measurement ID:  $GA4_ID"
echo " GTM Container ID:    $GTM_ID (replace with actual ID)"
echo " Meta Pixel ID:       $META_PIXEL_ID (replace with actual ID)"
echo " Tidio Key:           $TIDIO_KEY"
echo " Calendly URL:        $CALENDLY_URL"
echo " Formspree Endpoint:  $FORMSPREE_ID (replace with actual ID)"
echo "============================================================="
echo ""
echo "Files to deploy to the page's /scripts/ directory:"
echo "  - scripts/integrations-loader.js   (universal loader OR use individual scripts)"
echo "  - scripts/gtm-datalayer.js         (GTM data layer + events)"
echo "  - scripts/meta-pixel-events.js     (Meta Pixel event helper)"
echo "  - scripts/calendly-embed.js        (Calendly widget)"
echo "  - scripts/formspree-forms.html     (lead capture form template)"
echo ""
