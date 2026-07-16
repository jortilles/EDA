import { EdaPanel } from '@eda/models/dashboard-models/eda-panel.model';

export type DashboardPrivacy = 'open' | 'common' | 'private' | 'group';

export class EdaTabsPanel extends EdaPanel {
    selectedDashboardIds: string[];
    openInNewTab: boolean = false;

    constructor(init?: Partial<EdaTabsPanel>) {
        super(init);
        Object.assign(this, init);
    }
}
