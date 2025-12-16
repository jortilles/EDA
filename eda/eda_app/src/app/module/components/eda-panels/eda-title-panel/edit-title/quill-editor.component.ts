import { Component, CUSTOM_ELEMENTS_SCHEMA, Input, ViewChild } from '@angular/core';
import { EdaDialog, EdaDialog2Component, EdaDialogAbstract, EdaDialogCloseEvent } from '@eda/shared/components/shared-components.index';
import { Editor } from 'primeng/editor';
import { DomSanitizer } from '@angular/platform-browser';
import { DialogModule } from 'primeng/dialog'; 
import { PanelChartComponent } from '../../eda-blank-panel/panel-charts/panel-chart.component';
import { EdaContextMenuComponent } from '@eda/shared/components/shared-components.index';
import * as _ from 'lodash';
import { EditorModule } from 'primeng/editor';

import { FormsModule } from '@angular/forms'; 
import { CommonModule } from '@angular/common';
@Component({
	standalone: true,
	selector: 'app-title-dialog',
	templateUrl: './quill-editor.component.html',
	imports: [FormsModule, CommonModule, DialogModule, EdaDialog2Component, PanelChartComponent, EdaContextMenuComponent,EditorModule]
})

export class TitleDialogComponent{
	@Input () controller: any;
	@ViewChild('Editor') editor: Editor;
	public header = $localize`:@@ChartProps:PROPIEDADES DEL GRAFICO`;
	public title: string;

	constructor(private sanitizer: DomSanitizer) {}

	public ngOnInit(): void {
		this.title = this.controller.params.title;
		const urlImage = document.querySelector('#qlUrlImage');
		urlImage.addEventListener('click', ($event) => this.urlImageHandler(event));
	}

	public onClose(event: EdaDialogCloseEvent, response?: any): void {
		return this.controller.close(event, response);
	}

	public saveChartConfig(): void {
		this.onClose(EdaDialogCloseEvent.UPDATE, { title: this.title });
	}

	public urlImageHandler(event?: any): void {
		let left = 0;
		if (event) {
			left = _.subtract(event.x, 228);
		}

		const quill = this.editor.getQuill();
		const tooltip = quill.theme.tooltip;
		const originalSave = tooltip.save;
		const originalHide = tooltip.hide;

		tooltip.save = () => {
			const range = quill.getSelection(true);
			const value = tooltip.textbox.value;
			if (value) {
				quill.insertEmbed(range.index, 'image', value, 'user');
			}
		};
		// Called on hide and save.
		tooltip.hide = () => {
			tooltip.save = originalSave;
			tooltip.hide = originalHide;
			tooltip.hide();
		};
		tooltip.edit('image');
		tooltip.textbox.placeholder = 'URL';

		let qlTooltip: any = document.querySelector('.ql-tooltip');
		if (qlTooltip) {
			qlTooltip.style.left = left + 'px';
			qlTooltip.style.top = '-10px';
		}

	}

	public closeChartConfig(): void {
		this.onClose(EdaDialogCloseEvent.NONE);
	}

}