import { EdaColumn } from './eda-column';

export class EdaColumnHtml extends EdaColumn {
    htmlOn: boolean = true;

    constructor(init: Partial<EdaColumnHtml>) {
        super();
        Object.assign(this, init);
        this.type = 'EdaColumnHtml';
        this.htmlOn = true;
    }
}
