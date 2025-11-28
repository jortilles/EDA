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
            const ROOT_PATH = process.cwd();
            const uploadsPath = path.join(ROOT_PATH, 'lib/module/uploads/images', randomName);

            file.mv(uploadsPath, async err => {

                if (err) {
                    console.log(err);
                    return next(new HttpException(500, 'Error moving the image'));
                }

                if (req.qs.from === 'user') {
                    try {
                        const userBD = await User.findById(id);

                        // const oldPath = path.resolve(__dirname, `../../uploads/${userBD.img}`);
                        const oldPath = path.join(ROOT_PATH, 'lib/module/uploads/images', `${userBD.img}`);

                        // Si existe, elimina la imagen anterior
                        try {
                            if (fs.existsSync(oldPath)) {
                                const stat = fs.lstatSync(oldPath);
                                if (stat.isFile()) {
                                    fs.unlinkSync(oldPath);
                                    console.log('Archivo anterior eliminado correctamente');
                                } else {
                                    console.warn('El path no es un archivo, no se elimina:', oldPath);
                                }
                            }
                        } catch (err) {
                            console.error('Error eliminando archivo anterior:', err);
                        }

                        userBD.img = randomName;
                        try {
                            const userUpdated = await userBD.save();
                            return res.status(200).json({ ok: true, message: 'Profile Image successful updated', user: userUpdated });
                        } catch (error) {
                            return next(new HttpException(500, 'Error saving image'));
                        }
                    } catch (error) {
                            return (new HttpException(500, 'User not exists'));
                    }
                }
            });
        } catch (err) {
            next(err);
        }

    };
}
