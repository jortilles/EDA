import { Directive, ElementRef, HostListener, Input, OnDestroy } from '@angular/core';
import { MailKpiVariable, MailTokenKind, MailVarToken, kpiVarTokens } from '@eda/services/utils/mail-variables.util';

type Field = HTMLInputElement | HTMLTextAreaElement;

/** Autocomplete for `${pN...}` mail variables. Attach to a subject <input> / message <textarea>.
 * When the caret sits right after an unclosed `${…` it pops a list next to the caret with every
 * matching token and its current value; Enter/Tab/click inserts it. */
@Directive({
  selector: '[edaMailVarSuggest]',
  standalone: true,
})
export class MailVarSuggestDirective implements OnDestroy {
  @Input('edaMailVarSuggest') vars: MailKpiVariable[] = [];
  /** Resolves the value shown next to each token (panel value / breakdown / …). Optional. */
  @Input('edaMailVarSuggestValue') valueResolver?: (v: MailKpiVariable, kind: MailTokenKind) => string;

  private box?: HTMLDivElement;
  private items: MailVarToken[] = [];
  private index = 0;
  private matchStart = -1; // index of `$` of the `${` being completed
  private outsideHandler = (e: MouseEvent) => {
    if (this.box && !this.box.contains(e.target as Node) && e.target !== this.el.nativeElement) this.close();
  };

  constructor(private el: ElementRef<Field>) {}

  ngOnDestroy(): void { this.close(); }

  @HostListener('input') onInput(): void { this.refresh(); }
  @HostListener('click') onClick(): void { this.refresh(); }
  @HostListener('blur') onBlur(): void { setTimeout(() => this.close(), 120); }

  @HostListener('keydown', ['$event'])
  onKeydown(e: KeyboardEvent): void {
    if (!this.box) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); this.move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); this.move(-1); }
    else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); this.choose(this.items[this.index]); }
    else if (e.key === 'Escape') { e.preventDefault(); this.close(); }
  }

  private refresh(): void {
    const el = this.el.nativeElement;
    const caret = el.selectionStart ?? el.value.length;
    const m = el.value.slice(0, caret).match(/\$\{([a-zA-Z0-9_.]*)$/);
    if (!m || !this.vars?.length) { this.close(); return; }

    const frag = (m[1] || '').toLowerCase();
    this.matchStart = caret - m[0].length;
    this.items = this.vars
      .flatMap(v => kpiVarTokens(v))
      .filter(t => t.token.slice(2).replace(/\}$/, '').toLowerCase().startsWith(frag));

    if (!this.items.length) { this.close(); return; }
    this.index = Math.min(this.index, this.items.length - 1);
    this.render(caret);
  }

  private move(delta: number): void {
    this.index = (this.index + delta + this.items.length) % this.items.length;
    this.paintRows();
  }

  private choose(item: MailVarToken): void {
    if (!item) return;
    const el = this.el.nativeElement;
    const caret = el.selectionStart ?? el.value.length;
    let after = el.value.slice(caret);
    if (after[0] === '}') after = after.slice(1); // don't leave `${...}}`
    const before = el.value.slice(0, this.matchStart);
    el.value = before + item.token + after;
    const pos = before.length + item.token.length;
    el.dispatchEvent(new Event('input', { bubbles: true })); // sync ngModel
    el.setSelectionRange(pos, pos);
    el.focus();
    this.close();
  }

  private close(): void {
    if (this.box) { this.box.remove(); this.box = undefined; }
    document.removeEventListener('mousedown', this.outsideHandler, true);
    this.items = [];
    this.index = 0;
  }

  private render(caret: number): void {
    if (!this.box) {
      this.box = document.createElement('div');
      this.box.className = 'eda-mailvar-suggest';
      Object.assign(this.box.style, {
        position: 'fixed', zIndex: '20000', maxHeight: '240px', overflowY: 'auto',
        minWidth: '260px', maxWidth: '440px', background: '#fff',
        border: '1px solid #d1d5db', borderRadius: '8px',
        boxShadow: '0 8px 24px rgba(0,0,0,.14)', fontSize: '12px', padding: '4px',
      } as CSSStyleDeclaration);
      document.body.appendChild(this.box);
      document.addEventListener('mousedown', this.outsideHandler, true);
    }
    const c = this.caretCoords(caret);
    this.box.style.top = `${Math.min(c.top + c.height + 2, window.innerHeight - 250)}px`;
    this.box.style.left = `${Math.min(c.left, window.innerWidth - 460)}px`;
    this.paintRows();
  }

  private paintRows(): void {
    if (!this.box) return;
    this.box.innerHTML = '';
    this.items.forEach((it, i) => {
      const row = document.createElement('div');
      Object.assign(row.style, {
        display: 'flex', alignItems: 'baseline', gap: '10px', justifyContent: 'space-between',
        padding: '5px 8px', borderRadius: '6px', cursor: 'pointer', whiteSpace: 'nowrap',
        background: i === this.index ? 'rgba(0,191,179,.12)' : 'transparent',
      } as CSSStyleDeclaration);
      const val = this.valueResolver ? (this.valueResolver(it.variable, it.kind) || '') : '';
      row.innerHTML =
        `<span><code style="color:#007B74">${it.token}</code>` +
        `<span style="color:#9ca3af;margin-left:6px">${it.label}</span></span>` +
        (val ? `<span style="color:#374151;overflow:hidden;text-overflow:ellipsis;max-width:220px">${this.esc(val)}</span>` : '');
      row.addEventListener('mousedown', (e) => { e.preventDefault(); this.choose(it); });
      row.addEventListener('mouseenter', () => { this.index = i; this.paintRows(); });
      this.box!.appendChild(row);
    });
  }

  private esc(s: string): string {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /** Pixel position of the caret, mirror-div technique, viewport-relative (for position:fixed). */
  private caretCoords(pos: number): { top: number; left: number; height: number } {
    const el = this.el.nativeElement;
    const s = getComputedStyle(el);
    const div = document.createElement('div');
    const copy = ['boxSizing', 'width', 'height', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
      'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'fontStyle', 'fontVariant', 'fontWeight', 'fontStretch',
      'fontSize', 'lineHeight', 'fontFamily', 'textAlign', 'textTransform', 'textIndent', 'letterSpacing', 'wordSpacing', 'tabSize'];
    Object.assign(div.style, { position: 'absolute', visibility: 'hidden', whiteSpace: el.nodeName === 'TEXTAREA' ? 'pre-wrap' : 'nowrap', wordWrap: 'break-word' } as CSSStyleDeclaration);
    copy.forEach(p => (div.style as any)[p] = (s as any)[p]);
    div.textContent = el.value.slice(0, pos);
    const span = document.createElement('span');
    span.textContent = el.value.slice(pos) || '.';
    div.appendChild(span);
    document.body.appendChild(div);
    const rect = el.getBoundingClientRect();
    const coords = {
      top: rect.top + (span.offsetTop - el.scrollTop) + parseInt(s.borderTopWidth || '0'),
      left: rect.left + (span.offsetLeft - el.scrollLeft) + parseInt(s.borderLeftWidth || '0'),
      height: parseInt(s.lineHeight || '0') || parseInt(s.fontSize || '14'),
    };
    div.remove();
    return coords;
  }
}
