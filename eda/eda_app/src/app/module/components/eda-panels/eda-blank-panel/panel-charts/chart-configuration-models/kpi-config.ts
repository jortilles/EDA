import { ChartJsConfig } from "./chart-js-config";

export class KpiConfig {
    sufix: string = '';
    alertLimits: any[] = [];
    edaChart: ChartJsConfig;
    /* SDA CUSTOM */ fontScale: number = 1;
    /* SDA CUSTOM */ color: string;
    /* SDA CUSTOM */ lineWidth: number = 2;
    /* SDA CUSTOM */ lineStyle: string = 'solid';
    /* SDA CUSTOM */ showXAxis: boolean = true;
    /* SDA CUSTOM */ showXAxisLabels: boolean = true;
    /* SDA CUSTOM */ xAxisLabelCount: number = 0;
  /* SDA CUSTOM */ // SDA CUSTOM - KPI datalabel color setting
  /* SDA CUSTOM */ labelColor: string = '#000000';
  /* SDA CUSTOM */ // END SDA CUSTOM
  /* SDA CUSTOM */ // SDA CUSTOM - KPI chart label settings
  /* SDA CUSTOM */ showLabels: boolean = false;
  /* SDA CUSTOM */ showLabelsPercent: boolean = false;
  /* SDA CUSTOM */ labelBackgroundColor: string = '';
  /* SDA CUSTOM */ // END SDA CUSTOM
    constructor(init?: Partial<KpiConfig>) {
        this.edaChart = new ChartJsConfig(
          init?.edaChart?.colors || [],
          init?.edaChart?.chartType || "",
          init?.edaChart?.addTrend || false,
          init?.edaChart?.addComparative || false,
          init?.edaChart?.showLabels || false,
          init?.edaChart?.showLabelsPercent || false,
          init?.edaChart?.numberOfColumns || 0,
          init?.edaChart?.assignedColors || []
        );
        /* SDA CUSTOM */ this.lineWidth = init?.lineWidth ?? this.lineWidth;
        /* SDA CUSTOM */ this.lineStyle = init?.lineStyle ?? this.lineStyle;
        /* SDA CUSTOM */ this.showXAxis = init?.showXAxis ?? this.showXAxis;
        /* SDA CUSTOM */ this.showXAxisLabels = init?.showXAxisLabels ?? this.showXAxisLabels;
        /* SDA CUSTOM */ this.xAxisLabelCount = init?.xAxisLabelCount ?? this.xAxisLabelCount;
        /* SDA CUSTOM */ this.labelColor = init?.labelColor ?? this.labelColor;
        /* SDA CUSTOM */ this.showLabels = init?.showLabels ?? init?.edaChart?.showLabels ?? this.showLabels;
        /* SDA CUSTOM */ this.showLabelsPercent = init?.showLabelsPercent ?? init?.edaChart?.showLabelsPercent ?? this.showLabelsPercent;
        /* SDA CUSTOM */ this.labelBackgroundColor = init?.labelBackgroundColor ?? this.labelBackgroundColor;

        Object.assign(this, init);


    }
}
