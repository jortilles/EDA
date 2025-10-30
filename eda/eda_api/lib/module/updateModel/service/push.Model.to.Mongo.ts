import { HttpException } from "module/global/model";
import DataSource, { IDataSource } from "../../datasource/model/datasource.model";
import _ from "lodash";

export class pushModelToMongo {
  // en esta clase haremos métodos para actualizar la tabla data-source de EDA mongo

  public async pushModel(model, res) {
    let model_id = model._id;
    let model_ds = _.cloneDeep(model.ds);

    const found = await DataSource.findById(model_id);

    if (found == null) {
      try {
        if (model_id !== "111111111111111111111111") {
          console.log("Error: Invalid model structure detected");
          res.status(500).json({ status4: "ko" });
        } else {
          const data = await new DataSource(model);
          data.save();
          console.timeEnd("UpdateModel");
          console.log("\x1b[33m=====\x1b[0m \x1b[1;34mEnd Update Model (Created)\x1b[0m \x1b[33m=====\x1b[0m");
        }
      } catch (e) {
        console.log("Error 6", e);
        res.status(500).json({ status: "ko" });
      }
    } else {
      try {
        // Retrieving calculated fields to add them to the new model if they exist
        const oldModelTables = found.ds.model.tables; // old tables model => here with computed columns
        const newModelTables = model_ds.model.tables; // new tables model => new, without computed columns
        model_ds.model.tables = rescueComputedColumns(oldModelTables, newModelTables);

        if (model_ds != null || model_ds != undefined) {
          await DataSource.updateOne({ _id: model_id }, { ds: model_ds });
          console.timeEnd("UpdateModel");
          console.log("\x1b[33m=====\x1b[0m \x1b[1;34mEnd Update Model (Updated)\x1b[0m \x1b[33m=====\x1b[0m");
        } else {
          console.log("Error 7", model_ds);
          res.status(500).json({ status: "ko" });
        }
      } catch (e) {
        if (e) {
          console.log("Error 8: ", e);
          res.status(500).json({ status: "ko" });
        }
      }
      
    }

    function rescueComputedColumns(oldModelTables: any[], newModelTables: any[]) {

      oldModelTables.forEach((table: any) => {
        let tableName= table.table_name;
        table.columns.forEach((column: any) => {
          if(column.computed_column==='computed') {

            newModelTables.find((table: any) => {
              return table.table_name === tableName;
            }).columns.push(column);

          }
        })

      })

      return newModelTables;
    }
  }
}
