import { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { createConnection } from 'mysql2/promise';
import Group from '../../module/admin/groups/model/group.model';

const sinergiaDatabase = require('../../../config/sinergiacrm.config');

// The shared date-format.service.ts doesn't zero-pad hours/minutes/seconds,
// which doesn't match the "YYYY-MM-DD HH:mm:ss" format the old app used (via moment).
function formatDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} `
    + `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/**
 * Provides information about the current SinergiaDA installation (versions, ports,
 * last synchronization with SinergiaCRM) for the "Acerca de" page.
 * Each piece of information is fetched independently so a single missing file/query
 * doesn't prevent the rest of the info from being returned.
 */
export class GetSdaInfoController {
  public static async getinfo(req: Request, res: Response) {
    const info: Record<string, string> = {
      sinergiaDaVersion: 'N/D',
      edaApiVersion: 'N/D',
      edaApiPort: 'N/D',
      lastUpdateModelRun: 'N/D',
      lastRebuildDate: 'N/D',
    };

    // SinergiaDA version, stamped at deploy time.
    try {
      const versions = require('./SdaVersion.js');
      info.sinergiaDaVersion = versions.SdaVersion;
    } catch (error) {
      console.error('[getSdaInfo] Could not read SdaVersion.js', error);
    }

    // EDA API version, from this package's package.json.
    try {
      const packageJsonPath = path.join(__dirname, '../../../package.json');
      info.edaApiVersion = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')).version;
    } catch (error) {
      console.error('[getSdaInfo] Could not read package.json', error);
    }

    // EDA API port, parsed out of server.ts.
    try {
      const serverTsPath = path.join(__dirname, '../../../lib/server.ts');
      const serverSrc = fs.readFileSync(serverTsPath, 'utf8');
      const match = serverSrc.match(/const PORT = (\d+);/);
      if (match) info.edaApiPort = match[1];
    } catch (error) {
      console.error('[getSdaInfo] Could not read server.ts', error);
    }

    // Last updateModel run, taken from metadata.json's modification time.
    try {
      const metadataPath = path.join(__dirname, '../../../metadata.json');
      const stats = fs.statSync(metadataPath);
      info.lastUpdateModelRun = formatDate(stats.ctime);
    } catch (error) {
      console.error('[getSdaInfo] Could not read metadata.json', error);
    }

    // Last rebuild date, read from SinergiaCRM's own config table.
    try {
      const connection = await createConnection({
        host: sinergiaDatabase.sinergiaConn.host,
        port: sinergiaDatabase.sinergiaConn.port,
        user: sinergiaDatabase.sinergiaConn.user,
        password: sinergiaDatabase.sinergiaConn.password,
        database: sinergiaDatabase.sinergiaConn.database,
      });
      try {
        const [rows]: any = await connection.query(
          "SELECT value FROM sda_def_config WHERE `key` = 'last_rebuild';"
        );
        info.lastRebuildDate = rows.length > 0 ? rows[0].value : 'N/D';
      } finally {
        await connection.end();
      }
    } catch (error) {
      console.error('[getSdaInfo] Error querying SinergiaCRM', error);
    }

    // Connection details are only relevant to admins.
    const groups = await Group.find({ users: { $in: req.user._id } }).exec();
    const isAdmin = groups.filter(g => g.role === 'EDA_ADMIN_ROLE').length > 0;
    if (isAdmin) {
      info.sinergiaCRMDatabaseName =
        `${sinergiaDatabase.sinergiaConn.host}:${sinergiaDatabase.sinergiaConn.port}/${sinergiaDatabase.sinergiaConn.database}`;
    }

    res.json({ info });
  }
}
