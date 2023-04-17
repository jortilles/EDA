import mongoose, { connections, Model, mongo, Mongoose } from 'mongoose';
import { Connections } from '../config/connections';
import { GroupModel } from '../database/models/groups';
import { UserModel } from '../database/models/users';


export class userAndGroupsToMongo {

  static async crm_to_eda_UsersAndGroups(users: any, roles: any) {
    /** METEMOS USUARIOS Y GRUPOS */

    let Users = await new UserModel().userModel()

    let mongoUsers = await Users.find();

    /** inicializamos usuarios */
    for (let i = 0; i < users.length; i++) {
      let existe = mongoUsers.find(e => e.email == users[i].email);
      if (!existe) {
        let user = new Users({
          name: users[i].name,
          email: users[i].email,
          password: users[i].password,
          role: [] ,
         //active: users[i].active  ----> eliminamos el campo active y discriminamos más tarde su eliminación
        })
        try {
          
          await user.save()
          console.log(' usuario ' + user.name + ' introducido correctamente en la bbdd')

        } catch (err) {
          console.log('usuario ' + user.name + ' repetido, no se ha introducido en la bbdd')
        }
      }
    }

    const Group = await new GroupModel().groupModel()

    let mongoGroups = await Group.find();
    mongoUsers = await Users.find();
    const unique_groups = [...new Set(roles.map(item => item.name))];

    for (let i = 0; i < unique_groups.length; i++) {
      let existe = mongoGroups.find(e => e.name == unique_groups[i]);
      //console.log('Existe: ' +  existe);
      // No meto estos 3 porque son internos de EDA
      if (!existe && unique_groups[i] != 'EDA_ADMIN' && unique_groups[i] != 'EDA_RO' && unique_groups[i] != 'EDA_DATASOURCE_CREATOR') {
        let group = new Group(
          {
            role: 'EDA_USER_ROLE',
            name: unique_groups[i],
            users: []
          });
        try {
          //console.log('Grabo e grupo' +  group);
          await group.save()
          console.log(' grupo ' + group.name + ' introducido correctamente en la bbdd')

        } catch (err) {
          console.log('grupo ' + group.name + ' repetido, no se ha introducido en la bbdd')
        }
      }
    }

    /* mete usuarios en los grupos y viceversa . 
    cruza los datos de los usuarios de CRM con los de EDA para actualizar.
    */

    await this.syncronizeUsersGroups(mongoUsers, mongoGroups, users, roles)


  }

  static async syncronizeUsersGroups(users: any, roles: any, crmUser: any, crmRoles: any) {


    //buscamos el grupo adecuado para inyectarle todos los Ids

    const groupModel = mongoose.model('groups')
    const userModel = mongoose.model('users')
    
 
    await users.forEach(line => {
      let existe = crmUser.find(i => i.email == line.email);
      
      //borramos los usuarios que tienen el campo active == 0
      let active = true
        
        try {
          if (existe.active == 0) {
            active = false
          } 
        } catch (e) {
          console.log("usuario " + line.email + " no tiene campo active")
        }

      //borramos todos los que estan en el objeto, los usuarios de jortilles y los que tienen asignado el 0 en activo
      if (existe && line.email !== "eda@jortilles.com" && line.email !== "edaanonim@jortilles.com" && active==false) {
        userModel.deleteOne({ email: line.email }, function (err, res) {
          if (err) console.log(err);
          console.log(line.email + ' borrado ');
        });
      }

    })

    // para los grupos. Borro los usuarios. Lo mismo para los usuarios... borro los grupos
    
  
    crmRoles.forEach(  (line) => {
      //actualizamos tanto el array de usuarios como el el de grupos, ojo con el método apuntador, pues actualiza el objeto original!!!
      if (line.name !== 'EDA_ADMIN') {
        let user =  users.find(i => i.email === line.user_name);
        let group = roles.find(i => i.name === line.name);
        user.role = [];
        group.users = [];
      }

    })
    
    // y luego vuelvo a añadir el contenido
    crmRoles.forEach(  (line) => {

      //actualizamos tanto el array de usuarios como el el de grupos, ojo con este método apuntador!!!
      let user =   users.find(i => i.email === line.user_name);
      let group =  roles.find(i => i.name === line.name);
   
      user.role.push(group._id); 
      group.users.push(user._id);
      

    })

  //incluimos los id´s correspondientes tanto en usuarios como en grupos, discriminando repeticiones

    await roles.forEach(  async r => {
      
      try {

         groupModel.updateOne({ name: r.name }, {$addToSet: {users: r.users }}, (err, ok) => {
          if (err) throw err;
        })
      } catch (err) {
      }
    })

    await users.forEach( async y => {
      try {
         userModel.updateOne({ name: y.name }, {$addToSet: {role: y.role}}, (err, ok) => {
          if (err) throw err;
        })
      } catch (err) {

      }
    })
  }

}
