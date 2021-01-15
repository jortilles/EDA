import {EdaColumn} from '@eda/components/eda-table/eda-columns/eda-column';

export class EdaColumnChart extends EdaColumn {
   
    constructor(init: Partial<EdaColumnChart>) {
        super();
        Object.assign(this, init);
        this.type = 'EdaColumnChart';
        this.styleClass = 'text-center';
    }
}