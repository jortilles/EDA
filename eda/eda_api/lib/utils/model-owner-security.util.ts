/**
 * Edalitics Free: seguridad por defecto a nivel de modelo.
 * Al crear un modelo de datos se activa la seguridad a nivel de modelo (fullModel)
 * y sólo el usuario que lo crea puede verlo.
 * @param user usuario que crea el modelo (req.user)
 * @returns model_granted_roles con el permiso del propietario
 */
export function ownerOnlyGrantedRoles(user: any): any[] {
    if (!user?._id) return [];
    return [{
        users: [String(user._id)],
        usersName: [user.name ?? ''],
        none: false,
        table: 'fullModel',
        column: 'fullModel',
        global: true,
        permission: true,
        type: 'users'
    }];
}
