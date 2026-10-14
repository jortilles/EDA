import * as crypto from 'crypto';
const bcrypt = require('bcryptjs');

/**
 * SSO users never log in with a password, but the field can't be empty: store the hash of a
 * random one nobody knows, so the native /user/login can't be used to impersonate them.
 */
export function randomSsoPasswordHash(): string {
  return bcrypt.hashSync(crypto.randomBytes(32).toString('hex'), 10);
}
