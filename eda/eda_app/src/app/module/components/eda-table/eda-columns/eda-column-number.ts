import { EdaColumn } from './eda-column';

export class EdaColumnNumber extends EdaColumn {
    decimals: number = 0;
    prefix: string = '';
    sufix: string = '';

    constructor(init: Partial<EdaColumnNumber>) {
        super();
        Object.assign(this, init);
        this.type = 'EdaColumnNumber';
        this.styleClass = 'text-right';
    }

}