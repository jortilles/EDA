import _ from "lodash";

export class CleanModel {
    
    public cleanModel(main_model : any) : any {

        const roles = _.cloneDeep(main_model.ds.metadata.model_granted_roles);
        
        let model = {
            "users": [],
            "usersName": [],
            "none": "",
            "table": "",
            "column": "",
            "global": "",
            "permission": "",
            "type": ""
        }

        let modelAc = {
            "users": [],
            "usersName": [],
            "none": "",
            "table": "",
            "column": "",
            "global": "",
            "permission": "",
            "type": ""
        }

       
        let model_granted_roles = [] ;
        
        for (let i=0;i<roles.length;i++) {

            if (i==0) {
                model = roles[i];
                model_granted_roles.push(model)
            
            } else {
                
                const match = model_granted_roles.find(r => r.table == roles[i].table && r.column == roles[i].column);
                
                if (_.isEmpty(match) == false) {
                    if (!match.users.includes(roles[i].users[0])) {match.users.push(roles[i].users[0]) } ;
                    if (!match.usersName.includes(roles[i].usersName[0])) {match.usersName.push(roles[i].usersName[0]) } ;
                    modelAc = match;
                    
                } else {
                    if (_.isEmpty(modelAc.table) == false) {model_granted_roles.push(modelAc)};
                    model = roles[i];
                    if (_.isEmpty(model.table) == false) {model_granted_roles.push(model)} ;
                    
                    
                }

                }
            }
            
                                   
            
            main_model.ds.metadata.model_granted_roles = model_granted_roles;
            return main_model;

        }
        
        
    }




