import { NextFunction, Request, Response } from 'express';
import { HttpException } from '../global/model/index';
import User from '../admin/users/model/user.model';

import * as path from 'path';
import * as fs from 'fs';

export class UploadController {

    static async uploadProfile(req: Request, res: Response, next: NextFunction) {
        try {
            const id = req.qs.id;

            console.log('req.files => ', req.files);

            if (!req.files) {
                return next(new HttpException(400, 'You must select an image'));
            }

            // Obtenemos nombre archivo
            const file: any = req.files.img;
            const name = file.name.split('.');
            const extension = name[name.length - 1];

            console.log('file => ', file)
            console.log('name => ', name)
            console.log('extension => ', extension)

            // Extensiones validas
            const validExtensions = ['png', 'jpg', 'gif', 'jpeg'];

            if (validExtensions.indexOf(extension) < 0) {
                return next(
                    new HttpException(400, 'Invalid image extension' + `Valid extensions are ${validExtensions.join(', ')}`)
                );
            }

            // Nombre archivo personalizado
            const randomName = `${id}-${new Date().getMilliseconds()}.${extension}`;
            console.log('randomName => ', randomName)
            
            // Mover imagen del temporal a un path
            const ROOT_PATH = process.cwd();
            
            const uploadsPath = path.join(ROOT_PATH, 'lib/module/uploads/users/images', randomName);

            console.log('ROOT_PATH::::::::::::::::: ', ROOT_PATH);
            console.log('uploadsPath ===> ', uploadsPath);



            file.mv(uploadsPath, err => {

                if (err) {
                    console.log(err);
                    return next(new HttpException(500, 'Error moving the image'));
                }

                console.log('req.qs: ', req.qs);

                if (req.qs.from === 'user') {
                    User.findById(id, (err, userBD) => {

                        if (!userBD) {
                            return next(new HttpException(500, 'User not exists'));
                        }

                        // const oldPath = path.resolve(__dirname, `../../uploads/users/${userBD.img}`);
                        const oldPath = path.join(ROOT_PATH, 'lib/module/uploads/users/images', `${userBD.img}`);
                        console.log('oldPath ===> ', oldPath);
                        console.log('userBD ===> ', userBD);


                        // Si existe, elimina la imagen anterior
                        if (fs.existsSync(oldPath)) {
                            console.log('holaaaaaaaaaaaaaaa ......')
                            fs.unlinkSync(oldPath);
                        }

                        userBD.img = randomName;

                        userBD.save((err, userUpdated) => {

                            if (err) {
                                return next(new HttpException(500, 'Error saving image'));
                            }

                            return res.status(200).json({ ok: true, message: 'Profile Image successful updated', user: userUpdated });
                        });
                    });
                }
            });
        } catch (err) {
            next(err);
        }

    };
}
