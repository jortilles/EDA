import { MapsReport, PermissionsReport, RemoteTransferType, TransferReference } from '@eda/services/api/remote-transfer.service';

export interface TransferReportLines {
    /** Informative lines: references found with a different id in the destination */
    info: string[];
    /** Lines the admin should review: references not found in the destination */
    warnings: string[];
}

const label = (ref: TransferReference) => ref.name || ref.email || ref.sourceId;
const list = (refs: TransferReference[]) => [...new Set(refs.map(label))].join(', ');

/** Turns the users / groups report returned by an import into translated messages. */
export function describeTransferReport(type: RemoteTransferType, report: PermissionsReport, ownerMatched?: boolean, maps?: MapsReport): TransferReportLines {
    const info: string[] = [];
    const warnings: string[] = [];

    // Maps travel with the data model
    if (maps?.imported?.length) {
        info.push($localize`:@@transferMapsImported:Mapas incluidos:` + ' ' + maps.imported.join(', '));
    }
    if (maps?.missing?.length) {
        warnings.push($localize`:@@transferMapsMissing:Mapas no disponibles; vuelve a subirlos en el modelo de datos:` + ' ' + maps.missing.join(', '));
    }

    if (!report) return { info, warnings };

    if (report.users?.remapped?.length) {
        info.push($localize`:@@transferUsersRemapped:Usuarios asociados por email o nombre:` + ' ' + list(report.users.remapped));
    }
    if (report.groups?.remapped?.length) {
        info.push($localize`:@@transferGroupsRemapped:Grupos asociados por nombre:` + ' ' + list(report.groups.remapped));
    }

    if (type === 'datasource') {
        if (report.users?.unresolved?.length) {
            warnings.push($localize`:@@transferUsersUnresolvedModel:Usuarios no encontrados. Se conserva el permiso original para no abrir datos; revisa los permisos del modelo:` + ' ' + list(report.users.unresolved));
        }
        if (report.groups?.unresolved?.length) {
            warnings.push($localize`:@@transferGroupsUnresolvedModel:Grupos no encontrados. Se conserva el permiso original para no abrir datos; revisa los permisos del modelo:` + ' ' + list(report.groups.unresolved));
        }
    } else {
        if (report.groups?.unresolved?.length) {
            warnings.push($localize`:@@transferGroupsUnresolvedDashboard:Grupos no encontrados, se han quitado del dashboard:` + ' ' + list(report.groups.unresolved));
        }
        if (ownerMatched === false) {
            warnings.push($localize`:@@transferOwnerNotMatched:El propietario no existe en el destino; el dashboard queda a nombre del usuario que lo importa.`);
        }
    }
    return { info, warnings };
}
