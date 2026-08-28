<div align="center">

# Alex — ns0t

A personal portfolio site built entirely from scratch — vanilla HTML, CSS, and JavaScript, no frameworks, no build step.

**[ns0t.is-a.dev](https://ns0t.is-a.dev)**

</div>

---

## Overview

This is my personal corner of the internet: a single-page portfolio with a live Discord presence card, a GitHub contributions graph, an embedded music player, and a public guestbook — all hand-built without relying on any frontend framework. The layout was designed first in Figma, then implemented directly in HTML/CSS/JS.

## Features

**Live Discord presence**
Pulls real-time status, activity, and avatar (including avatar decorations) via the [Lanyard](https://github.com/Phineas/lanyard) API, refreshed every 5 seconds.

**GitHub contributions graph**
Custom-rendered contribution heatmap (no third-party chart library) fetched from the [jogruber GitHub Contributions API](https://github.com/jogruber/github-contributions-api).

**Guestbook**
Public comment wall backed by Supabase, with:
- Threaded replies
- GIF attachments (Klipy/Tenor/Giphy support)
- Honeypot field for basic bot/spam protection
- Word-based moderation filter
- Row Level Security (RLS) policies restricting writes

**Dynamic content system**
Work, skills, and tools sections are driven by a `portfolio_items` table in Supabase rather than hardcoded HTML, so the content can be updated without touching the codebase (managed through a private, gitignored admin panel).

**Embedded music player**
Custom audio player with play/pause, next/prev, scrubbing progress bar, and a volume slider — no third-party player library.

**Theme system**
Dark/light mode with system-preference detection on first load and persistence via `localStorage`. Applied before paint to avoid a flash of the wrong theme.

**Hover tooltips**
Contextual tooltips on key bio details (age, nationality, coding experience), including live-calculated values (age, years of experience) computed on load.

**Responsive layout**
The design uses an absolute-positioning "fixed canvas" approach calibrated for a ~1600px viewport, with responsive breakpoints layered on top for smaller and larger screens.

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Vanilla HTML, CSS, JavaScript |
| Backend / Data | [Supabase](https://supabase.com) (Postgres, RLS, Auth) |
| Hosting | [Netlify](https://netlify.com) |
| Design | [Figma](https://figma.com) |
| External APIs | Lanyard (Discord presence), jogruber Contributions API, Klipy/Tenor/Giphy (GIF search) |

## Project Structure

```
ns0t/
├── index.html          # Main single-page site
├── 404.html             # Custom 404 page
├── privacy.html         # Privacy policy
├── easteregg.html       # Hidden easter egg page
├── style.css            # All styling
├── script.js            # All site logic (Lanyard, guestbook, player, theming, etc.)
├── supabase.sql         # Schema for portfolio_items + portfolio_admins tables
├── assests/              # Images, logos, icons
├── icon/                # Favicon and small icons
└── music/               # Local audio files + cover art (gitignored)
```

> **Note:** `admin.html` / `admin.css` / `admin.js` (the private CMS used to manage guestbook and portfolio content) and `music/` are intentionally excluded via `.gitignore`.

## Running Locally

This is a static site — no build step required.

```bash
git clone https://github.com/NS0T/ns0t.git
cd ns0t
npx serve .
```

Then open the served URL in your browser.

### Environment / Backend Setup

The guestbook and dynamic portfolio content require a Supabase project:

1. Create a project at [supabase.com](https://supabase.com)
2. Run `supabase.sql` in the SQL editor to create the `portfolio_items` and `portfolio_admins` tables
3. Create the `guestbook_comments` and `guestbook_replies` tables (see `script.js` for the expected columns)
4. Update the Supabase URL/anon key in `script.js`

## License

No license file is currently included, which by default means all rights are reserved — feel free to browse the code for reference, but please don't copy or redistribute it without asking first.

## Author

**Alex**
- GitHub: [@NS0T](https://github.com/NS0T)
- Site: [ns0t.is-a.dev](https://ns0t.is-a.dev)
