const User = require('../../models/user/user-model'),
    bcrypt = require('bcryptjs'),
    jwt = require('jsonwebtoken'),
    SEED = require('../../../config/config').SEED,
    path = require('path'),
    fs = require('fs'),
    Error = require('../../models/error-model/error-model');


exports.findAll = (req, res) => {
    User.find({}, 'name email img role google')
        .exec(
            ( err, users ) => {
                if ( err ) {
                    return res.status(500).json(new Error(false, 'Error loading users', err));
                }

                User.count({}, (err, count) => {
                    res.status(200).json({ok: true, users, count});
                });

            }
        )
};

exports.getUser = (req, res) => {
    User.findById({_id: req.params.id}, (err, userDB) => {
        if (err) {
            return res.status(500).json(new Error(false, 'User not found with this id'));
        }
        userDB.password = 'password_protected';
        res.status(200).json({ok: true, user: userDB});
    });
};

exports.findProfileImg = (req, res) => {
    const img = req.params.img;

    const pathImage = path.resolve(__dirname, `../../uploads/users/${img}`);

    if ( fs.existsSync(pathImage) ) {
        res.sendFile(pathImage);
    } else {
        const pathNoImage = path.resolve(__dirname, `../../assets/no-img.jpg`);
        res.sendFile(pathNoImage);
    }
};

exports.login = (req, res) => {

    const body = req.body;

    User.findOne({ email: body.email }, ( err, userDB ) => {

        if ( err ) {
            return res.status(500).json(new Error(false, 'User not found with this email', err));
        }

        if ( !userDB ) {
            return res.status(400).json(new Error(false, 'Incorrect credentials - email', err));
        }

        if (!bcrypt.compareSync(body.password, userDB.password)) {
            return res.status(400).json(new Error(false, 'Incorrect credentials - password', err));
        }

        // Generate token
        userDB.password = ':)';
        const token = jwt.sign({ user: userDB }, SEED, { expiresIn: 14400 }); // 4 hours

        res.status(200).json({
            ok: true,
            user: userDB,
            token: token,
            id: userDB._id
        });
    });
};

exports.refreshToken = (req, res) => {
    let token = jwt.sign({ user: req.user }, SEED, { expiresIn: 14400 }); // 4 hours

    res.status(200).json({ok: true, token});
};

// Create and Save a new user
exports.create = (req, res) => {
    const body = req.body;
    // Create a User
    const user = new User({
        name: body.name,
        email: body.email,
        password: bcrypt.hashSync(body.password, 10),
        img: body.img,
        role: body.role
    });
    //Save User in db
    user.save(( err, userSaved ) => {

        if ( err ) {
            return res.status(400).json(new Error(false, 'Some error ocurred while creating the User', err));
        }

        res.status(201).json({ok: true, user: userSaved, userToken: req.user});
    });
};

exports.update = (req, res) => {
    // Validation request
    const body = req.body;
    User.findById(req.params.id, ( err, user ) => {

        if ( err ) {
            return res.status(500).json(new Error(false, 'Error user not found', err));
        }

        if ( !user ) {
            return res.status(400).json(new Error(false, `User with id ${req.params.id} not found`, err));
        }

        user.name = body.name;
        user.email = body.email;
        user.role = body.role;

        user.save(( err, userSaved ) => {

            if ( err ) {
                return res.status(400).json(new Error(false, 'Error updating user', err));
            }

            userSaved.password = ':)';

            return res.status(200).json({ok: true, user: userSaved});
        });
    });
};

exports.delete = (req, res) => {
    User.findByIdAndRemove(req.params.id, ( err, userRemoved ) => {

        if ( err ) {
            return res.status(500).json(new Error(false, 'Error removing an user', err));
        }

        if ( !userRemoved ) {
            return res.status(400).json(new Error(false, 'Not exists user with this id', err));
        }

        return res.status(200).json({ok: true, user: userRemoved});
    });
};
