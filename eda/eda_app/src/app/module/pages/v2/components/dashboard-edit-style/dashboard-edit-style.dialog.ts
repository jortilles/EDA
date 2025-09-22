import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { FormsModule, ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from "@angular/forms";
import { AlertService, GroupService, IGroup } from "@eda/services/service.index";
import { EdaDialog, EdaDialog2Component, EdaDialogAbstract, EdaDialogCloseEvent } from "@eda/shared/components/shared-components.index";
import { SharedModule } from "@eda/shared/shared.module";
import { DashboardStyles, StyleProviderService } from "@eda/services/service.index";
import { SelectItem } from "primeng/api";
import { MultiSelectModule } from "primeng/multiselect";
import { SelectButtonModule } from "primeng/selectbutton";
import { FloatLabelModule } from 'primeng/floatlabel';
import { SliderModule } from 'primeng/slider';
import { ColorPickerModule } from 'primeng/colorpicker';
import { RadioButtonModule } from 'primeng/radiobutton';
import { CommonModule } from '@angular/common'; 


import { DashboardPageV2 } from "../../dashboard/dashboard.page";

@Component({
  selector: 'app-dashboard-edit-style',
  standalone: true,
  templateUrl: './dashboard-edit-style.dialog.html',
  imports: [SharedModule, ReactiveFormsModule, FormsModule, SelectButtonModule,
    MultiSelectModule, FloatLabelModule, SliderModule, ColorPickerModule,RadioButtonModule,CommonModule]
})
export class DashboardEditStyleDialog {
  @Output() close: EventEmitter<any> = new EventEmitter<any>();
  @Output() apply: EventEmitter<any> = new EventEmitter<any>();
  @Input() dashboard: DashboardPageV2;
  public dialog: EdaDialog;
  public form: UntypedFormGroup;
  public visibleTypes: SelectItem[] = [];
  

  public display: boolean = false;
  public backgroundColor: string = this.stylesProviderService.DEFAULT_BACKGROUND_COLOR;
  public panelColor: string = this.stylesProviderService.DEFAULT_PANEL_COLOR;
  public allPalettes: any = this.stylesProviderService.ChartsPalettes;
  public selectedPalette = this.stylesProviderService.ActualChartPalette !== undefined ? this.allPalettes.find(p => p?.name === this.stylesProviderService?.ActualChartPalette['name']) : this.allPalettes[0];
  public properties: boolean = true;
  
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

  public dashBoardStyles: DashboardStyles;

  public titleHeader: string = $localize`:@@dashboardTitleEdit:Título del informe`;
  public filtersHeader: string = $localize`:@@filtersEdit:Filtros`;
  public panelTitleHeader: string = $localize`:@@panelTitleEdit:Título del panel`;
  public panelContentHeader: string = $localize`:@@panelContentEdit:Contenido del panel`;
  public samplePanelTitle: string = $localize`:@@samplePanelTitle:Previsualización`;
  public samplePanelDBName: string = $localize`:@@samplePanelDBName:Título del informe`;
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



  public sampleTextFont: string = this.stylesProviderService.DEFAULT_FONT_FAMILY;
  public sampleTextStle: {} = {};

  /**Sample panel */
  public sampleGlobalStyle: {};
  public sampleTitleStyle: {};
  public sampleFiltersStyle: {};
  public samplePanelTitleStyle: {};
  public samplePanelContentStyle: {};
  public panelBG: string;

    
    
  constructor(private formBuilder: UntypedFormBuilder, private alertService: AlertService
    , private stylesProviderService: StyleProviderService) {
      this.dashBoardStyles = {} as DashboardStyles;
  }

	ngOnInit(): void {
		this.dashBoardStyles = this.dashboard.dashboard.config.styles;
		this.assignValues(this.dashBoardStyles);
		this.setSampleTitleStyle();
		this.setSampleFIltersStyle();
		this.setSampleGlobalStyle();
		this.setPanelTitleStyle();
		this.setPanelContentStyle();
  	}

  assignValues(styles: DashboardStyles): void {
	  /** Global colors */
	this.backgroundColor = styles.backgroundColor;  
	this.panelColor = styles.panelColor;

	  
	/**Title */
	this.selectedTitleFont = styles.filters.fontFamily;
	this.titleFontColor = styles.title.fontColor;
	this.titleFontSize = styles.title.fontSize;
	this.alignDasboardTitle = styles.titleAlign;

	/**Filters */
	this.selectedFiltersFont = styles.filters.fontFamily
	this.filtersFontColor = styles.filters.fontColor;
	this.filtersFontSize = styles.filters.fontSize;

	/**Panel title */
	this.selectedPanelTitleFont = styles.panelTitle.fontFamily;
	this.panelTitleFontColor = styles.panelTitle.fontColor;
	this.panelTitleFontSize = styles.panelTitle.fontSize;
	this.alignPanelTitle = styles.panelTitleAlign;

	/**Panel content */
	this.selectedPanelFont = styles.panelContent.fontFamily;
	this.panelFontColor = styles.panelContent.fontColor;
	this.panelFontSize = styles.panelContent.fontSize;

	this.css = styles.customCss;

	}

	public setSampleGlobalStyle() {
		this.sampleGlobalStyle = {
			'background-color': this.backgroundColor,
		}
	}

  public setSampleTitleStyle() {
		this.sampleTitleStyle = {
			'font-family': this.selectedTitleFont,
			'color': this.titleFontColor,
			'text-align': this.alignDasboardTitle === 'flex-start' ? 'left' : this.alignDasboardTitle === 'center' ? 'center' : 'right',
			'font-size': `${this.titleFontSize / 10 + 1.8}rem`,
			'margin-bottom': 'auto',
			'font-weight': '600',
			'white-space': 'nowrap',
			'padding': '0.1em',
	    }
	}

	public setSampleFIltersStyle() {
		this.sampleFiltersStyle = {
			'font-family': this.selectedFiltersFont,
			'color': this.filtersFontColor,
			'font-size': `${this.filtersFontSize / 10 + 1.1}rem`,
		}
	}

	public setPanelTitleStyle() {
		this.samplePanelTitleStyle = {
			'font-family': this.selectedPanelTitleFont,
			'color': this.panelTitleFontColor,
			'text-align': this.alignPanelTitle === 'flex-start' ? 'left' : this.alignPanelTitle === 'center' ? 'center' : 'right',
			'font-size': `${this.panelTitleFontSize / 10 + 1.2}rem`,
			'box-shadow': '0 2px 1px -1px rgb(0 0 0 / 20%), 0 1px 1px 0 rgb(0 0 0 / 14%), 0 1px 3px 0 rgb(0 0 0 / 12%)',
			'background-color': this.panelColor,
		}
	}

	public setPanelContentStyle() {
		this.samplePanelContentStyle = {
			'font-family': this.selectedPanelFont,
			'color': this.panelFontColor,
			'font-size': `${this.panelFontSize / 10 + 1}rem`,
			'box-shadow': '0 2px 1px -1px rgb(0 0 0 / 20%), 0 1px 1px 0 rgb(0 0 0 / 14%), 0 1px 3px 0 rgb(0 0 0 / 12%)',
			'background-color': this.panelColor,
		};
	}

	public saveConfig(): void {
		// this.dashBoardStyles.fontFamily = this.selectedFont.value;
		this.stylesProviderService.loadedPanels = this.dashboard.dashboard.config?.panel?.length;
		this.stylesProviderService.loadingFromPalette = true;
		const response: DashboardStyles = {
			stylesApplied: true,
			backgroundColor: this.backgroundColor,
			panelColor: this.panelColor,
			titleAlign: this.alignDasboardTitle,
			panelTitleAlign: this.alignPanelTitle,
			customCss: this.css,
			title: {
				fontFamily: this.selectedTitleFont,
				fontSize: this.titleFontSize,
				fontColor: this.titleFontColor
			},
			filters: {
				fontFamily: this.selectedFiltersFont,
				fontSize: this.filtersFontSize,
				fontColor: this.filtersFontColor
			},
			panelTitle: {
				fontFamily: this.selectedPanelTitleFont,
				fontSize: this.panelTitleFontSize,
				fontColor: this.panelTitleFontColor
			},
			panelContent: {
				fontFamily: this.selectedPanelFont,
				fontSize: this.panelFontSize,
				fontColor: this.panelFontColor
			},
			palette: this.selectedPalette
		}
		this.stylesProviderService.setStyles(response)
		this.stylesProviderService.palKnob = true;
		this.stylesProviderService.colorCode = false; // Priorizar estilos sobre codigo de color
		this.apply.emit(response);
	}

	public resetStyles() {
		this.assignValues(this.stylesProviderService.generateDefaultStyles());
		this.setSampleFIltersStyle();
		this.setSampleGlobalStyle();
		this.setPanelTitleStyle();
		this.setPanelContentStyle();
		this.setSampleTitleStyle();
	}

public comparePalettes = (p1: any, p2: any) => p1 && p2 && p1?.name === p2?.name;

	public onApply() {
		this.display = false;
		this.saveConfig();
	}

	public disableApply(): boolean {
		return false;
	}

	public onClose(): void {
		this.display = false;
		this.close.emit();
	}
}
