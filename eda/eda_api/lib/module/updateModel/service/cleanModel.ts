import _ from "lodash";
import { Sda_Basic_Group } from "./sda_basic.group";
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
            
            const sdaChecker = new Sda_Basic_Group;
            const basicGroups =  (await sdaChecker.Checker()); //recuperdamos las tablas de grupos SDA_*

            //recuperamos los model_granted_roles de mongo, donde se han añadido permisos para SDA_*
            const finder = await DataSourceSchema.find({_id: "111111111111111111111111" }) ; 
            let mgs = [];
            const mgsmap = _.cloneDeep(finder.map(e => mgs = e.ds.metadata.model_granted_roles));
            
            //filtramos los granted roles que coinciden con los nombres de grupos SDA_*
            const match = mgs.filter(e => e.type == "groups" && e.groupsName.filter(a => a == basicGroups.find(q => q.name))); 

            //empujamos los permisos de los grupos SDA_* a los grantes roles filtrados anteriormente
            if (_.isEmpty(match) == false) {
                match.forEach(c => model_granted_roles.push(c)) ; 
            }     
                                
            main_model.ds.metadata.model_granted_roles = model_granted_roles;

            return main_model;

        }
        
        
    }

