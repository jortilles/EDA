export class EdaKpi {
    header: string;
    value: number;
    /** From the numeric column's configured "Número de decimals" - drives the display pipe's
     *  fraction digits in eda-kpi.component.html. Undefined when no numeric column config is
     *  available, in which case the template falls back to its original 0-10 range. */
    decimals?: number;
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
    /** Multiplicative font-size factor used in forks mode (hover +/- buttons). Only applies when KPI_CONFIG.USE_EDALITICS_SIZE_LOGIC is false. */
    fontScale: number;
    /** Whether the hover +/- resize buttons should be shown (forks mode only, computed from edit/lock state by the panel). */
    showResizeControls?: boolean;
    backgroundColor: string;
    kpiColor: string;
    prefixImage: string;
    imageScale?: number;
    valueFontScale?: number;
    sufixFontScale?: number;
}
