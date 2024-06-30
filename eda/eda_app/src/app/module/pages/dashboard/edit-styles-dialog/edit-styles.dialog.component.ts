import { values } from 'd3';
import { Component } from "@angular/core";
import { DashboardStyles, StyleProviderService } from "@eda/services/service.index";
import { EdaDialog, EdaDialogAbstract, EdaDialogCloseEvent } from "@eda/shared/components/shared-components.index";
import { DEFAULT_FONT_FAMILY } from "../../../../config/personalitzacio/customizables";

@Component({
	selector: 'edit-styles-dialog',
	templateUrl: './edit-styles.dialog.component.html',
	styleUrls: ['./edit-styles.dialog.component.css']

})

export class EditStylesDialogComponent extends EdaDialogAbstract {

	public fonts: Array<any> =
		[
			{ label: 'Montserrat', value: 'Montserrat' },
			{ label: 'Questrial', value: 'Questrial' },
			{ label: 'League Spartan', value: 'League Spartan' },
			{ label: 'Raleway', value: 'Raleway' },
			{ label: 'Bangers', value: 'Bangers' },
			{ label: 'Serif', value: 'Serif' },
			{ label: 'Sans-serif', value: 'Sans-serif' },
			{ label: 'Monospace', value: 'Monospace' },
			{ label: 'Cursive', value: 'Cursive' },
			{ label: 'Papyrus', value: 'Papyrus' },
			{ label: 'Courier New', value: 'Courier New' }

		].sort((a, b) => a.label.localeCompare(b.label));

	public dialog: EdaDialog;
	public dashBoardStyles: DashboardStyles;

	public titleHeader: string = $localize`:@@dashboardTitleEdit:Título del informe`;
	public filtersHeader: string = $localize`:@@filtersEdit:Filtros`;
	public panelTitleHeader: string = $localize`:@@panelTitleEdit:Título del panel`;
	public panelContentHeader: string = $localize`:@@panelContentEdit:Contenido del panel`;
	public samplePanelTitle: string = $localize`:@@samplePanelTitle:Previsualización`;
	public samplePanelDBName: string = $localize`:@@samplePanelName:Título del informe`;
	public samplePanelName: string = $localize`:@@samplePanelName:Título del panel`;
	public filtrar: string = $localize`:@@filterButtonDashboard:Filtrar`;
	public css: string;

	public left: string = $localize`:@@left:Izquierda`;
	public center: string = $localize`:@@center:Centro`;
	public right: string = $localize`:@@right:Derecha`;

	/**Dashboard title */
	public selectedTitleFont: any;
	public titleFontSize: number = this.stylesProviderService.DEFAULT_FONT_SIZE;
	public titleFontColor: string = this.stylesProviderService.DEFAULT_FONT_COLOR;
	public alignDasboardTitle: string = this.stylesProviderService.DEFAULT_TITLE_ALIGN;

	/**Filters */
	public selectedFiltersFont: any;
	public filtersFontSize: number = this.stylesProviderService.DEFAULT_FONT_SIZE;
	public filtersFontColor: string = this.stylesProviderService.DEFAULT_FONT_COLOR;

	/**Panel title */
	public selectedPanelTitleFont: any;
	public panelTitleFontSize: number = this.stylesProviderService.DEFAULT_FONT_SIZE;
	public panelTitleFontColor: string = this.stylesProviderService.DEFAULT_FONT_COLOR;
	public alignPanelTitle: string = this.stylesProviderService.DEFAULT_PANEL_TITLE_ALIGN;

	/**Panel content */
	public selectedPanelFont: any;
	public panelFontSize: number = this.stylesProviderService.DEFAULT_FONT_SIZE;
	public panelFontColor: string = this.stylesProviderService.DEFAULT_FONT_COLOR;



	public sampleTextFont: string = DEFAULT_FONT_FAMILY;
	public sampleTextStle: {} = {};

	/**Sample panel */
	public sampleGlobalStyle: {};
	public sampleTitleStyle: {};
	public sampleFiltersStyle: {};
	public samplePanelTitleStyle: {};
	public samplePanelContentStyle: {};
	public panelBG: string;

	constructor(private stylesProviderService: StyleProviderService) {
		super();
		this.dashBoardStyles = {} as DashboardStyles;

		this.dialog = new EdaDialog({
			show: () => this.onShow(),
			hide: () => this.onClose(EdaDialogCloseEvent.NONE),
			title: $localize`:@@editStylesTitle:EDITAR ESTILOS DEL INFORME`,
		});
		this.dialog.style = { width: '90%', height: '80%' };
	}

	onShow(): void {

		this.dashBoardStyles = this.controller.params;
		this.assignValues(this.dashBoardStyles);
		this.setSampleTitleStyle();
		this.setSampleFIltersStyle();
		this.setSampleGlobalStyle();
		this.setPanelTitleStyle();
		this.setPanelContentStyle();


		// this.sampleTextStle = {'font-family':this.selectedFont.value, 'font-size':'1.3em'}
	}

	onClose(event: EdaDialogCloseEvent, response?: any): void {
		return this.controller.close(event, response);
	}

	assignValues(styles: DashboardStyles): void {

		/**Title */
		this.selectedTitleFont = { label: styles.title.fontFamily, value: styles.title.fontFamily }
		this.titleFontColor = styles.title.fontColor;
		this.titleFontSize = styles.title.fontSize;
		this.alignDasboardTitle = styles.titleAlign;

		/**Filters */
		this.selectedFiltersFont = { label: styles.filters.fontFamily, value: styles.filters.fontFamily }
		this.filtersFontColor = styles.filters.fontColor;
		this.filtersFontSize = styles.filters.fontSize;

		/**Panel title */
		this.selectedPanelTitleFont = { label: styles.panelTitle.fontFamily, value: styles.panelTitle.fontFamily }
		this.panelTitleFontColor = styles.panelTitle.fontColor;
		this.panelTitleFontSize = styles.panelTitle.fontSize;
		this.alignPanelTitle = styles.panelTitleAlign;

		/**Panel content */
		this.selectedPanelFont = { label: styles.panelContent.fontFamily, value: styles.panelContent.fontFamily }
		this.panelFontColor = styles.panelContent.fontColor;
		this.panelFontSize = styles.panelContent.fontSize;

		this.css = styles.customCss;

	}

	public setSampleGlobalStyle() {

		this.sampleGlobalStyle = {
			'background-color': this.dashBoardStyles.backgroundColor,
		}
	}

	public setSampleTitleStyle() {
		this.sampleTitleStyle = {
			'background-color': this.dashBoardStyles.panelColor,
			'font-family': this.selectedTitleFont.value,
			'color': this.titleFontColor,
			'text-align': this.alignDasboardTitle === 'flex-start' ? 'left' : this.alignDasboardTitle === 'center' ? 'center' : 'right',
			'font-size': `${this.titleFontSize / 10 + 1.8}rem`,
			'margin-bottom': 'auto',
			'font-weight': '600',
			'white-space': 'nowrap',
			'padding': '0.1em',
			'box-shadow': '0 2px 1px -1px rgb(0 0 0 / 20%), 0 1px 1px 0 rgb(0 0 0 / 14%), 0 1px 3px 0 rgb(0 0 0 / 12%)'
		}
	}

	public setSampleFIltersStyle() {
		this.sampleFiltersStyle = {
			'font-family': this.selectedFiltersFont.value,
			'color': this.filtersFontColor,
			'font-size': `${this.filtersFontSize / 10 + 1.1}rem`,
		}
	}

	public setPanelTitleStyle() {
		this.samplePanelTitleStyle = {
			'font-family': this.selectedPanelTitleFont.value,
			'color': this.panelTitleFontColor,
			'text-align': this.alignPanelTitle,
			'font-size': `${this.panelTitleFontSize / 10 + 1.2}rem`,
		}
	}

	public setPanelContentStyle() {
		this.samplePanelContentStyle = {
			'font-family': this.selectedPanelFont.value,
			'color': this.panelFontColor,
			'font-size': `${this.panelFontSize / 10 + 1}rem`,
		};
	}

	public setCustomStyle() {

	}

	public closeDialog(): void {
		this.onClose(EdaDialogCloseEvent.NONE);
	}

	public resetStyles() {
		this.onClose(EdaDialogCloseEvent.NEW, this.stylesProviderService.generateDefaultStyles());
	}

	public saveConfig(): void {
		// this.dashBoardStyles.fontFamily = this.selectedFont.value;
		const response: DashboardStyles = {
			backgroundColor: this.dashBoardStyles.backgroundColor,
			panelColor: this.dashBoardStyles.panelColor,
			titleAlign: this.alignDasboardTitle,
			panelTitleAlign: this.alignPanelTitle,
			customCss: this.css,
			title: {
				fontFamily: this.selectedTitleFont.value,
				fontSize: this.titleFontSize,
				fontColor: this.titleFontColor
			},
			filters: {
				fontFamily: this.selectedFiltersFont.value,
				fontSize: this.filtersFontSize,
				fontColor: this.filtersFontColor
			},
			panelTitle: {
				fontFamily: this.selectedPanelTitleFont.value,
				fontSize: this.panelTitleFontSize,
				fontColor: this.panelTitleFontColor
			},
			panelContent: {
				fontFamily: this.selectedPanelFont.value,
				fontSize: this.panelFontSize,
				fontColor: this.panelFontColor
			},
		}

		this.onClose(EdaDialogCloseEvent.NEW, response);
	}

	hex2rgb(hex, opacity = 100): string {
		hex = hex.replace('#', '');
		const r = parseInt(hex.substring(0, 2), 16);
		const g = parseInt(hex.substring(2, 4), 16);
		const b = parseInt(hex.substring(4, 6), 16);

		return 'rgba(' + r + ',' + g + ',' + b + ',' + opacity / 100 + ')';
	}

	rgb2hex(rgb): string {
		rgb = rgb.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i);
		return (rgb && rgb.length === 4) ? '#' +
			('0' + parseInt(rgb[1], 10).toString(16)).slice(-2) +
			('0' + parseInt(rgb[2], 10).toString(16)).slice(-2) +
			('0' + parseInt(rgb[3], 10).toString(16)).slice(-2) : '';
	}
}