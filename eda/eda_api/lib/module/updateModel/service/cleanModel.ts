import _ from "lodash";
import Group, { IGroup } from '../../admin/groups/model/group.model';
import DataSourceSchema from '../../datasource/model/datasource.model';

export class CleanModel {
    public async cleanModel(main_model: any): Promise<any> {
        const roles = _.cloneDeep(main_model.ds.metadata.model_granted_roles);
        const model_granted_roles: any[] = [];
        const mapRoles = new Map();

        const addOrUpdateRole = (role: any, key: string) => {
            const existingRole = mapRoles.get(key);
            if (existingRole) {
                if (role.type === "users") {
                    existingRole.users = Array.from(new Set([...existingRole.users, ...role.users]));
                    existingRole.usersName = Array.from(new Set([...existingRole.usersName, ...role.usersName]));
                } else if (role.type === "groups") {
                    existingRole.groups = Array.from(new Set([...existingRole.groups, ...role.groups]));
                    existingRole.groupsName = Array.from(new Set([...existingRole.groupsName, ...role.groupsName]));
                }
            } else {
                mapRoles.set(key, _.cloneDeep(role));
            }
        };

        roles.forEach((role: any) => {
            const key = `${role.table}-${role.column}-${role.type}-${role.global}-${role.none}-${role.permission}-${role.dynamic}-${role.value?.join(',')}`;
            addOrUpdateRole(role, key);
        });

        mapRoles.forEach((value) => model_granted_roles.push(value));

        // Recuperar permisos adicionales de Mongo
        const finder = await DataSourceSchema.find({ _id: "111111111111111111111111" });
        const mgsmap = finder
        .map((e) => e.ds.metadata.model_granted_roles)
        .reduce((acc, val) => acc.concat(val), []);
        // Combinar permisos únicos
        const filterUniqueRoles = (roles: any[], comparator: (a: any, b: any) => boolean) => {
            const seen = new Map();
            return roles.filter((role) => {
                const key = `${role.table}-${role.column}-${role.type}-${role.global}-${role.none}-${role.permission}-${role.users?.join(',')}-${role.groups?.join(',')}`;
                if (seen.has(key)) {
                    return false;
                }
                seen.set(key, role);
                return true;
            });
        };

        const uniqueRoles = filterUniqueRoles(model_granted_roles, _.isEqual);

        // Marcar origen de permisos
        uniqueRoles.forEach((role) => (role.source = "update_model"));

        if (mgsmap.length) {
            const userRoles = mgsmap.filter(
                (r: any) => r?.source === "SDA" && !r.groupsName.some((name: string) => name.startsWith("SCRM_"))
            );
            main_model.ds.metadata.model_granted_roles = [...uniqueRoles, ...userRoles];
        } else {
            main_model.ds.metadata.model_granted_roles = uniqueRoles;
        }

        return main_model;
    }
}
