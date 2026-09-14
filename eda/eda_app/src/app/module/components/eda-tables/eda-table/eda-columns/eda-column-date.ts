import { EdaColumn } from './eda-column';

export class EdaColumnDate extends EdaColumn {
    
    constructor(init: Partial<EdaColumnDate>) {
        super();
        Object.assign(this, init);
        this.type = 'EdaColumnDate';
        this.styleClass = 'text-left';
    }
}