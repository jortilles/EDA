 import mongoose  from 'mongoose';
 import { Connections } from '../config/connections';

 
 //haremos métodos para exportar nuestros datos desde nuestra bbdd en mongo
 export class ExportMongoData {

    public async exportGroup() : Promise<any> {


        //buscamos el grupo adecuado para inyectarle todos los Ids

        let schema = new mongoose.Schema({
            role: '',
            name: "",
            users: []
        } )

        try {
        const groupModel = mongoose.model('groups', schema)
        } catch (err){}
        const groupModel = mongoose.model('groups')
        const groups = await groupModel.find()
        

        return groups
    }
   
 }
 
 