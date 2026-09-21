/** place here the variables you want to overwrittes */

export const SHOW_LOCK_IN_PANEL_HEADER: boolean = true; // true → lock button visible in panel header | false → lock in context menu
export const ALLOW_NON_ADMIN_MANAGE_PUBLIC_REPORTS: boolean = false; // true → public visibility option shown in dashboard creation/edit UIs | false → hidden
export const USE_VALUE_LIST_CODE_FOR_FILTERS: boolean = true; // true -> For using the filters with code values.
export const SHOW_HIDDEN_FIELDS: 'disabled' | 'admin-only' | 'all' = 'admin-only'; // 'disabled' → button hidden for everyone | 'admin-only' → only admins see the button | 'all' → all users see it
export const ALLOWED_QUERY_MODES: string[] = ['TREE', 'SQL']; // ALLOWED_QUERY_MODES Order matters; the first value "ALLOWED_QUERY_MODES[0]" is considered the default query mode
export const SHOW_WHAT_IF: boolean = false; // SDA: sin escenarios "What If"
export const ALLOWED_JOIN_TYPES: string[] = ['left', 'inner']; 
export const SHOW_CUSTOM_ACTION: boolean = false;
export const SHOW_ZOOM_IN_SIDEBAR: boolean = false;
export const PRIVATE_EDITION_ACTIVATED: boolean =  false;
