import db from '../models/index.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { Op } from 'sequelize';

const User = db.User;

export const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email, and password are required' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(409).json({ error: 'Email already in use' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ username, email, password: hashedPassword });
        // Optionally, auto-login after registration:
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.status(201).json({ message: 'User registered successfully', token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error registering user' });
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ message: 'Login successful', token });
    } catch (error) {
        res.status(500).json({ error: 'Error logging in' });
    }
};

export const updateEmail = async (req, res) => {
    try {
        const { newEmail, password } = req.body;
        const { id } = req.user; // from JWT middleware

        if (!newEmail || !password) {
            return res.status(400).json({ error: 'New email and password are required' });
        }

        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        const existingUser = await User.findOne({ where: { email: newEmail } });
        if (existingUser && existingUser.id !== id) {
            return res.status(409).json({ error: 'Email already in use' });
        }

        user.email = newEmail;
        await user.save();

        res.json({ message: 'Email updated successfully' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error updating email' });
    }
};

export const updatePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmNewPassword } = req.body;
        const { id } = req.user; // from JWT middleware

        if (!currentPassword || !newPassword || !confirmNewPassword) {
            return res.status(400).json({ error: 'All password fields are required' });
        }
        if (newPassword !== confirmNewPassword) {
            return res.status(400).json({ error: 'New passwords do not match' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }

        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid current password' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        res.json({ message: 'Password updated successfully' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error updating password' });
    }
};

export const signOut = (req, res) => {
    res.json({ message: 'Sign out successful' });
};

export const deleteAccount = async (req, res) => {
    try {
        const { id } = req.user; // from JWT middleware
        
        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        await db.Record.destroy({ where: { userId: id } });
        
        if (db.Category.rawAttributes.userId) {
            await db.Category.destroy({ where: { userId: id } });
        }
        
        await user.destroy();
        res.json({ message: 'Account and related data deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error deleting account' });
    }
};

export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ where: { email } });

        // Generate token even if user not found (security)
        const resetToken = crypto.randomBytes(32).toString('hex');
        
        if (user) {
            user.resetPasswordToken = resetToken;
            user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
            await user.save();

            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USERNAME,
                    pass: process.env.EMAIL_PASSWORD
                }
            });

            // For frontend URL, ensure you have set it in your .env file

            const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
            
            await transporter.sendMail({
                from: process.env.EMAIL_USERNAME,
                to: user.email,
                subject: 'Password Reset Request',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #2563eb;">Password Reset Request</h2>
                        <p>Hello,</p>
                        <p>We received a request to reset your password. Click the button below to create a new password:</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${resetUrl}" 
                               style="background-color: #2563eb; color: white; padding: 12px 24px; 
                                      text-decoration: none; border-radius: 5px; display: inline-block;">
                                Reset Password
                            </a>
                        </div>
                        <p>This link will expire in 1 hour for security reasons.</p>
                        <p>If you didn't request this password reset, you can safely ignore this email.</p>
                        <hr style="border: 1px solid #eee; margin: 20px 0;">
                        <p style="color: #666; font-size: 12px;">
                            This is an automated email, please do not reply.
                        </p>
                    </div>
                `
            });

            // For Swagger testing

            // const resetUrl = `http://localhost:5000/api/users/reset-password`;
            
            // await transporter.sendMail({
            //     from: process.env.EMAIL_USERNAME,
            //     to: user.email,
            //     subject: 'Password Reset Request',
            //     html: `
            //         <h2>Password Reset Request</h2>
            //         <p>Your reset token is: <strong>${resetToken}</strong></p>
            //         <p>To reset your password:</p>
            //         <ol>
            //             <li>Go to: ${resetUrl}</li>
            //             <li>Click "Try it out"</li>
            //             <li>Enter your token and new password in the request body:</li>
            //             <pre>
            //             {
            //                 "token": "${resetToken}",
            //                 "newPassword": "your-new-password"
            //             }
            //             </pre>
            //             <li>Click "Execute"</li>
            //         </ol>
            //         <p>This token will expire in 1 hour.</p>
            //         <p>If you did not request this, please ignore this email.</p>
            //     `
            // });
        }

        // Always return same message for security
        return res.status(200).json({
            message: "If an account exists with this email, you will receive password reset instructions."
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Error processing password reset request" });
    }
};

export const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        const user = await User.findOne({
            where: {
                resetPasswordToken: token,
                resetPasswordExpires: { [Op.gt]: Date.now() }
            }
        });

        if (!user) {
            return res.status(400).json({ 
                message: "Reset failed. The link may be invalid or expired."
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: "Password must be at least 6 characters long" });
        }

        // Hash new password and update user
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        await user.save();

        return res.status(200).json({ message: "Password reset successful" });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Error resetting password" });
    }
};

export const getUser = async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    //console.log(token);
    if (!token) {
        return res.status(401).json({error: 'Token not found'});
    } else {
        try {
            const payload = jwt.verify(token, process.env.JWT_SECRET);
            // Optionally fetch user from DB using payload.id
            const userResult = await User.findByPk(payload.id, {attributes: {exclude: ['password', 'resetPasswordToken', 'resetPasswordExpires']}});
            res.json({user: userResult}); // Or { user: dbUser }
        } catch (err) {
            res.status(401).json({message: 'Invalid or expired token'});
        }
    }
};