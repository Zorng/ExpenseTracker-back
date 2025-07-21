
import express from 'express';
import {
    register,
    login,
    signOut,
    updateEmail,
    updatePassword,
    deleteAccount,
} from '../controllers/User.controller.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * @openapi
 * /api/users/register:
 *   post:
 *     summary: Register a new user
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Invalid input
 *       409:
 *         description: Email already in use
 */
router.post('/register', register);

/**
 * @openapi
 * /api/users/login:
 *   post:
 *     summary: Login a user
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: User logged in successfully
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', login);

/**
 * @openapi
 * /api/users/signout:
 *   post:
 *     summary: Sign out a user
 *     tags: [User]
 *     responses:
 *       200:
 *         description: User signed out successfully
 */
router.post('/signout', signOut);

// Protected routes
/**
 * @openapi
 * /api/users/me/email:
 *   put:
 *     summary: Update a user's email
 *     tags: [User]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newEmail
 *               - password
 *             properties:
 *               newEmail:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Invalid password
 *       404:
 *         description: User not found
 *       409:
 *         description: Email already in use
 */
router.put('/me/email', authenticateToken, updateEmail);

/**
 * @openapi
 * /api/users/me/password:
 *   put:
 *     summary: Update a user's password
 *     tags: [User]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *               - confirmNewPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *               confirmNewPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Invalid current password
 *       404:
 *         description: User not found
 */
router.put('/me/password', authenticateToken, updatePassword);

/**
 * @openapi
 * /api/users/me:
 *   delete:
 *     summary: Delete a user account and all related data
 *     tags: [User]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Account and related data deleted successfully
 *       404:
 *         description: User not found
 *       500:
 *         description: Error deleting account
 */
router.delete('/me', authenticateToken, deleteAccount);

export default router; 