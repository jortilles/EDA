import * as express from 'express';
import { authGuard } from '../../guards/auth-guard';
import { roleGuard } from '../../guards/role-guard';
import { MediaController } from './media.controller';

const router = express.Router();

/**
 * @openapi
 * /media:
 *   get:
 *     description: Gets the list of every image stored in the media library.
 *     responses:
 *       200:
 *         description: Returns the list of media items.
 *       401:
 *         description: Unauthorized - authentication required.
 *       500:
 *         description: Server error loading the media library.
 *     tags:
 *       - Media Routes
 */
router.get('', authGuard, MediaController.list);

/**
 * @openapi
 * /media/upload:
 *   post:
 *     description: Uploads a new image (max 1MB) to the media library.
 *     parameters:
 *       - name: img
 *         in: formData
 *         required: true
 *         type: file
 *         description: Image file (png, jpg, jpeg, gif, webp)
 *     responses:
 *       201:
 *         description: Image uploaded successfully.
 *       400:
 *         description: Invalid extension or size exceeds the 1MB limit.
 *       401:
 *         description: Unauthorized - authentication required.
 *       500:
 *         description: Server error uploading the image.
 *     tags:
 *       - Media Routes
 */
router.post('/upload', authGuard, MediaController.upload);

/**
 * @openapi
 * /media/img/{filename}:
 *   get:
 *     description: Streams back a stored image by its filename.
 *     parameters:
 *       - name: filename
 *         in: path
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: Returns the image file.
 *       401:
 *         description: Unauthorized - authentication required.
 *     tags:
 *       - Media Routes
 */
router.get('/img/:filename', authGuard, MediaController.serveImage);

/**
 * @openapi
 * /media/folders:
 *   get:
 *     description: Gets the list of media folders.
 *     responses:
 *       200:
 *         description: Returns the list of folders.
 *       401:
 *         description: Unauthorized - authentication required.
 *     tags:
 *       - Media Routes
 */
router.get('/folders', authGuard, MediaController.listFolders);

/**
 * @openapi
 * /media/folders:
 *   post:
 *     description: Creates a new media folder. Requires admin role.
 *     responses:
 *       201:
 *         description: Folder created successfully.
 *       400:
 *         description: The folder name is required.
 *       403:
 *         description: Forbidden - admin role required.
 *     tags:
 *       - Media Routes
 */
router.post('/folders', authGuard, roleGuard, MediaController.createFolder);

/**
 * @openapi
 * /media/folders/{id}:
 *   put:
 *     description: Renames a media folder. Requires admin role.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: Folder renamed successfully.
 *       400:
 *         description: Folder not found, or the name is required.
 *       403:
 *         description: Forbidden - admin role required.
 *     tags:
 *       - Media Routes
 */
router.put('/folders/:id', authGuard, roleGuard, MediaController.renameFolder);

/**
 * @openapi
 * /media/folders/{id}:
 *   delete:
 *     description: Deletes an empty media folder. Requires admin role.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: Folder deleted successfully.
 *       400:
 *         description: Folder not found, or the folder is not empty.
 *       403:
 *         description: Forbidden - admin role required.
 *     tags:
 *       - Media Routes
 */
router.delete('/folders/:id', authGuard, roleGuard, MediaController.deleteFolder);

/**
 * @openapi
 * /media/move:
 *   put:
 *     description: Moves one or more images into a folder (or back to the root). Requires admin role.
 *     responses:
 *       200:
 *         description: Images moved successfully.
 *       400:
 *         description: No images selected.
 *       403:
 *         description: Forbidden - admin role required.
 *     tags:
 *       - Media Routes
 */
router.put('/move', authGuard, roleGuard, MediaController.move);

/**
 * @openapi
 * /media/{id}:
 *   delete:
 *     description: Deletes an image from the media library. Requires admin role.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: Media deleted successfully.
 *       400:
 *         description: Media not found.
 *       401:
 *         description: Unauthorized - authentication required.
 *       403:
 *         description: Forbidden - admin role required.
 *       500:
 *         description: Server error removing the media.
 *     tags:
 *       - Media Routes
 */
router.delete('/:id', authGuard, roleGuard, MediaController.remove);

/**
 * @openapi
 * /media/{id}:
 *   put:
 *     description: Renames an image (display name only). Requires admin role.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: Media renamed successfully.
 *       400:
 *         description: Media not found, or the name is required.
 *       403:
 *         description: Forbidden - admin role required.
 *     tags:
 *       - Media Routes
 */
router.put('/:id', authGuard, roleGuard, MediaController.rename);

/**
 * @openapi
 * /media/{id}/usage:
 *   get:
 *     description: Lists the dashboards that use this image as background or KPI prefix. Requires admin role.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: Returns the list of dashboards using this image.
 *       400:
 *         description: Media not found.
 *       403:
 *         description: Forbidden - admin role required.
 *     tags:
 *       - Media Routes
 */
router.get('/:id/usage', authGuard, roleGuard, MediaController.usage);

export default router;
