/**
 * 
 * chart-utils.services.ts: Totes les utilitats dels gràfics.
 * 
 */


import { LinkedDashboardProps } from '@eda/components/eda-panels/eda-blank-panel/link-dashboards/link-dashboard-props';
import { ChartJsConfig } from '../../module/components/eda-panels/eda-blank-panel/panel-charts/chart-configuration-models/chart-js-config';
import { ChartConfig } from '../../module/components/eda-panels/eda-blank-panel/panel-charts/chart-configuration-models/chart-config';
import { Column } from './../../shared/models/dashboard-models/column.model';
import { Injectable } from '@angular/core';
import { EdaChartComponent } from '@eda/components/eda-chart/eda-chart.component';
import * as _ from 'lodash';
import { StyleConfig } from './style-provider.service';

export interface EdaChartType {
    label: string;
    value: string;
    subValue: string;
    icon: string;
    ngIf: boolean;
    tooManyData: boolean;
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
        { label: $localize`:@@chartTypes1:Tabla de Datos`, value: 'table', subValue: 'table', icon: 'pi pi-exclamation-triangle', ngIf: true, tooManyData: true },
        { label: $localize`:@@chartTypes2:Tabla Cruzada`, value: 'crosstable', subValue: 'crosstable', icon: 'pi pi-exclamation-triangle', ngIf: true, tooManyData: true },
        { label: 'KPI', value: 'kpi', subValue: 'kpi', icon: 'pi pi-exclamation-triangle', ngIf: true, tooManyData: true },
        { label: $localize`:@@chartTypesDynamicText:Texto Dinámico`, value: 'dynamicText', subValue: 'dynamicText', icon: 'pi pi-exclamation-triangle', ngIf: true, tooManyData: true },
        { label: $localize`:@@chartTypes15:Velocímetro`, value: 'knob', subValue: 'knob', icon: 'pi pi-exclamation-triangle', ngIf: true, tooManyData: false },
        { label: $localize`:@@chartTypes3:Gráfico de Pastel`, value: 'doughnut', subValue: 'doughnut', icon: 'pi pi-exclamation-triangle', ngIf: true, tooManyData: true },
        { label: $localize`:@@chartTypes4:Gráfico de Área Polar`, value: 'polarArea', subValue: 'polarArea', icon: 'pi pi-exclamation-triangle', ngIf: true, tooManyData: true },
        { label: $localize`:@@chartTypes17:Gráfico Solar`, value: 'sunburst', subValue: 'sunburst', icon: 'pi pi-exclamation-triangle', ngIf: true, tooManyData: true },
        { label: $localize`:@@chartTypes5:Gráfico de Barras`, value: 'bar', subValue: 'bar', icon: 'pi pi-exclamation-triangle', ngIf: true, tooManyData: true },
        { label: $localize`:@@chartTypesHistograma:Histograma`, value: 'bar', subValue: 'histogram', icon: 'pi pi-exclamation-triangle', ngIf: true, tooManyData: true },
        { label: $localize`:@@chartTypes6:Gráfico de Barras Apiladas`, value: 'bar', subValue: 'stackedbar', icon: 'pi pi-exclamation-triangle', ngIf: true, tooManyData: true },
        { label: $localize`:@@chartTypes7:Gráfico de Barras Horizontales`, value: 'bar', subValue: 'horizontalBar', icon: 'pi pi-exclamation-triangle', ngIf: true, tooManyData: true },
        { label: $localize`:@@chartTypesPyramid:Gráfico de Barras Horizontales Contrapuestas`, value: 'bar', subValue: 'pyramid', icon: 'pi pi-exclamation-triangle', ngIf: true, tooManyData: true },
        { label: $localize`:@@chartTypes8:Gráfico de Lineas`, value: 'line', subValue: 'line', icon: 'pi pi-exclamation-triangle', ngIf: true, tooManyData: true },
        { label: $localize`:@@chartTypes18:Gráfico de Áreas`, value: 'line', subValue: 'area', icon: 'pi pi-exclamation-triangle', ngIf: true, tooManyData: true },
        { label: $localize`:@@chartTypes9:Mixto: Barras y lineas`, value: 'bar', subValue: 'barline', icon: 'pi pi-exclamation-triangle', ngIf: true, tooManyData: true },
        { label: $localize`:@@chartTypes12:ParallelSets`, value: 'parallelSets', subValue: 'parallelSets', icon: 'pi pi-exclamation-triangle', ngIf: true, tooManyData: false },
        { label: $localize`:@@chartTypes13:TreeMap`, value: 'treeMap', subValue: 'treeMap', icon: 'pi pi-exclamation-triangle', ngIf: true, tooManyData: false },
        { label: $localize`:@@chartTypes14:ScatterPlot`, value: 'scatterPlot', subValue: 'scatterPlot', icon: 'pi pi-exclamation-triangle', ngIf: true, tooManyData: false },
        { label: $localize`:@@chartTypes16:Funnel`, value: 'funnel', subValue: 'funnel', icon: 'pi pi-exclamation-triangle', ngIf: true, tooManyData: false },
        { label: $localize`:@@chartTypesBubblechart:Bubblechart`, value: 'bubblechart', subValue: 'bubblechart', icon: 'pi pi-exclamation-triangle', ngIf: true, tooManyData: false },
        { label: $localize`:@@chartTypes10:Mapa de coordenadas`, value: 'coordinatesMap', subValue: 'coordinatesMap', icon: 'pi pi-exclamation-triangle', ngIf: true, tooManyData: false },
        { label: $localize`:@@chartTypes11:Mapa de Capas`, value: 'geoJsonMap', subValue: 'geoJsonMap', icon: 'pi pi-exclamation-triangle', ngIf: true, tooManyData: false },
        
    ];

    public filterTypes: FilterType[] = [
        { label: $localize`:@@filters1:IGUAL A (=)`, value: '=', typeof: ['numeric', 'date', 'text'] },
        { label: $localize`:@@filters2:NO IGUAL A (!=)`, value: '!=', typeof: ['numeric', 'date', 'text'] },
        { label: $localize`:@@filters3:MAYOR A (>)`, value: '>', typeof: ['numeric', 'date'] },
        { label: $localize`:@@filters4:MENOR A (<)`, value: '<', typeof: ['numeric', 'date'] },
        { label: $localize`:@@filters5:MAYOR o IGUAL A (>=)`, value: '>=', typeof: ['numeric', 'date'] },
        { label: $localize`:@@filters6:MENOR o IGUAL A (<=)`, value: '<=', typeof: ['numeric', 'date'] },
        { label: $localize`:@@filters7:ENTRE (between)`, value: 'between', typeof: ['numeric', 'date'] },
        { label: $localize`:@@filters8:DENTRO DE (in)`, value: 'in', typeof: ['numeric', 'date', 'text'] },
        { label: $localize`:@@filters9:FUERA DE (not in)`, value: 'not_in', typeof: ['numeric', 'date', 'text'] },
        { label: $localize`:@@filters10:PARECIDO A (like)`, value: 'like', typeof: ['text'] },
        { label: $localize`:@@filters11:NO PARECIDO A (not like)`, value: 'not_like', typeof: ['text'] },
        { label: $localize`:@@filters12:VALORES NO NULOS (not null)`, value: 'not_null', typeof: ['numeric', 'date', 'text'] }
    ];

    public ordenationTypes: OrdenationType[] = [
        { display_name: 'ASC', value: 'Asc', selected: false },
        { display_name: 'DESC', value: 'Desc', selected: false },
        { display_name: 'NO', value: 'No', selected: false }
    ];

    public formatDates: FormatDates[] = [
        { display_name: $localize`:@@dates1:AÑO`, value: 'year', selected: false },
        { display_name: $localize`:@@datesQ:TRIMESTRE`, value: 'quarter', selected: false },
        { display_name: $localize`:@@dates2:MES`, value: 'month', selected: false },
        { display_name: $localize`:@@dates5:SEMANA`, value: 'week', selected: false },
        { display_name: $localize`:@@dates3:DIA`, value: 'day', selected: false },
        { display_name: $localize`:@@dates6:DIA DE LA SEMANA`, value: 'week_day', selected: false },
        { display_name: $localize`:@@dates8:DIA HORA`, value: 'day_hour', selected: false },
        { display_name: $localize`:@@dates9:DIA HORA MINUTO`, value: 'day_hour_minute', selected: false },
        { display_name: $localize`:@@dates7:FECHA COMPLETA`, value: 'timestamp', selected: false },
        { display_name: $localize`:@@dates4:NO`, value: 'No', selected: false }
    ];
    public histoGramRangesTxt: string = $localize`:@@histoGramRangesTxt:Rango`;


    /*
        Funció especifica per transformar les dades per el velocímetre (knob) 
    */
    public transformData4Knob(data: any, dataTypes: string[]): any {
        let values = [];
        let res = { labels: [], values: [] };
        const idx = { label: null, serie: null, numeric: [] };
        if (data.values.length > 0) {
            dataTypes.forEach((e: any, i) => {
                e === 'numeric' ? idx.numeric.push(i) : idx.label != null ? idx.serie = i : idx.label = i;
            });

            data.values.forEach((e: any, i) => {
                idx.numeric.forEach((elem, index) => {
                    values.push(e[idx.numeric[index]]);
                })
            });
            res.values[0] = values.slice(0, 2);
            res.labels = data.labels.slice(0, 2);
        }
        return res;
    }


    /*
        Aquesta funció manipula les dades per donar-los la forma que esperen els grafics ng-chart
        numberOfColumns es el numero de columnes que farem servidr en el histograma
    */
    public transformDataQuery(type: string, subType: string,  values: any[], dataTypes: string[], dataDescription: any, isBarline: boolean, numberOfColumns: number) {

        let output = [];
        const idx = { label: null, serie: null, numeric: [] };

        dataTypes.forEach((e: any, i) => {
            e === 'numeric' ? idx.numeric.push(i) : idx.label != null ? idx.serie = i : idx.label = i;
        });

        const label_idx = idx.label;
        const serie_idx = idx.serie;
        const number_idx = idx.numeric[0];
        if (type === 'doughnut' || type === 'polarArea') {
            const _labels = values.map(v => v[label_idx]);
            const _values = values.map(v => v[number_idx]).filter(elem => elem != null);
            // Faig push a l'array output, que sera retornat per l'inicialització del PieChart
            const _output = [[], []];
            _output[0] =  _output[0] = values.map(v => v[label_idx]);
            _output[1] = [{ data: values.map(v => v[number_idx]) }];
                 
            if (dataDescription?.otherColumns?.length > 0) {
                _output[1][0].label = dataDescription?.otherColumns[0]?.name
            }

            output =  _output;
            //console.log(JSON.stringify(output));

        } else if (['bar' ].includes(type)  && ['pyramid' ].includes(subType) ) {

            const l = Array.from(new Set(values.map(v => v[label_idx])));
            const s = serie_idx !== -1 ? Array.from(new Set(values.map(v => v[serie_idx]))) : null;
            const _output = [[], []];
            _output[0] = l;

          //necesitamos dos series de datos y uno numérico para hacer una pirámide
          if (dataDescription.otherColumns.length === 2 && dataDescription.numericColumns.length === 1) {
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
                        t !== null ? _output[1][i].data.push(t) : _output[1][i].data.push(null);
                    });
                });


                //If >1 numeric series
            }                       

            //para el gráfico de pirámide, cogemos los valores del primer segmento y los multiplicamos por -1.
            let u = _.cloneDeep(_output[1])
            let inverData = []
            for (let i=0;i<u.length;i++) {
                if (i==0) {
                    u[i].data.filter(a => {
                       inverData.push(a * -1)
                    } )
                    u[i].data = inverData
                }
            }

            _output[1] = u
            output =  _output;


        } else if (['bar', 'line', 'area', 'horizontalBar', 'barline', 'histogram'  ].includes(type)  &&  dataTypes.length >  1) {

            const l = Array.from(new Set(values.map(v => v[label_idx])));
            const s = serie_idx !== -1 ? Array.from(new Set(values.map(v => v[serie_idx]))) : null;
            const _output = [[], []];
            _output[0] = l;

            //If one serie
            if (dataDescription.otherColumns.length === 1 && dataDescription.numericColumns.length === 1) {

                _output[0] = values.map(v => v[label_idx]);
                _output[1] = [{
                    data: values.map(v => v[number_idx]),
                    label: dataDescription.otherColumns[0].name
                }];

                //if two series
            } else if (dataDescription.numericColumns.length === 1) {
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
                        t !== null ? _output[1][i].data.push(t) : _output[1][i].data.push(null);
                    });
                });
                //If >1 numeric series
            } else if (!isBarline) {

                dataDescription.numericColumns.forEach((col, i) => {
                    _output[1].push(
                        {
                            data: values.map(v => v[col.index]),
                            label: col.name
                        });
                });
                // >1 numeric series and is mixed bar-line
            } else {

                dataDescription.numericColumns.forEach((col, i) => {
                    let isLine = i === dataDescription.numericColumns.length - 1;
                    _output[1].push(
                        {
                            data: values.map(v => v[col.index]),
                            label: col.name,
                            type: isLine ? 'line' : 'bar',
                            borderWidth: 1,
                            fill: false,
                            order: isLine ? 0 : i + 1,
                            pointRadius: 2,
                            pointHitRadius: 4,
                            pointHoverRadius: 3,
                            pointHoverBorderWidth: 2
                        });
                });

            }                        
            output =  _output;

            /* Histograma  */
        } else if (  ['bar' ].includes(type)    &&  dataTypes.length ==  1 && dataTypes[0]== 'numeric'   ) {
            let distinctNumbers  = Array.from(new Set(values.map(v => v[number_idx]))).filter(element => {
                return element !== null;
              });;
            let allNumbers = values.map(v => v[number_idx]).filter(element => {
                return element !== null;
              });;
            const _output = [[], []];

            let grupos = [];
            let new_data=[];
            let num_cols=0;  
            let salto=0;
            //Si hay nulos van a parte
            const grupo_null =  values.map(v => v[number_idx]).filter(element => {
                return element === null;
              });;

            distinctNumbers = distinctNumbers.sort(function(a,b){
                return a-b
            });
            allNumbers = allNumbers.sort(function(a,b){
                return a-b
            });
            const min = Math.min(...distinctNumbers);
            const max= Math.max(...distinctNumbers);
            let range = (max-min) +1;
            if( grupo_null.length > 0 ){
                range = range+1;
            }

            if(range<30){
                num_cols=range;                 
            }else if(range>=30 && range<=100){
                num_cols=30
            }else {
                num_cols=50;
            }


            //No me llega el numero de columnas fijo el numero de columnas
            if(!isNaN(numberOfColumns) &&  numberOfColumns !== null ){
                num_cols=numberOfColumns;
            } 


           if( this.esEntero(distinctNumbers)){
                salto =  Math.ceil( max/num_cols )  ;
            }else{  
                num_cols<5?num_cols=5:num_cols=num_cols;
                salto =   Math.ceil( max/num_cols * 10) / 10 ;
            }
           
            if(salto == 1 ){
                new_data = this.generateNewDataOneForHistogram(allNumbers,num_cols,min,max , salto);
                grupos =   this.generateGruposOneForHistogram( num_cols,min ); 
            }
            else{
                if(!isNaN(numberOfColumns) &&  numberOfColumns !== null ){
                    num_cols=numberOfColumns;
                } 
                new_data = this.generateNewDataRangeForHistogram(allNumbers,distinctNumbers,num_cols,min,max , salto);
                                                                                                                            /** array de un único elemento. Cuando tenga mas ya veré lo que hago */
                grupos =   this.generateGruposRangeForHistogram( num_cols,min,max , salto,  this.esEntero(distinctNumbers) , dataDescription.query[0].minimumFractionDigits    );
            }
            if(grupo_null.length > 0 ){ 
                new_data.push(grupo_null.length  );
                grupos.push('null');                
            }
            _output[0]=grupos;
            _output[1] = [{
                    data: new_data,
                    label:  this.histoGramRangesTxt + ' - '  + dataDescription.numericColumns[0].name
                }];
 

            output =  _output;
        }

        return output;
    }


    /**
     * 
     * @param allNumbers 
     * @param num_cols 
     * @param min 
     * @param max 
     * @param salto 
     * @returns grupos 
     */
    private   generateGruposRangeForHistogram( num_cols,min,max, salto , esEntero , minimumFractionDigits ):any[] {
        let mi_salto =  0;
        let mi_min = min;
        let grupos = [];
        for(let i=0; i<num_cols; i++){
            mi_salto =  min+((salto*i)+salto)  ;
            if( mi_salto < max){
                if(esEntero){
                    grupos.push(mi_min+" - "+( mi_salto -1));
                }else{
                    grupos.push(mi_min.toFixed( minimumFractionDigits ) +" - "+ (mi_salto-0.1).toFixed( minimumFractionDigits ));
                }
            }else{
                if(Number.isInteger(mi_min)){
                    grupos.push(mi_min+" - "+max);
                }else{
                    grupos.push( mi_min.toFixed(minimumFractionDigits)+" - "+max.toFixed( minimumFractionDigits ));
                }
                // Salgo del bucle
                i = i+num_cols;
            }
 
 
 
           mi_min = mi_salto;

        } 

        return grupos;
    }





    private   generateNewDataRangeForHistogram(allNumbers,distinctNumbers, num_cols,min,max, salto ):any[] {
        let mi_salto =  0;
        let mi_min = min;
        let new_data = [];
       
        for(let i=0; i<num_cols; i++){
            mi_salto =   min+((salto*i)+salto)   ;
            let grupo = [];

            for( let j=0; j < allNumbers.length; j++){
               if(  ( allNumbers[j] >= mi_min && allNumbers[j] < mi_salto)   && 
               ( mi_salto <  max )
               ){            
                    grupo.push(allNumbers[j]);   
               }else  if(  
                        ( allNumbers[j] >= mi_min && allNumbers[j] <= mi_salto)   && 
                        ( mi_salto >=  max )
               ){     
                    grupo.push(allNumbers[j]);   
               }
            }

                  
           new_data.push( grupo.length);
           mi_min = mi_salto;
           if( mi_min >= max){
            // Salgo
            i = num_cols;
           }

        } 

        return new_data;
    }


    private  generateNewDataOneForHistogram(allNumbers,num_cols,min,max, salto ):any[] {
        let mi_salto =  0;
        let new_data = [];
        for(let i=0; i<num_cols; i++){
            mi_salto =    min+(salto*i);
            let grupo = [];
            for( let j=0; j < allNumbers.length; j++){
               if( allNumbers[j]== mi_salto)  {            
                    grupo.push(allNumbers[j]);   
               }
            }
           new_data.push( grupo.length);
        } 
        return new_data;
    }



    private  generateGruposOneForHistogram(num_cols,min ):any[] {
        let grupos = [];
        for(let i=min; i<=num_cols; i++){
            grupos.push(i);      
        } 
       
        return grupos;
    }


/** Ajuda per saber si un númeor es enter o no.  */
    private esEntero(numeros:number[]):boolean{
        let res = true;
        numeros.forEach( 
            (numero)=> {
            if ( isNaN(numero)){
                res = false;
            }
            if(numero%1!=0){
                res = false;
            }
        });
        return res;
    }



    public uniqueLabels(labels: Array<string>) {
        const uniqueLabels = [];
        for (let i = 0; i < labels.length; i++) {
            if (uniqueLabels.includes(labels[i])) { 
                uniqueLabels.push(`${labels[i]}_${i}`);
            } else {
                uniqueLabels.push(labels[i])
            }
        }
        return uniqueLabels;
    }

    public transformDataQueryForTable(noRepetitions: boolean, labels: any[], values: any[]) {
        
        if (noRepetitions !== true) {

            const output = [];
            values = values.filter(row => !row.every(element => element === null));
            // Load the Table for a preview
            for (let i = 0; i < values.length; i += 1) {
                const obj = {};
                for (let e = 0; e < values[i].length; e += 1) {
                    obj[labels[e]] = values[i][e];
                }
                output.push(obj);
            }
            return output;

        } else {

            const output = [];
            values = values.filter(row => !row.every(element => element === null));
            // ESTO SE HACE PARA EVITAR REPETIDOS EN LA TABLA. SI UN CAMPO TIENE UNA COLUMNA QUE SE REPITE 
            let first  = _.cloneDeep(values[0]);
            for (let i = 0; i < values.length; i += 1) {
                const obj = [];
                if(i == 0){   
                    for (let e = 0; e < values[i].length; e += 1) {
                            obj[labels[e]] = values[i][e];
                        }
                }else{
                    for (let e = 0; e < values[i].length; e += 1) {
                        if (values[i][e] === first[e]    &&  isNaN(values[i][e]) ) {
                            obj[labels[e]] = "";   // AQUI SE SUSTITUYEN LOS REPETIDOS POR UNA CADENA EN BLANCO
                        } else {
                            obj[labels[e]] = values[i][e];
                        }
                        first[e]  =  values[i][e]; //AQUI SE SUTITUYE EL PRIMER VALOR
                        }
                }
                output.push(obj);   
            }
                
            return output;

        }
        
        
    }

    /**
     * Takes current query and returs not allowedCharts
     * @param currentQuery 
     * @return [] notAllowed chart types
     */
    public getNotAllowedCharts(dataDescription: any, query: any): any[] {
        
        let notAllowed =
            [
                'table', 'crosstable', 'kpi','dynamicText', 'geoJsonMap', 'coordinatesMap',
                'doughnut', 'polarArea', 'line', 'area', 'bar', 'histogram',  'funnel', 'bubblechart', 
                'horizontalBar', 'barline', 'stackedbar', 'parallelSets', 'treeMap', 'scatterPlot', 'knob' ,
                'pyramid'
            ];

        
        //table (at least one column)
        if (dataDescription.totalColumns > 0) notAllowed.splice(notAllowed.indexOf('table'), 1);

        // KPI (only one numeric column)
        if (dataDescription.totalColumns === 1 && dataDescription.numericColumns.length === 1) {
            notAllowed.splice(notAllowed.indexOf('kpi'), 1);
        }
        
        // DynamicText (only one numeric column)
        if (dataDescription.totalColumns === 1  && dataDescription.otherColumns.length === 1 ) {
            notAllowed.splice(notAllowed.indexOf('dynamicText'), 1);
        }
        // Pie && Polar (Only one numeric column and one char/date column)
        if (dataDescription.totalColumns === 2 && dataDescription.numericColumns.length === 1) {
            notAllowed.splice(notAllowed.indexOf('doughnut'), 1);
            notAllowed.splice(notAllowed.indexOf('polarArea'), 1);
        }

        // barchart i horizontalbar  poden ser grafics normals o poden ser histograms....
        if (dataDescription.numericColumns.length >= 1 && dataDescription.totalColumns > 1 && dataDescription.otherColumns.length < 2
            || dataDescription.numericColumns.length === 1 && dataDescription.totalColumns > 1 && dataDescription.totalColumns < 4  /* && aggregation */) {
            notAllowed.splice(notAllowed.indexOf('bar'), 1);
            notAllowed.splice(notAllowed.indexOf('horizontalBar'), 1);
            notAllowed.splice(notAllowed.indexOf('line'), 1);
            notAllowed.splice(notAllowed.indexOf('area'), 1);
            notAllowed.splice(notAllowed.indexOf('stackedbar'), 1);
        }
        // això es per els histogrames.....
        if (dataDescription.numericColumns.length == 1 && dataDescription.totalColumns == 1 ) {
            notAllowed.splice(notAllowed.indexOf('histogram'), 1);
        }


        if (dataDescription.numericColumns.length > 1 && dataDescription.otherColumns.length < 2) {
            notAllowed.splice(notAllowed.indexOf('barline'), 1);
            const idx = notAllowed.indexOf('stackedbar');
            if (idx >= 0) {
                notAllowed.splice(notAllowed.indexOf('stackedbar'), 1);
            }

        }
        // Crosstable (At least three columns, one numeric)
        if (dataDescription.totalColumns > 2 && dataDescription.numericColumns.length > 0 &&
            dataDescription.totalColumns - dataDescription.numericColumns.length > 1) {
            notAllowed.splice(notAllowed.indexOf('crosstable'), 1);
        }

        //Coordinates map Map (two coordinates and two aditional fields at max)
        if (dataDescription.coordinateColumns === 2 && dataDescription.totalColumns < 5) {
            notAllowed.splice(notAllowed.indexOf('coordinatesMap'), 1);
        }

        //GeoJson Map 
        if (dataDescription.numericColumns.length === 1
            && dataDescription.query.filter(elem => elem.linkedMap).length > 0
            && dataDescription.totalColumns === 2) {
            notAllowed.splice(notAllowed.indexOf('geoJsonMap'), 1);
        }

        //parallelSets
        if (dataDescription.numericColumns.length === 1 && dataDescription.otherColumns.length > 1) {
            notAllowed.splice(notAllowed.indexOf('parallelSets'), 1);
        }

        //funnel
        if (dataDescription.numericColumns.length === 1 && dataDescription.otherColumns.length == 1) {
            notAllowed.splice(notAllowed.indexOf('funnel'), 1);
        }

        //treeMap
        if (dataDescription.numericColumns.length === 1 && dataDescription.otherColumns.length > 0) {
            notAllowed.splice(notAllowed.indexOf('treeMap'), 1);
        }

        //BubbleChart
        if (dataDescription.numericColumns.length === 1 && dataDescription.otherColumns.length == 1) {
            notAllowed.splice(notAllowed.indexOf('bubblechart'), 1);
        }

        //scatterPlot
        if (dataDescription.numericColumns.length >= 2 && dataDescription.numericColumns.length <= 3
            && dataDescription.otherColumns.length < 3 && dataDescription.otherColumns.length > 0) {
            notAllowed.splice(notAllowed.indexOf('scatterPlot'), 1);
        }

        //knob
        if ((dataDescription.numericColumns.length <= 2 && dataDescription.numericColumns.length > 0
            && dataDescription.otherColumns.length === 0)
            ||
            // si sento un dataset cojo los dos primeros
            // del estilo:
            //  var1 - 10
            //  var 2 - 100
            (dataDescription.numericColumns.length === 1 && dataDescription.otherColumns.length === 1)
        ) {
            notAllowed.splice(notAllowed.indexOf('knob'), 1);
        }

        //pyramid
        if (dataDescription.totalColumns === 3 && dataDescription.numericColumns.length === 1
            ) {
            notAllowed.splice(notAllowed.indexOf('pyramid'), 1);
        }
        return notAllowed;

    }


    /**
     * Check the resultset size for every chart and return the ones you can not have because you have too many data
     * @param dataSize  
     * @return [] notAllowed chart types
     */
    public getTooManyDataForCharts(dataSize: number): any[] {
        let notAllowed =
            ['table', 'crosstable', 'kpi', 'dynamicText', 'knob', 'doughnut', 'polarArea', 'line', 'bar','histogram',
                'horizontalBar', 'barline', 'area', 'geoJsonMap', 'coordinateMap'];

        //table (at least one column)
        notAllowed.splice(notAllowed.indexOf('table'), 1);
        // Crosstable (At least three columns, one numeric)
        notAllowed.splice(notAllowed.indexOf('crosstable'), 1);

        notAllowed.splice(notAllowed.indexOf('geoJsonMap'), 1);
        // Crosstable (At least three columns, one numeric)
        notAllowed.splice(notAllowed.indexOf('coordinateMap'), 1);

        // KPI (only one numeric column)

        if (dataSize === 1) {
            notAllowed.splice(notAllowed.indexOf('kpi'), 1);
            notAllowed.splice(notAllowed.indexOf('dynamicText'), 1);
        }
        // Knomb (only one or two  numeric column)
        // only 2 values
        if (dataSize <= 2) {
            notAllowed.splice(notAllowed.indexOf('knob'), 1);
        }
        // Pie && Polar (Only one numeric column and one char/date column)
        if (dataSize < 50) {
            notAllowed.splice(notAllowed.indexOf('doughnut'), 1);
            notAllowed.splice(notAllowed.indexOf('polarArea'), 1);
        }
        // Bar && Line (case 1: multiple numeric series in one text column, case 2: multiple series in one numeric column)
        if (dataSize < 2500) {
            notAllowed.splice(notAllowed.indexOf('bar'), 1);
            notAllowed.splice(notAllowed.indexOf('horizontalBar'), 1);
        }
        // Bar && Line (case 1: multiple numeric series in one text column, case 2: multiple series in one numeric column)
        if (dataSize < 100000) {
            notAllowed.splice(notAllowed.indexOf('line'), 1);
            notAllowed.splice(notAllowed.indexOf('area'), 1);
            notAllowed.splice(notAllowed.indexOf('barline'), 1);
        }
        //Histogram as many as you want.
        notAllowed.splice(notAllowed.indexOf('histogram'), 1);

        return notAllowed;
    }

    /**
     * Check if actual config is compatible with actual chart and returns a valid color configuration
     * @param currentChartype 
     * @param layout 
     */
    public recoverChartColors(currentChartype: string, layout: ChartConfig) {
        const config = layout.getConfig();
        if (config && (<ChartJsConfig>config).chartType === currentChartype) {
            return this.mergeColors(layout)
        } else {
            return this.generateColors(currentChartype);
        }
    }

    public generateColors(type: string) {
        switch (type) {
            case 'doughnut': return EdaChartComponent.generatePiecolors();
            case 'polarArea': return EdaChartComponent.generatePiecolors();
            case 'bar': return EdaChartComponent.generateChartColors();
            case 'line': return EdaChartComponent.generateChartColors();
            case 'horizontalBar': return EdaChartComponent.generateChartColors();
            case 'histogram': return EdaChartComponent.generateChartColors();
        }
    }

    public mergeColors(layout: ChartConfig) {


        const config = layout.getConfig();
        if (!(<ChartJsConfig>config).colors) {
            return this.generateColors((<ChartJsConfig>config).chartType);
        }
        if ((<ChartJsConfig>config).chartType === 'doughnut' || (<ChartJsConfig>config).chartType === 'polarArea') {
            let edaColors = EdaChartComponent.generatePiecolors();

            (<ChartJsConfig>config).colors[0]['backgroundColor'].forEach((element, i) => {
                edaColors[0].backgroundColor[i] = element;
            });

            (<ChartJsConfig>config).colors[0]['backgroundColor'] = edaColors[0].backgroundColor;

        }
        return (<ChartJsConfig>config).colors;
    }

    public describeData(currentQuery: any, labels: any) {
        let names = this.pretifyLabels(currentQuery, labels);
        let out = { numericColumns: [], coordinateColumns: 0, otherColumns: [], totalColumns: 0, query: currentQuery }
        currentQuery.forEach((col, i) => {
            if (col.column_type === 'numeric') {
                out.numericColumns.push({ name: names[i], index: i });
            } else if (col.column_type === 'coordinate' && [0, 1].includes(i)) {
                out.coordinateColumns += 1;
            } else {
                out.otherColumns.push({ name: names[i], index: i });
            }
            out.totalColumns += 1;
        });
        return out;
    }

    public describeData4Knob(currentQuery: any, chartData: any) {
        let out = { numericColumns: [], coordinateColumns: 0, otherColumns: [], totalColumns: 0, query: currentQuery }
        chartData.values.forEach((element: any[]) => {
            element.forEach((el, indx) => {
                if (!isNaN(el)) {
                    out.numericColumns.push({ name: chartData.labels[indx], index: indx });
                }
            });
            out.totalColumns += 1;
        });
        return out;
    }


    public pretifyLabels(columns: Array<Column>, labels: Array<string>) {
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

    public get10thPower = (num) => {
        let absNum = Math.abs(num)
        let power = 0;
        while (absNum >= 10) {
            absNum = Math.floor(absNum / 10);
            power++;
        }
        return power;
    }

    public format10thPowers = (num) => {

        const _10thPower = this.get10thPower(num);
        let result = '';

        if (_10thPower >= 6) {
            let reducedNum = (num / Math.pow(10, 6)).toLocaleString('de-DE', { style: 'decimal', maximumFractionDigits: 1 , minimumFractionDigits:0});
            result = reducedNum + 'M'
        }

        else if (_10thPower >= 3) {
            let reducedNum = (num / Math.pow(10, 3)).toLocaleString('de-DE', { style: 'decimal', maximumFractionDigits: 1,  minimumFractionDigits:0 });
            result = reducedNum + 'K'
        }

        else {
            result = num.toLocaleString('de-DE', { style: 'decimal', maximumFractionDigits: 2,  minimumFractionDigits:0 });
        }
        return result
    }

    getMinMax(data: any) {

        let min = Infinity;
        let max = -Infinity;

        data[1].forEach(set => {

            set.data.forEach(value => {
                if (value !== null && value !== undefined) {
                    if (parseFloat(value) > max) max = parseFloat(value);
                    if (parseFloat(value) < min) min = parseFloat(value);
                }
            });

        });


        let min_om = Math.pow(10, Math.floor(Math.log10(Math.abs(min))));
        let min_sign = min < 0;
        min = Math.ceil(Math.abs(min) / min_om) * min_om;


        let max_om = Math.pow(10, Math.floor(Math.log10(Math.abs(max))));
        let max_resto = Math.pow(10, Math.floor(Math.log10(Math.abs(max % max_om))));
        max_resto==0?max_resto=1:max_resto=max_resto;

    

        // Metode original del pau que arodonia al seguent ordre de magnitud. 
        // Pero si el maxim es 10.000  estableix 20.000
        // Ho intento ajustar una mica.
        //max = Math.ceil(max / max_om) * max_om;
        
        // si estic a valors petit poso el max a 5 o a 10
        if(max_om == 1){
           if(max <1){
                max = 1;
           } else if( max < 3){
               max = 3;
           } else if( max < 5){
                max = 5;
           }else{
               max = 10;
           }
        }else{
            // Ara ho arrodoneix a un mumero mes proper al maxim.al centenar per sobre de  la resta
            if(  ( (max % max_om) /max_om) < 0.5 ){

                // Si tinc motl marge fins a la seguent unitat de magnitut ho arrodoneixo mes paropor
                max = max - ( max % max_om) + 
            ( 2* (  Math.ceil(  ( max % max_om) / max_resto )  *  max_resto) );
            }else{
                // Si no ho arodoneixo a la propera unitat de magnitu
                max = Math.ceil(max / max_om) * max_om;
            }
        }
/*
        if (min < max) {
            if (min < max * 0.25) min = max * 0.25;
        } else {
            if (max < min * 0.25) max = min * 0.25;

        }
*/
        if (min_sign) min = -min;
        min = min > 0 && max > 0 ? 0 : min;
        return { min: min ? min : 0, max: max ? max : 0 }

    }

    public comparePeriods = (data, query) => {


        let types = query.map(field => field.column_type);
        let dateIndex = types.indexOf('date');
        let newRows = [];

        const format = query.filter((_, i) => i === dateIndex)[0].format;

        data.values.forEach(row => {

            let currentDate = row[dateIndex].slice(-2); /**01, 02, 03 ...etc. */
            let currentHead = row[dateIndex].slice(0, -3); /** 2020-01, 2020-02 ...etc. */

            let newRow = [];

            row.forEach((field, i) => {

                if (i === dateIndex) {
                    newRow.push(currentDate);
                    newRow.push(currentHead);
                } else {
                    newRow.push(field);
                }
            });
            newRows.push(newRow);

        });
        return newRows.sort(function (a, b) {
            if (a[dateIndex] > b[dateIndex]) {
                return 1;
            }
            if (a[dateIndex] < b[dateIndex]) {
                return -1;
            }
            // a must be equal to b
            return 0;
        });

    }

    public getTrend = (values: any) => {

        let x_values = values.data.map((v, y) => y);
        let y_values = this.findLineByLeastSquares(x_values, values.data)[1];

        let trend = _.cloneDeep(values);
        let label = $localize`:@@addtrend:Tendencia`;
        trend.label = `${label} ${trend.label}`;
        trend.data = y_values;

        return trend;
    }

    public findLineByLeastSquares = (values_x, values_y) => {
        let sum_x = 0;
        let sum_y = 0;
        let sum_xy = 0;
        let sum_xx = 0;
        let count = 0;

        /*
         * We'll use those variables for faster read/write access.
         */
        let x = 0;
        let y = 0;
        let values_length = values_x.length;

        if (values_length != values_y.length) {
            throw new Error('The parameters values_x and values_y need to have same size!');
        }

        /*
         * Nothing to do.
         */
        if (values_length === 0) {
            return [[], []];
        }

        /*
         * Calculate the sum for each of the parts necessary.
         */
        for (let v = 0; v < values_length; v++) {
            x = values_x[v];
            y = values_y[v];
            sum_x += x;
            sum_y += y;
            sum_xx += x * x;
            sum_xy += x * y;
            count++;
        }

        /*
         * Calculate m and b for the formular:
         * y = x * m + b
         */
        let m = (count * sum_xy - sum_x * sum_y) / (count * sum_xx - sum_x * sum_x);
        let b = (sum_y / count) - (m * sum_x) / count;

        /*
         * We will make the x and y result line now
         */
        let result_values_x = [];
        let result_values_y = [];

        for (let v = 0; v < values_length; v++) {
            x = values_x[v];
            y = x * m + b;
            result_values_x.push(x);
            result_values_y.push(y);
        }

        return [result_values_x, result_values_y];
    }



    /** inicialitza les opcions dels gràfics. Aqui es on posem tots els detalls del gràfic. */
    public initChartOptions(type: string, numericColumn: string,
        labelColum: any[], manySeries: boolean, stacked: boolean, size: any,
        linkedDashboard: LinkedDashboardProps, minMax: { min: number, max: number }
        , styles: StyleConfig, showLabels:boolean, showLabelsPercent:boolean, numberOfColumns:number, chartSubType:string): { chartOptions: any } {

        const t = $localize`:@@linkedTo:Vinculado con`;
        const linked = linkedDashboard ? `${labelColum[0].name} ${t} ${linkedDashboard.dashboardName}` : '';
        let options = {
            chartOptions: {},
        };

        // si la pantalla es petita faig la lletra mes petita
        let variador = 0;
        if (window.innerWidth < 1500) {
            variador = -2;
        }
        if (window.innerWidth < 1100) {
            variador = -4;
        }
        const edaFontSize = manySeries ? 10 + variador : 12 + variador + styles.fontSize;

        const edafontStyle = 'normal';
        const edaPieLegend = {
            display: true,
            fontSize: edaFontSize,
            fontStyle: edafontStyle,
            position: 'bottom',
            labels: {
                fontSize: edaFontSize,
                fontFamily: styles.fontFamily,
                fontColor: styles.fontColor,
                boxWidth: manySeries ? 8 + variador : 10 + variador,
                padding: manySeries ? 4 + variador : 8 + variador
            }
        };
        const edaBarLineLegend = {
            display: true,
            fontSize: edaFontSize,
            fontStyle: edafontStyle,
            position: 'bottom',
            labels: {
                fontSize: edaFontSize,
                fontFamily: styles.fontFamily,
                fontColor: styles.fontColor,
                boxWidth: manySeries ? 8 + variador : 10 + variador,
                padding: manySeries ? 4 + variador : 8 + variador,
                filter: function (legendItem, data) {
                    return legendItem.datasetIndex < 20
                },
            }
        };

        const maxTicksLimit = size.width < 200 ? 5 + variador : size.width < 400 ? 12 + variador : size.width < 600 ? 25 + variador : 40 + variador;
        const maxTicksLimitHorizontal = size.height < 200 ? 5 + variador : size.height < 400 ? 12 + variador : size.height < 600 ? 25 + variador : 40 + variador;
        const maxTicksLimitY = size.height < 100 ? 1  : size.height < 150 ? 2 : size.height < 200 ? 3 :  size.height < 300 ? 4 : 5;

        /** Defineixo les propietats en funció del tipus de gràfic. */
        let dataLabelsObjt={}

        switch (type) {
            case 'doughnut':
            case 'polarArea':
                  if(showLabels || showLabelsPercent ){
                            dataLabelsObjt =  {
                                backgroundColor: function(context) {
                                return context.dataset.backgroundColor;
                                },
                                borderColor: 'white',
                                borderRadius: 25,
                                borderWidth: 2,
                                color: 'white',
                                display: function(context) {
                                    const chartWidth = context.chart.width;
                                    const realData = context.dataset.data;
                                    const total = realData.reduce((a, b) => {
                                        return a + b;
                                    }, 0);
                                    const elem = realData[context.dataIndex];
                                    const percentage = elem / total * 100;
                                    //console.log( percentage > 10 );
                                    if( chartWidth < 200){
                                        return  percentage > 8 ;
                                    }else{
                                        return  percentage > 3; /** Mostro la etiqueta si es mes que el 10 % del total  */
                                    }
                              },
                                font: {
                                weight: 'bold',
                                size:  edaFontSize  ,
                                },
                                padding: 6,
                                formatter: (value,ctx) => {
                                    const datapoints = ctx.dataset.data.map( x => x===''?0:x).map( x => x===undefined?0:x);
                                    const total = datapoints.reduce((total, datapoint) => total + datapoint, 0)
                                    const percentage = value / total * 100
                                    let res = '';
                                    if( showLabels && showLabelsPercent){
                                        res = parseFloat(value).toLocaleString('de-DE', { maximumFractionDigits: 6 })  ;
                                        if(res == 'NaN'){ res = '';}
                                        res = res  + ' - ' + percentage.toLocaleString('de-DE', { maximumFractionDigits: 1 })    + ' %'  ;
                                    }else if(showLabels && !showLabelsPercent){
                                        res = parseFloat(value).toLocaleString('de-DE', { maximumFractionDigits: 6 })  ;
                                    }else if(!showLabels && showLabelsPercent){
                                        res = percentage.toLocaleString('de-DE', { maximumFractionDigits: 1 })    + ' %'   ;
                                    }
                                    return   res;
                                }

                            }
                }else{
                        dataLabelsObjt =   { display: false }
                }
                options.chartOptions = {
                    animation: {
                        duration: 2000,
                        animateScale: true,
                        animateRotate: true
                    },
                    
                    responsive: true,
                    maintainAspectRatio: false,
                    devicePixelRatio: 2,
                   

                   
                    plugins: {
                        datalabels: dataLabelsObjt, 
                        tooltip: {
                            callbacks: {
                                title: (context) => {
                                    return  context[0].dataset.label;
                                },
                                label: (context) => {
                                    let label = context.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    label += parseFloat(context.raw).toLocaleString('de-DE', { maximumFractionDigits: 6 }) ;
                                    const total = context.dataset.data.reduce((total, datapoint) => total + datapoint, 0)
                                    const percentage = context.raw / total * 100;
                                    label += ' ' + percentage.toLocaleString('de-DE', { maximumFractionDigits: 1 }) + ' %' ;
                                    return label;
                                },
                                footer: () => { return linked },
                                afterLabel: (t, d) => {  }
                            }
                        },
                        legend: edaPieLegend
                    },


                };


                break;
            case 'bar':
                if(chartSubType!=='horizontalBar' && chartSubType!=='pyramid'){
                    if(showLabels || showLabelsPercent ){ /** si mostro els datalabels els configuro */
                        dataLabelsObjt =  {
                            anchor: 'end',
                            align: 'top',
                            display: 'auto',
                            color: function(context) {
                                return context.dataset.backgroundColor;
                                },
                            font: {
                            weight: 'bold',
                            size:  edaFontSize  ,
                            },
                            padding: 10,

                            formatter: (value,ctx) => {
                                
                                const datapoints = ctx.dataset.data.map( x => x===''?0:x).map( x => x===undefined?0:x);
                                const total = datapoints.reduce((total, datapoint) => total +  datapoint , 0);

                                const percentage =  isNaN(value)?0:value  / total * 100
                                let res = '';
                                if( showLabels && showLabelsPercent){
                                    res = parseFloat(value).toLocaleString('de-DE', { maximumFractionDigits: 6 })  ;
                                    if(res == 'NaN'){ res = '';}
                                    res = res  + ' - ' + percentage.toLocaleString('de-DE', { maximumFractionDigits: 1 })    + ' %'  ;
                                }else if(showLabels && !showLabelsPercent){
                                    res = parseFloat(value).toLocaleString('de-DE', { maximumFractionDigits: 6 })  ;
                                    if(res == 'NaN'){ res = '';}
                                }else if(!showLabels && showLabelsPercent){
                                    res = percentage.toLocaleString('de-DE', { maximumFractionDigits: 1 })    + ' %'   ;
                                }
                                return   res;
                            }

                        }
                    }else{
                            dataLabelsObjt =   { display: false }
                        
                    }      

                    options.chartOptions = {
                        animation: {
                            duration: 3000
                        },
                        
                        responsive: true,
                        maintainAspectRatio: false,
                        devicePixelRatio: 2,
                    
                        
                        tooltips: {
                            callbacks: {
                                title: (tooltipItem, data) => {
                                    if (data && tooltipItem)
                                        return ` ${labelColum[0].name} : ${data.labels[tooltipItem[0].index]}`;
                                },
                                label: (tooltipItem, data) => {
                                    if (data && tooltipItem) {
                                        const realData = data.datasets[tooltipItem.datasetIndex].data;
                                        const total = realData.reduce((a, b) => {
                                            if(isNaN(a)){a=0;}
                                            if(isNaN(b)){b=0;}
                                            return a + b;
                                        }, 0);
                                        const elem = data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index];
                                        const percentage = elem / total * 100;
                                        return ` ${data.labels[tooltipItem.index]}, ${numericColumn} : ${parseFloat(elem).toLocaleString('de-DE', { maximumFractionDigits: 6 })} (${percentage.toFixed(2)}%)`;
                                    }

                                },

                                afterLabel: (t, d) => {
                                },
                                footer: () => { return linked },
                            }
                        },
                    
                        scales: {
                            x: {
                                stacked: stacked || false,
                                grid: { display: false },
                                
                                ticks: {
                                    callback: function(val, index) {
                                        if (this.getLabelForValue(val))
                                        return  this.getLabelForValue(val).length > 30 ? (this.getLabelForValue(val).substr(0, 17) + '...') : this.getLabelForValue(val);
                                    },
                                    fontSize: edaFontSize, fontStyle: edafontStyle,
                                    fontFamily: styles.fontFamily,
                                    fontColor: styles.fontColor,
                                    maxTicksLimit: maxTicksLimit,
                                    autoSkip: true,
                                }
                            },
                            
                            y: {
                                stacked: stacked || false,
                                grid: {
                                    drawBorder: false,
                                },
                                display: true,
                                ticks: {
                                    autoSkip: true,
                                    maxTicksLimit: maxTicksLimitY,
                                    beginAtZero: true,
                                    callback: (value) => {
                                        if (value)
                                            return isNaN(value) ? value : this.format10thPowers(parseFloat(value)) //.toLocaleString('de-DE', { maximumFractionDigits: 6 });
                                    },
                                    fontSize: edaFontSize,
                                    fontFamily: styles.fontFamily,
                                    fontColor: styles.fontColor,
                                }
                            }
                            
                        },
                    
                        plugins: {
                            datalabels: dataLabelsObjt,
                            legend: edaBarLineLegend
                        },
                    
                    };
                }else{
                    // horizontalBar Since chart.js 3 there is no more horizontal bar. Its just  barchart with horizonal axis
                    // buscar en chart.js las opciones 
                    if(showLabels || showLabelsPercent ){
                        /** si haig de mostrar les etiquetes ho configuro */
                        dataLabelsObjt =  {
                            anchor: 'end',
                            align: 'start',
                            display: function(context) {
                                const chartWidth = context.chart.width;
                                const realData = context.dataset.data;
                                const total = realData.reduce((a, b) => {
                                    if( a> b){
                                        return a;
                                    }else{
                                        return b;
                                    }
                                }, 0);
                                const elem = realData[context.dataIndex];
                                const percentage = elem / total * 100;
                                if(chartWidth < 200){
                                    return  percentage > 30 ; /** Mostro la etiqueta si es mes que el 30 % del total  */
                                }else{
                                    return  percentage > 10 ; /** Mostro la etiqueta si es mes que el 30 % del total  */
                                }
                          },
                            color: 'white',
                            font: {
                                weight: 'bold',
                                size:  edaFontSize  
                            },
                            formatter: (value,ctx) => {
                                const datapoints = ctx.dataset.data.map( x => x===''?0:x).map( x => x===undefined?0:x);
                                const total = datapoints.reduce((total, datapoint) => total + datapoint, 0)
                                const percentage = value / total * 100
                                let res = '';
                                if( showLabels && showLabelsPercent){
                                    res = parseFloat(value).toLocaleString('de-DE', { maximumFractionDigits: 6 })  ;
                                    if(res == 'NaN'){ res = '';}
                                    res = res  + ' - ' + percentage.toLocaleString('de-DE', { maximumFractionDigits: 1 })    + ' %'  ;
                                }else if(showLabels && !showLabelsPercent){
                                    res = parseFloat(value).toLocaleString('de-DE', { maximumFractionDigits: 6 })  ;
                                }else if(!showLabels && showLabelsPercent){
                                    res = percentage.toLocaleString('de-DE', { maximumFractionDigits: 1 })    + ' %'   ;
                                }
                                return   res;
                            },

                            
                        }
                    }else{
                            dataLabelsObjt =   { display: false }
                        
                    }
    
                    options.chartOptions  = {
                        animation: {
                            duration: 3000
                        },
                        indexAxis: 'y',
                        responsive: true,
                        maintainAspectRatio: false,
                        devicePixelRatio: 2,
                        legend: edaBarLineLegend,
                        tooltips: {
                            mode: 'nearest',
                            callbacks: {
                                title: (tooltipItem, data) => {
                                    if (data && tooltipItem)
                                        return ` ${labelColum[0].name} : ${data.labels[tooltipItem[0].index]}`;
                                },
    
                                label: (tooltipItem, data) => {
                                    if (data && tooltipItem) {
                                        const realData = data.datasets[0].data;
                                        const total = realData.reduce((a, b) => {
                                            return a + b;
                                        }, 0);
                                        const elem = data.datasets[0].data[tooltipItem.index];
                                        const percentage = elem / total * 100;
                                        return ` ${data.labels[tooltipItem.index]}, ${numericColumn} : ${parseFloat(elem).toLocaleString('de-DE', { maximumFractionDigits: 6 })} (${percentage.toFixed(2)}%)`;
                                    }
    
                                },
    
                                footer: () => { return linked },
                            }
    
                        },
                        scales: {
                            x: {
                                grid: {
                                    drawBorder: false,
                                    display: true
                                },
                                ticks: {
                                    callback: (value) => {
                                       
                                        if (value)
                                            return isNaN(value) ? value : this.format10thPowers(parseFloat(value))// parseFloat(value).toLocaleString('de-DE', { maximumFractionDigits: 6 });
                                    },
                                    autoSkip: true,
                                    maxTicksLimit: maxTicksLimitHorizontal,
                                    fontSize: edaFontSize,
                                    fontStyle: edafontStyle,
                                    fontFamily: styles.fontFamily,
                                    fontColor: styles.fontColor,
                                    beginAtZero: true
                                }
                            },
                            y: {
                                grid: { display: false },
                                ticks: {
                                    /*
                                    callback: (value) => {
                                        console.log(value);
                                        if (value)
                                            return value.length > 30 ? (value.substr(0, 17) + '...') : value;
                                    },
                                    */
                                    fontSize: edaFontSize,
                                    fontFamily: styles.fontFamily,
                                    fontColor: styles.fontColor,
                                    beginAtZero: true,
                                    // maxTicksLimit: maxTicksLimitHorizontal,
                                    autoSkip: true
                                }
                            }
                        },
                   
                        plugins: {
                            datalabels: dataLabelsObjt,
                            legend: edaBarLineLegend
                        },
                      
                    };

                    if (chartSubType=='pyramid') {
                        //modificamos los valores del eje x para que sean positivos a la vista
                        (<any>options.chartOptions).scales.y.stacked = true;
                        (<any>options.chartOptions).scales.x.ticks.callback = (value, index, ticks) => {
                            
                            if  (value < 0)  {
                                value = value * -1;
                            }

                            return value;
                        }
                    }
                }
                break;





            case 'line':
                if(showLabels || showLabelsPercent ){

                    dataLabelsObjt = {
                        backgroundColor: function(context) {
                          return context.dataset.backgroundColor;
                        },
                        anchor: 'end',
                        align: 'top',
                        display: function(context) {
                            const chartWidth = context.chart.width;
                            const realData = context.dataset.data;

                            if (( (chartWidth/10)  / realData.length  ) < 0.6 ){
                                return context.dataIndex%5==0  // devuelvo uno de cada 5
                            }else if (( (chartWidth/10)  / realData.length  ) < 1.5 ){
                                return context.dataIndex%2==0 // devuelvo uno de cada 2
                            }else{
                                return true; // devuelvo todas 
                            }

                           
                      },

                        borderRadius: 4,
                        color: 'white',
                        font: {
                          weight: 'bold',
                          size:  edaFontSize-2  
                        },
                        formatter: (value,ctx) => {
                            const datapoints = ctx.dataset.data.map( x => x===''?0:x).map( x => x===undefined?0:x);
                            const total = datapoints.reduce((total, datapoint) => total + datapoint, 0)
                            const percentage = value / total * 100
                            let res = '';
                            if( showLabels && showLabelsPercent){
                                res = parseFloat(value).toLocaleString('de-DE', { maximumFractionDigits: 6 })  ;
                                if(res == 'NaN'){ res = '';}
                                res = res  + ' - ' + percentage.toLocaleString('de-DE', { maximumFractionDigits: 1 })    + ' %'  ;
                            }else if(showLabels && !showLabelsPercent){
                                res = parseFloat(value).toLocaleString('de-DE', { maximumFractionDigits: 6 })  ;
                            }else if(!showLabels && showLabelsPercent){
                                res = percentage.toLocaleString('de-DE', { maximumFractionDigits: 1 })    + ' %'   ;
                            }
                            return   res;
                        }

                      }



                }else{
                        dataLabelsObjt =   { display: false }
                    
                }

                options.chartOptions = {
                    animation: {
                        duration: 3000
                    },
                    showLines: true,
                    spanGaps: true,
                    responsive: true,
                    maintainAspectRatio: false,
                    tooltips: {
                        mode: 'nearest',
                        intersect: false,
                        callbacks: {
                            title: (tooltipItem, data) => {
                                if (data && tooltipItem) {
                                    return ` ${labelColum[0].name} : ${data.labels[tooltipItem[0].index]}`;
                                }
                            },

                            label: (tooltipItem, data) => {
                                if (data && tooltipItem) {
                                    const realData = data.datasets[tooltipItem.datasetIndex].data;
                                    let total = 0;
                                    for( let i = 0; i< realData.length; i++){
                                        if(isNaN( parseFloat(realData[i]))){
                                            total = total;
                                        }else{
                                            total = total + parseFloat(realData[i]);
                                        }
                                    }
                                    const elem = data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index];
                                    const percentage = elem / total * 100;
                                    return ` ${data.labels[tooltipItem.index]}, ${numericColumn} : ${parseFloat(elem).toLocaleString('de-DE', { maximumFractionDigits: 6 })} (${percentage.toFixed(2)}%)`;
                                }
                            },
                            footer: () => { return linked },
                        }
                    },
                    scales: {
                        x: {
                            grid: { display: false, drawOnChartArea: false },
                            ticks: {
                                maxRotation: 30,
                                minRotation: 30,
                                callback: function(val, index) {
                                    if (this.getLabelForValue(val))
                                        return  this.getLabelForValue(val).length > 30 ? (this.getLabelForValue(val).substr(0, 17) + '...') : this.getLabelForValue(val);
                                  },
                                autoSkip: true,
                                maxTicksLimit: maxTicksLimit,
                                fontSize: edaFontSize,
                                fontStyle: edafontStyle,
                                fontFamily: styles.fontFamily,
                                fontColor: styles.fontColor,
                                beginAtZero: true
                            }
                        },
                        y:
                            {
                                grid: {
                                    drawBorder: false,
                                    display: true,
                                    zeroLineWidth: 1
                                }
                                ,

                                id: 'y-axis-0', position: 'left',
                                ticks: {
                                    callback: (value) => {
                                        if (value) {
                                            return isNaN(value) ? value : this.format10thPowers(parseFloat(value))// parseFloat(value).toLocaleString('de-DE', { maximumFractionDigits: 6 });
                                        } else {
                                            return 0;
                                        }
                                    },

                                    autoSkip: true,
                                    maxTicksLimit: maxTicksLimitY,
                                    fontSize: edaFontSize,
                                    fontStyle: edafontStyle,
                                    fontFamily: styles.fontFamily,
                                    fontColor: styles.fontColor,
                                    beginAtZero: true,
                                    max: minMax.max,
                                    min: minMax.min

                                },
                                stacked: false

                            }
                        
                    },
                    elements: {
                        point: { radius: 0, hitRadius: 4, hoverRadius: 3, hoverBorderWidth: 1, pointStyle: 'circle' },
                        line: { 
                                borderWidth: 1.5, 
                                fill:  chartSubType=='area'?true:false, 
                                tension: 0.4 }
                    },
                    plugins: {
                        datalabels: dataLabelsObjt,
                        legend: edaBarLineLegend
                    },
                };
                break;
              
        }

        return options;
    }

}
