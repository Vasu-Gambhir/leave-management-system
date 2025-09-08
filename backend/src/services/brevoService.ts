import fetch from "node-fetch";
import { config } from "../config/index.js";

export class BrevoService {
  private apiKey: string | null = null;
  private baseUrl = "https://api.brevo.com/v3";

  constructor() {
    if (config.BREVO_API_KEY) {
      this.apiKey = config.BREVO_API_KEY;
      console.log("📧 Brevo service initialized");
    } else {
      console.log("⚠️ Brevo API key not provided");
    }
  }

  private async sendBrevoEmail(
    to: string,
    subject: string,
    htmlContent: string,
    textContent?: string
  ) {
    if (!this.apiKey) {
      console.log("Brevo not configured, skipping email:", subject);
      return { success: false };
    }

    try {
      const emailData = {
        sender: {
          name: config.BREVO_FROM_NAME || "Leave Management System",
          email: config.BREVO_FROM_EMAIL || "noreply@yourdomain.com"
        },
        to: [{ email: to }],
        subject: subject,
        htmlContent: htmlContent,
        ...(textContent && { textContent })
      };

      const response = await fetch(`${this.baseUrl}/smtp/email`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "api-key": this.apiKey
        },
        body: JSON.stringify(emailData)
      });

      if (response.ok) {
        const result = await response.json() as any;
        console.log("✅ Email sent via Brevo:", subject);
        return { success: true, messageId: result.messageId };
      } else {
        const error = await response.text();
        console.error("Brevo API error:", error);
        return { success: false };
      }
    } catch (error) {
      console.error("Brevo error:", error);
      return { success: false };
    }
  }

  async sendLeaveRequestNotification(data: {
    to: string;
    employeeName: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    reason?: string;
  }) {
    const subject = `New Leave Request - ${data.employeeName}`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">New Leave Request</h2>
        <p>A new leave request has been submitted and requires your approval.</p>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Request Details</h3>
          <p><strong>Employee:</strong> ${data.employeeName}</p>
          <p><strong>Leave Type:</strong> ${data.leaveType}</p>
          <p><strong>Start Date:</strong> ${new Date(data.startDate).toLocaleDateString()}</p>
          <p><strong>End Date:</strong> ${new Date(data.endDate).toLocaleDateString()}</p>
          ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ""}
        </div>
        
        <p>Please log in to the Leave Management System to review and approve this request.</p>
      </div>
    `;

    return this.sendBrevoEmail(data.to, subject, htmlContent);
  }

  async sendLeaveApprovalNotification(data: {
    to: string;
    employeeName: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    status: "approved" | "rejected";
    approverName: string;
    rejectionReason?: string;
  }) {
    const subject = data.status === "approved"
      ? `Leave Request Approved - ${data.leaveType}`
      : `Leave Request Rejected - ${data.leaveType}`;

    const statusColor = data.status === "approved" ? "#28a745" : "#dc3545";
    const statusText = data.status === "approved" ? "APPROVED" : "REJECTED";

    const htmlContent = `
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
            <p><strong>${data.status === "approved" ? "Approved" : "Rejected"} by:</strong> ${data.approverName}</p>
            ${data.rejectionReason ? `<p><strong>Reason for Rejection:</strong> ${data.rejectionReason}</p>` : ""}
          </div>
          
          ${data.status === "approved"
            ? "<p>Your leave has been added to the calendar. Enjoy your time off!</p>"
            : "<p>If you have any questions about this decision, please contact your manager.</p>"}
        </div>
      </div>
    `;

    return this.sendBrevoEmail(data.to, subject, htmlContent);
  }

  async sendLeaveCancellationNotification(data: {
    to: string;
    employeeName: string;
    leaveType: string;
    startDate: string;
    endDate: string;
  }) {
    const subject = `Leave Request Cancelled - ${data.employeeName}`;
    const htmlContent = `
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
    `;

    return this.sendBrevoEmail(data.to, subject, htmlContent);
  }

  async sendEmail(to: string, subject: string, htmlContent: string) {
    return this.sendBrevoEmail(to, subject, htmlContent);
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
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #3B82F6; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1>🏖️ Leave Management System</h1>
            <h2>${subject}</h2>
          </div>
          
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px;">
            <div style="background-color: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
              <h3>Request Details</h3>
              <p><strong>Requester:</strong> ${requesterName}</p>
              <p><strong>Email:</strong> ${requesterEmail}</p>
              <p><strong>Organization:</strong> ${organizationName}</p>
              <p><strong>Domain:</strong> ${organizationDomain}</p>
              <p><strong>Request Date:</strong> ${new Date().toLocaleString()}</p>
            </div>
            
            ${isRequestToMaster
              ? `<p>This user is requesting admin access for their organization. As the master administrator, 
              you have the authority to approve or deny this request.</p>`
              : `<p>This user is requesting admin access to your organization. As an existing admin, 
              you can approve or deny this request.</p>`}
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${approveLink}" style="display: inline-block; padding: 12px 24px; margin: 10px; background-color: #10B981; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">✓ Approve Request</a>
              <a href="${denyLink}" style="display: inline-block; padding: 12px 24px; margin: 10px; background-color: #EF4444; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">✗ Deny Request</a>
            </div>
            
            <div style="background-color: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
              <p><strong>Note:</strong> This request will automatically expire in 24 hours.</p>
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
    status: "approved" | "denied",
    reason?: string
  ) {
    const subject = `Admin Request ${status === "approved" ? "Approved" : "Denied"} - ${organizationName}`;
    const isApproved = status === "approved";

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: ${isApproved ? "#10B981" : "#EF4444"}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1>🏖️ Leave Management System</h1>
            <h2>Admin Request Update</h2>
          </div>
          
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px;">
            <div style="text-align: center; font-size: 24px; margin: 20px 0; color: ${isApproved ? "#10B981" : "#EF4444"};">
              ${isApproved ? "✓ REQUEST APPROVED" : "✗ REQUEST DENIED"}
            </div>
            
            <div style="background-color: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
              <p><strong>Hello ${requesterName},</strong></p>
              <p>Your admin access request for <strong>${organizationName}</strong> has been <strong>${status}</strong>.</p>
              <p><strong>Decision Date:</strong> ${new Date().toLocaleString()}</p>
            </div>
            
            ${isApproved
              ? `<div style="background-color: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
                <h3>🎉 Congratulations!</h3>
                <p>You now have admin access. You can:</p>
                <ul>
                  <li>Approve or deny leave requests</li>
                  <li>Manage leave types</li>
                  <li>View organization analytics</li>
                  <li>Manage user roles</li>
                </ul>
              </div>`
              : `<div style="background-color: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
                <h3>Request Denied</h3>
                ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
                <p>You can submit a new request in 24 hours if needed.</p>
              </div>`}
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(requesterEmail, subject, htmlContent);
  }
}

export const brevoService = new BrevoService();