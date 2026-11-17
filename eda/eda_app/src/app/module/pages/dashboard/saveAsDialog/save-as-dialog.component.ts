import { Component } from "@angular/core";
import { UntypedFormBuilder, UntypedFormGroup, Validators, FormsModule, ReactiveFormsModule } from "@angular/forms";
import { AlertService, GroupService, IGroup } from "@eda/services/service.index";
import { EdaDialog, EdaDialogAbstract, EdaDialogCloseEvent } from "@eda/shared/components/shared-components.index";
import { EdaDialogComponent } from "@eda/shared/components/eda-dialogs/eda-dialog/eda-dialog.component";
import { SelectItem } from "primeng/api";
import { ButtonDirective } from "primeng/button";
import { MultiSelectModule } from "primeng/multiselect";
import { SelectButtonModule } from "primeng/selectbutton";
import { InputTextModule } from "primeng/inputtext";

@Component({
    selector: 'save-as-dialog',
    templateUrl: './save-as-dialog.component.html',
    standalone: true,
    imports: [
        FormsModule,
        ReactiveFormsModule,
        InputTextModule,
        SelectButtonModule,
        MultiSelectModule,
        ButtonDirective,
        EdaDialogComponent,
    ],
})

export class SaveAsDialogComponent extends EdaDialogAbstract {

  public dialog: EdaDialog;
  public form: UntypedFormGroup;
  public grups: IGroup[] = [];
  public visibleTypes: SelectItem[] = [];
  public display = {
    groups: false
  };

  constructor(
    private formBuilder: UntypedFormBuilder, 
    private groupService: GroupService,
    private alertService: AlertService) {
    super();

    this.dialog = new EdaDialog({
      show: () => this.onShow(),
      hide: () => this.onClose(EdaDialogCloseEvent.NONE),
      title: $localize`:@@SaveAs:GUARDAR COMO...`,
    });
    this.dialog.style = { width: '70%', height:'40%' };
    this.initializeForm();
    this.loadGroups();
  }

  onShow(): void {
    
  }
  onClose(event: EdaDialogCloseEvent, response?: any): void {
    return this.controller.close(event, response);
  }

  private initializeForm(): void {
    this.form = this.formBuilder.group({
      name: [null, Validators.required],
      visible: [null, Validators.required],
      group: [null]
    });

    this.visibleTypes = [
      { label: $localize`:@@commonPanel:Común`, value: 'public', icon: 'fa fa-fw fa-globe' },
      { label: $localize`:@@group:Grupo`, value: 'group', icon: 'fa fa-fw fa-users' },
      { label: $localize`:@@privatePanel:Privado`, value: 'private', icon: 'fa fa-fw fa-lock' },
    ];

    this.form.controls['visible'].setValue(this.visibleTypes[2].value);

  }

  private loadGroups(): void {

    this.groupService.getGroupsByUser().subscribe(
        res => {
            this.grups = res;

            if (this.grups.length === 0) {
                this.visibleTypes = this.visibleTypes.filter(v => v.value !== 'group');
            }
        }, err => {
            this.alertService.addError(err)
        }
    );
}

  public createNewDashboard(): void {
    let response = {
      name:this.form.value.name, 
      visible:this.form.value.visible, 
      group:this.form.value.group
    }
    this.onClose(EdaDialogCloseEvent.NEW, response);
  }

  public handleSelectedBtn(event): void {
    const groupControl = this.form.get('group');
    this.display.groups = event.value === 'group';

    if (this.display.groups) {
      groupControl.setValidators(Validators.required);
    }

    if (!this.display.groups) {

      groupControl.setValidators(null);
      groupControl.setValue(null);
    }

  }

  public closeDialog(): void {
    this.form.reset();
    this.onClose(EdaDialogCloseEvent.NONE);
  }
}