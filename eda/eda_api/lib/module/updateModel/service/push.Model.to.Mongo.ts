import { HttpException } from "module/global/model";
import DataSource ,{ IDataSource }   from "../../datasource/model/datasource.model";
import _ from "lodash";

export class pushModelToMongo {

    // en esta clase haremos métodos para actualizar la tabla data-source de EDA mongo

    public async  pushModel(model, res) {
        try {

        let model_id = model._id;
        let model_ds = _.cloneDeep(model.ds);
       
        const found = await DataSource.findById(model_id);
        
        if (found == null) {
            try {
                if (model_id !== '111111111111111111111111') {
                    console.log('El modelo no es el esperado.');
                    res.status(500).json({'status':'ko'})
                } else {
                    console.log('data0');
                    const data = await new DataSource(model) ;
                    console.log('data?');
                    data.save();
                    console.log('data err')
                }
                
            } catch(e) {
                res.status(500).json({'status':'ko'})
            }
              
        } else {
            try {
                console.log('El modelo ya existe.....')
                if (model_ds != null || model_ds != undefined) {
                    console.log('actualizo.....')
                    await DataSource.updateOne({_id: model_id}, {ds: model_ds})  
                    console.log('actualizado.....')
                } else {
                    res.status(500).json({'status':'ko'})
                }

            } catch (e) {
                if (e) {
                    res.status(500).json({'status':'ko'})
                }
                
            } 
            
        } 

        } catch (e) {
            res.status(500).json({'status' : 'ko'});
        }

    
    }    

}