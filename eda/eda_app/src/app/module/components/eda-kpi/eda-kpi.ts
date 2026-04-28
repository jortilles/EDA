import { EdaChart } from "../eda-chart/eda-chart";

export class EdaKpi {
    header: string;
    value: number;
    sufix: string;
    /* SDA CUSTOM */ fontScale?: number;
    /* SDA CUSTOM */ showResizeControls?: boolean;
    /* SDA CUSTOM */ color?: string;
    /* SDA CUSTOM */ lineWidth?: number;
    /* SDA CUSTOM */ lineStyle?: string;
    /* SDA CUSTOM */ showXAxis?: boolean;
    /* SDA CUSTOM */ showXAxisLabels?: boolean;
    /* SDA CUSTOM */ xAxisLabelCount?: number;
    styleClass: any;
    style: any;
    alertLimits : Array<{value:number, operand:string, color:string}>;
    edaChart: EdaChart;
    showChart: boolean;
}
