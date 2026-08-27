export class EdaKpi {
    header: string;
    value: number;
    sufix: string;
    styleClass: any;
    style: any;
    alertLimits : Array<{value:number, operand:string, color:string}>;
    /** Mini-chart config for eda-bar-d3/eda-line-d3/eda-area-d3 (see eda-kpi.component.html's
     *  @switch on edaChart.edaChart) - a plain object built by panel-chart.component.ts's
     *  renderEdaKpiChart(), not one specific typed model, since it can be any of the three. */
    edaChart: any;
    showChart: boolean;
    modifiedFontPoints: number;
    backgroundColor: string;
    kpiColor: string;
    prefixImage: string;
}
