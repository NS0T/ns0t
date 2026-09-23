<div align="center">

# Alex — ns0t

A personal portfolio site built entirely from scratch, using vanilla HTML, CSS, and JavaScript for the frontend and GO, and PostgreSQL for the backend

**[ns0t.is-a.dev](https://ns0t.is-a.dev)**

</div>

---

## Overview

I made this website to share my work/skills and every tool I use, there's no specific reason of building this website, I just thought it was cool to have a personal portfolio

## Features

**Live Discord presence**
Pulls real-time status, activity, and avatar (including avatar decorations) via the [Lanyard](https://github.com/Phineas/lanyard) API, refreshed every 10 seconds

**GitHub contributions graph**
Custom-rendered contribution heatmap (no third-party chart library) fetched from the [jogruber GitHub Contributions API](https://github.com/jogruber/github-contributions-api).

**Guestbook**
the guestbook offers:

- Threaded replies
- GIF attachments (Klipy/Tenor/Giphy support)
- Honeypot field for basic bot/spam protection
- Word-based moderation filter

**Dynamic content system**
Work, skills, and tools sections are driven by a `portfolio_items` table in my PostgreSQL rather than hardcoded HTML, so the content can be updated without touching the codebase (managed through an admin panel)

**Embedded music player**
Custom audio player with play/pause, next/prev, scrubbing progress bar, and a volume slider, with no third-party player library

**Theme system**
Dark/light mode with system-preference detection on first load and persistence via `localStorage`. Applied before paint to avoid a flash of the wrong theme.

**Responsive layout**
The design uses an absolute-positioning "fixed canvas" approach calibrated for a ~1600px viewport, with responsive breakpoints layered on top for smaller and larger screens.

## Tech Stack

| Layer              | Tech                                                                                   |
| ------------------ | -------------------------------------------------------------------------------------- |
| Frontend           | Vanilla HTML, CSS, JavaScript                                                          |
| Backend / Database | Go, PostgreSQL                                                                         |
| Hosting            | [Netlify](https://netlify.com)                                                         |
| Design             | [Figma](https://figma.com)                                                             |
| Subdomain          | [is-a.dev](https://github.com/is-a-dev/register)                                       |
| External APIs      | Lanyard (Discord presence), jogruber Contributions API, Klipy/Tenor/Giphy (GIF search) |

```bash
git clone https://github.com/NS0T/ns0t.git
cd ns0t
npx serve .
```

## License

No license file is currently included, which by default means all rights are reserved, feel free to browse the code for reference

## Author

**Alex**

- GitHub: [@NS0T](https://github.com/NS0T)
- Site: [ns0t.is-a.dev](https://ns0t.is-a.dev)
