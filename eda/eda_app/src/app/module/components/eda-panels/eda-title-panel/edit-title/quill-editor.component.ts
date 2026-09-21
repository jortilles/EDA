import { Component, Input, ViewChild } from '@angular/core';
import { EdaDialog, EdaDialog2Component, EdaDialogAbstract, EdaDialogCloseEvent } from '@eda/shared/components/shared-components.index';
import { Editor } from 'primeng/editor';
import { DomSanitizer } from '@angular/platform-browser';
import { DialogModule } from 'primeng/dialog';
import { PanelChartComponent } from '../../eda-blank-panel/panel-charts/panel-chart.component';
import { EdaContextMenuComponent } from '@eda/shared/components/shared-components.index';
import { EditorModule } from 'primeng/editor';
import Quill from 'quill';
import { ColorPickerModule } from 'primeng/colorpicker';
import { InputSwitchModule } from 'primeng/inputswitch';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { OverlayPanel, OverlayPanelModule } from 'primeng/overlaypanel';
import { VerticalAlign } from '@eda/models/dashboard-models/eda-title-panel';

import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

// Override Quill Link to open in same tab instead of new tab
const Link = Quill.import('formats/link') as any;
class SameTabLink extends Link {
	static create(value: string) {
		const node = super.create(value);
		node.removeAttribute('target');
		return node;
	}
}
Quill.register('formats/link', SameTabLink, true);

// Custom font sizes in px for the Quill editor
const Size = Quill.import('attributors/style/size') as any;
Size.whitelist = ['10px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px', '42px', '48px'];
Quill.register(Size, true);

@Component({
	standalone: true,
	selector: 'app-title-dialog',
	templateUrl: './quill-editor.component.html',
	styles: [`
		/* Editor card */
		:host ::ng-deep .p-editor-container {
			height: 100%;
			display: flex;
			flex-direction: column;
			border: none;
		}

		:host ::ng-deep .p-editor-toolbar {
			border: none;
			border-bottom: 1px solid #e2e8f0;
			background: #f8fafc;
			border-top-left-radius: 0.5rem;
			border-top-right-radius: 0.5rem;
		}

		:host ::ng-deep .p-editor-content {
			flex: 1;
			border: none;
			border-bottom-left-radius: 0.5rem;
			border-bottom-right-radius: 0.5rem;
		}

		:host ::ng-deep .ql-toolbar button:hover .ql-stroke,
		:host ::ng-deep .ql-toolbar .ql-picker-label:hover .ql-stroke {
			stroke: var(--corporate-primary);
		}
		:host ::ng-deep .ql-toolbar button:hover .ql-fill,
		:host ::ng-deep .ql-toolbar .ql-picker-label:hover .ql-fill {
			fill: var(--corporate-primary);
		}
		:host ::ng-deep .ql-toolbar button.ql-active .ql-stroke,
		:host ::ng-deep .ql-toolbar .ql-picker-label.ql-active .ql-stroke {
			stroke: var(--corporate-primary);
		}
		:host ::ng-deep .ql-toolbar button.ql-active .ql-fill,
		:host ::ng-deep .ql-toolbar .ql-picker-label.ql-active .ql-fill {
			fill: var(--corporate-primary);
		}

		.custom-color-btn {
			height: 24px;
			width: 28px;
			padding: 3px 5px;
			border: none;
			background: transparent;
			cursor: pointer;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			vertical-align: middle;
		}

		.custom-color-btn svg {
			width: 18px;
			height: 18px;
		}

		.custom-color-btn:hover .ql-stroke {
			stroke: var(--corporate-primary);
		}

		.custom-color-btn:hover .ql-fill {
			fill: var(--corporate-primary);
		}

		.ql-overlay-picker {
			display: flex;
			flex-direction: column;
			gap: 8px;
			align-items: center;
			padding: 4px;
		}

		.ql-hex-input-popup {
			width: 200px;
			padding: 4px 8px;
			font-size: 12px;
			font-family: monospace;
			border: 1px solid #d9e0ea;
			border-radius: 4px;
			text-align: center;
		}

		/* Renders above the modal dialog's own z-index; scoped to .ql-color-overlay only */
		::ng-deep .p-overlaypanel.ql-color-overlay {
			z-index: 999999 !important;
		}

		/* List number/bullet scales with the font size applied to the line. */
		::ng-deep .ql-editor li:has(> [style*="font-size: 10px"]) { font-size: 10px; }
		::ng-deep .ql-editor li:has(> [style*="font-size: 12px"]) { font-size: 12px; }
		::ng-deep .ql-editor li:has(> [style*="font-size: 14px"]) { font-size: 14px; }
		::ng-deep .ql-editor li:has(> [style*="font-size: 16px"]) { font-size: 16px; }
		::ng-deep .ql-editor li:has(> [style*="font-size: 18px"]) { font-size: 18px; }
		::ng-deep .ql-editor li:has(> [style*="font-size: 20px"]) { font-size: 20px; }
		::ng-deep .ql-editor li:has(> [style*="font-size: 24px"]) { font-size: 24px; }
		::ng-deep .ql-editor li:has(> [style*="font-size: 28px"]) { font-size: 28px; }
		::ng-deep .ql-editor li:has(> [style*="font-size: 32px"]) { font-size: 32px; }
		::ng-deep .ql-editor li:has(> [style*="font-size: 36px"]) { font-size: 36px; }
		::ng-deep .ql-editor li:has(> [style*="font-size: 42px"]) { font-size: 42px; }
		::ng-deep .ql-editor li:has(> [style*="font-size: 48px"]) { font-size: 48px; }
	`],
	imports: [FormsModule, CommonModule, DialogModule, EdaDialog2Component, PanelChartComponent, EdaContextMenuComponent, EditorModule,
		ColorPickerModule, InputSwitchModule, InputTextModule, TooltipModule, OverlayPanelModule]
})

export class TitleDialogComponent{
	@Input () controller: any;
	@ViewChild('Editor') editor: Editor;
	public header = $localize`:@@PanelOptions:PANEL OPTIONS`;
	public title: string;
	public showPanelBackground: boolean = true;
	public verticalAlign: VerticalAlign = 'center';
	public borderColor: string = '#d7dde6';
	public showBorder: boolean = true;
	public backgroundColor: string = '#ffffff';

	// Free-pick text color / highlight color (not limited to Quill's predefined swatch list)
	public customTextColor: string = '#000000';
	public customTextBgColor: string = '#ffffff';
	public showTextColorPicker: boolean = false;
	public showTextBgColorPicker: boolean = false;
	private savedRange: any = null;

	// Quill toolbar tooltips
	public tooltipSize = $localize`:@@qlTooltipSize:Tamaño de letra`;
	public tooltipBold = $localize`:@@qlTooltipBold:Negrita`;
	public tooltipItalic = $localize`:@@qlTooltipItalic:Cursiva`;
	public tooltipUnderline = $localize`:@@qlTooltipUnderline:Subrayado`;
	public tooltipStrike = $localize`:@@qlTooltipStrike:Tachado`;
	public tooltipTextColor = $localize`:@@qlTooltipTextColor:Color del texto`;
	public tooltipTextBgColor = $localize`:@@qlTooltipTextBgColor:Color de resaltado del texto`;
	public tooltipSub = $localize`:@@qlTooltipSub:Subíndice`;
	public tooltipSuper = $localize`:@@qlTooltipSuper:Superíndice`;
	public tooltipH1 = $localize`:@@qlTooltipH1:Título 1`;
	public tooltipH2 = $localize`:@@qlTooltipH2:Título 2`;
	public tooltipQuote = $localize`:@@qlTooltipQuote:Cita`;
	public tooltipOrderedList = $localize`:@@qlTooltipOrderedList:Lista numerada`;
	public tooltipBulletList = $localize`:@@qlTooltipBulletList:Lista con viñetas`;
	public tooltipAlignLeft = $localize`:@@qlTooltipAlignLeft:Alinear a la izquierda`;
	public tooltipAlignCenter = $localize`:@@qlTooltipAlignCenter:Centrar`;
	public tooltipAlignRight = $localize`:@@qlTooltipAlignRight:Alinear a la derecha`;
	public tooltipLink = $localize`:@@qlTooltipLink:Insertar enlace`;
	public tooltipImage = $localize`:@@qlTooltipImage:Insertar imagen desde un archivo`;
	public tooltipVideo = $localize`:@@qlTooltipVideo:Insertar vídeo`;
	public tooltipUrlImage = $localize`:@@qlTooltipUrlImage:Insertar imagen desde una URL`;
	public tooltipClean = $localize`:@@qlTooltipClean:Quitar formato`;
	public labelClearColor = $localize`:@@qlLabelClearColor:Quitar`;

	constructor(private sanitizer: DomSanitizer) {}

	public ngOnInit(): void {
		this.title = this.controller.params.title;
		this.showPanelBackground = this.controller.params.backgroundTransparent !== true;
		this.verticalAlign = this.controller.params.verticalAlign || 'center';
		this.borderColor = this.controller.params.borderColor || '#d7dde6';
		this.showBorder = this.controller.params.showBorder !== false;
		this.backgroundColor = this.controller.params.backgroundColor || '#ffffff';
	}

	public onClose(event: EdaDialogCloseEvent, response?: any): void {
		return this.controller.close(event, response);
	}

	public saveChartConfig(): void {
		this.onClose(EdaDialogCloseEvent.UPDATE, {
			title: this.title,
			backgroundTransparent: !this.showPanelBackground,
			verticalAlign: this.verticalAlign,
			borderColor: this.borderColor,
			showBorder: this.showBorder,
			backgroundColor: this.backgroundColor
		});
	}

	public urlImageHandler(): void {
		const quill = this.editor.getQuill();
		// Clicking this custom button blurs the editor first; restore focus so Quill
		// positions the tooltip from the real selection, same as its native Link/Video buttons.
		quill.focus();

		const tooltip = quill.theme.tooltip;
		const originalSave = tooltip.save;
		const originalHide = tooltip.hide;

		tooltip.save = () => {
			const range = quill.getSelection(true);
			const value = tooltip.textbox.value;
			if (value && range) {
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
	}

	public closeChartConfig(): void {
		this.onClose(EdaDialogCloseEvent.NONE);
	}

	public openColorOverlay(event: Event, overlay: OverlayPanel): void {
		if (this.editor) {
			const quill = this.editor.getQuill();
			this.savedRange = quill.getSelection();
		}
		overlay.toggle(event);
		event.stopPropagation();
	}

	public onOverlayShow(type: string): void {
		setTimeout(() => {
			if (type === 'textColor') this.showTextColorPicker = true;
			else this.showTextBgColorPicker = true;
		}, 50);
	}

	private applySavedFormat(format: string, value: string): void {
		if (!this.editor || !value) return;
		const quill = this.editor.getQuill();
		if (this.savedRange && this.savedRange.length > 0) {
			quill.formatText(this.savedRange.index, this.savedRange.length, format, value);
			quill.setSelection(this.savedRange.index, this.savedRange.length, 'silent');
		} else {
			quill.format(format, value);
		}
		this.title = quill.root.innerHTML;
	}

	public removeTextFormat(format: string): void {
		if (!this.editor) return;
		const quill = this.editor.getQuill();
		if (this.savedRange && this.savedRange.length > 0) {
			quill.removeFormat(this.savedRange.index, this.savedRange.length);
		}
		this.title = quill.root.innerHTML;
	}

	public onTextColorLive(value: string): void {
		this.applySavedFormat('color', value);
	}

	public onTextBgColorLive(value: string): void {
		this.applySavedFormat('background', value);
	}

	public setVerticalAlign(align: VerticalAlign): void {
		this.verticalAlign = align;
	}

}
