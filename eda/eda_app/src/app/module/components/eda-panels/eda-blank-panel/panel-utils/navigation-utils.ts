import { EdaBlankPanelComponent } from '../eda-blank-panel.component';
import { QueryUtils } from './query-utils';

export const NavigationUtils = {

    // ─── Guards ─────────────────────────────────────────────────────────────────

    /** True if currentQuery has at least one child-nav or date-nav column. */
    hasNavigation(component: EdaBlankPanelComponent): boolean {
        return component.currentQuery.some((col: any) => col.downChild || col.dateNav === true);
    },

    /** True if the saved panel content contains any navigation data worth restoring. */
    panelHasNavigation(panelContent: any): boolean {
        return (panelContent.navigationLinks?.length > 0) || (panelContent.savedDateNavState?.length > 0);
    },

    // ─── Sync helpers ───────────────────────────────────────────────────────────

    /** Finds a column in currentQuery by table_id and column_name. */
    findColInQuery(component: EdaBlankPanelComponent, tableId: string, colName: string): any {
        return component.currentQuery.find((c: any) => c.table_id === tableId && c.column_name === colName);
    },

    /**
     * Finds the active navState entry whose current column matches `field`.
     * Used to detect if clicking "+" on an already-active child should extend the chain.
     */
    findActiveNavEntryForField(component: EdaBlankPanelComponent, field: string): any | undefined {
        return component.navState.find((d: any) => {
            const activeCol = d.navPath[d.currentIndex];
            return activeCol && activeCol.column_name === field;
        });
    },

    /**
     * Returns true if `rootKey` corresponds to a dateNav column — either with an
     * active drill-in entry in dateNavState, or in its original format (format-only zoom).
     */
    isDateNavKey(component: EdaBlankPanelComponent, rootKey: string): boolean {
        if (component.dateNavState.some((e: any) => e.columnKey === rootKey)) return true;
        return component.currentQuery.some(
            (c: any) => `${c.table_id}.${c.column_name}` === rootKey && c.dateNav
        );
    },

    /**
     * Builds the full navPath for a root column by following downChild links in currentQuery.
     * Used when restoring navigation state after a panel load.
     */
    buildNavPathFromRoot(component: EdaBlankPanelComponent, rootCol: any): any[] {
        const navPath: any[] = [rootCol];
        let current = rootCol;
        while (current.downChild) {
            const next = NavigationUtils.findColInQuery(component, current.downChild.table_id, current.downChild.column_name);
            if (!next) break;
            navPath.push(next);
            current = next;
        }
        return navPath;
    },

    /**
     * Maps col.format to the three nav granularity levels.
     * For dateNav columns only 'year', 'month', 'day' are valid formats.
     * Any other value falls back to 'day'.
     */
    mapToNavFormat(format: string): 'year' | 'month' | 'day' {
        if (format === 'year') return 'year';
        if (format === 'month') return 'month';
        return 'day';
    },

    /**
     * Computes the inclusive date range [start, end] for a BETWEEN filter.
     *  - year  → 'YYYY-01-01' … 'YYYY-12-31'
     *  - month → 'YYYY-MM-01' … 'YYYY-MM-last'
     *  - day   → value … value  (SQL builder appends ' 23:59:59' to end automatically)
     */
    computeDateRange(value: string, navFmt: 'year' | 'month' | 'day'): { start: string; end: string } {
        if (navFmt === 'year') {
            return { start: `${value}-01-01`, end: `${value}-12-31` };
        } else if (navFmt === 'month') {
            const parts = value.split('-');
            const yr = Number(parts[0]);
            const mo = Number(parts[1]);
            const lastDay = new Date(yr, mo, 0).getDate();
            const mm = String(mo).padStart(2, '0');
            return { start: `${yr}-${mm}-01`, end: `${yr}-${mm}-${String(lastDay).padStart(2, '0')}` };
        }
        // day: SQL builder appends ' 23:59:59' to end automatically — do not add it here
        return { start: value, end: value };
    },

    /** Constructs the shared base structure for a nav filter object. */
    makeNavFilterObject(col: any, filterType: string, filterElements: any[]): any {
        return {
            filter_id: `nav_${col.table_id}_${col.column_name}_${Date.now()}`,
            filter_table: col.table_id,
            filter_column: col.column_name,
            filter_column_type: col.column_type,
            filter_type: filterType,
            filter_elements: filterElements,
            isGlobal: 'nav',
            isNavFilter: true,
            filterBeforeGrouping: true,
            joins: col.joins || [],
            removed: false
        };
    },

    /**
     * Builds a navigation filter for a child-nav "+" click.
     * Date columns showing truncated values (year/month/day/No) use BETWEEN because
     * equality fails against full DATETIME values in the database.
     * Text and number columns use a simple equality filter.
     */
    buildNavFilter(component: EdaBlankPanelComponent, col: any, value: any): any {
        if (col.column_type === 'date' && (!col.format || ['year', 'month', 'day', 'No'].includes(col.format))) {
            const navFmt = NavigationUtils.mapToNavFormat(col.format);
            const { start, end } = NavigationUtils.computeDateRange(String(value), navFmt);
            return NavigationUtils.makeNavFilterObject(col, 'between', [{ value1: [start] }, { value2: [end] }]);
        }
        return NavigationUtils.makeNavFilterObject(col, '=', [{ value1: [String(value)] }]);
    },

    /** Builds a BETWEEN date-range filter used by date-nav drill-down. */
    buildDateRangeFilter(col: any, value: string, navFmt: 'year' | 'month' | 'day'): any {
        const { start, end } = NavigationUtils.computeDateRange(value, navFmt);
        return {
            filter_id: `datenav_${col.table_id}_${col.column_name}_${Date.now()}`,
            filter_table: col.table_id,
            filter_column: col.column_name,
            filter_column_type: 'date',
            filter_type: 'between',
            filter_elements: [{ value1: [start] }, { value2: [end] }],
            filter_codes: [{ value1: [start] }, { value2: [end] }],
            isGlobal: 'nav',
            isNavFilter: true,
            filterBeforeGrouping: true,
            joins: col.joins || [],
            removed: false
        };
    },

    /**
     * Updates the format of a column in currentQuery in-place.
     * Date-nav uses this to switch the backend's DATE_FORMAT grouping as the user drills in/out.
     */
    updateColumnFormatInQuery(component: EdaBlankPanelComponent, col: any, format: string): void {
        const found = NavigationUtils.findColInQuery(component, col.table_id, col.column_name);
        if (found) found.format = format;
    },

    // ─── Child-nav chain ────────────────────────────────────────────────────────

    /**
     * Extends an existing child-nav chain one step deeper.
     * Called when clicking "+" on a column that is already an active child substitute.
     */
    extendNavChain(component: EdaBlankPanelComponent, entry: any, value: any): void {
        const activeCol = entry.navPath[entry.currentIndex];
        if (!activeCol?.downChild) return;
        const nextCol = NavigationUtils.findColInQuery(component, activeCol.downChild.table_id, activeCol.downChild.column_name);
        if (!nextCol) return;
        entry.navPath.push(nextCol);
        entry.currentIndex++;
        const filter = NavigationUtils.buildNavFilter(component, activeCol, value);
        entry.navFilters.push(filter);
        component.selectedFilters.push(filter);
    },

    /**
     * Starts a new child-nav chain from a root column.
     * Creates a navState entry and adds the initial filter to selectedFilters.
     */
    startNavChain(component: EdaBlankPanelComponent, field: string, value: any): void {
        const rootCol = component.currentQuery.find((col: any) => col.column_name === field);
        if (!rootCol?.downChild) return;
        const rootKey = `${rootCol.table_id}.${rootCol.column_name}`;
        const childCol = NavigationUtils.findColInQuery(component, rootCol.downChild.table_id, rootCol.downChild.column_name);
        if (!childCol) return;
        const filter = NavigationUtils.buildNavFilter(component, rootCol, value);
        component.navState.push({
            rootKey,
            navPath: [rootCol, childCol],
            currentIndex: 1,
            navFilters: [filter]
        });
        component.selectedFilters.push(filter);
    },

    /** Removes all filters and the navState entry for a fully resolved nav chain. */
    removeFullNavEntry(component: EdaBlankPanelComponent, entry: any): void {
        const filterIds = new Set(entry.navFilters.map((f: any) => f.filter_id));
        component.selectedFilters = component.selectedFilters.filter((f: any) => !filterIds.has(f.filter_id));
        component.navState = component.navState.filter((d: any) => d.rootKey !== entry.rootKey);
    },

    /** Steps back one level in a child-nav chain: removes the last filter and pops the path. */
    stepBackNavChain(component: EdaBlankPanelComponent, entry: any): void {
        const removed = entry.navFilters.pop();
        if (removed) {
            component.selectedFilters = component.selectedFilters.filter((f: any) => f.filter_id !== removed.filter_id);
        }
        entry.navPath.pop();
        entry.currentIndex--;
    },

    // ─── Date-nav chain ─────────────────────────────────────────────────────────

    /** Removes all filters for a dateNav entry and restores the column to its initial format. */
    removeFullDateNavEntry(component: EdaBlankPanelComponent, entry: any, col: any): void {
        const filterIds = new Set(entry.navFilters.map((f: any) => f.filter_id));
        component.selectedFilters = component.selectedFilters.filter((f: any) => !filterIds.has(f.filter_id));
        NavigationUtils.updateColumnFormatInQuery(component, col, entry.initialFormat);
        component.dateNavState = component.dateNavState.filter((e: any) => e.columnKey !== entry.columnKey);
    },

    /** Steps back one level in an active dateNav drill-in: removes last filter, decrements format index. */
    stepBackDateNav(component: EdaBlankPanelComponent, entry: any, col: any): void {
        const removed = entry.navFilters.pop();
        if (removed) component.selectedFilters = component.selectedFilters.filter((f: any) => f.filter_id !== removed.filter_id);
        entry.currentFormatIndex--;
        NavigationUtils.updateColumnFormatInQuery(component, col, entry.formatChain[entry.currentFormatIndex]);
    },

    // ─── Nav event handlers ─────────────────────────────────────────────────────

    /**
     * Handles "+" click on a dateNav column.
     * If already drilled in, advances one step in the format chain.
     * If not yet drilled in, starts from the column's current format:
     *   year  → drills to month
     *   month → drills to day
     */
    handleDateNavIn(component: EdaBlankPanelComponent, col: any, value: string): void {
        const colKey = `${col.table_id}.${col.column_name}`;
        const existing = component.dateNavState.find((e: any) => e.columnKey === colKey);
        const fullChain: ('year' | 'month' | 'day')[] = ['year', 'month', 'day'];

        if (existing) {
            const navFmt = existing.formatChain[existing.currentFormatIndex] as 'year' | 'month' | 'day';
            const filter = NavigationUtils.buildDateRangeFilter(col, value, navFmt);
            existing.navFilters.push(filter);
            component.selectedFilters.push(filter);
            existing.currentFormatIndex++;
            NavigationUtils.updateColumnFormatInQuery(component, col, existing.formatChain[existing.currentFormatIndex]);
        } else {
            const navFmt = NavigationUtils.mapToNavFormat(col.format);
            const startIdx = fullChain.indexOf(navFmt);
            const chain = fullChain.slice(startIdx);
            if (chain.length < 2) return; // 'day' has no deeper level — "+" never shown

            const filter = NavigationUtils.buildDateRangeFilter(col, value, chain[0]);
            component.dateNavState.push({
                columnKey: colKey,
                initialFormat: chain[0],
                formatChain: chain,
                currentFormatIndex: 1,
                navFilters: [filter]
            });
            component.selectedFilters.push(filter);
            NavigationUtils.updateColumnFormatInQuery(component, col, chain[1]);
        }
        QueryUtils.runQuery(component, false);
    },

    /**
     * Handles "-" click on a dateNav column. Three sub-cases:
     *   a) No active drill-in: pure format zoom-out (day→month, month→year)
     *   b) Active drill-in at level 1: remove all filters and restore original format
     *   c) Active drill-in deeper: step back one level in the chain
     */
    handleDateNavOut(component: EdaBlankPanelComponent, rootKey: string): void {
        const entry = component.dateNavState.find((e: any) => e.columnKey === rootKey);
        const col = component.currentQuery.find((c: any) => `${c.table_id}.${c.column_name}` === rootKey);
        if (!col) return;

        if (!entry) {
            const navFmt = NavigationUtils.mapToNavFormat(col.format);
            if (navFmt === 'day') {
                NavigationUtils.updateColumnFormatInQuery(component, col, 'month');
            } else if (col.format === 'month') {
                NavigationUtils.updateColumnFormatInQuery(component, col, 'year');
            }
        } else if (entry.currentFormatIndex <= 1) {
            NavigationUtils.removeFullDateNavEntry(component, entry, col);
        } else {
            NavigationUtils.stepBackDateNav(component, entry, col);
        }
        QueryUtils.runQuery(component, false);
    },

    /**
     * Handles "+" (navigate in) click from the table.
     * Routes to date-nav for dateNav columns; otherwise handles child nav.
     */
    handleNavIn(component: EdaBlankPanelComponent, event: { field: string; value: any }): void {
        const dateNavCol = component.currentQuery.find((col: any) => col.column_name === event.field && col.dateNav === true);
        if (dateNavCol) {
            NavigationUtils.handleDateNavIn(component, dateNavCol, String(event.value));
            return;
        }

        const existingEntry = NavigationUtils.findActiveNavEntryForField(component, event.field);
        if (existingEntry) {
            NavigationUtils.extendNavChain(component, existingEntry, event.value);
        } else {
            NavigationUtils.startNavChain(component, event.field, event.value);
        }

        NavigationUtils.syncNavigationLinksToPanel(component);
        QueryUtils.runQuery(component, false);
    },

    /**
     * Handles "-" (navigate out) click from the table.
     * Routes to date-nav for dateNav columns; otherwise steps back in the child-nav chain.
     */
    handleNavOut(component: EdaBlankPanelComponent, event: { rootKey: string }): void {
        if (NavigationUtils.isDateNavKey(component, event.rootKey)) {
            NavigationUtils.handleDateNavOut(component, event.rootKey);
            return;
        }

        const entry = component.navState.find((d: any) => d.rootKey === event.rootKey);
        if (!entry) return;

        if (entry.currentIndex <= 1) {
            NavigationUtils.removeFullNavEntry(component, entry);
        } else {
            NavigationUtils.stepBackNavChain(component, entry);
        }

        NavigationUtils.syncNavigationLinksToPanel(component);
        QueryUtils.runQuery(component, false);
    },

    // ─── Config computation ─────────────────────────────────────────────────────

    /**
     * Collects state for all columns currently active as child substitutes (child nav).
     * These columns show "-" (back button) and are skipped in the main loop of
     * computeChildNavConfig to avoid overwriting their childFieldMap entry.
     * If the active child has its own downChild, it also gets a "+" button so the
     * chain can continue deeper (Country→City→AddressLine→PostalCode).
     */
    buildActiveNavChildrenState(component: EdaBlankPanelComponent): {
        childFieldMap: { [k: string]: string },
        navColumnSubstitution: { [k: string]: string },
        activeNavChildNames: Set<string>,
        activeChildParentFields: string[]
    } {
        const childFieldMap: { [k: string]: string } = {};
        const navColumnSubstitution: { [k: string]: string } = {};
        const activeNavChildNames = new Set<string>();
        const activeChildParentFields: string[] = [];

        for (const entry of component.navState) {
            const activeCol = entry.navPath[entry.currentIndex];
            childFieldMap[activeCol.column_name] = entry.rootKey;
            activeNavChildNames.add(activeCol.column_name);
            const rootColName = entry.navPath[0]?.column_name;
            if (rootColName && rootColName !== activeCol.column_name) {
                navColumnSubstitution[rootColName] = activeCol.column_name;
            }
            if (activeCol.downChild) {
                activeChildParentFields.push(activeCol.column_name);
            }
        }

        return { childFieldMap, navColumnSubstitution, activeNavChildNames, activeChildParentFields };
    },

    /**
     * Computes which nav buttons ("+" and "-") each column should show.
     * Returns three maps consumed by the table component.
     *
     * parentFields:          column_names that show "+" (can navigate deeper)
     * childFieldMap:         column_name → rootKey for columns that show "-" (can go back)
     * navColumnSubstitution: root column_name → active child column_name (for query substitution)
     */
    computeChildNavConfig(component: EdaBlankPanelComponent): {
        parentFields: string[],
        childFieldMap: { [k: string]: string },
        navColumnSubstitution: { [originalName: string]: string }
    } {
        const effectiveFields = QueryUtils.getEffectiveFields(component);
        const parentFields: string[] = [];

        const { childFieldMap, navColumnSubstitution, activeNavChildNames, activeChildParentFields } =
            NavigationUtils.buildActiveNavChildrenState(component);
        parentFields.push(...activeChildParentFields);

        for (const col of effectiveFields) {
            if (activeNavChildNames.has(col.column_name)) continue;

            if (col.dateNav === true) {
                const colKey = `${col.table_id}.${col.column_name}`;
                const activeEntry = component.dateNavState.find((e: any) => e.columnKey === colKey);

                if (activeEntry) {
                    if (activeEntry.currentFormatIndex < activeEntry.formatChain.length - 1) {
                        parentFields.push(col.column_name);
                    }
                    childFieldMap[col.column_name] = colKey;
                } else {
                    const navFmt = NavigationUtils.mapToNavFormat(col.format);
                    if (navFmt === 'year') {
                        parentFields.push(col.column_name);
                    } else if (navFmt === 'month') {
                        parentFields.push(col.column_name);
                        childFieldMap[col.column_name] = colKey;
                    } else {
                        childFieldMap[col.column_name] = colKey;
                    }
                }
            } else if (col.downChild) {
                parentFields.push(col.column_name);
            }
        }

        NavigationUtils.syncNavigationLinksToPanel(component);
        return { parentFields, childFieldMap, navColumnSubstitution };
    },

    // ─── Panel sync / restore ───────────────────────────────────────────────────

    /**
     * Rebuilds panel.content.navigationLinks from currentQuery so that checkNavigableColumn
     * in the dashboard always has accurate data — even before the panel is saved.
     */
    syncNavigationLinksToPanel(component: EdaBlankPanelComponent): void {
        if (!component.panel?.content) return;
        component.panel.content.navigationLinks = (component.currentQuery || [])
            .filter((col: any) => col.downChild)
            .map((col: any) => ({
                parentTable: col.table_id,
                parentColumn: col.column_name,
                childTable: col.downChild.table_id,
                childColumn: col.downChild.column_name,
                childDisplayName: col.downChild.display_name
            }));
    },

    /**
     * Restores parent→child navigation links from saved panel content after a dashboard load.
     * Steps:
     *   1. Set downChild on parent columns in currentQuery from saved navigationLinks
     *   2. Restore active navState entries from saved navActiveNodes
     */
    restoreNavigationLinks(component: EdaBlankPanelComponent, panelContent: any): void {
        const links: any[] = panelContent.navigationLinks || [];
        const activeNodes: any[] = panelContent.navActiveNodes || [];

        for (const link of links) {
            const parentCol = NavigationUtils.findColInQuery(component, link.parentTable, link.parentColumn);
            if (parentCol) {
                parentCol.downChild = {
                    table_id: link.childTable,
                    column_name: link.childColumn,
                    display_name: link.childDisplayName
                };
            }
        }

        // Guard against double-call from setupQueryContext + buildGlobalconfiguration
        for (const activeNode of activeNodes) {
            if (component.navState.find((e: any) => e.rootKey === activeNode.parentKey)) continue;

            const rootCol = component.currentQuery.find((c: any) =>
                `${c.table_id}.${c.column_name}` === activeNode.parentKey
            );
            if (!rootCol?.downChild) continue;

            const navPath = NavigationUtils.buildNavPathFromRoot(component, rootCol);
            const currentIndex = Math.min(activeNode.currentIndex ?? 1, navPath.length - 1);
            if (currentIndex < 1) continue;

            component.navState.push({
                rootKey: activeNode.parentKey,
                navPath,
                currentIndex,
                navFilters: activeNode.navFilters || []
            });
        }

        NavigationUtils.syncNavigationLinksToPanel(component);
    },

    /**
     * Restores dateNavState from saved panel content and applies the active drill-in format
     * to each date column in currentQuery so the backend returns data at the correct granularity.
     */
    restoreDateNavState(component: EdaBlankPanelComponent, panelContent: any): void {
        const saved = panelContent.savedDateNavState || [];
        if (!saved.length) return;

        component.dateNavState = saved.map((entry: any) => ({
            columnKey: entry.columnKey,
            initialFormat: entry.initialFormat,
            formatChain: entry.formatChain,
            currentFormatIndex: entry.currentFormatIndex,
            navFilters: entry.navFilters || []
        }));

        for (const entry of component.dateNavState) {
            const activeFormat = entry.formatChain[entry.currentFormatIndex];
            if (!activeFormat) continue;
            const col = component.currentQuery.find((c: any) => `${c.table_id}.${c.column_name}` === entry.columnKey);
            if (col) col.format = activeFormat;
        }
        // selectedFilters are populated by handleFilters, which reads component.dateNavState
    },

    /**
     * Removes all child-nav configuration and active state.
     * Called when the chart type changes — child navigation only makes sense on tables.
     */
    clearChildNavigation(component: EdaBlankPanelComponent): void {
        const navFilterIds = new Set(
            component.navState.flatMap((e: any) => e.navFilters.map((f: any) => f.filter_id))
        );
        component.selectedFilters = component.selectedFilters.filter((f: any) => !navFilterIds.has(f.filter_id));
        component.navState = [];
        for (const col of component.currentQuery) {
            delete col.downChild;
        }
        NavigationUtils.syncNavigationLinksToPanel(component);
    },

    // ─── navigationLinks builder (for query serialization) ──────────────────────

    /**
     * Serializes all currentQuery columns as fields and returns the full parent→child
     * link array. Called before the query is sent to the backend.
     */
    buildNavigationLinks(component: EdaBlankPanelComponent, query: any): any[] {
        query.query.fields = component.currentQuery.map((col: any, i: number) => {
            const selectedAgg = Array.isArray(col.aggregation_type)
                ? col.aggregation_type.find((a: any) => a.selected)
                : null;
            const aggValue = selectedAgg ? selectedAgg.value
                : (typeof col.aggregation_type === 'string' ? col.aggregation_type : 'none');
            return {
                table_id: col.table_id,
                column_name: col.column_name,
                display_name: col.display_name?.default ?? col.display_name,
                column_type: col.column_type,
                old_column_type: col.old_column_type || col.column_type,
                computed_column: col.computed_column,
                SQLexpression: col.SQLexpression,
                aggregation_type: aggValue,
                ordenation_type: col.ordenation_type,
                format: col.format,
                order: i,
                column_granted_roles: col.column_granted_roles,
                row_granted_roles: col.row_granted_roles,
                tableCount: col.tableCount,
                minimumFractionDigits: col.minimumFractionDigits,
                cumulativeSum: col.cumulativeSum,
                dateNav: col.dateNav || false,
                valueListSource: col.valueListSource,
                whatif_column: col.whatif_column || false,
                whatif: col.whatif,
                joins: col.joins || [],
                autorelation: col.autorelation,
                ranges: col.ranges || [],
                ia_medatada_permissions: col.ia_medatada_permissions,
                description: col.description || { default: '', localizad: [] },
                visible: true,
            };
        });

        return component.currentQuery
            .filter((col: any) => col.downChild)
            .map((col: any) => ({
                parentTable: col.table_id,
                parentColumn: col.column_name,
                childTable: col.downChild.table_id,
                childColumn: col.downChild.column_name,
                childDisplayName: col.downChild.display_name
            }));
    },
};
