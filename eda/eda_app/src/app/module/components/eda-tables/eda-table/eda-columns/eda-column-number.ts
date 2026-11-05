import { EdaColumn } from './eda-column';

export class EdaColumnNumber extends EdaColumn {
    decimals: number = 2; // Number of decimal places used to initialize the column.
    prefix: string = '';
    sufix: string = '';

    constructor(init: Partial<EdaColumnNumber>) {
        super();
        Object.assign(this, init);
        this.type = 'EdaColumnNumber';
        this.styleClass = 'text-right';
    }

}