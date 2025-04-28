import { Component, EventEmitter, OnInit, Output } from "@angular/core";
import { FormsModule, ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from "@angular/forms";
import { AlertService, GroupService, IGroup } from "@eda/services/service.index";
import { EdaDialog, EdaDialog2Component, EdaDialogAbstract, EdaDialogCloseEvent } from "@eda/shared/components/shared-components.index";
import { SharedModule } from "@eda/shared/shared.module";
import { SelectItem } from "primeng/api";
import { MultiSelectModule } from "primeng/multiselect";
import { SelectButtonModule } from "primeng/selectbutton";
@Component({
  selector: 'app-dashboard-edit-style',
  standalone: true,
  templateUrl: './dashboard-edit-style.dialog.html',
  imports: [SharedModule, ReactiveFormsModule, FormsModule, SelectButtonModule, MultiSelectModule]
})
export class DashboardEditStyleDialog {
@Output() close: EventEmitter<any> = new EventEmitter<any>();
  public dialog: EdaDialog;
  public form: UntypedFormGroup;
  public grups: IGroup[] = [];
  public visibleTypes: SelectItem[] = [];

  public display: boolean = false;
  public showGroups: boolean = false;

  constructor(
    private formBuilder: UntypedFormBuilder,
    private groupService: GroupService,
    private alertService: AlertService) { }

  ngOnInit(): void {
    this.initializeForm();
  }


  private initializeForm(): void {
    this.form = this.formBuilder.group({
      name: [null, Validators.required],
      visible: [null, Validators.required],
      group: [null]
    });

    this.form.controls['visible'].setValue(this.visibleTypes[2].value);
  }

  public handleSelectedBtn(event): void {
    const groupControl = this.form.get('group');
    this.showGroups = event.value === 'group';

    if (this.showGroups) {
      groupControl.setValidators(Validators.required);
    }

    if (!this.showGroups) {
      groupControl.setValidators(null);
      groupControl.setValue(null);
    }

  }

  public onApply() {
    this.display = false;
    this.close.emit(this.form.value);
  }

  public disableApply(): boolean {
    return false;
  }

  public onClose(): void {
    this.display = false;
    this.close.emit();
}
}
