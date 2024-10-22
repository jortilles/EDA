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
            "type": "",
            "value":[]
        }

        let modelAc = {
            "users": [],
            "usersName": [],
            "none": "",
            "table": "",
            "column": "",
            "global": "",
            "permission": "",
            "type": "",
            "value":[]
        }

        let groupModel =  {
            "groups": [],
            "groupsName": [],
            "none": "",
            "table": "",
            "column": "",
            "global": "",
            "permission": "",
            "type": "",
            "value":[]
        }
        
        let model_granted_roles = [] ;

        for (let i=0;i<roles.length;i++) {

            if (i==0) {
                model = roles[i];
                model_granted_roles.push(model)
            
            } else {
                
                let match = model_granted_roles.find(r => r.table == roles[i].table && r.column == roles[i].column && r.type == roles[i].type   );
                if( _.isEmpty(match) == false ){
                    if(roles[i].value && match.value ){
                        roles[i].value.forEach((e,i)=> {
                            if( e != match.value[i]){
                                match =  false;
                            }
                        });
                    }
                }

                
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
                    if (_.isEmpty(modelAc.table) == false) {model_granted_roles.push(modelAc) };
                    if (_.isEmpty(groupModel.table) == false ) {model_granted_roles.push(groupModel)};
                    if (roles[i].type == "groups") {
                        groupModel = roles[i];
                        if (_.isEmpty(groupModel.table) == false) {model_granted_roles.push(groupModel)} ;
                    } else {
                        model = roles[i];
                        if (_.isEmpty(model.table) == false) {model_granted_roles.push(model)} ;
                    }
                }
                }
            }


            //recuperamos los model_granted_roles de mongo, donde se han añadido permisos para SCRM_*
            const finder = await DataSourceSchema.find({_id: "111111111111111111111111" }) ; 
            let mgs = [];
            const mgsmap = _.cloneDeep(finder.map(e => mgs = e.ds.metadata.model_granted_roles));
            
            function objetosIgualesGrupos(objetoA: any, objetoB: any): boolean {
                if (objetoA.groups != undefined && objetoB.groups != undefined
                 ) return (
                    objetoA.groups.join(',') === objetoB.groups.join(',') &&
                    objetoA.groupsName.join(',') === objetoB.groupsName.join(',') &&
                    objetoA.none === objetoB.none &&
                    objetoA.table === objetoB.table &&
                    objetoA.column === objetoB.column &&
                    objetoA.global === objetoB.global &&
                    objetoA.permission === objetoB.permission &&
                    objetoA.type === objetoB.type
                );
            }
   

            function objetosIgualesUsuarios(objetoA: any, objetoB: any): boolean {
                if (objetoA.users != undefined && objetoB.users != undefined
                 ) return (
                    objetoA.users.join(',') === objetoB.users.join(',') &&
                    objetoA.usersName.join(',') === objetoB.usersName.join(',') &&
                    objetoA.none === objetoB.none &&
                    objetoA.table === objetoB.table &&
                    objetoA.column === objetoB.column &&
                    objetoA.global === objetoB.global &&
                    objetoA.permission === objetoB.permission &&
                    objetoA.type === objetoB.type
                );
            }
            
            // Filtrar objetos únicos grupos
            const objetosUnicosGrupos = model_granted_roles.filter((objeto, index, self) =>
                self.findIndex(other => objetosIgualesGrupos(objeto, other)) === index
            );

             // Filtrar objetos únicos usuarios
             const objetosUnicosUsuarios = model_granted_roles.filter((objeto, index, self) =>
                self.findIndex(other => objetosIgualesUsuarios(objeto, other)) === index
            );
            
            model_granted_roles = objetosUnicosGrupos.concat(objetosUnicosUsuarios);

            model_granted_roles.forEach( r=> {
                r.source = 'update_model';
            }
            );

            // Recuperando los permisos provenientes de SinergiaCRM 
            // la propiedad source --> "EDA" indica que el permiso proviene de la applicacion y no de la base de datos
            if(mgsmap.length!==0) {
                const userRoles = mgsmap[0].filter( (r:any) => {
                    return r?.source === 'SDA' && !r.groupsName.find( e => e.startsWith('SCRM_'))
                });

                // Agregando los permisos agregados previamente en la aplicacion. 
                const all_roles =   [ ...model_granted_roles, ...userRoles];   
                main_model.ds.metadata.model_granted_roles = all_roles;
            } 

            return main_model;
        }
    }

