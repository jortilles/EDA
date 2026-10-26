import * as crypto from 'crypto';
import * as mongoose from 'mongoose';
import { Client } from 'pg';
import DataSource from '../../module/datasource/model/datasource.model';
import Dashboard from '../../module/dashboard/model/dashboard.model';
import { IUser } from '../../module/admin/users/model/user.model';
import { EnCrypterService } from '../../services/encrypter/encrypter.service';
import { AggregationTypes } from '../../module/global/model/aggregation-types';
import { ownerOnlyGrantedRoles } from '../../utils/model-owner-security.util';

const cache_config = require('../../../config/cache.config');

const SAMPLE_SQL = [
    'CREATE TABLE customers (id INT NOT NULL, name VARCHAR(255) NOT NULL, sales_id INT NOT NULL)',
    `INSERT INTO customers (id, name, sales_id) VALUES
        (1, 'John', 1), (2, 'Mike', 2), (3, 'Pete', 3), (4, 'Travis', 4), (5, 'Don', 5), (6, 'Tucker', 6)`,
    'CREATE TABLE sales (id INT NOT NULL, salesdate DATE NOT NULL, product VARCHAR(255) NOT NULL, salesvalue INT NOT NULL, customers_id INT NOT NULL)',
    `INSERT INTO sales (id, salesdate, product, salesvalue, customers_id) VALUES
        (1, '2021-01-01', 'Car', 3500, 1), (2, '2022-02-02', 'Plane', 4500, 2), (3, '2022-03-03', 'Tractor', 5500, 3),
        (4, '2022-04-04', 'Motorbyke', 6900, 4), (5, '2022-05-05', 'Bus', 7800, 5), (6, '2022-06-06', 'Truck', 8600, 6),
        (4, '2021-04-04', 'Motorbyke', 6500, 4), (5, '2021-05-05', 'Bus', 7500, 5), (6, '2021-06-06', 'Truck', 8500, 6)`
];

/**
 * Gives a new user something to start with: a Postgres database with sample tables,
 * a data model on it and a dashboard. Same content the old get.edalitics.com app created.
 */
export class SampleWorkspaceService {

    static async create(user: IUser, cfg: any): Promise<void> {
        const dbName = SampleWorkspaceService.databaseName(String(user.email));
        const dbPassword = crypto.randomBytes(18).toString('base64url');

        await SampleWorkspaceService.createDatabase(dbName, dbPassword, cfg);

        const dataSource = await new DataSource({
            ds: {
                connection: {
                    type: 'postgres',
                    host: cfg.datasourceHost || cfg.host,
                    port: cfg.datasourcePort || cfg.port,
                    database: dbName,
                    schema: 'public',
                    searchPath: 'public',
                    user: dbName,
                    password: EnCrypterService.encrypt(dbPassword),
                    sid: 1,
                    warehouse: null
                },
                metadata: {
                    model_name: dbName,
                    model_description: '',
                    model_id: '',
                    model_granted_roles: ownerOnlyGrantedRoles(user),
                    optimized: false,
                    cache_config: cache_config.DEFAULT_CACHE_CONFIG,
                    filter: null,
                    model_owner: user._id,
                    properties: null,
                    ia_visibility: 'FULL'
                },
                model: { tables: SampleWorkspaceService.modelTables() }
            }
        }).save();

        await new Dashboard(SampleWorkspaceService.sampleDashboard(user, String(dataSource._id))).save();
    }

    /** Postgres identifier from the email: [a-z0-9_] plus a random suffix so two users never collide. */
    static databaseName(email: string): string {
        const base = email.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);
        return `edl_${base}_${crypto.randomBytes(3).toString('hex')}`;
    }

    private static async createDatabase(dbName: string, dbPassword: string, cfg: any): Promise<void> {
        const admin = new Client({ host: cfg.host, port: cfg.port, user: cfg.user, password: cfg.password, database: 'postgres' });
        await admin.connect();
        try {
            const ident = admin.escapeIdentifier(dbName);
            await admin.query(`CREATE USER ${ident} WITH PASSWORD ${admin.escapeLiteral(dbPassword)}`);
            await admin.query(`CREATE DATABASE ${ident} OWNER ${ident}`);
            // Other users of the server must not reach this database
            await admin.query(`REVOKE CONNECT ON DATABASE ${ident} FROM PUBLIC`);
        } finally {
            await admin.end();
        }

        const owner = new Client({ host: cfg.host, port: cfg.port, user: dbName, password: dbPassword, database: dbName });
        await owner.connect();
        try {
            for (const sql of SAMPLE_SQL) await owner.query(sql);
        } finally {
            await owner.end();
        }
    }

    private static column(name: string, displayName: string, type: 'numeric' | 'text' | 'date', visible = true) {
        return {
            column_name: name,
            column_type: type,
            display_name: { default: displayName, localized: [] },
            description: { default: displayName, localized: [] },
            minimumFractionDigits: type === 'numeric' ? 0 : null,
            aggregation_type: type === 'numeric' ? AggregationTypes.getValuesForNumbers()
                : type === 'text' ? AggregationTypes.getValuesForText()
                : AggregationTypes.getValuesForOthers(),
            column_granted_roles: [],
            row_granted_roles: [],
            visible,
            tableCount: 0
        };
    }

    private static table(name: string, columns: any[], relations: any[]) {
        return {
            table_name: name,
            display_name: { default: name, localized: [] },
            description: { default: name, localized: [] },
            table_granted_roles: [],
            table_type: [],
            relations,
            no_relations: [],
            visible: true,
            tableCount: 0,
            columns
        };
    }

    private static modelTables(): any[] {
        const relation = (source: string, sourceCol: string, target: string, targetCol: string) =>
            ({ source_table: source, source_column: [sourceCol], target_table: target, target_column: [targetCol], visible: true });

        return [
            SampleWorkspaceService.table('sales', [
                SampleWorkspaceService.column('id', 'id', 'numeric', false),
                SampleWorkspaceService.column('salesdate', 'sales date', 'date'),
                SampleWorkspaceService.column('product', 'product', 'text'),
                SampleWorkspaceService.column('salesvalue', 'sales value', 'numeric'),
                SampleWorkspaceService.column('customers_id', 'customers_id', 'numeric')
            ], [relation('sales', 'customers_id', 'customers', 'id')]),
            SampleWorkspaceService.table('customers', [
                SampleWorkspaceService.column('id', 'id', 'numeric'),
                SampleWorkspaceService.column('name', 'name', 'text'),
                SampleWorkspaceService.column('sales_id', 'sales_id', 'numeric')
            ], [relation('customers', 'id', 'sales', 'customers_id')])
        ];
    }

    private static sampleDashboard(user: IUser, dataSourceId: string): any {
        const dashboardId = new mongoose.Types.ObjectId();
        const panelId = crypto.randomUUID();
        const field = (column_name: string, display_name: string, column_type: string, aggregation_type: string, order: number, extra: any = {}) => ({
            table_id: 'sales', column_name, display_name, column_type, aggregation_type,
            ordenation_type: 'No', order, column_granted_roles: [], row_granted_roles: [],
            tableCount: 0, minimumFractionDigits: column_type === 'numeric' ? 0 : null, ...extra
        });
        const font = { fontFamily: 'Montserrat', fontSize: 0, fontColor: '#455a64' };
        const now = new Date();

        return {
            _id: dashboardId,
            user: user._id,
            group: [],
            config: {
                title: 'Edalitics Sample Dashboard',
                author: user.name,
                createdAt: now,
                modifiedAt: now,
                panel: [{
                    dragAndDrop: true,
                    resizable: true,
                    tamanyMobil: { x: 0, y: 0, w: 0, h: 0 },
                    tamanyMig: { x: 0, y: 0, w: 0, h: 0 },
                    linkedDashboard: false,
                    id: panelId,
                    title: 'Sales by product',
                    type: 0,
                    w: 39, h: 17, x: 0, y: 0,
                    content: {
                        query: {
                            id: '1',
                            model_id: dataSourceId,
                            user: { user_id: String(user._id), user_roles: ['USER_ROLE'] },
                            dashboard: { dashboard_id: String(dashboardId), panel_id: panelId },
                            query: {
                                fields: [
                                    field('product', 'Product', 'text', 'none', 0),
                                    field('salesdate', 'Sales date', 'date', 'none', 1, { format: 'month' }),
                                    field('salesvalue', 'Sales value', 'numeric', 'sum', 2)
                                ],
                                filters: [],
                                simple: false
                            },
                            output: {
                                labels: ['product', 'salesdate', 'salesvalue'],
                                data: [],
                                config: { colors: null, chartType: 'bar', addTrend: false, addComparative: false, showLabels: false }
                            }
                        },
                        chart: 'bar',
                        edaChart: 'stackedbar'
                    }
                }],
                ds: { _id: dataSourceId },
                filters: [],
                applyToAllfilter: { present: false, refferenceTable: null, id: null },
                visible: 'private',
                tag: null,
                refreshTime: null,
                mailingAlertsEnabled: false,
                sendViaMailConfig: { enabled: false },
                styles: {
                    backgroundColor: '#f1f0f0',
                    panelColor: '#ffffff',
                    titleAlign: 'center',
                    panelTitleAlign: 'left',
                    title: font, filters: font, panelTitle: font, panelContent: font
                }
            }
        };
    }
}
