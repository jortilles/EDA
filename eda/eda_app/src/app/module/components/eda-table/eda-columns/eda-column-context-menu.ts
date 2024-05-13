import {EdaColumn} from '@eda/components/eda-table/eda-columns/eda-column';

export class EdaColumnContextMenu extends EdaColumn {
    public disabled: (row: any) => boolean = () => false;
    constructor(init?: Partial<EdaColumnContextMenu>) {
        super();
        Object.assign(this, init);
        this.type = 'EdaColumnContextMenu';
        this.sortable = false;
        this.width = '40px';
        this.field = '#'; // Si no dóna error amb el filtre global de taula
    }
}