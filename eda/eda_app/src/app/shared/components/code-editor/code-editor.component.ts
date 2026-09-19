import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
  forwardRef,
  inject,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { EditorState, Extension, RangeSetBuilder } from '@codemirror/state';
import {
  Decoration, DecorationSet, EditorView, MatchDecorator, ViewPlugin, ViewUpdate,
  crosshairCursor, drawSelection, dropCursor, highlightActiveLine, highlightActiveLineGutter,
  highlightSpecialChars, keymap, lineNumbers, placeholder as cmPlaceholder, rectangularSelection, tooltips,
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import {
  CompletionSource, autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap,
} from '@codemirror/autocomplete';
import {
  bracketMatching, defaultHighlightStyle, foldGutter, foldKeymap, foldService,
  indentOnInput, syntaxHighlighting,
} from '@codemirror/language';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { lintKeymap } from '@codemirror/lint';
import { MSSQL, MySQL, PLSQL, PostgreSQL, SQLDialect, SQLite, StandardSQL, sql } from '@codemirror/lang-sql';
import { html } from '@codemirror/lang-html';

/** SQL dialects with a curated (smaller, relevant) keyword set, instead of the generic
 * ANSI-standard one that surfaces obscure keywords (e.g. `current_transform_group_for_type`). */
const SQL_DIALECTS: Record<string, SQLDialect> = {
  postgresql: PostgreSQL,
  mysql: MySQL,
  mssql: MSSQL,
  sqlite: SQLite,
  plsql: PLSQL,
  standard: StandardSQL,
};
export type EdaSqlDialect = keyof typeof SQL_DIALECTS;

/** A slim, right-pointing chevron that rotates to point down when its region is open —
 * replaces CodeMirror's default plain-text fold markers ("›"/"⌄"). */
function foldMarker(open: boolean): HTMLElement {
  const el = document.createElement('span');
  el.className = 'cm-eda-fold-marker' + (open ? ' cm-eda-fold-marker--open' : '');
  el.innerHTML =
    '<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 4 10 8 6 12"></polyline></svg>';
  return el;
}

/** Equivalent to CodeMirror's `basicSetup`, but with a custom fold-gutter marker. */
const editorSetup: Extension = [
  lineNumbers(),
  highlightActiveLineGutter(),
  highlightSpecialChars(),
  history(),
  foldGutter({ markerDOM: foldMarker }),
  drawSelection(),
  dropCursor(),
  EditorState.allowMultipleSelections.of(true),
  indentOnInput(),
  syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
  bracketMatching(),
  closeBrackets(),
  autocompletion(),
  rectangularSelection(),
  crosshairCursor(),
  highlightActiveLine(),
  highlightSelectionMatches(),
  keymap.of([
    ...closeBracketsKeymap,
    ...defaultKeymap,
    ...searchKeymap,
    ...historyKeymap,
    ...foldKeymap,
    ...completionKeymap,
    ...lintKeymap,
  ]),
];

export type EdaCodeEditorLanguage = 'sql' | 'html' | 'text';

/** Highlights `${...}` template tokens (used by the mail subject/body mini-language)
 * regardless of the base language mode. */
const templateTokenMatcher = new MatchDecorator({
  regexp: /\$\{[^}]*\}/g,
  decoration: () => Decoration.mark({ class: 'cm-eda-token' }),
});
const templateTokenPlugin = ViewPlugin.define(
  (view) => ({
    decorations: templateTokenMatcher.createDeco(view),
    update(u: ViewUpdate) {
      this.decorations = templateTokenMatcher.updateDeco(u, this.decorations);
    },
  }),
  { decorations: (v) => v.decorations },
);

const CODE_BLOCK_START = /^\s*""CODE\b/;
const CODE_BLOCK_END = /^\s*CODE""\s*$/;

/** Left corporate-color band down every line of a `""CODE ... CODE""` conditional block
 * (mail template mini-language). */
function codeBlockLineDeco(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const doc = view.state.doc;
  let inBlock = false;
  for (let n = 1; n <= doc.lines; n++) {
    const line = doc.line(n);
    if (!inBlock && CODE_BLOCK_START.test(line.text)) inBlock = true;
    if (inBlock) builder.add(line.from, line.from, Decoration.line({ class: 'cm-eda-codeblock-line' }));
    if (inBlock && CODE_BLOCK_END.test(line.text) && !CODE_BLOCK_START.test(line.text)) inBlock = false;
  }
  return builder.finish();
}
const codeBlockLinePlugin = ViewPlugin.define(
  (view) => ({
    decorations: codeBlockLineDeco(view),
    update(u: ViewUpdate) {
      if (u.docChanged) this.decorations = codeBlockLineDeco(u.view);
    },
  }),
  { decorations: (v) => v.decorations },
);

/** Makes a `""CODE ... CODE""` block collapsible: folds from the end of the opening line
 * to the end of the closing `CODE""` line. */
const codeBlockFold = foldService.of((state, lineStart, lineEnd) => {
  const line = state.doc.lineAt(lineStart);
  if (!CODE_BLOCK_START.test(line.text)) return null;
  for (let n = line.number + 1; n <= state.doc.lines; n++) {
    const l = state.doc.line(n);
    if (CODE_BLOCK_END.test(l.text)) return { from: lineEnd, to: l.to };
  }
  return null;
});

const FONT_SIZE_STORAGE_KEY = 'eda-code-editor-font-size';
const MIN_FONT_PX = 11;
const MAX_FONT_PX = 22;

/** Read/write code editor with syntax highlighting, bracket matching and autocomplete
 * for SQL/HTML/plain text. Wraps CodeMirror 6 as a standard Angular form control
 * (works with formControlName and [(ngModel)]). */
@Component({
  selector: 'eda-code-editor',
  standalone: true,
  template: `
    <div #host class="eda-code-editor-host"></div>
    @if (showZoomControls) {
      <div class="eda-code-editor-zoom">
        <button type="button" (click)="zoomOut()" title="Reducir tamaño de letra" i18n-title="@@codeEditorZoomOut">−</button>
        <button type="button" (click)="zoomIn()" title="Aumentar tamaño de letra" i18n-title="@@codeEditorZoomIn">+</button>
      </div>
    }
  `,
  styleUrl: './code-editor.component.css',
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => CodeEditorComponent), multi: true },
  ],
})
export class CodeEditorComponent implements AfterViewInit, OnDestroy, OnChanges, ControlValueAccessor {
  @Input() language: EdaCodeEditorLanguage = 'sql';
  /** SQL keyword dialect for autocomplete/highlighting — pick the engine this content actually
   * targets when known (defaults to PostgreSQL, a reasonable general default). */
  @Input() sqlDialect: EdaSqlDialect = 'postgresql';
  @Input() placeholder = '';
  /** Starting box height (fixed, not just a floor) — content taller than this scrolls inside it,
   * same as the old `<textarea rows="…">` it replaced. Drag the corner handle to grow it. */
  @Input() minHeight = '120px';
  /** Stretch to the height of the parent flex/grid container instead of `minHeight`, and disables
   * the drag handle (resizing wouldn't make sense against a flex-filled box). */
  @Input() @HostBinding('class.eda-code-editor--fill') fillHeight = false;
  /** Lets the user drag the bottom-right corner to grow the box, like a native `<textarea>`. */
  @Input() resizable = true;
  /** Display-only: no typing, no cursor, dimmed like a disabled field. Independent of the
   * ControlValueAccessor `disabled` state (useful outside of forms, e.g. a live preview). */
  @Input() readOnly = false;
  /** Highlights `${variable}` tokens (mail template mini-language) on top of the base language. */
  @Input() highlightTemplateTokens = false;
  /** Marks `""CODE ... CODE""` conditional blocks (mail template mini-language) with a left
   * corporate-color band and makes them foldable from the gutter. */
  @Input() highlightCodeBlocks = false;
  /** Custom autocomplete source (e.g. `${...}` variable tokens); replaces the language's own
   * completions when set. */
  @Input() completionSource?: CompletionSource;
  /** Starting font size until the user picks their own with the zoom controls (their choice is
   * then remembered — shared across every editor in the app — and takes over from here). */
  @Input() fontSize = '14px';
  /** Shows the A−/A+ zoom buttons in the corner. */
  @Input() showZoomControls = true;

  /** Fires on every content change, independent of the ControlValueAccessor wiring
   * (useful for `formControlName` hosts, where a coexisting `[(ngModel)]` never binds). */
  @Output() valueChange = new EventEmitter<string>();
  /** Native-like focus/blur events — a custom element's own `focus`/`blur` DOM events don't
   * bubble, so the inner editor's focus state is re-emitted here. */
  @Output() focused = new EventEmitter<void>();
  @Output() blurred = new EventEmitter<void>();

  @ViewChild('host', { static: true }) hostRef!: ElementRef<HTMLDivElement>;
  private hostElement = inject(ElementRef<HTMLElement>).nativeElement;

  @HostBinding('style.resize') get hostResize(): string {
    return this.resizable && !this.fillHeight ? 'vertical' : 'none';
  }

  private view?: EditorView;
  private value = '';
  private disabled = false;
  private currentFontPx = 14;
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  ngAfterViewInit(): void {
    this.applyHeight();
    this.currentFontPx = this.readStoredFontPx() ?? this.parseFontPx(this.fontSize);
    this.view = new EditorView({
      state: EditorState.create({ doc: this.value, extensions: this.buildExtensions() }),
      parent: this.hostRef.nativeElement,
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['minHeight'] || changes['fillHeight']) this.applyHeight();
    if (!this.view) return;
    if (changes['language'] || changes['sqlDialect'] || changes['placeholder'] || changes['minHeight'] || changes['fillHeight']
      || changes['readOnly'] || changes['highlightTemplateTokens'] || changes['highlightCodeBlocks']
      || changes['completionSource'] || changes['fontSize']) {
      this.rebuildState();
    }
  }

  /** Grows/shrinks the font size (clamped, persisted, shared across every editor on the page). */
  zoomIn(): void { this.setFontPx(this.currentFontPx + 1); }
  zoomOut(): void { this.setFontPx(this.currentFontPx - 1); }

  private setFontPx(px: number): void {
    const clamped = Math.min(MAX_FONT_PX, Math.max(MIN_FONT_PX, px));
    if (clamped === this.currentFontPx) return;
    this.currentFontPx = clamped;
    try { localStorage.setItem(FONT_SIZE_STORAGE_KEY, String(clamped)); } catch { /* private mode, storage disabled, ... */ }
    this.rebuildState();
  }

  private parseFontPx(v: string): number {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 14;
  }

  private readStoredFontPx(): number | null {
    try {
      const n = parseFloat(localStorage.getItem(FONT_SIZE_STORAGE_KEY) ?? '');
      return Number.isFinite(n) ? n : null;
    } catch {
      return null;
    }
  }

  private rebuildState(): void {
    if (!this.view) return;
    const doc = this.view.state.doc.toString();
    this.view.setState(EditorState.create({ doc, extensions: this.buildExtensions() }));
  }

  /** Sets the box's starting height as a plain inline style (once), so it never fights the
   * browser's own inline `style.height` write while the user drags the resize handle. */
  private applyHeight(): void {
    this.hostElement.style.height = this.fillHeight ? '' : this.minHeight;
  }

  ngOnDestroy(): void {
    this.view?.destroy();
  }

  @HostListener('click')
  onHostClick(): void {
    this.view?.focus();
  }

  writeValue(value: string): void {
    this.value = value ?? '';
    if (this.view && this.view.state.doc.toString() !== this.value) {
      this.view.dispatch({ changes: { from: 0, to: this.view.state.doc.length, insert: this.value } });
    }
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    this.rebuildState();
  }

  /** Programmatic focus (e.g. from a parent that tracks "which field was last active"). */
  focus(): void {
    this.view?.focus();
  }

  /** Inserts `text` at the current cursor position (replacing the selection, if any) and
   * places the cursor right after it. Used by "insert token" style toolboxes. */
  insertAtCursor(text: string): void {
    if (!this.view) return;
    const { from, to } = this.view.state.selection.main;
    this.view.dispatch({
      changes: { from, to, insert: text },
      selection: { anchor: from + text.length },
    });
    this.view.focus();
  }

  private buildExtensions(): Extension[] {
    const readOnly = this.disabled || this.readOnly;
    const extensions: Extension[] = [
      editorSetup,
      keymap.of([indentWithTab]),
      EditorView.lineWrapping,
      EditorView.editable.of(!readOnly),
      EditorState.readOnly.of(readOnly),
      // Popups (autocomplete, tooltips) render into <body> with fixed positioning so they
      // aren't clipped by a dialog's `overflow: hidden`/`auto` ancestor.
      tooltips({ parent: document.body, position: 'fixed' }),
      EditorView.theme({
        '&': { fontSize: `${this.currentFontPx}px`, height: '100%' },
        '.cm-scroller': {
          fontFamily: "'SFMono-Regular', Consolas, Menlo, monospace",
          lineHeight: '1.5',
          height: '100%',
          overflow: 'auto',
        },
        '&.cm-focused': { outline: 'none' },
        '.cm-eda-token': {
          color: 'var(--corporate-primary-dark, #007b74)',
          fontWeight: '600',
          background: 'rgba(var(--corporate-primary-rgb, 0, 191, 179), 0.08)',
          borderRadius: '3px',
        },
        '.cm-eda-codeblock-line': {
          borderLeft: '3px solid var(--corporate-primary, #00bfb3)',
          background: 'rgba(var(--corporate-primary-rgb, 0, 191, 179), 0.05)',
          paddingLeft: '8px',
        },
        '.cm-tooltip': { zIndex: '100000' },
        '.cm-tooltip-autocomplete ul': { maxHeight: '18em', fontSize: `${this.currentFontPx}px` },
        '.cm-foldGutter': { width: '0.9em' },
        '.cm-eda-fold-marker': {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          color: '#9ca3af',
          cursor: 'pointer',
          transition: 'color .15s ease',
        },
        '.cm-eda-fold-marker:hover': { color: 'var(--corporate-primary, #00bfb3)' },
        '.cm-eda-fold-marker svg': { transition: 'transform .15s ease' },
        '.cm-eda-fold-marker--open svg': { transform: 'rotate(90deg)' },
        '.cm-foldPlaceholder': {
          background: 'rgba(var(--corporate-primary-rgb, 0, 191, 179), 0.12)',
          border: 'none',
          color: 'var(--corporate-primary-dark, #007b74)',
          borderRadius: '4px',
          padding: '0 6px',
          margin: '0 2px',
        },
      }),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          this.value = update.state.doc.toString();
          this.onChange(this.value);
          this.valueChange.emit(this.value);
        }
        if (update.focusChanged) {
          if (update.view.hasFocus) {
            this.focused.emit();
          } else {
            this.onTouched();
            this.blurred.emit();
          }
        }
      }),
    ];
    if (this.language === 'sql') extensions.push(sql({ dialect: SQL_DIALECTS[this.sqlDialect] ?? PostgreSQL }));
    else if (this.language === 'html') extensions.push(html());
    if (this.highlightTemplateTokens) extensions.push(templateTokenPlugin);
    if (this.highlightCodeBlocks) extensions.push(codeBlockLinePlugin, codeBlockFold);
    if (this.completionSource) extensions.push(autocompletion({ override: [this.completionSource] }));
    if (this.placeholder) extensions.push(cmPlaceholder(this.placeholder));
    return extensions;
  }
}
