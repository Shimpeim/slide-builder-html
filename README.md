# Slide Builder

A single-user, browser-based slide deck editor. Vanilla HTML/CSS/JS, no build step, no dependencies. Runs by opening `src/index.html` in a browser.

Built for a workflow where slides are structured (template-driven) rather than free-form, and where the user wants full control over headers, footers, and layered image overlays. Presentations are stored in the browser and exportable as JSON.

## Running

```
open src/index.html
```

Or double-click the file. The app runs entirely from `file://` — no server is required.

State auto-saves to browser localStorage. Use **Save** (downloads a JSON) and **Load** for portability or backups.

## Features

### Templates

Four built-ins, each with its own editable schema:

- **Pillars** — 1–8 side-by-side pillars, per-pillar text / font / size / colour
- **Title** — big title + subtitle, independent fonts
- **Outline** — agenda list with a configurable "current section" highlight and optional strike-through for passed sections
- **Bullets** — heading + bullet list

**User-defined templates** — via the *Templates* button. The user provides a template name, a set of typed fields (text, textarea, number, font, color, select), and an HTML template that references the fields as `{{fieldname}}` (escaped) or `{{fieldname|raw}}` (unescaped — needed for inlining values into CSS or attributes, e.g. `style="font-family: {{titleFont|raw}}"`). Custom templates are stored in localStorage alongside the deck.

### Per-slide chrome (Header / Footer)

Every slide has an editable **Header** strip and **Footer** strip that wrap the template body regardless of template type. Blank text hides the strip. `{page}` and `{total}` tokens expand to the current slide number and total count in both edit and present mode.

**Header** — single text area with independent font, font-size, and alignment (left / center / right). Supports markdown.

**Footer** — three independent text slots with shared font and font-size:

| Slot | Position | Typical use |
|---|---|---|
| Left | anchored to left edge | `{page} / {total}` |
| Center | fills remaining space | short title or date |
| Right | anchored to right edge | footnote or institution |

Each slot wraps only when its content would overflow the slide, not at an arbitrary fraction of the footer width. Slots are independent — leave any blank and it takes no space. Old decks with a single `text + align` footer are migrated to the matching slot automatically when the slide is first opened in the editor.

### Image overlays

Each slide can carry any number of image overlays, positioned as percentages of the 16:9 slide and stacked with an arbitrary z-index. `z-index >= 2` sits above the slide frame (header/body/footer); `<= 0` sits behind it. Overlays also support opacity, rotation, and CSS object-fit (`contain` / `cover` / `fill` / `none` / `scale-down`).

Two ways to attach an image:

- **Link local file…** — stores a path (`<Images folder>/<filename>`). The file stays on disk. Edit it in Photoshop, refresh the browser, done. Preferred for anything you might revise.
- **Embed file…** — reads the file as base64 and stores it inside the deck JSON. Self-contained and portable, but inflates localStorage. The picker warns above 3 MB and refuses (with a fallback prompt) if localStorage rejects the save.

The Images folder is a deck-wide setting; each deck can point at its own directory. Paths can be relative to `src/index.html` (`../assets/foo.png`) or absolute (`/Users/…` or `file:///Users/…`).

### Slides column

- Two-line label per slide: template type (uppercase muted) above the header text; empty headers show `(no header)` in muted italic
- `{page}` and `{total}` tokens in headers are expanded in the label
- Drag any row by the `⋮⋮` handle (or the row itself) to reorder — a blue insertion bar shows the drop position
- `⧉` duplicates the slide (deep clone with fresh ids)
- `×` deletes; the last remaining slide can't be deleted

### Publish

**Publish** exports the current deck as a fully self-contained HTML file. The published file:

- Requires no app, no server, no internet connection (KaTeX fonts load from CDN, but slides render without them).
- Embeds all styles inline (the full `styles.css` is compiled into `app.js` as `VIEWER_CSS` so it is always available regardless of how `index.html` is opened — `fetch()` and CSSOM rules access are both blocked by Chrome on `file://` origins).
- Embeds all built-in and user-defined template code, and the full deck JSON.
- Supports keyboard navigation (`←` / `→` / `Space` / `PageDown` / `PageUp`) and wikilink clicks.
- **Linked image overlays** (non-embedded) are not bundled. A warning is shown after export if the deck contains any; those overlays display only when the HTML file is opened from the same directory as the `assets/` folder.

### Presentation mode

**Present** button (or F key) enters fullscreen. Navigation: `←` / `→` / `Space` / `PageUp` / `PageDown` / `Esc`. Uses the same rendering pipeline as the edit stage so nothing is lost between edit and present.

## Project layout

```
slide-builder-html/
├── README.md
├── src/
│   ├── index.html    layout, modals, present overlay
│   ├── styles.css    dark UI + built-in template styling
│   └── app.js        state, templates, rendering, DnD, persistence
└── assets/           optional — where linked images live per convention
```

## Data model

```js
deck = {
  slides: [ Slide, ... ],
  imageFolder: './assets'   // default prefix for "Link local file…"
}

Slide = {
  id, templateId,
  fields: { ... template-specific ... },
  header?: { text, font, size, align },      // align: 'left' | 'center' | 'right'
  footer?: { left, center, right, font, size }, // three independent text slots
  overlays?: [ Overlay, ... ]
}

// Legacy footer format (still accepted by renderFooter, migrated on first editor open):
// footer?: { text, font, size, align }

Overlay = {
  id, src,           // src = data: URL | http(s) URL | file:// URL | path
  x, y,              // % of slide, top-left
  width, height,     // % of slide
  zIndex,            // >=2 above frame, <=0 behind
  opacity, rotation,
  fit                // contain | cover | fill | none | scale-down
}

UserTemplate = {
  id, name,
  htmlTemplate,      // {{field}} escaped, {{field|raw}} literal
  fields: [{ name, label, type, default, options? }]
  // type: text | textarea | number | font | color | select
}
```

Persistence keys (localStorage):

- `slidebuilder.deck.v1`
- `slidebuilder.userTemplates.v1`

Export JSON shape: `{ deck, userTemplates, exportedAt, version: 1 }`. Linked images are **not** bundled (only their paths travel); embedded images are.

## Rendering pipeline

Every slide is rendered by `renderSlideHTML(slide, page, total)`:

1. `template.render(slide.fields)` returns the body HTML.
2. `renderChrome(slide.header, page, total)` builds the header strip (single text + alignment), expanding `{page}` and `{total}`.
3. `renderFooter(slide.footer, page, total)` builds the footer strip. It handles both the new three-slot format (`left`, `center`, `right`) and the legacy single-text format (`text` + `align`), falling back gracefully.
4. Frame is assembled as a CSS grid (`auto 1fr auto` rows) inside `.slide-frame`, `z-index: 1`.
5. `renderOverlays(slide)` appends each overlay as an absolutely-positioned sibling of the frame inside `.stage`. Each overlay's user-set z-index controls stacking.

Both the edit stage, Present mode, and published HTML use this same pipeline, so all three views are always in sync.

## Extending

### Add a built-in template

Push an entry into `BUILTIN_TEMPLATES` (in `app.js`):

```js
{
  id: 'unique_id',
  name: 'Display Name',
  builtin: true,
  tag: 'built-in',
  defaults()                          { return { ...initial fields... }; },
  render(fields)                      { return '<div class="tpl-...">...</div>'; },
  editor(fields, onChange, rerenderProps) { return <DOM element>; },
  thumb()                             { return '<div>...</div>'; }  // ~80px preview
}
```

Add matching `.tpl-<id>` CSS to `styles.css`. `render` must return an HTML string; `editor` returns a DOM element built with the `el(tag, attrs, children)` helper.

### User templates

Handled in-app via **Templates → + New user template**. No code changes needed.

## Browser-imposed constraints

- **file:// origin** — the File System Access API is unavailable, so the app cannot write image files. That's why Link requires the user to place the file at the composed path themselves.
- **`<input type="file">` hides source paths** — the picker returns only `file.name`, not the directory. Link cannot preserve a subfolder picked in a different location.
- **localStorage cap ~5 MB per origin** — Embed pre-flights file size and warns above 3 MB. Large decks or many embedded images should either use Link or be exported/re-loaded via JSON as needed.

## Gotchas — kept here so future edits don't re-break them

- **`onChange` mutates `slide.fields` in place.** An earlier spread-based version (`slide.fields = { ...slide.fields, [name]: value }`) broke the Pillars editor: per-pillar controls capture a `fields` reference in a closure, and after a spread the closure points at a stale object. Editing pillar 1 then pillar 2 wiped the pillar-1 edit. Rule: never replace `slide.fields`; mutate its keys.
- **Dynamic sub-form templates need `rerenderProps`.** Pillars uses it after `numPillars` changes to re-materialise the correct number of pillar sub-forms. Passed as the third argument to `editor(fields, onChange, rerenderProps)`.
- **Font names in user templates.** Inlining a font-family from a field requires the raw variant: `style="font-family: {{myFont|raw}}"`. The default escape breaks CSS.
- **Overlay layering depends on `.slide-frame { z-index: 1 }`.** Overlays are DOM siblings of the frame inside `.stage`; layering only behaves as advertised because the frame has an explicit z-index. Don't remove it.
- **Never call `renderProps()` on every keystroke.** Rebuilding the panel loses focus on the field being edited. Call it only on structural changes (add/remove overlay, change numPillars, template switch).
- **Overlay `src`** is a bare string. Anything the `<img>` tag can load works: data URLs, http(s), file://, or a relative/absolute path. Link and Embed just populate that same field differently.
- **`VIEWER_CSS` in `app.js` must stay in sync with `styles.css`.** The Publish feature embeds the full stylesheet as a string constant (`const VIEWER_CSS`) near the top of `app.js` because `fetch()` and CSSOM rule access are both blocked on `file://` origins in Chrome. Any edit to `styles.css` requires rebuilding this constant. See `CLAUDE.md` for the sync script.
- **Footer CSS grid → flex.** The footer was changed from `display: grid` to `display: flex` because CSS Grid sizes `auto` tracks to **min-content** (the width of the longest single word) when a `fr` track is present, causing premature text wrapping. Flex with `flex: 0 1 auto` on left/right slots preserves natural content width and wraps only when the total would exceed the slide width.
- **`function.toString()` for Publish serialisation.** Built-in template functions and rendering helpers are serialised via `.toString()` into the published HTML. Shorthand method syntax (e.g. `render(fields) {}`) does not include the `function` keyword, so a `toFnSrc()` wrapper inside `publishHTML` prepends it where missing. Don't convert these functions to arrow functions — arrow functions are fine for Publish but break the `function` prefix check.

## Roadmap notes (not implemented)

- Deck-wide "slide master" for default header/footer values with per-slide overrides
- PNG / PDF export (currently only Present mode + JSON export)
- Undo / redo
- Multi-select and bulk actions in the slide list
- Warning banner when a linked image fails to load
