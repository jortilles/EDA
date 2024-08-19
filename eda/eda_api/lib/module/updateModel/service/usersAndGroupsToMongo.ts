import mongoose, {
  connections,
  Model,
  mongo,
  Mongoose,
  QueryOptions
} from 'mongoose'
import User, { IUser } from '../../admin/users/model/user.model'
import Group, { IGroup } from '../../admin/groups/model/group.model'

export class userAndGroupsToMongo {
  static async crm_to_eda_UsersAndGroups(users: any, roles: any) {
    /** METEMOS USUARIOS Y GRUPOS */

    let mongoUsers = await User.find()

    /** inicializamos usuarios */
    for (let i = 0; i < users.length; i++) {
      let existe = mongoUsers.find(e => e.email == users[i].email)
      if (!existe) {
        //console.log('procesando');
        //console.log(users[i]);

        let user = new User({
          name: users[i].name,
          email: users[i].email,
          password: users[i].password,
          role: []
          //active: users[i].active  ----> eliminamos el campo active y discriminamos más tarde su eliminación
        })
        try {
          await user.save()
          //console.log( ' usuario ' + user.name + ' introducido correctamente en la bbdd' ) ;
          
        } catch (err) {
          console.log(
            'usuario ' +
            user.name +
            ' repetido, no se ha introducido en la bbdd'
          )
        }
      } else {
        await User.findOneAndUpdate({ name: users[i].name }, { password: users[i].password });
        // console.log(' usuario ' + users[i].name + '  ya existe en mongo')
      }
    }

    let mongoGroups = await Group.find()
    mongoUsers = await User.find()
    const unique_groups = [...new Set(roles.map(item => item.name))]

    for (let i = 0; i < unique_groups.length; i++) {
      let existe = mongoGroups.find(e => e.name == unique_groups[i])
      //console.log('Existe: ' +  existe);
      // No meto estos 3 porque son internos de EDA
      if (
        !existe &&
        unique_groups[i] != 'EDA_ADMIN' &&
        unique_groups[i] != 'EDA_RO' &&
        unique_groups[i] != 'EDA_DATASOURCE_CREATOR'
      ) {
        let group = new Group({
          role: 'EDA_USER_ROLE',
          name: unique_groups[i],
          users: []
        })
        try {
          //console.log('Grabo e grupo' +  group);
          await group.save()
          console.log(
            ' grupo ' + group.name + ' introducido correctamente en la bbdd'
          )
        } catch (err) {
          console.log(
            'grupo ' + group.name + ' repetido, no se ha introducido en la bbdd'
          )
        }
      } else {
        //console.log(' grupo ' + unique_groups[i] + ' Ya existe')
      }
    }

    /* mete usuarios en los grupos y viceversa . 
    cruza los datos de los usuarios de CRM con los de EDA para actualizar.
    */

    await this.syncronizeUsersGroups(mongoUsers, mongoGroups, users, roles);
  }
  
  static async syncronizeUsersGroups(
    mongoUsers: any,
    mongoGroups: any,
    crmUser: any,
    crmRoles: any
  ) {

    //eliminamos los usuarios inactivos del crm
    mongoUsers.forEach(a => {
      let existe = crmUser.find(u => u.email === a.email);
      if (existe) {
        if (
          a.email !== 'eda@sinergiada.org' &&
          a.email !== 'eda@jortilles.com' &&
          a.email !== 'edaanonim@jortilles.com' &&
          existe.active == 0) {
            //console.log("El usuario " + a.name + " ya no está activo y es eliminado")
            User.deleteOne({ email: a.email })
              .then(function () {
                //console.log(a.email + ' deleted') // Success
              })
              .catch(function (error) {
                console.log(error, "no se ha borrado el usuario " + a.email) // Failure
              })
        }
      }
    })

    //reseteamos los grupos de los usuarios y los usuarios de los grupos
    await mongoGroups.forEach( g => {
      g.users = [];
    })

    await mongoUsers.forEach(u => {
      u.role = []
    })

    // y luego vuelvo a añadir el contenido tanto en usuarios como en grupos
    crmRoles.forEach(line => {
      mongoUsers.forEach(i => {
        mongoGroups.forEach(g => {
          if (g.name === line.name && i.email === line.user_name) {
            try {
              g.users.push(i._id);
              i.role.push(g._id);
            } catch (e) {
              console.log("Esto no va")
            }
          }
        })
      })
    })

    //empujo el grupo admin para que se inicialize con el admin de eda y el empujo usuario EDA con función de admin
    await mongoGroups.find(i => i.name ===  'EDA_ADMIN').users.push('135792467811111111111111')
    let user = await mongoUsers.find(i => i.email ===  ('eda@jortilles.com') ) ;
    if(user){
      user.role.push('135792467811111111111110');
    }else{
      user = await mongoUsers.find(i => i.email ===  ('eda@sinergiada.org' ) )
      if(user){
        user.role.push('135792467811111111111110');
      }else{
        console.log('NO SE HA PODIDO AÑADIR EL ROL AL USUARIO ADMIN <=============================================================================');
      }

    }



    //guardamos en la bbdd
    await mongoGroups.forEach(async r => {
      try {
        await Group.updateOne({ name: r.name }, { $unset: { users: {} } })
          .then(function () {
            //console.log(r.name + ' Updated') // Success
          })
          .catch(function (error) {
            console.log(error) // Failure
          })
      } catch (err) {
        console.log(err);
      }
      try {
        await Group.updateOne({ name: r.name }, { $addToSet: { users: r.users } })
          .then(function () {
            //console.log(r.name + ' Updated') // Success
          })
          .catch(function (error) {
            console.log(error) // Failure
          })
      } catch (err) {
        console.log(err);
      }
    })    
    
    //filtramos grupos por usuario, buscando los grupos que empiezan por "SDA_"
    await mongoUsers.forEach(async y => {
      const groups = await Group.find(); 
      let totalRolesIds = []; 
      let userMongoRoles = [] ;
      try {
        userMongoRoles = (await User.findById(y._id)).role;
      } catch (e) {
        console.log("el usuario " + y.name + " no tiene roles")
      }
      const groupsWithNoSDA = groups.filter(g => !g.name.startsWith("SDA_"));
      const filteredRoles = groupsWithNoSDA.filter(f => userMongoRoles.includes(f._id)); 
      filteredRoles.forEach(r => totalRolesIds.push(r._id)); 
      
      const crmFilterUser = crmRoles.filter(rol => rol.user_name === y.email) 
      const groupsMatchCrm = crmFilterUser.map(a => a.name) 
      const mongocrmFilterUser = groups.filter(a => groupsMatchCrm.includes(a.name))
      mongocrmFilterUser.forEach(a => totalRolesIds.push(a._id)); 
            
      if (y._id != "135792467811111111111111" || y._id !="135792467811111111111112" ) {
         try {
          await User.updateOne({ email: y.email }, { $unset : {role: {}} })
          .then(function () {
           // console.log(y.name + ' Unset ') 
          })
          .catch(function (error) {
            console.log(error) 
          })
        
        await User.updateOne({ email: y.email }, { $addToSet : {role: totalRolesIds} })
          .then(function () {
            //console.log(y.name + ' Updated')
          })
          .catch(function (error) {
            console.log(error) 
          })
        }
        
      catch (err) {}
    }})
  }
}
