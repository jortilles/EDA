let User = require('../../models/user/user-model'),
    fs = require('fs')
    path = require('path');

exports.uploadProfile = (req, res) => {

    const id = req.query.id;

    if ( !req.files ) {
        return res.status(400).json({
            ok: false,
            message: 'Not file selected',
            errors: { message: 'You must select an image' }
        });
    }

    // Obtenemos nombre archivo
    const file = req.files.img;
    const name = file.name.split('.');
    const extension = name[name.length - 1];

    // Extensiones validas
    const validExtensions = ['png', 'jpg', 'gif', 'jpeg'];

    if ( validExtensions.indexOf(extension) < 0 ) {
        return res.status(400).json({
            ok: false,
            message: 'Invalid image extension',
            errors: { message: `Valid extensions are ${validExtensions.join(', ')}` }
        });
    }

    // Nombre archivo personalizado
    const randomName = `${ id }-${ new Date().getMilliseconds() }.${ extension }`

    // Mover imagen del temporal a un path
    const pathImage = path.resolve(__dirname,`../../uploads/users/${ randomName }`);

    file.mv( pathImage, err => {

        if ( err ) {
            return res.status(500).json({
                ok: false,
                message: 'Error moving the image',
                errors: err
            });
        }
        if (req.query.from === 'user') {
            updateImage(id, randomName, res);
        }

    });

};

function updateImage(id, fileName, res) {

    User.findById( id, (err, userBD) => {

        if ( !userBD ) {
            return res.status(400).json({
                ok: false,
                message: 'User not exists',
                errors: { message: 'User not exists' }
            })
        }

        let oldPath = path.resolve(__dirname,`../../uploads/users/${ userBD.img }`);

        // Si existe, elimina la imagen anterior
        if ( fs.existsSync(oldPath) ) {
            fs.unlinkSync(oldPath);
        }

        userBD.img = fileName;

        userBD.save( (err, userUpdated) => {

            if ( err ) {
                return res.status(500).json({
                    ok: false,
                    message: 'Error saving image',
                    errors: err
                });
            }

            return res.status(200).json({
                ok: true,
                message: 'Profile Image successful updated',
                user: userUpdated
            });
        });

    });

}
