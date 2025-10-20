import { Component, EventEmitter, OnInit, Output } from "@angular/core";
import { FormsModule, ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from "@angular/forms";
import { AlertService, GroupService, IGroup } from "@eda/services/service.index";
import { EdaDialog, EdaDialog2Component, EdaDialogAbstract, EdaDialogCloseEvent } from "@eda/shared/components/shared-components.index";
import { SharedModule } from "@eda/shared/shared.module";
import { SelectItem } from "primeng/api";
import { MultiSelectModule } from "primeng/multiselect";
import { SelectButtonModule } from "primeng/selectbutton";

@Component({
  selector: 'app-dashboard-save-as',
  standalone: true,
  templateUrl: './dashboard-save-as.dialog.html',
  imports: [SharedModule, ReactiveFormsModule, FormsModule, SelectButtonModule, MultiSelectModule]
})

export class DashboardSaveAsDialog implements OnInit {
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
    this.loadGroups();
  }


  private initializeForm(): void {
    this.form = this.formBuilder.group({
      name: [null, Validators.required],
      visible: [null, Validators.required],
      group: [null]
    });

        this.visibleTypes = [
            { label: $localize`:@@publicPanel:Publico`, value: 'public', icon: 'fa fa-fw fa-globe' },
            { label: $localize`:@@commonPanel:Común`, value: 'shared', icon: 'fa fa-fw fa-globe' },
            { label: $localize`:@@groupPanel:Grupo`, value: 'group', icon: 'fa fa-fw fa-users' },
            { label: $localize`:@@privatePanel:Privado`, value: 'private', icon: 'fa fa-fw fa-lock' },
        ];

        this.form.controls['visible'].setValue(this.visibleTypes[3].value);
  }

  private loadGroups(): void {

    this.groupService.getGroupsByUser().subscribe(
      res => {
        this.grups = res;

        if (this.grups.length === 0) {
          this.visibleTypes.splice(1, 1);
        }
      }, err => {
        this.alertService.addError(err)
      }
    );
  }

  public createNewDashboard(): void {
    let response = {
      name: this.form.value.name,
      visible: this.form.value.visible,
      group: this.form.value.group
    }
    this.onClose();
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