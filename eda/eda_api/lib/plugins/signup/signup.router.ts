import express from 'express';
import { SignupController } from './signup.controller';

const router = express.Router();

/**
 * @openapi
 * /signup/status:
 *   get:
 *     description: Tells whether self-service sign up is enabled (config/signup.config.js).
 *     responses:
 *       200:
 *         description: Sign up status returned.
 *     tags:
 *       - Sign up Routes
 */
router.get('/status', SignupController.status);

/**
 * @openapi
 * /signup:
 *   post:
 *     description: Creates a free account. A random password is emailed to the user. Public, rate limited per IP.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               acceptTerms:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Account created and credentials emailed.
 *       400:
 *         description: Invalid data or terms not accepted.
 *       403:
 *         description: Sign up disabled.
 *       409:
 *         description: A user with this email already exists.
 *       429:
 *         description: Too many attempts.
 *       503:
 *         description: Mail server unavailable.
 *     tags:
 *       - Sign up Routes
 */
router.post('/', SignupController.signup);

export default router;
