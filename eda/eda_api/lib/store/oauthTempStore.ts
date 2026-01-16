export type OAuthTempData = {
  access_token: string;
  userData: any;
  authenticationEvidence: any;
  userPermissions: any;
  userPermissionsRoles: any;
  roles: any
  createdAt: number;
};

const TTL = 5 * 60 * 1000; // 5 minutos

export const oauthTempStore = new Map<string, OAuthTempData>();

console.log('======> oauthTempStore ======> ', oauthTempStore);

// Limpieza automática cada minuto
// setInterval(() => {
//   const now = Date.now();
//   for (const [key, value] of oauthTempStore) {
//     if (now - value.createdAt > TTL) {
//       oauthTempStore.delete(key);
//     }
//   }
// }, 60 * 1000);