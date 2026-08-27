import {EdaColumn} from '@eda/components/eda-table/eda-columns/eda-column';

export class EdaColumnContextMenu extends EdaColumn {
    constructor() {
        super();
        this.type = 'EdaColumnContextMenu';
        this.sortable = false;
        this.width = '40px';
        this.field = '#'; // If it does not cause an error with the table's global filter.
    }
}
