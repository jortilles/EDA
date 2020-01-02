const mDB = require('./mongo_queries');



exports.check_permissions = async (req) => {
    data = req.body;
    /** Get user and roles **/
    const user_id = data.user.user_id;
    const user_roles = data.user.user_roles;

    /** Get columns info from query and datamodel from mongoDB **/
    const columns = get_columns(data);
    const dm = await mDB.get_datasource(req.body.model_id);
    const dm_json = JSON.parse(JSON.stringify(dm));
    dm_granted_roles = dm_json.ds.metadata.model_granted_roles;

    /**
     * TO-DO
     * check user permissions over model
     *  */

    /** Permissions for columns TO-DO **/
    let authorized = check_column_permission();
    return true;

}

function get_columns(data) {
    let columns = [];
    let tables = [];
    data.query.fields.forEach(e => {
        columns.push(e);
    });
}

function check_column_permission(){
    console.log('\x1b[32m%s\x1b[0m', '\nAuthorization process...' )
    authorized = true;
    console.log('\x1b[36m%s\x1b[0m', '\nAuthorized! (Authorization not implemented yet)\n');
    return authorized;
}

