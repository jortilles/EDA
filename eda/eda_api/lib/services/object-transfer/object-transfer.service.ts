import mongoose from 'mongoose';
import DataSource from '../../module/datasource/model/datasource.model';
import Dashboard from '../../module/dashboard/model/dashboard.model';
import User from '../../module/admin/users/model/user.model';
import Group from '../../module/admin/groups/model/group.model';
import GeoJsonFile from '../../module/uploads/files/files.model';
import GeoJsonFeature from '../../module/uploads/files/feature.model';

/** Placeholder used by EDA to hide datasource passwords. An existing model keeps its stored password when it receives it. */
export const PASSWORD_MASK = '__-(··)-__';

/** Wildcard used by the permissions dialogs for "anyone". It is not a user id. */
const ALL_WILDCARD = '(~ => All)';

export interface ResolvedReference {
    name: string;
    email?: string;
    sourceId: string;
    targetId: string;
}

/**
 * Result of matching the users / groups of an imported object with the ones of this instance.
 * - remapped: found with a different id, the id has been replaced.
 * - unresolved: not found. The original id is kept on purpose (see resolveDataSourcePermissions).
 */
export interface PermissionsReport {
    users: { matched: number; remapped: ResolvedReference[]; unresolved: ResolvedReference[] };
    groups: { matched: number; remapped: ResolvedReference[]; unresolved: ResolvedReference[] };
}

/** Map (GeoJSON) uploaded to a data model, as it travels inside an exported model. */
export interface MapData {
    mapID: string;
    file: any;
    features: any[];
}

/** Result of importing the maps that travel with a data model. */
export interface MapsReport {
    /** Created in this instance */
    imported: string[];
    /** Already present in this instance (maps can not be edited once uploaded, so they are not overwritten) */
    existing: string[];
    /** Referenced by the model but not included in the payload nor present in this instance */
    missing: string[];
}

const FEATURES_BATCH_SIZE = 1000;

interface UserRef { _id: string; name: string; email: string; }
interface GroupRef { _id: string; name: string; role: string; }

/**
 * Builds the exportable version of dashboards and data models and resolves, on import,
 * the users and groups they reference. Ids are different in every Edalitics instance,
 * so on export every id is labelled with the current name (and email for users),
 * and on import those labels are used to find the matching user / group.
 */
export class ObjectTransferService {

    /* ------------------------------------------------------------------ */
    /* Export                                                             */
    /* ------------------------------------------------------------------ */

    /** Data model with the password masked and the permissions labelled with current names and emails. */
    static async buildDataSourceExport(id: string): Promise<any> {
        if (!mongoose.Types.ObjectId.isValid(id)) return null;
        const dataSource: any = await DataSource.findById(id).lean();
        if (!dataSource) return null;

        // The password never leaves this instance
        if (dataSource.ds?.connection) {
            dataSource.ds.connection.password = PASSWORD_MASK;
        }
        dataSource._id = String(dataSource._id);
        delete dataSource.__v;

        const permissions: any[] = dataSource.ds?.metadata?.model_granted_roles || [];
        const { users, groups } = await ObjectTransferService.loadReferences(
            permissions.flatMap(p => p.users || []),
            permissions.flatMap(p => p.groups || [])
        );

        for (const permission of permissions) {
            if (Array.isArray(permission.users)) {
                permission.usersName = permission.users.map((uid, i) => uid === ALL_WILDCARD ? ALL_WILDCARD : (users.get(String(uid))?.name ?? permission.usersName?.[i] ?? null));
                permission.usersEmail = permission.users.map(uid => uid === ALL_WILDCARD ? ALL_WILDCARD : (users.get(String(uid))?.email ?? null));
            }
            if (Array.isArray(permission.groups)) {
                permission.groupsName = permission.groups.map((gid, i) => groups.get(String(gid))?.name ?? permission.groupsName?.[i] ?? null);
            }
        }

        // Maps travel with the model: dashboards and columns reference them by mapID
        dataSource.mapsData = await ObjectTransferService.loadMapsData(dataSource.ds?.model?.maps || []);
        return dataSource;
    }

    /** Reads the GeoJSON files (and their features) of the given model maps. */
    private static async loadMapsData(maps: any[]): Promise<MapData[]> {
        const result: MapData[] = [];
        const ids = [...new Set(maps.map(m => String(m?.mapID || '')))].filter(id => mongoose.Types.ObjectId.isValid(id));

        for (const mapID of ids) {
            const file: any = await GeoJsonFile.findById(mapID).lean();
            if (!file) continue;
            const features = await GeoJsonFeature.find({ featureCollection: mapID }, 'feature').lean();
            result.push({ mapID, file: file.file, features: (features as any[]).map(f => f.feature) });
        }
        return result;
    }

    /** Dashboard labelled with the current names of its groups and owner. */
    static async buildDashboardExport(id: string): Promise<any> {
        if (!mongoose.Types.ObjectId.isValid(id)) return null;
        const dashboard: any = await Dashboard.findById(id).lean();
        if (!dashboard) return null;

        const groupIds = (dashboard.group || []).map(g => String(g));
        const { users, groups } = await ObjectTransferService.loadReferences(dashboard.user ? [dashboard.user] : [], groupIds);
        const owner = dashboard.user ? users.get(String(dashboard.user)) : null;

        return {
            _id: String(dashboard._id),
            config: dashboard.config,
            group: groupIds,
            groupsName: groupIds.map(gid => groups.get(gid)?.name ?? null),
            user: dashboard.user ? String(dashboard.user) : null,
            userName: owner?.name ?? null,
            userEmail: owner?.email ?? null
        };
    }

    /* ------------------------------------------------------------------ */
    /* Import                                                             */
    /* ------------------------------------------------------------------ */

    /**
     * Replaces, in place, the user / group ids of the model permissions with the ids of this instance.
     *
     * Unresolved references keep their original id ON PURPOSE: EDA permissions also work by exclusion
     * (e.g. "only X can see this table" hides the table to everybody else, and a model without
     * permissions is open to everyone). Removing an unknown user / group could therefore open data
     * to everybody, while keeping an id that matches nobody here preserves the original restriction.
     */
    static async resolveDataSourcePermissions(body: any): Promise<PermissionsReport> {
        const report = ObjectTransferService.emptyReport();
        const permissions: any[] = body?.ds?.metadata?.model_granted_roles || [];
        if (!permissions.length) return report;

        const lookup = await ObjectTransferService.loadLookup();
        const userCache = new Map<string, ResolvedReference>();
        const groupCache = new Map<string, ResolvedReference>();

        for (const permission of permissions) {
            if (Array.isArray(permission.users)) {
                const names: string[] = [];
                permission.users = permission.users.map((uid, i) => {
                    if (uid === ALL_WILDCARD) {
                        names.push(ALL_WILDCARD);
                        return uid;
                    }
                    const ref = ObjectTransferService.resolveUser(lookup, String(uid), permission.usersName?.[i], permission.usersEmail?.[i], userCache, report);
                    names.push(ref.name);
                    return ref.targetId;
                });
                permission.usersName = names;
            }
            if (Array.isArray(permission.groups)) {
                const names: string[] = [];
                permission.groups = permission.groups.map((gid, i) => {
                    const ref = ObjectTransferService.resolveGroup(lookup, String(gid), permission.groupsName?.[i], groupCache, report);
                    names.push(ref.name);
                    return ref.targetId;
                });
                permission.groupsName = names;
            }
            // Export only label: it is not part of the stored model
            delete permission.usersEmail;
        }
        return report;
    }

    /**
     * Creates, keeping their mapID, the maps referenced by an imported model that do not exist in this instance.
     * Removes `mapsData` from the body, because it is not part of the stored model.
     */
    static async importMaps(body: any): Promise<MapsReport> {
        const report: MapsReport = { imported: [], existing: [], missing: [] };
        const mapsData: MapData[] = Array.isArray(body?.mapsData) ? body.mapsData : [];
        delete body.mapsData;

        const modelMaps: any[] = body?.ds?.model?.maps || [];
        const nameOf = (mapID: string) => modelMaps.find(m => String(m?.mapID) === mapID)?.name || mapID;

        const ids = [...new Set(modelMaps.map(m => String(m?.mapID || '')))].filter(Boolean);
        for (const mapID of ids) {
            if (!mongoose.Types.ObjectId.isValid(mapID)) {
                report.missing.push(nameOf(mapID));
                continue;
            }
            if (await GeoJsonFile.exists({ _id: mapID })) {
                report.existing.push(nameOf(mapID));
                continue;
            }
            const data = mapsData.find(m => String(m?.mapID) === mapID);
            if (!data || !Array.isArray(data.features)) {
                report.missing.push(nameOf(mapID));
                continue;
            }

            // Features first and the file last: a half imported map is not seen as existing and is retried next time
            await GeoJsonFeature.deleteMany({ featureCollection: mapID });
            for (let i = 0; i < data.features.length; i += FEATURES_BATCH_SIZE) {
                const batch = data.features.slice(i, i + FEATURES_BATCH_SIZE).map(feature => ({ feature, featureCollection: mapID }));
                await GeoJsonFeature.insertMany(batch);
            }
            await new GeoJsonFile({ _id: mapID, file: data.file }).save();
            report.imported.push(nameOf(mapID));
        }
        return report;
    }

    /**
     * Resolves the groups and the owner of an imported dashboard.
     * Unknown groups are dropped: dashboard groups only grant access, so dropping one never opens the dashboard.
     * Returns the group ids of this instance, the owner found by email (if any) and the report.
     */
    static async resolveDashboardReferences(body: any): Promise<{ group: string[]; ownerId: string | null; report: PermissionsReport }> {
        const report = ObjectTransferService.emptyReport();
        const lookup = await ObjectTransferService.loadLookup();
        const groupCache = new Map<string, ResolvedReference>();

        const sourceGroups: string[] = (body.group || []).map(g => String(typeof g === 'object' ? (g._id || g.$oid) : g));
        const group: string[] = [];
        sourceGroups.forEach((gid, i) => {
            const ref = ObjectTransferService.resolveGroup(lookup, gid, body.groupsName?.[i], groupCache, report);
            const found = !report.groups.unresolved.includes(ref);
            if (found && !group.includes(ref.targetId)) group.push(ref.targetId);
        });

        // The owner is matched by email only; when not found the importing user becomes the owner
        let ownerId: string | null = null;
        if (body.userEmail) {
            ownerId = lookup.usersByEmail.get(String(body.userEmail).toLowerCase())?._id ?? null;
        }
        return { group, ownerId, report };
    }

    /* ------------------------------------------------------------------ */
    /* Helpers                                                            */
    /* ------------------------------------------------------------------ */

    private static emptyReport(): PermissionsReport {
        return {
            users: { matched: 0, remapped: [], unresolved: [] },
            groups: { matched: 0, remapped: [], unresolved: [] }
        };
    }

    /** Loads the users and groups of this instance referenced by the given ids. */
    private static async loadReferences(userIds: any[], groupIds: any[]) {
        const validUsers = [...new Set(userIds.map(String))].filter(id => mongoose.Types.ObjectId.isValid(id));
        const validGroups = [...new Set(groupIds.map(String))].filter(id => mongoose.Types.ObjectId.isValid(id));

        const [userDocs, groupDocs] = await Promise.all([
            validUsers.length ? User.find({ _id: { $in: validUsers } }, '_id name email').lean() : [],
            validGroups.length ? Group.find({ _id: { $in: validGroups } }, '_id name role').lean() : []
        ]);

        const users = new Map<string, UserRef>();
        (userDocs as any[]).forEach(u => users.set(String(u._id), { _id: String(u._id), name: u.name, email: u.email }));
        const groups = new Map<string, GroupRef>();
        (groupDocs as any[]).forEach(g => groups.set(String(g._id), { _id: String(g._id), name: g.name, role: g.role }));
        return { users, groups };
    }

    /** Indexes every user and group of this instance by id, email and name. */
    private static async loadLookup() {
        const [userDocs, groupDocs] = await Promise.all([
            User.find({}, '_id name email').lean(),
            Group.find({}, '_id name role').lean()
        ]);

        const usersById = new Map<string, UserRef>();
        const usersByEmail = new Map<string, UserRef>();
        const usersByName = new Map<string, UserRef[]>();
        (userDocs as any[]).forEach(u => {
            const ref: UserRef = { _id: String(u._id), name: u.name, email: u.email };
            usersById.set(ref._id, ref);
            if (ref.email) usersByEmail.set(String(ref.email).toLowerCase(), ref);
            const key = String(ref.name || '').trim().toLowerCase();
            if (key) usersByName.set(key, [...(usersByName.get(key) || []), ref]);
        });

        const groupsById = new Map<string, GroupRef>();
        const groupsByName = new Map<string, GroupRef[]>();
        (groupDocs as any[]).forEach(g => {
            const ref: GroupRef = { _id: String(g._id), name: g.name, role: g.role };
            groupsById.set(ref._id, ref);
            const key = String(ref.name || '').trim().toLowerCase();
            if (key) groupsByName.set(key, [...(groupsByName.get(key) || []), ref]);
        });

        return { usersById, usersByEmail, usersByName, groupsById, groupsByName };
    }

    /**
     * Matching order for users:
     * - With an email label (current export format): the email decides.
     * - Without email (files exported before the labels existed): first the same id when it exists
     *   in this instance, then the name (only when a single user has that name). The stored name may be
     *   outdated, so trusting the id first keeps a re-import in the same instance identical to the original.
     */
    private static resolveUser(lookup, sourceId: string, name: string, email: string, cache: Map<string, ResolvedReference>, report: PermissionsReport): ResolvedReference {
        if (cache.has(sourceId)) return cache.get(sourceId);

        let target: UserRef = null;
        if (email) {
            target = lookup.usersByEmail.get(String(email).toLowerCase()) ?? null;
        } else {
            target = lookup.usersById.get(sourceId) ?? null;
            if (!target && name) {
                const candidates = lookup.usersByName.get(String(name).trim().toLowerCase()) || [];
                if (candidates.length === 1) target = candidates[0];
            }
        }

        const ref: ResolvedReference = target
            ? { name: target.name, email: target.email, sourceId, targetId: target._id }
            : { name: name ?? null, email: email ?? undefined, sourceId, targetId: sourceId };
        ObjectTransferService.addToReport(report.users, ref, !!target);
        cache.set(sourceId, ref);
        return ref;
    }

    /**
     * Matching order for groups: first the same id when it exists in this instance (also covers the fixed
     * admin group id), then the name (only when a single group has that name). Trusting the id first keeps
     * a re-import in the same instance identical to the original even if the group was renamed.
     */
    private static resolveGroup(lookup, sourceId: string, name: string, cache: Map<string, ResolvedReference>, report: PermissionsReport): ResolvedReference {
        if (cache.has(sourceId)) return cache.get(sourceId);

        let target: GroupRef = lookup.groupsById.get(sourceId) ?? null;
        if (!target && name) {
            const candidates = lookup.groupsByName.get(String(name).trim().toLowerCase()) || [];
            if (candidates.length === 1) target = candidates[0];
        }

        const ref: ResolvedReference = target
            ? { name: target.name, sourceId, targetId: target._id }
            : { name: name ?? null, sourceId, targetId: sourceId };
        ObjectTransferService.addToReport(report.groups, ref, !!target);
        cache.set(sourceId, ref);
        return ref;
    }

    private static addToReport(section: PermissionsReport['users'], ref: ResolvedReference, found: boolean) {
        if (!found) section.unresolved.push(ref);
        else if (ref.sourceId !== ref.targetId) section.remapped.push(ref);
        else section.matched++;
    }
}
