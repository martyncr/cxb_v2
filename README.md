# CxB – Cyber Governance for Boards - developing version 2 mods
- action text,
- list of follow on actions in report
  
Cyber Governance Maturity Model Web App

This is a static web application for board-level self‑assessment against the CxB Cyber Governance Code of Practice (domains A–E, actions A1–E5).

## Structure

- `index.html` – main page, cover, assessment UI, results section
- `style.css` – CxB styling (colours, layout, print styles)
- `app.js` – logic, scoring, radar chart, admin mode
- `modelData.json` – all maturity model content (A1–E5), sector hints, UI strings
- `assets/`
  - `logo.svg` – primary CxB logo
  - `logo-dark.svg` – white-on-navy version
  - `favicon.svg` – favicon for browser tabs
  - `brand-colours.md` – colour palette and usage

## Running locally

1. Place all files in a folder (e.g. `cxb-maturity-app`).
2. Serve the folder with a simple static server (because `fetch` is used for `modelData.json`), for example:
   - With Node: `npx serve .`
   - With Python 3: `python -m http.server 8000`
3. Open `http://localhost:8000` in your browser.

## Deployment

Any static hosting works:

- GitHub Pages
- Netlify
- Vercel
- S3/static web hosting

Just deploy the whole folder and ensure `index.html`, `style.css`, `app.js`, `modelData.json`, and `assets/` all sit at the same relative paths.

## Usage

- Complete cover details (organisation, board, date, sector).
- Select levels (0–4) for each action A1–E5.
- Review category scores and radar chart.
- Use “Print / Save as PDF” to generate a board pack–style output.
- Use admin mode to prefill and lock certain questions before sharing with the board.

