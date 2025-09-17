import {EdaColumn} from '@eda/components/eda-table/eda-columns/eda-column';

export class EdaColumnEditable extends EdaColumn {
    
    click : (row:any) => void  = () => {};
    isEdit: boolean;

    public constructor(init: Partial<EdaColumnEditable>) {
        super();
        Object.assign(this, init);
        this.type = 'EdaColumnEditable';
        this.sortable = false;
        this.width = '40px';
        this.field = '#'; // Si no dóna error amb el filtre global de taula 
    }
}
