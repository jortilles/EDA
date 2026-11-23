import { parseStringPromise } from 'xml2js';
import { AggregationTypes } from '../../module/global/model/aggregation-types';

/**
 * Translates a Pentaho Mondrian 3.x OLAP schema (Schema Workbench XML) into an EDA data model.
 *
 * Mapping:
 *  - Cube fact <Table>/<View>          -> EDA table (fact) or EDA view
 *  - Hierarchy <Table>/<View>/<Join>   -> EDA tables (dimension) + relations for every <Join>
 *  - Dimension foreignKey/primaryKey   -> EDA relation fact -> dimension
 *  - Level / Property                  -> column display names, descriptions, types and visibility
 *  - Level <KeyExpression>/<NameExpression> -> EDA computed column
 *  - Measure (sum over a column)       -> fact column labelled with the measure name
 *  - Measure (other aggregators / <MeasureExpression>) -> EDA computed column with the aggregate
 *  - CalculatedMember (MDX), NamedSet, VirtualCube   -> not translatable, reported as warnings
 *
 * The translation is done in two steps so that the caller can introspect the physical database
 * in the middle (column types and the full list of columns come from the database):
 *  1. parseMondrianSchema()  -> intermediate MondrianModel (tables, column references, relations)
 *  2. buildEdaTables()       -> EDA tables, merged with the introspected tables when available
 */

type EdaColumnType = 'text' | 'numeric' | 'date';

interface XmlNode {
    '#name': string;
    $?: Record<string, string>;
    $$?: XmlNode[];
    _?: string;
}

interface ColumnRef {
    /** Candidate EDA tables, in priority order. The first one containing the column wins. */
    tables: string[];
    column: string;
    label: string;
    description?: string;
    type?: EdaColumnType;
    visible: boolean;
    /** Lower value = stronger label (a measure or level caption beats a key column label). */
    priority: number;
    decimals?: number;
}

interface ComputedRef {
    table: string;
    name: string;
    label: string;
    description?: string;
    sql: string;
    type: EdaColumnType;
    visible: boolean;
    decimals: number | null;
}

interface RelationRef {
    sourceTable: string;
    sourceColumn: string;
    targetTable: string;
    targetColumn: string;
}

interface PhysicalTable {
    name: string;
    kind: 'fact' | 'dimension' | 'view';
    /** SQL query when the table is a Mondrian <View>. */
    query?: string;
    label?: string;
    description?: string;
    labelSource?: 'fact' | 'dimension';
}

export interface MondrianModel {
    schemaName: string;
    tables: Map<string, PhysicalTable>;
    columnRefs: ColumnRef[];
    computedRefs: ComputedRef[];
    relations: RelationRef[];
    warnings: string[];
    cubes: string[];
}

export interface MondrianParseOptions {
    /** EDA connection type (postgres, mysql, sqlserver...). Used to pick the SQL dialect and quoting. */
    connectionType: string;
    /** Connection schema, used only to warn about tables living in another schema. */
    connectionSchema?: string;
}

export interface MondrianBuildOptions {
    /** Hide the database columns that are not referenced by the Mondrian schema. */
    hideUnmapped: boolean;
}

/** Mondrian dialect names accepted for each EDA connection type, in priority order. */
const DIALECTS_BY_CONNECTION: Record<string, string[]> = {
    postgres: ['postgres', 'postgresql'],
    mysql: ['mysql', 'mariadb'],
    sqlserver: ['mssql', 'sqlserver'],
    oracle: ['oracle'],
    snowflake: ['snowflake'],
    bigquery: ['bigquery'],
    vertica: ['vertica'],
    clickhouse: ['clickhouse'],
    duckdb: ['duckdb', 'postgres', 'postgresql']
};

const AGGREGATORS: Record<string, string> = {
    'sum': 'sum',
    'count': 'count',
    'min': 'min',
    'max': 'max',
    'avg': 'avg',
    'distinct count': 'count_distinct',
    'distinct-count': 'count_distinct'
};

export class MondrianTranslatorService {

    /* ------------------------------------------------------------------------------------------ */
    /* Step 1: parse the XML schema                                                                */
    /* ------------------------------------------------------------------------------------------ */

    static async parseMondrianSchema(xml: string, options: MondrianParseOptions): Promise<MondrianModel> {
        let parsed: any;
        try {
            parsed = await parseStringPromise(xml, {
                explicitChildren: true,
                preserveChildrenOrder: true,
                explicitArray: true,
                trim: true
            });
        } catch (err) {
            throw new MondrianSchemaError(`Invalid XML: ${err.message}`);
        }

        const root: XmlNode = parsed?.Schema;
        if (!root) {
            throw new MondrianSchemaError('The file is not a Mondrian schema: the <Schema> root element was not found');
        }
        if (String(root.$?.metamodelVersion || '').startsWith('4') || this.children(root, 'PhysicalSchema').length) {
            throw new MondrianSchemaError('Mondrian 4 schemas are not supported. Export the schema in Mondrian 3 format (Schema Workbench)');
        }

        const parser = new SchemaParser(root, options);
        return parser.parse();
    }

    /* ------------------------------------------------------------------------------------------ */
    /* Step 2: build the EDA tables                                                                */
    /* ------------------------------------------------------------------------------------------ */

    /**
     * @param model        Result of parseMondrianSchema()
     * @param introspected EDA tables generated from the database (manager.generateDataModel), or [] if unavailable
     */
    static buildEdaTables(model: MondrianModel, introspected: any[], options: MondrianBuildOptions): any[] {
        const dbTables = new Map<string, any>();
        (introspected || []).forEach(t => dbTables.set(String(t.table_name).toLowerCase(), t));

        const edaTables = new Map<string, any>();

        // 1. Base tables: the introspected one when it exists, otherwise an empty shell
        model.tables.forEach((physical, key) => {
            const dbTable = dbTables.get(key.toLowerCase());
            let table: any;
            if (dbTable && physical.kind !== 'view') {
                table = JSON.parse(JSON.stringify(dbTable));
                table.columns.forEach(c => c.visible = !options.hideUnmapped);
            } else {
                if (physical.kind !== 'view' && introspected?.length) {
                    model.warnings.push(`Table "${physical.name}" was not found in the database. Its columns are built from the schema only`);
                }
                const defaultLabel = this.normalizeName(physical.name);
                table = {
                    table_name: physical.name,
                    display_name: { default: defaultLabel, localized: [] },
                    description: { default: defaultLabel, localized: [] },
                    table_granted_roles: [],
                    columns: [],
                    visible: true,
                    tableCount: 0
                };
            }
            table.table_type = physical.kind === 'view' ? 'view' : physical.kind;
            if (physical.query) table.query = physical.query;
            if (physical.label) table.display_name = { default: physical.label, localized: [] };
            table.description = { default: physical.description || table.display_name.default, localized: [] };
            table.relations = [];
            table.visible = true;
            edaTables.set(key, table);
        });

        const findColumn = (table: any, column: string) =>
            table?.columns.find(c => String(c.column_name).toLowerCase() === column.toLowerCase());

        // 2. Column references (levels, properties, measures, keys)
        const labelPriority = new Map<any, number>();
        model.columnRefs.forEach(ref => {
            const candidates = ref.tables.filter(t => edaTables.has(t));
            if (!candidates.length) return;
            const tableName = candidates.find(t => findColumn(edaTables.get(t), ref.column)) || candidates[0];
            const table = edaTables.get(tableName);
            let column = findColumn(table, ref.column);
            if (!column) {
                if (dbTables.has(tableName.toLowerCase())) {
                    model.warnings.push(`Column "${tableName}.${ref.column}" was not found in the database`);
                }
                column = this.newColumn(ref.column, ref.type || 'text', this.normalizeName(ref.column), ref.decimals);
                table.columns.push(column);
            } else if (!dbTables.has(tableName.toLowerCase()) && ref.type && ref.type !== column.column_type) {
                // Column created from the schema: a later reference may give a better type
                this.setColumnType(column, ref.type, ref.decimals);
            }

            const current = labelPriority.get(column);
            const wasMapped = current !== undefined;
            if (!wasMapped || ref.priority < current) {
                labelPriority.set(column, ref.priority);
                const label = ref.label || this.normalizeName(column.column_name);
                column.display_name = { default: label, localized: [] };
                column.description = { default: ref.description || label, localized: [] };
                if (ref.decimals !== undefined && column.column_type === 'numeric') {
                    column.minimumFractionDigits = ref.decimals;
                }
            }
            // A column is visible when any of the Mondrian elements mapping it is visible
            column.visible = (wasMapped && column.visible === true) || ref.visible;
        });

        // 3. Computed columns (measures with an aggregate, SQL expressions)
        model.computedRefs.forEach(ref => {
            const table = edaTables.get(ref.table);
            if (!table) return;
            let name = ref.name;
            let i = 2;
            while (findColumn(table, name)) name = `${ref.name}_${i++}`;
            const column = this.newColumn(name, ref.type, ref.label, ref.decimals);
            column.description = { default: ref.description || ref.label, localized: [] };
            column.computed_column = 'computed';
            column.SQLexpression = ref.sql;
            column.aggregation_type = [{ value: 'none', display_name: 'No' }];
            column.visible = ref.visible;
            table.columns.push(column);
        });

        // 4. Relations, in both directions, with the real column names
        const relationKeys = new Set<string>();
        const addRelation = (source: any, srcCol: string, target: any, tgtCol: string) => {
            // Use the real (database) table names: Oracle/Snowflake may return them in upper case
            const key = `${source.table_name}.${srcCol}->${target.table_name}.${tgtCol}`;
            if (relationKeys.has(key)) return;
            relationKeys.add(key);
            source.relations.push({
                source_table: source.table_name,
                source_column: [srcCol],
                target_table: target.table_name,
                target_column: [tgtCol],
                visible: true
            });
        };
        model.relations.forEach(rel => {
            const source = edaTables.get(rel.sourceTable);
            const target = edaTables.get(rel.targetTable);
            if (!source || !target || rel.sourceTable === rel.targetTable) return;
            const sourceColumn = this.ensureKeyColumn(source, rel.sourceColumn, model, dbTables);
            const targetColumn = this.ensureKeyColumn(target, rel.targetColumn, model, dbTables);
            addRelation(source, sourceColumn, target, targetColumn);
            addRelation(target, targetColumn, source, sourceColumn);
        });

        return Array.from(edaTables.values());
    }

    /** Returns the real (database) name of a relation key column, creating a hidden column when missing. */
    private static ensureKeyColumn(table: any, column: string, model: MondrianModel, dbTables: Map<string, any>): string {
        const existing = table.columns.find(c => String(c.column_name).toLowerCase() === column.toLowerCase());
        if (existing) return existing.column_name;
        if (dbTables.has(String(table.table_name).toLowerCase())) {
            model.warnings.push(`Relation key "${table.table_name}.${column}" was not found in the database`);
        }
        const created = this.newColumn(column, 'text', this.normalizeName(column), null);
        created.visible = false;
        table.columns.push(created);
        return column;
    }

    private static newColumn(name: string, type: EdaColumnType, label: string, decimals?: number | null): any {
        const column: any = {
            column_name: name,
            display_name: { default: label, localized: [] },
            description: { default: label, localized: [] },
            computed_column: 'no',
            column_granted_roles: [],
            row_granted_roles: [],
            visible: true,
            ia_visibility: 'FULL',
            tableCount: 0
        };
        this.setColumnType(column, type, decimals);
        return column;
    }

    private static setColumnType(column: any, type: EdaColumnType, decimals?: number | null) {
        column.column_type = type;
        column.aggregation_type = type === 'numeric'
            ? AggregationTypes.getValuesForNumbers()
            : type === 'date' ? AggregationTypes.getValuesForOthers() : AggregationTypes.getValuesForText();
        column.minimumFractionDigits = type === 'numeric' ? (decimals ?? 0) : null;
    }

    /** Same label style as the database connectors: "product_class" -> "Product Class". */
    private static normalizeName(name: string): string {
        return String(name).split('_').filter(Boolean)
            .map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()).join(' ') || String(name);
    }

    static children(node: XmlNode, ...names: string[]): XmlNode[] {
        return (node?.$$ || []).filter(c => names.includes(c['#name']));
    }

    /**
     * Distinct physical table names referenced by the schema (views excluded), used as the introspection filter.
     * Names that could break the connectors' LIKE filter (quotes, commas) are left out.
     */
    static physicalTableNames(model: MondrianModel): string[] {
        return Array.from(model.tables.values())
            .filter(t => t.kind !== 'view' && /^[^',;\\]+$/.test(t.name))
            .map(t => t.name);
    }

    /** True when the EDA connection type is a SQL database the translator can work with. */
    static isSupportedConnection(connectionType: string): boolean {
        return !!DIALECTS_BY_CONNECTION[connectionType];
    }
}

export class MondrianSchemaError extends Error { }

/**
 * Stateful walker over the Mondrian <Schema> element.
 */
class SchemaParser {
    private model: MondrianModel;
    private sharedDimensions = new Map<string, XmlNode>();
    private dialects: string[];
    /** Physical columns already claimed by a "sum" measure, so a second measure becomes a computed column. */
    private claimedMeasureColumns = new Set<string>();

    constructor(private root: XmlNode, private options: MondrianParseOptions) {
        this.dialects = DIALECTS_BY_CONNECTION[options.connectionType] || [];
        this.model = {
            schemaName: root.$?.name || 'Mondrian',
            tables: new Map(),
            columnRefs: [],
            computedRefs: [],
            relations: [],
            warnings: [],
            cubes: []
        };
    }

    parse(): MondrianModel {
        const ch = MondrianTranslatorService.children;
        ch(this.root, 'Dimension').forEach(d => this.sharedDimensions.set(d.$?.name, d));

        const cubes = ch(this.root, 'Cube');
        if (!cubes.length) {
            throw new MondrianSchemaError('The Mondrian schema does not contain any <Cube>');
        }
        cubes.forEach(cube => this.parseCube(cube));

        ch(this.root, 'VirtualCube').forEach(vc =>
            this.model.warnings.push(`Virtual cube "${vc.$?.name}" skipped: its base cubes are imported individually`));
        ch(this.root, 'Role').forEach(role =>
            this.model.warnings.push(`Security role "${role.$?.name}" skipped: configure the permissions in the EDA data model`));

        if (!this.model.tables.size) {
            throw new MondrianSchemaError('No tables could be translated from the Mondrian schema');
        }
        return this.model;
    }

    /* ------------------------------------------------------------------------------------------ */

    private parseCube(cube: XmlNode) {
        const ch = MondrianTranslatorService.children;
        const cubeName = cube.$?.name;
        if (cube.$?.enabled === 'false') {
            this.model.warnings.push(`Cube "${cubeName}" skipped: it is disabled`);
            return;
        }

        const scope = new Map<string, string>();
        const factNode = ch(cube, 'Table', 'View', 'InlineTable')[0];
        const factTables = factNode ? this.parseRelation(factNode, 'fact', scope) : [];
        if (!factTables.length) {
            this.model.warnings.push(`Cube "${cubeName}" skipped: it has no fact table`);
            return;
        }
        const fact = factTables[0];
        this.model.cubes.push(cubeName);
        this.labelTable(fact, this.caption(cube), this.description(cube), true);

        ch(cube, 'Dimension', 'DimensionUsage').forEach(dim => {
            if (dim['#name'] === 'DimensionUsage') {
                const shared = this.sharedDimensions.get(dim.$?.source);
                if (!shared) {
                    this.model.warnings.push(`Cube "${cubeName}": shared dimension "${dim.$?.source}" not found`);
                    return;
                }
                const caption = dim.$?.caption || dim.$?.name || this.caption(shared);
                this.parseDimension(shared, fact, dim.$?.foreignKey, caption, dim.$?.visible !== 'false', scope);
            } else {
                this.parseDimension(dim, fact, dim.$?.foreignKey, this.caption(dim), dim.$?.visible !== 'false', scope);
            }
        });

        ch(cube, 'Measure').forEach(m => this.parseMeasure(m, fact, scope));

        ch(cube, 'CalculatedMember').forEach(cm =>
            this.model.warnings.push(`Cube "${cubeName}": calculated member "${cm.$?.name}" skipped (MDX formulas cannot be translated to SQL)`));
        ch(cube, 'NamedSet').forEach(ns =>
            this.model.warnings.push(`Cube "${cubeName}": named set "${ns.$?.name}" skipped`));
    }

    private parseDimension(dim: XmlNode, fact: string, foreignKey: string, dimCaption: string, visible: boolean, cubeScope: Map<string, string>) {
        const ch = MondrianTranslatorService.children;
        const hierarchies = ch(dim, 'Hierarchy');
        if (!hierarchies.length) {
            this.model.warnings.push(`Dimension "${dimCaption}" skipped: it has no hierarchy`);
            return;
        }

        hierarchies.forEach(h => {
            // Each hierarchy has its own alias scope, seeded with the fact table aliases
            const scope = new Map(cubeScope);
            const relationNode = ch(h, 'Table', 'View', 'Join', 'InlineTable')[0];
            const tables = relationNode ? this.parseRelation(relationNode, 'dimension', scope) : [];
            const degenerate = !relationNode;
            if (relationNode && !tables.length) return; // InlineTable or invalid relation, already warned

            const hierarchyTables = degenerate ? [fact] : tables;
            const pkTable = h.$?.primaryKeyTable ? this.resolveAlias(h.$.primaryKeyTable, scope) : hierarchyTables[0];

            if (!degenerate) {
                if (!foreignKey) {
                    this.model.warnings.push(`Dimension "${dimCaption}" has no foreignKey: no relation was created with the fact table "${fact}"`);
                } else {
                    const primaryKey = h.$?.primaryKey || foreignKey;
                    if (!h.$?.primaryKey) {
                        this.model.warnings.push(`Dimension "${dimCaption}" has no primaryKey: "${foreignKey}" is assumed`);
                    }
                    this.model.relations.push({ sourceTable: fact, sourceColumn: foreignKey, targetTable: pkTable, targetColumn: primaryKey });
                }
                const hasMultipleHierarchies = hierarchies.length > 1 && h.$?.name;
                this.labelTable(pkTable, hasMultipleHierarchies ? `${dimCaption} - ${h.$?.caption || h.$.name}` : dimCaption, this.description(dim), false);
            }

            const visibleHierarchy = visible && h.$?.visible !== 'false';
            ch(h, 'Level').forEach(level => this.parseLevel(level, hierarchyTables, pkTable, visibleHierarchy, scope));
        });
    }

    private parseLevel(level: XmlNode, hierarchyTables: string[], defaultTable: string, visible: boolean, scope: Map<string, string>) {
        const ch = MondrianTranslatorService.children;
        const caption = this.caption(level);
        const description = this.description(level);
        const levelVisible = visible && level.$?.visible !== 'false';
        const type = this.levelType(level.$?.type);
        const candidates = level.$?.table
            ? [this.resolveAlias(level.$.table, scope)]
            : [defaultTable, ...hierarchyTables.filter(t => t !== defaultTable)];

        const keyColumn = level.$?.column;
        const nameColumn = level.$?.captionColumn || level.$?.nameColumn;
        const ref = (column: string, label: string, priority: number, colType?: EdaColumnType, colVisible = levelVisible) =>
            this.model.columnRefs.push({ tables: candidates, column, label, description, type: colType, visible: colVisible, priority });

        // The key is suffixed when a name/caption (column or SQL expression) also exists
        const hasName = (!!nameColumn && nameColumn !== keyColumn) || ch(level, 'NameExpression', 'CaptionExpression').length > 0;
        if (nameColumn && nameColumn !== keyColumn) ref(nameColumn, caption, 1, 'text');
        if (keyColumn) ref(keyColumn, hasName ? `${caption} (ID)` : caption, hasName ? 2 : 1, type);
        if (level.$?.ordinalColumn && level.$.ordinalColumn !== keyColumn) {
            ref(level.$.ordinalColumn, `${caption} (#)`, 3, undefined, false);
        }

        // SQL expressions instead of columns
        const expressions: Array<[string, string, EdaColumnType]> = [
            ['KeyExpression', hasName ? `${caption} (ID)` : caption, type],
            ['NameExpression', caption, 'text'],
            ['CaptionExpression', caption, 'text']
        ];
        expressions.forEach(([tag, label, exprType]) => {
            const node = ch(level, tag)[0];
            if (!node) return;
            const sql = this.pickSql(node, `Level "${caption}" ${tag}`);
            if (!sql) return;
            this.model.computedRefs.push({
                table: candidates[0],
                name: this.technicalName(label),
                label,
                description,
                sql,
                type: exprType,
                visible: levelVisible,
                decimals: exprType === 'numeric' ? 0 : null
            });
        });

        ch(level, 'Property').forEach(p => {
            if (!p.$?.column) return;
            this.model.columnRefs.push({
                tables: candidates,
                column: p.$.column,
                label: this.caption(p),
                description: this.description(p),
                type: this.levelType(p.$?.type),
                visible: levelVisible,
                priority: 2
            });
        });
    }

    private parseMeasure(measure: XmlNode, fact: string, scope: Map<string, string>) {
        const ch = MondrianTranslatorService.children;
        const caption = this.caption(measure);
        const description = this.description(measure);
        const visible = measure.$?.visible !== 'false';
        const rawAggregator = String(measure.$?.aggregator || 'sum').toLowerCase();
        const aggregator = AGGREGATORS[rawAggregator];
        if (!aggregator) {
            this.model.warnings.push(`Measure "${caption}" skipped: unsupported aggregator "${rawAggregator}"`);
            return;
        }
        const decimals = this.decimalsFromFormat(measure.$?.formatString, aggregator);
        const column = measure.$?.column;
        const expressionNode = ch(measure, 'MeasureExpression')[0];

        // Plain sum over a fact column: label the column itself
        if (column && !expressionNode && aggregator === 'sum') {
            const key = `${fact}.${column}`.toLowerCase();
            if (!this.claimedMeasureColumns.has(key)) {
                this.claimedMeasureColumns.add(key);
                this.model.columnRefs.push({ tables: [fact], column, label: caption, description, type: 'numeric', visible, priority: 0, decimals });
                return;
            }
        }

        // Any other measure: computed column holding the aggregate
        let expression: string;
        if (expressionNode) {
            expression = this.pickSql(expressionNode, `Measure "${caption}"`);
            if (!expression) return;
            expression = this.replaceAliases(expression, scope);
        } else if (column) {
            expression = `${this.quote(fact)}.${this.quote(column)}`;
            // Keep the raw column available, hidden unless something else maps it
            this.model.columnRefs.push({ tables: [fact], column, label: '', type: 'numeric', visible: false, priority: 9 });
        } else if (aggregator === 'count') {
            expression = '*';
        } else {
            this.model.warnings.push(`Measure "${caption}" skipped: it has no column nor expression`);
            return;
        }

        const sql = aggregator === 'count_distinct'
            ? `COUNT(DISTINCT ${expression})`
            : `${aggregator.toUpperCase()}(${expression})`;

        this.model.computedRefs.push({
            table: fact,
            name: this.technicalName(caption),
            label: caption,
            description,
            sql,
            type: 'numeric',
            visible,
            decimals
        });
    }

    /* ------------------------------------------------------------------------------------------ */
    /* Relations: <Table>, <View>, <Join>, <InlineTable>                                           */
    /* ------------------------------------------------------------------------------------------ */

    /** Registers the tables of a relation element and returns their EDA names, leftmost first. */
    private parseRelation(node: XmlNode, kind: 'fact' | 'dimension', scope: Map<string, string>): string[] {
        const ch = MondrianTranslatorService.children;
        switch (node['#name']) {
            case 'Table': {
                const name = node.$?.name;
                if (!name) return [];
                const schema = node.$?.schema;
                if (schema && this.options.connectionSchema && schema.toLowerCase() !== this.options.connectionSchema.toLowerCase()) {
                    this.model.warnings.push(`Table "${schema}.${name}" belongs to schema "${schema}" but the connection uses "${this.options.connectionSchema}"`);
                }
                if (ch(node, 'SQL').length) {
                    this.model.warnings.push(`Table "${name}": the <SQL> filter was ignored. Use an EDA view or row permissions instead`);
                }
                this.registerTable(name, kind);
                scope.set(name, name);
                if (node.$?.alias) scope.set(node.$.alias, name);
                return [name];
            }
            case 'View': {
                const alias = node.$?.alias;
                const sql = this.pickSql(node, `View "${alias}"`);
                if (!alias || !sql) return [];
                const name = this.technicalName(alias);
                this.registerTable(name, 'view', `(${sql.replace(/;\s*$/, '')}) as ${name}`);
                scope.set(alias, name);
                scope.set(name, name);
                return [name];
            }
            case 'Join': {
                const [leftNode, rightNode] = ch(node, 'Table', 'View', 'Join', 'InlineTable');
                if (!leftNode || !rightNode) return [];
                const left = this.parseRelation(leftNode, kind, scope);
                const right = this.parseRelation(rightNode, kind, scope);
                if (!left.length || !right.length) return [...left, ...right];
                const leftTable = node.$?.leftAlias ? this.resolveAlias(node.$.leftAlias, scope) : left[0];
                const rightTable = node.$?.rightAlias ? this.resolveAlias(node.$.rightAlias, scope) : right[0];
                if (node.$?.leftKey && node.$?.rightKey) {
                    this.model.relations.push({ sourceTable: leftTable, sourceColumn: node.$.leftKey, targetTable: rightTable, targetColumn: node.$.rightKey });
                } else {
                    this.model.warnings.push(`Join between "${leftTable}" and "${rightTable}" skipped: leftKey/rightKey missing`);
                }
                return [...left, ...right];
            }
            case 'InlineTable':
                this.model.warnings.push(`Inline table "${node.$?.alias}" skipped: inline tables are not supported`);
                return [];
            default:
                return [];
        }
    }

    private registerTable(name: string, kind: 'fact' | 'dimension' | 'view', query?: string) {
        const existing = this.model.tables.get(name);
        if (!existing) {
            this.model.tables.set(name, { name, kind, query });
        } else if (kind === 'fact' && existing.kind === 'dimension') {
            existing.kind = 'fact';
        }
    }

    /** Sets the table label once. The first cube label wins over any dimension label. */
    private labelTable(name: string, label: string, description: string, isFact: boolean) {
        const table = this.model.tables.get(name);
        if (!table || !label || table.labelSource === 'fact') return;
        if (!isFact && table.labelSource) return;
        table.label = label;
        table.description = description;
        table.labelSource = isFact ? 'fact' : 'dimension';
    }

    private resolveAlias(alias: string, scope: Map<string, string>): string {
        return scope.get(alias) || alias;
    }

    /** Replaces quoted table aliases in an SQL expression with the real table name. */
    private replaceAliases(sql: string, scope: Map<string, string>): string {
        let result = sql;
        scope.forEach((table, alias) => {
            if (alias === table) return;
            const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            result = result.replace(new RegExp(`(["\`\\[])${escaped}(["\`\\]])\\.`, 'g'), `$1${table}$2.`);
        });
        return result;
    }

    /* ------------------------------------------------------------------------------------------ */
    /* Helpers                                                                                     */
    /* ------------------------------------------------------------------------------------------ */

    /** Picks the <SQL> child matching the connection dialect, then "generic", then the first one. */
    private pickSql(node: XmlNode, context: string): string | null {
        const sqls = MondrianTranslatorService.children(node, 'SQL').filter(s => (s._ || '').trim());
        if (!sqls.length) {
            this.model.warnings.push(`${context}: no SQL expression found`);
            return null;
        }
        const byDialect = (d: string) => sqls.find(s => String(s.$?.dialect || 'generic').toLowerCase() === d);
        const chosen = this.dialects.map(byDialect).find(Boolean) || byDialect('generic') || sqls[0];
        const chosenDialect = String(chosen.$?.dialect || 'generic').toLowerCase();
        if (chosenDialect !== 'generic' && !this.dialects.includes(chosenDialect)) {
            this.model.warnings.push(`${context}: SQL written for dialect "${chosenDialect}" was used, review it`);
        }
        return chosen._.trim();
    }

    private quote(identifier: string): string {
        switch (this.options.connectionType) {
            case 'mysql':
            case 'bigquery':
            case 'clickhouse':
                return `\`${identifier}\``;
            case 'sqlserver':
                return `[${identifier}]`;
            default:
                return `"${identifier}"`;
        }
    }

    private levelType(type: string): EdaColumnType | undefined {
        switch (String(type || '').toLowerCase()) {
            case 'numeric':
            case 'integer':
                return 'numeric';
            case 'date':
            case 'time':
            case 'timestamp':
                return 'date';
            case 'string':
            case 'boolean':
                return 'text';
            default:
                return undefined;
        }
    }

    private decimalsFromFormat(format: string, aggregator: string): number {
        if (aggregator === 'count' || aggregator === 'count_distinct') return 0;
        if (!format) return 2;
        const match = format.match(/\.([0#]+)/);
        return match ? match[1].length : 0;
    }

    private caption(node: XmlNode): string {
        return node.$?.caption || node.$?.name || '';
    }

    private description(node: XmlNode): string | undefined {
        return node.$?.description || undefined;
    }

    private technicalName(label: string): string {
        const name = String(label)
            .normalize('NFD').replace(/[̀-ͯ]/g, '')
            .replace(/[^a-zA-Z0-9_]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .toLowerCase();
        return name || 'column';
    }
}
