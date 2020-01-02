const Group = require('../../models/user/group-model'),
    Error = require('../../models/error-model/error-model');


const functions = {};

functions.findAll = (req, res) => {
    Group.find({})
        .exec((err, groups) => {
                if (err) {
                    return res.status(500).json(new Error(false, 'Error loading groups', err));
                }

                Group.count((err, count) => {
                    res.status(200).json({ok: true, groups, count});
                })
             }
        )
};

functions.createGroup = (req, res) => {
    const body = req.body;

    const group = new Group({
        name: body.name,
        role: body.role,
        users: body.users,
        img: body.img
    });

    group.save((err, groupSaved) => {
        if ( err ) {
            return res.status(400).json(new Error(false, 'Some error ocurred while creating the Group', err));
        }

        res.status(201).json({ok: true, group: groupSaved});
    })
};

functions.updateGroup = (req, res) => {
    const body = req.body;

    Group.findById(req.params.id, (err, group) => {
        if (err) {
            return res.status(500).json(new Error(false, 'Group not found', err));
        }

        if ( !group ) {
            return res.status(400).json(new Error(false, `Group with id ${req.params.id} not found`, err));
        }

        group.name = body.name;
        group.users = body.users;
        group.role = body.role;

        group.save((err, groupSaved) => {
            if (err) {
                return res.status(500).json(new Error(false, 'Error updating the group'));
            }

            return res.status(200).json({ok: true, group: groupSaved});
        });

    });
};

functions.deleteGroup = (req, res) => {
    Group.findOneAndDelete(req.params.id, (err, groupDeleted) => {
        if (err) {
            return res.status(500).json(new Error(false, 'Error removing group', err))
        }

        if (!groupDeleted) {
            return res.status(400).json(new Error(false, 'Group not exists', err));
        }

        res.status(200).json({ok: true});
    });
};

module.exports = functions;
