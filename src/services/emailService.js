const nodemailer = require("nodemailer");
const logger = require("../utils/logger");

/**
 * Get email configuration from environment
 */
const getEmailConfig = () => {
  return {
    service: process.env.EMAIL_SERVICE || "gmail",
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
  };
};

/**
 * Create email transporter
 */
const createTransporter = () => {
  const config = getEmailConfig();

  if (!config.user || !config.password) {
    logger.warn(
      "Email credentials not configured. Set EMAIL_USER and EMAIL_PASSWORD in environment variables."
    );
    return null;
  }

  try {
    const transporter = nodemailer.createTransport({
      service: config.service,
      auth: {
        user: config.user,
        pass: config.password,
      },
    });

    return transporter;
  } catch (error) {
    logger.error("Error creating email transporter:", error);
    return null;
  }
};

/**
 * Send OTP email
 * @param {String} email - Recipient email address
 * @param {String} otp - OTP code to send
 * @returns {Promise<Boolean>} True if email sent successfully
 */
const sendOTP = async (email, otp) => {
  const transporter = createTransporter();

  if (!transporter) {
    logger.error("Email transporter not configured");
    throw new Error(
      "Email service not configured. Please contact administrator."
    );
  }

  try {
    const mailOptions = {
      from: `"CodeDript" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your CodeDript Login OTP",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f9f9f9;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              text-align: center;
              border-radius: 10px 10px 0 0;
            }
            .content {
              background: white;
              padding: 30px;
              border-radius: 0 0 10px 10px;
            }
            .otp-box {
              background: #f0f0f0;
              border: 2px dashed #667eea;
              padding: 20px;
              text-align: center;
              font-size: 32px;
              font-weight: bold;
              letter-spacing: 8px;
              margin: 20px 0;
              color: #667eea;
              border-radius: 8px;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              font-size: 12px;
              color: #666;
            }
            .warning {
              background: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 12px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 CodeDript Login</h1>
            </div>
            <div class="content">
              <h2>Your One-Time Password</h2>
              <p>Hello,</p>
              <p>You requested to log in to your CodeDript account. Use the OTP below to complete your login:</p>
              
              <div class="otp-box">
                ${otp}
              </div>
              
              <div class="warning">
                <strong>⚠️ Important:</strong> This OTP will expire in <strong>5 minutes</strong>. 
                Do not share this code with anyone.
              </div>
              
              <p>If you didn't request this OTP, please ignore this email or contact support if you have concerns.</p>
              
              <p>Best regards,<br>The CodeDript Team</p>
            </div>
            <div class="footer">
              <p>This is an automated message, please do not reply to this email.</p>
              <p>&copy; ${new Date().getFullYear()} CodeDript. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Your CodeDript Login OTP

Hello,

You requested to log in to your CodeDript account. Use the OTP below to complete your login:

OTP: ${otp}

This OTP will expire in 5 minutes. Do not share this code with anyone.

If you didn't request this OTP, please ignore this email.

Best regards,
The CodeDript Team
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`OTP email sent to ${email}: ${info.messageId}`);
    return true;
  } catch (error) {
    logger.error(`Error sending OTP email to ${email}:`, error);
    throw new Error("Failed to send OTP email. Please try again later.");
  }
};

/**
 * Send welcome email
 * @param {String} email - Recipient email address
 * @param {String} fullname - User's full name
 * @returns {Promise<Boolean>} True if email sent successfully
 */
const sendWelcomeEmail = async (email, fullname) => {
  const transporter = createTransporter();

  if (!transporter) {
    logger.warn("Email transporter not configured, skipping welcome email");
    return false;
  }

  try {
    const mailOptions = {
      from: `"CodeDript" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Welcome to CodeDript!",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 40px;
              text-align: center;
              border-radius: 10px 10px 0 0;
            }
            .content {
              background: white;
              padding: 30px;
              border-radius: 0 0 10px 10px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Welcome to CodeDript!</h1>
            </div>
            <div class="content">
              <h2>Hello ${fullname || "there"}!</h2>
              <p>Thank you for joining CodeDript, the decentralized platform for developers and clients to collaborate on blockchain-powered agreements.</p>
              <p>You're now part of a community that values transparency, security, and fair collaboration.</p>
              <p>Get started by completing your profile and exploring available opportunities!</p>
              <p>Best regards,<br>The CodeDript Team</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
    logger.info(`Welcome email sent to ${email}`);
    return true;
  } catch (error) {
    logger.error(`Error sending welcome email to ${email}:`, error);
    return false;
  }
};

module.exports = {
  sendOTP,
  sendWelcomeEmail,
};
