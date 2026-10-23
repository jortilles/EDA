import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { FormsModule, ReactiveFormsModule, UntypedFormBuilder, } from "@angular/forms";
import { AlertService, DashboardService } from "@eda/services/service.index";
import { SharedModule } from "@eda/shared/shared.module";
import { MultiSelectModule } from "primeng/multiselect";
import { FloatLabelModule } from 'primeng/floatlabel';
import { SelectButtonModule } from "primeng/selectbutton";
import * as _ from 'lodash';
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
  public tags: any[];
  public selectedTags: any[] = [];

  constructor(private alertService: AlertService, private dashboardService: DashboardService) { }

  ngOnInit(): void {
    // We retrieve all tags stored locally as an immediate fallback while the full list loads
    const tags = JSON.parse(localStorage.getItem('tags')) || [];
    this.selectedTags = this.dashboard.selectedTags;
    this.tags = _.uniqBy(tags, 'value');

    // If this.tags is not an array because they are legacy tags, we need to convert it into an array
    if(!Array.isArray(this.tags)){
      this.tags = [this.tags];
    }

    // We add the tags present in this document in case they are not stored locally
    if(!Array.isArray(this.selectedTags)){
      this.selectedTags = [this.selectedTags];
    }

    // Add tag values that come from imports
    this.tags.push(...this.selectedTags.filter(  (tag): tag is string => typeof tag === "string").map(tag => ({label: tag,value: tag})));

    // Remove duplicates by 'label' in case they are already stored locally and avoid repeating them
    this.tags = Array.from(new Map(this.tags.map(item => [item.label, item])).values());

    this.loadExistingTags();
  }

  // Tags live on each dashboard's config.tag, not in a shared catalog, so other users' tags only
  // show up here if we pull them from every dashboard the current user can see.
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

      this.tags.push(...remoteTags);
      this.tags = Array.from(new Map(this.tags.map(item => [item.label, item])).values());
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
      localStorage.setItem('tags', JSON.stringify(this.tags));
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