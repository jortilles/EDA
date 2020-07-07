import { EdaPanel } from '@eda/models/dashboard-models/eda-panel.model';

export class EdaTitlePanel extends EdaPanel {
    fontsize: string;
    color: string;

    constructor(init?: Partial<EdaTitlePanel>) {
        super(init);
        Object.assign(this, init);
    }

}