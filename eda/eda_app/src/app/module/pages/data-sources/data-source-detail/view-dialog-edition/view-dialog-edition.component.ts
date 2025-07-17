import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { AlertService, DashboardService, DataSourceService, SpinnerService } from '@eda/services/service.index';

@Component({
  selector: 'app-view-dialog-edition',
  templateUrl: './view-dialog-edition.component.html',
  styleUrls: ['./view-dialog-edition.component.css']
})
export class ViewDialogEditionComponent implements OnInit {

  @Input() viewInEdition: any;
  @Output() close: EventEmitter<any> = new EventEmitter<any>();
  
  public form: UntypedFormGroup;
  public display: boolean = false;
	public ok: boolean = true;
  public confirmed: boolean = false;


  // Elementos del formulario
  public viewName: string;
  public description: string;
  public technical_name: string;
  public SQLexpression: string;

  constructor(
    private spinnerService: SpinnerService,
    private formBuilder: UntypedFormBuilder,
    private alertService: AlertService,
    public dataModelService: DataSourceService,
    private dashboardService: DashboardService
  ) { }

  ngOnInit(): void {

    this.initForm()

    this.form = this.formBuilder.group({
      viewName: [this.viewName, Validators.required],
      description: [this.description, Validators.required],
      technical_name: [this.technical_name, Validators.required],
      SQLexpression: [this.SQLexpression, Validators.required]
    });  

    // Evalúa el estado inicial
    this.ok = !!this.form.get('SQLexpression').value?.trim();

    // Escucha cambios en SQLexpression
    this.form.get('SQLexpression').valueChanges.subscribe(value => {
      this.ok = !!value?.trim();
    });

  }

  // Inicializando el Formulario
  initForm(){
    this.viewName = this.viewInEdition.display_name.default;
    this.description = this.viewInEdition.description.default;
    this.technical_name = this.viewInEdition.table_name;
    this.SQLexpression = this.viewInEdition.query.match(/^\((.+)\)\s+as\s+/i)?.[1] || "";
  }


  async checkView() {
    // Recuperando la query del formulario
    let SQLexpression = this.form.get('SQLexpression').value;
		this.spinnerService.on();
		SQLexpression = SQLexpression.replace(';','')
		const body = {
			model_id: this.dataModelService.model_id,
			user: localStorage.getItem('user'),
			query: SQLexpression
		}
		try {
      // Verifica si la Query es correcta
			await this.dashboardService.executeView(body).toPromise();
      this.SQLexpression = SQLexpression;
      this.confirmed = true;
      this.alertService.addSuccess($localize`:@@viewOk: Vista generada correctamente`);
			this.spinnerService.off();
		} catch (err) {
      this.confirmed = false;
			this.alertService.addError(err);
			this.spinnerService.off();
		}
	}

  viewDialogEditionApply() {
    // Query editada antes de confirmar
    this.viewInEdition.query = `(${this.SQLexpression}) as ${this.technical_name}`

    // Verificar
    this.confirmed = false;
    this.display = false;
    this.close.emit(this.viewInEdition);
  }

  viewDialogEditionClose() {
    this.display = false;
    this.close.emit('cancel');
  }

}
