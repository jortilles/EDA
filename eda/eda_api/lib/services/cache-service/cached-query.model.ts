import * as mongoose from 'mongoose';

export interface ICachedQuery extends mongoose.Document {
  cachedQuery : 
  {
    query : string,
    model_id:string,
    hashedQuery : string,
    response : Array<any>,
    dateAdded : string,
    lastLoaded:string,
    lastUpdated:string,
    enabled:boolean
  }
}

const CachedQuerySchema = new mongoose.Schema({
  cachedQuery: { type: Object },
},{ collection: 'cached-query' });

export default mongoose.model<ICachedQuery>('CachedQuery', CachedQuerySchema);