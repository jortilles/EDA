import {EdaColumnFilter} from '@eda_components/eda-table/eda-column-filter/eda-column-filter';

export abstract class EdaColumn {
    width: any;
    field: any;
    header: any;
    filter: EdaColumnFilter;
    styleClass: any;
    type: string;
    sortable: boolean = true;
    editable: boolean = false;
    total: boolean = false;
    max: boolean = false;
    min: boolean = false;
    group: string;

    cellStyle: (value: any, row: any) => any = () => {};

    constructor() {

    }

}
