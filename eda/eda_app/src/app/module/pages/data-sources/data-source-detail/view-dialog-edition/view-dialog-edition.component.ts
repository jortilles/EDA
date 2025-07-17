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

    // console.log('VARIABLEEEE: ', this.viewInEdition);
    this.initForm()

    console.log('viewName',this.viewName)
    console.log('description',this.description)
    console.log('technical_name',this.technical_name)
    console.log('SQLexpression',this.SQLexpression)

    this.form = this.formBuilder.group({
      viewName: [this.viewName, Validators.required],
      description: [this.description, Validators.required],
      technical_name: [this.technical_name, Validators.required],
      SQLexpression: [this.SQLexpression, Validators.required]
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

		console.log('hoooollaaa')

		this.spinnerService.on();
		// this.form.value.SQLexpression = this.form.value.SQLexpression.replace(';','')
		const body = {
			model_id: this.dataModelService.model_id,
			user: localStorage.getItem('user'),
			query: "select 3"
			// query: this.form.value.SQLexpression
		}

		try {
			const res = await this.dashboardService.executeView(body).toPromise();
      console.log('res: ', res);
			// const columns = [];
			// res[0].forEach((col, idx) => {
			// 	const column = this.buildColumn(col, idx, res[1]);
			// 	columns.push(column);
			// });
			// this.table = this.buildTable(columns);
			this.alertService.addSuccess($localize`:@@viewOk: Vista generada correctamente`);
			// this.ok = true;
			this.spinnerService.off();
		} catch (err) {
			this.alertService.addError(err);
			this.spinnerService.off();
		}

	}

  viewDialogEditionApply() {
    
    console.log('Aplicando los cambios')
    
    // const user = localStorage.getItem('user')
    // const model_id = this.dataModelService.model_id

    // console.log('user: ',`${user}`);
    // console.log('model_id: ',`${model_id}`);

    this.display = false;

    // this.viewInEdition.query = "(select 1) as test_r"

    this.close.emit(this.viewInEdition);
  }

  viewDialogEditionClose() {

    console.log('Cancelando los cambios')


    this.display = false;
    this.close.emit('cancel');

  }


}
