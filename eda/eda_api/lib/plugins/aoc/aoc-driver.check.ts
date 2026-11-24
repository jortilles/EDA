/**
 * Checks whether the ODBC driver required by the AOC connector is installed on the host.
 *
 * The 'odbc' npm package does not expose the list of installed drivers, so it is read from the
 * operating system's ODBC driver registry:
 *   - Windows: HKLM\SOFTWARE\ODBC\ODBCINST.INI\ODBC Drivers (registry view matching Node's arch)
 *   - Linux / macOS (unixODBC): odbcinst.ini ($ODBCSYSINI, /etc, /usr/local/etc, /opt/homebrew/etc)
 */
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

export const AOC_ODBC_DRIVER = 'ODBC Driver 18 for SQL Server';

const execFileAsync = promisify(execFile);

/** Driver availability: true = installed, false = not installed, null = could not be determined */
export type DriverCheckResult = boolean | null;

// Only a positive result is cached, so installing the driver does not require restarting the API
let driverFound = false;

async function checkWindowsRegistry(driver: string): Promise<DriverCheckResult> {
    const args = ['query', 'HKLM\\SOFTWARE\\ODBC\\ODBCINST.INI\\ODBC Drivers', '/v', driver];
    // 64-bit Node needs the 64-bit drivers and 32-bit Node the 32-bit ones
    args.push(process.arch === 'ia32' ? '/reg:32' : '/reg:64');
    try {
        await execFileAsync('reg', args, { windowsHide: true });
        return true;
    } catch (err: any) {
        // reg.exe exits with code 1 when the value does not exist
        if (err?.code === 1) return false;
        console.warn(`[AOC] Could not query the Windows registry for ODBC drivers: ${err?.message}`);
        return null;
    }
}

function checkOdbcinstIni(driver: string): DriverCheckResult {
    const dirs = [process.env.ODBCSYSINI, '/etc', '/usr/local/etc', '/opt/homebrew/etc'].filter(Boolean) as string[];
    const sectionRegex = new RegExp(`^\\s*\\[${driver.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]\\s*$`, 'mi');

    for (const dir of dirs) {
        const file = path.join(dir, 'odbcinst.ini');
        try {
            if (sectionRegex.test(fs.readFileSync(file, 'utf8'))) return true;
        } catch {
            // File not present in this location: try the next one
        }
    }
    // Not registered in any odbcinst.ini (or no odbcinst.ini at all): driver not installed
    return false;
}

export async function isAOCDriverInstalled(): Promise<DriverCheckResult> {
    if (driverFound) return true;

    const result = process.platform === 'win32'
        ? await checkWindowsRegistry(AOC_ODBC_DRIVER)
        : checkOdbcinstIni(AOC_ODBC_DRIVER);

    if (result === true) driverFound = true;
    return result;
}
