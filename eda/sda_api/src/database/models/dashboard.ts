import mongoose, {mongo} from "mongoose"

export class DashBoard {

    public async dashboard() : Promise<any> {

        const DashBoard = new mongoose.Schema({
            group: { type: [] },
            config: {type: Object},
            user: {type: mongo.ObjectId}
        },{ collection: 'dashboard' });


        try {
            const DashBoardEda = mongoose.model('dashboard', DashBoard)
        } catch (err) {    }
            const DashBoardEda = mongoose.model('dashboard')

            return DashBoardEda
    }
}