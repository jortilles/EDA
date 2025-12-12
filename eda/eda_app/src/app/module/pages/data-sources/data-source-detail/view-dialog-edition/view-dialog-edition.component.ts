import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { AlertService, DashboardService, DataSourceService, SpinnerService } from '@eda/services/service.index';
import { EdaDialog2Component } from '@eda/shared/components/shared-components.index';
import * as _ from 'lodash';

@Component({
  standalone: true,
  selector: 'app-view-dialog-edition',
  templateUrl: './view-dialog-edition.component.html',
  imports: [EdaDialog2Component]
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
  public newColums: any[] = [];

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
      SQLexpression: [this.viewInEdition.query, Validators.required]
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
			let res = await this.dashboardService.executeView(body).toPromise();

      const columns = [];
			res[0].forEach((col, idx) => {
				const column = this.buildColumn(col, idx, res[1]);
				columns.push(column);
			});

      this.newColums = _.cloneDeep(columns);

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

  buildColumn(column_name: string, column_index: number, data: Array<any>) {
		let type = 'numeric';
		for (let i = 0; i < data.length; i++) {
			if (data[i][column_index] !== null && !parseFloat(data[i][column_index])) {
				type = 'text';
				break;
			}
		}
		const column = {
			column_name: column_name,
			display_name: { default: column_name, localized: [] },
			description: { default: this.beautifulNames(column_name), localized: [] },
			column_type: type,
			aggregation_type: this.getAggregation(type),
			column_granted_roles: [],
			row_granted_roles: [],
			visible: true,
			tableCount: 0
		}
		return column;
	}

  beautifulNames = (name) => {
		return name.split('_').map(name => name.charAt(0).toUpperCase() + name.slice(1)).join(' ')
	}

  getAggregation(type: string) {
		if (type === 'numeric') {
			return [
				{ value: 'sum', display_name: 'Suma' },
				{ value: 'avg', display_name: 'Media' },
				{ value: 'max', display_name: 'Máximo' },
				{ value: 'min', display_name: 'Mínimo' },
				{ value: 'count', display_name: 'Cuenta Valores' },
				{ value: 'count_distinct', display_name: 'Valores Distintos' },
				{ value: 'none', display_name: 'no' }
			]
		} else if (type === 'text') {
			return [
				{ value: 'count', display_name: 'Cuenta Valores' },
				{ value: 'count_distinct', display_name: 'Valores Distintos' },
				{ value: 'none', display_name: 'No' }
			];
		} else {
			return [{ value: 'none', display_name: 'No' }]
		}

	}

  viewDialogEditionApply() {
    // Query editada antes de confirmar
    this.viewInEdition.query = `(${this.SQLexpression}) as ${this.technical_name}`
    this.viewInEdition.columns = _.cloneDeep(this.newColums);
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
