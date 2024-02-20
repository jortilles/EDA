import { Request, Response } from "express";
import * as fs from "fs";
import * as path from "path";
const sinergiaDatabase = require("../../../config/sinergiacrm.config");
const mariadb = require("mariadb");


/**
 * A class responsible for fetching and returning Sinergia Data Analytics (SDA) information.
 */
export class getSdaInfo {
  /**
   * Retrieves and compiles information about Sinergia Data Analytics including version details, last update model run,
   * database connection details, and synchronization information.
   * 
   * @param req The HTTP request object.
   * @param res The HTTP response object used to return the compiled information or an error message.
   */
  public static async getinfo(req: Request, res: Response) {
    let info = {};

    try {
      const moment = require("moment");

      // Retrieve the last update model run time.
      const metadataPath = path.join(__dirname, "../../../metadata.json");
      const stats = fs.statSync(metadataPath);
      const formattedDate = moment(stats.ctime).format("YYYY-MM-DD HH:mm:ss");
      info["lastUpdateModelRun"] = formattedDate;

      // Retrieve SinergiaCRM database name and connection details.
      info["sinergiaCRMDatabaseName"] =
        sinergiaDatabase.sinergiaConn.host +
        ":" +
        sinergiaDatabase.sinergiaConn.port +
        "/" +
        sinergiaDatabase.sinergiaConn.database;

      // Retrieve SinergiaDA version.
      const versions = require("../../../../SdaVersion.js");
      info["sinergiaDaVersion"] = versions.SdaVersion;

      // Retrieve EDA API version from package.json.
      const packageJsonPathAPI = path.join(__dirname, "../../../package.json");
      info["edaApiVersion"] = JSON.parse(fs.readFileSync(packageJsonPathAPI, "utf8")).version;

      // Retrieve server TS port
      const serverTsPath = path.join(__dirname, "../../../lib/server.ts");
      fs.readFile(serverTsPath, "utf8", (err, data) => {
        if (err) {
          console.error("Error leyendo el archivo:", err);
          return;
        }
        const match = data.match(/const PORT = (\d+);/);

        if (match && match[1]) {
          const port = match[1];
          console.log(port);
          info["edaApiPort"] = port;
        }
      });

      //  It is necessary to put this information in an accessible place from the API
      // // Retrieve EDA APP version from package.json.
      // const packageJsonPathAPP = path.join(__dirname, "../../../../eda_app/package.json");
      // info["edaAppVersion"] = JSON.parse(fs.readFileSync(packageJsonPathAPP, "utf8")).version;

      // Retrieve the last synchronization date with SinergiaCRM.
      let connection: any;
      connection = await mariadb.createConnection(sinergiaDatabase.sinergiaConn);
      const rows = await connection.query("SELECT value from sda_def_config WHERE `key` = 'last_rebuild';");

      if (rows.length > 0) {
        info["lastRebuildDate"] = rows[0].value;
      } else {
        info["lastRebuildDate"] = "N/D"; // N/D stands for Not Available/No Data.
      }
      connection.end();

      // Return the compiled information.
      res.json({ info: info });
    } catch (error) {
      // Return an error response in case of failure.
      res.status(500).json({ error: "Error al obtener los datos" });
    }
  }
}
