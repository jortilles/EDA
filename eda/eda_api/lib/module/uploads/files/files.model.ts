import * as mongoose from 'mongoose';


export interface IGeoJsonFile extends mongoose.Document {
    file : any;
    topology?: any; // cached stitched+simplified topology, precomputed so reads skip re-stitching (see uploadFileController)
}

const GeoJsonFile = new mongoose.Schema({
    file : { type: Object }
}, { collection: 'files', strict: false });

export default mongoose.model<IGeoJsonFile>('GeoJsonFile', GeoJsonFile);