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
        /*SDA CUSTOM*/    const newTable = modelTables.find((t: any) => t.table_name === rel.target_table || t.table_name === `${rel.target_table}.${rel.target_column[0]}`);

        /*SDA CUSTOM*/    if (newTable?.table_name && !vMap.has(newTable.table_name)) {
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

    // SDA CUSTOM — Builds the tree root node for a SQL panel using the given table name directly,
    // SDA CUSTOM   instead of relying on rootTable from the panel query (which SQL panels don't have).
    /*SDA CUSTOM*/ public loadTablePathsFromName(tables: any[], tableName: string): any[] {
    /*SDA CUSTOM*/     const pathsTables: any[] = [];
    /*SDA CUSTOM*/     const table = tables.find((source: any) => source.table_name === tableName);
    /*SDA CUSTOM*/     if (table) {
    /*SDA CUSTOM*/         const node: any = { label: table.display_name?.default || tableName, table_id: tableName };
    /*SDA CUSTOM*/         if (table.relations && table.relations.length > 0) {
    /*SDA CUSTOM*/             node.expandedIcon = 'pi pi-folder-open';
    /*SDA CUSTOM*/             node.collapsedIcon = 'pi pi-folder';
    /*SDA CUSTOM*/             node.children = [{}];
    /*SDA CUSTOM*/         }
    /*SDA CUSTOM*/         pathsTables.push(node);
    /*SDA CUSTOM*/     }
    /*SDA CUSTOM*/     return pathsTables;
    /*SDA CUSTOM*/ }

    // SDA CUSTOM — BFS over model table relations to find the shortest join path from startTable to targetTable.
    // SDA CUSTOM   Returns a node object compatible with pathList entries, or null if no path is found.
    /*SDA CUSTOM*/ public findShortestPath(startTable: string, targetTable: string, modelTables: any[]): any | null {
    /*SDA CUSTOM*/     if (!startTable || !targetTable || startTable === targetTable) return null;
    /*SDA CUSTOM*/     const queue: Array<{ tableName: string; joins: any[][] }> = [{ tableName: startTable, joins: [] }];
    /*SDA CUSTOM*/     const visited = new Set<string>([startTable]);
    /*SDA CUSTOM*/     while (queue.length > 0) {
    /*SDA CUSTOM*/         const { tableName, joins } = queue.shift();
    /*SDA CUSTOM*/         const table = modelTables.find((t: any) => t.table_name === tableName);
    /*SDA CUSTOM*/         if (!table) continue;
    /*SDA CUSTOM*/         const relations = (table.relations || []).filter(
    /*SDA CUSTOM*/             (rel: any) => !rel.bridge && !rel.autorelation && rel.visible !== false
    /*SDA CUSTOM*/         );
    /*SDA CUSTOM*/         for (const rel of relations) {
    /*SDA CUSTOM*/             const nextTable: string = rel.target_table;
    /*SDA CUSTOM*/             const sourceJoin = `${rel.source_table || tableName}.${rel.source_column[0]}`;
    /*SDA CUSTOM*/             const joinChildId = `${rel.target_table}.${rel.target_column[0]}`;
    /*SDA CUSTOM*/             const child_id = `${joinChildId}.${rel.source_column[0]}`;
    /*SDA CUSTOM*/             const newJoins = [...joins, [sourceJoin, joinChildId]];
    /*SDA CUSTOM*/             const childLabel = rel.display_name?.default || `${rel.source_column[0]} - ${rel.target_table}`;
    /*SDA CUSTOM*/             if (nextTable === targetTable) {
    /*SDA CUSTOM*/                 return { child_id, type: 'child', label: childLabel, autorelation: false, joins: newJoins };
    /*SDA CUSTOM*/             }
    /*SDA CUSTOM*/             if (!visited.has(nextTable)) {
    /*SDA CUSTOM*/                 visited.add(nextTable);
    /*SDA CUSTOM*/                 queue.push({ tableName: nextTable, joins: newJoins });
    /*SDA CUSTOM*/             }
    /*SDA CUSTOM*/         }
    /*SDA CUSTOM*/     }
    /*SDA CUSTOM*/     return null;
    /*SDA CUSTOM*/ }


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
        /* SDA CUSTOM */ this.normalizeLegacyFilter(globalFilter);

        let formatedFilter: any;
        if (globalFilter.pathList) {
            formatedFilter = this.formatGlobalFilterTree(globalFilter);
        } else {
            formatedFilter = this.formatGlobalFilter(globalFilter);
        }

        return formatedFilter;
    }

    /* SDA CUSTOM */ private normalizeLegacyFilter(filter: any): void {
    /* SDA CUSTOM */     if (filter.selectedRange && !filter.dynamicValue) {
    /* SDA CUSTOM */         filter.dynamicValue = filter.selectedRange;
    /* SDA CUSTOM */     }
    /* SDA CUSTOM */     if (!filter.dateFilterType) {
    /* SDA CUSTOM */         if (filter.selectedRange && filter.selectedRange !== 'customDate') {
    /* SDA CUSTOM */             filter.dateFilterType = 'between';
    /* SDA CUSTOM */         } else if (filter.selectedItems?.length >= 2) {
    /* SDA CUSTOM */             filter.dateFilterType = 'between';
    /* SDA CUSTOM */         } else if (filter.selectedItems?.length === 1) {
    /* SDA CUSTOM */             filter.dateFilterType = '=';
    /* SDA CUSTOM */         }
    /* SDA CUSTOM */     }
    /* SDA CUSTOM */ }

    /**
     * Formats a global filter object for simple (non-tree) filters.
     *
     * @param globalFilter The global filter object to format.
     * @returns The formatted filter object.
     */
    private formatGlobalFilter(globalFilter: any) {
        const isDate = globalFilter.column.value.column_type === 'date';

        /* SDA CUSTOM */ const dateFilterType = isDate ? (globalFilter.dateFilterType || 'between') : 'in';

        /* SDA CUSTOM */ const formatedFilter: any = {
            filter_id: globalFilter.id,
            filter_table: globalFilter.table.value,
            filter_column_type: globalFilter.column.value.column_type,
            filter_column: globalFilter.column.value.column_name,
            /* SDA CUSTOM */ filter_type: dateFilterType,
            /* SDA CUSTOM */ filter_elements: this.assertGlobalFilterItems(globalFilter, dateFilterType),
            /* SDA CUSTOM */ filter_codes: this.assertGlobalFilterCodes(globalFilter, dateFilterType),
            isGlobal: true,
            applyToAll: globalFilter.applyToAll,
            valueListSource: globalFilter.column.value.valueListSource,
            /* SDA CUSTOM */ selectedRange: globalFilter.selectedRange,
            filterBeforeGrouping: true,
            joins: globalFilter.joins,
            computed_column: globalFilter.column?.value?.computed_column,
            SQLexpression: globalFilter.column?.value?.SQLexpression,
            autorelation: globalFilter.autorelation,
        };

        /* SDA CUSTOM */ if (globalFilter.dynamicValue) {
        /* SDA CUSTOM */     formatedFilter.dynamicValue = globalFilter.dynamicValue;
        /* SDA CUSTOM */ }

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

        /* SDA CUSTOM: use dateFilterType if set (from date-format-dialog), otherwise default to 'between'/'in' */
        /*SDA CUSTOM*/ const dateFilterType = isDate ? (globalFilter.dateFilterType || 'between') : 'in';

        const pathList = _.cloneDeep(globalFilter.pathList);
        for (const key in pathList) {
            delete (pathList[key].selectedTableNodes);
        }

/*SDA CUSTOM*/        const formatedFilter: any = {
            filter_id: globalFilter.id,
            filter_table: globalFilter.table_id || globalFilter.selectedTable.table_name,
            filter_column: globalFilter.selectedColumn.column_name,
            filter_column_type: globalFilter.selectedColumn.column_type,
/*SDA CUSTOM*/            filter_type: dateFilterType,
/*SDA CUSTOM*/            filter_elements: this.assertGlobalFilterItems(globalFilter, dateFilterType),
/*SDA CUSTOM*/            filter_codes: this.assertGlobalFilterCodes(globalFilter, dateFilterType),
            pathList: pathList,
            isGlobal: true,
            applyToAll: globalFilter.applyToAll,
            autorelation: globalFilter.autorelation,
            valueListSource: globalFilter.selectedColumn.valueListSource,
            filterBeforeGrouping: true,
            joins: globalFilter.joins,
            computed_column: globalFilter.selectedColumn.computed_column,
            SQLexpression: globalFilter.selectedColumn.SQLexpression,
        };

/* SDA CUSTOM: propagate dynamicValue so the backend generates BETWEEN instead of IN */
/* SDA CUSTOM*/ if (globalFilter.dynamicValue) {
/* SDA CUSTOM*/     formatedFilter.dynamicValue = globalFilter.dynamicValue;
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
/*SDA CUSTOM*/    public assertGlobalFilterCodes(globalFilter: any, dateFilterType?: string) {
        const columnType = globalFilter.column?.value?.column_type || globalFilter.selectedColumn?.column_type;
        const isDate = columnType === 'date';

/*SDA CUSTOM*/        if (!isDate) return [{ value1: globalFilter.selectedIdValues }];

/*SDA CUSTOM*/        /* SDA CUSTOM: handle all operator types */
/*SDA CUSTOM*/        const filterType = dateFilterType || 'between';
/*SDA CUSTOM*/        const noValueTypes = ['not_null', 'not_null_nor_empty', 'null_or_empty'];
/*SDA CUSTOM*/        if (noValueTypes.includes(filterType)) return [];

/*SDA CUSTOM*/        const isTwoValue = filterType === 'between' ||
/*SDA CUSTOM*/            (globalFilter.dynamicValue && (filterType === 'in' || filterType === 'not_in'));

/*SDA CUSTOM*/        if (isTwoValue) {
/*SDA CUSTOM*/            /* keep existing year/month expansion for backward compatibility */
/*SDA CUSTOM*/            const year_length = 4;
/*SDA CUSTOM*/            const year_month_length = 7;
/*SDA CUSTOM*/            if (globalFilter.selectedItems[0] && !globalFilter.selectedItems[1]) {
/*SDA CUSTOM*/                const val = globalFilter.selectedItems[0];
/*SDA CUSTOM*/                if (val.length === year_length) {
/*SDA CUSTOM*/                    globalFilter.selectedItems[0] = `${val}-01-01`;
/*SDA CUSTOM*/                    globalFilter.selectedItems[1] = `${val}-12-31`;
/*SDA CUSTOM*/                } else if (val.length === year_month_length) {
/*SDA CUSTOM*/                    const yr = parseInt(val.slice(0, 4));
/*SDA CUSTOM*/                    const mo = parseInt(val.slice(5, 7));
/*SDA CUSTOM*/                    const days = new Date(yr, mo, 0).getDate();
/*SDA CUSTOM*/                    const daysStr = days < 10 ? `0${days}` : `${days}`;
/*SDA CUSTOM*/                    globalFilter.selectedItems[0] = `${val}-01`;
/*SDA CUSTOM*/                    globalFilter.selectedItems[1] = `${val}-${daysStr}`;
/*SDA CUSTOM*/                } else {
/*SDA CUSTOM*/                    globalFilter.selectedItems[1] = globalFilter.selectedItems[0];
/*SDA CUSTOM*/                }
/*SDA CUSTOM*/            }
/*SDA CUSTOM*/            return [
/*SDA CUSTOM*/                { value1: globalFilter.selectedItems[0] ? [globalFilter.selectedItems[0]] : [] },
/*SDA CUSTOM*/                { value2: globalFilter.selectedItems[1] ? [globalFilter.selectedItems[1]] : [] }
/*SDA CUSTOM*/            ];
/*SDA CUSTOM*/        }

/*SDA CUSTOM*/        /* single-value operators (=, !=, >, <, >=, <=) or static in/not_in */
/*SDA CUSTOM*/        const v1 = globalFilter.selectedItems[0];
/*SDA CUSTOM*/        return [{ value1: v1 ? (Array.isArray(v1) ? v1 : [v1]) : [] }];
    }


    /**
     * Returns the selected values (labels) for a global filter, formatted according to the column type.
     * If the filter is of type 'date' and only one value is selected, adjusts the range to cover the entire year or month.
     *
     * @param globalFilter Object containing the global filter information and the selected items.
     * @returns An array of objects with the selected values, structured depending on whether it is a date filter or not.
     */
/*SDA CUSTOM*/    public assertGlobalFilterItems(globalFilter: any, dateFilterType?: string) {
        const columnType = globalFilter.column?.value?.column_type || globalFilter.selectedColumn?.column_type;
        const isDate = columnType === 'date';

/*SDA CUSTOM*/if (!isDate) return [{ value1: globalFilter.selectedItems }];

        /* SDA CUSTOM: delegate to assertGlobalFilterCodes — same structure for dates */
/*SDA CUSTOM*/return this.assertGlobalFilterCodes(globalFilter, dateFilterType);
    }

}
