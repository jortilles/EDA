import { AfterViewInit, Component, ElementRef, HostListener, Input, OnDestroy, QueryList, ViewChildren } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { Subscription } from 'rxjs';
import { EdaDialogCloseEvent } from '@eda/shared/components/shared-components.index';
import { EdaDialog2Component } from '@eda/shared/components/eda-dialogs/eda-dialog2/eda-dialog2.component';
import { DEFAULT_TABLE_HEADER_COLOR, DEFAULT_TABLE_BANDING_COLOR } from '@eda/configs/customizable/customizable_default';
import { FileUtiles } from '@eda/services/utils/file-utils.service';

@Component({
    standalone: true,
    selector: 'app-source-fields-dialog',
    templateUrl: './source-fields-dialog.component.html',
    styleUrls: ['./source-fields-dialog.component.css'],
    imports: [CommonModule, TableModule, InputTextModule, EdaDialog2Component],
})
export class SourceFieldsDialogComponent implements AfterViewInit, OnDestroy {
    @Input() controller: any;

    // Only one filter popup (and its input) exists at a time, created fresh by @if each time
    // it opens — so focusing it means watching this list for when it appears.
    @ViewChildren('filterInput') filterInputs!: QueryList<ElementRef<HTMLInputElement>>;
    private filterInputsSubscription?: Subscription;

    private filterTimers: Record<string, ReturnType<typeof setTimeout>> = {};

    /** Field ($index as string) whose filter popup is currently open, or null if none. */
    openFilterField: string | null = null;

    /** Current filter text per field — drives the icon's "active" color and pre-fills the
     *  input when a column's filter is reopened. */
    filterValues: Record<string, string> = {};

    visible = true;

    constructor(private fileUtiles: FileUtiles) { }

    get header(): string {
        const panelTitle = this.controller?.params?.panelTitle || '';
        // The dynamic panel name is concatenated outside $localize on purpose — the i18n
        // extraction tooling dropped the interpolation placeholder when it was embedded
        // inside the tagged template, silently swallowing the value in every translated locale.
        return $localize`:@@sourceFieldsDialogHeader:Campos de origen para ` + panelTitle;
    }

    get headers(): string[] {
        return this.controller?.params?.headers || [];
    }

    get rows(): any[][] {
        return this.controller?.params?.rows || [];
    }

    /**
     * Matches EdaTableComponent.applyBandingColors() exactly, so this table's header/banding
     * colors look identical to the panel's own table instead of the generic gray default.
     */
    private hexToRgba(hex: string, alpha: number): string {
        const clean = (hex || '#ffffff').replace('#', '');
        const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
        const n = parseInt(full, 16);
        return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
    }

    get headerColorVar(): string {
        if (this.controller?.params?.colorEnabled === false) return '#ffffff';
        return this.hexToRgba(this.controller?.params?.headerColor || DEFAULT_TABLE_HEADER_COLOR, 0.4);
    }

    get bandingColorVar(): string {
        if (this.controller?.params?.colorEnabled === false) return '#ffffff';
        return this.hexToRgba(this.controller?.params?.bandingColor || DEFAULT_TABLE_BANDING_COLOR, 0.15);
    }

    /**
     * Debounced per-column filter — no Apply/Clear buttons, filters automatically once
     * typing pauses, calling PrimeNG's own Table.filter() directly.
     */
    onFilterInput(event: Event, field: string, table: any): void {
        const value = (event.target as HTMLInputElement).value;
        this.filterValues[field] = value;
        clearTimeout(this.filterTimers[field]);
        this.filterTimers[field] = setTimeout(() => {
            table.filter(value, field, 'contains');
        }, 300);
    }

    /** ESC inside the filter input just closes the popup — exactly like clicking outside it —
     *  without touching whatever filter is already applied. */
    onFilterEscape(event: KeyboardEvent): void {
        event.stopPropagation();
        this.openFilterField = null;
    }

    toggleFilter(field: string): void {
        this.openFilterField = this.openFilterField === field ? null : field;
    }

    // Custom mouse-driven column drag — PrimeNG's native [reorderableColumns] uses the browser's
    // own HTML5 drag/drop (a static ghost image, no live feedback besides two small arrow icons),
    // which reads as rigid. This tracks the mouse directly instead, so the dragged header follows
    // the cursor 1:1 and the headers it passes over slide out of the way with a CSS transition.
    @ViewChildren('headerCell') private headerCells!: QueryList<ElementRef<HTMLTableCellElement>>;

    dragState: { dragIndex: number; dropIndex: number } | null = null;
    private dragStartX = 0;
    private dragWidths: number[] = [];
    private dragLefts: number[] = [];
    private readonly onHeaderMouseMoveBound = (event: MouseEvent) => this.onHeaderMouseMove(event);
    private readonly onHeaderMouseUpBound = () => this.onHeaderMouseUp();

    onHeaderMouseDown(event: MouseEvent, index: number): void {
        if (event.button !== 0) return;
        const target = event.target as HTMLElement;
        if (target.closest('.source-fields-sort-icon, .source-fields-filter-icon, .source-fields-delete-icon, .source-fields-filter-popup')) {
            return;
        }
        event.preventDefault();
        const cells = this.headerCells.toArray().map(ref => ref.nativeElement);
        this.dragWidths = cells.map(cell => cell.getBoundingClientRect().width);
        this.dragLefts = cells.map(cell => cell.getBoundingClientRect().left);
        this.dragStartX = event.clientX;
        this.dragState = { dragIndex: index, dropIndex: index };
        cells[index].style.willChange = 'transform';
        document.addEventListener('mousemove', this.onHeaderMouseMoveBound);
        document.addEventListener('mouseup', this.onHeaderMouseUpBound);
    }

    private onHeaderMouseMove(event: MouseEvent): void {
        if (!this.dragState) return;
        const { dragIndex } = this.dragState;
        const deltaX = event.clientX - this.dragStartX;
        const draggedCenter = this.dragLefts[dragIndex] + this.dragWidths[dragIndex] / 2 + deltaX;

        let dropIndex = 0;
        this.dragWidths.forEach((width, i) => {
            if (i === dragIndex) return;
            const otherCenter = this.dragLefts[i] + width / 2;
            if (otherCenter < draggedCenter) dropIndex++;
        });
        this.dragState.dropIndex = dropIndex;

        this.headerCells.forEach((ref, i) => {
            const cell = ref.nativeElement;
            if (i === dragIndex) {
                cell.style.transition = 'none';
                cell.style.zIndex = '5';
                cell.style.transform = `translateX(${deltaX}px)`;
                return;
            }
            let shift = 0;
            if (dragIndex < dropIndex && i > dragIndex && i <= dropIndex) {
                shift = -this.dragWidths[dragIndex];
            } else if (dragIndex > dropIndex && i >= dropIndex && i < dragIndex) {
                shift = this.dragWidths[dragIndex];
            }
            cell.style.transition = 'transform 150ms ease';
            cell.style.transform = shift ? `translateX(${shift}px)` : '';
        });
    }

    private onHeaderMouseUp(): void {
        if (!this.dragState) return;
        const { dragIndex, dropIndex } = this.dragState;
        document.removeEventListener('mousemove', this.onHeaderMouseMoveBound);
        document.removeEventListener('mouseup', this.onHeaderMouseUpBound);

        this.headerCells.forEach(ref => {
            ref.nativeElement.style.transition = '';
            ref.nativeElement.style.transform = '';
            ref.nativeElement.style.zIndex = '';
            ref.nativeElement.style.willChange = '';
        });
        this.dragState = null;

        if (dragIndex !== dropIndex) {
            this.reorderColumns(dragIndex, dropIndex);
        }
    }

    /** Keeps each row's data aligned to its (now moved) column — same splice on `headers`
     *  and on every row, since both are read positionally ($index as the "field"). */
    private reorderColumns(dragIndex: number, dropIndex: number): void {
        const headers = this.headers;
        const rows = this.rows;
        headers.splice(dropIndex, 0, headers.splice(dragIndex, 1)[0]);
        rows.forEach(row => row.splice(dropIndex, 0, row.splice(dragIndex, 1)[0]));
    }

    /**
     * View-only removal (the dialog re-fetches fresh data every time it opens, so this never
     * touches real data) — drops the column from `headers` and the same position from every
     * row, keeping them aligned the same way onColumnReorder does. Sort/filter are keyed by
     * position, so a removed column can leave them pointing at a shifted/stale index —
     * table.reset() clears that instead of trying to re-map it.
     */
    deleteColumn(index: number, table: any): void {
        const headers = this.headers;
        const rows = this.rows;
        if (!headers || index < 0 || index >= headers.length) return;
        headers.splice(index, 1);
        rows.forEach(row => row.splice(index, 1));
        this.filterValues = {};
        this.openFilterField = null;
        table.reset();
    }

    /**
     * Closes the open filter popup on any click that lands outside its icon and its own
     * popup — this runs after the icon's own (click) handler (DOM events bubble target ->
     * document), so clicking the icon itself still opens it without immediately re-closing.
     */
    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent): void {
        if (!this.openFilterField) return;
        const target = event.target as HTMLElement;
        if (!target.closest('.source-fields-filter-icon, .source-fields-filter-popup')) {
            this.openFilterField = null;
        }
    }

    onHide() {
        this.controller.close(EdaDialogCloseEvent.NONE);
    }

    /**
     * Exports exactly what's currently on screen: PrimeNG's Table keeps `filteredValue` as
     * the current filtered+sorted rows whenever any column filter is active (null otherwise,
     * not just when empty — an active filter matching zero rows is still "the current view"
     * and should export empty, not fall back to the unfiltered table). FileUtiles.exportToExcel
     * expects rows as objects keyed by column name (matching how the rest of the app exports),
     * so the positional row arrays get mapped into that shape here.
     */
    exportToExcel(table: any): void {
        const displayedRows: any[][] = table.filteredValue !== null && table.filteredValue !== undefined
            ? table.filteredValue
            : table.value;
        const headers = this.headers;
        const cols = displayedRows.map((row: any[]) => {
            const obj: Record<string, any> = {};
            headers.forEach((h, i) => { obj[h] = row[i]; });
            return obj;
        });
        const panelTitle = this.controller?.params?.panelTitle || '';
        const fileName = panelTitle ? `Campos de origen - ${panelTitle}` : 'Campos de origen';
        this.fileUtiles.exportToExcel(headers, cols, fileName);
    }

    ngAfterViewInit(): void {
        // The input only exists in the DOM while its popup is open (@if), so it's not there
        // yet at this point — watch for it to appear (and reappear, per toggle) instead.
        this.filterInputsSubscription = this.filterInputs.changes.subscribe((list: QueryList<ElementRef<HTMLInputElement>>) => {
            list.first?.nativeElement.focus();
        });
    }

    ngOnDestroy(): void {
        Object.values(this.filterTimers).forEach(timer => clearTimeout(timer));
        this.filterInputsSubscription?.unsubscribe();
        document.removeEventListener('mousemove', this.onHeaderMouseMoveBound);
        document.removeEventListener('mouseup', this.onHeaderMouseUpBound);
    }
}
