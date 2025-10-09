import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { FormsModule, ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from "@angular/forms";
import { AlertService, GroupService, IGroup } from "@eda/services/service.index";
import { EdaDialog, EdaDialog2Component, EdaDialogAbstract, EdaDialogCloseEvent } from "@eda/shared/components/shared-components.index";
import { SharedModule } from "@eda/shared/shared.module";
import { SelectItem } from "primeng/api";
import { MultiSelectModule } from "primeng/multiselect";
import { SelectButtonModule } from "primeng/selectbutton";
import { DashboardPageV2 } from "../../dashboard/dashboard.page";

@Component({
  selector: 'app-dashboard-visible',
  standalone: true,
  imports: [SharedModule, ReactiveFormsModule, FormsModule, SelectButtonModule, MultiSelectModule],
  templateUrl: './dashboard-visible.modal.html',
})
export class DashboardVisibleModal {
  @Output() close: EventEmitter<any> = new EventEmitter<any>();
  @Output() apply: EventEmitter<any> = new EventEmitter<any>();
  @Input() dashboard: DashboardPageV2;
  public dialog: EdaDialog;
  public form: UntypedFormGroup;
  public grups: IGroup[] = [];
  public visibleTypes: SelectItem[] = [];
  

  public display: boolean = false;
  public showGroups: boolean = false;
  public showUrl: boolean = false;
  public url: string;
  public visibilitySelected: string;


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
    //{ label: $localize`:@@public:public`, value: 'public', icon: 'fa fa-fw fa-globe' },
    { label: $localize`:@@publicPanel:Publico`, value: 'public', icon: 'fa fa-fw fa-globe' },
    { label: $localize`:@@commonPanel:Común`, value: 'shared', icon: 'fa fa-fw fa-globe' },
    { label: $localize`:@@groupPanel:Grupo`, value: 'group', icon: 'fa fa-fw fa-users' },
    { label: $localize`:@@privatePanel:Privado`, value: 'private', icon: 'fa fa-fw fa-lock' },
  ];

  this.form.controls['visible'].setValue(this.dashboard.dashboard.config.visible);
  this.showGroups = this.form.controls['visible'].value === 'group';
  this.showUrl = this.form.controls['visible'].value === 'public';
  }

  private loadGroups(): void {

    this.groupService.getGroupsByUser().subscribe(
      res => {
        this.grups = res;

        if (this.grups.length === 0) {
          this.visibleTypes.splice(1, 1);
        }
        if (this.showGroups) {
          this.form.controls['group'].setValue(this.grups.filter(grup =>
            this.dashboard.dashboard.group.includes(grup['_id'])));
        }
      }, err => {
        this.alertService.addError(err)
      }
    );
  }

  
  public handleSelectedBtn(event): void {
    const groupControl = this.form.get('group');
    this.showGroups = event.value === 'group';
    this.showUrl = event.value === 'public';

    if (this.showGroups) {
      groupControl.setValidators(Validators.required);
    }
    if (this.showUrl === true) { 
      this.url = this.getsharedURL();
    }

    if (!this.showGroups) {
      groupControl.setValidators(null);
      groupControl.setValue(null);
    }

  }
    public getsharedURL(): string {
      const url = location.href;
      const baseURL = url.slice(0, url.indexOf('#'));
      return `${baseURL}#/public/${this.dashboard.dashboardId}`
    }
    
    public copyURL() {
      let $body = document.getElementsByTagName('body')[0];
      const value = this.getsharedURL();
      
      let copyToClipboard = function (value) {
        let $tempInput = document.createElement('INPUT') as HTMLInputElement;
        $body.appendChild($tempInput);
        $tempInput.setAttribute('value', value)
        $tempInput.select();
        document.execCommand('copy');
        $body.removeChild($tempInput);
      }
      copyToClipboard(value);
      this.alertService.addSuccess($localize`:@@dahsboardSaved:Informe guardado correctamente`);
  }

  public onApply() {
    this.display = false;
    this.apply.emit(this.form.value);
  }

  public disableApply(): boolean {
    return false;
  }

  public onClose(): void {
    this.display = false;
    this.close.emit();
  }
}
