import mongoose, {mongo, Mongoose} from "mongoose";

export class UserModel {

    public async userModel() {
        
        const userSchema = new mongoose.Schema({
            name: { type: String, unique: false },
            email: { type: String, unique: false },
            password: { type: String, unique: false },
            role: { type: [mongoose.Types.ObjectId] },
            img: { type: String, required: false },
            active: { type: Number, hidden: true }, // This field does not appear in Mongo, we remove it by aesthetics
      
          }, { versionKey: false });
      
          try {
            let Users = mongoose.model('users', userSchema)
          } catch (err) {
      
          }
      
          let Users = mongoose.model('users');

          return Users
    }
}