import * as mongoose from 'mongoose';


export interface IgeoJsonFeature extends mongoose.Document {
    feature : any;
    featureCollection: string;
}

const GeoJsonFeature = new mongoose.Schema({
    feature : { type: Object },
    featureCollection : {type:String}
}, { collection: 'features', strict: false });

export default mongoose.model<IgeoJsonFeature>('geoJsonFeature', GeoJsonFeature);