import mongoose, {mongo} from "mongoose";

export class DataSource {

    public async dataSourceSchema() {

        const DataSourceSchema = new mongoose.Schema({
            ds: { type: Object },
        },{ collection: 'data-source' });

        try {
        const dataSourceSchema = mongoose.model('data-source', DataSourceSchema)
            } catch (err) {    }
        const dataSourceSchema = mongoose.model('data-source')

        return dataSourceSchema

    }
}