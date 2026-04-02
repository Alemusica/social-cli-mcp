#!/usr/bin/env python3
"""
IG Competitor Dump — Lago Maggiore Academy

Dump dati profili Instagram competitor usando Playwright + cookies autenticati.
Pattern presi dal Sintetizzatore MediaPack (profile_analyzer.py + browser.py).

Senza Apify. Solo tool custom.

Usage:
    python scripts/ig-competitor-dump.py
"""

import json
import math
import random
import re
import sys
import time
from dataclasses import dataclass, field, asdict
from pathlib import Path
from datetime import datetime

# ── Config ─────────────────────────────────────────────────────

COOKIES_PATH = Path.home() / "sintetizzatore mediapack" / "data" / "sessions" / "instagram" / "cookies.txt"
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "docs" / "clients" / "lago-maggiore-academy" / "data"

PROFILES = [
    {"handle": "lago_maggiore_academy", "label": "LMA (client)"},
    {"handle": "bavenostresasgs", "label": "Baveno Stresa SGS"},
    {"handle": "ssdbavenostresa", "label": "SSD Baveno Stresa"},
    {"handle": "ssdverbaniacalcio", "label": "SSD Verbania Calcio"},
    {"handle": "cannobiese1906", "label": "USD Cannobiese 1906"},
]

MAX_POSTS_PER_PROFILE = 12  # ultimi N post per engagement analysis

# Anti-rate-limit: pausa random tra profili (secondi)
INTER_PROFILE_DELAY = (60, 120)
# Warm-up: scroll feed prima di iniziare
WARMUP_SCROLLS = 3
# Merge con dump precedente: skip profili già completi
FORCE_RESCRAPE = "--force" in sys.argv

# Rate limit flag (set by API calls on 401/429)
_api_rate_limited = False


# ── Data models ────────────────────────────────────────────────

@dataclass
class PostData:
    url: str = ""
    shortcode: str = ""
    like_count: int = 0
    comment_count: int = 0
    caption: str = ""
    is_video: bool = False
    timestamp: str = ""
    engagement_rate: float = 0.0


@dataclass
class ProfileDump:
    handle: str = ""
    label: str = ""
    display_name: str = ""
    bio: str = ""
    follower_count: int = 0
    following_count: int = 0
    post_count: int = 0
    is_verified: bool = False
    profile_image_url: str = ""
    avg_engagement_rate: float = 0.0
    avg_likes: float = 0.0
    avg_comments: float = 0.0
    posts: list = field(default_factory=list)
    content_types: dict = field(default_factory=dict)  # image/video/carousel counts
    top_posts: list = field(default_factory=list)  # top 3 by engagement
    gaps: list = field(default_factory=list)  # identified weaknesses
    scraped_at: str = ""
    error: str = ""


# ── Cookie loader ──────────────────────────────────────────────

def load_chrome_cookies() -> list[dict]:
    """Extract Instagram cookies from Chrome via browser_cookie3."""
    try:
        import browser_cookie3
        cj = browser_cookie3.chrome(domain_name='.instagram.com')
        cookies = []
        for c in cj:
            cookie = {
                "name": c.name,
                "value": c.value,
                "domain": c.domain,
                "path": c.path,
                "secure": bool(c.secure),
                "httpOnly": False,
            }
            if c.expires and c.expires > 0:
                max_exp = int(time.time()) + 63072000
                cookie["expires"] = min(c.expires, max_exp)
            cookies.append(cookie)
        return cookies
    except Exception as exc:
        print(f"  ⚠ Chrome cookie extraction failed: {exc}")
        return []


def load_netscape_cookies(path: Path) -> list[dict]:
    """Parse Netscape cookies.txt into Playwright format (fallback)."""
    cookies = []
    if not path.exists():
        return cookies
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split("\t")
        if len(parts) < 7:
            continue
        domain, _, path_val, secure, expires, name, value = parts[:7]
        cookie = {
            "name": name,
            "value": value.strip('"'),
            "domain": domain,
            "path": path_val,
            "secure": secure.upper() == "TRUE",
            "httpOnly": False,
        }
        exp = int(expires)
        if exp > 0:
            max_exp = int(time.time()) + 63072000
            cookie["expires"] = min(exp, max_exp)
        cookies.append(cookie)
    return cookies


# ── Count parser (from Sintetizzatore profile_analyzer.py) ─────

def parse_count(text: str) -> int:
    """Parse '1,234' or '6.1K' or '1.2M' into int."""
    text = text.strip().replace(",", "").replace(" ", "")
    multipliers = {"k": 1_000, "m": 1_000_000, "b": 1_000_000_000}
    for suffix, mult in multipliers.items():
        if text.lower().endswith(suffix):
            try:
                return int(float(text[:-1]) * mult)
            except ValueError:
                return 0
    try:
        return int(float(text))
    except ValueError:
        return 0


def parse_ig_meta_counts(text: str) -> dict:
    """Parse 'NNN Followers, NNN Following, NNN Posts' from og:description.

    Handles both English and Italian IG format:
    - EN: "220 Followers, 38 Following, 16 Posts"
    - IT: "220 follower, 38 seguiti, 16 post"
    """
    counts = {}
    text_lower = text.lower()
    m = re.search(r"([\d,.]+[KMBkmb]?)\s*follower", text_lower)
    if m:
        counts["followers"] = parse_count(m.group(1))
    m = re.search(r"([\d,.]+[KMBkmb]?)\s*(?:following|seguiti)", text_lower)
    if m:
        counts["following"] = parse_count(m.group(1))
    m = re.search(r"([\d,.]+[KMBkmb]?)\s*post", text_lower)
    if m:
        counts["posts"] = parse_count(m.group(1))
    return counts


# ── Profile extraction ─────────────────────────────────────────

def extract_profile(page, handle: str, label: str, req_session=None) -> ProfileDump:
    """Extract profile data from Instagram profile page."""
    dump = ProfileDump(
        handle=handle,
        label=label,
        scraped_at=datetime.now().isoformat(),
    )

    url = f"https://www.instagram.com/{handle}/"
    print(f"\n{'='*60}")
    print(f"  Profilo: @{handle} ({label})")
    print(f"{'='*60}")

    try:
        page.goto(url, wait_until="domcontentloaded", timeout=30000)
        time.sleep(3)  # aspetta rendering JS
    except Exception as exc:
        dump.error = f"Navigation failed: {exc}"
        print(f"  ✗ Navigazione fallita: {exc}")
        return dump

    # ── Debug: check login state ──
    try:
        debug = page.evaluate("""() => {
            const og_desc = document.querySelector('meta[property="og:description"]');
            const og_title = document.querySelector('meta[property="og:title"]');
            const loginForm = document.querySelector('input[name="username"]');
            return {
                og_desc: og_desc ? og_desc.getAttribute('content') : '(none)',
                og_title: og_title ? og_title.getAttribute('content') : '(none)',
                has_login_form: !!loginForm,
                url: window.location.href,
                title: document.title,
            };
        }""")
        print(f"  [debug] URL: {debug.get('url')}")
        print(f"  [debug] Title: {debug.get('title')}")
        print(f"  [debug] og:desc: {debug.get('og_desc', '(none)')[:120]}")
        print(f"  [debug] Login form: {debug.get('has_login_form')}")
        # Screenshot for first profile
        if handle == PROFILES[0]["handle"]:
            ss_path = OUTPUT_DIR / f"screenshot-{handle}.png"
            page.screenshot(path=str(ss_path))
            print(f"  [debug] Screenshot: {ss_path}")
    except Exception as exc:
        print(f"  [debug] Debug extraction failed: {exc}")

    # ── Meta tags ──
    try:
        og_desc = page.evaluate("""() => {
            const el = document.querySelector('meta[property="og:description"]');
            return el ? el.getAttribute('content') : '';
        }""")
        if og_desc:
            # IT: "220 follower, 38 seguiti, 16 post - Vedi le foto..."
            # EN: "220 Followers, 38 Following, 16 Posts - See..."
            parts = og_desc.split(" - ", 1)
            stats_part = parts[0] if parts else og_desc
            counts = parse_ig_meta_counts(stats_part)
            dump.follower_count = counts.get("followers", 0)
            dump.following_count = counts.get("following", 0)
            dump.post_count = counts.get("posts", 0)
            # Bio: after the dash, clean "Vedi le foto..." prefix
            if len(parts) > 1:
                bio_raw = parts[1].strip()
                # Remove "Vedi le foto e i video di Instagram di..." or "See...photos..."
                bio_raw = re.sub(r"^(?:Vedi le foto e i video di Instagram di|See Instagram photos and videos from)\s*", "", bio_raw)
                bio_raw = re.sub(r"^@\w+\s*", "", bio_raw).strip()
                if bio_raw:
                    dump.bio = bio_raw
            print(f"  Follower: {dump.follower_count:,} | Following: {dump.following_count:,} | Post: {dump.post_count}")
    except Exception as exc:
        print(f"  ⚠ og:description extraction failed: {exc}")

    try:
        og_title = page.evaluate("""() => {
            const el = document.querySelector('meta[property="og:title"]');
            return el ? el.getAttribute('content') : '';
        }""")
        if og_title:
            name_match = re.match(r"^(.+?)\s*\(@", og_title)
            dump.display_name = name_match.group(1).strip() if name_match else og_title.split("(")[0].strip()
            print(f"  Nome: {dump.display_name}")
    except Exception:
        pass

    try:
        og_image = page.evaluate("""() => {
            const el = document.querySelector('meta[property="og:image"]');
            return el ? el.getAttribute('content') : '';
        }""")
        if og_image:
            dump.profile_image_url = og_image
    except Exception:
        pass

    # ── Verified badge ──
    try:
        verified = page.evaluate("""() => {
            const badge = document.querySelector(
                '[aria-label="Verified"], [title="Verified"], svg[aria-label="Verified"]'
            );
            return !!badge;
        }""")
        dump.is_verified = bool(verified)
        if dump.is_verified:
            print(f"  ✓ Verificato")
    except Exception:
        pass

    # ── DOM counts fallback ──
    if dump.follower_count == 0:
        try:
            counts_text = page.evaluate("""() => {
                const items = document.querySelectorAll('header li, header ul li');
                return Array.from(items).map(el => el.textContent || '').join('|||');
            }""")
            if counts_text:
                for segment in counts_text.split("|||"):
                    seg_lower = segment.strip().lower()
                    if "follower" in seg_lower:
                        m = re.search(r"([\d,.]+[KMBkmb]?)", segment)
                        if m:
                            dump.follower_count = parse_count(m.group(1))
                    elif "following" in seg_lower:
                        m = re.search(r"([\d,.]+[KMBkmb]?)", segment)
                        if m:
                            dump.following_count = parse_count(m.group(1))
                    elif "post" in seg_lower:
                        m = re.search(r"([\d,.]+[KMBkmb]?)", segment)
                        if m:
                            dump.post_count = parse_count(m.group(1))
                if dump.follower_count:
                    print(f"  Follower (DOM): {dump.follower_count:,}")
        except Exception:
            pass

    # ── Post extraction ──
    print(f"  Estrazione post (max {MAX_POSTS_PER_PROFILE})...")

    # Try requests API first (most reliable)
    posts = []
    if req_session:
        posts = extract_posts_via_requests(handle, dump.follower_count, req_session)

    if not posts:
        # Fallback: DOM links → visit each post
        post_links = extract_post_links_from_page(page, handle)
        if not post_links:
            post_links = extract_post_links_from_source(page, handle)
        posts = visit_posts(page, post_links, handle, dump.follower_count)

    dump.posts = [asdict(p) for p in posts]

    if posts:
        total_likes = sum(p.like_count for p in posts)
        total_comments = sum(p.comment_count for p in posts)
        n = len(posts)
        dump.avg_likes = round(total_likes / n, 1)
        dump.avg_comments = round(total_comments / n, 1)

        if dump.follower_count > 0:
            dump.avg_engagement_rate = round(
                ((total_likes + total_comments) / n) / dump.follower_count * 100, 2
            )

        # Content types
        videos = sum(1 for p in posts if p.is_video)
        images = n - videos
        dump.content_types = {"image": images, "video": videos, "total": n}

        # Top 3 by engagement
        sorted_posts = sorted(posts, key=lambda p: p.like_count + p.comment_count, reverse=True)
        dump.top_posts = [asdict(p) for p in sorted_posts[:3]]

        print(f"  Post estratti: {n}")
        print(f"  Media like: {dump.avg_likes:.0f} | Media commenti: {dump.avg_comments:.0f}")
        print(f"  Engagement rate: {dump.avg_engagement_rate:.2f}%")
        print(f"  Video: {videos} | Immagini: {images}")
    else:
        print(f"  ⚠ Nessun post estratto")

    # ── Gap analysis ──
    dump.gaps = identify_gaps(dump)
    if dump.gaps:
        print(f"  Lacune: {len(dump.gaps)}")
        for g in dump.gaps:
            print(f"    - {g}")

    return dump


def extract_posts_via_requests(handle: str, follower_count: int, session) -> list[PostData]:
    """Use IG internal API via requests (not Playwright) with Chrome session cookies."""
    global _api_rate_limited
    if _api_rate_limited:
        print(f"    ⏭ API skip (rate limited in questa sessione)")
        return []

    url = f"https://www.instagram.com/api/v1/users/web_profile_info/?username={handle}"
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/131.0.0.0 Safari/537.36"
        ),
        "X-Requested-With": "XMLHttpRequest",
        "X-IG-App-ID": "936619743392459",
        "Accept": "*/*",
        "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
        "Referer": f"https://www.instagram.com/{handle}/",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
    }

    # Add CSRF from cookies
    csrf = None
    for c in session.cookies:
        if c.name == "csrftoken":
            csrf = c.value
            break
    if csrf:
        headers["X-CSRFToken"] = csrf

    try:
        resp = session.get(url, headers=headers, timeout=15)
        if resp.status_code in (401, 429):
            _api_rate_limited = True
            print(f"    ⚠ Rate limit (HTTP {resp.status_code}) — API disabilitata per il resto della sessione")
            return []
        if resp.status_code != 200:
            print(f"    API requests: HTTP {resp.status_code}")
            return []

        data = resp.json()
    except Exception as exc:
        print(f"    API requests error: {exc}")
        return []

    user = data.get("data", {}).get("user", {})
    media = user.get("edge_owner_to_timeline_media", {})
    edges = media.get("edges", [])

    if not edges:
        print(f"    API: nessun edge")
        return []

    posts = []
    for edge in edges[:MAX_POSTS_PER_PROFILE]:
        node = edge.get("node", {})
        sc = node.get("shortcode", "")
        is_video = node.get("is_video", False)
        typename = node.get("__typename", "")

        likes = node.get("edge_liked_by", {}).get("count", 0)
        if not likes:
            likes = node.get("edge_media_preview_like", {}).get("count", 0)
        comments = node.get("edge_media_to_comment", {}).get("count", 0)
        if not comments:
            comments = node.get("edge_media_preview_comment", {}).get("count", 0)

        caption_edges = node.get("edge_media_to_caption", {}).get("edges", [])
        caption = caption_edges[0].get("node", {}).get("text", "") if caption_edges else ""

        ts = node.get("taken_at_timestamp", 0)
        timestamp = datetime.fromtimestamp(ts).isoformat() if ts else ""

        eng_rate = 0.0
        if follower_count > 0:
            eng_rate = round((likes + comments) / follower_count * 100, 2)

        post = PostData(
            url=f"https://www.instagram.com/{'reel' if is_video else 'p'}/{sc}/",
            shortcode=sc,
            like_count=likes,
            comment_count=comments,
            caption=caption[:200],
            is_video=is_video or "Video" in typename,
            timestamp=timestamp,
            engagement_rate=eng_rate,
        )
        posts.append(post)

        icon = "R" if post.is_video else "P"
        print(f"    [{icon}] {sc}: {likes} like  {comments} comm  ({eng_rate:.1f}%)")

    print(f"    Totale da API: {len(posts)} post")
    return posts


def extract_post_links_from_page(page, handle: str) -> list[str]:
    """Try extracting post links from DOM (works when logged in)."""
    try:
        post_links = page.evaluate(f"""() => {{
            const all = document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]');
            const links = [];
            for (const a of all) {{
                const href = a.getAttribute('href');
                if (href) links.push(href);
            }}
            return [...new Set(links)].slice(0, {MAX_POSTS_PER_PROFILE});
        }}""")
        if post_links:
            print(f"    Link da DOM: {len(post_links)}")
        return post_links or []
    except Exception:
        return []


def extract_post_links_from_source(page, handle: str) -> list[str]:
    """Extract shortcodes from page source JSON (works even with login wall)."""
    try:
        html = page.content()
        shortcodes = set()
        for m in re.finditer(r'"shortcode"\s*:\s*"([A-Za-z0-9_-]{8,})"', html):
            shortcodes.add(m.group(1))
        for m in re.finditer(r'/(?:p|reel)/([A-Za-z0-9_-]{8,})/', html):
            shortcodes.add(m.group(1))

        links = [f"/p/{sc}/" for sc in list(shortcodes)[:MAX_POSTS_PER_PROFILE]]
        if links:
            print(f"    Link da source HTML: {len(links)}")
            return links
    except Exception:
        pass

    # Fallback: IG internal API via browser fetch
    print(f"    Tentativo API interna IG...")
    return extract_posts_via_api(page, handle)


def extract_posts_via_api(page, handle: str) -> list[str]:
    """Use IG's internal web_profile_info API to get recent posts.

    Makes the request from within the browser context (has cookies).
    """
    try:
        result = page.evaluate("""async ([handle]) => {
            try {
                // Get CSRF token from cookies
                const csrf = document.cookie.split(';')
                    .map(c => c.trim())
                    .find(c => c.startsWith('csrftoken='));
                const csrfToken = csrf ? csrf.split('=')[1] : '';
                const resp = await fetch(
                    `/api/v1/users/web_profile_info/?username=${handle}`,
                    {
                        method: 'GET',
                        headers: {
                            'X-Requested-With': 'XMLHttpRequest',
                            'X-IG-App-ID': '936619743392459',
                            'X-CSRFToken': csrfToken,
                        },
                        credentials: 'include',
                    }
                );
                if (!resp.ok) return {error: `HTTP ${resp.status}`, status: resp.status};
                const data = await resp.json();
                return data;
            } catch(e) {
                return {error: e.message};
            }
        }""", [handle])

        if not result or result.get("error"):
            err = result.get("error", "unknown") if result else "null response"
            print(f"    ⚠ API interna: {err}")
            return []

        # Navigate the response to find edge_owner_to_timeline_media
        user = result.get("data", {}).get("user", {})
        media = user.get("edge_owner_to_timeline_media", {})
        edges = media.get("edges", [])

        links = []
        for edge in edges[:MAX_POSTS_PER_PROFILE]:
            node = edge.get("node", {})
            sc = node.get("shortcode")
            if sc:
                is_video = node.get("is_video", False)
                link = f"/reel/{sc}/" if is_video else f"/p/{sc}/"
                links.append(link)

        if links:
            print(f"    Post da API interna: {len(links)}")
        else:
            print(f"    ⚠ API interna: nessun post trovato")
        return links

    except Exception as exc:
        print(f"    ⚠ API interna error: {exc}")
        return []


def visit_posts(page, post_links: list[str], handle: str, follower_count: int) -> list[PostData]:
    """Visit individual post pages and extract engagement from meta tags."""
    posts = []
    if not post_links:
        return posts

    for i, link in enumerate(post_links):
        post_url = f"https://www.instagram.com{link}" if link.startswith("/") else link
        shortcode = ""
        m = re.search(r"/(?:p|reel)/([^/]+)", link)
        if m:
            shortcode = m.group(1)

        post = PostData(url=post_url, shortcode=shortcode)
        is_video = "/reel/" in link

        try:
            page.goto(post_url, wait_until="domcontentloaded", timeout=20000)
            time.sleep(1.5)

            meta = page.evaluate("""() => {
                const desc = document.querySelector('meta[property="og:description"]');
                const title = document.querySelector('meta[property="og:title"]');
                const type = document.querySelector('meta[property="og:type"]');
                return {
                    description: desc ? desc.getAttribute('content') : '',
                    title: title ? title.getAttribute('content') : '',
                    type: type ? type.getAttribute('content') : '',
                };
            }""")

            desc = meta.get("description", "")
            # EN: "NNN likes, NNN comments - Handle on..."
            # IT: "NNN \"Mi piace\", NNN commenti - Handle su..."
            likes_m = re.search(r'([\d,.]+[KMBkmb]?)\s*(?:likes?|"?[Mm]i piace"?)', desc)
            comments_m = re.search(r"([\d,.]+[KMBkmb]?)\s*comment[io]?", desc)

            if likes_m:
                post.like_count = parse_count(likes_m.group(1))
            if comments_m:
                post.comment_count = parse_count(comments_m.group(1))

            # Caption
            caption_parts = desc.split(":", 1)
            if len(caption_parts) > 1:
                post.caption = caption_parts[1].strip()[:200]

            post.is_video = is_video or "video" in meta.get("type", "").lower()

            if follower_count > 0:
                post.engagement_rate = round(
                    (post.like_count + post.comment_count) / follower_count * 100, 2
                )

            icon = "R" if post.is_video else "P"
            print(f"    [{icon}] {shortcode}: {post.like_count} like  {post.comment_count} comm  ({post.engagement_rate:.1f}%)")

        except Exception as exc:
            print(f"    ⚠ {shortcode}: {exc}")

        posts.append(post)

        # Rate limiting — randomized per sembrare umano
        if i < len(post_links) - 1:
            time.sleep(random.uniform(1.5, 4.0))

    return posts


# ── Gap analysis ───────────────────────────────────────────────

def identify_gaps(dump: ProfileDump) -> list[str]:
    """Identify weaknesses/gaps based on data."""
    gaps = []

    if dump.post_count < 50:
        gaps.append(f"Volume basso: solo {dump.post_count} post totali")

    if dump.follower_count < 500:
        gaps.append(f"Audience ridotta: {dump.follower_count} follower")

    if dump.avg_engagement_rate < 1.0 and dump.avg_engagement_rate > 0:
        gaps.append(f"Engagement basso: {dump.avg_engagement_rate:.1f}% (media settore youth sport: 2-5%)")

    if dump.content_types.get("video", 0) == 0:
        gaps.append("Zero video/reel — perde reach organica IG")
    elif dump.content_types.get("total", 1) > 0:
        video_ratio = dump.content_types.get("video", 0) / dump.content_types.get("total", 1)
        if video_ratio < 0.2:
            gaps.append(f"Pochi video: solo {dump.content_types.get('video', 0)}/{dump.content_types.get('total', 0)} post analizzati sono video")

    if dump.avg_comments < 2:
        gaps.append(f"Interazione quasi assente: media {dump.avg_comments:.1f} commenti/post")

    if not dump.bio or len(dump.bio) < 20:
        gaps.append("Bio assente o troppo breve")

    return gaps


# ── Warm-up & merge ───────────────────────────────────────────

def warm_up_session(page):
    """Simulate human browsing before hitting API endpoints."""
    print("\n  Warm-up sessione (simula browsing umano)...")
    try:
        page.goto("https://www.instagram.com/", wait_until="domcontentloaded", timeout=30000)
        time.sleep(random.uniform(2, 4))

        for i in range(WARMUP_SCROLLS):
            page.evaluate("window.scrollBy(0, window.innerHeight * 0.7)")
            time.sleep(random.uniform(2, 4.5))

        # Visit explore page briefly
        page.goto("https://www.instagram.com/explore/", wait_until="domcontentloaded", timeout=20000)
        time.sleep(random.uniform(2, 3))
        page.evaluate("window.scrollBy(0, window.innerHeight * 0.5)")
        time.sleep(random.uniform(1.5, 3))

        print("  Warm-up completato")
    except Exception as exc:
        print(f"  Warm-up parziale: {exc}")


def load_previous_dump() -> dict[str, dict]:
    """Load most recent dump — profiles with engagement data can be skipped."""
    dumps = sorted(OUTPUT_DIR.glob("ig-dump-*.json"), reverse=True)
    if not dumps:
        return {}

    try:
        data = json.loads(dumps[0].read_text())
        result = {}
        for d in data:
            handle = d.get("handle", "")
            posts = d.get("posts", [])
            has_engagement = posts and any(p.get("like_count", 0) > 0 for p in posts)
            if handle and has_engagement:
                result[handle] = d
        if result:
            print(f"  Dump precedente: {dumps[0].name}")
            for h in result:
                print(f"    @{h}: {len(result[h]['posts'])} post con engagement — skip")
        return result
    except Exception as exc:
        print(f"  ⚠ Lettura dump precedente fallita: {exc}")
        return {}


# ── Main ───────────────────────────────────────────────────────

def main():
    from playwright.sync_api import sync_playwright

    import requests

    # Build requests session with Chrome cookies
    req_session = requests.Session()
    try:
        import browser_cookie3
        cj = browser_cookie3.chrome(domain_name='.instagram.com')
        req_session.cookies = cj
        cookie_names = [c.name for c in cj]
        print(f"Cookies da Chrome: {len(cookie_names)} ({', '.join(cookie_names)})")
        has_session = "ds_user_id" in cookie_names
        print(f"  Sessione IG attiva: {'SI' if has_session else 'NO'}")
    except Exception as exc:
        print(f"  Chrome cookies failed: {exc}")
        has_session = False

    if not has_session:
        print("ERRORE: sessione IG non trovata in Chrome.")
        sys.exit(1)

    # Build Playwright cookies from Chrome
    cookies = load_chrome_cookies()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # ── Load previous dump for merge ──
    previous = {}
    if not FORCE_RESCRAPE:
        previous = load_previous_dump()
    else:
        print("  --force: rescrape di tutti i profili")

    all_dumps = []

    with sync_playwright() as p:
        # Stealth browser (pattern dal Sintetizzatore browser.py)
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-first-run",
                "--no-default-browser-check",
            ],
        )
        context = browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/131.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1728, "height": 1117},
            device_scale_factor=2,
            locale="it-IT",
            timezone_id="Europe/Rome",
        )
        # Mask webdriver (Sintetizzatore anti-fingerprint)
        context.add_init_script(
            "Object.defineProperty(navigator, 'webdriver', {get: () => undefined});"
        )
        context.add_cookies(cookies)

        page = context.new_page()

        # ── Warm-up: simulate human browsing ──
        print("Stabilisco sessione IG...")
        try:
            page.goto("https://www.instagram.com/", wait_until="domcontentloaded", timeout=30000)
            time.sleep(random.uniform(2, 4))
            logged_in = page.evaluate("""() => {
                return !document.querySelector('input[name="username"]') &&
                       document.cookie.includes('ds_user_id');
            }""")
            print(f"  Login attivo: {'SI' if logged_in else 'NO'}")
            if not logged_in:
                print("  ⚠ Sessione non autenticata — i risultati potrebbero essere parziali")
        except Exception as exc:
            print(f"  ⚠ Homepage navigation: {exc}")

        warm_up_session(page)

        # ── Scrape profiles ──
        profiles_to_scrape = []
        for profile in PROFILES:
            handle = profile["handle"]
            if handle in previous:
                print(f"\n  ⏭ @{handle} — dati completi nel dump precedente, skip")
                all_dumps.append(previous[handle])
            else:
                profiles_to_scrape.append(profile)

        if not profiles_to_scrape:
            print("\n  Tutti i profili hanno già dati completi. Usa --force per riscrape.")
        else:
            print(f"\n  Profili da scrapare: {len(profiles_to_scrape)}")
            est_minutes = len(profiles_to_scrape) * sum(INTER_PROFILE_DELAY) / 2 / 60
            print(f"  Tempo stimato: ~{est_minutes:.0f} minuti (delay anti-rate-limit)")

        for idx, profile in enumerate(profiles_to_scrape):
            try:
                dump = extract_profile(page, profile["handle"], profile["label"], req_session)
                all_dumps.append(asdict(dump))
            except Exception as exc:
                print(f"\n  ✗ ERRORE @{profile['handle']}: {exc}")
                all_dumps.append(asdict(ProfileDump(
                    handle=profile["handle"],
                    label=profile["label"],
                    error=str(exc),
                    scraped_at=datetime.now().isoformat(),
                )))

            # ── Anti-rate-limit delay ──
            if idx < len(profiles_to_scrape) - 1:
                delay = random.uniform(*INTER_PROFILE_DELAY)
                print(f"\n  ⏳ Pausa anti-rate-limit: {delay:.0f}s...")
                time.sleep(delay)

        context.close()
        browser.close()

    # ── Save ──
    timestamp = datetime.now().strftime("%Y%m%d_%H%M")
    out_file = OUTPUT_DIR / f"ig-dump-{timestamp}.json"
    out_file.write_text(json.dumps(all_dumps, indent=2, ensure_ascii=False))
    print(f"\n{'='*60}")
    print(f"  Dump salvato: {out_file}")
    print(f"{'='*60}")

    # ── Summary ──
    print(f"\n📊 RIEPILOGO COMPETITOR")
    print(f"{'─'*60}")
    print(f"{'Handle':<25} {'Follower':>10} {'Post':>6} {'Eng%':>6} {'Avg❤':>8} {'Avg💬':>6}")
    print(f"{'─'*60}")
    complete = []
    incomplete = []
    for d in all_dumps:
        handle = d.get("handle", "?")
        has_posts = d.get("posts") and any(p.get("like_count", 0) > 0 for p in d.get("posts", []))
        if d.get("error"):
            print(f"  @{handle:<23} ERRORE: {d['error'][:40]}")
            incomplete.append(handle)
        elif has_posts:
            print(f"  @{handle:<23} {d['follower_count']:>10,} {d['post_count']:>6} {d['avg_engagement_rate']:>5.1f}% {d['avg_likes']:>7.0f} {d['avg_comments']:>5.0f}  ✓")
            complete.append(handle)
        else:
            print(f"  @{handle:<23} {d['follower_count']:>10,} {d['post_count']:>6}    —      —      —   (solo profilo)")
            incomplete.append(handle)
    print(f"{'─'*60}")
    print(f"  Completi: {len(complete)}/{len(all_dumps)} | Incompleti: {len(incomplete)}")
    if incomplete:
        print(f"  → Rilancia per completare: python3 {sys.argv[0]}")
        print(f"    Profili mancanti: {', '.join('@' + h for h in incomplete)}")
        print(f"    (il prossimo run skippa automaticamente i profili già completi)")

    return out_file


if __name__ == "__main__":
    main()
