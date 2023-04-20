import mongoose, { mongo, Mongoose } from "mongoose";
import { Connections } from "../config/connections";
import fs, { read } from 'fs'
import { type } from "os";
import { DataSource } from "./models/data-source";

export class pushModelToMongo {

    // en esta clase haremos métodos para actualizar la tabla data-source de EDA mongo

    public async pushModel(model) {

        let model_id = model._id 
        let model_ds = model.ds
        
        const dataSourceSchema = await new DataSource().dataSourceSchema()

        const found = await dataSourceSchema.findById(model_id)

        if (found == null) {
            const data = await new dataSourceSchema(model) 
            data.save()
        } else {
            await dataSourceSchema.updateOne({_id: model_id}, {ds:model_ds})
        } 
    }    

}