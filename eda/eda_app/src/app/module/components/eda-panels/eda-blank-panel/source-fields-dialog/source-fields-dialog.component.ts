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

    // This dialog only ever closes (view-only, no Apply button), so "Cerrar"/"Close" reads
    // better than eda-dialog2's default "Cancelar"/"Cancel".
    readonly closeLabel = $localize`:@@cerrarBtn:Cerrar`;

    constructor(private fileUtiles: FileUtiles) { }

    get header(): string {
        const panelTitle = this.controller?.params?.panelTitle || '';
        // The dynamic panel name is concatenated outside $localize on purpose — the i18n
        // extraction tooling dropped the interpolation placeholder when it was embedded
        // inside the tagged template, silently swallowing the value in every translated locale.
        return $localize`:@@sourceFieldsDialogHeader:Campos de origen para ` + panelTitle;
    }

    /** Same 800px threshold as the @media (max-height: 800px) rule in the stylesheet. PrimeNG's
     *  own `.p-dialog { max-height: 90% }` silently caps whatever we request here — asking for
     *  more than 90vh does nothing to the dialog box itself, it just leaves the inner content
     *  (sized independently, e.g. the table's own scrollHeight) taller than the space the dialog
     *  actually got, which is what was producing the outer vertical scrollbar. 90vh matches that
     *  real ceiling instead of a value that gets clamped anyway. */
    get dialogHeight(): string {
        return window.innerHeight <= 800 ? '90vh' : '88vh';
    }

    /** Large screens keep a fixed scrollHeight (works fine, plenty of headroom under the 90vh
     *  cap). On laptop screens 'flex' makes PrimeNG size the table to fill exactly whatever
     *  space is actually left inside the dialog — see the @media (max-height:800px) flex chain
     *  in the stylesheet — instead of guessing a fixed vh that's either too tall (outer scroll)
     *  or leaves the table smaller than it could be. */
    get tableScrollHeight(): string {
        return window.innerHeight <= 800 ? 'flex' : '64vh';
    }

    /** The SQL already built (and executed) to fetch what's shown here — sent back purely for
     *  display, so the info icon can show it without running anything again. Empty when it
     *  wasn't returned (e.g. an older API), in which case the icon just doesn't render. */
    get sql(): string {
        return this.controller?.params?.sql || '';
    }

    showQueryPopup = false;
    copied = false;
    private copiedTimer?: ReturnType<typeof setTimeout>;

    readonly copyTooltip = $localize`:@@sourceFieldsCopyQuery:Copiar`;
    readonly copiedTooltip = $localize`:@@sourceFieldsCopyQueryDone:Copiado`;

    toggleQueryPopup(event: Event): void {
        event.stopPropagation();
        this.showQueryPopup = !this.showQueryPopup;
    }

    copyQuery(event: Event): void {
        event.stopPropagation();
        navigator.clipboard.writeText(this.sql).then(() => {
            this.copied = true;
            clearTimeout(this.copiedTimer);
            this.copiedTimer = setTimeout(() => this.copied = false, 2000);
        });
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

    globalFilterValue = '';
    private globalFilterTimer?: ReturnType<typeof setTimeout>;

    /** Index strings for every current column — recomputed from `headers`, so a column
     *  delete/reorder keeps this in sync without any extra bookkeeping. */
    get globalFilterFields(): string[] {
        return this.headers.map((_, i) => i.toString());
    }

    /** Same debounced pattern as the per-column filters, but scoped to every field at once
     *  via PrimeNG's own Table.filterGlobal(). */
    onGlobalFilterInput(event: Event, table: any): void {
        const value = (event.target as HTMLInputElement).value;
        this.globalFilterValue = value;
        clearTimeout(this.globalFilterTimer);
        this.globalFilterTimer = setTimeout(() => {
            table.filterGlobal(value, 'contains');
        }, 300);
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
    private dragTable: any = null;
    private readonly onHeaderMouseMoveBound = (event: MouseEvent) => this.onHeaderMouseMove(event);
    private readonly onHeaderMouseUpBound = () => this.onHeaderMouseUp();

    onHeaderMouseDown(event: MouseEvent, index: number, table: any): void {
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
        this.dragTable = table;
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
        const table = this.dragTable;
        this.dragTable = null;
        this.dragState = null;

        if (dragIndex !== dropIndex) {
            this.reorderColumns(dragIndex, dropIndex, table);
        }
    }

    /** Where an old column index ends up after moving one column from dragIndex to dropIndex
     *  (the same single-splice move used on `headers`/`rows`), so other index-keyed state
     *  (filterValues) can be kept in sync without redoing the splice itself. */
    private mapReorderedIndex(oldIndex: number, dragIndex: number, dropIndex: number): number {
        if (oldIndex === dragIndex) return dropIndex;
        if (dragIndex < dropIndex && oldIndex > dragIndex && oldIndex <= dropIndex) return oldIndex - 1;
        if (dragIndex > dropIndex && oldIndex >= dropIndex && oldIndex < dragIndex) return oldIndex + 1;
        return oldIndex;
    }

    /**
     * Keeps each row's data aligned to its (now moved) column — same splice on `headers` and
     * on every row, since both are read positionally ($index as the "field"). filterValues is
     * keyed by index the same way, so without remapping it an applied filter would visually
     * "stay" at the old index instead of following the column it was set on — and PrimeNG's
     * own filter state (also field-keyed) would keep filtering whatever column ends up at
     * that old index, not the one the user actually filtered. Re-applying filter() at the new
     * index (and clearing it at the vacated old index) keeps both in sync.
     */
    private reorderColumns(dragIndex: number, dropIndex: number, table: any): void {
        const headers = this.headers;
        const rows = this.rows;
        headers.splice(dropIndex, 0, headers.splice(dragIndex, 1)[0]);
        rows.forEach(row => row.splice(dropIndex, 0, row.splice(dragIndex, 1)[0]));

        if (Object.keys(this.filterValues).length === 0) return;

        const remapped: Record<string, string> = {};
        const staleFields = new Set<string>();
        Object.entries(this.filterValues).forEach(([field, value]) => {
            const newIndex = this.mapReorderedIndex(Number(field), dragIndex, dropIndex);
            remapped[newIndex.toString()] = value;
            if (newIndex.toString() !== field) staleFields.add(field);
        });
        this.filterValues = remapped;
        if (this.openFilterField !== null) {
            this.openFilterField = this.mapReorderedIndex(Number(this.openFilterField), dragIndex, dropIndex).toString();
        }

        staleFields.forEach(field => table.filter('', field, 'contains'));
        Object.entries(remapped).forEach(([field, value]) => table.filter(value, field, 'contains'));
    }

    /** LIFO stack of deleted columns for this dialog session — each entry's removed values are
     *  keyed by the row's own array reference (not its index), so they still land on the right
     *  row on restore even if the user sorted the table in between (PrimeNG sorts `rows` in
     *  place, but the row array objects themselves keep their identity). */
    private deletedColumnsStack: { index: number; header: string; values: Map<any[], any> }[] = [];

    get canRestoreColumn(): boolean {
        return this.deletedColumnsStack.length > 0;
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

        const values = new Map<any[], any>();
        rows.forEach(row => values.set(row, row[index]));
        this.deletedColumnsStack.push({ index, header: headers[index], values });

        headers.splice(index, 1);
        rows.forEach(row => row.splice(index, 1));
        this.filterValues = {};
        this.openFilterField = null;
        this.resetTableColumnState(table);
    }

    /**
     * Undoes the most recent deleteColumn — only a simple LIFO undo, not a full history: the
     * restored index is clamped to the current column count, since a column reorder done after
     * the delete isn't reconciled against the original position.
     */
    restoreColumn(table: any): void {
        const entry = this.deletedColumnsStack.pop();
        if (!entry) return;
        const headers = this.headers;
        const rows = this.rows;
        const index = Math.min(entry.index, headers.length);

        headers.splice(index, 0, entry.header);
        rows.forEach(row => row.splice(index, 0, entry.values.get(row)));
        this.filterValues = {};
        this.openFilterField = null;
        this.resetTableColumnState(table);
    }

    /**
     * Clears sort and per-column filters after a column's index shifts (same intent as
     * table.reset()), but keeps the global filter applied instead of wiping it too.
     * table.reset() sets filteredValue to null synchronously — a full, unfiltered render —
     * and only reapplies a global filter later once PrimeNG's own internal filter debounce
     * fires, which showed up as a visible flash of the whole table before the search
     * re-narrowed it a moment later. Leaving 'global' in table.filters and calling
     * table._filter() once (bypassing that debounce, same as PrimeNG's own internal callers
     * do) recomputes the correct filtered result in a single synchronous pass instead.
     */
    private resetTableColumnState(table: any): void {
        table._sortField = null;
        table._sortOrder = table.defaultSortOrder;
        table._multiSortMeta = null;
        table.tableService.onSort(null);
        Object.keys(table.filters).forEach(field => {
            if (field !== 'global') delete table.filters[field];
        });
        table.first = 0;
        table._filter();
    }

    /**
     * Closes the open filter popup (and the query popup) on any click that lands outside its
     * own icon/popup — this runs after the icon's own (click) handler (DOM events bubble
     * target -> document), so clicking the icon itself still opens it without immediately
     * re-closing.
     */
    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent): void {
        const target = event.target as HTMLElement;
        if (this.openFilterField && !target.closest('.source-fields-filter-icon, .source-fields-filter-popup')) {
            this.openFilterField = null;
        }
        if (this.showQueryPopup && !target.closest('.source-fields-info-icon, .source-fields-query-popup')) {
            this.showQueryPopup = false;
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
        clearTimeout(this.globalFilterTimer);
        clearTimeout(this.copiedTimer);
        this.filterInputsSubscription?.unsubscribe();
        document.removeEventListener('mousemove', this.onHeaderMouseMoveBound);
        document.removeEventListener('mouseup', this.onHeaderMouseUpBound);
    }
}
