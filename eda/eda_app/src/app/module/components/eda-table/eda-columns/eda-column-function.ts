import {EdaColumn} from '@eda/components/eda-table/eda-columns/eda-column';

export class EdaColumnFunction extends EdaColumn {
    
    click : (row:any) => void  = () => {};

    public constructor(init: Partial<EdaColumnFunction>) {
        super();
        Object.assign(this, init);
        this.type = 'EdaColumnFunction';
        this.sortable = false;
        this.width = '40px';
        this.field = '#'; // Si no dóna error amb el filtre global de taula 
       
    }
}
