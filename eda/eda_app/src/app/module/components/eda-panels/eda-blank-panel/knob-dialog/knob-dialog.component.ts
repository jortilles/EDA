import { Component, CUSTOM_ELEMENTS_SCHEMA, ViewChild } from "@angular/core";
import { EdaDialog, EdaDialogAbstract, EdaDialogCloseEvent } from "@eda/shared/components/shared-components.index";
import { PanelChart } from "../panel-charts/panel-chart";
import { PanelChartComponent } from "../panel-charts/panel-chart.component";
import { StyleProviderService } from '@eda/services/service.index';
import { FormsModule } from '@angular/forms'; 
import { CommonModule } from '@angular/common';

@Component({
    standalone: true,
    selector: 'knob-dialog',
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
    templateUrl: './knob-dialog.component.html',
    imports: [FormsModule, CommonModule]
})

export class KnobDialogComponent extends EdaDialogAbstract {

    @ViewChild('PanelChartComponent', { static: false }) myPanelChartComponent: PanelChartComponent;

    public dialog: EdaDialog;
    public panelChartConfig: PanelChart = new PanelChart();
    public color: string = '';
    public min: number;
    public max: number;
    public limitInQuery: boolean;
    public label: string;
    public display: boolean = false;

    constructor(private styleProviderService : StyleProviderService) {
        super();

        this.dialog = new EdaDialog({
            show: () => this.onShow(),
            hide: () => this.onClose(EdaDialogCloseEvent.NONE),
            title: $localize`:@@ChartProps:PROPIEDADES DEL GRAFICO`
        });
        this.dialog.style = { width: '80%', height: '70%', top: "-4em", left: '1em' };
    }

    onShow(): void {
        this.display = true;
        this.panelChartConfig = this.controller.params.panelChart;

        setTimeout(() => {
            this.label = this.panelChartConfig.data?.labels[0] || 'Knob';

            this.color = this.myPanelChartComponent.componentRef.instance.color;
            const limits = this.myPanelChartComponent.componentRef.instance.limits;
    
            this.min = limits[0];
            this.max = limits[1];
    
            this.limitInQuery = this.controller.params.panelChart.data.labels.length === 2 ? true : false;
        }, 100);
    }
    onClose(event: EdaDialogCloseEvent, response?: any): void {
        return this.controller.close(event, response);
    }

    handleInputColor() {
        if (this.color.length > 6) {
            this.myPanelChartComponent.componentRef.instance.color = this.color;
        }
    }

    saveChartConfig() {
        const properties = {
            color: this.color,
            limits: [this.min, this.max]
        }
        this.styleProviderService.palKnob = false;
        this.onClose(EdaDialogCloseEvent.UPDATE, properties)
    }

    closeChartConfig() {
        this.onClose(EdaDialogCloseEvent.NONE);
    }

}