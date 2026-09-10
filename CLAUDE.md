# CLAUDE.md — slide-builder-html dev context

## Three copies — always keep in sync

Every edit must be applied to all three locations:

| Role | Path |
|---|---|
| **Canonical** (git-tracked) | `graph_database/00_utilities_html/slide-builder-html/src/` |
| Utility copy | `Dropbox/00_utilities/slide-builder-html/src/` |
| Seminar copy | `PDF_Obs/02_seminar/.../Clinical-Research-Infrastructure.../slide-builder-html/src/` |

Use a Python script to patch all three atomically. The seminar copy no longer has a GitHub remote; the canonical copy does.

## Git repo

- Remote: `https://github.com/Shimpeim/Clinical-Research-Infrastructure-Study-Group-in-JIHS_seminar-2026-09-03.git`
- Git root: `graph_database/00_utilities_html/` (one level above `slide-builder-html/`)
- This means assets committed at `slide-builder-html/assets/…` are reachable as:
  `https://raw.githubusercontent.com/Shimpeim/…/main/slide-builder-html/assets/…`
- **Do not move the git root** — existing slide settings reference those raw URLs.

## `VIEWER_CSS` — sync after every `styles.css` edit

`publishHTML()` embeds the full stylesheet as a string constant (`const VIEWER_CSS`) near the top of `app.js`. This is necessary because Chrome blocks both `fetch()` and CSSOM `cssRules` access when `index.html` is opened from a `file://` origin.

After any change to `styles.css`, rebuild `VIEWER_CSS` in all three `app.js` copies:

```python
import re, pathlib

css = pathlib.Path('src/styles.css').read_text()
new_const = "const VIEWER_CSS = `\n" + css + "`;"
for p in [... all three app.js paths ...]:
    src = pathlib.Path(p).read_text()
    src = re.sub(r'const VIEWER_CSS = `\n[\s\S]*?`;', new_const, src)
    pathlib.Path(p).write_text(src)
```

## Key functions

| Function | File | Role |
|---|---|---|
| `renderSlideHTML(slide, page, total)` | app.js | Top-level renderer; used by editor, Present, and published HTML |
| `renderChrome(part, page, total)` | app.js | Header strip — single text + alignment + `{page}`/`{total}` expansion |
| `renderFooter(part, page, total)` | app.js | Footer strip — 3-slot (`left/center/right`) with legacy fallback |
| `renderChromeEditor(slide)` | app.js | Builds the right-pane editor for header + footer |
| `publishHTML()` | app.js | Exports a self-contained HTML file with all styles and deck data embedded |
| `patchChromeMarkdown(container)` | app.js | Runs after innerHTML set; replaces `data-md` attributes with rendered markdown |

## Footer data model

Current format (new):
```js
footer: { left, center, right, font, size }
```

Legacy format (still read correctly by `renderFooter`, migrated to new format on first editor open):
```js
footer: { text, align, font, size }
```

Migration logic in `renderChromeEditor`: if `footer.left === undefined`, the old `text` is moved into the slot matching `align` (`left`/`center`/`right`), `text` and `align` are deleted, and `saveDeck()` is called.

## Footer CSS — why flex, not grid

`display: grid` with `auto 1fr auto` columns sizes the `auto` tracks to **min-content** (the width of the longest single word) when a `fr` track is present, causing text to wrap at word-width boundaries rather than at the slide boundary.

`display: flex` with `flex: 0 1 auto` on left/right spans starts each slot at its natural content width (`flex-basis: auto`) and shrinks — and wraps — only when the combined total exceeds the footer width. `white-space: pre-wrap` on each span allows wrapping; `overflow-wrap: break-word` prevents literal overflow.

## Published HTML — what is and is not embedded

Embedded:
- Full `styles.css` (via `VIEWER_CSS`)
- All `BUILTIN_TEMPLATES` (serialised via `.toString()`)
- All user-defined templates
- Full deck JSON
- All rendering functions: `renderSlideHTML`, `renderFooter`, `renderChrome`, `renderOverlays`, `renderMarkdown`, `patchChromeMarkdown`, `renderPillarsMarkdown`, `findSlideByTitle`, `esc`, `interpolate`, `chromeText`

Not embedded (linked at runtime):
- KaTeX (CDN)
- Linked overlay images — file paths are preserved but the files are not bundled; a warning is shown post-export

## Shiny App template

Added 2026-08-24. Fields: `url` (string, default `http://127.0.0.1:3838`), `caption` (string, optional), `pane` (string, default `'ALL'`).

`render(fields, slide)` — takes the full slide as a second argument (see `renderSlideHTML` change below).

**Render logic (three states):**
1. No header (`slide.header.text` empty) → shows "Input a HEADER to display the app." prompt. A header is required by design: it makes the slide easy to identify and navigate in Presentation mode.
2. Header set but no URL (`fields.url` empty) → shows "Set a Shiny app URL" prompt.
3. Header + URL set → the actual display depends on the code path (see below).

**Pane selector (fixed: ALL / LEFT / RIGHT):**
- The properties panel shows a `<select id="shiny-pane-select">` with three hardcoded choices: `ALL`, `LEFT` (input column), `RIGHT` (output column).
- Pane state is stored in `fields.pane` and preserved in JSON export and published HTML automatically.
- The two top-level columns in `app.R` (`column(5, id="pane-left")`, `column(7, id="pane-right")`) are the CSS targets.
- CSS in `APP_CSS`: `body.pane-left-only #pane-right { display:none }` and the symmetric `pane-right-only` rule; both expand the visible column to 100% width.

**Two rendering paths (edit/present vs published HTML):**

*Edit and present mode* — persistent fixed iframe (`_shinyFrame` in `app.js`):
- The HTML spec mandates that any removal of an iframe from the DOM (including during reparenting via `insertBefore`/`appendChild`) discards the browsing context. Therefore the iframe must never be removed.
- One `<iframe id="shiny-persistent-frame">` is appended to `document.body` once and never removed. It uses `position:fixed` sized to the `.slide-body` bounding rect via `_shinyReposition()`.
- `mountShinyFrame(slide)` is called after every `renderStage()` and `renderPresent()`. If the URL is unchanged, no reload — a `postMessage({type:'shiny-set-pane', pane})` is sent to toggle the Shiny CSS class. If the URL changes, `frame.src` is set (new session).
- `render()` in edit mode returns a plain `.tpl-shiny` shell div (white background placeholder); the iframe is overlaid on top via fixed positioning.
- Position is updated on `window.resize` and `.stage-wrapper` scroll via `requestAnimationFrame`.
- `exitPresent()` calls `_shinyScheduleReposition()` so the frame realigns to the edit-stage `.slide-body` after the present overlay is hidden.
- `app.R` receives pane changes via `window.addEventListener('message', ...)` listening for `{type:'shiny-set-pane', pane:'left'/'right'/'all'}` and calls `_applyPaneClass()` to add/remove `pane-left-only`/`pane-right-only` on `<body>`.

*Published HTML* — inline iframe with `?pane=` URL param:
- `mountShinyFrame` is not defined in published HTML → `render()` falls back to embedding the iframe directly inside `.tpl-shiny` with `position:absolute`.
- When `pane !== 'ALL'`, the iframe src becomes `${url}?pane=left` or `${url}?pane=right`.
- `app.R` server reads `parseQueryString(session$clientData$url_search)[["pane"]]` via `observe` and calls `session$sendCustomMessage("set_pane_class", ...)`. `Shiny.addCustomMessageHandler("set_pane_class", ...)` applies the body class.

**`.tpl-shiny` CSS layout (published HTML / placeholder in edit mode):**
- `.tpl-shiny`: `position:absolute; top:0; left:0; width:100%; height:100%` — fills `.slide-body` (`position:relative`). The absolute positioning gives definite dimensions without relying on `height:100%` resolving through a `1fr` grid track.
- `.tpl-shiny-frame`: `position:absolute; top:0; left:0; width:100%; height:100%; border:none` — used only in published HTML; in edit/present mode the iframe is fixed-position in `document.body`.
- `.tpl-shiny-caption`: `position:absolute; bottom:0` — overlays the iframe at the bottom.

Failed iframe sizing attempts (edit mode, before fixed-position approach): (1) `flex:1` on iframe → stayed 150 px UA default. (2) `position:absolute; inset:0; display:flex` + iframe `flex:1` → still 150 px. (3) `height:100%; position:relative` + iframe `position:absolute` → worked with header but collapsed to 0 without one. (4) Park-and-reparent approach (move iframe to hidden div before `innerHTML`, reparent back after) → HTML spec discards the browsing context on removal even during reparenting; sessions lost on every slide change.

**`renderSlideHTML` change:** `t.render(slide.fields)` → `t.render(slide.fields, slide)`. All other templates ignore the second argument. The serialised version in `publishHTML` inherits this change automatically via `renderSlideHTML.toString()`.

No `sandbox` attribute — adding `allow-same-origin + allow-scripts` lifts all meaningful restrictions for a local origin, so omitting it entirely keeps Shiny's download/popup behaviour intact without false security theatre.

`publishHTML` serialises the `render` function via `toFnSrc`. `esc` is in scope in the published HTML. The iframe URL (with optional `?pane=left/right`) is embedded verbatim — the Shiny server must be running locally for it to load.

## Gotchas

- **`function.toString()` for serialisation.** Shorthand methods (`render(fields) {}`) omit the `function` keyword when stringified. The `toFnSrc()` helper inside `publishHTML` prepends it where missing. Don't convert these to arrow functions.
- **`imageFolder` default is `../assets`**, not `./assets`. The HTML lives in `src/`, so assets one level up from `src/` are at `../assets/` relative to `index.html`.
- **Footer `align-items: flex-start`** — the footer uses `flex-start` so that multi-line slots align at the top. The header still uses the shared `align-items: flex-start` rule but is a separate flex container.
- **`safeJson()`** — JSON embedded in the published `<script>` tag uses `.replace(/<\//g, '<\\/')` to prevent `</script>` from closing the script block prematurely.
