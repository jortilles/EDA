import { Component, EventEmitter, OnInit, Output } from "@angular/core";
import { FormsModule, ReactiveFormsModule, UntypedFormBuilder, } from "@angular/forms";
import { AlertService } from "@eda/services/service.index";
import { SharedModule } from "@eda/shared/shared.module";
import { MultiSelectModule } from "primeng/multiselect";
import { FloatLabelModule } from 'primeng/floatlabel';
import { SelectButtonModule } from "primeng/selectbutton";
import * as _ from 'lodash';

@Component({
  selector: 'app-dashboard-tag-modal',
  standalone: true,
  templateUrl: './dashboard-tag.modal.html',
  imports: [SharedModule, ReactiveFormsModule, FormsModule, SelectButtonModule, MultiSelectModule, FloatLabelModule]
})

export class DashboardTagModal implements OnInit {
  @Output() close: EventEmitter<any> = new EventEmitter<any>();
  public display: boolean = false;

  public newTag: any;
  public tags: any[];
  public selectedTags: any[] = [];
  public selectedtag: any;

  constructor(private alertService: AlertService) { }

  ngOnInit(): void {
    const tags = JSON.parse(localStorage.getItem('tags')) || [];
    this.tags = _.uniqBy(tags, 'value');
  }

  public setNewTag() {
    const repeated = this.tags.some(tag => (this.newTag.toUpperCase() === String(tag.value).toUpperCase()));

    if (this.newTag.length === 0) {
      this.newTag = !this.newTag;
      this.alertService.addError("Empty tag")
    } else if (repeated) {
      this.newTag = '';
      this.alertService.addError("Tag already existing")
    } else {
      const tag = JSON.parse(JSON.stringify({ label: this.newTag, value: this.newTag }));
      this.tags.push(tag);
      this.selectedTags.push(tag);
      this.newTag = '';
      localStorage.setItem('tags', JSON.stringify(this.tags));
    }
  }

  public onApply() {
    this.display = false;
    this.close.emit(this.selectedTags);
  }

  public disableApply(): boolean {
    return false;
  }

  public onClose(): void {
    this.display = false;
    this.close.emit();
  }
}