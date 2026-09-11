import { AfterViewInit, Component, ElementRef, Input, OnDestroy, QueryList, ViewChildren } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { Subscription } from 'rxjs';
import { EdaDialogCloseEvent } from '@eda/shared/components/shared-components.index';
import { EdaDialog2Component } from '@eda/shared/components/eda-dialogs/eda-dialog2/eda-dialog2.component';
import { DEFAULT_TABLE_HEADER_COLOR, DEFAULT_TABLE_BANDING_COLOR } from '@eda/configs/customizable/customizable_default';

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

    visible = true;

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
        clearTimeout(this.filterTimers[field]);
        this.filterTimers[field] = setTimeout(() => {
            table.filter(value, field, 'contains');
        }, 300);
    }

    toggleFilter(field: string): void {
        this.openFilterField = this.openFilterField === field ? null : field;
    }

    onHide() {
        this.controller.close(EdaDialogCloseEvent.NONE);
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
    }
}
