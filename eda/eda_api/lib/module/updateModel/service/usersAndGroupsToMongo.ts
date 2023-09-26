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
  static async crm_to_eda_UsersAndGroups (users: any, roles: any) {
    /** METEMOS USUARIOS Y GRUPOS */

    let mongoUsers = await User.find()

    /** inicializamos usuarios */
    for (let i = 0; i < users.length; i++) {
      let existe = mongoUsers.find(e => e.email == users[i].email)
      if (!existe) {
        console.log('procesando');
        console.log(users[i]);

        let user = new User({
          name: users[i].name,
          email: users[i].email,
          password: users[i].password,
          role: []
          //active: users[i].active  ----> eliminamos el campo active y discriminamos más tarde su eliminación
        })
        try {
          await user.save()
          console.log(
            ' usuario ' + user.name + ' introducido correctamente en la bbdd'
          )
        } catch (err) {
          console.log(
            'usuario ' +
              user.name +
              ' repetido, no se ha introducido en la bbdd'
          )
        }
      } else {
          let userInMongo = await User.findOneAndUpdate({name : users[i].name}, {password: users[i].password});
          console.log(' usuario ' + users[i].name + '  ya existe en mongo')
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
        console.log(' grupo ' + unique_groups[i] + ' Ya existe')
      }
    }

    /* mete usuarios en los grupos y viceversa . 
    cruza los datos de los usuarios de CRM con los de EDA para actualizar.
    */

    await this.syncronizeUsersGroups(mongoUsers, mongoGroups, users, roles)
  }



  static async syncronizeUsersGroups (
    users: any,
    roles: any,
    crmUser: any,
    crmRoles: any
  ) {
    //buscamos el grupo adecuado para inyectarle todos los Ids

    let options: QueryOptions = {}

    await users.forEach(line => {
      let existe = crmUser.find(i => i.email == line.email)
      //borramos los usuarios que tienen el campo active == 0
      let active = true;
      try {
        if (existe.active == 0) {
          active = false
        }
      } catch (e) {
          console.log('usuario ' + line.email + ' no tiene campo active')
      }

      //borramos todos los que estan en el objeto, los usuarios de jortilles y los que tienen asignado el 0 en activo
      if (
        existe &&
        line.email !== 'eda@sinergiada.org' &&
        line.email !== 'edaanonim@jortilles.com' &&
        active == false
      ) {
        User.deleteOne({ email: line.email })
          .then(function () {
            console.log(line.email + ' deleted') // Success
          })
          .catch(function (error) {
            console.log(error) // Failure
          })
      }
    })

    // para los grupos. Borro los usuarios. Lo mismo para los usuarios... borro los grupos
/*

    console.log('y estos grupos');
    console.log(roles);
    console.log('BUSCANDO EN ESTOS USUARIOS');
    console.log(users);
    console.log('Trato estos roles de bbdd');
    console.log(crmRoles);
    */



    crmRoles.forEach(line => {
      //actualizamos tanto el array de usuarios como el el de grupos, ojo con el método apuntador, pues actualiza el objeto original!!!
      if (line.name !== 'EDA_ADMIN') {
        console.log('Comprobando');
        console.log(line);

        let user = users.find(i => i.email.toString() === line.user_name.toString() );
        let group = roles.find(i => i.name === line.name);
        try {
          user.role = [];
        } catch (e) {
          console.log('Error initializating  because user  does not exists IN THE ORIGIN  ' + line.user_name   );
        }
        try {
          group.users = [];
        } catch (e) {
          console.log('Error initializating  because   role does not exists IN THE ORIGIN  role  ' + line.name);
        }

        
      }
    })

    // reseteo el grupo admin pra que se inicialize con el admin de eda.
    roles.find(i => i.name ===  'EDA_ADMIN').users=['135792467811111111111111'];

    // y luego vuelvo a añadir el contenido
    crmRoles.forEach(line => {
      //actualizamos tanto el array de usuarios como el el de grupos, ojo con este método apuntador!!!
      let user = users.find(i => i.email === line.user_name)
      let group = roles.find(i => i.name === line.name)
      try {
        user.role.push(group._id)
      } catch (e) {
        console.log('Error recreating user because it does not exists in the origin ' + user  );
      }

      try {
        group.users.push(user._id)
      } catch (e) {
        console.log('Error recreating  group becauser it does not exists in the origin role  ' + group);
      }
    })

    //incluimos los id´s correspondientes tanto en usuarios como en grupos, discriminando repeticiones
    console.log('Refrescando roles');
    console.log(roles);

    await roles.forEach(async r => {
      try {
        Group.updateOne({ name: r.name }, { $addToSet: { users: r.users } })
          .then(function () {
            console.log(r.name + ' Updated') // Success
          })
          .catch(function (error) {
            console.log(error) // Failure
          })
      } catch (err) {}
    })

    await users.forEach(async y => {
      try {
        User.updateOne({ name: y.name }, { $addToSet: { role: y.role } })
          .then(function () {
            console.log(y.name + ' Updated') // Success
          })
          .catch(function (error) {
            console.log(error) // Failure
          })
      } catch (err) {}
    })
  }
}
