import { Column } from './../../shared/models/dashboard-models/column.model';
import { EdaColumn } from '@eda/components/eda-table/eda-columns/eda-column';
import { Injectable } from '@angular/core';
import { EdaChartComponent } from '@eda/components/eda-chart/eda-chart.component';

export interface EdaChartType {
    label: string;
    value: string;
    icon: string;
    ngIf: boolean;
}

export interface FilterType {
    label: string;
    value: string;
    typeof: string[];
}

export interface OrdenationType {
    display_name: string;
    value: string;
    selected: boolean;
}

export interface FormatDates {
    display_name: string;
    value: string;
    selected: boolean;
}

@Injectable()
export class ChartUtilsService {

    public chartTypes: EdaChartType[] = [
        { label: 'Table', value: 'table', icon: 'pi pi-exclamation-triangle', ngIf: true },
        { label: 'CrossTable', value: 'crosstable', icon: 'pi pi-exclamation-triangle', ngIf: true },
        { label: 'KPI', value: 'kpi', icon: 'pi pi-exclamation-triangle', ngIf: true },
        { label: 'Pie Chart', value: 'doughnut', icon: 'pi pi-exclamation-triangle', ngIf: true },
        { label: 'Bar Chart', value: 'bar', icon: 'pi pi-exclamation-triangle', ngIf: true },
        { label: 'Horizontal Bar Chart', value: 'horizontalBar', icon: 'pi pi-exclamation-triangle', ngIf: true },
        { label: 'Line Chart', value: 'line', icon: 'pi pi-exclamation-triangle', ngIf: true },
    ];

    public filterTypes: FilterType[] = [
        { label: 'IGUAL A (=)', value: '=', typeof: ['numeric', 'date', 'varchar'] },
        { label: 'NO IGUAL A (!=)', value: '!=', typeof: ['numeric', 'date', 'varchar'] },
        { label: 'MAYOR A (>)', value: '>', typeof: ['numeric', 'date'] },
        { label: 'MENOR A (<)', value: '<', typeof: ['numeric', 'date'] },
        { label: 'MAYOR o IGUAL A (>=)', value: '>=', typeof: ['numeric', 'date'] },
        { label: 'MENOR o IGUAL A (<=)', value: '<=', typeof: ['numeric', 'date'] },
        { label: 'ENTRE (between)', value: 'between', typeof: ['numeric', 'date'] },
        { label: 'DENTRO DE (in)', value: 'in', typeof: ['numeric', 'date', 'varchar'] },
        { label: 'FUERA DE (not in)', value: 'not_in', typeof: ['numeric', 'date', 'varchar'] },
        { label: 'PARECIDO A (like)', value: 'like', typeof: ['varchar'] },
        { label: 'VALORES NO NULOS (not null)', value: 'not_null', typeof: ['numeric', 'date', 'varchar'] }
    ];

    public ordenationTypes: OrdenationType[] = [
        { display_name: 'ASC', value: 'Asc', selected: false },
        { display_name: 'DESC', value: 'Desc', selected: false },
        { display_name: 'NO', value: 'No', selected: false }
    ];

    public formatDates: FormatDates[] = [
        { display_name: 'AÑO', value: 'year', selected: false },
        { display_name: 'MES', value: 'month', selected: false },
        { display_name: 'DIA', value: 'day', selected: false },
        { display_name: 'NO', value: 'No', selected: false }
    ];

    transformDataQuery(type: string, values: any[], dataTypes: string[], dataDescription: any) {
        const output = [];
        const idx = [];

        dataTypes.forEach((e: any) => {
            e === 'numeric' ? idx.push('n') : idx.includes('l') ? idx.push('s') : idx.push('l');
        });
        const label_idx = idx.indexOf('l');
        const serie_idx = idx.indexOf('s');
        const number_idx = idx.indexOf('n');

        if (type === 'doughnut') {
            const _labels = values.map(v => v[label_idx]);
            const _values = values.map(v => v[number_idx]).filter(elem => elem != null);
            // Faig push a l'array output, que sera retornat per l'inicialització del PieChart
            output.push(_labels, _values);
            return output;

        } else if (type === 'bar' || type === 'line' || type === 'horizontalBar') {
            const l = Array.from(new Set(values.map(v => v[label_idx])));
            const s = serie_idx !== -1 ? Array.from(new Set(values.map(v => v[serie_idx]))) : null;
            const _output = [[], []];

            _output[0] = l;
            if (dataDescription.otherColumns.length === 1) {
                _output[1] = [{
                    data: values.map(v => v[number_idx]),
                    label: dataDescription.otherColumns[0].name
                }];
            } else {
                let series = [];
                s.forEach((s) => {
                    _output[1].push({ data: [], label: s });
                    let serie = values.filter(v => v[serie_idx] === s);
                    series.push(serie);
                });
                l.forEach((l) => {
                    // let data_point = null;
                    series.forEach((serie, i) => {
                        const t = serie.filter(s => s[label_idx] === l).map(e => e[number_idx])[0];
                        t != null ? _output[1][i].data.push(t) : _output[1][i].data.push(null);
                    });
                });
            }
            return _output;
        }
    }

    transformDataQueryForTable(labels: any[], values: any[]) {
        const output = [];
        // Load the Table for a preview
        for (let i = 0; i < values.length; i += 1) {
            const obj = {};
            for (let e = 0; e < values[i].length; e += 1) {
                obj[labels[e]] = values[i][e];
            }
            output.push(obj);
        }
        return output;
    }

    /**
     * Takes current query and returs not allowedCharts
     * @param currentQuery 
     * @return [] notAllowed chart types
     */
    getNotAllowedCharts(dataDescription: any): any[] {

        let notAllowed = ['table', 'crosstable', 'kpi', 'doughnut', 'line', 'bar', 'horizontalBar'];
        //table (at least one column)
        if (dataDescription.totalColumns > 0) notAllowed.splice(notAllowed.indexOf('table'), 1);

        // KPI (only one numeric column)
        if (dataDescription.totalColumns === 1 && dataDescription.numericColumns.length === 1) {
            notAllowed.splice(notAllowed.indexOf('kpi'), 1);
        }
        // Pie (Only one numeric column and one char/date column)
        if (dataDescription.totalColumns === 2 && dataDescription.numericColumns.length === 1) {
            notAllowed.splice(notAllowed.indexOf('doughnut'), 1);
        }
        // Bar && Line (One numeric column, max 3 columns)
        if (dataDescription.numericColumns.length === 1 && dataDescription.totalColumns > 1 && dataDescription.totalColumns < 4) {
            notAllowed.splice(notAllowed.indexOf('bar'), 1);
            notAllowed.splice(notAllowed.indexOf('horizontalBar'), 1);
            notAllowed.splice(notAllowed.indexOf('line'), 1);
        }
        // Crosstable (At least three columns, one numeric)
        if (dataDescription.totalColumns > 2 && dataDescription.numericColumns.length > 0) {
            notAllowed.splice(notAllowed.indexOf('crosstable'), 1);
        }

        return notAllowed;
    }

    /**
     * Check if actual config is compatible with actual chart and returns a valid color configuration
     * @param currentChartype 
     * @param layout 
     */
    recoverChartColors(currentChartype: string, layout: any) {
        if (layout && layout.chartType === currentChartype) {
            return this.mergeColors(layout)
        }
        else {
            switch (currentChartype) {
                case 'doughnut': return EdaChartComponent.generatePiecolors();
                case 'bar': return EdaChartComponent.generateChartColors();
                case 'line': return EdaChartComponent.generateChartColors();
                case 'horizontalBar': return EdaChartComponent.generateChartColors();
            }
        }
    }

    mergeColors(layout) {
        if (layout.chartType === 'doughnut') {
            let colors = EdaChartComponent.generatePiecolors();
            layout.styles[0].backgroundColor.forEach((element, i) => {
                colors[0].backgroundColor[i] = element;
            });
            layout.styles[0].backgroundColor = colors[0].backgroundColor;
            return layout.styles;

        } else if (['line', 'bar', 'horizontalBar'].includes(layout.chartType)) {
            return layout.styles;
        }
    }

    describeData(currentQuery: any, labels: any) {
        let names = this.pretifyLabels(currentQuery, labels);
        let out = { numericColumns: [], otherColumns: [], totalColumns: 0 }
        currentQuery.forEach((col, i) => {
            if (col.column_type === 'numeric') {
                out.numericColumns.push({ name: names[i], index: i });
            } else {
                out.otherColumns.push({ name: names[i], index: i });
            }
            out.totalColumns += 1;
        });
        return out;
    }
    pretifyLabels(columns : Array<Column>, labels:Array<string>){
        let names = [];
        labels.forEach(label => {
            columns.forEach(column => {
                if (column.column_name === label) {
                    names.push(column.display_name.default);
                }
            });
        });
        return names
    }

    initChartOptions(type: string, numericColumn: string, labelColum: any[]) {
        const options = {
            chartOptions: {},
            chartPlugins: {}
        };
        switch (type) {
            case 'doughnut':
                options.chartOptions = {
                    responsive: true,
                    maintainAspectRatio: false,
                    devicePixelRatio: 2,
                    legend: {
                        display: true,
                        fontSize: 11,
                        fontStyle: 'normal',
                        position: 'bottom'
                    },
                    tooltips: {
                        mode: 'label',
                        callbacks: {
                            title: (tooltipItem, data) => {
                                return `${labelColum[0].name}`
                            },
                            label: (tooltipItem, data) => {
                                if (data && tooltipItem)
                                    return ` ${data.labels[tooltipItem.index]}, ${numericColumn} : ${data.datasets[0].data[tooltipItem.index]}`;
                            },
                            afterLabel: (t, d) => {
                            }
                        }
                    },
                    animation: {
                        //duration : 0,
                        // easyng : 'easeInOutCubic'
                    }
                };
                // options.chartPlugins = [pluginDataLabels];
                break;
            case 'bar':
                options.chartOptions = {
                    responsive: true,
                    maintainAspectRatio: false,
                    devicePixelRatio: 2,
                    legend: {
                        display: true,
                        position: 'bottom',
                        fontSize: 11,
                        fontStyle: 'normal',
                        labels: { boxWidth: 10 }
                    },
                    tooltips: {
                        callbacks: {
                            title: (tooltipItem, data) => {
                                if (data && tooltipItem)
                                    return ` ${labelColum[0].name} : ${data.labels[tooltipItem[0].index]}`;
                            },
                            label: (tooltipItem, data) => {
                                if (data && tooltipItem)
                                    return `${data.datasets[tooltipItem.datasetIndex].label},  ${numericColumn} : ${tooltipItem.yLabel}`;
                            },
                            afterLabel: (t, d) => {
                            }
                        }
                    },
                    scales: {
                        xAxes: [{
                            gridLines: { display: false },
                            ticks: {
                                callback: (value) => {
                                    if (value)
                                        return value.length > 30 ? (value.substr(0, 17) + '...') : value;
                                },
                                fontSize: 11, fontStyle: 'bold'
                            }
                        }],
                        yAxes: [{
                            // stacked: true
                            ticks: { fontSize: 9}
                        }]
                    },
                    plugins: {
                        datalabels: { anchor: 'end', align: 'end' }
                    },
                };
                // options.chartPlugins = [];
                break;
            case 'horizontalBar':
                options.chartOptions = {
                    responsive: true,
                    maintainAspectRatio: false,
                    devicePixelRatio: 2,
                    legend: {
                        display: true,
                        position: 'bottom',
                        fontSize: 11,
                        fontStyle: 'normal',
                        labels: { boxWidth: 10 }
                    },
                    tooltips: {
                        // callbacks: {
                        //     title: (tooltipItem, data) => {
                        //         if (data && tooltipItem)
                        //             return ` ${labelColum[0].name} : ${data.labels[tooltipItem[0].index]}`;
                        //     },
                        //     label: (tooltipItem, data) => {
                        //         if (data && tooltipItem)
                        //             return `${data.datasets[tooltipItem.datasetIndex].label},  ${numericColumn} : ${tooltipItem.yLabel}`;
                        //     },
                        //     afterLabel: (t, d) => {
                        //     }
                        // }
                    },
                    scales: {
                        xAxes: [{
                            gridLines: { display: false },
                            ticks: {
                                callback: (value) => {
                                    if (value)
                                        return value.length > 30 ? (value.substr(0, 17) + '...') : value;
                                },
                                fontSize: 11, fontStyle: 'bold'
                            }
                        }],
                        yAxes: [{
                            // stacked: true
                            ticks: { fontSize: 9, min: 0 }
                        }]
                    },
                    plugins: {
                        datalabels: { anchor: 'end', align: 'end' }
                    },
                };
                // options.chartPlugins = [];
                break;
            case 'line':
                options.chartOptions = {
                    showLines: true,
                    spanGaps: true,
                    responsive: true,
                    maintainAspectRatio: false,
                    legend: {
                        display: true,
                        position: 'bottom',
                        fontSize: 11,
                        fontStyle: 'normal',
                        labels: { boxWidth: 10 }
                    },
                    tooltips: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            title: (tooltipItem, data) => {
                                if (data && tooltipItem) {
                                    return ` ${labelColum[0].name} : ${data.labels[tooltipItem[0].index]}`;
                                }
                            },
                            label: (tooltipItem, data) => {
                                if (data && tooltipItem)
                                    return ` ${data.datasets[tooltipItem.datasetIndex].label},  ${numericColumn} : ${tooltipItem.yLabel}`;
                            },
                            afterLabel: (tooltipItem, data) => {
                            }
                        }
                    },
                    scales: {
                        xAxes: [{
                            gridLines: { display: false },
                            ticks: {
                                callback: (value) => {
                                    if (value)
                                        return value.length > 30 ? (value.substr(0, 17) + '...') : value;
                                },
                                fontSize: 11, fontStyle: 'bold'
                            }
                        }],
                        yAxes: [
                            {
                                id: 'y-axis-0', position: 'left',
                                ticks: { fontSize: 9},
                                stacked: false
                            }
                        ]
                    },
                    elements: {
                        point: { radius: 2, hitRadius: 4, hoverRadius: 3, hoverBorderWidth: 1, pointStyle: 'circle' },
                        line: { borderWidth: 1.5, fill: false, tension: 0.3 }
                    }
                };
                // options.chartPlugins = [];
                break;
        }
        return options;
    }

}
