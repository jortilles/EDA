import { Injectable } from '@angular/core';

@Injectable()
export class GlobalFiltersService {

    constructor() { }

    public panelsToDisplay(tables, panels, refferencePanel) {

        const panelsTables = [];
        const panelsToDisplay: Array<{title, id, active, avaliable, visible}> = [];
        if (refferencePanel.content) {
            refferencePanel.content.query.query.fields.forEach(field => {
                if (!panelsTables.includes(field.table_id)) {
                    panelsTables.push(field.table_id);
                }
            });
            const firstPanelRelatedTables = this.relatedTables(panelsTables, tables);
            panels.forEach(panel => {
                if (panel.content) {
                    let inlcludePanel = true;
                    panel.content.query.query.fields.forEach(field => {
                        if (!firstPanelRelatedTables.has(field.table_id)) inlcludePanel = false;
                    });
                    if (inlcludePanel) {
                        panelsToDisplay.push({title: panel.title, id: panel.id, active: true, avaliable : true, visible: true});
                    } else {
                        panelsToDisplay.push({title: panel.title, id: panel.id, active: false, avaliable: false, visible: true});
                    }
                }
            });
        }
        return panelsToDisplay;
    }

    public relatedTables(tables: Array<any>, modeltables): Map<string, any> {
        let visited = new Map();
        const startTable = modeltables.find(t => t.table_name === tables[0]);
        visited = this.findRelations(modeltables, startTable, visited);
        for (let i = 0; i < tables.length; i++) {
            if (!visited.has(tables[i])) return new Map();
        }
        return visited;
    }

    public findRelations(tables: any, table: any, vMap: any) {
        vMap.set(table.table_name, table);
        table.relations.filter(rel => rel.visible === true).forEach(rel => {
            const newTable = tables.find(t => t.table_name === rel.target_table);
            if (!vMap.has(newTable.table_name)) {
                this.findRelations(tables, newTable, vMap);
            }
        });
        return vMap;
    }

}
