/**
 * Meta-data for the datasource plugin "holded".
 *
 * Fields:
 * - type:           Unique identifier, matches the backend plugin's `type`.
 * - label:          Human-readable name shown in the UI.
 * - port:           Optional port override (null = use default).
 * - apiBasePath:    Backend route prefix where the plugin API is mounted.
 * - componentFile:  Relative path (from the plugin folder) to the TS file
 *                   that contains the Angular form component.
 * - componentExport:Exact name of the exported component class.
 */
export const meta = {
    type: 'holded',
    label: 'Holded',
    port: null,
    apiBasePath: '/holded',
    componentFile: './holded-form.component',
    componentExport: 'HoldedFormComponent',
};
