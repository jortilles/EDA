import { Component, EventEmitter, OnInit, Output } from "@angular/core";
import { FormsModule, ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from "@angular/forms";
import { AlertService } from "@eda/services/service.index";
import { EdaDialog2Component } from "@eda/shared/components/shared-components.index";
import { SharedModule } from "@eda/shared/shared.module";

@Component({
  selector: 'app-datasource-save-as',
  standalone: true,
  templateUrl: './datasource-save-as.dialog.html',
  imports: [SharedModule, ReactiveFormsModule, FormsModule, EdaDialog2Component]
})
export class DatasourceSaveAsDialog implements OnInit {
  @Output() close: EventEmitter<any> = new EventEmitter<any>();
  public form: UntypedFormGroup;
  public display: boolean = false;

  constructor(
    private formBuilder: UntypedFormBuilder,
    private alertService: AlertService) { }

  ngOnInit(): void {
    this.form = this.formBuilder.group({
      name: [null, Validators.required]
    });
    this.display = true;
  }

  public onApply(): void {
    if (this.form.invalid) return;
    this.display = false;
    this.close.emit(this.form.value);
  }

  public disableApply(): boolean {
    return this.form?.invalid ?? true;
  }

  public onClose(): void {
    this.display = false;
    this.close.emit(null);
  }
}
