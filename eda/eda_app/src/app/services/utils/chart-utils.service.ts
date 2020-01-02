import { Injectable } from '@angular/core';
import { ChartType } from 'chart.js';

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

@Injectable()
export class ChartUtilsService {

    public chartTypes: EdaChartType[] = [
        { label: 'Table', value: 'table', icon: 'pi pi-exclamation-triangle', ngIf: true },
        { label: 'KPI', value: 'kpi', icon: 'pi pi-exclamation-triangle', ngIf: true },
        { label: 'Pie Chart', value: 'pie', icon: 'pi pi-exclamation-triangle', ngIf: true },
        { label: 'Bar Chart', value: 'bar', icon: 'pi pi-exclamation-triangle', ngIf: true },
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
        { display_name: 'Asc', value: 'Asc', selected: false },
        { display_name: 'Desc', value: 'Desc', selected: false },
        { display_name: 'No', value: 'No', selected: false }
    ];

    transformDataQuery(type: ChartType, values: any[], isSimple?: any[]) {
        const transformed_labels = [];
        const transformed_values = [];
        const output = [];

        if (type === 'pie') {
            for (let i = 0; i < values.length; i += 1) {
                for (let e = 0; e < values[i].length; e += 1) {
                    if (typeof values[i][e] === 'number') {  // Si es tipus number l'introduixo a l'array de valors
                        transformed_values.push(values[i][e]);
                    } else if (typeof values[i][e] === 'string') { // Si es string, l'introdueixo a labels
                        transformed_labels.push(values[i][e]);
                    }
                }
            }
            // Faig push a l'array output, que sera retornat per l'inicialització del PieChart
            output.push(transformed_labels, transformed_values);
            return output;

        } else if (type === 'bar' || type === 'line') {
            const idx = [];
            values[0].forEach((e: any) => {
                typeof e === 'number' ? idx.push('n') : idx.includes('l') ? idx.push('s') : idx.push('l');
            });
            const l_idx = idx.indexOf('l');
            const s_idx = idx.indexOf('s');
            const n_idx = idx.indexOf('n');
            // values = values.map(v => {
            //     v[l_idx].length > 20 ?  v[l_idx] = `${v[l_idx].slice(0, 20)}...` : '';
            //     return v;
            // })
            const l = Array.from(new Set(values.map(v => v[l_idx])));
            const s = s_idx !== -1 ? Array.from(new Set(values.map(v => v[s_idx]))) : null;
            const _output = [[], []];

            _output[0] = l;
            if (isSimple.length === 1) {
                _output[1] = [{
                    data: values.map(v => v[n_idx]),
                    label: isSimple[0]
                }];
            } else {
                let series = [];
                s.forEach((s) => {
                    _output[1].push({data: [], label: s});
                    let serie = values.filter(v => v[s_idx] === s);
                    series.push(serie);
                });
                l.forEach((l) => {
                   // let data_point = null;
                    series.forEach((serie,  i) => {
                        const t = serie.filter(s =>  s[l_idx] === l).map(e => e[n_idx])[0];
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

    initChartOptions(type: string) {
        const options = {
            chartOptions: {},
            chartPlugins: {}
        };
        switch (type) {
            case 'pie':
                options.chartOptions = {
                    responsive: true,
                    maintainAspectRatio: false,
                    devicePixelRatio: 2,
                    legend: {
                        display: true,
                        fontSize: 11,
                        fontStyle: 'normal',
                        position: 'bottom'
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
                        labels : {boxWidth : 10}
                    },
                    tooltips: {
                        callbacks: {
                            title: (tootltipItem, data) => {
                                if (data) return data.datasets[0].label;
                            },
                            label: (tooltipItem, data) => {
                                if (data && tooltipItem)  return data.labels[tooltipItem.index];
                            },
                            afterLabel: (t, d) => {
                                if (t) return t.value;
                            }
                        }
                    },
                    scales: {
                        xAxes: [{
                            // stacked: true,
                            ticks: {
                                callback: (value) => {
                                    if (value) return  value.length > 17 ? (value.substr(0, 17) + '...') : value;
                                },
                                autoSkip: false,
                                maxTicksLimit: 2000,
                                fontSize: 11,
                            },
                            gridLines: {display: false}
                        }], yAxes: [{
                            // stacked: true
                            ticks: {fontSize: 9, min: 0}
                        }]
                    },
                    plugins: {
                        datalabels: {anchor: 'end', align: 'end',}
                    },
                };
                // options.chartPlugins = [];
                break;
            case 'line':
                options.chartOptions = {
                    showLines: true,
                    spanGaps: true,
                    // devicePixelRatio: 2,
                    responsive: true,
                    maintainAspectRatio: false,
                    fill: false,
                    legend: {
                        display: true,
                        position: 'bottom',
                        fontSize: 11,
                        fontStyle: 'normal',
                        labels : {boxWidth : 10}
                    },
                    tooltips: {
                        callbacks: {
                            title: (t, data) => {
                                if (data) return data.datasets[t[0].datasetIndex].label;
                            },
                            label: (t, data) => {
                                if (data && t) return data.labels[t.index];
                            },
                            afterLabel: (t, d) => {
                                if (t) return t.value;
                            }
                        }
                    },
                    scales: {
                        xAxes: [{
                            gridLines: {display: false},
                            ticks: {
                                callback: (value) => {
                                   if (value) return value.length > 30 ? (value.substr(0, 17) + '...') : value;
                                },
                                fontSize: 11, fontStyle: 'bold'
                            }
                        }],
                        yAxes: [
                            {
                                id: 'y-axis-0', position: 'left',
                                ticks: {fontSize: 9, min: 0}
                            }
                        ]
                    },
                    elements: {
                        point: {radius: 2, hitRadius: 5, hoverRadius: 4, hoverBorderWidth: 2},
                        line: {borderWidth: 1}
                    }
                };
                // options.chartPlugins = [];
                break;
        }
        return options;
    }
}
