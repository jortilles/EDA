import { Component } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { AlertService, SpinnerService, DashboardService } from '@eda/services/service.index';
import { EdaDialog, EdaDialogAbstract, EdaDialogCloseEvent } from '@eda/shared/components/shared-components.index';

@Component({
	selector: 'app-view-dialog',
	templateUrl: './view-dialog.component.html',
	//styleUrls: ['./view-dialog.component.css']
})

export class ViewDialogComponent extends EdaDialogAbstract {

	public dialog: EdaDialog;
	public form: UntypedFormGroup;
	public table: any;
	public ok: boolean = false;

	constructor(
		private formBuilder: UntypedFormBuilder,
		private alertService: AlertService,
		private dashboardService: DashboardService,
		private spinnerService: SpinnerService,
	) {
		super();
		this.dialog = new EdaDialog({
			show: () => this.onShow(),
			hide: () => this.onClose(EdaDialogCloseEvent.NONE),
			title: $localize`:@@ViewDatamodel:Añadir Vista`
		});
		this.dialog.style = { width: '55%', height: '75%', top: "-4em", left: '1em' };

		this.form = this.formBuilder.group({
			viewName: [null, Validators.required],
			description: [null, Validators.required],
			technical_name: [null, Validators.required],
			SQLexpression: [null, Validators.required]
		});
	}
	onShow(): void {

	}
	onClose(event: EdaDialogCloseEvent, response?: any): void {
		return this.controller.close(event, response);
	}

	closeDialog() {
		this.onClose(EdaDialogCloseEvent.NONE);
	}

	async checkView() {
		this.spinnerService.on();
		this.form.value.SQLexpression= this.form.value.SQLexpression.replace(';','')
		const body = {
			model_id: this.controller.params.model_id,
			user: this.controller.params.user,
			query: this.form.value.SQLexpression
		}
		try {
			const res = await this.dashboardService.executeView(body).toPromise();
			const columns = [];
			res[0].forEach((col, idx) => {
				const column = this.buildColumn(col, idx, res[1]);
				columns.push(column);
			});
			this.table = this.buildTable(columns);
			this.alertService.addSuccess($localize`:@@viewOk: Vista generada correctamente`);
			this.ok = true;
			this.spinnerService.off();
		} catch (err) {
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

	buildTable(columns: Array<any>) {
		const table = {
			table_name: `${this.form.value.technical_name.replace(' ', '_')}`,
			display_name: { default: `${this.form.value.viewName}`, localized: [] },
			description: { default: `${this.form.value.description}`, localized: [] },
			query: `(${this.form.value.SQLexpression.replace(';', '')}) as ${this.form.value.technical_name.replace(' ', '_')}`,
			table_granted_roles: [],
			table_type: 'view',
			columns: columns,
			relations: [],
			visible: true,
			tableCount: 0
		}
		return table;
	}

	beautifulNames = (name) => {
		return name.split('_').map(name => name.charAt(0).toUpperCase() + name.slice(1)).join(' ')
	}

	saveView() {
		if (this.form.invalid) {
			return this.alertService.addError($localize`:@@mandatoryFields:Recuerde llenar los campos obligatorios`);
		} else {
			this.onClose(EdaDialogCloseEvent.NEW, this.table);
		}
	}

}