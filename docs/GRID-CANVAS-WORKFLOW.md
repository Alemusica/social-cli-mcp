# Grid Canvas Workflow - Temporary 3x3 Instagram Grid

## Concept

Create a **temporary 3x3 grid** on Instagram that:
- Forms a unified image when viewed on your profile
- Can mix **carousel + reel + single post**
- Lasts **3 days** (or any duration you want)
- Announced via Stories as temporary
- Archived or deleted after expiry

---

## Why This Works

Instagram displays posts in **reverse chronological order**:
- Last post = top-left of grid
- First post = bottom-right of grid

By posting tiles in **reverse order**, your grid forms correctly!

---

## Workflow

### 1. Prepare Your Canvas Image

Create or choose a **large image** (e.g., 3000x3000px) that looks good split into 9 squares.

**Best formats:**
- Panoramic landscape (Greece coastline)
- Large text/quote overlaid on background
- Artistic composition designed for splitting
- Story arc visualized as grid

---

### 2. Generate Grid Tiles

```bash
npx tsx scripts/grid-canvas-generator.ts \
  media/greece-panorama.jpg \
  content/grid-canvas-1/
```

**Output:**
```
content/grid-canvas-1/
  ├── tile-1.jpg  (post first → bottom-right)
  ├── tile-2.jpg
  ├── tile-3.jpg
  ├── ...
  ├── tile-9.jpg  (post last → top-left)
  └── grid-metadata.json
```

---

### 3. (Optional) Configure Mixed Content

Create `content/grid-canvas-1/grid-config.json`:

```json
{
  "posts": [
    {
      "tile": "tile-1.jpg",
      "type": "single",
      "caption": "1/9 🧩 The journey begins..."
    },
    {
      "tile": "tile-2.jpg",
      "type": "carousel",
      "carouselImages": ["tile-2.jpg", "bts-1.jpg", "bts-2.jpg"],
      "caption": "2/9 🧩 Behind the scenes"
    },
    {
      "tile": "tile-3.jpg",
      "type": "reel",
      "videoUrl": "https://your-cdn.com/reel-3.mp4",
      "caption": "3/9 🧩 Watch this moment"
    },
    ... (continue for 9 tiles)
  ]
}
```

**Rules:**
- Each post can be `single`, `carousel`, or `reel`
- For **reels**: `tile-X.jpg` = cover image (thumbnail)
- For **carousels**: Include multiple images, first one = cover
- For **single**: Just the tile

---

### 4. Post the Grid

```bash
npx tsx scripts/grid-orchestrator.ts \
  content/grid-canvas-1/ \
  --expires-in-days=3
```

**What happens:**
1. Posts all 9 tiles in correct order (60s delay between each)
2. Saves tracking info (`grid-tracking.json`)
3. Sends Telegram notification with expiry date
4. Adds reminder to `analytics/pending-grid-actions.json`

---

### 5. Announce via Stories

**CRITICAL:** Tell your audience this grid is temporary!

**Story ideas:**
- "New grid canvas live! 🎨 3 days only, then it disappears"
- Countdown sticker with expiry time
- Poll: "Should I keep this grid or let it vanish?"
- Screenshot of the full grid + caption "Temporary art piece"

---

### 6. After Expiry (3 Days Later)

You'll get a **Telegram reminder**:

```
⏰ Grid Canvas Expired!

📁 grid-canvas-1
📸 9 posts

Options:
1. Archive manually via Instagram app (keeps engagement)
2. Delete via API: npx tsx scripts/delete-grid-canvas.ts grid-canvas-1
```

**Recommended:** Archive manually (API doesn't support it)

**Quick delete:** If you don't care about keeping the posts:
```bash
npx tsx scripts/delete-grid-canvas.ts grid-canvas-1
```

---

## Advanced Examples

### Example 1: Story Arc Grid (9 Chapters)

Each tile = chapter of a story (carousel with photos + caption)

```json
{
  "posts": [
    {
      "tile": "tile-1.jpg",
      "type": "carousel",
      "carouselImages": ["cover-1.jpg", "photo-1.jpg", "photo-2.jpg"],
      "caption": "Chapter 1: Arrival in Greece\n\nJuly 2021. €30 in my pocket..."
    },
    {
      "tile": "tile-2.jpg",
      "type": "carousel",
      "carouselImages": ["cover-2.jpg", "photo-3.jpg", "photo-4.jpg"],
      "caption": "Chapter 2: First Busking Session\n\nI found a quiet corner..."
    },
    ... (9 chapters total)
  ]
}
```

**Result:** People swipe through your entire Greece journey in 9 carousel posts forming a visual grid.

---

### Example 2: Reel Series Grid

9 short reels (10-15s each) with custom covers forming an image.

```json
{
  "posts": [
    {
      "tile": "tile-1.jpg",
      "type": "reel",
      "videoUrl": "https://cdn.com/reel-1.mp4",
      "caption": "1/9 🎥 RAV Vast at sunrise"
    },
    ... (9 reels)
  ]
}
```

**Result:** Grid shows unified cover image, but clicking each tile = different reel.

---

### Example 3: Mixed Content

- 3 reels (top row)
- 3 carousels (middle row)
- 3 single posts (bottom row)

```json
{
  "posts": [
    {"tile": "tile-1.jpg", "type": "single"},
    {"tile": "tile-2.jpg", "type": "single"},
    {"tile": "tile-3.jpg", "type": "single"},

    {"tile": "tile-4.jpg", "type": "carousel", "carouselImages": [...]},
    {"tile": "tile-5.jpg", "type": "carousel", "carouselImages": [...]},
    {"tile": "tile-6.jpg", "type": "carousel", "carouselImages": [...]},

    {"tile": "tile-7.jpg", "type": "reel", "videoUrl": "..."},
    {"tile": "tile-8.jpg", "type": "reel", "videoUrl": "..."},
    {"tile": "tile-9.jpg", "type": "reel", "videoUrl": "..."}
  ]
}
```

---

## Rate Limits & Best Practices

### Instagram API Limits
- **10 posts/day** recommended (self-imposed)
- Grid canvas = 9 posts = **use most of your daily budget**
- Post early in the day to avoid hitting limits

### Timing
- **60 seconds** between posts (hard-coded in orchestrator)
- Total time: ~9 minutes for full grid
- Best time: **Morning** (before peak hours)

### Hashtags
- Use **same 5 hashtags** on all 9 posts for theme coherence
- Or **different hashtags** on each to maximize reach
- Example unified: `#flutur #temporarygrid #3days #greece #gridart`

### Caption Strategy
- **Numbered captions**: "1/9 🧩", "2/9 🧩", etc.
- Tell people to **check your grid** for full image
- Mention it's **temporary** in each caption

---

## Monitoring Expiry

### Automatic Reminders

The system adds to `analytics/pending-grid-actions.json`:

```json
[
  {
    "action": "archive_grid_canvas",
    "grid": "grid-canvas-1",
    "postedIds": ["123...", "456...", ...],
    "expiresAt": "2026-01-28T14:00:00.000Z",
    "instructions": [
      "Go to Instagram app",
      "Archive these 9 posts manually",
      "Or run: npx tsx scripts/delete-grid-canvas.ts grid-canvas-1"
    ]
  }
]
```

### Manual Check

```bash
# List all pending grid actions
cat analytics/pending-grid-actions.json | jq '.[] | select(.action == "archive_grid_canvas")'
```

---

## FAQ

### Can I archive via API?
**No.** Instagram Graph API doesn't support archive/unarchive. You must do it manually via app.

### Can I delete via API?
**Yes.** Use `scripts/delete-grid-canvas.ts <grid-name>`.

### What if I want to keep it longer?
Just don't archive/delete! The expiry is just a reminder, not enforced.

### Can I mix portrait + landscape videos?
**No.** Instagram feed requires square (1:1) format. All tiles should be 1:1.

### Can I edit a tile after posting?
**No.** You can't edit cover images or media after posting via API.

**Solution:** Delete the wrong post and re-post with correct tile (grid will have gap temporarily).

### What if posting fails midway?
The orchestrator continues with remaining tiles. Check `grid-tracking.json` for `postedIds` to see what succeeded.

---

## Next Steps

1. **Create your first grid canvas**
2. **Test with a simple 3x3 image split**
3. **Announce via Stories**
4. **Monitor engagement during 3 days**
5. **Archive manually or delete via script**

**Pro tip:** Use this for:
- **Product launches** (3-day hype)
- **Story arcs** (Greece journey in 9 chapters)
- **Album releases** (9 songs = 9 tiles)
- **Event countdowns** (3 days until concert)

---

🎨 **Have fun with temporary grid art!**
