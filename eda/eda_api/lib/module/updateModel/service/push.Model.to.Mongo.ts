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
                    res.status(500).json({'status':'ko'})
                } else {
                    const data = await new DataSource(model) ;
                    data.save();
                }
                
            } catch(e) {
                res.status(500).json({'status':'ko'})
            }
              
        } else {
            try {
                if (model_ds != null || model_ds != undefined) {
                    await DataSource.updateOne({_id: model_id}, {ds: model_ds})    
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