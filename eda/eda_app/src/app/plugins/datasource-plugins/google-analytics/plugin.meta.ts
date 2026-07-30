/**
 * Meta-data for the datasource plugin "google-analytics".
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
    type: 'googleanalytics',
    label: 'Google Analytics 4',
    port: null,
    apiBasePath: '/google-analytics',
    componentFile: './ga4-form.component',
    componentExport: 'Ga4FormComponent',
};
