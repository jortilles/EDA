import { SankeyConfig } from './../panel-charts/chart-configuration-models/sankey-config';
import { Component, ViewChild, AfterViewChecked } from '@angular/core';
import { EdaDialog, EdaDialogAbstract, EdaDialogCloseEvent } from '@eda/shared/components/shared-components.index';
import { PanelChart } from '../panel-charts/panel-chart';
import { PanelChartComponent } from '../panel-charts/panel-chart.component';
import { StyleProviderService,ChartUtilsService } from '@eda/services/service.index';


@Component({
  selector: 'app-sankey-dialog',
  templateUrl: './sankey-dialog.component.html'
})

export class SankeyDialog extends EdaDialogAbstract implements AfterViewChecked {

  @ViewChild('PanelChartComponent', { static: false }) myPanelChartComponent: PanelChartComponent;

  public dialog: EdaDialog;
  public panelChartConfig: PanelChart = new PanelChart();
  public colors: Array<string>;
  public labels: Array<string>;
  public display: boolean = false;
  public selectedLabel: any;
  public selectedPalette: { name: string; paleta: any } | null = null;
  public allPalettes: any = this.stylesProviderService.ChartsPalettes;
  public values;
  private originalColors: string[] = [];
  public uniqueLabels;
  constructor(private stylesProviderService: StyleProviderService, private ChartUtilsService: ChartUtilsService) {

    super();

    this.dialog = new EdaDialog({
      show: () => this.onShow(),
      hide: () => this.onClose(EdaDialogCloseEvent.NONE),
      title: $localize`:@@ChartProps:PROPIEDADES DEL GRAFICO`
    });
    this.dialog.style = { width: '80%', height: '70%', top: "-4em", left: '1em' };
  }

  ngAfterViewChecked(): void {
    if (!this.colors && this.myPanelChartComponent?.componentRef) {
      this.values = this.myPanelChartComponent?.componentRef.instance.data.values;
      this.uniqueLabels = [...new Set<string>(this.values.map(v => v[0] as string))];
      //To avoid "Expression has changed after it was checked" warning

      setTimeout(() => {
      // Copiar y eliminar duplicados
        this.colors = [...new Set<string>(this.myPanelChartComponent.componentRef.instance.colors)];
        this.originalColors = [...this.colors]; // Guardar estado original aquí

        this.labels = this.myPanelChartComponent.componentRef.instance.firstColLabels;
      }, 0);
    }
  }

  onShow(): void {
    this.panelChartConfig = this.controller.params.panelChart;
    this.display = true;
  }
  onClose(event: EdaDialogCloseEvent, response?: any): void {
    return this.controller.close(event, response);
  }

  saveChartConfig() {
    this.onClose(EdaDialogCloseEvent.UPDATE, { colors: this.colors });
  }

  closeChartConfig() {
    this.onClose(EdaDialogCloseEvent.NONE);
  }

  handleInputColor(): void {
    // Alamacenar datos originales por si cancelan --> no va
    const original = JSON.parse(JSON.stringify(this.myPanelChartComponent.props.config.getConfig()['assignedColors']));
    
    // Recolección de todos los label / values
    const labelColorMap: { [key: string]: string } = {};
    this.uniqueLabels.forEach((label, i) => {
      labelColorMap[label] = this.colors[i];
    });
    
    // Todos los colores en orden a asignar
    let colorsLabels = this.values.map(v => labelColorMap[v[0] as string]);
    
    // Este setConfig asigna los colores del chart en preview
    this.myPanelChartComponent.props.config.setConfig({ colors: [...new Set<string>(colorsLabels)] });
    this.myPanelChartComponent.changeChartType();

    // Actualiza originalColors con el nuevo estado después de cambiar el tipo de gráfico
    this.originalColors = [...this.colors];

    // Actualiza el componente con los valores originales por si no se guarda la modif --> no funciona
    setTimeout(() => {
      this.myPanelChartComponent.props.config.getConfig()['assignedColors'] = original;
    }, 0);
  
  }

  onPaletteSelected() {

    // Carga de nueva paleta de colores según length
    const newColors = this.ChartUtilsService.generateRGBColorGradientScaleD3(
      this.uniqueLabels.length,
      this.selectedPalette['paleta']
    );

    // Separación de valores dependiendo de color / value
    const labelColorMap: { [key: string]: string } = {};
      this.uniqueLabels.forEach((label, i) => {
      labelColorMap[label] = newColors[i].color;
    });

    const orderedLabelPaleta = this.uniqueLabels.map(label => ({
      value: label,
      color: labelColorMap[label]
    }));

    // Lista de colores y valores únicos para el selector de colores (derecha)
    this.colors = [...orderedLabelPaleta.map(item => item.color)]
    
    // Hacemos lista de todos los colores junto a data para pintar el chart 
    let colorsLabels = this.values.map(v => labelColorMap[v[0] as string]);

    // Creación de chart
    this.myPanelChartComponent.props.config.setConfig({ colors: [...new Set<string>(colorsLabels)] });
    this.myPanelChartComponent.changeChartType();
  }
}