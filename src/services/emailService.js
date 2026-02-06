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
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link href="https://fonts.googleapis.com/css2?family=Zen+Dots&family=Jura:wght@300;400;500;600;700&display=swap" rel="stylesheet">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Zen+Dots&family=Jura:wght@300;400;500;600;700&display=swap');
            body {
              margin: 0;
              padding: 0;
              background-color: #0a0a0a;
              font-family: 'Jura', 'Segoe UI', Tahoma, sans-serif;
              color: #e0e0e0;
            }
            .wrapper {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #0a0a0a;
            }
            .top-bar {
              height: 3px;
              background: linear-gradient(90deg, transparent, #ffffff, transparent);
              margin-bottom: 0;
            }
            .header {
              background-color: #111111;
              border: 1px solid #2a2a2a;
              border-top: none;
              padding: 30px 40px;
              text-align: center;
              position: relative;
            }
            .header::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              height: 1px;
              background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
            }
            .logo-text {
              font-family: 'Zen Dots', cursive;
              font-size: 28px;
              color: #ffffff;
              letter-spacing: 6px;
              text-transform: uppercase;
              margin: 0;
              text-shadow: 0 0 20px rgba(255,255,255,0.15);
            }
            .logo-tagline {
              font-family: 'Jura', sans-serif;
              font-size: 10px;
              color: #555555;
              letter-spacing: 8px;
              text-transform: uppercase;
              margin-top: 8px;
            }
            .divider {
              height: 1px;
              background: linear-gradient(90deg, transparent, #333333, transparent);
              margin: 0;
            }
            .title-section {
              background-color: #0d0d0d;
              border-left: 1px solid #2a2a2a;
              border-right: 1px solid #2a2a2a;
              padding: 30px 40px 10px;
              text-align: center;
            }
            .title-icon {
              font-size: 20px;
              margin-bottom: 10px;
              display: block;
            }
            .title {
              font-family: 'Zen Dots', cursive;
              font-size: 18px;
              color: #ffffff;
              letter-spacing: 4px;
              text-transform: uppercase;
              margin: 0;
            }
            .content {
              background-color: #0d0d0d;
              border-left: 1px solid #2a2a2a;
              border-right: 1px solid #2a2a2a;
              padding: 20px 40px 30px;
            }
            .content p {
              font-family: 'Jura', sans-serif;
              font-size: 14px;
              color: #999999;
              line-height: 1.8;
              margin: 10px 0;
            }
            .otp-container {
              margin: 30px 0;
              text-align: center;
            }
            .otp-label {
              font-family: 'Jura', sans-serif;
              font-size: 11px;
              color: #555555;
              letter-spacing: 4px;
              text-transform: uppercase;
              margin-bottom: 12px;
            }
            .otp-box {
              background-color: #000000;
              border: 1px solid #333333;
              padding: 20px 30px;
              display: inline-block;
              position: relative;
            }
            .otp-box::before {
              content: '';
              position: absolute;
              top: -1px;
              left: 20%;
              right: 20%;
              height: 1px;
              background: #ffffff;
            }
            .otp-box::after {
              content: '';
              position: absolute;
              bottom: -1px;
              left: 20%;
              right: 20%;
              height: 1px;
              background: #ffffff;
            }
            .otp-code {
              font-family: 'Zen Dots', monospace;
              font-size: 36px;
              font-weight: bold;
              letter-spacing: 12px;
              color: #ffffff;
              text-shadow: 0 0 30px rgba(255,255,255,0.2);
            }
            .warning-box {
              background-color: #0a0a0a;
              border: 1px solid #2a2a2a;
              border-left: 3px solid #ffffff;
              padding: 15px 20px;
              margin: 25px 0;
            }
            .warning-box p {
              font-family: 'Jura', sans-serif;
              font-size: 12px;
              color: #888888;
              margin: 0;
              line-height: 1.6;
            }
            .warning-box strong {
              color: #cccccc;
            }
            .corner-tl, .corner-tr, .corner-bl, .corner-br {
              position: absolute;
              width: 8px;
              height: 8px;
              border-color: #444444;
              border-style: solid;
            }
            .bottom-bar {
              height: 1px;
              background: linear-gradient(90deg, transparent, #333333, transparent);
            }
            .footer {
              background-color: #080808;
              border: 1px solid #1a1a1a;
              border-top: none;
              padding: 25px 40px;
              text-align: center;
            }
            .footer p {
              font-family: 'Jura', sans-serif;
              font-size: 11px;
              color: #444444;
              margin: 4px 0;
              letter-spacing: 1px;
            }
            .footer-line {
              width: 40px;
              height: 1px;
              background: #2a2a2a;
              margin: 12px auto;
            }
            .bottom-glow {
              height: 2px;
              background: linear-gradient(90deg, transparent, #ffffff, transparent);
              opacity: 0.3;
              margin-top: 0;
            }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="top-bar"></div>
            
            <div class="header">
              <div class="logo-text">CodeDript</div>
              <div class="logo-tagline">Decentralized • Secure • Transparent</div>
            </div>
            
            <div class="divider"></div>
            
            <div class="title-section">
              <span class="title-icon">&#x1F512;</span>
              <h1 class="title">Access Code</h1>
            </div>
            
            <div class="content">
              <p>Hello,</p>
              <p>A login attempt was detected on your CodeDript account. Enter the following code to verify your identity:</p>
              
              <div class="otp-container">
                <div class="otp-label">One-Time Password</div>
                <div class="otp-box">
                  <span class="otp-code">${otp}</span>
                </div>
              </div>
              
              <div class="warning-box">
                <p><strong>&#9888; EXPIRES IN 5 MINUTES</strong></p>
                <p>Do not share this code. CodeDript will never ask for your OTP.</p>
              </div>
              
              <p>If you did not initiate this request, you can safely disregard this message.</p>
              <p style="margin-top: 25px; color: #666666;">— The CodeDript Team</p>
            </div>
            
            <div class="bottom-bar"></div>
            
            <div class="footer">
              <p>AUTOMATED TRANSMISSION — DO NOT REPLY</p>
              <div class="footer-line"></div>
              <p>&copy; ${new Date().getFullYear()} CodeDript. All rights reserved.</p>
            </div>
            
            <div class="bottom-glow"></div>
          </div>
        </body>
        </html>
      `,
      text: `
CODEDRIPT — ACCESS CODE
========================

Hello,

A login attempt was detected on your CodeDript account.
Enter the following code to verify your identity:

OTP: ${otp}

⚠ EXPIRES IN 5 MINUTES
Do not share this code. CodeDript will never ask for your OTP.

If you did not initiate this request, you can safely disregard this message.

— The CodeDript Team

© ${new Date().getFullYear()} CodeDript. All rights reserved.
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
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link href="https://fonts.googleapis.com/css2?family=Zen+Dots&family=Jura:wght@300;400;500;600;700&display=swap" rel="stylesheet">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Zen+Dots&family=Jura:wght@300;400;500;600;700&display=swap');
            body {
              margin: 0;
              padding: 0;
              background-color: #0a0a0a;
              font-family: 'Jura', 'Segoe UI', Tahoma, sans-serif;
              color: #e0e0e0;
            }
            .wrapper {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #0a0a0a;
            }
            .top-bar {
              height: 3px;
              background: linear-gradient(90deg, transparent, #ffffff, transparent);
              margin-bottom: 0;
            }
            .header {
              background-color: #111111;
              border: 1px solid #2a2a2a;
              border-top: none;
              padding: 40px;
              text-align: center;
              position: relative;
            }
            .header::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              height: 1px;
              background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
            }
            .logo-text {
              font-family: 'Zen Dots', cursive;
              font-size: 28px;
              color: #ffffff;
              letter-spacing: 6px;
              text-transform: uppercase;
              margin: 0;
              text-shadow: 0 0 20px rgba(255,255,255,0.15);
            }
            .logo-tagline {
              font-family: 'Jura', sans-serif;
              font-size: 10px;
              color: #555555;
              letter-spacing: 8px;
              text-transform: uppercase;
              margin-top: 8px;
            }
            .divider {
              height: 1px;
              background: linear-gradient(90deg, transparent, #333333, transparent);
              margin: 0;
            }
            .welcome-banner {
              background-color: #0d0d0d;
              border-left: 1px solid #2a2a2a;
              border-right: 1px solid #2a2a2a;
              padding: 40px;
              text-align: center;
            }
            .welcome-icon {
              font-size: 40px;
              margin-bottom: 15px;
              display: block;
            }
            .welcome-title {
              font-family: 'Zen Dots', cursive;
              font-size: 22px;
              color: #ffffff;
              letter-spacing: 5px;
              text-transform: uppercase;
              margin: 0 0 8px 0;
              text-shadow: 0 0 25px rgba(255,255,255,0.1);
            }
            .welcome-subtitle {
              font-family: 'Jura', sans-serif;
              font-size: 12px;
              color: #555;
              letter-spacing: 3px;
              text-transform: uppercase;
            }
            .content {
              background-color: #0d0d0d;
              border-left: 1px solid #2a2a2a;
              border-right: 1px solid #2a2a2a;
              padding: 10px 40px 30px;
            }
            .content p {
              font-family: 'Jura', sans-serif;
              font-size: 14px;
              color: #999999;
              line-height: 1.8;
              margin: 12px 0;
            }
            .content p strong {
              color: #ffffff;
            }
            .feature-grid {
              margin: 25px 0;
            }
            .feature-item {
              background-color: #0a0a0a;
              border: 1px solid #1e1e1e;
              padding: 18px 20px;
              margin-bottom: 8px;
              position: relative;
            }
            .feature-item::before {
              content: '';
              position: absolute;
              left: 0;
              top: 25%;
              bottom: 25%;
              width: 2px;
              background: #ffffff;
            }
            .feature-title {
              font-family: 'Zen Dots', cursive;
              font-size: 12px;
              color: #cccccc;
              letter-spacing: 2px;
              text-transform: uppercase;
              margin: 0 0 5px 0;
            }
            .feature-desc {
              font-family: 'Jura', sans-serif;
              font-size: 12px;
              color: #666666;
              margin: 0;
              line-height: 1.5;
            }
            .cta-section {
              text-align: center;
              margin: 30px 0 10px;
            }
            .cta-button {
              display: inline-block;
              font-family: 'Zen Dots', cursive;
              font-size: 12px;
              color: #000000;
              background-color: #ffffff;
              text-decoration: none;
              padding: 14px 40px;
              letter-spacing: 3px;
              text-transform: uppercase;
              border: none;
            }
            .cta-hint {
              font-family: 'Jura', sans-serif;
              font-size: 10px;
              color: #444444;
              margin-top: 12px;
              letter-spacing: 2px;
            }
            .bottom-bar {
              height: 1px;
              background: linear-gradient(90deg, transparent, #333333, transparent);
            }
            .footer {
              background-color: #080808;
              border: 1px solid #1a1a1a;
              border-top: none;
              padding: 25px 40px;
              text-align: center;
            }
            .footer p {
              font-family: 'Jura', sans-serif;
              font-size: 11px;
              color: #444444;
              margin: 4px 0;
              letter-spacing: 1px;
            }
            .footer-line {
              width: 40px;
              height: 1px;
              background: #2a2a2a;
              margin: 12px auto;
            }
            .bottom-glow {
              height: 2px;
              background: linear-gradient(90deg, transparent, #ffffff, transparent);
              opacity: 0.3;
              margin-top: 0;
            }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="top-bar"></div>
            
            <div class="header">
              <div class="logo-text">CodeDript</div>
              <div class="logo-tagline">Decentralized • Secure • Transparent</div>
            </div>
            
            <div class="divider"></div>
            
            <div class="welcome-banner">
              <span class="welcome-icon">&#x1F3AE;</span>
              <h1 class="welcome-title">Welcome Aboard</h1>
              <div class="welcome-subtitle">You're in the game now</div>
            </div>
            
            <div class="content">
              <p>Hello <strong>${fullname || "there"}</strong>,</p>
              <p>Your account has been successfully created. You're now part of the CodeDript ecosystem — a decentralized platform where developers and clients collaborate on blockchain-powered agreements.</p>
              
              <div class="feature-grid">
                <div class="feature-item">
                  <div class="feature-title">&#x26A1; Smart Contracts</div>
                  <div class="feature-desc">Blockchain-backed agreements that ensure transparency and trust.</div>
                </div>
                <div class="feature-item">
                  <div class="feature-title">&#x1F6E1; Secure Payments</div>
                  <div class="feature-desc">Escrow-based transactions that protect both parties.</div>
                </div>
                <div class="feature-item">
                  <div class="feature-title">&#x1F680; Find Opportunities</div>
                  <div class="feature-desc">Browse gigs, build your portfolio, and grow your reputation.</div>
                </div>
              </div>
              
              <div class="cta-section">
                <div class="cta-hint">YOUR NEXT MOVE</div>
                <p style="font-size: 13px; color: #777;">Complete your profile and start exploring available opportunities on the platform.</p>
              </div>
              
              <p style="margin-top: 25px; color: #666666;">— The CodeDript Team</p>
            </div>
            
            <div class="bottom-bar"></div>
            
            <div class="footer">
              <p>AUTOMATED TRANSMISSION — DO NOT REPLY</p>
              <div class="footer-line"></div>
              <p>&copy; ${new Date().getFullYear()} CodeDript. All rights reserved.</p>
            </div>
            
            <div class="bottom-glow"></div>
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


// const nodemailer = require("nodemailer");
// const logger = require("../utils/logger");

// /**
//  * Get email configuration from environment
//  */
// const getEmailConfig = () => {
//   return {
//     service: process.env.EMAIL_SERVICE || "gmail",
//     user: process.env.EMAIL_USER,
//     password: process.env.EMAIL_PASSWORD,
//   };
// };

// /**
//  * Create email transporter
//  */
// const createTransporter = () => {
//   const config = getEmailConfig();

//   if (!config.user || !config.password) {
//     logger.warn(
//       "Email credentials not configured. Set EMAIL_USER and EMAIL_PASSWORD in environment variables."
//     );
//     return null;
//   }

//   try {
//     const transporter = nodemailer.createTransport({
//       service: config.service,
//       auth: {
//         user: config.user,
//         pass: config.password,
//       },
//     });

//     return transporter;
//   } catch (error) {
//     logger.error("Error creating email transporter:", error);
//     return null;
//   }
// };

// /**
//  * Send OTP email
//  * @param {String} email - Recipient email address
//  * @param {String} otp - OTP code to send
//  * @returns {Promise<Boolean>} True if email sent successfully
//  */
// const sendOTP = async (email, otp) => {
//   const transporter = createTransporter();

//   if (!transporter) {
//     logger.error("Email transporter not configured");
//     throw new Error(
//       "Email service not configured. Please contact administrator."
//     );
//   }

//   try {
//     const mailOptions = {
//       from: `"CodeDript" <${process.env.EMAIL_USER}>`,
//       to: email,
//       subject: "Your CodeDript Login OTP",
//       html: `
//         <!DOCTYPE html>
//         <html>
//         <head>
//           <style>
//             body {
//               font-family: Arial, sans-serif;
//               line-height: 1.6;
//               color: #333;
//             }
//             .container {
//               max-width: 600px;
//               margin: 0 auto;
//               padding: 20px;
//               background-color: #f9f9f9;
//             }
//             .header {
//               background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
//               color: white;
//               padding: 30px;
//               text-align: center;
//               border-radius: 10px 10px 0 0;
//             }
//             .content {
//               background: white;
//               padding: 30px;
//               border-radius: 0 0 10px 10px;
//             }
//             .otp-box {
//               background: #f0f0f0;
//               border: 2px dashed #667eea;
//               padding: 20px;
//               text-align: center;
//               font-size: 32px;
//               font-weight: bold;
//               letter-spacing: 8px;
//               margin: 20px 0;
//               color: #667eea;
//               border-radius: 8px;
//             }
//             .footer {
//               text-align: center;
//               margin-top: 20px;
//               font-size: 12px;
//               color: #666;
//             }
//             .warning {
//               background: #fff3cd;
//               border-left: 4px solid #ffc107;
//               padding: 12px;
//               margin: 20px 0;
//             }
//           </style>
//         </head>
//         <body>
//           <div class="container">
//             <div class="header">
//               <h1>🔐 CodeDript Login</h1>
//             </div>
//             <div class="content">
//               <h2>Your One-Time Password</h2>
//               <p>Hello,</p>
//               <p>You requested to log in to your CodeDript account. Use the OTP below to complete your login:</p>
              
//               <div class="otp-box">
//                 ${otp}
//               </div>
              
//               <div class="warning">
//                 <strong>⚠️ Important:</strong> This OTP will expire in <strong>5 minutes</strong>. 
//                 Do not share this code with anyone.
//               </div>
              
//               <p>If you didn't request this OTP, please ignore this email or contact support if you have concerns.</p>
              
//               <p>Best regards,<br>The CodeDript Team</p>
//             </div>
//             <div class="footer">
//               <p>This is an automated message, please do not reply to this email.</p>
//               <p>&copy; ${new Date().getFullYear()} CodeDript. All rights reserved.</p>
//             </div>
//           </div>
//         </body>
//         </html>
//       `,
//       text: `
// Your CodeDript Login OTP

// Hello,

// You requested to log in to your CodeDript account. Use the OTP below to complete your login:

// OTP: ${otp}

// This OTP will expire in 5 minutes. Do not share this code with anyone.

// If you didn't request this OTP, please ignore this email.

// Best regards,
// The CodeDript Team
//       `,
//     };

//     const info = await transporter.sendMail(mailOptions);
//     logger.info(`OTP email sent to ${email}: ${info.messageId}`);
//     return true;
//   } catch (error) {
//     logger.error(`Error sending OTP email to ${email}:`, error);
//     throw new Error("Failed to send OTP email. Please try again later.");
//   }
// };

// /**
//  * Send welcome email
//  * @param {String} email - Recipient email address
//  * @param {String} fullname - User's full name
//  * @returns {Promise<Boolean>} True if email sent successfully
//  */
// const sendWelcomeEmail = async (email, fullname) => {
//   const transporter = createTransporter();

//   if (!transporter) {
//     logger.warn("Email transporter not configured, skipping welcome email");
//     return false;
//   }

//   try {
//     const mailOptions = {
//       from: `"CodeDript" <${process.env.EMAIL_USER}>`,
//       to: email,
//       subject: "Welcome to CodeDript!",
//       html: `
//         <!DOCTYPE html>
//         <html>
//         <head>
//           <style>
//             body {
//               font-family: Arial, sans-serif;
//               line-height: 1.6;
//               color: #333;
//             }
//             .container {
//               max-width: 600px;
//               margin: 0 auto;
//               padding: 20px;
//             }
//             .header {
//               background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
//               color: white;
//               padding: 40px;
//               text-align: center;
//               border-radius: 10px 10px 0 0;
//             }
//             .content {
//               background: white;
//               padding: 30px;
//               border-radius: 0 0 10px 10px;
//               box-shadow: 0 2px 10px rgba(0,0,0,0.1);
//             }
//           </style>
//         </head>
//         <body>
//           <div class="container">
//             <div class="header">
//               <h1>🎉 Welcome to CodeDript!</h1>
//             </div>
//             <div class="content">
//               <h2>Hello ${fullname || "there"}!</h2>
//               <p>Thank you for joining CodeDript, the decentralized platform for developers and clients to collaborate on blockchain-powered agreements.</p>
//               <p>You're now part of a community that values transparency, security, and fair collaboration.</p>
//               <p>Get started by completing your profile and exploring available opportunities!</p>
//               <p>Best regards,<br>The CodeDript Team</p>
//             </div>
//           </div>
//         </body>
//         </html>
//       `,
//     };

//     await transporter.sendMail(mailOptions);
//     logger.info(`Welcome email sent to ${email}`);
//     return true;
//   } catch (error) {
//     logger.error(`Error sending welcome email to ${email}:`, error);
//     return false;
//   }
// };

// module.exports = {
//   sendOTP,
//   sendWelcomeEmail,
// };
