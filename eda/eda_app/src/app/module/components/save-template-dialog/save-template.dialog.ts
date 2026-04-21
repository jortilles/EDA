import { Component, EventEmitter, inject, OnInit, Output } from "@angular/core";
import { FormBuilder, FormsModule, ReactiveFormsModule, UntypedFormGroup, Validators } from "@angular/forms";
import { AlertService, GroupService, IGroup, TemplateService } from "@eda/services/service.index";
import { SharedModule } from "@eda/shared/shared.module";
import { DropdownModule } from "primeng/dropdown";
import { ButtonModule } from "primeng/button";
import { MultiSelectModule } from "primeng/multiselect";
import { SelectButtonModule } from "primeng/selectbutton";
import { EdaDialog2Component } from "@eda/shared/components/shared-components.index";
import { SelectItem } from "primeng/api";

@Component({
    standalone: true,
    selector: 'app-save-template-dialog',
    templateUrl: './save-template.dialog.html',
    imports: [SharedModule, ReactiveFormsModule, FormsModule, DropdownModule, ButtonModule, SelectButtonModule, MultiSelectModule, EdaDialog2Component],
})
export class SaveTemplateDialog implements OnInit {
    private templateService = inject(TemplateService);
    private groupService = inject(GroupService);
    private alertService = inject(AlertService);

    @Output() close: EventEmitter<any> = new EventEmitter();

    public display: boolean = false;
    public form: UntypedFormGroup;
    public grups: IGroup[] = [];
    public visibleTypes: SelectItem[] = [];
    public showGroups: boolean = false;
    public dashboardId: string = '';
    public dashboardTitle: string = '';

    constructor(
        private formBuilder: FormBuilder,
    ) {
        this.initializeForm();
    }

    public ngOnInit(): void {
        this.display = true;
        this.loadGroups();
    }

    private initializeForm(): void {
        this.form = this.formBuilder.group({
            name: [null, Validators.required],
            description: [null],
            isPublic: [false],
        });
    }

    private async loadGroups(): Promise<void> {
        try {
            this.grups = await this.groupService.getGroupsByUser().toPromise();
        } catch (err) {
            this.alertService.addError(err);
            throw err;
        }
    }

    public open(dashboardId: string, dashboardTitle: string): void {
        this.dashboardId = dashboardId;
        this.dashboardTitle = dashboardTitle;
        this.form.controls['name'].setValue(dashboardTitle + ' - ' + $localize`:@@template:Plantilla`);
        this.display = true;
    }

    public async saveTemplate(): Promise<void> {
        if (this.form.invalid) {
            this.alertService.addError($localize`:@@fillRequiredFields:Por favor, rellene los campos obligatorios`);
            return;
        }

        try {
            const res = await this.templateService.createTemplateFromDashboard(
                this.dashboardId,
                this.form.value.name,
                this.form.value.description,
                this.form.value.isPublic
            ).toPromise();

            this.alertService.addSuccess($localize`:@@templateSaved:Plantilla guardada correctamente`);
            this.onClose(res.template);
        } catch (err) {
            this.alertService.addError(err);
            throw err;
        }
    }

    public onClose(res?: any): void {
        this.display = false;
        this.form.reset();
        this.close.emit(res);
    }

    public disableApply(): boolean {
        return this.form.invalid;
    }
}
