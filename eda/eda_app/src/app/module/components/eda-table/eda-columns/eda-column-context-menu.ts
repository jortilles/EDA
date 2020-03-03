import {EdaColumn} from '@eda/components/eda-table/eda-columns/eda-column';

export class EdaColumnContextMenu extends EdaColumn {
    constructor() {
        super();
        this.type = 'EdaColumnContextMenu';
        this.sortable = false;
        this.width = '40px';
        this.field = '#'; // Si no dóna error amb el filtre global de taula
    }
}
