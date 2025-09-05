import nodemailer from 'nodemailer';
import { config } from '../config/index.js';

export class EmailService {
  private transporter;

  constructor() {
    // Use app password for Gmail authentication
    console.log('Using Gmail app password authentication');
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: config.EMAIL_USER,
        pass: config.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    // Verify connection configuration
    this.transporter.verify((error, success) => {
      if (error) {
        console.error('Email transporter verification failed:', error);
        console.error('Please ensure:');
        console.error('1. 2FA is enabled on Gmail account');
        console.error('2. App password is generated correctly (16 chars, no spaces)');
        console.error('3. Or use OAuth2 by setting GOOGLE_REFRESH_TOKEN in .env');
      } else {
        console.log('Email server is ready to take our messages');
      }
    });
  }

  async sendLeaveRequestNotification(data: {
    to: string;
    employeeName: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    reason?: string;
  }) {
    const mailOptions = {
      from: config.EMAIL_USER,
      to: data.to,
      subject: `New Leave Request - ${data.employeeName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">New Leave Request</h2>
          <p>A new leave request has been submitted and requires your approval.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Request Details</h3>
            <p><strong>Employee:</strong> ${data.employeeName}</p>
            <p><strong>Leave Type:</strong> ${data.leaveType}</p>
            <p><strong>Start Date:</strong> ${new Date(data.startDate).toLocaleDateString()}</p>
            <p><strong>End Date:</strong> ${new Date(data.endDate).toLocaleDateString()}</p>
            ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ''}
          </div>
          
          <p>Please log in to the Leave Management System to review and approve this request.</p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log('Leave request notification sent successfully');
    } catch (error) {
      console.error('Error sending leave request notification:', error);
      throw error;
    }
  }

  async sendLeaveApprovalNotification(data: {
    to: string;
    employeeName: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    status: 'approved' | 'rejected';
    approverName: string;
    rejectionReason?: string;
  }) {
    const subject = data.status === 'approved' 
      ? `Leave Request Approved - ${data.leaveType}`
      : `Leave Request Rejected - ${data.leaveType}`;

    const statusColor = data.status === 'approved' ? '#28a745' : '#dc3545';
    const statusText = data.status === 'approved' ? 'APPROVED' : 'REJECTED';

    const mailOptions = {
      from: config.EMAIL_USER,
      to: data.to,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; padding: 20px; background-color: ${statusColor}; color: white; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0;">Leave Request ${statusText}</h2>
          </div>
          
          <div style="padding: 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 8px 8px;">
            <p>Your leave request has been ${data.status}.</p>
            
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Request Details</h3>
              <p><strong>Leave Type:</strong> ${data.leaveType}</p>
              <p><strong>Start Date:</strong> ${new Date(data.startDate).toLocaleDateString()}</p>
              <p><strong>End Date:</strong> ${new Date(data.endDate).toLocaleDateString()}</p>
              <p><strong>${data.status === 'approved' ? 'Approved' : 'Rejected'} by:</strong> ${data.approverName}</p>
              ${data.rejectionReason ? `<p><strong>Reason for Rejection:</strong> ${data.rejectionReason}</p>` : ''}
            </div>
            
            ${data.status === 'approved' 
              ? '<p>Your leave has been added to the calendar. Enjoy your time off!</p>'
              : '<p>If you have any questions about this decision, please contact your manager.</p>'
            }
          </div>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log('Leave approval notification sent successfully');
    } catch (error) {
      console.error('Error sending leave approval notification:', error);
      throw error;
    }
  }

  async sendLeaveCancellationNotification(data: {
    to: string;
    employeeName: string;
    leaveType: string;
    startDate: string;
    endDate: string;
  }) {
    const mailOptions = {
      from: config.EMAIL_USER,
      to: data.to,
      subject: `Leave Request Cancelled - ${data.employeeName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; padding: 20px; background-color: #ffc107; color: white; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0;">Leave Request Cancelled</h2>
          </div>
          
          <div style="padding: 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 8px 8px;">
            <p><strong>${data.employeeName}</strong> has cancelled their leave request.</p>
            
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Cancelled Request Details</h3>
              <p><strong>Employee:</strong> ${data.employeeName}</p>
              <p><strong>Leave Type:</strong> ${data.leaveType}</p>
              <p><strong>Start Date:</strong> ${new Date(data.startDate).toLocaleDateString()}</p>
              <p><strong>End Date:</strong> ${new Date(data.endDate).toLocaleDateString()}</p>
            </div>
            
            <p>The calendar event has been removed if it was previously created.</p>
          </div>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log('Leave cancellation notification sent successfully');
    } catch (error) {
      console.error('Error sending leave cancellation notification:', error);
      throw error;
    }
  }

  async sendEmail(to: string, subject: string, htmlContent: string) {
    try {
      console.log('Attempting to send email:', { to, subject, from: config.EMAIL_USER });
      
      const info = await this.transporter.sendMail({
        from: config.EMAIL_USER,
        to,
        subject,
        html: htmlContent,
      });

      console.log('Email sent successfully:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Error sending email:', error);
      console.error('Email config debug:', {
        user: config.EMAIL_USER,
        hasPassword: !!config.EMAIL_PASS,
        passwordLength: config.EMAIL_PASS?.length || 0
      });
      throw error;
    }
  }

  async sendAdminRequestNotification(
    recipientEmail: string,
    requesterName: string,
    requesterEmail: string,
    organizationName: string,
    organizationDomain: string,
    approveLink: string,
    denyLink: string,
    isRequestToMaster: boolean = false
  ) {
    const subject = isRequestToMaster 
      ? `New Admin Request for ${organizationName}` 
      : `Admin Access Request from ${requesterName}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #3B82F6; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; padding: 12px 24px; margin: 10px 10px 10px 0; text-decoration: none; border-radius: 6px; font-weight: bold; }
          .approve { background-color: #10B981; color: white; }
          .deny { background-color: #EF4444; color: white; }
          .info-section { background-color: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏖️ Leave Management System</h1>
            <h2>${subject}</h2>
          </div>
          
          <div class="content">
            <div class="info-section">
              <h3>Request Details</h3>
              <p><strong>Requester:</strong> ${requesterName}</p>
              <p><strong>Email:</strong> ${requesterEmail}</p>
              <p><strong>Organization:</strong> ${organizationName}</p>
              <p><strong>Domain:</strong> ${organizationDomain}</p>
              <p><strong>Request Date:</strong> ${new Date().toLocaleString()}</p>
            </div>
            
            ${isRequestToMaster ? `
              <p>This user is requesting admin access for their organization. As the master administrator, 
              you have the authority to approve or deny this request.</p>
              <p>Approving this request will grant the user full administrative privileges for their organization.</p>
            ` : `
              <p>This user is requesting admin access to your organization. As an existing admin, 
              you can approve or deny this request.</p>
              <p>Approving this request will grant them the same administrative privileges as you.</p>
            `}
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${approveLink}" class="button approve">✓ Approve Request</a>
              <a href="${denyLink}" class="button deny">✗ Deny Request</a>
            </div>
            
            <div class="info-section">
              <p><strong>Note:</strong> This request will automatically expire in 24 hours.</p>
              <p>If you did not expect this request, please contact the requester directly.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(recipientEmail, subject, htmlContent);
  }

  async sendRequestStatusNotification(
    requesterEmail: string,
    requesterName: string,
    organizationName: string,
    status: 'approved' | 'denied',
    reason?: string
  ) {
    const subject = `Admin Request ${status === 'approved' ? 'Approved' : 'Denied'} - ${organizationName}`;
    const isApproved = status === 'approved';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: ${isApproved ? '#10B981' : '#EF4444'}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .status { text-align: center; font-size: 24px; margin: 20px 0; }
          .approved { color: #10B981; }
          .denied { color: #EF4444; }
          .info-section { background-color: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏖️ Leave Management System</h1>
            <h2>Admin Request Update</h2>
          </div>
          
          <div class="content">
            <div class="status ${isApproved ? 'approved' : 'denied'}">
              ${isApproved ? '✓ REQUEST APPROVED' : '✗ REQUEST DENIED'}
            </div>
            
            <div class="info-section">
              <p><strong>Hello ${requesterName},</strong></p>
              <p>Your admin access request for <strong>${organizationName}</strong> has been <strong>${status}</strong>.</p>
              <p><strong>Decision Date:</strong> ${new Date().toLocaleString()}</p>
            </div>
            
            ${isApproved ? `
              <div class="info-section">
                <h3>🎉 Congratulations!</h3>
                <p>You now have admin access to your organization's leave management system.</p>
                <p><strong>What you can do now:</strong></p>
                <ul>
                  <li>Approve or deny leave requests</li>
                  <li>Manage leave types</li>
                  <li>View organization analytics</li>
                  <li>Manage user roles</li>
                  <li>Configure organization settings</li>
                </ul>
                <p>Please log back into the system to access your new admin features.</p>
              </div>
            ` : `
              <div class="info-section">
                <h3>Request Denied</h3>
                <p>Unfortunately, your admin request has been denied.</p>
                ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
                <p>You can submit a new request in 24 hours if needed.</p>
                <p>If you have questions about this decision, please contact your organization's admin directly.</p>
              </div>
            `}
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(requesterEmail, subject, htmlContent);
  }
}

export const emailService = new EmailService();