import { Component, ViewChild } from '@angular/core';
import { EdaDialog, EdaDialogAbstract, EdaDialogCloseEvent } from '@eda/shared/components/shared-components.index';
import { Editor } from 'primeng/editor';
import { DomSanitizer } from '@angular/platform-browser';
import * as _ from 'lodash';
@Component({
	selector: 'app-title-dialog',
	templateUrl: './quill-editor.component.html',
})

export class TitleDialogComponent extends EdaDialogAbstract {
	@ViewChild('Editor') editor: Editor;
	public dialog: EdaDialog;
	public title: string;
	constructor(private sanitizer: DomSanitizer) {
		super();
		this.dialog = new EdaDialog({
			show: () => this.onShow(),
			hide: () => this.onClose(EdaDialogCloseEvent.NONE),
			title: $localize`:@@ChartProps:PROPIEDADES DEL GRAFICO`
		});
		this.dialog.style = { width: '80%', height: '70%', top: "-4em", left: '1em' };
	}

	public onShow(): void {
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