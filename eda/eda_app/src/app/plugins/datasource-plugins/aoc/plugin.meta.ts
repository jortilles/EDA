/**
 * Meta-data for the datasource plugin "aoc".
 *
 * Fields:
 * - type:           Unique identifier, matches the backend plugin's `type`.
 * - label:          Human-readable name shown in the UI.
 * - port:           Optional port override (null = use default).
 * - apiBasePath:    Backend route prefix where the plugin API is mounted.
 * - icon:           IconService key for the brand logo shown in the "Tipo" dropdown.
 * - componentFile:  Relative path (from the plugin folder) to the TS file
 *                   that contains the Angular form component.
 * - componentExport:Exact name of the exported component class.
 */
export const meta = {
    type: 'aoc',
    label: 'AOC',
    port: 1433,
    apiBasePath: '/aoc',
    icon: 'aoc',
    componentFile: './aoc-form.component',
    componentExport: 'AocFormComponent',
};
