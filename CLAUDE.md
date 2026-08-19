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

## Gotchas

- **`function.toString()` for serialisation.** Shorthand methods (`render(fields) {}`) omit the `function` keyword when stringified. The `toFnSrc()` helper inside `publishHTML` prepends it where missing. Don't convert these to arrow functions.
- **`imageFolder` default is `../assets`**, not `./assets`. The HTML lives in `src/`, so assets one level up from `src/` are at `../assets/` relative to `index.html`.
- **Footer `align-items: flex-start`** — the footer uses `flex-start` so that multi-line slots align at the top. The header still uses the shared `align-items: flex-start` rule but is a separate flex container.
- **`safeJson()`** — JSON embedded in the published `<script>` tag uses `.replace(/<\//g, '<\\/')` to prevent `</script>` from closing the script block prematurely.
