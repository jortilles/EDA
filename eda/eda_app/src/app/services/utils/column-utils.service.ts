import { Injectable } from '@angular/core';
import { FilterType } from '@eda/services/utils/chart-utils.service';
import { FileUtiles } from '@eda/services/utils/file-utils.service';
import * as _ from 'lodash';
interface FilterOptions {
    obj: any;
    table: string;
    column: string;
    column_type: string;
    type: string;
    selectedRange: string;
    valueListSource?: {};
    autorelation?: boolean;
    joins?: any[];
}
@Injectable()
export class ColumnUtilsService {
    constructor(private fileUtiles: FileUtiles) { }

    /**
     * @deprecated The method should not be used. Use setFilter(options: FilterOptions) instead
    */
    public addFilter(obj: any, table: string, column: string, column_type: string, type: string, selectedRange:string, valueListSource?:{}): object {
        const values = Object.keys(obj).map((key) => {
            if (!_.isNil(Object.values(obj[key]))) {
                //transform single values to array _-(··)-_  
                if(!Array.isArray( obj[key])){
                    obj[key] = [obj[key]];
                }
                return { [key]: obj[key] };
            }
        });


        if (typeof valueListSource !== 'undefined') {
            return {
                filter_id: this.fileUtiles.generateUUID(),
                filter_table: table,
                filter_column: column,
                filter_column_type: column_type,
                filter_type: type,
                filter_elements: values,
                selectedRange:selectedRange,
                valueListSource: valueListSource ,
                isGlobal : false
            };
        }


        return {
            filter_id: this.fileUtiles.generateUUID(),
            filter_table: table,
            filter_column: column,
            filter_column_type: column_type,
            filter_type: type,
            filter_elements: values,
            selectedRange:selectedRange,
            isGlobal : false
        };
    }
    
    public setFilter(options: FilterOptions): object {
        const { obj, table, column, column_type, type, selectedRange, valueListSource, joins, autorelation } = options;
    
        const values = Object.keys(obj).map((key) => {
            if (!_.isNil(obj[key])) {
                return { [key]: Array.isArray(obj[key]) ? obj[key] : [obj[key]] };
            }
        }).filter(Boolean);
    
        const filterObject = {
            isGlobal: false,
            filter_id: this.fileUtiles.generateUUID(),
            filter_table: table,
            filter_column: column,
            filter_column_type: column_type,
            filter_type: type,
            filter_elements: values,
            selectedRange: selectedRange,
            autorelation, 
            joins
        };
    
        if (valueListSource) {
            filterObject['valueListSource'] = valueListSource;
        }
    
        return filterObject;
    }

    
    public handleInputTypes(type: string) {
        let inputType;
        switch (type) {
            case 'text':
                inputType = 'text';
                break;
            case 'numeric':
                inputType = 'number';
                break;
            case 'date':
                inputType = 'date';
                break;
            case 'date-time':
                inputType = 'datetime-local';
                break;
            default:
                inputType = 'text';
                break;
        }

        return inputType;
    }

    public handleFilterChange(filter: FilterType) {
        let between = false;
        let value = false;
        let switchBtn = false;
        let limitFields = 1;

        if ( !_.isNil(filter) ) {
            limitFields = this.handleLimitSelectFields(filter.value);
            between = _.isEqual(filter.value, 'between');
            value = filter.value === 'not_null' || filter.value === 'not_null_nor_empty' || filter.value === 'null_or_empty' ? false : true;
            switchBtn = _.isEqual(filter.value, 'in') || _.isEqual(filter.value, 'not_in') ;
        }

        return {between, value, limitFields, switchBtn};
    }

    public handleValidForm(event: any, filterValue: any, validators: any) {
        let button = true;
        // Validem els valors introduits per l'usuari
        if (Object.keys(event)[0] === 'value1') {
            filterValue.value1 = event.value1 !== '' ? event.value1 : null;
        }
        if (Object.keys(event)[0] === 'value2') {
            filterValue.value2 = event.value2 !== '' ? event.value2 : null;
        }

        // Comprovem que tenim el filtre seleccionat
        if (!_.isNil(validators.selected)) {
            if (!!validators.between) {
                // Validacio si es fa un filtre entre dos valors
                if (!_.isNil(filterValue.value1) && !_.isNil(filterValue.value2)) {
                    button = false;
                } else {
                    button = true;
                }
            } else if (!validators.between) {
                // Validacio amb filtre d'un sol valor
                if (!validators.value) {
                    button = false;
                } else {
                    button = _.isNil(filterValue.value1);
                }
            }
        }
        return button;
    }

    // Funcio que haura de retornar l'ordenació
    public handleOrdenation() {

    }

    private handleLimitSelectFields(filter) {
        if (_.startsWith(filter, 'not_in')  ||
            _.startsWith(filter, 'in')) {
            return 2;
        } else {
            return 1;
        }
    }

}
