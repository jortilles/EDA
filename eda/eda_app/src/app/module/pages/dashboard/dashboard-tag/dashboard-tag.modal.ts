import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { FormsModule, ReactiveFormsModule, UntypedFormBuilder, } from "@angular/forms";
import { AlertService, DashboardService } from "@eda/services/service.index";
import { SharedModule } from "@eda/shared/shared.module";
import { MultiSelectModule } from "primeng/multiselect";
import { FloatLabelModule } from 'primeng/floatlabel';
import { SelectButtonModule } from "primeng/selectbutton";
import { DashboardPage } from "../dashboard.page";
import { EdaDialog2Component } from "@eda/shared/components/shared-components.index";

@Component({
  selector: 'app-dashboard-tag-modal',
  standalone: true,
  templateUrl: './dashboard-tag.modal.html',
  styleUrls: ['./dashboard-tag.modal.css'],
  imports: [SharedModule, ReactiveFormsModule, FormsModule, SelectButtonModule, MultiSelectModule, FloatLabelModule, EdaDialog2Component]
})

export class DashboardTagModal implements OnInit {
  @Output() close: EventEmitter<any> = new EventEmitter<any>();
  @Input() dashboard: DashboardPage;
  public display: boolean = false;

  public newTag: any;
  public tags: any[] = [];
  public selectedTags: any[] = [];

  // Entries the home page's tag bar synthesizes on top of real tags (untagged-dashboards filter,
  // "show everything" options) — never real tags, so they must never show up as assignable here.
  private readonly nonAssignableTagLabels = [
    $localize`:@@NoTag:Sin Etiqueta`,
    $localize`:@@AllTagsFlat:Todo`,
    $localize`:@@AllTagsGrouped:Todo agrupado`,
  ];

  constructor(private alertService: AlertService, private dashboardService: DashboardService) { }

  ngOnInit(): void {
    const tags = this.dashboard.selectedTags;
    this.selectedTags = tags == null ? [] : (Array.isArray(tags) ? tags : [tags]);

    this.loadExistingTags();
  }

  // Tags live on each dashboard's config.tag, not in a shared catalog, so the full list has to be
  // built from every dashboard the current user can see — the same source the home page's tag bar
  // uses — rather than a local cache that can drift from it (stale/removed tags, missing new ones).
  private loadExistingTags(): void {
    this.dashboardService.getDashboards().subscribe((resp: any) => {
      const allDashboards = [
        ...(resp?.dashboards || []),
        ...(resp?.group || []),
        ...(resp?.publics || []),
        ...(resp?.shared || []),
      ];

      const remoteTags = allDashboards
        .flatMap(db => db?.config?.tag)
        .filter(tag => tag !== null && tag !== undefined)
        .flatMap(tag => Array.isArray(tag) ? tag : [tag])
        .map(tag => typeof tag === 'string' ? { label: tag, value: tag } : tag);

      // Tags present on this dashboard but not yet reflected remotely (e.g. just added in this
      // session before saving) still need to be selectable.
      const localTags = this.selectedTags
        .filter((tag): tag is string => typeof tag === 'string')
        .map(tag => ({ label: tag, value: tag }));

      this.tags = Array.from(new Map([...remoteTags, ...localTags, ...this.tags].map(item => [item.label, item])).values())
        .filter(tag => !this.nonAssignableTagLabels.includes(tag.label));
    });
  }

  public setNewTag() {
    const repeated = this.tags.some(tag => (this.newTag.toUpperCase() === String(tag.value).toUpperCase()));

    if (this.newTag.length === 0) {
      this.newTag = !this.newTag;
      this.alertService.addError($localize`:@@emptyTag:Este tag esta vacío`);
    } else if (repeated) {
      this.newTag = '';
      this.alertService.addError($localize`:@@existentTag:Este tag ya existe`);
    } else {
      const tag = JSON.parse(JSON.stringify({ label: this.newTag, value: this.newTag }));
      this.tags.push(tag);
      this.newTag = '';
      this.alertService.addSuccess($localize`:@@tagCreated:Etiqueta creada correctamente`);
      (this.selectedTags ??= []).push(tag.label);
    }
  }

  public onApply() {
    this.display = false;
    // Normalize selectedTags: convert objects to strings
    const normalizedTags = this.selectedTags.map(tag =>
      typeof tag === 'string' ? tag : tag.value || tag.label
    );
    this.close.emit(normalizedTags);
    this.alertService.addSuccess($localize`:@@tagAssigned:Etiqueta asignada correctamente`);
  }

  public disableApply(): boolean {
    return false;
  }

  public onClose(): void {
    this.display = false;
    this.close.emit();
  }
}