import { EdaColumn } from './eda-column';

export class EdaColumnText extends EdaColumn {

    rangeOption: boolean; // Option if the string is a range.

    constructor(init: Partial<EdaColumnText>) {
        super();
        Object.assign(this, init);
        this.type = 'EdaColumnText';
    }
}
