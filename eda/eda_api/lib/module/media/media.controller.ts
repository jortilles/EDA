import { NextFunction, Request, Response } from 'express';
import { HttpException } from '../global/model/index';
import Media, { IMedia } from './model/media.model';
import MediaFolder, { IMediaFolder } from './model/media-folder.model';
import Dashboard from '../dashboard/model/dashboard.model';

import * as path from 'path';
import * as fs from 'fs';

// Physical storage location for uploaded media images.
// Single spot to change if/when this needs to move (e.g. to be served
// as a static folder alongside the built frontend instead of via this API).
const MEDIA_STORAGE_PATH = path.join(process.cwd(), 'lib/module/media/images');

const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB
const VALID_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp'];

function ensureStorageDir() {
    if (!fs.existsSync(MEDIA_STORAGE_PATH)) {
        fs.mkdirSync(MEDIA_STORAGE_PATH, { recursive: true });
    }
}

function sanitizeBaseName(name: string): string {
    const withoutExt = name.replace(/\.[^/.]+$/, '');
    return withoutExt
        .normalize('NFD').replace(/[̀-ͯ]/g, '') // strip accents
        .replace(/[^a-zA-Z0-9-_]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 60) || 'imagen';
}

export class MediaController {

    static async list(req: Request, res: Response, next: NextFunction) {
        try {
            // folderId query param: omitted/empty = root, 'null' string also treated as root
            const folderId = req.qs.folderId && req.qs.folderId !== 'null' ? req.qs.folderId : null;
            const media = await Media.find({ folderId }).sort({ createdAt: -1 });
            const result = media.map((m: any) => ({
                _id: m._id,
                filename: m.filename,
                originalName: m.originalName,
                mimeType: m.mimeType,
                size: m.size,
                folderId: m.folderId,
                createdAt: m.createdAt,
                url: `/media/img/${m.filename}`
            }));
            return res.status(200).json({ ok: true, media: result });
        } catch (err) {
            return next(new HttpException(500, 'Error loading media library'));
        }
    }

    static async listFolders(req: Request, res: Response, next: NextFunction) {
        try {
            const [folders, counts] = await Promise.all([
                MediaFolder.find({}).sort({ name: 1 }),
                Media.aggregate([{ $group: { _id: '$folderId', count: { $sum: 1 } } }])
            ]);
            const countMap = new Map(counts.map((c: any) => [c._id, c.count]));
            const result = folders.map((f: any) => ({
                _id: f._id,
                name: f.name,
                parentId: f.parentId,
                createdAt: f.createdAt,
                fileCount: countMap.get(String(f._id)) || 0
            }));
            return res.status(200).json({ ok: true, folders: result });
        } catch (err) {
            return next(new HttpException(500, 'Error loading folders'));
        }
    }

    static async createFolder(req: Request, res: Response, next: NextFunction) {
        try {
            const name = (req.body.name || '').trim();
            if (!name) {
                return next(new HttpException(400, 'The folder name is required'));
            }
            const parentId = req.body.parentId && req.body.parentId !== 'null' ? req.body.parentId : null;
            const folder: IMediaFolder = new MediaFolder({ name, parentId });
            const saved = await folder.save();
            return res.status(201).json({ ok: true, folder: saved });
        } catch (err) {
            return next(new HttpException(500, 'Error creating the folder'));
        }
    }

    // Also used to move a folder (change its parent): the frontend sends either `name`,
    // `parentId`, or both in the same PUT, so drag-and-drop-to-move reuses this route.
    static async renameFolder(req: Request, res: Response, next: NextFunction) {
        try {
            const update: any = {};

            if (req.body.name !== undefined) {
                const name = (req.body.name || '').trim();
                if (!name) {
                    return next(new HttpException(400, 'The folder name is required'));
                }
                update.name = name;
            }

            if (req.body.parentId !== undefined) {
                const parentId = req.body.parentId && req.body.parentId !== 'null' ? req.body.parentId : null;
                if (parentId === req.params.id) {
                    return next(new HttpException(400, 'A folder cannot be moved into itself'));
                }
                if (parentId) {
                    // walk the target's ancestor chain to reject moving a folder into its own subfolder
                    let current = await MediaFolder.findById(parentId);
                    while (current) {
                        if (String(current._id) === req.params.id) {
                            return next(new HttpException(400, 'Cannot move a folder into one of its own subfolders'));
                        }
                        current = current.parentId ? await MediaFolder.findById(current.parentId) : null;
                    }
                }
                update.parentId = parentId;
            }

            if (!Object.keys(update).length) {
                return next(new HttpException(400, 'Nothing to update'));
            }

            const folder = await MediaFolder.findByIdAndUpdate(req.params.id, update, { new: true });
            if (!folder) {
                return next(new HttpException(400, 'Folder not found'));
            }
            return res.status(200).json({ ok: true, folder });
        } catch (err) {
            return next(new HttpException(500, 'Error updating the folder'));
        }
    }

    static async deleteFolder(req: Request, res: Response, next: NextFunction) {
        try {
            const [fileCount, subfolderCount] = await Promise.all([
                Media.countDocuments({ folderId: req.params.id }),
                MediaFolder.countDocuments({ parentId: req.params.id })
            ]);
            if (fileCount > 0 || subfolderCount > 0) {
                return next(new HttpException(400, 'The folder is not empty. Move or delete its contents before deleting it'));
            }
            const deleted = await MediaFolder.findByIdAndDelete(req.params.id);
            if (!deleted) {
                return next(new HttpException(400, 'Folder not found'));
            }
            return res.status(200).json({ ok: true });
        } catch (err) {
            return next(new HttpException(500, 'Error deleting the folder'));
        }
    }

    static async rename(req: Request, res: Response, next: NextFunction) {
        try {
            const originalName = (req.body.originalName || '').trim();
            if (!originalName) {
                return next(new HttpException(400, 'The name is required'));
            }
            const media = await Media.findByIdAndUpdate(req.params.id, { originalName }, { new: true });
            if (!media) {
                return next(new HttpException(400, 'Media not found'));
            }
            return res.status(200).json({ ok: true, media });
        } catch (err) {
            return next(new HttpException(500, 'Error renaming the media'));
        }
    }

    static async move(req: Request, res: Response, next: NextFunction) {
        try {
            const ids: string[] = req.body.ids || [];
            const folderId = req.body.folderId ?? null;
            if (!ids.length) {
                return next(new HttpException(400, 'No images selected'));
            }
            await Media.updateMany({ _id: { $in: ids } }, { folderId });
            return res.status(200).json({ ok: true });
        } catch (err) {
            return next(new HttpException(500, 'Error moving the images'));
        }
    }

    static async usage(req: Request, res: Response, next: NextFunction) {
        try {
            const media = await Media.findById(req.params.id);
            if (!media) {
                return next(new HttpException(400, 'Media not found'));
            }
            const url = `/media/img/${media.filename}`;

            const dashboards = await Dashboard.find({}, 'config.title config.styles.backgroundImage config.panel');
            const usedIn = dashboards
                .filter((d: any) => {
                    const bg = d.config?.styles?.backgroundImage;
                    if (bg === url) return true;
                    return (d.config?.panel || []).some((panel: any) =>
                        panel?.content?.query?.output?.config?.prefixImage === url
                    );
                })
                .map((d: any) => ({ _id: d._id, title: d.config?.title }));

            return res.status(200).json({ ok: true, usedIn });
        } catch (err) {
            return next(new HttpException(500, 'Error checking where this image is used'));
        }
    }

    static async upload(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.files || !req.files.img) {
                return next(new HttpException(400, 'You must select an image'));
            }

            const file: any = req.files.img;
            const nameParts = file.name.split('.');
            const extension = nameParts[nameParts.length - 1].toLowerCase();

            if (VALID_EXTENSIONS.indexOf(extension) < 0) {
                return next(new HttpException(400, `Invalid image extension. Valid extensions are ${VALID_EXTENSIONS.join(', ')}`));
            }

            const size = file.size ?? file.data?.length ?? 0;
            if (size > MAX_FILE_SIZE) {
                return next(new HttpException(400, 'The image exceeds the maximum allowed size of 1MB'));
            }

            ensureStorageDir();

            const filename = `${Date.now()}-${sanitizeBaseName(file.name)}.${extension}`;
            const destPath = path.join(MEDIA_STORAGE_PATH, filename);

            file.mv(destPath, async (err: any) => {
                if (err) {
                    console.log(err);
                    return next(new HttpException(500, 'Error saving the image'));
                }

                try {
                    const folderId = req.body?.folderId && req.body.folderId !== 'null' ? req.body.folderId : null;
                    const media: IMedia = new Media({
                        filename,
                        originalName: file.name,
                        mimeType: file.mimetype,
                        size,
                        uploadedBy: req.user?._id,
                        folderId
                    });
                    const saved = await media.save();

                    return res.status(201).json({
                        ok: true,
                        media: {
                            _id: saved._id,
                            filename: saved.filename,
                            originalName: saved.originalName,
                            mimeType: saved.mimeType,
                            size: saved.size,
                            folderId: saved.folderId,
                            createdAt: saved.createdAt,
                            url: `/media/img/${saved.filename}`
                        }
                    });
                } catch (dbErr) {
                    return next(new HttpException(500, 'Error registering the uploaded image'));
                }
            });
        } catch (err) {
            next(err);
        }
    }

    static async remove(req: Request, res: Response, next: NextFunction) {
        try {
            const media = await Media.findById(req.params.id);

            if (!media) {
                return next(new HttpException(400, 'Media not found'));
            }

            const filePath = path.join(MEDIA_STORAGE_PATH, media.filename);
            try {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            } catch (fsErr) {
                console.warn('Error deleting media file from disk:', fsErr);
            }

            await Media.findByIdAndDelete(req.params.id);

            return res.status(200).json({ ok: true });
        } catch (err) {
            return next(new HttpException(500, 'Error removing media'));
        }
    }

    static async serveImage(req: Request, res: Response, next: NextFunction) {
        try {
            // path.basename strips any directory components (e.g. "../../etc/passwd"),
            // so this can only ever resolve to a file directly inside MEDIA_STORAGE_PATH.
            const filename = path.basename(req.params.filename);
            const imgPath = path.join(MEDIA_STORAGE_PATH, filename);

            if (fs.existsSync(imgPath)) {
                res.sendFile(imgPath);
            } else {
                const noImagePath = path.resolve(__dirname, '../../assets/no-img.jpg');
                res.sendFile(noImagePath);
            }
        } catch (err) {
            next(err);
        }
    }
}
