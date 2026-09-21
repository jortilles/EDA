import * as path from 'path';
import * as fs from 'fs';
import { IAuthPlugin } from '../plugin.interface';

const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const CONFIG_PATH = path.resolve(__dirname, '../../../config/sinergiacrm.config.js');

/**
 * Legacy password bridge for users migrated from SinergiaCRM, whose passwords
 * are stored as raw MD5 or PHP bcrypt ($2y$) hashes instead of Node bcryptjs ($2a$) ones.
 * Only active when config/sinergiacrm.config.js is present (SinergiaDA deployments).
 */
export const SinergiaAuthPlugin: IAuthPlugin = {
    kind: 'auth',
    type: 'sinergia-legacy-auth',

    isEnabled(): boolean {
        return fs.existsSync(CONFIG_PATH);
    },

    async verifyLegacyPassword(password: string, storedHash: string): Promise<boolean> {
        const md5Hash = crypto.createHash('md5').update(password).digest('hex');
        if (md5Hash === storedHash.toString()) {
            return true;
        }
        // PHP bcrypt uses the $2y$ prefix; bcryptjs only recognizes $2a$
        const phpBcryptHash = storedHash.toString().replace(/^\$2y(.+)$/i, '$2a$1');
        return bcrypt.compare(md5Hash, phpBcryptHash);
    },
};
