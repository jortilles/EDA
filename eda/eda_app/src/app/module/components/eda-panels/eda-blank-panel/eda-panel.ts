import { Panel } from '../../../../shared/models/panel.model';
export class EdaPanel {
    panel: Panel;
    data_source: any;
    dashboard_id: string;
    applyToAllfilter:  { present: boolean, refferenceTable: string, id : string};
    constructor() {}
}
