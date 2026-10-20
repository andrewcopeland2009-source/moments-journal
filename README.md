# Moments

*A little piece of every day.*

Moments is a minimalist journal for iPhone, built as an installable Progressive Web App. Each day holds one entry:

- **Words & a memory**: up to 100 words and one photograph, or
- **Two memories**: up to two photographs and no words.

Everything stays on your device. There are no accounts, no analytics, no ads and no AI.

## Features

- **Today**: the date in editorial type, *Capture Today* / *Revisit Today*, recent entries, and **A Look Back** (entries from this date in earlier years, shown only when they exist).
- **Editor**: the page grows out of the button that opened it. It has a live word counter with rolling digits, and the 100-word limit holds for typed and pasted text. Photographs reveal with a scale-and-fade, and drafts save as you write. *Keep This Moment* closes a cover over the page and draws a seal before the page shrinks away.
- **Timeline**: album pages grouped by month, with sticky month headings, reveal-on-scroll and restrained parallax. Tapping a card expands it into a full page (a shared-element transition), and closing it collapses the page back into its card.
- **Calendar**: a month grid you can swipe between months, with entry indicators and a selection that springs into place. Tap the month name to see the whole year. Tap a day to bring up its entry.
- **Gallery**: a masonry grid that keeps each photo's aspect ratio. Tapping a photo opens it full screen; you can pinch or double-tap to zoom, swipe between photos, and pull down to dismiss. The photo flies back to its tile.
- **Settings**: light, dark or automatic theme; three paper tones; three typefaces; first day of the week; animation intensity (Full / Gentle / Minimal; the device's Reduce Motion setting is always respected); an optional privacy lock; backup and restore.

## Your data

- Entries and photographs are stored in **IndexedDB** in your browser. Moments keeps originals up to 2560 px plus 720 px thumbnails, and asks the browser for persistent storage.
- **Moments does not sync to iCloud.** If you delete the Home Screen app, clear Safari website data, or iOS reclaims storage, your memories may be permanently removed.
- **Export backup** (Settings) creates a `.zip` with `moments.json` and your original photographs. On iPhone it opens the share sheet, so you can choose *Save to Files*. **Restore** merges a backup into your journal: when a day exists in both, the version edited most recently is kept.
- The **privacy lock** uses Face ID, Touch ID or your passcode through WebAuthn. It hides the journal from a casual glance. Entries are **not encrypted**.

## Development

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build (service worker active)
npm run icons      # regenerate icons and iOS launch images (needs playwright)
```

Stack: React 18, TypeScript, Vite, Tailwind CSS, Motion for React, Lucide, IndexedDB and vite-plugin-pwa (Workbox). Fonts are self-hosted through Fontsource, so they work offline.

```
src/
  lib/          storage (db, images, backup, zip), dates, word limits, motion tokens, lock
  state/        journal data, settings/theme, UI (tabs, overlays, toasts, dialogs), gesture hooks
  components/   Editor, EntryView, PhotoViewer, EntryCard, Sheet, TabBar, ...
  screens/      Today, Timeline, Calendar, Gallery
```

## Deploying

### GitHub Pages

1. Push to `main`. The workflow in `.github/workflows/deploy.yml` builds with `BASE_PATH=/<repo-name>/` and publishes `dist/`.
2. In the repository, go to **Settings → Pages → Build and deployment** and set the source to **GitHub Actions**.
3. The app is served at `https://<user>.github.io/<repo-name>/`.

### Any other static host (Netlify, Vercel, Cloudflare Pages)

Run `npm run build` and serve `dist/`. If the app lives at a sub-path, build with `BASE_PATH=/sub/path/ npm run build`. HTTPS is required for the service worker and the privacy lock.

### Installing on iPhone

Open the site in **Safari**, tap **Share → Add to Home Screen**, then open Moments from the Home Screen. It runs full screen, works offline, and stores its data separately from Safari tabs.
