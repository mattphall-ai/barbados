# Atomic Brand Foundation Builder

Turns an existing master brand asset — a website, IVA, campaign deck, or PDF —
into the structured components Atomic needs to generate branded,
channel-ready marketing tactics: a **Copy Agent Knowledge Base** and a
**Brand Design Kit**.

## The flow

1. **Intake** — upload files (PDF, DOCX, PPTX, HTML, TXT/MD, logo/screenshot
   images) and/or add a website URL.
2. **Processing** — each source is parsed and run through a rule-based
   extraction engine. Progress is shown per source and per pipeline stage.
3. **Review** — every extracted item is editable, shows a confidence score,
   whether it's verbatim from a source or an AI-summarized inference, and a
   link back to the exact source (with snippet) it came from. Approve, flag,
   reject, edit, or manually add items per section.
4. **Dashboard** — the two connected systems (Copy Agent Knowledge Base +
   Brand Design Kit), with completion stats, an outstanding-flags checklist,
   and export actions.

## What gets extracted

**Brand knowledge:** approved claims (with supporting references),
core messages & hierarchy, audience segments, voice & tone, safety/regulatory
content (ISI), calls to action, product & indication info.

**Creative system:** logos, color palette, typography, photography/
illustration style, iconography, layout patterns, reusable UI components,
and representative master assets.

## Design principle: never invent

The extraction engine is deliberately rule-based rather than generative. It
only surfaces what it can point to in the source material — a claim, a
heading, a marked-up color, a sampled pixel, a matched keyword. Every
extracted item carries its source reference(s). When no evidence exists for
a required field (e.g. no ISI found, no fonts detected), the item is shown
as **missing** and flagged for a human to fill in — nothing is fabricated in
its place. A small set of items (voice/tone traits) are explicitly labeled
**AI-generated** because they're inferred from patterns in the text rather
than quoted directly; they're visually distinct from verbatim source content
throughout the review UI and in the exported JSON.

Only items a reviewer explicitly **approves** are included in the exported
Copy Agent Knowledge Base / Brand Design Kit; everything else ships in a
separate `outstandingForReview` list so nothing unapproved silently enters
the system.

## Parsing notes & limitations

- **PDF** text extraction uses `pdfjs-dist`. Scanned/image-only PDFs have no
  extractable text and are flagged as needing OCR.
- **DOCX/PPTX** are parsed directly from their underlying XML (via `jszip`),
  extracting text runs and heading/title styles.
- **Images** (logos, screenshots) are sampled with a `<canvas>` to pull
  dominant colors — genuine pixel analysis, not a guess.
- **Website URLs**: the browser fetches the page directly. Most third-party
  sites block cross-origin reads (CORS), which is a browser security
  restriction, not a bug — when that happens you're prompted to paste the
  page's HTML (View Source) or visible text instead, so nothing gets
  fabricated in place of unreachable content.
- Highly visual creative-system fields (photography style, iconography,
  layout patterns) can only be extracted from sources that *describe* them in
  text (e.g. a brand guideline PDF). A live website alone usually won't
  contain that description — those sections will come back flagged for a
  human to fill in from a proper style guide.

## Export

- **Structured JSON** — `copy-agent-knowledge-base.json` and
  `brand-design-kit.json`, downloadable independently from the dashboard.
- **DAM export (.zip)** — both JSON files plus the approved image assets
  (logos, master assets), bundled with a manifest — simulating a hand-off to
  a real Digital Asset Management system.

Project state (sources + extracted foundation) persists to `localStorage`
so a refresh doesn't lose review progress. Uploaded files themselves are
only held in memory for the current session.

## Setup

```bash
npm install
npm run dev
```

Open the printed local URL, then follow Intake → Processing → Review →
Dashboard.

## Stack

React + TypeScript + Vite, no backend — a static SPA (same shape as this
account's other projects). `pdfjs-dist` for PDF text extraction, `jszip` for
DOCX/PPTX parsing and building the DAM export zip.
