const nodemailer = require('nodemailer');

// Create a transporter
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Function to send employee credentials
const sendEmployeeCredentials = async (email, username, password, companyName) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your Account Credentials',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #4361ee; text-align: center;">Welcome to ${companyName}</h2>
          <p>Hello ${username},</p>
          <p>Your account has been created by your administrator. Below are your login credentials:</p>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Username:</strong> ${username}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Temporary Password:</strong> ${password}</p>
          </div>
          <p>Please login using these credentials and change your password immediately for security reasons.</p>
          <p>If you have any questions, please contact your administrator.</p>
          <p style="margin-top: 30px; font-size: 12px; color: #6c757d; text-align: center;">This is an automated email. Please do not reply.</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: ' + info.response);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

// Send notification when feedback is submitted
exports.sendFeedbackNotification = async (receiverEmail, subject, companyName, senderName) => {
  try {
    // Your email sending logic here
    console.log(`Sending feedback notification to ${receiverEmail} from ${senderName} at ${companyName}`);
    
    // Return true if email sent successfully
    return true;
  } catch (error) {
    console.error('Error sending feedback notification:', error);
    return false;
  }
};

// Send response to feedback
exports.sendFeedbackResponse = async (senderEmail, originalSubject, response, adminName) => {
  try {
    // Your email sending logic here
    console.log(`Sending feedback response to ${senderEmail} from ${adminName}`);
    console.log(`Subject: ${originalSubject}`);
    console.log(`Response: ${response.substring(0, 100)}...`);
    
    // For now, just log the email details
    // In a production environment, you would send an actual email
    
    // Return true if email sent successfully
    return true;
  } catch (error) {
    console.error('Error sending feedback response:', error);
    // Don't throw the error, just return false
    return false;
  }
};

module.exports = {
  sendEmployeeCredentials
};

