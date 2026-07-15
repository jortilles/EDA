import { Component, EventEmitter, OnInit, Output } from "@angular/core";
import { FormsModule, ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from "@angular/forms";
import { AlertService, GroupService, IGroup, UserService } from "@eda/services/service.index";
import { EdaDialog, EdaDialog2Component, EdaDialogAbstract, EdaDialogCloseEvent } from "@eda/shared/components/shared-components.index";
import { SharedModule } from "@eda/shared/shared.module";
import { SelectItem } from "primeng/api";
import { MultiSelectModule } from "primeng/multiselect";
import { SelectButtonModule } from "primeng/selectbutton";
import { ALLOW_NON_ADMIN_MANAGE_PUBLIC_REPORTS } from "@eda/configs/customizable/customizable_default";

@Component({
  selector: 'app-dashboard-save-as',
  standalone: true,
  templateUrl: './dashboard-save-as.dialog.html',
  imports: [SharedModule, ReactiveFormsModule, FormsModule, SelectButtonModule, MultiSelectModule,EdaDialog2Component]
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
    private alertService: AlertService,
    private userService: UserService) { }

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
            { label: $localize`:@@publicPanel:Publico`, value: 'open', icon: 'fa fa-fw fa-globe' },
            { label: $localize`:@@commonPanel:Común`, value: 'common', icon: 'fa fa-fw fa-globe' },
            { label: $localize`:@@group:Grupo`, value: 'group', icon: 'fa fa-fw fa-users' },
            { label: $localize`:@@privatePanel:Privado`, value: 'private', icon: 'fa fa-fw fa-lock' },
        ].filter(type => type.value !== 'open' || this.userService.isAdmin || ALLOW_NON_ADMIN_MANAGE_PUBLIC_REPORTS);

        console.log('[DASH-TRACE][dashboard-save-as] isAdmin=', this.userService.isAdmin, 'ALLOW_NON_ADMIN_MANAGE_PUBLIC_REPORTS=', ALLOW_NON_ADMIN_MANAGE_PUBLIC_REPORTS, 'visibleTypes=', this.visibleTypes.map(t => t.value), '(length=' + this.visibleTypes.length + ')');
        if (!this.visibleTypes[3]) {
          console.warn('[DASH-TRACE][dashboard-save-as] BUG HIT: visibleTypes[3] is undefined (array only has ' + this.visibleTypes.length + ' item(s) because "open" was filtered out for a non-admin user). The next line will throw and the "visible" control will NEVER get a default value.');
        }
        this.form.controls['visible'].setValue(this.visibleTypes[3].value);
        console.log('[DASH-TRACE][dashboard-save-as] default visible set to', this.form.controls['visible'].value);
  }

  private loadGroups(): void {

    this.groupService.getGroupsByUser().subscribe(
      res => {
        this.grups = res;
        console.log('[DASH-TRACE][dashboard-save-as] loadGroups() userGroups=', this.grups?.length, this.grups);

        if (this.grups.length === 0) {
          const commonIndex = this.visibleTypes.findIndex(type => type.value === 'common');
          if (commonIndex > -1) {
            console.warn('[DASH-TRACE][dashboard-save-as] user has 0 groups -> removing "common" from visibleTypes (this looks like it should remove "group" instead, not "common"). visibleTypes before splice=', this.visibleTypes.map(t => t.value));
            this.visibleTypes.splice(commonIndex, 1);
            console.log('[DASH-TRACE][dashboard-save-as] visibleTypes after splice=', this.visibleTypes.map(t => t.value), 'current form visible value=', this.form.controls['visible'].value);
          }
        }
      }, err => {
        console.log('[DASH-TRACE][dashboard-save-as] loadGroups ERROR ->', err);
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
    console.log('[DASH-TRACE][dashboard-save-as] onApply() form.value=', this.form.value, 'form.valid=', this.form.valid);
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