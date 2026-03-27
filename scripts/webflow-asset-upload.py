#!/usr/bin/env python3
"""
TLC Models -- Webflow Asset Uploader
=====================================
Uploads brand assets to Webflow Asset Manager via API v2.

Features:
  - Converts images to WebP (via Pillow)
  - Resizes to max 1920x1080 maintaining aspect ratio
  - Compresses to under 500 KB
  - Generates SEO-friendly filenames with tlc-models prefix
  - Generates structured alt text
  - Uploads via Webflow API v2 POST /sites/{site_id}/assets
  - Supports --dry-run mode

Requirements:
  pip install httpx Pillow

Environment variables:
  WEBFLOW_API_TOKEN  -- Webflow API v2 bearer token
  WEBFLOW_SITE_ID    -- Target Webflow site ID
"""

import argparse
import io
import logging
import os
import re
import sys
from pathlib import Path

try:
    import httpx
except ImportError:
    sys.exit("ERROR: httpx is required. Install with: pip install httpx")

try:
    from PIL import Image
except ImportError:
    sys.exit("ERROR: Pillow is required. Install with: pip install Pillow")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
WEBFLOW_API_BASE = "https://api.webflow.com/v2"
MAX_WIDTH = 1920
MAX_HEIGHT = 1080
MAX_FILE_SIZE = 500 * 1024  # 500 KB
SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".tif", ".webp"}

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("webflow-upload")

# ---------------------------------------------------------------------------
# Filename & alt-text helpers
# ---------------------------------------------------------------------------

def to_kebab_case(text: str) -> str:
    """Convert a string to kebab-case, stripping non-alphanumeric chars."""
    text = text.strip().lower()
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"-{2,}", "-", text)
    return text.strip("-")


def generate_seo_filename(original_path: Path) -> str:
    """
    Generate an SEO-friendly filename with tlc-models prefix.
    Example: tlc-models-brand-ambassador-nightclub-launch-las-vegas.webp
    """
    stem = original_path.stem
    kebab = to_kebab_case(stem)
    if not kebab.startswith("tlc-models"):
        kebab = f"tlc-models-{kebab}"
    return f"{kebab}.webp"


def generate_alt_text(original_path: Path) -> str:
    """
    Generate alt text using the formula:
      [Brand] [Staff Role] -- [Event Name] [Service Category] [City]

    Parses tokens from the original filename. Falls back to a sensible default.
    Expected filename convention (underscores or hyphens):
      role_eventname_category_city.ext
    """
    stem = original_path.stem
    # Split on underscores, hyphens, or camelCase boundaries
    tokens = re.split(r"[-_ ]+", stem)
    tokens = [t.strip() for t in tokens if t.strip()]

    if len(tokens) >= 4:
        role = tokens[0].title()
        event = tokens[1].title()
        category = tokens[2].title()
        city = " ".join(t.title() for t in tokens[3:])
        return f"TLC Models {role} -- {event} {category} {city}"
    elif len(tokens) >= 2:
        description = " ".join(t.title() for t in tokens)
        return f"TLC Models {description}"
    else:
        return f"TLC Models Event Staffing -- {stem.title()}"


# ---------------------------------------------------------------------------
# Image processing
# ---------------------------------------------------------------------------

def process_image(file_path: Path) -> tuple[bytes, str]:
    """
    Open an image, resize to fit within MAX_WIDTH x MAX_HEIGHT,
    convert to WebP, and compress to under MAX_FILE_SIZE.

    Returns (webp_bytes, seo_filename).
    """
    seo_name = generate_seo_filename(file_path)

    img = Image.open(file_path)

    # Convert RGBA/P to RGB for WebP compatibility (strip alpha if needed)
    if img.mode in ("RGBA", "P", "LA"):
        background = Image.new("RGB", img.size, (255, 255, 255))
        if img.mode == "P":
            img = img.convert("RGBA")
        background.paste(img, mask=img.split()[-1] if "A" in img.mode else None)
        img = background
    elif img.mode != "RGB":
        img = img.convert("RGB")

    # Resize maintaining aspect ratio
    img.thumbnail((MAX_WIDTH, MAX_HEIGHT), Image.LANCZOS)

    # Compress -- start at quality 85 and reduce until under MAX_FILE_SIZE
    quality = 85
    while quality >= 10:
        buffer = io.BytesIO()
        img.save(buffer, format="WEBP", quality=quality, method=4)
        data = buffer.getvalue()
        if len(data) <= MAX_FILE_SIZE:
            log.info(
                "Processed %s -> %s (%d KB, q=%d, %dx%d)",
                file_path.name, seo_name, len(data) // 1024, quality,
                img.width, img.height,
            )
            return data, seo_name
        quality -= 5

    # If still too large at q=10, return what we have
    log.warning(
        "Could not compress %s below 500 KB (got %d KB at q=10)",
        file_path.name, len(data) // 1024,
    )
    return data, seo_name


# ---------------------------------------------------------------------------
# Webflow upload
# ---------------------------------------------------------------------------

def upload_to_webflow(
    client: httpx.Client,
    site_id: str,
    image_data: bytes,
    filename: str,
    alt_text: str,
    dry_run: bool = False,
) -> str | None:
    """
    Upload an asset to Webflow via API v2.

    Webflow's v2 asset upload is a two-step process:
      1. POST /sites/{site_id}/assets to get a presigned upload URL
      2. POST the file to the presigned URL

    Returns the final hosted URL or None on failure.
    """
    if dry_run:
        log.info("[DRY RUN] Would upload: %s (alt: %s) -- %d KB", filename, alt_text, len(image_data) // 1024)
        return None

    # Step 1: Request an upload URL from Webflow
    try:
        resp = client.post(
            f"{WEBFLOW_API_BASE}/sites/{site_id}/assets",
            json={
                "fileName": filename,
                "fileHash": "",  # Webflow calculates server-side
                "displayName": filename,
                "altText": alt_text,
            },
        )
        resp.raise_for_status()
    except httpx.HTTPStatusError as e:
        log.error("Webflow API error requesting upload URL for %s: %s -- %s", filename, e.response.status_code, e.response.text)
        return None
    except httpx.RequestError as e:
        log.error("Network error requesting upload URL for %s: %s", filename, e)
        return None

    payload = resp.json()
    upload_url = payload.get("uploadUrl", "")
    upload_details = payload.get("uploadDetails", {})
    asset_url = payload.get("hostedUrl") or payload.get("url", "")

    if not upload_url:
        log.error("No upload URL returned for %s. Response: %s", filename, payload)
        return None

    # Step 2: Upload the file to the presigned URL
    try:
        # Build multipart form from uploadDetails + the actual file
        form_fields = {k: v for k, v in upload_details.items() if isinstance(v, str)}
        files = {"file": (filename, image_data, "image/webp")}

        upload_resp = client.post(upload_url, data=form_fields, files=files)
        upload_resp.raise_for_status()
    except httpx.HTTPStatusError as e:
        log.error("Upload error for %s: %s -- %s", filename, e.response.status_code, e.response.text)
        return None
    except httpx.RequestError as e:
        log.error("Network error uploading %s: %s", filename, e)
        return None

    log.info("Uploaded: %s -> %s", filename, asset_url)
    return asset_url


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Upload TLC Models brand assets to Webflow Asset Manager (API v2)."
    )
    parser.add_argument(
        "directory",
        type=str,
        help="Path to directory containing image files to upload.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        default=False,
        help="Process and log images without uploading to Webflow.",
    )
    args = parser.parse_args()

    # Validate environment variables
    api_token = os.environ.get("WEBFLOW_API_TOKEN")
    site_id = os.environ.get("WEBFLOW_SITE_ID")

    if not api_token:
        sys.exit("ERROR: WEBFLOW_API_TOKEN environment variable is not set.")
    if not site_id:
        sys.exit("ERROR: WEBFLOW_SITE_ID environment variable is not set.")

    # Validate directory
    dir_path = Path(args.directory).resolve()
    if not dir_path.is_dir():
        sys.exit(f"ERROR: '{args.directory}' is not a valid directory.")

    # Gather image files
    image_files = sorted(
        f for f in dir_path.iterdir()
        if f.is_file() and f.suffix.lower() in SUPPORTED_EXTENSIONS
    )

    if not image_files:
        log.warning("No supported image files found in %s", dir_path)
        sys.exit(0)

    log.info("Found %d image(s) in %s", len(image_files), dir_path)
    if args.dry_run:
        log.info("=== DRY RUN MODE -- no uploads will be performed ===")

    # Set up httpx client with Webflow auth headers
    headers = {
        "Authorization": f"Bearer {api_token}",
        "Accept": "application/json",
    }
    client = httpx.Client(headers=headers, timeout=30.0)

    results = {"uploaded": 0, "failed": 0, "skipped": 0}

    try:
        for file_path in image_files:
            log.info("Processing: %s", file_path.name)
            try:
                image_data, seo_filename = process_image(file_path)
                alt_text = generate_alt_text(file_path)

                url = upload_to_webflow(
                    client=client,
                    site_id=site_id,
                    image_data=image_data,
                    filename=seo_filename,
                    alt_text=alt_text,
                    dry_run=args.dry_run,
                )

                if args.dry_run:
                    results["skipped"] += 1
                elif url:
                    results["uploaded"] += 1
                else:
                    results["failed"] += 1

            except Exception as e:
                log.error("Failed to process %s: %s", file_path.name, e)
                results["failed"] += 1
    finally:
        client.close()

    # Summary
    log.info("=" * 50)
    log.info(
        "Complete. Uploaded: %d | Failed: %d | Skipped (dry-run): %d",
        results["uploaded"], results["failed"], results["skipped"],
    )


if __name__ == "__main__":
    main()
