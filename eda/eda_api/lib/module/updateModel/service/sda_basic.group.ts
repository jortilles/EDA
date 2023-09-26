import Group, { IGroup } from '../../admin/groups/model/group.model'
import _ from 'lodash';


export class Sda_Basic_Group {

    public async Checker() {
 
 
        const finder = await Group.find({name: {$regex: '^SDA_.*'}}) ;
        
                        
        if (_.isEmpty(finder)) {

            let groupSchema = new Group(

                {
                  role: "EDA_USER_ROLE",
                  name: "SDA_BASIC",
                  users: []
                }
              )
            
              groupSchema.save()
              
        }

        return finder;

    }

}