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

import mongoose, { connections, Model, mongo, Mongoose, QueryOptions } from "mongoose";
import User, { IUser } from "../../admin/users/model/user.model";
import Group, { IGroup } from "../../admin/groups/model/group.model";

mongoose.set("useFindAndModify", false);

export class userAndGroupsToMongo {
  static async crm_to_eda_UsersAndGroups(users: any, roles: any) {
      console.time("Total usersAndGroupsToMongo");
      console.log(`Starting sync: ${users.length} users and ${roles.length} role assignments`);

      // Sync users and groups from CRM to EDA
      console.time("Initial User Query");
      let mongoUsers = await User.find();
      console.timeEnd("Initial User Query");
      console.log(`Found ${mongoUsers.length} existing users in MongoDB`);

      // Initialize users
      console.time("User Initialization");
      let usersCreated = 0;
      let usersUpdated = 0;
      for (let i = 0; i < users.length; i++) {
          let existe = mongoUsers.find(e => e.email == users[i].email);
          if (!existe) {
              let user = new User({
                  name: users[i].name,
                  email: users[i].email,
                  password: users[i].password,
                  role: []
              });
              try {
                  await user.save();
                  usersCreated++;
              } catch (err) {
                  console.log('usuario ' + user.name + ' (Could not insert into the MongoDB database.)');
              }
          } else {
              await User.findOneAndUpdate({ name: users[i].name }, { password: users[i].password });
              usersUpdated++;
          }
      }
      console.timeEnd("User Initialization");
      console.log(`Users processed: ${usersCreated} created, ${usersUpdated} updated`);

      // Initialize groups
      console.time("Group Initialization");
      let mongoGroups = await Group.find();
      mongoUsers = await User.find();
      const unique_groups = [...new Set(roles.map(item => item.name))];
      
      let groupsCreated = 0;
      for (let i = 0; i < unique_groups.length; i++) {
          let existe = mongoGroups.find(e => e.name == unique_groups[i]);
          if (!existe &&
              unique_groups[i] != 'EDA_ADMIN' &&
              unique_groups[i] != 'EDA_RO' &&
              unique_groups[i] != 'EDA_DATASOURCE_CREATOR'
          ) {
              let group = new Group({
                  role: 'EDA_USER_ROLE',
                  name: unique_groups[i],
                  users: []
              });
              try {
                  await group.save();
                  groupsCreated++;
              } catch (err) {
                  console.log(`Group ${group.name} already exists, skipped`);
              }
          }
      }
      console.timeEnd("Group Initialization");
      console.log(`Groups: ${mongoGroups.length} existing, ${unique_groups.length} unique, ${groupsCreated} created`);

      // Synchronize users and groups
      console.time("User-Group Synchronization");
      const stats = await this.syncronizeUsersGroups(mongoUsers, mongoGroups, users, roles);
      console.timeEnd("User-Group Synchronization");
      console.log('Synchronization completed:', stats);

      console.timeEnd("Total usersAndGroupsToMongo");
  }

  static async syncronizeUsersGroups(mongoUsers: any, mongoGroups: any, crmUsers: any, crmRoles: any) {
      let stats = {
          inactiveUsersRemoved: 0,
          deletedGroups: 0,
          groupsUpdated: 0,
          usersRolesUpdated: 0,
          groupsSaved: 0,
          usersSaved: 0
      };

      // Remove inactive users
      console.time("Remove Inactive Users");
      for (const a of mongoUsers) {
          let existe = crmUsers.find(u => u.email === a.email);
          if (existe && existe.active == 0 && 
              !['eda@sinergiada.org', 'eda@jortilles.com', 'edaanonim@jortilles.com'].includes(a.email)) {
              try {
                  await User.deleteOne({ email: a.email });
                  stats.inactiveUsersRemoved++;
              } catch (error) {
                  console.log('Error deleting user:', a.email);
              }
          }
      }
      console.timeEnd("Remove Inactive Users");

      // Remove deleted CRM groups
      console.time("Process Groups");
      for (const group of mongoGroups) {
          if (group.name.startsWith('SCRM_')) {
              let existe = crmRoles.find(u => u.name === group.name);
              if (!existe) {
                  try {
                      await Group.deleteOne({ name: group.name });
                      stats.deletedGroups++;
                  } catch (error) {
                      console.log('Error deleting group:', group.name);
                  }
              }

              // Process SCRM groups
              const crmUsersInGroup = crmRoles
                  .filter(role => role.name === group.name)
                  .map(role => mongoUsers.find(u => u.email === role.user_name))
                  .filter(user => user)
                  .map(user => user._id);

              group.users = [
                  ...group.users.filter(userId => {
                      const user = mongoUsers.find(u => u._id.toString() === userId.toString());
                      return user && !userExistsInCRM(user, crmUsers);
                  }),
                  ...crmUsersInGroup
              ];

              const newCrmUsersInGroup = crmRoles
                  .filter(role => role.name === group.name)
                  .map(role => mongoUsers.find(u => u.email === role.user_name && userExistsInCRM(u, crmUsers)))
                  .filter(user => user && !group.users.includes(user._id))
                  .map(user => user._id);

              group.users = [...new Set([...group.users, ...newCrmUsersInGroup])];
              stats.groupsUpdated++;
          } else {
              group.users = group.users.filter(userId => {
                  const user = mongoUsers.find(u => u._id.toString() === userId.toString());
                  if (!user) return false;
                  return userExistedInCRM(user, crmUsers) ? userExistsInCRM(user, crmUsers) : true;
              });
          }
      }
      console.timeEnd("Process Groups");

      // Update user roles
      console.time("Update Roles");
      for (const user of mongoUsers) {
          if (userExistsInCRM(user, crmUsers)) {
              const nonCRMRoles = user.role.filter(roleId => {
                  const group = mongoGroups.find(g => g._id.toString() === roleId.toString() && !g.name.startsWith('SCRM_'));
                  return group;
              });

              const crmRolesForUser = crmRoles
                  .filter(role => role.user_name === user.email)
                  .map(role => mongoGroups.find(g => g.name === role.name))
                  .filter(group => group)
                  .map(group => group._id);

              user.role = [...new Set([...nonCRMRoles, ...crmRolesForUser])];
              stats.usersRolesUpdated++;
          }
      }
      console.timeEnd("Update Roles");

      // Save all changes
      console.time("Save Changes");
      for (const group of mongoGroups) {
          try {
              await Group.updateOne({ name: group.name }, { $unset: { users: {} } });
              await Group.updateOne({ name: group.name }, { $addToSet: { users: group.users } });
              stats.groupsSaved++;
          } catch (err) {
              console.log(`Error updating group ${group.name}`);
          }
      }

      const newGroupsInMongo = await Group.find();
      const newGroupsIDInMongo = newGroupsInMongo.map(g => g._id.toString());

      for (const user of mongoUsers) {
          try {
              user.role = user.role.filter(r => newGroupsIDInMongo.includes(r.toString()));
              await User.updateOne({ email: user.email }, { $unset: { role: {} } });
              await User.updateOne({ email: user.email }, { $addToSet: { role: user.role } });
              stats.usersSaved++;
          } catch (err) {
              console.log(`Error updating user ${user.email}`);
          }
      }
      console.timeEnd("Save Changes");

      return stats;
  }
}

// Helper functions
function userExistsInCRM(user: any, crmUsers: any[]) {
  return crmUsers.some(crmUser => crmUser.email === user.email && crmUser.active == 1);
}

function userExistedInCRM(user: any, crmUsers: any[]) {
  return crmUsers.some(crmUser => crmUser.email === user.email);
}