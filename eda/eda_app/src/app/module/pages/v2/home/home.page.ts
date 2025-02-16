import { Component, inject, OnInit, signal } from '@angular/core';
import { AsyncPipe, CommonModule, DatePipe, NgTemplateOutlet } from '@angular/common';
import { IconComponent } from '@eda/shared/components/icon/icon.component';
import { ReportService } from '@eda/services/api/report.service';
import { Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import * as _ from 'lodash';
import { FormsModule } from '@angular/forms';
@Component({
    selector: 'app-v2-home-page',
    standalone: true,
    imports: [FormsModule, NgTemplateOutlet, IconComponent],
    templateUrl: './home.page.html'
})
export class HomePageV2 implements OnInit {
    private reportService = inject(ReportService);
    private router = inject(Router);

    publicReports: any[] = [];
    privateReports: any[] = [];
    roleReports: any[] = [];
    sharedReports: any[] = [];

    activeFilters: string[] = ['Veure tots', 'Ajuntament'];

    tags: any[] = [];
    selectedTags = signal<any[]>([
        { label: $localize`:@@AllTags:Todos`, value: 1 }
    ]);
    isOpenTags = signal(false)
    searchTagTerm = signal("")

    constructor() { }

    ngOnInit(): void {
        this.loadReports();
    }

    private async loadReports() {
        const { publics, shared, dashboards, group } = await lastValueFrom(this.reportService.getAllReports());
        this.publicReports = publics.sort((a, b) => a.config.title.localeCompare(b.config.title));
        this.privateReports = dashboards.sort((a, b) => a.config.title.localeCompare(b.config.title));
        this.roleReports = group.sort((a, b) => a.config.title.localeCompare(b.config.title));
        this.sharedReports = shared.sort((a, b) => a.config.title.localeCompare(b.config.title));

        this.loadReportTags();
    }

    private async loadReportTags() {
        /** Obtener etiquetas únicas */
        this.tags = _.uniqBy(
            [...this.privateReports, ...this.publicReports, ...this.roleReports, ...this.sharedReports]
                .flatMap(db => db.config.tag) // Aplanamos los arrays de tags
                .filter(tag => tag !== null && tag !== undefined) // Eliminamos valores nulos o indefinidos
                .flatMap(tag => Array.isArray(tag) ? tag : [tag]) // Si es un array, lo expandimos; si no, lo mantenemos como está
                .map(tag => typeof tag === 'string' ? { label: tag, value: tag } : tag), // Convertimos en objetos { label, value }
            'value' // Eliminamos duplicados basados en el valor
        );

        // Agregar opciones adicionales
        this.tags.unshift({ label: $localize`:@@NoTag:Sin Etiqueta`, value: 0 });
        this.tags.push({ label: $localize`:@@AllTags:Todos`, value: 1 });
    }

    public openReport(report: any) {
        this.router.navigate(['/dashboard', report._id]);
    }

    public handleTagSelect(option: any): void {
        const currentFilters = this.selectedTags()
        if (currentFilters.some((filter) => filter.value === option.value)) {
          this.selectedTags.set(currentFilters.filter((filter) => filter.value !== option.value))
        } else {
          this.selectedTags.set([...currentFilters, option])
        }
        this.isOpenTags.set(false)
      }

    public filteredTags(): any[] {
        return this.tags.filter((option) => option.label.toLowerCase().includes(this.searchTagTerm().toLowerCase()))
    }

    public removeTag(filterToRemove: any): void {
        this.selectedTags.set(this.selectedTags().filter((filter) => filter.value !== filterToRemove.value))
      }

    public toggleDropdownTags(): void {
        this.isOpenTags.set(!this.isOpenTags())
    }

    public isTagSelected(optionValue: string): boolean {
        return this.selectedTags().some(filter => filter.value === optionValue);
    }
}