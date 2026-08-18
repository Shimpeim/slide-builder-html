/* Slide Builder — vanilla JS, single-page, localStorage-backed. */

// ---------- Constants ----------
const STORAGE_DECK = 'slidebuilder.deck.v1';
const STORAGE_TEMPLATES = 'slidebuilder.userTemplates.v1';

const VIEWER_CSS = `
:root {
  --bg: #0f1115;
  --panel: #171a21;
  --panel-2: #1f232c;
  --border: #2a2f3a;
  --text: #e6e8ee;
  --muted: #9aa3b2;
  --accent: #4f8cff;
  --accent-2: #6aa6ff;
  --danger: #ff6b6b;
  --stage: #ffffff;
  --stage-ink: #111;
  --shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  --radius: 8px;
}

* {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  height: 100%;
  background: var(--bg);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  font-size: 14px;
}

button {
  font: inherit;
  background: var(--panel-2);
  color: var(--text);
  border: 1px solid var(--border);
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s;
}
button:hover { background: #262b36; }
button.primary { background: var(--accent); border-color: var(--accent); color: white; }
button.primary:hover { background: var(--accent-2); }
button.ghost { background: transparent; }
button.danger { background: transparent; color: var(--danger); border-color: var(--danger); }
button.danger:hover { background: rgba(255,107,107,0.1); }

input, select, textarea {
  font: inherit;
  background: #0c0f14;
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 6px 8px;
  width: 100%;
}
textarea { resize: vertical; min-height: 60px; font-family: inherit; }
input[type=number] { width: 100px; }
input[type=color] { padding: 2px; height: 32px; width: 60px; }

label { display: block; font-size: 12px; color: var(--muted); margin-bottom: 4px; }
.field { margin-bottom: 12px; }

/* Layout */
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: var(--panel);
  border-bottom: 1px solid var(--border);
}
.brand { font-weight: 600; letter-spacing: 0.3px; }
.actions { display: flex; gap: 8px; }

.workspace {
  display: grid;
  grid-template-columns: 220px 1fr 320px;
  height: calc(100vh - 49px);
}

.pane {
  background: var(--panel);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.pane-right { border-right: none; border-left: 1px solid var(--border); }
.pane-center { background: #0b0d12; }

.pane-header {
  padding: 10px 12px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--muted);
  border-bottom: 1px solid var(--border);
}
.pane-footer {
  padding: 10px 12px;
  border-top: 1px solid var(--border);
}

/* Slide list */
.slide-list {
  list-style: none;
  margin: 0;
  padding: 8px;
  overflow-y: auto;
  flex: 1;
}
.slide-item {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: grab;
  margin-bottom: 4px;
  border: 1px solid transparent;
}
.slide-item:active { cursor: grabbing; }
.slide-item:hover { background: var(--panel-2); }
.slide-item.active { background: var(--panel-2); border-color: var(--accent); }
.slide-item.dragging { opacity: 0.4; }
.slide-item.drop-before::before,
.slide-item.drop-after::after {
  content: '';
  position: absolute;
  left: 4px;
  right: 4px;
  height: 2px;
  background: var(--accent);
  border-radius: 1px;
  pointer-events: none;
}
.slide-item.drop-before::before { top: -3px; }
.slide-item.drop-after::after { bottom: -3px; }

.slide-item .grip {
  color: #4a5162;
  margin-right: 6px;
  font-size: 12px;
  line-height: 1;
  user-select: none;
}
.slide-item .idx { color: var(--muted); font-variant-numeric: tabular-nums; margin-right: 8px; }
.slide-item .labels {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
  line-height: 1.2;
}
.slide-item .type-tag {
  font-size: 10px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.slide-item .name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.slide-item .name.no-header { color: var(--muted); font-style: italic; }
.slide-item .actions { display: none; gap: 2px; }
.slide-item:hover .actions,
.slide-item.active .actions { display: flex; }
.slide-item .actions button {
  background: transparent;
  border: none;
  color: var(--muted);
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 14px;
  line-height: 1;
}
.slide-item .actions button:hover { color: var(--text); background: #2a3040; }
.slide-item .actions button.del:hover { color: var(--danger); background: rgba(255,107,107,0.1); }

/* Stage */
.stage-wrapper {
  flex: 1;
  display: grid;
  place-items: center;
  padding: 24px;
  overflow: auto;
}
.stage {
  background: var(--stage);
  color: var(--stage-ink);
  width: min(100%, 960px);
  aspect-ratio: 16 / 9;
  box-shadow: var(--shadow);
  border-radius: 8px;
  overflow: hidden;
  position: relative;
}

/* Slide chrome (header/footer) wraps template body */
.slide-frame {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-rows: auto 1fr auto;
  z-index: 1;
}

/* Image overlays — user-specified z-index lets them sit above or below the frame */
.slide-overlay {
  position: absolute;
  transform-origin: center center;
  pointer-events: none;
}
.slide-overlay img {
  width: 100%;
  height: 100%;
  display: block;
}

.src-badge {
  display: inline-block;
  font-size: 9px;
  padding: 1px 6px;
  border-radius: 8px;
  margin-left: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  vertical-align: middle;
  border: 1px solid var(--border);
}
.src-badge.linked { color: #7ec4a0; border-color: #2f5445; background: #17251f; }
.src-badge.embedded { color: #d9b26a; border-color: #5a4324; background: #2a2216; }
.src-badge.empty { color: var(--muted); }
.slide-header, .slide-footer {
  padding: 10px 28px;
  font-size: 14px;
  color: #6a7280;
  display: flex;
  align-items: center;
  min-height: 0;
  white-space: pre-wrap;
}
.slide-header { border-bottom: 1px solid #eef1f5; }
.slide-footer { border-top: 1px solid #eef1f5; }
.slide-header.align-left, .slide-footer.align-left { justify-content: flex-start; text-align: left; }
.slide-header.align-center, .slide-footer.align-center { justify-content: center; text-align: center; }
.slide-header.align-right, .slide-footer.align-right { justify-content: flex-end; text-align: right; }
.slide-header.empty, .slide-footer.empty { display: none; }
.slide-body { position: relative; overflow: hidden; min-height: 0; }

/* Props */
.props {
  padding: 12px;
  overflow-y: auto;
  flex: 1;
}
.props .group {
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 10px;
  margin-bottom: 10px;
  background: #12151b;
}
.props .group-title {
  font-size: 12px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.6px;
  margin-bottom: 8px;
}

/* Modals */
.modal {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.55);
  display: grid;
  place-items: center;
  z-index: 100;
}
.modal[hidden] { display: none; }
.modal-card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 10px;
  width: min(560px, 92vw);
  max-height: 86vh;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow);
}
.modal-card.wide { width: min(920px, 96vw); }
.modal-header {
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.modal-header h2 { margin: 0; font-size: 16px; }
.modal-header .close {
  background: transparent;
  border: none;
  color: var(--muted);
  font-size: 22px;
  padding: 0 6px;
  cursor: pointer;
}
.modal-body {
  padding: 16px;
  overflow-y: auto;
}
.modal-body.two-col {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 16px;
}
.modal-body .col { display: flex; flex-direction: column; gap: 10px; }
.section-title {
  font-size: 12px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.6px;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
  padding: 16px;
}
.template-card {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--panel-2);
  padding: 10px;
  cursor: pointer;
  transition: border-color 0.12s;
}
.template-card:hover { border-color: var(--accent); }
.template-card .thumb {
  height: 80px;
  background: #fff;
  border-radius: 4px;
  color: #333;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 6px;
  font-size: 10px;
}
.template-card .name { margin-top: 8px; font-weight: 500; }
.template-card .tag { font-size: 10px; color: var(--muted); }

.templates-list {
  list-style: none; margin: 0; padding: 0;
  border: 1px solid var(--border); border-radius: 6px;
  max-height: 400px; overflow-y: auto;
}
.templates-list li {
  padding: 8px 10px;
  border-bottom: 1px solid var(--border);
  display: flex; align-items: center; justify-content: space-between;
  cursor: pointer;
}
.templates-list li:last-child { border-bottom: none; }
.templates-list li:hover { background: var(--panel-2); }
.templates-list li.active { background: var(--panel-2); }
.templates-list .tag { font-size: 10px; color: var(--muted); }
.templates-list .del {
  background: transparent; border: none; color: var(--muted);
  cursor: pointer; padding: 2px 6px;
}
.templates-list .del:hover { color: var(--danger); }

.template-editor { display: flex; flex-direction: column; gap: 10px; }
.hint { color: var(--muted); font-size: 13px; }

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr 120px auto;
  gap: 6px;
  align-items: center;
  margin-bottom: 6px;
}
.field-row input, .field-row select { width: 100%; }

/* Present */
.present {
  position: fixed;
  inset: 0;
  background: #000;
  z-index: 200;
  display: flex;
  flex-direction: column;
}
.present[hidden] { display: none; }
.present-stage {
  flex: 1;
  display: grid;
  place-items: center;
  padding: 20px;
}
.present-stage .stage {
  width: min(96vw, calc(96vh * 16 / 9));
  height: auto;
  aspect-ratio: 16/9;
}
.present-hud {
  padding: 10px;
  display: flex;
  gap: 8px;
  justify-content: center;
  align-items: center;
  background: rgba(0,0,0,0.6);
  color: white;
}
.present-hud button { background: #222; color: white; border-color: #333; }

/* Built-in template renderings */
.tpl-pillars {
  height: 100%;
  display: grid;
  gap: 12px;
  padding: 40px;
  background: #fff;
}
.tpl-pillars .pillar {
  background: #f4f6fa;
  border-radius: 10px;
  padding: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  overflow: hidden;
  color: #111;
  line-height: 1.3;
}
.tpl-pillars .pillar-content {
  display: block;
  white-space: pre-wrap;
}

.tpl-title {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 40px;
  text-align: center;
  gap: 12px;
}
.tpl-title h1 { margin: 0; font-size: 52px; }
.tpl-title .sub { color: #555; font-size: 22px; }

.tpl-bullets {
  height: 100%;
  padding: 40px 60px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.tpl-bullets h2 { margin: 0; font-size: 36px; }
.tpl-bullets ul { margin: 0; padding-left: 24px; font-size: 22px; line-height: 1.5; }
.tpl-bullets li { margin-bottom: 8px; }

.tpl-outline {
  height: 100%;
  padding: 48px 72px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  box-sizing: border-box;
}
.tpl-outline h2 {
  margin: 0;
  font-size: 40px;
  color: #111;
  border-bottom: 2px solid #e2e6ee;
  padding-bottom: 8px;
}
.tpl-outline ol {
  margin: 0;
  padding: 0;
  list-style: none;
  counter-reset: outline;
  font-size: 24px;
  line-height: 1.5;
  color: #6a7280;
}
.tpl-outline li {
  counter-increment: outline;
  padding: 6px 12px;
  border-radius: 6px;
  display: flex;
  align-items: baseline;
  gap: 14px;
  transition: background 0.15s;
}
.tpl-outline li::before {
  content: counter(outline, decimal-leading-zero);
  font-variant-numeric: tabular-nums;
  color: #b6bcc9;
  font-size: 0.8em;
  min-width: 2.2em;
}
.tpl-outline li.current {
  background: #eef4ff;
  color: #111;
  font-weight: 600;
}
.tpl-outline li.current::before {
  color: #4f8cff;
}
.tpl-outline li.past {
  color: #b6bcc9;
  text-decoration: line-through;
  text-decoration-color: #d5dae3;
}

/* ---- Markdown rendering ---- */

/* Wikilinks — invisible during presentation; cursor signals interactivity */
.wikilink {
  color: inherit;
  text-decoration: none;
  cursor: pointer;
}

/* External links — inherit surrounding text style; only cursor changes on hover */
.slide-body a, .slide-header a, .slide-footer a,
.tpl-bullets a, .tpl-pillars a, .tpl-title a, .tpl-outline a {
  color: inherit;
  text-decoration: none;
  cursor: pointer;
  word-break: break-word;
}

/* Inline code */
.slide-body code, .slide-header code, .slide-footer code,
.tpl-bullets code, .tpl-pillars code, .tpl-title code, .tpl-outline code {
  font-family: Menlo, Monaco, 'Courier New', monospace;
  background: rgba(0,0,0,0.08);
  border-radius: 3px;
  padding: 0.1em 0.35em;
  font-size: 0.88em;
}

/* Block math display */
.katex-display {
  margin: 0.4em 0;
  overflow-x: auto;
}
`;

const FONTS = [
  'system-ui', 'Helvetica', 'Arial', 'Georgia', 'Times New Roman',
  'Courier New', 'Verdana', 'Trebuchet MS', 'Palatino', 'Garamond',
  'Impact', 'Comic Sans MS', 'Menlo', 'Monaco', 'Baskerville'
];

const FIELD_TYPES = ['text', 'textarea', 'number', 'font', 'color', 'select'];

// ---------- Utilities ----------
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function uid(prefix = 'id') {
  return prefix + '_' + Math.random().toString(36).slice(2, 10);
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (k === 'html') node.innerHTML = v;
    else node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c == null) continue;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
}

function interpolate(tpl, fields) {
  // {{name}} → escaped, {{name|raw}} → unescaped
  return String(tpl).replace(/\{\{\s*([\w.-]+)(\s*\|\s*raw)?\s*\}\}/g, (_m, name, raw) => {
    const val = fields[name];
    if (val == null) return '';
    return raw ? String(val) : esc(val);
  });
}

function download(filename, content, mime = 'application/json') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------- Markdown rendering ----------
// Self-contained scanner: no external library, no placeholder system.
// Walks the string left-to-right trying each rule at the current position.
// On a miss it HTML-escapes one character and advances.  Nesting (e.g.
// **[[wikilink]]**) works because bold/italic render their inner content
// by calling renderMarkdown recursively.
function renderMarkdown(text) {
  if (!text) return '';

  // Each rule: [ anchoredRegex, renderFn(fullMatch, ...groups) → html ]
  const rules = [
    // $$block math$$  — checked before $inline$ so $$ is never split
    [/^\$\$([^$]+?)\$\$/s,
      (_, x) => typeof katex !== 'undefined'
        ? katex.renderToString(x.trim(), { displayMode: true,  throwOnError: false })
        : esc('$$' + x + '$$')],
    // $inline math$
    [/^\$([^$\n]+?)\$/,
      (_, x) => typeof katex !== 'undefined'
        ? katex.renderToString(x.trim(), { displayMode: false, throwOnError: false })
        : esc('$' + x + '$')],
    // [[wikilink]] or [[target|display label]]
    [/^\[\[([^\]]+?)\]\]/,
      (_, inner) => {
        const bar = inner.indexOf('|');
        const target = (bar < 0 ? inner : inner.slice(0, bar)).trim();
        const label  = (bar < 0 ? inner : inner.slice(bar + 1)).trim();
        return `<span class="wikilink" data-wikilink="${esc(target)}" title="${esc(target)}">${esc(label)}</span>`;
      }],
    // [text](url)  — standard Markdown link
    [/^\[([^\]\n]+)\]\(([^)\n]+)\)/,
      (_, t, u) => `<a href="${esc(u.trim())}" target="_blank" rel="noopener">${esc(t.trim())}</a>`],
    // **bold**
    [/^\*\*([^*\n]+?)\*\*/,
      (_, x) => `<strong>${renderMarkdown(x)}</strong>`],
    // *italic*
    [/^\*([^*\n]+?)\*/,
      (_, x) => `<em>${renderMarkdown(x)}</em>`],
    // `code`
    [/^`([^`\n]+?)`/,
      (_, x) => `<code>${esc(x)}</code>`],
    // ~~strikethrough~~
    [/^~~([^~\n]+?)~~/,
      (_, x) => `<del>${renderMarkdown(x)}</del>`],
  ];

  let out = '';
  let s = String(text);
  outer: while (s.length) {
    for (const [re, fn] of rules) {
      const m = s.match(re);
      if (m) { out += fn(...m); s = s.slice(m[0].length); continue outer; }
    }
    // No rule matched: emit one character as safe HTML and advance.
    out += esc(s[0]);
    s = s.slice(1);
  }
  return out;
}

// ---------- Field editor helpers ----------
function fieldInput(field, value, onChange) {
  const set = v => onChange(field.name, v);
  switch (field.type) {
    case 'textarea':
      return el('textarea', { oninput: e => set(e.target.value) }, value ?? '');
    case 'number': {
      const inp = el('input', { type: 'number', value: value ?? 0, oninput: e => set(Number(e.target.value)) });
      if (field.min != null) inp.min = field.min;
      if (field.max != null) inp.max = field.max;
      if (field.step != null) inp.step = field.step;
      return inp;
    }
    case 'font': {
      const sel = el('select', { onchange: e => set(e.target.value) },
        FONTS.map(f => el('option', { value: f, selected: f === value ? '' : null }, f))
      );
      return sel;
    }
    case 'color':
      return el('input', { type: 'color', value: value ?? '#111111', oninput: e => set(e.target.value) });
    case 'select': {
      const opts = (field.options || []).map(o =>
        el('option', { value: o, selected: o === value ? '' : null }, o));
      return el('select', { onchange: e => set(e.target.value) }, opts);
    }
    case 'text':
    default:
      return el('input', { type: 'text', value: value ?? '', oninput: e => set(e.target.value) });
  }
}

function fieldGroup(labelText, control) {
  return el('div', { class: 'field' }, [el('label', {}, labelText), control]);
}

// ---------- Built-in templates ----------
// Each template: { id, name, builtin, defaults(), render(fields), editor(fields, onChange), thumb() }

const BUILTIN_TEMPLATES = [
  {
    id: 'pillars',
    name: 'Pillars',
    builtin: true,
    tag: 'built-in',
    defaults() {
      return {
        numPillars: 3,
        pillars: [
          { text: 'First pillar', font: 'Georgia', size: 28, color: '#111' },
          { text: 'Second pillar', font: 'Georgia', size: 28, color: '#111' },
          { text: 'Third pillar', font: 'Georgia', size: 28, color: '#111' }
        ]
      };
    },
    render(fields) {
      const n = Math.max(1, Math.min(8, fields.numPillars || 1));
      const pillars = (fields.pillars || []).slice(0, n);
      while (pillars.length < n) pillars.push({ text: '', font: 'system-ui', size: 24, color: '#111' });
      const cells = pillars.map(p =>
        `<div class="pillar" style="font-family:${esc(p.font)}; font-size:${Number(p.size) || 24}px; color:${esc(p.color)}"><span class="pillar-content"></span></div>`
      ).join('');
      return `<div class="tpl-pillars" style="grid-template-columns: repeat(${n}, 1fr)">${cells}</div>`;
    },
    editor(fields, onChange, rerenderProps) {
      const root = el('div');
      // Ensure fields.pillars matches numPillars length
      const ensurePillars = (n) => {
        const arr = (fields.pillars || []).slice();
        while (arr.length < n) arr.push({ text: 'Pillar', font: 'Georgia', size: 28, color: '#111' });
        arr.length = n;
        return arr;
      };

      // numPillars control — use onchange so we don't rebuild props on every keystroke.
      const nInput = el('input', {
        type: 'number', min: 1, max: 8, value: fields.numPillars ?? 3,
        onchange: e => {
          const n = Math.max(1, Math.min(8, Number(e.target.value) || 1));
          onChange('numPillars', n);
          onChange('pillars', ensurePillars(n));
          if (rerenderProps) rerenderProps();
        }
      });
      root.appendChild(el('div', { class: 'group' }, [
        el('div', { class: 'group-title' }, 'Layout'),
        fieldGroup('Number of pillars (1–8)', nInput)
      ]));

      const n = Math.max(1, Math.min(8, fields.numPillars || 1));
      const pillars = ensurePillars(n);

      pillars.forEach((p, i) => {
        const setPillar = (key, val) => {
          const arr = ensurePillars(n).map((x, j) => j === i ? { ...x, [key]: val } : x);
          onChange('pillars', arr);
        };
        const g = el('div', { class: 'group' }, [
          el('div', { class: 'group-title' }, `Pillar ${i + 1}`),
          fieldGroup('Text', el('textarea', {
            oninput: e => setPillar('text', e.target.value)
          }, p.text ?? '')),
          fieldGroup('Font', (function () {
            const sel = el('select', { onchange: e => setPillar('font', e.target.value) },
              FONTS.map(f => el('option', { value: f, selected: f === p.font ? '' : null }, f)));
            return sel;
          })()),
          fieldGroup('Font size (px)', el('input', {
            type: 'number', min: 8, max: 200, value: p.size ?? 24,
            oninput: e => setPillar('size', Number(e.target.value))
          })),
          fieldGroup('Colour', el('input', {
            type: 'color', value: p.color ?? '#111111',
            oninput: e => setPillar('color', e.target.value)
          }))
        ]);
        root.appendChild(g);
      });

      return root;
    },
    thumb() {
      return `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;width:100%;height:100%;">
        <div style="background:#e8ecf5;border-radius:3px"></div>
        <div style="background:#e8ecf5;border-radius:3px"></div>
        <div style="background:#e8ecf5;border-radius:3px"></div>
      </div>`;
    }
  },
  {
    id: 'title',
    name: 'Title',
    builtin: true,
    tag: 'built-in',
    defaults() {
      return { title: 'Presentation Title', subtitle: 'Subtitle or author', titleFont: 'Georgia', subtitleFont: 'system-ui' };
    },
    render(fields) {
      return `<div class="tpl-title">
        <h1 style="font-family:${esc(fields.titleFont || 'Georgia')}">${renderMarkdown(fields.title || '')}</h1>
        <div class="sub" style="font-family:${esc(fields.subtitleFont || 'system-ui')}">${renderMarkdown(fields.subtitle || '')}</div>
      </div>`;
    },
    editor(fields, onChange) {
      const root = el('div', { class: 'group' }, [
        el('div', { class: 'group-title' }, 'Title slide'),
        fieldGroup('Title', fieldInput({ name: 'title', type: 'text' }, fields.title, onChange)),
        fieldGroup('Title font', fieldInput({ name: 'titleFont', type: 'font' }, fields.titleFont, onChange)),
        fieldGroup('Subtitle', fieldInput({ name: 'subtitle', type: 'text' }, fields.subtitle, onChange)),
        fieldGroup('Subtitle font', fieldInput({ name: 'subtitleFont', type: 'font' }, fields.subtitleFont, onChange))
      ]);
      return root;
    },
    thumb() {
      return `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:4px">
        <div style="font-weight:600;font-size:14px">Title</div>
        <div style="font-size:9px;color:#666">subtitle</div>
      </div>`;
    }
  },
  {
    id: 'outline',
    name: 'Outline',
    builtin: true,
    tag: 'built-in',
    defaults() {
      return {
        title: 'Outline',
        sections: 'Introduction\nBackground\nMethod\nResults\nDiscussion',
        currentSection: 0,
        markPast: true,
        font: 'Georgia'
      };
    },
    render(fields) {
      const items = String(fields.sections || '').split('\n').map(s => s.trim()).filter(Boolean);
      const current = Number(fields.currentSection) || 0; // 1-based; 0 = none
      const markPast = fields.markPast !== false;
      const lis = items.map((s, i) => {
        const idx = i + 1;
        let cls = '';
        if (current > 0) {
          if (idx === current) cls = 'current';
          else if (markPast && idx < current) cls = 'past';
        }
        return `<li${cls ? ` class="${cls}"` : ''}><span>${renderMarkdown(s)}</span></li>`;
      }).join('');
      return `<div class="tpl-outline" style="font-family:${esc(fields.font || 'Georgia')}">
        <h2>${renderMarkdown(fields.title || '')}</h2>
        <ol>${lis}</ol>
      </div>`;
    },
    editor(fields, onChange) {
      const items = String(fields.sections || '').split('\n').filter(s => s.trim().length);
      const max = items.length;
      return el('div', { class: 'group' }, [
        el('div', { class: 'group-title' }, 'Outline'),
        fieldGroup('Title', fieldInput({ name: 'title', type: 'text' }, fields.title, onChange)),
        fieldGroup('Sections (one per line)', fieldInput({ name: 'sections', type: 'textarea' }, fields.sections, onChange)),
        fieldGroup(
          `Current section (0 = none, 1–${max || 1})`,
          fieldInput({ name: 'currentSection', type: 'number', min: 0, max: Math.max(1, max) }, fields.currentSection, onChange)
        ),
        fieldGroup('Mark passed sections as done',
          el('select', {
            onchange: e => onChange('markPast', e.target.value === 'true')
          }, [
            el('option', { value: 'true', selected: fields.markPast !== false ? '' : null }, 'Yes'),
            el('option', { value: 'false', selected: fields.markPast === false ? '' : null }, 'No')
          ])
        ),
        fieldGroup('Font', fieldInput({ name: 'font', type: 'font' }, fields.font, onChange))
      ]);
    },
    thumb() {
      return `<div style="padding:6px 8px;font-size:8px;color:#333;height:100%;text-align:left">
        <div style="font-weight:600;font-size:10px;border-bottom:1px solid #ddd;padding-bottom:2px;margin-bottom:3px">Outline</div>
        <div style="color:#b6bcc9">01&nbsp;&nbsp;Intro</div>
        <div style="background:#eef4ff;color:#111;font-weight:600;padding:1px 3px;border-radius:2px">02&nbsp;&nbsp;Method</div>
        <div style="color:#b6bcc9">03&nbsp;&nbsp;Results</div>
      </div>`;
    }
  },
  {
    id: 'bullets',
    name: 'Bullets',
    builtin: true,
    tag: 'built-in',
    defaults() {
      return { heading: 'Heading', items: 'First point\nSecond point\nThird point', font: 'system-ui' };
    },
    render(fields) {
      const items = String(fields.items || '').split('\n').filter(s => s.trim().length);
      const lis = items.map(x => `<li>${renderMarkdown(x)}</li>`).join('');
      return `<div class="tpl-bullets" style="font-family:${esc(fields.font || 'system-ui')}">
        <h2>${renderMarkdown(fields.heading || '')}</h2>
        <ul>${lis}</ul>
      </div>`;
    },
    editor(fields, onChange) {
      return el('div', { class: 'group' }, [
        el('div', { class: 'group-title' }, 'Bullets'),
        fieldGroup('Heading', fieldInput({ name: 'heading', type: 'text' }, fields.heading, onChange)),
        fieldGroup('Items (one per line)', fieldInput({ name: 'items', type: 'textarea' }, fields.items, onChange)),
        fieldGroup('Font', fieldInput({ name: 'font', type: 'font' }, fields.font, onChange))
      ]);
    },
    thumb() {
      return `<div style="padding:6px;font-size:9px;color:#333;height:100%;text-align:left">
        <div style="font-weight:600;margin-bottom:3px">Heading</div>
        <div>• point one</div><div>• point two</div><div>• point three</div>
      </div>`;
    }
  }
];

// ---------- User templates ----------
// User template shape:
//   { id, name, htmlTemplate: string, fields: [{name,label,type,default,options?}] }
// Rendered by interpolating {{name}} tokens in htmlTemplate.

function userTemplateToTemplate(u) {
  return {
    id: u.id,
    name: u.name,
    builtin: false,
    tag: 'user',
    source: u,
    defaults() {
      const d = {};
      for (const f of u.fields || []) d[f.name] = f.default ?? '';
      return d;
    },
    render(fields) {
      return `<div class="tpl-user" style="height:100%;padding:0;box-sizing:border-box">${interpolate(u.htmlTemplate || '', fields)}</div>`;
    },
    editor(fields, onChange) {
      const root = el('div', { class: 'group' }, [el('div', { class: 'group-title' }, u.name)]);
      for (const f of u.fields || []) {
        root.appendChild(fieldGroup(f.label || f.name, fieldInput(f, fields[f.name], onChange)));
      }
      if (!(u.fields || []).length) {
        root.appendChild(el('p', { class: 'hint' }, 'This template has no fields.'));
      }
      return root;
    },
    thumb() {
      return `<div style="font-size:10px;color:#666;padding:6px">User template</div>`;
    }
  };
}

// ---------- State ----------
let deck = { slides: [] };
let userTemplates = [];
let activeSlideId = null;

// ---------- Persistence ----------
function loadState() {
  try {
    const d = JSON.parse(localStorage.getItem(STORAGE_DECK) || 'null');
    if (d && Array.isArray(d.slides)) deck = d;
  } catch { /* ignore */ }
  try {
    const t = JSON.parse(localStorage.getItem(STORAGE_TEMPLATES) || 'null');
    if (Array.isArray(t)) userTemplates = t;
  } catch { /* ignore */ }
  if (!deck.slides.length) {
    const t = BUILTIN_TEMPLATES.find(x => x.id === 'pillars');
    deck.slides.push({ id: uid('sl'), templateId: t.id, fields: t.defaults() });
  }
  if (typeof deck.imageFolder !== 'string') deck.imageFolder = '../assets';
  activeSlideId = deck.slides[0].id;
}

function saveDeck() {
  try {
    localStorage.setItem(STORAGE_DECK, JSON.stringify(deck));
    return { ok: true };
  } catch (e) {
    console.warn('saveDeck failed:', e);
    return { ok: false, error: e };
  }
}
function saveUserTemplates() {
  try {
    localStorage.setItem(STORAGE_TEMPLATES, JSON.stringify(userTemplates));
    return { ok: true };
  } catch (e) {
    console.warn('saveUserTemplates failed:', e);
    return { ok: false, error: e };
  }
}
function formatBytes(n) {
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1024 / 1024).toFixed(2) + ' MB';
}

// ---------- Template registry ----------
function getAllTemplates() {
  return [...BUILTIN_TEMPLATES, ...userTemplates.map(userTemplateToTemplate)];
}
function getTemplate(id) {
  return getAllTemplates().find(t => t.id === id);
}

// ---------- Rendering ----------
function chromeText(text, page, total) {
  return String(text || '')
    .replace(/\{page\}/g, page)
    .replace(/\{total\}/g, total);
}

function renderChrome(part, page, total) {
  // part: { text, font, align, size } or undefined
  const text = part && part.text ? chromeText(part.text, page, total) : '';
  const font = (part && part.font) || 'system-ui';
  const align = (part && part.align) || 'center';
  const size = Number(part && part.size) || 14;
  return { text, font, align, size, empty: !text };
}

function renderOverlays(slide) {
  const overlays = Array.isArray(slide.overlays) ? slide.overlays : [];
  return overlays.map(ov => {
    const style = [
      `left:${Number(ov.x) || 0}%`,
      `top:${Number(ov.y) || 0}%`,
      `width:${Number(ov.width) || 30}%`,
      `height:${Number(ov.height) || 30}%`,
      `z-index:${Number.isFinite(Number(ov.zIndex)) ? Number(ov.zIndex) : 10}`,
      `opacity:${ov.opacity != null ? ov.opacity : 1}`,
      `transform:rotate(${Number(ov.rotation) || 0}deg)`
    ].join('; ');
    const fit = ov.fit || 'contain';
    if (!ov.src) return '';
    return `<div class="slide-overlay" style="${style}"><img src="${esc(ov.src)}" style="object-fit:${esc(fit)}" alt=""></div>`;
  }).join('');
}

function renderSlideHTML(slide, page, total) {
  const t = getTemplate(slide.templateId);
  const body = t
    ? t.render(slide.fields)
    : `<div style="padding:24px;color:#a00">Template not found: ${esc(slide.templateId)}</div>`;
  const h = renderChrome(slide.header, page, total);
  const f = renderChrome(slide.footer, page, total);
  // Header: data-md → patchChromeMarkdown() sets innerHTML directly so markdown renders correctly.
  // Footer: plain escaped text only — links in footers break the flex layout.
  const headerHTML = `<div class="slide-header align-${h.align}${h.empty ? ' empty' : ''}" style="font-family:${esc(h.font)}; font-size:${h.size}px" data-md="${esc(h.text)}"></div>`;
  const footerHTML = `<div class="slide-footer align-${f.align}${f.empty ? ' empty' : ''}" style="font-family:${esc(f.font)}; font-size:${f.size}px">${esc(f.text)}</div>`;
  const frameHTML = `<div class="slide-frame">${headerHTML}<div class="slide-body">${body}</div>${footerHTML}</div>`;
  return frameHTML + renderOverlays(slide);
}

function patchChromeMarkdown(container) {
  container.querySelectorAll('[data-md]').forEach(el => {
    el.innerHTML = renderMarkdown(el.getAttribute('data-md') || '');
    el.removeAttribute('data-md');
  });
}

// Fills .pillar-content spans directly from slide data to work around the browser
// quirk where <a> tags inside flex containers fail to render when set via innerHTML
// on a large parent string. Must be called after patchChromeMarkdown.
function renderPillarsMarkdown(container, slide) {
  if (slide.templateId !== 'pillars') return;
  const spans = container.querySelectorAll('.pillar-content');
  const pillars = (slide.fields && slide.fields.pillars) || [];
  spans.forEach((span, i) => {
    span.innerHTML = renderMarkdown((pillars[i] && pillars[i].text) || '');
  });
}

// Finds the first slide whose fields.title (leading # stripped) or header.text
// matches the wikilink target string (case-insensitive).
function findSlideByTitle(target) {
  const t = target.trim().toLowerCase();
  return deck.slides.find(s => {
    const ft = (s.fields && s.fields.title)
      ? String(s.fields.title).replace(/^#+\s*/, '').trim().toLowerCase()
      : '';
    const ht = (s.header && s.header.text)
      ? String(s.header.text).trim().toLowerCase()
      : '';
    return ft === t || ht === t;
  }) || null;
}

function renderStage() {
  const stage = document.getElementById('stage');
  const idx = deck.slides.findIndex(s => s.id === activeSlideId);
  const slide = deck.slides[idx];
  if (!slide) { stage.innerHTML = '<div style="padding:20px;color:#666">No slide selected.</div>'; return; }
  try {
    stage.innerHTML = renderSlideHTML(slide, idx + 1, deck.slides.length);
    patchChromeMarkdown(stage);
    renderPillarsMarkdown(stage, slide);
  } catch (e) { stage.innerHTML = `<div style="padding:20px;color:#a00">Render error: ${esc(e.message)}</div>`; }
}

let dragSlideId = null;

function clearDropIndicators() {
  document.querySelectorAll('.slide-item').forEach(el =>
    el.classList.remove('drop-before', 'drop-after'));
}

function slideListLabel(slide, page, total) {
  const raw = slide.header && slide.header.text ? String(slide.header.text) : '';
  const headerText = chromeText(raw, page, total).replace(/\s*\n\s*/g, ' · ').trim();
  const t = getTemplate(slide.templateId);
  const templateName = t ? t.name : slide.templateId;
  const hasHeader = headerText.length > 0;
  return {
    headerText: hasHeader ? headerText : '(no header)',
    hasHeader,
    templateName,
    title: hasHeader ? `${templateName} — ${headerText}` : templateName
  };
}

function renderSlideList() {
  const list = document.getElementById('slide-list');
  list.innerHTML = '';
  const total = deck.slides.length;
  deck.slides.forEach((s, i) => {
    const label = slideListLabel(s, i + 1, total);
    const item = el('li', {
      class: 'slide-item' + (s.id === activeSlideId ? ' active' : ''),
      draggable: 'true',
      'data-slide-id': s.id,
      title: label.title,
      onclick: () => { activeSlideId = s.id; renderAll(); },
      ondragstart: (e) => {
        dragSlideId = s.id;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', s.id);
        setTimeout(() => item.classList.add('dragging'), 0);
      },
      ondragend: () => {
        dragSlideId = null;
        item.classList.remove('dragging');
        clearDropIndicators();
      },
      ondragover: (e) => {
        if (!dragSlideId || dragSlideId === s.id) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const rect = item.getBoundingClientRect();
        const before = (e.clientY - rect.top) < rect.height / 2;
        clearDropIndicators();
        item.classList.add(before ? 'drop-before' : 'drop-after');
      },
      ondragleave: (e) => {
        if (e.currentTarget === e.target) item.classList.remove('drop-before', 'drop-after');
      },
      ondrop: (e) => {
        e.preventDefault();
        if (!dragSlideId || dragSlideId === s.id) return;
        const rect = item.getBoundingClientRect();
        const before = (e.clientY - rect.top) < rect.height / 2;
        moveSlide(dragSlideId, s.id, before);
        dragSlideId = null;
        clearDropIndicators();
      }
    }, [
      el('span', { class: 'grip', title: 'Drag to reorder' }, '⋮⋮'),
      el('span', { class: 'idx' }, String(i + 1).padStart(2, '0')),
      el('span', { class: 'labels' }, [
        el('span', { class: 'type-tag' }, label.templateName),
        el('span', {
          class: 'name' + (label.hasHeader ? '' : ' no-header')
        }, label.headerText)
      ]),
      el('span', { class: 'actions' }, [
        el('button', {
          class: 'copy', title: 'Duplicate slide',
          onclick: (e) => { e.stopPropagation(); copySlide(s.id); }
        }, '⧉'),
        el('button', {
          class: 'del', title: 'Delete slide',
          onclick: (e) => { e.stopPropagation(); deleteSlide(s.id); }
        }, '×')
      ])
    ]);
    list.appendChild(item);
  });
}

function moveSlide(sourceId, targetId, before) {
  const from = deck.slides.findIndex(s => s.id === sourceId);
  if (from < 0) return;
  const [item] = deck.slides.splice(from, 1);
  let to = deck.slides.findIndex(s => s.id === targetId);
  if (to < 0) { deck.slides.splice(from, 0, item); return; }
  if (!before) to += 1;
  deck.slides.splice(to, 0, item);
  saveDeck();
  renderAll();
}

function copySlide(id) {
  const idx = deck.slides.findIndex(s => s.id === id);
  if (idx < 0) return;
  const clone = JSON.parse(JSON.stringify(deck.slides[idx]));
  clone.id = uid('sl');
  if (Array.isArray(clone.overlays)) {
    clone.overlays.forEach(o => { o.id = uid('ov'); });
  }
  deck.slides.splice(idx + 1, 0, clone);
  activeSlideId = clone.id;
  saveDeck();
  renderAll();
}

function renderProps() {
  const props = document.getElementById('props');
  const header = document.getElementById('props-header');
  props.innerHTML = '';
  const slide = deck.slides.find(s => s.id === activeSlideId);
  if (!slide) { header.textContent = 'Properties'; return; }
  const t = getTemplate(slide.templateId);
  header.textContent = t ? `Template: ${t.name}` : 'Properties';
  if (!t) return;
  const onChange = (name, value) => {
    slide.fields[name] = value;
    saveDeck();
    renderStage();
    renderSlideList();
  };
  props.appendChild(t.editor(slide.fields, onChange, renderProps));
  props.appendChild(renderChromeEditor(slide));
  props.appendChild(renderOverlaysEditor(slide));
}

function overlaySrcKind(src) {
  if (!src) return 'empty';
  if (src.startsWith('data:')) return 'embedded';
  return 'linked';
}

function joinPath(folder, name) {
  const f = String(folder || '').replace(/\/+$/, '');
  return f ? `${f}/${name}` : name;
}

function renderOverlaysEditor(slide) {
  if (!Array.isArray(slide.overlays)) slide.overlays = [];
  const overlays = slide.overlays;

  const box = el('div');
  const header = el('div', { class: 'group' }, [
    el('div', { class: 'group-title' }, `Image overlays (${overlays.length})`),
    fieldGroup('Images folder (deck-wide; used when linking a local file)', el('input', {
      type: 'text',
      value: deck.imageFolder || '../assets',
      placeholder: './assets',
      oninput: e => { deck.imageFolder = e.target.value; saveDeck(); }
    })),
    el('p', { class: 'hint' },
      'Two ways to attach an image: Link (recommended for images you may edit later — stored as a path, loaded from disk on refresh) or Embed (baked into the deck as a base64 data URL — self-contained but not editable and inflates localStorage). Position and size are percentages of the slide. z-index ≥ 2 sits above the frame; ≤ 0 sits behind it.')
  ]);
  box.appendChild(header);

  overlays.forEach((ov, i) => {
    const numField = (label, key, opts = {}) => fieldGroup(label, el('input', {
      type: 'number',
      value: ov[key] ?? opts.default ?? 0,
      min: opts.min, max: opts.max, step: opts.step || 1,
      oninput: e => {
        ov[key] = e.target.value === '' ? '' : Number(e.target.value);
        saveDeck(); renderStage();
      }
    }));

    const srcInput = el('input', {
      type: 'text', value: ov.src || '',
      placeholder: './assets/logo.png  or  https://…  or  file:///…',
      oninput: e => { ov.src = e.target.value; saveDeck(); renderStage(); }
    });

    const linkFileInput = el('input', {
      type: 'file', accept: 'image/*', hidden: 'true',
      onchange: e => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const path = joinPath(deck.imageFolder || '../assets', file.name);
        ov.src = path;
        saveDeck();
        renderProps();
      }
    });
    const embedFileInput = el('input', {
      type: 'file', accept: 'image/*', hidden: 'true',
      onchange: e => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        // Base64 inflates by ~33%; localStorage per-origin cap is typically 5 MB.
        const estimated = Math.ceil(file.size * 4 / 3);
        if (file.size > 3 * 1024 * 1024) {
          const use = confirm(
            `"${file.name}" is ${formatBytes(file.size)} — embedded it will use ~${formatBytes(estimated)} of localStorage (cap ~5 MB).\n\n` +
            `Recommended: use "Link local file…" instead so the image stays on disk and can be edited.\n\n` +
            `Embed anyway?`
          );
          if (!use) return;
        }
        const reader = new FileReader();
        reader.onerror = () => alert(`Could not read "${file.name}": ${reader.error && reader.error.message || 'unknown error'}`);
        reader.onload = () => {
          const previous = ov.src;
          ov.src = reader.result;
          const res = saveDeck();
          if (!res.ok) {
            ov.src = previous;
            alert(
              `Couldn't embed "${file.name}" (${formatBytes(file.size)}) — browser localStorage is full ` +
              `(likely QuotaExceededError).\n\n` +
              `Fix: use "Link local file…" instead. It stores just the path and loads the file from disk on refresh, ` +
              `so large images stay outside localStorage.`
            );
            renderProps();
            return;
          }
          renderProps();
        };
        reader.readAsDataURL(file);
      }
    });

    const fitSelect = el('select', {
      onchange: e => { ov.fit = e.target.value; saveDeck(); renderStage(); }
    }, ['contain', 'cover', 'fill', 'none', 'scale-down'].map(v =>
      el('option', { value: v, selected: v === (ov.fit || 'contain') ? '' : null }, v)));

    const preview = ov.src
      ? el('img', { src: ov.src, style: { maxWidth: '100%', maxHeight: '80px', border: '1px solid var(--border)', borderRadius: '4px' } })
      : el('div', { class: 'hint' }, 'No image set.');

    const kind = overlaySrcKind(ov.src);
    const badge = el('span', {
      class: 'src-badge ' + kind,
      title: kind === 'linked'
        ? 'Linked by path — edit the file on disk and refresh the page to see changes.'
        : kind === 'embedded'
          ? 'Embedded as data URL — self-contained but cannot be edited externally.'
          : 'No source set.'
    }, kind);

    const card = el('div', { class: 'group' }, [
      el('div', {
        class: 'group-title',
        style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }
      }, [
        el('span', {}, [`Overlay ${i + 1}  `, badge]),
        el('button', {
          class: 'danger',
          onclick: () => { overlays.splice(i, 1); saveDeck(); renderProps(); renderStage(); }
        }, 'Delete')
      ]),
      preview,
      fieldGroup('Image path or URL', srcInput),
      el('div', { style: { display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' } }, [
        el('button', {
          onclick: () => linkFileInput.click(),
          title: `Sets the path to ${joinPath(deck.imageFolder || '../assets', 'yourfile.png')}. You place the file there yourself.`
        }, 'Link local file…'),
        el('button', {
          class: 'ghost',
          onclick: () => embedFileInput.click(),
          title: 'Bakes the image into the deck as base64. Portable but not editable.'
        }, 'Embed file…'),
        kind === 'embedded' ? el('button', {
          class: 'danger',
          title: 'Remove the embedded base64 image (clears src; overlay slot is kept).',
          onclick: () => { ov.src = ''; saveDeck(); renderProps(); renderStage(); }
        }, 'Remove embedded') : null,
        linkFileInput,
        embedFileInput
      ]),
      el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' } }, [
        numField('X (%)', 'x', { default: 0, step: 1 }),
        numField('Y (%)', 'y', { default: 0, step: 1 }),
        numField('Width (%)', 'width', { default: 30, min: 1, step: 1 }),
        numField('Height (%)', 'height', { default: 30, min: 1, step: 1 }),
        numField('z-index', 'zIndex', { default: 10, step: 1 }),
        numField('Opacity (0–1)', 'opacity', { default: 1, min: 0, max: 1, step: 0.05 }),
        numField('Rotation (°)', 'rotation', { default: 0, step: 1 }),
        fieldGroup('Fit', fitSelect)
      ])
    ]);
    box.appendChild(card);
  });

  box.appendChild(el('button', {
    class: 'ghost',
    onclick: () => {
      overlays.push({
        id: uid('ov'),
        src: '',
        x: 5, y: 5, width: 25, height: 25,
        zIndex: 10, opacity: 1, rotation: 0, fit: 'contain'
      });
      saveDeck();
      renderProps();
    }
  }, '+ Add overlay'));

  return box;
}

function renderChromeEditor(slide) {
  const ensure = (key) => {
    if (!slide[key]) slide[key] = { text: '', font: 'system-ui', align: 'center', size: 14 };
    return slide[key];
  };
  const update = (key, prop, val) => {
    ensure(key);
    slide[key][prop] = val;
    saveDeck();
    renderStage();
  };
  const alignSelect = (key) => {
    const cur = (slide[key] && slide[key].align) || 'center';
    return el('select', { onchange: e => update(key, 'align', e.target.value) },
      ['left', 'center', 'right'].map(a =>
        el('option', { value: a, selected: a === cur ? '' : null }, a)));
  };
  const fontSelect = (key) => {
    const cur = (slide[key] && slide[key].font) || 'system-ui';
    return el('select', { onchange: e => update(key, 'font', e.target.value) },
      FONTS.map(f => el('option', { value: f, selected: f === cur ? '' : null }, f)));
  };
  const textInput = (key) => el('textarea', {
    rows: 2,
    style: { minHeight: '44px' },
    placeholder: key === 'footer' ? 'e.g. {page} / {total}  (press Enter for a line break)' : 'press Enter for a line break',
    oninput: e => update(key, 'text', e.target.value)
  }, (slide[key] && slide[key].text) || '');

  const box = el('div');
  const sizeInput = (key) => el('input', {
    type: 'number', min: 6, max: 96, step: 1,
    value: (slide[key] && slide[key].size) || 14,
    oninput: e => update(key, 'size', Number(e.target.value) || 14)
  });

  ['header', 'footer'].forEach(key => {
    const label = key.charAt(0).toUpperCase() + key.slice(1);
    box.appendChild(el('div', { class: 'group' }, [
      el('div', { class: 'group-title' }, `${label} (blank = hidden)`),
      fieldGroup(`${label} text`, textInput(key)),
      fieldGroup('Font', fontSelect(key)),
      fieldGroup('Font size (px)', sizeInput(key)),
      fieldGroup('Alignment', alignSelect(key))
    ]));
  });
  box.appendChild(el('p', { class: 'hint' },
    'Tip: use {page} and {total} in the header or footer to insert the current page number and slide count.'));
  return box;
}

function renderAll() {
  renderSlideList();
  renderStage();
  renderProps();
}

// ---------- Slide actions ----------
function addSlide(templateId) {
  const t = getTemplate(templateId);
  if (!t) return;
  const slide = { id: uid('sl'), templateId, fields: t.defaults() };
  const idx = deck.slides.findIndex(s => s.id === activeSlideId);
  if (idx >= 0) deck.slides.splice(idx + 1, 0, slide);
  else deck.slides.push(slide);
  activeSlideId = slide.id;
  saveDeck();
  renderAll();
}

function deleteSlide(id) {
  const idx = deck.slides.findIndex(s => s.id === id);
  if (idx < 0) return;
  if (deck.slides.length === 1) { alert('At least one slide is required.'); return; }
  deck.slides.splice(idx, 1);
  if (activeSlideId === id) activeSlideId = deck.slides[Math.min(idx, deck.slides.length - 1)].id;
  saveDeck();
  renderAll();
}

// ---------- Template picker modal ----------
function openTemplatePicker() {
  const grid = document.getElementById('template-picker-grid');
  grid.innerHTML = '';
  for (const t of getAllTemplates()) {
    const card = el('div', {
      class: 'template-card',
      onclick: () => { addSlide(t.id); closeModal('modal-template-picker'); }
    }, [
      el('div', { class: 'thumb', html: t.thumb ? t.thumb() : '' }),
      el('div', { class: 'name' }, t.name),
      el('div', { class: 'tag' }, t.tag || (t.builtin ? 'built-in' : 'user'))
    ]);
    grid.appendChild(card);
  }
  openModal('modal-template-picker');
}

// ---------- Templates manager modal ----------
let editingTemplateId = null;

function openTemplatesManager() {
  editingTemplateId = null;
  renderTemplatesList();
  renderTemplateEditor();
  openModal('modal-templates');
}

function renderTemplatesList() {
  const list = document.getElementById('templates-list');
  list.innerHTML = '';
  for (const t of BUILTIN_TEMPLATES) {
    list.appendChild(el('li', {}, [
      el('span', {}, t.name),
      el('span', { class: 'tag' }, 'built-in')
    ]));
  }
  for (const u of userTemplates) {
    const li = el('li', {
      class: u.id === editingTemplateId ? 'active' : '',
      onclick: () => { editingTemplateId = u.id; renderTemplatesList(); renderTemplateEditor(); }
    }, [
      el('span', {}, u.name),
      el('div', {}, [
        el('span', { class: 'tag' }, 'user '),
        el('button', {
          class: 'del', title: 'Delete template',
          onclick: (e) => { e.stopPropagation(); deleteUserTemplate(u.id); }
        }, '×')
      ])
    ]);
    list.appendChild(li);
  }
}

function renderTemplateEditor() {
  const box = document.getElementById('template-editor');
  box.innerHTML = '';
  const u = userTemplates.find(x => x.id === editingTemplateId);
  if (!u) {
    box.appendChild(el('p', { class: 'hint' }, 'Select a user template to edit, or create a new one.'));
    return;
  }

  const nameInput = el('input', {
    type: 'text', value: u.name,
    oninput: e => { u.name = e.target.value; saveUserTemplates(); renderTemplatesList(); renderSlideList(); }
  });
  box.appendChild(fieldGroup('Template name', nameInput));

  // Fields table
  const fieldsBox = el('div', { class: 'group' }, [el('div', { class: 'group-title' }, 'Fields')]);
  const header = el('div', { class: 'field-row' }, [
    el('label', {}, 'Name'), el('label', {}, 'Label'), el('label', {}, 'Type'), el('span', {})
  ]);
  fieldsBox.appendChild(header);

  const rerender = () => { saveUserTemplates(); renderTemplateEditor(); renderStage(); renderProps(); };

  (u.fields || []).forEach((f, i) => {
    const row = el('div', { class: 'field-row' }, [
      el('input', { type: 'text', value: f.name, oninput: e => { f.name = e.target.value.replace(/[^\w-]/g, ''); saveUserTemplates(); } }),
      el('input', { type: 'text', value: f.label || '', oninput: e => { f.label = e.target.value; saveUserTemplates(); } }),
      el('select', { onchange: e => { f.type = e.target.value; rerender(); } },
        FIELD_TYPES.map(t => el('option', { value: t, selected: t === f.type ? '' : null }, t))),
      el('button', { class: 'danger', onclick: () => { u.fields.splice(i, 1); rerender(); } }, '×')
    ]);
    fieldsBox.appendChild(row);

    if (f.type === 'select') {
      const opts = el('input', {
        type: 'text',
        value: (f.options || []).join(', '),
        placeholder: 'comma-separated options',
        oninput: e => { f.options = e.target.value.split(',').map(s => s.trim()).filter(Boolean); saveUserTemplates(); }
      });
      fieldsBox.appendChild(fieldGroup(`Options for "${f.name}"`, opts));
    }
    const dflt = el('input', {
      type: 'text', value: f.default ?? '',
      oninput: e => { f.default = e.target.value; saveUserTemplates(); }
    });
    fieldsBox.appendChild(fieldGroup(`Default for "${f.name}"`, dflt));
  });

  fieldsBox.appendChild(el('button', {
    class: 'ghost',
    onclick: () => {
      u.fields = u.fields || [];
      u.fields.push({ name: 'field' + (u.fields.length + 1), label: '', type: 'text', default: '' });
      rerender();
    }
  }, '+ Add field'));
  box.appendChild(fieldsBox);

  // HTML template
  const html = el('textarea', {
    style: { minHeight: '160px', fontFamily: 'Menlo, monospace', fontSize: '12px' },
    oninput: e => { u.htmlTemplate = e.target.value; saveUserTemplates(); renderStage(); }
  }, u.htmlTemplate || '');
  box.appendChild(fieldGroup('HTML template', html));
  box.appendChild(el('p', { class: 'hint' },
    'Use {{fieldname}} to insert an escaped value, or {{fieldname|raw}} to insert without escaping (needed inside CSS or attribute values, e.g. style="font-family: {{titleFont|raw}}").'));

  // Preview
  box.appendChild(el('button', {
    onclick: () => {
      const t = userTemplateToTemplate(u);
      addSlide(t.id);
      closeModal('modal-templates');
    }
  }, 'Insert a slide using this template'));
}

function deleteUserTemplate(id) {
  const inUse = deck.slides.some(s => s.templateId === id);
  if (inUse && !confirm('This template is used by one or more slides. Delete anyway? Those slides will fail to render.')) return;
  userTemplates = userTemplates.filter(u => u.id !== id);
  if (editingTemplateId === id) editingTemplateId = null;
  saveUserTemplates();
  renderTemplatesList();
  renderTemplateEditor();
  renderAll();
}

function newUserTemplate() {
  const u = {
    id: uid('tpl'),
    name: 'New template',
    htmlTemplate: '<div style="padding:40px; font-family: {{font|raw}}"><h1>{{title}}</h1><p>{{body}}</p></div>',
    fields: [
      { name: 'title', label: 'Title', type: 'text', default: 'Hello' },
      { name: 'body', label: 'Body', type: 'textarea', default: 'A short description.' },
      { name: 'font', label: 'Font', type: 'font', default: 'Georgia' }
    ]
  };
  userTemplates.push(u);
  editingTemplateId = u.id;
  saveUserTemplates();
  renderTemplatesList();
  renderTemplateEditor();
}

// ---------- Modals ----------
function openModal(id) { document.getElementById(id).hidden = false; }
function closeModal(id) { document.getElementById(id).hidden = true; }
document.addEventListener('click', (e) => {
  const t = e.target;
  if (t.matches('[data-close-modal]')) closeModal(t.getAttribute('data-close-modal'));
});

// ---------- Save / Load JSON ----------
function saveJSON() {
  const payload = { deck, userTemplates, exportedAt: new Date().toISOString(), version: 1 };
  download(`slidebuilder-${Date.now()}.json`, JSON.stringify(payload, null, 2));
}

function loadJSON(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (data.deck && Array.isArray(data.deck.slides)) {
        deck = data.deck;
        activeSlideId = deck.slides[0]?.id || null;
      }
      if (Array.isArray(data.userTemplates)) userTemplates = data.userTemplates;
      saveDeck(); saveUserTemplates();
      renderAll();
    } catch (e) {
      alert('Could not load deck: ' + e.message);
    }
  };
  reader.readAsText(file);
}

// ---------- Present mode ----------
let presentIdx = 0;
function startPresent() {
  presentIdx = Math.max(0, deck.slides.findIndex(s => s.id === activeSlideId));
  if (presentIdx < 0) presentIdx = 0;
  renderPresent();
  document.getElementById('present').hidden = false;
  document.addEventListener('keydown', onPresentKey);
  // Try full-screen; ignore if blocked.
  const p = document.getElementById('present');
  if (p.requestFullscreen) p.requestFullscreen().catch(() => { });
}
function exitPresent() {
  document.getElementById('present').hidden = true;
  document.removeEventListener('keydown', onPresentKey);
  if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => { });
}
function renderPresent() {
  const stage = document.getElementById('present-stage');
  stage.innerHTML = '';
  const s = deck.slides[presentIdx];
  if (!s) return;
  const box = el('div', { class: 'stage', html: renderSlideHTML(s, presentIdx + 1, deck.slides.length) });
  patchChromeMarkdown(box);
  renderPillarsMarkdown(box, s);
  stage.appendChild(box);
  document.getElementById('present-count').textContent = `${presentIdx + 1} / ${deck.slides.length}`;
}
function onPresentKey(e) {
  if (e.key === 'Escape') exitPresent();
  else if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { presentIdx = Math.min(deck.slides.length - 1, presentIdx + 1); renderPresent(); }
  else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { presentIdx = Math.max(0, presentIdx - 1); renderPresent(); }
}

// ---------- Publish (standalone HTML export) ----------
async function publishHTML() {
  function toFnSrc(fn) {
    const s = fn.toString();
    return s.startsWith('function') || s.startsWith('async') ? s : 'function ' + s;
  }

  const css = VIEWER_CSS;

  // Count linked (non-embedded) image overlays so we can warn the user
  const linkedCount = deck.slides.reduce((n, s) =>
    n + (s.overlays || []).filter(o => o.src && !o.src.startsWith('data:')).length, 0);

  // Serialize BUILTIN_TEMPLATES with only render + defaults (no editor, no thumb)
  const builtinSrc = '[' + BUILTIN_TEMPLATES.map(t =>
    '{id:' + JSON.stringify(t.id) +
    ',name:' + JSON.stringify(t.name) +
    ',builtin:true,tag:' + JSON.stringify(t.tag || 'built-in') +
    ',defaults:' + toFnSrc(t.defaults) +
    ',render:' + toFnSrc(t.render) +
    ',thumb:function(){return \'\';}}').join(',') + ']';

  // Escape </script> sequences so they cannot close the script tag prematurely
  const safeJson = obj => JSON.stringify(obj).replace(/<\//g, '<\\/');

  const title = (() => {
    for (const s of deck.slides) {
      const t = (s.fields && s.fields.title) || (s.header && s.header.text);
      if (t) return String(t).replace(/^#+\s*/, '').trim();
    }
    return 'Slide Deck';
  })();

  const filename = title.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-') + '-published.html';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.css" crossorigin="anonymous">
  <style>
${css}
html,body{margin:0;height:100%;overflow:hidden;}
#viewer{display:flex;flex-direction:column;height:100vh;background:#000;}
#viewer-stage{flex:1;display:grid;place-items:center;padding:20px;}
#viewer-stage .stage{width:min(96vw,calc(96vh * 16/9));height:auto;aspect-ratio:16/9;}
#viewer-hud{padding:10px;display:flex;gap:8px;justify-content:center;align-items:center;background:rgba(0,0,0,.6);color:#fff;}
#viewer-hud button{background:#222;color:#fff;border:1px solid #333;padding:6px 14px;border-radius:6px;cursor:pointer;font:inherit;}
  </style>
</head>
<body>
  <div id="viewer">
    <div id="viewer-stage"></div>
    <div id="viewer-hud">
      <button id="v-prev">&larr;</button>
      <span id="v-count"></span>
      <button id="v-next">&rarr;</button>
    </div>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.js" crossorigin="anonymous"></script>
  <script>
(function () {
'use strict';
${esc.toString()}
${renderMarkdown.toString()}
${interpolate.toString()}
${chromeText.toString()}
${renderChrome.toString()}
${renderOverlays.toString()}
${renderSlideHTML.toString()}
${patchChromeMarkdown.toString()}
${renderPillarsMarkdown.toString()}
${findSlideByTitle.toString()}
const BUILTIN_TEMPLATES = ${builtinSrc};
const _userTpls = ${safeJson(userTemplates)};
function userTemplateToTemplate(u) {
  return {
    id: u.id, name: u.name, builtin: false, tag: 'user',
    defaults() { const d = {}; for (const f of u.fields||[]) d[f.name] = f.default??''; return d; },
    render(fields) { return '<div class="tpl-user" style="height:100%;padding:0;box-sizing:border-box">'+interpolate(u.htmlTemplate||'',fields)+'</div>'; }
  };
}
function getAllTemplates() { return [...BUILTIN_TEMPLATES, ..._userTpls.map(userTemplateToTemplate)]; }
function getTemplate(id) { return getAllTemplates().find(function(t){return t.id===id;}); }
const deck = ${safeJson(deck)};
let idx = 0;
function renderSlide() {
  const stage = document.getElementById('viewer-stage');
  stage.innerHTML = '';
  const s = deck.slides[idx];
  if (!s) return;
  const box = document.createElement('div');
  box.className = 'stage';
  box.innerHTML = renderSlideHTML(s, idx + 1, deck.slides.length);
  patchChromeMarkdown(box);
  renderPillarsMarkdown(box, s);
  stage.appendChild(box);
  document.getElementById('v-count').textContent = (idx + 1) + ' / ' + deck.slides.length;
}
function go(d) { idx = Math.max(0, Math.min(deck.slides.length - 1, idx + d)); renderSlide(); }
document.getElementById('v-prev').addEventListener('click', function(){go(-1);});
document.getElementById('v-next').addEventListener('click', function(){go(1);});
document.addEventListener('keydown', function(e){
  if (e.key==='ArrowRight'||e.key===' '||e.key==='PageDown') go(1);
  else if (e.key==='ArrowLeft'||e.key==='PageUp') go(-1);
});
document.addEventListener('click', function(e){
  const link = e.target.closest('.wikilink');
  if (!link) return;
  const target = link.dataset.wikilink || link.getAttribute('title');
  if (!target) return;
  const slide = findSlideByTitle(target);
  if (slide) { idx = deck.slides.indexOf(slide); renderSlide(); }
});
renderSlide();
})();
  </script>
</body>
</html>`;

  download(filename, html, 'text/html');
  if (linkedCount > 0) {
    setTimeout(() => alert(
      linkedCount + ' image overlay(s) use linked file paths and will only display when the HTML is ' +
      'opened from the same folder as your assets directory.'
    ), 200);
  }
}

// ---------- Init ----------
function init() {
  loadState();

  document.getElementById('btn-new-slide').addEventListener('click', openTemplatePicker);
  document.getElementById('btn-new-slide-2').addEventListener('click', openTemplatePicker);
  document.getElementById('btn-manage-templates').addEventListener('click', openTemplatesManager);
  document.getElementById('btn-new-template').addEventListener('click', newUserTemplate);
  document.getElementById('btn-save').addEventListener('click', saveJSON);
  document.getElementById('btn-publish').addEventListener('click', publishHTML);
  document.getElementById('btn-load').addEventListener('click', () => document.getElementById('file-load').click());
  document.getElementById('file-load').addEventListener('change', e => {
    const f = e.target.files && e.target.files[0];
    if (f) loadJSON(f);
    e.target.value = '';
  });
  document.getElementById('btn-present').addEventListener('click', startPresent);
  document.getElementById('present-prev').addEventListener('click', () => { presentIdx = Math.max(0, presentIdx - 1); renderPresent(); });
  document.getElementById('present-next').addEventListener('click', () => { presentIdx = Math.min(deck.slides.length - 1, presentIdx + 1); renderPresent(); });
  document.getElementById('present-exit').addEventListener('click', exitPresent);

  // Wikilink navigation: [[target|label]] → jump to matching slide
  document.addEventListener('click', e => {
    const link = e.target.closest('.wikilink');
    if (!link) return;
    const target = link.dataset.wikilink || link.getAttribute('title');
    if (!target) return;
    const slide = findSlideByTitle(target);
    if (!slide) return;
    if (!document.getElementById('present').hidden) {
      presentIdx = deck.slides.indexOf(slide);
      renderPresent();
    } else {
      activeSlideId = slide.id;
      renderAll();
    }
  });

  renderAll();
}

document.addEventListener('DOMContentLoaded', init);
