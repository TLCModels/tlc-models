#!/usr/bin/env python3
"""
Syngency -> Webflow CMS Sync
=============================
Pulls talent profiles from Syngency divisions API and pushes them
to a Webflow CMS collection via Data API v2.

Images are converted to WebP (max 1920x1080, <500 KB) with
SEO-friendly kebab-case filenames.

Environment variables required:
    WEBFLOW_SITE_ID     - Webflow site identifier
    WEBFLOW_API_TOKEN   - Webflow Data API v2 bearer token

Usage:
    python syngency-webflow-sync.py
    python syngency-webflow-sync.py --dry-run
    python syngency-webflow-sync.py --collection-id <id>
"""

from __future__ import annotations

import argparse
import asyncio
import io
import logging
import os
import re
import sys
import time
from pathlib import Path
from typing import Any

import httpx
from dotenv import load_dotenv
from PIL import Image
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

load_dotenv()

SYNGENCY_API_KEY = "aaixegkcwpbeokw63j8uksiagx4opn6megeq"
SYNGENCY_BASE_URL = "https://tlcmodels.syngency.com"

WEBFLOW_SITE_ID = os.environ.get("WEBFLOW_SITE_ID", "")
WEBFLOW_API_TOKEN = os.environ.get("WEBFLOW_API_TOKEN", "")
WEBFLOW_API_BASE = "https://api.webflow.com/v2"

BRAND_NAME = "TLC Models"

IMAGE_MAX_WIDTH = 1920
IMAGE_MAX_HEIGHT = 1080
IMAGE_MAX_BYTES = 500 * 1024  # 500 KB

WEBFLOW_RATE_LIMIT = 60  # requests per minute

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("syngency-webflow-sync")

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def slugify(text: str) -> str:
    """Convert arbitrary text to a kebab-case slug."""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text.strip("-")


def build_image_filename(name: str, role: str, city: str) -> str:
    """Return SEO-friendly kebab-case WebP filename."""
    parts = ["tlc-models", slugify(name), slugify(role), slugify(city)]
    return "-".join(p for p in parts if p) + ".webp"


def build_alt_text(
    role: str,
    event_name: str = "",
    service_category: str = "",
    city: str = "",
) -> str:
    """[Brand] [Staff Role] -- [Event Name] [Service Category] [City]"""
    right_parts = " ".join(p for p in [event_name, service_category, city] if p)
    return f"{BRAND_NAME} {role} -- {right_parts}".strip(" -")


# ---------------------------------------------------------------------------
# Rate limiter (token-bucket, async-safe)
# ---------------------------------------------------------------------------


class AsyncRateLimiter:
    """Simple token-bucket limiter for Webflow's 60 req/min cap."""

    def __init__(self, max_calls: int = WEBFLOW_RATE_LIMIT, period: float = 60.0):
        self._max = max_calls
        self._period = period
        self._tokens = max_calls
        self._last = time.monotonic()
        self._lock = asyncio.Lock()

    async def acquire(self) -> None:
        async with self._lock:
            now = time.monotonic()
            elapsed = now - self._last
            self._tokens = min(self._max, self._tokens + elapsed * (self._max / self._period))
            self._last = now
            if self._tokens < 1:
                wait = (1 - self._tokens) * (self._period / self._max)
                log.debug("Rate-limit: sleeping %.2fs", wait)
                await asyncio.sleep(wait)
                self._tokens = 0
                self._last = time.monotonic()
            else:
                self._tokens -= 1


rate_limiter = AsyncRateLimiter()

# ---------------------------------------------------------------------------
# Syngency client
# ---------------------------------------------------------------------------


class SyngencyClient:
    """Async wrapper around the Syngency REST API."""

    def __init__(self, client: httpx.AsyncClient):
        self._client = client
        self._base = SYNGENCY_BASE_URL
        self._headers = {
            "Authorization": f"Bearer {SYNGENCY_API_KEY}",
            "Accept": "application/json",
        }

    @retry(
        retry=retry_if_exception_type((httpx.HTTPStatusError, httpx.TransportError)),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=30),
        reraise=True,
    )
    async def _get(self, path: str, params: dict[str, Any] | None = None) -> dict:
        resp = await self._client.get(
            f"{self._base}{path}",
            headers=self._headers,
            params=params or {},
            timeout=30.0,
        )
        resp.raise_for_status()
        return resp.json()

    async def get_divisions(self) -> list[dict]:
        """Return every division (handles pagination)."""
        divisions: list[dict] = []
        page = 1
        while True:
            data = await self._get("/api/v2/divisions", {"page": page, "per_page": 50})
            items = data.get("data") or data if isinstance(data, list) else data.get("data", [])
            if not items:
                break
            divisions.extend(items)
            # Check for next page
            if isinstance(data, dict) and data.get("next_page_url"):
                page += 1
            else:
                break
        log.info("Fetched %d divisions from Syngency", len(divisions))
        return divisions

    async def get_division_talent(self, division_id: str | int) -> list[dict]:
        """Return all talent in a given division (paginated)."""
        talent: list[dict] = []
        page = 1
        while True:
            data = await self._get(
                f"/api/v2/divisions/{division_id}/talent",
                {"page": page, "per_page": 50},
            )
            items = data.get("data") or data if isinstance(data, list) else data.get("data", [])
            if not items:
                break
            talent.extend(items)
            if isinstance(data, dict) and data.get("next_page_url"):
                page += 1
            else:
                break
        return talent

    async def get_all_talent(self) -> list[dict]:
        """Aggregate talent across every division, de-duped by ID."""
        divisions = await self.get_divisions()
        seen: set[str] = set()
        all_talent: list[dict] = []
        for div in divisions:
            div_id = div.get("id") or div.get("division_id")
            if not div_id:
                continue
            profiles = await self.get_division_talent(div_id)
            for p in profiles:
                pid = str(p.get("id", ""))
                if pid and pid not in seen:
                    seen.add(pid)
                    # Attach division info for context
                    p["_division"] = div.get("name", "")
                    all_talent.append(p)
            log.info(
                "Division '%s' (%s): %d profiles",
                div.get("name", "?"),
                div_id,
                len(profiles),
            )
        log.info("Total unique talent profiles: %d", len(all_talent))
        return all_talent

    @retry(
        retry=retry_if_exception_type((httpx.HTTPStatusError, httpx.TransportError)),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=30),
        reraise=True,
    )
    async def download_image(self, url: str) -> bytes | None:
        """Download a raw image from Syngency."""
        try:
            resp = await self._client.get(url, timeout=60.0, follow_redirects=True)
            resp.raise_for_status()
            return resp.content
        except Exception as exc:
            log.warning("Failed to download image %s: %s", url, exc)
            return None


# ---------------------------------------------------------------------------
# Image processing
# ---------------------------------------------------------------------------


def convert_to_webp(raw_bytes: bytes) -> bytes:
    """
    Resize to fit within 1920x1080 and encode as WebP, targeting < 500 KB.
    Returns WebP bytes.
    """
    img = Image.open(io.BytesIO(raw_bytes))
    img = img.convert("RGB")

    # Resize keeping aspect ratio
    img.thumbnail((IMAGE_MAX_WIDTH, IMAGE_MAX_HEIGHT), Image.LANCZOS)

    # Encode, progressively lowering quality until under budget
    for quality in (85, 75, 65, 50, 40, 30):
        buf = io.BytesIO()
        img.save(buf, format="WEBP", quality=quality, method=4)
        data = buf.getvalue()
        if len(data) <= IMAGE_MAX_BYTES:
            return data

    # Last resort: lowest quality
    buf = io.BytesIO()
    img.save(buf, format="WEBP", quality=20, method=4)
    return buf.getvalue()


# ---------------------------------------------------------------------------
# Webflow client
# ---------------------------------------------------------------------------


class WebflowClient:
    """Async wrapper around Webflow Data API v2."""

    def __init__(self, client: httpx.AsyncClient, dry_run: bool = False):
        self._client = client
        self._dry_run = dry_run
        self._headers = {
            "Authorization": f"Bearer {WEBFLOW_API_TOKEN}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        }

    # -- generic request with rate-limiting + retries --

    @retry(
        retry=retry_if_exception_type((httpx.HTTPStatusError, httpx.TransportError)),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=30),
        reraise=True,
    )
    async def _request(
        self,
        method: str,
        path: str,
        json_body: dict | None = None,
        params: dict | None = None,
    ) -> dict:
        await rate_limiter.acquire()
        resp = await self._client.request(
            method,
            f"{WEBFLOW_API_BASE}{path}",
            headers=self._headers,
            json=json_body,
            params=params,
            timeout=30.0,
        )
        # Handle Webflow 429 (rate-limited) manually
        if resp.status_code == 429:
            retry_after = int(resp.headers.get("Retry-After", "5"))
            log.warning("Webflow 429 -- backing off %ds", retry_after)
            await asyncio.sleep(retry_after)
            resp.raise_for_status()  # will trigger tenacity retry
        resp.raise_for_status()
        if resp.status_code == 204:
            return {}
        return resp.json()

    # -- collection helpers --

    async def list_collections(self) -> list[dict]:
        """List all CMS collections for the configured site."""
        data = await self._request("GET", f"/sites/{WEBFLOW_SITE_ID}/collections")
        return data.get("collections", [])

    async def list_collection_items(
        self, collection_id: str, *, limit: int = 100
    ) -> list[dict]:
        """Return all items in a collection (paginated)."""
        items: list[dict] = []
        offset = 0
        while True:
            data = await self._request(
                "GET",
                f"/collections/{collection_id}/items",
                params={"limit": limit, "offset": offset},
            )
            batch = data.get("items", [])
            items.extend(batch)
            if len(batch) < limit:
                break
            offset += limit
        return items

    async def create_item(self, collection_id: str, fields: dict) -> dict:
        """Create a new CMS collection item."""
        if self._dry_run:
            log.info("[DRY RUN] Would create item: %s", fields.get("name", "?"))
            return {"id": "dry-run", "fieldData": fields}
        return await self._request(
            "POST",
            f"/collections/{collection_id}/items",
            json_body={"fieldData": fields, "isDraft": False},
        )

    async def update_item(self, collection_id: str, item_id: str, fields: dict) -> dict:
        """Update an existing CMS collection item."""
        if self._dry_run:
            log.info("[DRY RUN] Would update item %s: %s", item_id, fields.get("name", "?"))
            return {"id": item_id, "fieldData": fields}
        return await self._request(
            "PATCH",
            f"/collections/{collection_id}/items/{item_id}",
            json_body={"fieldData": fields},
        )

    async def publish_items(self, collection_id: str, item_ids: list[str]) -> dict:
        """Publish a batch of items."""
        if self._dry_run:
            log.info("[DRY RUN] Would publish %d items", len(item_ids))
            return {}
        return await self._request(
            "POST",
            f"/collections/{collection_id}/items/publish",
            json_body={"itemIds": item_ids},
        )

    async def upload_image(self, collection_id: str, item_id: str, field_slug: str,
                           image_bytes: bytes, filename: str) -> dict:
        """Upload an image to a Webflow CMS image field using multipart form."""
        if self._dry_run:
            log.info("[DRY RUN] Would upload image %s for item %s", filename, item_id)
            return {}
        await rate_limiter.acquire()
        url = (
            f"{WEBFLOW_API_BASE}/collections/{collection_id}"
            f"/items/{item_id}/fields/{field_slug}"
        )
        files = {"file": (filename, image_bytes, "image/webp")}
        headers = {
            "Authorization": f"Bearer {WEBFLOW_API_TOKEN}",
            "Accept": "application/json",
        }
        resp = await self._client.post(
            url, headers=headers, files=files, timeout=60.0
        )
        resp.raise_for_status()
        return resp.json() if resp.status_code != 204 else {}


# ---------------------------------------------------------------------------
# Core sync logic
# ---------------------------------------------------------------------------


def talent_to_cms_fields(profile: dict) -> dict:
    """Map a Syngency talent profile to Webflow CMS field data."""
    name = (profile.get("name") or profile.get("first_name", "")).strip()
    role = (profile.get("role") or profile.get("category") or "Model").strip()
    city = (profile.get("city") or profile.get("location") or "").strip()
    division = (profile.get("_division") or "").strip()
    bio = (profile.get("bio") or profile.get("description") or "").strip()
    slug = slugify(f"{name}-{role}-{city}") if city else slugify(f"{name}-{role}")

    return {
        "name": name,
        "slug": slug,
        "role": role,
        "city": city,
        "division": division,
        "bio": bio,
        "_syngency_id": str(profile.get("id", "")),
        # height, measurements, etc. can be added as the CMS schema grows
        "height": profile.get("height", ""),
        "hair-color": profile.get("hair_color", profile.get("hair", "")),
        "eye-color": profile.get("eye_color", profile.get("eyes", "")),
    }


def get_headshot_url(profile: dict) -> str | None:
    """Extract the primary headshot/photo URL from a Syngency profile."""
    # Try common field names
    for key in ("headshot", "photo", "thumbnail", "image", "primary_image"):
        val = profile.get(key)
        if val and isinstance(val, str) and val.startswith("http"):
            return val
    # Try nested photos array
    photos = profile.get("photos") or profile.get("images") or []
    if photos and isinstance(photos, list):
        first = photos[0]
        if isinstance(first, str):
            return first
        if isinstance(first, dict):
            return first.get("url") or first.get("src") or first.get("original")
    return None


async def sync_talent(
    syngency: SyngencyClient,
    webflow: WebflowClient,
    collection_id: str,
    dry_run: bool = False,
) -> None:
    """Main sync: pull from Syngency, push to Webflow."""

    # 1. Pull all talent from Syngency
    log.info("Fetching talent from Syngency...")
    all_talent = await syngency.get_all_talent()
    if not all_talent:
        log.warning("No talent profiles returned from Syngency. Exiting.")
        return

    # 2. Pull existing CMS items so we can upsert
    log.info("Fetching existing Webflow CMS items...")
    existing_items = await webflow.list_collection_items(collection_id)
    existing_by_syngency_id: dict[str, dict] = {}
    for item in existing_items:
        fd = item.get("fieldData", {})
        sid = fd.get("_syngency_id") or fd.get("syngency-id") or ""
        if sid:
            existing_by_syngency_id[sid] = item
    log.info("Found %d existing CMS items", len(existing_by_syngency_id))

    created = 0
    updated = 0
    errored = 0
    publish_ids: list[str] = []

    for idx, profile in enumerate(all_talent, 1):
        pid = str(profile.get("id", ""))
        name = profile.get("name") or profile.get("first_name") or "Unknown"
        log.info("[%d/%d] Processing: %s (id=%s)", idx, len(all_talent), name, pid)

        try:
            fields = talent_to_cms_fields(profile)

            # --- Image processing ---
            img_url = get_headshot_url(profile)
            image_filename = None
            image_webp = None
            if img_url:
                raw = await syngency.download_image(img_url)
                if raw:
                    role = fields.get("role", "Model")
                    city = fields.get("city", "")
                    image_filename = build_image_filename(name, role, city)
                    image_webp = convert_to_webp(raw)
                    fields["headshot-alt"] = build_alt_text(role, "", "", city)
                    log.info(
                        "  Image: %s (%.1f KB)",
                        image_filename,
                        len(image_webp) / 1024,
                    )

            # --- Upsert to Webflow ---
            existing = existing_by_syngency_id.get(pid)
            if existing:
                item_id = existing["id"]
                result = await webflow.update_item(collection_id, item_id, fields)
                updated += 1
                log.info("  Updated CMS item %s", item_id)
            else:
                result = await webflow.create_item(collection_id, fields)
                item_id = result.get("id", "")
                created += 1
                log.info("  Created CMS item %s", item_id)

            # Upload image if available
            if image_webp and image_filename and item_id and item_id != "dry-run":
                await webflow.upload_image(
                    collection_id, item_id, "headshot", image_webp, image_filename
                )
                log.info("  Uploaded headshot for %s", name)

            if item_id and item_id != "dry-run":
                publish_ids.append(item_id)

        except Exception:
            errored += 1
            log.exception("  Error processing talent %s (id=%s)", name, pid)

    # 3. Publish all changed items in batches of 100
    if publish_ids and not dry_run:
        log.info("Publishing %d items...", len(publish_ids))
        for i in range(0, len(publish_ids), 100):
            batch = publish_ids[i : i + 100]
            try:
                await webflow.publish_items(collection_id, batch)
                log.info("  Published batch %d-%d", i + 1, i + len(batch))
            except Exception:
                log.exception("  Failed to publish batch starting at index %d", i)

    log.info(
        "Sync complete: %d created, %d updated, %d errors (of %d total)",
        created,
        updated,
        errored,
        len(all_talent),
    )


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Sync talent profiles from Syngency to Webflow CMS",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Run without writing to Webflow (read-only mode)",
    )
    parser.add_argument(
        "--collection-id",
        default=os.environ.get("WEBFLOW_COLLECTION_ID", ""),
        help="Webflow CMS collection ID (or set WEBFLOW_COLLECTION_ID env var)",
    )
    parser.add_argument(
        "--verbose",
        "-v",
        action="store_true",
        help="Enable debug-level logging",
    )
    return parser.parse_args()


async def main() -> None:
    args = parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    if args.dry_run:
        log.info("=== DRY RUN MODE -- no writes will be made ===")

    # Validate env vars (Webflow creds not needed in dry-run if we skip writes,
    # but we still need them to read existing items)
    if not args.dry_run:
        if not WEBFLOW_SITE_ID:
            log.error("WEBFLOW_SITE_ID environment variable is not set.")
            sys.exit(1)
        if not WEBFLOW_API_TOKEN:
            log.error("WEBFLOW_API_TOKEN environment variable is not set.")
            sys.exit(1)

    async with httpx.AsyncClient() as client:
        syngency = SyngencyClient(client)
        webflow = WebflowClient(client, dry_run=args.dry_run)

        # Resolve collection ID
        collection_id = args.collection_id
        if not collection_id and WEBFLOW_SITE_ID:
            log.info("No collection ID specified -- listing site collections...")
            collections = await webflow.list_collections()
            if not collections:
                log.error("No collections found for site %s", WEBFLOW_SITE_ID)
                sys.exit(1)
            # Use the first collection (user can override with --collection-id)
            collection_id = collections[0]["id"]
            log.info(
                "Using collection '%s' (%s)",
                collections[0].get("displayName", "?"),
                collection_id,
            )

        if not collection_id:
            log.error(
                "No collection ID available. Provide --collection-id or set "
                "WEBFLOW_SITE_ID + WEBFLOW_API_TOKEN to auto-detect."
            )
            sys.exit(1)

        await sync_talent(syngency, webflow, collection_id, dry_run=args.dry_run)


if __name__ == "__main__":
    asyncio.run(main())
