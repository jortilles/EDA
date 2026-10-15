// Dashboard permission checks shared by the sidebar menu and the quick actions bar.
// Logic kept exactly as it was in DashboardSidebarComponent.

const ADMIN_ROLE_ID = '135792467811111111111110';
const ANONYMOUS_USER_ID = '135792467811111111111112';
const READ_ONLY_ROLE_ID = '135792467811111111111113';

function getStoredUser(): any {
  return JSON.parse(localStorage.getItem('user'));
}

/** True when the current user can only view this dashboard. */
export function isDashboardReadOnly(dashboard: any): boolean {
  const user = getStoredUser();
  const userName = user._id;
  const imProperty = userName === dashboard.user;
  const isObserver = user.role.includes(READ_ONLY_ROLE_ID);
  const onlyIcanEdit = dashboard.config.onlyIcanEdit ? dashboard.config.onlyIcanEdit : true;
  return userName === ANONYMOUS_USER_ID || (!onlyIcanEdit && !imProperty) || isObserver;
}

/** True when the current user is allowed to edit this dashboard. */
export function isDashboardEditable(dashboard: any): boolean {
  const user = getStoredUser();
  const isAdmin = user.role.includes(ADMIN_ROLE_ID);
  const imProperty = user._id === dashboard.user;
  return (!dashboard.config.onlyIcanEdit || imProperty || isAdmin);
}
