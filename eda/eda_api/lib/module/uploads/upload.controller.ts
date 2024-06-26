import { NextFunction, Request, Response } from 'express';
import { HttpException } from '../global/model/index';
import User from '../admin/users/model/user.model';

import * as path from 'path';
import * as fs from 'fs';

export class UploadController {

    static async uploadProfile(req: Request, res: Response, next: NextFunction) {
        try {
            const id = req.qs.id;

            if (!req.files) {
                return next(new HttpException(400, 'You must select an image'));
            }

            // Obtenemos nombre archivo
            const file: any = req.files.img;
            const name = file.name.split('.');
            const extension = name[name.length - 1];

            // Extensiones validas
            const validExtensions = ['png', 'jpg', 'gif', 'jpeg'];

            if (validExtensions.indexOf(extension) < 0) {
                return next(
                    new HttpException(400, 'Invalid image extension' + `Valid extensions are ${validExtensions.join(', ')}`)
                );
            }

            // Nombre archivo personalizado
            const randomName = `${id}-${new Date().getMilliseconds()}.${extension}`;

            // Mover imagen del temporal a un path
            const pathImage = path.resolve(__dirname, `../uploads/users/${randomName}`);

            file.mv(pathImage, err => {

                if (err) {
                    console.log(err);
                    return next(new HttpException(500, 'Error moving the image'));
                }

                if (req.qs.from === 'user') {
                    User.findById(id, (err, userBD) => {

                        if (!userBD) {
                            return next(new HttpException(500, 'User not exists'));
                        }

                        const oldPath = path.resolve(__dirname, `../../uploads/users/${userBD.img}`);

                        // Si existe, elimina la imagen anterior
                        if (fs.existsSync(oldPath)) {
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
