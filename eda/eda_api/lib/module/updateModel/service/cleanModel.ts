import _ from "lodash";
import Group, { IGroup } from '../../admin/groups/model/group.model'
import DataSourceSchema from '../../datasource/model/datasource.model'

export class CleanModel {
    
    public async cleanModel(main_model : any) : Promise<any> {

        let roles = _.cloneDeep(main_model.ds.metadata.model_granted_roles);
        
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

        let groupModel =  {
            "groups": [],
            "groupsName": [],
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
                
                const match = model_granted_roles.find(r => r.table == roles[i].table && r.column == roles[i].column && r.type == roles[i].type );

                if (_.isEmpty(match) == false && roles[i].type == "users") {
                    if (!match.users.includes(roles[i].users[0])) {match.users.push(roles[i].users[0]) } ;
                    if (!match.usersName.includes(roles[i].usersName[0])) {match.usersName.push(roles[i].usersName[0]) } ;
                    modelAc = match;
                    
                } else if (_.isEmpty(match) == false && roles[i].type == "groups") {
                    if (!match.groups.includes(roles[i].groups[0])) {match.groups.push(roles[i].groups[0]) } ;
                    if (!match.groupsName.includes(roles[i].groupsName[0])) {match.groupsName.push(roles[i].groupsName[0]) } ;
                    groupModel = match;        
                } 
                else {
                    if (_.isEmpty(modelAc.table) == false) {model_granted_roles.push(modelAc)};
                    if (_.isEmpty(groupModel.table) == false) {model_granted_roles.push(groupModel)};
                    if (roles[i].type == "groups") {
                        groupModel = roles[i];    
                        if (_.isEmpty(groupModel.table) == false) {model_granted_roles.push(groupModel)} ;
                    } else {
                        model = roles[i];
                    }
                    if (_.isEmpty(model.table) == false) {model_granted_roles.push(model)} ;

                }

                }
            }
                                           
            main_model.ds.metadata.model_granted_roles = model_granted_roles;

            return main_model;

        }
        
        
    }

