import {EdaColumn} from '@eda/components/eda-table/eda-columns/eda-column';

export class EdaColumnFunction extends EdaColumn {
    
    click : (row:any) => void  = () => {};

    public constructor(init: Partial<EdaColumnFunction>) {
        super();
        Object.assign(this, init);
        this.type = 'EdaColumnFunction';
        this.sortable = false;
        this.width = '40px';
        this.field = '#'; // If it doesn't produce an error with the table's global filter.
       
    }
}
