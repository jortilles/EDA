import { Injectable } from '@angular/core';
import { EdaPanel } from '@eda/models/model.index';
import * as _ from 'lodash';

@Injectable()
export class GlobalFiltersService {

    constructor() { }

    /**
     * Determines which panels should be displayed based on the reference panel and model tables.
     * Only panels related to the reference panel's tables are marked as active and available.
     *
     * @param modelTables List of all model tables.
     * @param panels List of all panels.
     * @param refferencePanel The panel used as a reference for filtering.
     * @returns Array of panels with their display status.
     */
    public panelsToDisplay(modelTables: any[], panels: any[], refferencePanel: any) {
        const panelsTables = [];
        const panelsToDisplay: Array<{ title, id, active, avaliable, visible }> = [];


        if (refferencePanel.content) {
            const panelQuery = refferencePanel.content.query.query;

            panelQuery.fields.forEach(field => {
                const table_id = field.table_id //.split('.')[0];
                if (!panelsTables.includes(table_id)) panelsTables.push(table_id);
            });

            const rootTable = panelQuery.rootTable;
            this.assertTable(rootTable || modelTables[0].table_name, panelsTables, modelTables);

            const firstPanelRelatedTables = this.relatedTables(panelsTables, modelTables, rootTable);

            for (const panel of panels) {
                if (panel.content) {
                    let inlcludePanel = true;

                    const fields = panel.content.query.query.fields;

                    for (const field of fields) {
                        const table_id = field.table_id  //.split('.')[0];
                        if (!firstPanelRelatedTables.has(table_id)) inlcludePanel = false;
                    }

                    if (inlcludePanel) {
                        panelsToDisplay.push({ title: panel.title, id: panel.id, active: true, avaliable: true, visible: true });
                    } else {
                        panelsToDisplay.push({ title: panel.title, id: panel.id, active: false, avaliable: false, visible: true });
                    }
                }
            }
        }

        return panelsToDisplay;
    }

    /**
     * Finds all tables related to the given query tables, starting from the root table.
     *
     * @param queryTables List of table names to relate.
     * @param modelTables List of all model tables.
     * @param rootTable Optional root table name to start the search.
     * @returns Map of related tables.
     */
    public relatedTables(queryTables: any[], modelTables: any[], rootTable?: string): Map<string, any> {
        let visited = new Map();
        const startTable = modelTables.find(t => t.table_name === (rootTable || queryTables[0]));

        if (startTable) {
            visited = this.findRelations(modelTables, startTable, visited);

            for (const table of queryTables) {
                const id_table = table.split('.')[0];

                if (!visited.has(id_table)) {
                    return new Map();
                }
            }
        }

        return visited;
    }

    /**
     * Recursively finds all related tables for a given table and adds them to the visited map.
     *
     * @param modelTables List of all model tables.
     * @param table The current table to find relations for.
     * @param vMap Map of already visited tables.
     * @returns Updated map of related tables.
     */
    public findRelations(modelTables: any, table: any, vMap: any) {
        vMap.set(table.table_name, table);
        const tableRelations = table.relations.filter((rel: any) => rel.visible);

        for (const rel of tableRelations) {
            let newTable = modelTables.find((t: any) => t.table_name === rel.target_table || t.table_name === `${rel.target_table}.${rel.target_column[0]}`);

            if (newTable.table_name && !vMap.has(newTable.table_name)) {
                this.findRelations(modelTables, newTable, vMap);
            }
        }

        return vMap;
    }

    /**
     * Ensures that all tables in queryTables exist in modelTables, adding missing ones based on rootTable relations.
     *
     * @param rootTableName Name of the root table.
     * @param queryTables List of table names to check.
     * @param modelTables List of all model tables (will be mutated if new tables are added).
     */
    public assertTable(rootTableName: string, queryTables: any[], modelTables: any[]): void {
        const assertTablesNames = [];
        const modelTableNames = modelTables.map((t: any) => t.table_name);

        for (const table of queryTables) {
            if (!modelTableNames.includes(table)) {
                assertTablesNames.push(table);
            }
        }

        if (rootTableName && assertTablesNames.length > 0) {
            const rootTable = modelTables.find((t) => t.table_name == rootTableName);

            for (const relation of rootTable.relations) {
                const idRelation = `${relation.target_table}.${relation.target_column[0]}.${relation.source_column[0]}`;

                if (assertTablesNames.includes(idRelation)) {
                    const assertTable = _.cloneDeep(modelTables.find((t: any) => t.table_name == relation.target_table));
                    assertTable.table_name = idRelation;
                    assertTable.autorelation = relation.autorelation;
                    assertTable.display_name.default = relation.display_name.default;
                    assertTable.description.default = relation.display_name.default;
                    modelTables.push(assertTable);
                }
            }
        }
    }

    /**
     * Finds all tables related to the root panel's query tables.
     *
     * @param tables List of all tables.
     * @param rootPanel The root panel to analyze.
     * @returns Map of related tables for the root panel.
     */
    public findRelatedTables(tables: any[], rootPanel: EdaPanel) {
        let firstPanelRelatedTables;

        if (rootPanel) {
            const queryTables: string[] = [];
            const panelQuery = rootPanel.content.query.query;

            panelQuery.fields.forEach((field: any) => {
                const table_id = field.table_id;
                if (!queryTables.includes(table_id)) queryTables.push(table_id);
            });

            const rootTable = panelQuery.rootTable || tables[0].table_name;

            firstPanelRelatedTables = this.relatedTables(queryTables, tables, rootTable);
        }

        return firstPanelRelatedTables;
    }

    /**
     * Filters the given panels to only include those related to the root panel's tables.
     * Updates each panel's active and available status accordingly.
     *
     * @param tables List of all tables.
     * @param panels List of all panels.
     * @param rootPanel Optional root panel to use for filtering.
     * @returns Array of filtered panels.
     */
    public filterPanels(tables: any[], panels: EdaPanel[], rootPanel?: any): any[] {
        const filteredPanels: any[] = panels.filter((panel) => panel.content);

        for (const panel of filteredPanels) {
            const queryTables: string[] = [];
            const panelQuery = panel.content.query.query;

            panelQuery.fields.forEach((field: any) => {
                const table_id = field.table_id;
                if (!queryTables.includes(table_id)) queryTables.push(table_id);
            });

            const rootTable = panelQuery.rootTable || tables[0].table_name;
            this.assertTable(rootTable, queryTables, tables);
        }

        if (!rootPanel) rootPanel = filteredPanels[0];


        if (rootPanel) {
            const firstPanelRelatedTables = this.findRelatedTables(tables, rootPanel);

            filteredPanels.forEach((panel: any) => {
                let panelIncluded = true;
                panel.active = panel.active || true;
                panel.avaliable = panel.avaliable || true;
                panel.visible = panel.visible || true;


                const fields = panel.content.query.query.fields;

                for (const field of fields) {
                    const table_id = field.table_id.split('.')[0];
                    if (!firstPanelRelatedTables.has(table_id)) panelIncluded = false;
                }

                if (!panelIncluded) {
                    panel.active = false;
                    panel.avaliable = false;
                }
            });
        }

        return filteredPanels;
    }

    /**
     * Loads the root table and its direct relations as nodes for a tree structure.
     *
     * @param tables List of all tables.
     * @param rootPanel The root panel to extract the root table from.
     * @returns Array of nodes representing the root table and its children.
     */
    public loadTablePaths(tables: any[], rootPanel: EdaPanel) {
        const panelQuery = rootPanel.content.query.query;
        const rootTable = panelQuery.rootTable;
        const pathsTables = [];

        if (rootTable) {
            const table = tables.find((source) => source.table_name == rootTable);

            if (table) {
                let isexpandible = table.relations.length > 0;

                let node: any = {
                    label: table.display_name.default,
                    table_id: rootTable
                }

                if (isexpandible) {
                    node.expandedIcon = "pi pi-folder-open";
                    node.collapsedIcon = "pi pi-folder";
                    node.children = [{}];
                }

                pathsTables.push(node);
            }
        }

        return pathsTables;
    }

    /**
     * Expands a node in a tree structure, adding its child nodes based on table relations.
     * Prevents duplicate paths and handles autorelations.
     *
     * @param tree The current tree structure.
     * @param expandNode The node to expand.
     * @param dataSource List of all tables (used to find relations).
     */
    public onNodeExpand(tree: any[], expandNode: any, dataSource: any[]) {
        const table_id = expandNode.table_id || expandNode.child_id.split('.')[0];

        if (table_id) {
            expandNode.children = [];

            const table = dataSource.find((source) => source.table_name == table_id);

            /** find all the existing childNodes found before */
            const getAllChildIds = (node: any, ids: string[] = []): string[] => {
                if (node.child_id) ids.push(node.child_id);

                if (node.parent) return getAllChildIds(node.parent, ids);

                return ids;
            };

            const rootTree = tree.map((n) => n.table_id);
            const childrenId = getAllChildIds(expandNode);
            table.relations = table.relations.filter(f => f.bridge == false);
            for (const relation of table.relations) {
                // Init child_id
                const child_id = `${relation.target_table}.${relation.target_column[0]}.${relation.source_column[0]}`;

                /** Checks if the current child_node is included before.
                 * This prevents duplicated paths.*/
                if ((!rootTree.includes(relation.target_table) || relation.autorelation) && !childrenId.includes(child_id)) {
                    // Label to show on the treeComponent 
                    let childLabel = relation.display_name?.default
                        ? `${relation.display_name.default}`
                        : ` ${relation.source_column[0]} - ${relation.target_table} `;

                    /** This creates the path to relate this node with the previous tables.
                     * It will be used later to generate the query. */
                    let sourceJoin = relation.source_table + '.' + relation.source_column[0];
                    const joinChildId = child_id.substring(0, child_id.lastIndexOf('.'));
                    let joins = expandNode.joins ? [].concat(expandNode.joins, [[sourceJoin, joinChildId]]) : [[sourceJoin, joinChildId]];

                    if (!dataSource.some((t) => t.table_name == child_id)) {
                        let assertTable = _.cloneDeep(dataSource.find((t) => t.table_name == relation.target_table))
                        if (assertTable?.table_name) {
                            assertTable.table_name = child_id;
                            assertTable.display_name.default = childLabel;
                            assertTable.description.default = childLabel;
                            assertTable.autorelation = relation.autorelation;
                            dataSource.push(assertTable)
                        }
                    }
                    // Init childNode object
                    let childNode: any = {
                        child_id: child_id.trim(),
                        type: 'child',
                        label: childLabel,
                        autorelation: relation.autorelation,
                        joins
                    };

                    if (!childNode.parent) childNode.parent = expandNode;

                    // Check if the childNode have more possible paths to explore
                    const isexpandible = dataSource.some((source) => {
                        return source.table_name == childNode.child_id &&
                            (source.relations || []).some((rel: any) => rel.target_table != table_id);
                    });

                    // If it's expandable, we add properties to expand the node. 
                    if (isexpandible && !relation.autorelation) {
                        childNode.expandedIcon = "pi pi-folder-open";
                        childNode.collapsedIcon = "pi pi-folder";
                        childNode.children = [{}];
                    }
                    // Finally add this childNode to expandNode. This will create the tree.
                    expandNode.children.push(childNode);
                }
            }

            expandNode.children.sort((a, b) => a.label.localeCompare(b.label));
        }
    }

    /**
     * Formats a global filter object, choosing the correct format based on the presence of a pathList.
     *
     * @param globalFilter The global filter object to format.
     * @returns The formatted filter object.
     */
    public formatFilter(globalFilter: any) {
        let formatedFilter: any;
        if (globalFilter.pathList) {
            formatedFilter = this.formatGlobalFilterTree(globalFilter);
        } else {
            formatedFilter = this.formatGlobalFilter(globalFilter);
        }

        return formatedFilter;
    }

    /**
     * Formats a global filter object for simple (non-tree) filters.
     *
     * @param globalFilter The global filter object to format.
     * @returns The formatted filter object.
     */
    private formatGlobalFilter(globalFilter: any) {
        const isDate = globalFilter.column.value.column_type === 'date';

        const formatedFilter = {
            filter_id: globalFilter.id,
            filter_table: globalFilter.table.value,
            filter_column_type: globalFilter.column.value.column_type,
            filter_column: globalFilter.column.value.column_name,
            filter_type: isDate ? 'between' : 'in',
            filter_elements: this.assertGlobalFilterItems(globalFilter),
            isGlobal: true,
            applyToAll: globalFilter.applyToAll,
            valueListSource: globalFilter.column.value.valueListSource
        }

        return formatedFilter;
    }

    /**
     * Formats a global filter object for tree-based filters, removing selectedTableNodes from the pathList.
     *
     * @param globalFilter The global filter object to format.
     * @returns The formatted filter object.
     */
    private formatGlobalFilterTree(globalFilter: any) {
        const isDate = globalFilter.selectedColumn.column_type === 'date';

        const pathList = _.cloneDeep(globalFilter.pathList);
        for (const key in pathList) {
            delete (pathList[key].selectedTableNodes);
        }

        const formatedFilter = {
            filter_id: globalFilter.id,
            filter_table: globalFilter.table_id || globalFilter.selectedTable.table_name,
            filter_column: globalFilter.selectedColumn.column_name,
            filter_column_type: globalFilter.selectedColumn.column_type,
            filter_type: isDate ? 'between' : 'in',
            filter_elements: this.assertGlobalFilterItems(globalFilter),
            filter_codes: this.assertGlobalFilterCodes(globalFilter),
            pathList: pathList,
            isGlobal: true,
            applyToAll: globalFilter.applyToAll,
            autorelation: globalFilter.autorelation,
            valueListSource: globalFilter.selectedColumn.valueListSource,
            filterBeforeGrouping: true, // For all global filters it is Where
            joins: globalFilter.joins

        }

        return formatedFilter;
    }


    /**
     * Returns the selected IDs for a global filter, formatted according to the column type.
     * If the filter is of type 'date' and only one value is selected, adjusts the range to cover the entire year or month.
     *
     * @param globalFilter Object containing the global filter information and the selected items.
     * @returns An array of objects with the selected IDs, structured depending on whether it is a date filter or not.
     */
    public assertGlobalFilterCodes(globalFilter: any) {
        const columnType = globalFilter.column?.value?.column_type || globalFilter.selectedColumn?.column_type;
        const isDate = columnType === 'date';
        const year_length = 4;
        const year_month_length = 7;


        if (isDate && globalFilter.selectedItems[0] && !globalFilter.selectedItems[1]) {
            const year = globalFilter.selectedItems[0];
            if (globalFilter.selectedItems[0].length === year_length) {
                globalFilter.selectedItems[0] = `${year}-01-01`;
                globalFilter.selectedItems[1] = `${year}-12-31`;
            }
            else if (globalFilter.selectedItems[0].length === year_month_length) {
                const year_month = globalFilter.selectedItems[0];
                const year = parseInt(year_month.slice(0, 5))
                const month = parseInt(year_month.slice(5, 7));
                let days = new Date(year, month, 0).getDate();
                let daysstr = days < 10 ? `0${days}` : `${days}`
                globalFilter.selectedItems[0] = `${year_month}-01`;
                globalFilter.selectedItems[1] = `${year_month}-${daysstr}`;
            } else {
                globalFilter.selectedItems[1] = globalFilter.selectedItems[0]
            }
        }

        return isDate
            ? [{ value1: globalFilter.selectedItems[0] ? [globalFilter.selectedItems[0]] : [] }, { value2: globalFilter.selectedItems[1] ? [globalFilter.selectedItems[1]] : [] }]
            : [{ value1: globalFilter.selectedIdValues }];
    }


    /**
     * Returns the selected values (labels) for a global filter, formatted according to the column type.
     * If the filter is of type 'date' and only one value is selected, adjusts the range to cover the entire year or month.
     * 
     * @param globalFilter Object containing the global filter information and the selected items.
     * @returns An array of objects with the selected values, structured depending on whether it is a date filter or not.
     */
    public assertGlobalFilterItems(globalFilter: any) {
        const columnType = globalFilter.column?.value?.column_type || globalFilter.selectedColumn?.column_type;
        const isDate = columnType === 'date';
        const year_length = 4;
        const year_month_length = 7;


        if (isDate && globalFilter.selectedItems[0] && !globalFilter.selectedItems[1]) {
            const year = globalFilter.selectedItems[0];
            if (globalFilter.selectedItems[0].length === year_length) {
                globalFilter.selectedItems[0] = `${year}-01-01`;
                globalFilter.selectedItems[1] = `${year}-12-31`;
            }
            else if (globalFilter.selectedItems[0].length === year_month_length) {
                const year_month = globalFilter.selectedItems[0];
                const year = parseInt(year_month.slice(0, 5))
                const month = parseInt(year_month.slice(5, 7));
                let days = new Date(year, month, 0).getDate();
                let daysstr = days < 10 ? `0${days}` : `${days}`
                globalFilter.selectedItems[0] = `${year_month}-01`;
                globalFilter.selectedItems[1] = `${year_month}-${daysstr}`;
            } else {
                globalFilter.selectedItems[1] = globalFilter.selectedItems[0]
            }
        }

        return isDate
            ? [{ value1: globalFilter.selectedItems[0] ? [globalFilter.selectedItems[0]] : [] }, { value2: globalFilter.selectedItems[1] ? [globalFilter.selectedItems[1]] : [] }]
            : [{ value1: globalFilter.selectedItems }];
    }

}
