import { Component, ChangeDetectionStrategy, ViewEncapsulation, Input, forwardRef, ChangeDetectorRef, ElementRef, Output, EventEmitter, AfterViewInit, AfterViewChecked } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { CommonModule } from '@angular/common';
export const KNOB_VALUE_ACCESSOR: any = {
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => Knob),
    multi: true
};

@Component({
    standalone: true,
    selector: 'p-knob',
    template: `
        <div [ngClass]="containerClass()" [class]="styleClass" [ngStyle]="style">
        <svg viewBox="0 0 100 100" [style.width]="size + 'px'" [style.height]="size + 'px'" (click)="onClick($event)" (mousedown)="onMouseDown($event)" (mouseup)="onMouseUp($event)"
            (touchstart)="onTouchStart($event)" (touchend)="onTouchEnd($event)">
            <path [attr.d]="rangePath()" [attr.stroke-width]="strokeWidth" [attr.stroke]="rangeColor" class="p-knob-range"></path>
            <ng-container *ngIf="gradientMode">
                <path *ngFor="let seg of visibleSegments; trackBy: trackBySegmentIndex"
                      [attr.d]="seg.path" [attr.stroke-width]="strokeWidth"
                      [attr.stroke]="seg.color" fill="none" class="p-knob-value"></path>
            </ng-container>
            <path *ngIf="!gradientMode" [attr.d]="valuePath()" [attr.stroke-width]="strokeWidth" [attr.stroke]="valueColor" class="p-knob-value"></path>
            <text *ngIf="showValue" [attr.x]="50" [attr.y]="57" text-anchor="middle"  [class]="textClass" [attr.name]="name">{{valueToDisplay()}}</text>
            <text *ngIf="mustShow()" [attr.x]="50" [attr.y]="65" text-anchor="middle"  class="p-knob-infotext">{{compareValueToDisplay()}}</text>
            <text [attr.x]="20" [attr.y]="100"  text-anchor="middle"  class="p-knob-infotext">{{min.toLocaleString('de-DE', {maximumFractionDigits: 6 })}}</text>
            <text [attr.x]="80" [attr.y]="100"  text-anchor="middle" class="p-knob-infotext">{{max.toLocaleString('de-DE', {maximumFractionDigits: 6 })}}</text>
        </svg>
        </div>
    `,
    providers: [KNOB_VALUE_ACCESSOR],
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    styleUrls: ['./knob.css'],
    imports: [CommonModule]
})
export class Knob implements AfterViewInit, AfterViewChecked {

    @Input() styleClass: string;

    @Input() style: any;

    @Input() severity: string;

    @Input() valueColor: string = "var(--knob-value)";

    @Input() rangeColor: string = "var(--knob-range)";

    @Input() textColor: string = "var(--knob-text)";

    @Input() valueTemplate: string = "{value}";

    @Input() name: string;

    @Input() size: number = 100;

    @Input() step: number = 1;

    @Input() min: number = 0;

    @Input() comprareValue: number = 0;

    @Input() max: number = 100;

    @Input() strokeWidth: number = 20;

    @Input() disabled: boolean;

    @Input() showValue: boolean = true;

    @Input() readonly: boolean = false;

    @Input() textClass : string;

    @Input() gradientMode: boolean = false;

    private static readonly SEG_COLORS = [
        '#cc2200', '#e03c00', '#f55a00', '#ff8000',
        '#ffaa00', '#ffcc00', '#aacc00', '#55bb00',
    ];

    get visibleSegments(): { path: string; color: string }[] {
        const colors = Knob.SEG_COLORS;
        const N = colors.length;
        const result: { path: string; color: string }[] = [];

        for (let i = 0; i < N; i++) {
            const segStartVal = this.min + (i / N) * (this.max - this.min);
            const segEndVal   = this.min + ((i + 1) / N) * (this.max - this.min);

            if (this._value <= segStartVal) break;

            const clampedEnd = Math.min(this._value, segEndVal);
            const startRad = this.mapRange(segStartVal, this.min, this.max, this.minRadians, this.maxRadians);
            const endRad   = this.mapRange(clampedEnd,  this.min, this.max, this.minRadians, this.maxRadians);

            const x1 = this.midX + Math.cos(startRad) * this.radius;
            const y1 = this.midY - Math.sin(startRad) * this.radius;
            const x2 = this.midX + Math.cos(endRad)   * this.radius;
            const y2 = this.midY - Math.sin(endRad)   * this.radius;
            const large = Math.abs(startRad - endRad) > Math.PI ? 1 : 0;

            result.push({
                path:  `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${this.radius} ${this.radius} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`,
                color: colors[i]
            });
        }

        return result;
    }

    @Output() onChange: EventEmitter<any> = new EventEmitter();

    radius: number = 40;
    midX: number = 50;
    midY: number = 50;
    minRadians: number = 4 * Math.PI / 3;
    maxRadians: number = -Math.PI / 3;
    value: number = null;

    windowMouseMoveListener: any;
    windowMouseUpListener: any;
    windowTouchMoveListener: any;
    windowTouchEndListener: any;

    onModelChange: Function = () => {};
    onModelTouched: Function = () => {};

    constructor(private cd: ChangeDetectorRef, private el: ElementRef) {}

    /** Stable per-segment identity for gradientMode's *ngFor - visibleSegments is a getter that
     * builds a brand-new array of new objects on every check, so without trackBy Angular would
     * treat every change-detection pass (e.g. the outer eda-knob's resize observer calling
     * detectChanges()) as "all segments removed, all new ones added": it would destroy and
     * recreate every segment <path>, permanently losing the entrance reveal below (the fresh
     * paths never get animated, so they'd stay at the CSS opacity:0 they start at - segment index
     * is stable across recomputes since SEG_COLORS/the band count never changes, only how many
     * bands are visible. */
    trackBySegmentIndex(index: number): number {
        return index;
    }

    ngAfterViewInit(): void {
        this.revealValuePaths();
    }

    /**
     * Idempotent entrance-reveal check, re-run after every view check (cheap - only touches
     * paths that don't yet have .p-knob-value-animate) so any segment path that appears or gets
     * recreated after the initial render - despite trackBy, e.g. before the first genuine layout
     * pass has given it a non-zero length - still gets its one-time draw-in instead of staying
     * invisible. Draws the value arc(s) in from nothing, like a stopwatch hand sweeping up to the
     * reading, via the classic SVG stroke-dasharray/dashoffset reveal (dasharray = the path's own
     * real length, dashoffset animating that same length down to 0) - the arc's endpoint is
     * already correct as of first paint, only how much of the stroke is "drawn in" changes.
     */
    ngAfterViewChecked(): void {
        this.revealValuePaths();
    }

    private revealValuePaths(): void {
        const paths: NodeListOf<SVGPathElement> = this.el.nativeElement.querySelectorAll('.p-knob-value:not(.p-knob-value-animate)');
        paths.forEach((path: SVGPathElement) => {
            const length = path.getTotalLength();
            if (length === 0) return; // not laid out yet - retry on the next view check
            path.style.strokeDasharray = `${length}`;
            path.style.strokeDashoffset = `${length}`;
            // Force a reflow so the browser registers the starting offset before the reveal
            // class is added - otherwise it can batch both into one frame and skip the draw-in.
            path.getBoundingClientRect();
            path.classList.add('p-knob-value-animate');
        });
    }

    mapRange(x, inMin, inMax, outMin, outMax) {
        return (x - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
    }

    onClick(event) {
        if (!this.disabled && !this.readonly) this.updateValue(event.offsetX, event.offsetY);
    }

    updateValue(offsetX, offsetY) {
        let dx = offsetX - this.size / 2;
        let dy = this.size / 2 - offsetY;
        let angle = Math.atan2(dy, dx);
        let start = -Math.PI / 2 - Math.PI / 6;
        this.updateModel(angle, start);
    }

    updateModel(angle, start) {
        let mappedValue;
        if (angle > this.maxRadians)
            mappedValue = this.mapRange(angle, this.minRadians, this.maxRadians, this.min, this.max);
        else if (angle < start)
            mappedValue = this.mapRange(angle + 2 * Math.PI, this.minRadians, this.maxRadians, this.min, this.max);
        else
            return;
        this.value = Math.round((mappedValue - this.min) / this.step) * this.step + this.min;
        this.onModelChange(this.value);
        this.onChange.emit(this.value);
    }

    onMouseDown(event) {
        if (!this.disabled && !this.readonly) {
            this.windowMouseMoveListener = this.onMouseMove.bind(this);
            this.windowMouseUpListener   = this.onMouseUp.bind(this);
            window.addEventListener('mousemove', this.windowMouseMoveListener);
            window.addEventListener('mouseup',   this.windowMouseUpListener);
            event.preventDefault();
        }
    }

    onMouseUp(event) {
        if (!this.disabled && !this.readonly) {
            window.removeEventListener('mousemove', this.windowMouseMoveListener);
            window.removeEventListener('mouseup',   this.windowMouseUpListener);
            this.windowMouseUpListener = this.windowMouseMoveListener = null;
            event.preventDefault();
        }
    }

    onTouchStart(event) {
        if (!this.disabled && !this.readonly) {
            this.windowTouchMoveListener = this.onTouchMove.bind(this);
            this.windowTouchEndListener  = this.onTouchEnd.bind(this);
            window.addEventListener('touchmove', this.windowTouchMoveListener);
            window.addEventListener('touchend',  this.windowTouchEndListener);
            event.preventDefault();
        }
    }

    onTouchEnd(event) {
        if (!this.disabled && !this.readonly) {
            window.removeEventListener('touchmove', this.windowTouchMoveListener);
            window.removeEventListener('touchend',  this.windowTouchEndListener);
            this.windowTouchMoveListener = this.windowTouchEndListener = null;
            event.preventDefault();
        }
    }

    onMouseMove(event) {
        if (!this.disabled && !this.readonly) {
            this.updateValue(event.offsetX, event.offsetY);
            event.preventDefault();
        }
    }

    onTouchMove(event) {
        if (!this.disabled && !this.readonly && event.touches.length === 1) {
            const rect  = this.el.nativeElement.children[0].getBoundingClientRect();
            const touch = event.targetTouches.item(0);
            this.updateValue(touch.clientX - rect.left, touch.clientY - rect.top);
        }
    }

    writeValue(value: any): void { this.value = value; this.cd.markForCheck(); }
    registerOnChange(fn: Function): void { this.onModelChange = fn; }
    registerOnTouched(fn: Function): void { this.onModelTouched = fn; }
    setDisabledState(val: boolean): void { this.disabled = val; this.cd.markForCheck(); }

    containerClass() {
        return { 'p-knob p-component': true, 'p-disabled': this.disabled };
    }

    rangePath() {
        return `M ${this.minX()} ${this.minY()} A ${this.radius} ${this.radius} 0 1 1 ${this.maxX()} ${this.maxY()}`;
    }

    valuePath() {
        return `M ${this.zeroX()} ${this.zeroY()} A ${this.radius} ${this.radius} 0 ${this.largeArc()} ${this.sweep()} ${this.valueX()} ${this.valueY()}`;
    }

    zeroRadians() {
        return this.min > 0 && this.max > 0
            ? this.mapRange(this.min, this.min, this.max, this.minRadians, this.maxRadians)
            : this.mapRange(0, this.min, this.max, this.minRadians, this.maxRadians);
    }

    valueRadians() { return this.mapRange(this._value, this.min, this.max, this.minRadians, this.maxRadians); }
    minX() { return this.midX + Math.cos(this.minRadians) * this.radius; }
    minY() { return this.midY - Math.sin(this.minRadians) * this.radius; }
    maxX() { return this.midX + Math.cos(this.maxRadians) * this.radius; }
    maxY() { return this.midY - Math.sin(this.maxRadians) * this.radius; }
    zeroX() { return this.midX + Math.cos(this.zeroRadians()) * this.radius; }
    zeroY() { return this.midY - Math.sin(this.zeroRadians()) * this.radius; }
    valueX() { return this.midX + Math.cos(this.valueRadians()) * this.radius; }
    valueY() { return this.midY - Math.sin(this.valueRadians()) * this.radius; }
    largeArc() { return Math.abs(this.zeroRadians() - this.valueRadians()) < Math.PI ? 0 : 1; }
    sweep() { return this.valueRadians() > this.zeroRadians() ? 0 : 1; }

    valueToDisplay() { return this.valueTemplate.replace('{value}', this._value.toLocaleString('de-DE')); }
    compareValueToDisplay() { return this.valueTemplate.replace('{value}', 'Vs ' + this.comprareValue.toLocaleString('de-DE')); }
    mustShow() { return this._value > this.comprareValue; }

    get _value(): number { return this.value != null ? this.value : this.min; }
}
