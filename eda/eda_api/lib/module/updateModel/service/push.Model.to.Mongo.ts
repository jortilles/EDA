import DataSource ,{ IDataSource }   from "../../datasource/model/datasource.model";

export class pushModelToMongo {

    // en esta clase haremos métodos para actualizar la tabla data-source de EDA mongo

    public async pushModel(model) {

        let model_id = model._id 
        let model_ds = model.ds
       
        const found = await DataSource.findById(model_id)

        if (found == null) {
            const data = await new DataSource(model) 
            data.save()
        } else {
            await DataSource.updateOne({_id: model_id}, {ds:model_ds})
        } 
    }    

}