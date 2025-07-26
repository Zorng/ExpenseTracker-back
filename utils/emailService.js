import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
    }
});

// Verify email configuration on startup
transporter.verify(function(error, success) {
    if (error) {
        console.log('Email configuration error:', error);
    } else {
        console.log('Email server is ready to send messages');
    }
});

export const sendVerificationEmail = async (email, token) => {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Verify Your Email Address',
        html: `
            <h1>Email Verification</h1>
            <p>Please click the link below to verify your email address:</p>
            <a href="${verificationUrl}" style="padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">
                Verify Email
            </a>
            <p>This link will expire in 24 hours.</p>
            <p>If you did not create an account, please ignore this email.</p>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Verification email sent successfully to:', email);
    } catch (error) {
        console.error('Error sending email:', error);
        if (error.code === 'EAUTH') {
            throw new Error('Email authentication failed. Please check your email credentials.');
        }
        throw new Error('Failed to send verification email');
    }
};