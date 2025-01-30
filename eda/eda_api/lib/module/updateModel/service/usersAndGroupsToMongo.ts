/**
 * User and Group Synchronization Service
 * Part of the updateModel module
 * 
 * This service handles the synchronization of users and groups between SinergiaCRM 
 * and SinergiaDA (Sinergia Data Analytics) systems. It is a crucial component of 
 * the updateModel process, ensuring that user and group data is consistently 
 * maintained across both platforms. Key functions include:
 * 
 * 1. Importing users from SinergiaCRM to SinergiaDA, creating or updating as needed.
 * 2. Importing and creating groups from SinergiaCRM roles in SinergiaDA.
 * 3. Synchronizing user-group relationships based on CRM roles and SDA-specific rules.
 * 4. Handling special cases for admin users and SinergiaCRM-specific groups (prefixed with 'SCRM_').
 * 5. Removing inactive users and deleted groups to maintain system consistency.
 * 6. Updating the MongoDB database in SinergiaDA with the synchronized data.
 * 
 * The userAndGroupsToMongo class contains two primary methods:
 * - crm_to_eda_UsersAndGroups: Initiates the synchronization process.
 * - syncronizeUsersGroups: Performs detailed synchronization logic.
 * 
 * This service is a critical part of maintaining data integrity between SinergiaCRM 
 * and SinergiaDA, ensuring that analytics and reporting in SinergiaDA accurately 
 * reflect the current state of users and groups in the CRM system.
 * 
 * Note: This service assumes the existence of User and Group models in the SinergiaDA 
 * MongoDB database and relies on user and role data structures from SinergiaCRM.
 */

import mongoose, {
  connections,
  Model,
  mongo,
  Mongoose,
  QueryOptions
} from 'mongoose'
import User, { IUser } from '../../admin/users/model/user.model'
import Group, { IGroup } from '../../admin/groups/model/group.model'
import { each } from 'lodash';

mongoose.set('useFindAndModify', false);

export class userAndGroupsToMongo {
  static async crm_to_eda_UsersAndGroups(users: any, roles: any) {
    let mongoUsers = await User.find()
    let mongoGroups = await Group.find()
    
    // First create/update all groups
    const unique_groups = [...new Set(roles.map(item => item.name))]
    for (let i = 0; i < unique_groups.length; i++) {
      if (!mongoGroups.find(e => e.name == unique_groups[i]) &&
          unique_groups[i] != 'EDA_ADMIN' &&
          unique_groups[i] != 'EDA_RO' &&
          unique_groups[i] != 'EDA_DATASOURCE_CREATOR') {
        const group = new Group({
          role: 'EDA_USER_ROLE',
          name: unique_groups[i],
          users: []
        })
        try {
          await group.save()
        } catch (err) {
          console.log(`Group ${group.name} already exists, skipped`)
        }
      }
    }
    
    // Update groups list
    mongoGroups = await Group.find()
    
    // Create/update users with their roles
    for (let i = 0; i < users.length; i++) {
      const userRoles = roles
        .filter(role => role.user_name === users[i].email)
        .map(role => {
          const group = mongoGroups.find(g => g.name === role.name)
          return group ? group._id : null
        })
        .filter(id => id !== null)
  
      let existe = mongoUsers.find(e => e.email == users[i].email)
      if (!existe) {
        let user = new User({
          name: users[i].name,
          email: users[i].email,
          password: users[i].password,
          role: userRoles
        })
        try {
          const savedUser = await user.save()
          // Update groups with the new user
          await Group.updateMany(
            { _id: { $in: userRoles } },
            { $addToSet: { users: savedUser._id } }
          )
        } catch (err) {
          console.log('Error al insertar usuario ' + user.name)
        }
      } else {
        await User.findOneAndUpdate(
          { name: users[i].name }, 
          { 
            password: users[i].password,
            $addToSet: { role: { $each: userRoles } }
          }
        )
        // Update groups with existing user
        await Group.updateMany(
          { _id: { $in: userRoles } },
          { $addToSet: { users: existe._id } }
        )
      }
    }
  
    // Synchronize the rest of the relationships
    mongoUsers = await User.find()
    await this.syncronizeUsersGroups(mongoUsers, mongoGroups, users, roles)
  }
  
  static async syncronizeUsersGroups(
    mongoUsers: any,
    mongoGroups: any,
    crmUsers: any,
    crmRoles: any
  ) {
    // Remove inactive users from CRM
    mongoUsers.forEach(a => {
      let existe = crmUsers.find(u => u.email === a.email);
      if (existe) {
        if (
          a.email !== 'eda@sinergiada.org' &&
          a.email !== 'eda@jortilles.com' &&
          a.email !== 'edaanonim@jortilles.com' &&
          existe.active == 0) {
            User.deleteOne({ email: a.email })
              .then(function () {
              })
              .catch(function (error) {
                console.log('Error deleting user:', a.email, 'Details:', error);
              })
        }
      }
    })

    // Remove deleted CRM groups
    mongoGroups.forEach(a => {  
      if( a.name.startsWith('SCRM_') ){
        let existe = crmRoles.find(u => u.name === a.name);
        if(!existe){
          Group.deleteOne( {name: a.name}  ).then( function(){ console.log( a.name +  ' deleted')})
        }
      }
    });

    // Helper functions to check user existence in CRM
    const userExistsInCRM = (user, crmUsers) => {
      return crmUsers.some(crmUser => crmUser.email === user.email && crmUser.active == 1); 
    };

    const userExistedInCRM = (user, crmUsers) => {
      return crmUsers.some(crmUser => crmUser.email === user.email); 
    };

    // Synchronize groups and users
    await mongoGroups.forEach(async (group) => {
      if (group.name.startsWith('SCRM_')) {
        // For SCRM_ groups, maintain SDA users and sync with CRM
        const crmUsersInGroup = crmRoles
          .filter(role => role.name === group.name)
          .map(role => mongoUsers.find(u => u.email === role.user_name))
          .filter(user => user)
          .map(user => user._id);
        
        group.users = [
          ...group.users.filter(userId => {
            const user = mongoUsers.find(u => u._id.toString() === userId.toString());
            return user &&  !userExistsInCRM( user, crmUsers);
          }),
          ...crmUsersInGroup
        ];

        // Add new CRM users to the group
        const newCrmUsersInGroup = crmRoles
          .filter(role => role.name === group.name)
          .map(role => mongoUsers.find(u => u.email === role.user_name &&  userExistsInCRM(u, crmUsers)  ))
          .filter(user => user && !group.users.includes(user._id))
          .map(user => user._id);
          
        group.users = [...group.users, ...newCrmUsersInGroup];

      } else {
        // For non-SCRM_ groups, maintain SDA users and update CRM users
        group.users = group.users.filter(userId => {
          const user = mongoUsers.find(u => u._id.toString() === userId.toString());
          if (!user) return false;
          if (userExistedInCRM(user, crmUsers)) {
            return userExistsInCRM(user, crmUsers) ;
          } else {
            return true;
          }
        });
      }
    });

    // Update user roles
    await mongoUsers.forEach(async (user) => {
      if( userExistsInCRM( user, crmUsers)) { 
        // Update CRM users, maintain non-SCRM_ roles
        const nonCRMRoles = user.role.filter(roleId => {
          const group = mongoGroups.find(g => g._id.toString() === roleId.toString() && !g.name.startsWith('SCRM_')  );
          return group;
        });

        // Add CRM roles
        const crmRolesForUser = crmRoles
          .filter(role => role.user_name === user.email)
          .map(role => mongoGroups.find(g => g.name === role.name))
          .filter(group => group)
          .map(group => group._id);
        
        user.role = [...new Set([...nonCRMRoles, ...crmRolesForUser])];
      }
    });

    // Ensure add all admins to EDA_ADMIN group, this include eda@sinergiada.org
    let admins = await mongoUsers.filter(i => i.role.includes('135792467811111111111110'));
    const edaAdminGroup = mongoGroups.find(i => i.name === 'EDA_ADMIN');
    edaAdminGroup.users = admins.map(admin => admin._id);

    // Save changes to database
    await mongoGroups.forEach(async r => {
      try {
        await Group.updateOne({ name: r.name }, { $unset: { users: {} } })
          .then(function () {
          })
          .catch(function (error) {
            console.log(error)
          })
      } catch (err) {
        console.log(err);
      }
      try {
        await Group.updateOne({ name: r.name }, { $addToSet: { users: r.users } })
          .then(function () {
          })
          .catch(function (error) {
            console.log(error)
          })
      } catch (err) {
        console.log(err);
      }
    })    

    const newGroupsInMongo =  await Group.find(); 
    const newGroupsIDInMongo = newGroupsInMongo.map(g=>g._id.toString());
 
    // Update user roles
    await mongoUsers.forEach(async user => {
      user.role = user.role.filter( r => newGroupsIDInMongo.includes(r.toString() ) )
      try {
        await User.updateOne({ email: user.email }, { $unset : {role: {}} })
          .then(function () {
          })
          .catch(function (error) {
            console.log(error) 
          })
      
        await User.updateOne({ email: user.email }, { $addToSet : {role: user.role} })
          .then(function () {
          })
          .catch(function (error) {
            console.log(error) 
          })
      } catch (err) {}
    })
  }
}
