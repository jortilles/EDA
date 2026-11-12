import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { HttpException } from '../global/model/index';
import { ObjectTransferService } from '../../services/object-transfer/object-transfer.service';
import { RemoteResponse, RemoteTransferService } from './remote-transfer.service';

type TransferType = 'datasource' | 'dashboard';

export class RemoteTransferController {

    /**
     * Logs in on the destination Edalitics instance.
     * The remote credentials are only forwarded to the destination, never stored.
     * Returns the resolved remote API URL and the remote token, which the client keeps in memory.
     */
    static async login(req: Request, res: Response, next: NextFunction) {
        try {
            const { url, email, password } = req.body || {};
            if (!email || !password) {
                return next(new HttpException(400, 'Remote email and password are required'));
            }

            const { apiUrl, token, user } = await RemoteTransferService.login(url, email, password);
            return res.status(200).json({
                ok: true,
                apiUrl,
                token,
                user: { name: user?.name, email: user?.email }
            });
        } catch (err) {
            next(err);
        }
    }

    /**
     * Sends a data model or a dashboard to the destination keeping its _id,
     * because dashboards reference their data model by _id (config.ds._id).
     * The object is read from the local database, never from the client, so the
     * datasource password is masked here and never leaves this server. Users and groups
     * are labelled with names / emails so the destination can match its own ones.
     */
    static async send(req: Request, res: Response, next: NextFunction) {
        try {
            const { apiUrl: rawApiUrl, token, type, id } = req.body || {};
            const transferType: TransferType = type;

            if (!token) return next(new HttpException(400, 'Remote token is required'));
            if (!['datasource', 'dashboard'].includes(transferType)) return next(new HttpException(400, 'Invalid object type'));
            if (!id || !mongoose.Types.ObjectId.isValid(id)) return next(new HttpException(400, 'Invalid object id'));

            const apiUrl = RemoteTransferService.checkApiUrl(rawApiUrl);

            const result = transferType === 'datasource'
                ? await RemoteTransferController.sendDataSource(apiUrl, token, id)
                : await RemoteTransferController.sendDashboard(apiUrl, token, id);

            return res.status(200).json({ ok: true, ...result });
        } catch (err) {
            next(err);
        }
    }

    private static async sendDataSource(apiUrl: string, token: string, id: string) {
        // Password masked and permissions labelled with names / emails: built from the local database
        const dataSource = await ObjectTransferService.buildDataSourceExport(id);
        if (!dataSource) throw new HttpException(404, 'Datasource not found');

        const response = await RemoteTransferService.request('POST', `${apiUrl}/datasource/import`, token, dataSource);
        RemoteTransferController.checkImportResponse(response, 'Error sending the datasource to the remote server');

        return {
            type: 'datasource',
            _id: id,
            name: dataSource.ds?.metadata?.model_name,
            created: !!response.body?.created,
            // A new model in the destination has no usable password until it is set there
            passwordRequired: !!response.body?.passwordRequired,
            permissions: response.body?.permissions,
            maps: response.body?.maps
        };
    }

    private static async sendDashboard(apiUrl: string, token: string, id: string) {
        const dashboard = await ObjectTransferService.buildDashboardExport(id);
        if (!dashboard) throw new HttpException(404, 'Dashboard not found');

        const response = await RemoteTransferService.request('POST', `${apiUrl}/dashboard/import`, token, dashboard);
        RemoteTransferController.checkImportResponse(response, 'Error sending the dashboard to the remote server');

        return {
            type: 'dashboard',
            _id: id,
            name: dashboard.config?.title,
            created: !!response.body?.created,
            ownerMatched: response.body?.ownerMatched,
            dataSourceMissing: !!response.body?.dataSourceMissing,
            permissions: response.body?.permissions
        };
    }

    /** Destinations running an older version have no import endpoints (Express answers an HTML 404). */
    private static checkImportResponse(response: RemoteResponse, fallback: string) {
        if (response.status === 404 && !response.isJson) {
            throw new HttpException(502, 'The remote server does not support receiving objects, Edalitics must be updated there');
        }
        if (response.status !== 200 && response.status !== 201) {
            throw RemoteTransferService.toHttpException(response, fallback);
        }
    }
}
