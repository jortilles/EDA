import mongoose, {mongo} from "mongoose";

export class GroupModel {

    public async groupModel() {
        
        let groupSchema = new mongoose.Schema(
            {
              role: { type: String, upsert: true },
              group_name: { type: String, upsert: true },
              name: { type: String, upsert: true },
              users: { type: [mongo.ObjectId] },
            }
          )
      
          try {
            const Group = mongoose.model('groups', groupSchema);
          } catch (err) { }
          const Group = mongoose.model('groups');

          return Group

    }
}