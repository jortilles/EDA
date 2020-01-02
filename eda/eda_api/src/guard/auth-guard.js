const jwt = require('jsonwebtoken');
const SEED = require('../../config/config').SEED;
const _ = require('lodash');

function authGuard (req, res, next) {
    let token = req.query.token;
    
    if ( !_.isNil(token) ) {

        jwt.verify(token, SEED, (err, decoded) => {
            
            if ( err ) {
                return res.status(401).json({
                    ok: false,
                    message: 'Invalid Token',
                    errors: err
                });
            }

        req.user = decoded.user;

        let url = req.baseUrl + req.path;
        _.forEach(req.params, (v, k) => {
            url = url.replace('/' + v, '/:' + k);
        });

        console.log('\x1b[34m=====\x1b[0m Route Guard -- url: [' + url + '] method: [' + req.method + '] userAuth: [ USER_ROLE ] \x1b[34m=====\x1b[0m');

        next();

        });

    } else {
        return res.status(401).json({
            ok: false,
            message: 'Token required'
        });

    }
}

module.exports = authGuard;
