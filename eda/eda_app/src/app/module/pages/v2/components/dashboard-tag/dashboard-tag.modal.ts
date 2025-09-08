import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { FormsModule, ReactiveFormsModule, UntypedFormBuilder, } from "@angular/forms";
import { AlertService } from "@eda/services/service.index";
import { SharedModule } from "@eda/shared/shared.module";
import { MultiSelectModule } from "primeng/multiselect";
import { FloatLabelModule } from 'primeng/floatlabel';
import { SelectButtonModule } from "primeng/selectbutton";
import * as _ from 'lodash';
import { DashboardPageV2 } from "../../dashboard/dashboard.page";

@Component({
  selector: 'app-dashboard-tag-modal',
  standalone: true,
  templateUrl: './dashboard-tag.modal.html',
  imports: [SharedModule, ReactiveFormsModule, FormsModule, SelectButtonModule, MultiSelectModule, FloatLabelModule]
})

export class DashboardTagModal implements OnInit {
  @Output() close: EventEmitter<any> = new EventEmitter<any>();
  @Input() dashboard: DashboardPageV2;
  public display: boolean = false;

  public newTag: any;
  public tags: any[];
  public selectedTags: any[] = [];

  constructor(private alertService: AlertService) { }

  ngOnInit(): void {
    const tags = JSON.parse(localStorage.getItem('tags')) || [];
    this.tags = _.uniqBy(tags, 'value');
    this.selectedTags = this.dashboard.selectedTags;
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
    this.close.emit(this.selectedTags);
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