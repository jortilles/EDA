const DataSource = require('../../models/global/data-source-model');
const User = require('../../models/user/user-model');

exports.find = (req, res) => {

    const param = req.params.param;
    const regex = new RegExp( param, 'i' );

    Promise.all([
            findDataSources(param, regex),
            findUsers(param, regex) ] )
        .then(responses => {
            res.status(200).json({
                ok: true,
                ds: responses[0],
                users: responses[1]
            });
        });
}

exports.findInCollection = (req, res) => {
    const collection = req.params.collection;
    const param = req.params.param;
    const regex = new RegExp( param, 'i' );


    let promise;

    switch( collection ) {
        case 'users':
            promise = findUsers(param, regex);
        break;
        
        case 'data-source':
            promise = findDataSources(param, regex);
        break;

        default: 
            return res.status(400).json({
                ok: false,
                message: 'Search types only are: DataSources, Users',
                error: { message: 'Invalid collection type' }
            });
    }

    promise.then( data => {
        
        res.status(200).json({
            ok: true,
            [collection]: data
        });

    });

}

function findDataSources(param, regex) {
    
    return new Promise((resolve, reject) => {

        DataSource.find({ name: regex })
            .populate('user', 'name email')
            .exec((err, ds) => {

            if ( err ) {
                reject('Error loading datasources', err);
            } else {
                resolve(ds);
            }
    
        });
    });
}

function findUsers(param, regex) {
    
    return new Promise((resolve, reject) => {

        User.find({}, 'name email role')
            .or([ { 'name': regex }, { 'email': regex } ])
            .exec( (err, users) => {

                if ( err ) {
                    reject('Error loading users', err);
                } else {
                    resolve(users);
                }

            });
    });
}