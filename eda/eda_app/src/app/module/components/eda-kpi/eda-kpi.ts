import { EdaChart } from "../eda-chart/eda-chart";

export class EdaKpi {
    header: string;
    value: number;
    sufix: string;
    styleClass: any;
    style: any;
    alertLimits : Array<{value:number, operand:string, color:string}>;
    edaChart: EdaChart;
    showChart: boolean;
}
