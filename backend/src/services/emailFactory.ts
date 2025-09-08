import { config } from "../config/index.js";
import { EmailService } from "./emailService.js";
import { BrevoService } from "./brevoService.js";

// Interface for email service methods
interface IEmailService {
  sendLeaveRequestNotification(data: {
    to: string;
    employeeName: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    reason?: string;
  }): Promise<any>;

  sendLeaveApprovalNotification(data: {
    to: string;
    employeeName: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    status: "approved" | "rejected";
    approverName: string;
    rejectionReason?: string;
  }): Promise<any>;

  sendLeaveCancellationNotification(data: {
    to: string;
    employeeName: string;
    leaveType: string;
    startDate: string;
    endDate: string;
  }): Promise<any>;

  sendEmail(to: string, subject: string, htmlContent: string): Promise<any>;

  sendAdminRequestNotification(
    recipientEmail: string,
    requesterName: string,
    requesterEmail: string,
    organizationName: string,
    organizationDomain: string,
    approveLink: string,
    denyLink: string,
    isRequestToMaster?: boolean
  ): Promise<any>;

  sendRequestStatusNotification(
    requesterEmail: string,
    requesterName: string,
    organizationName: string,
    status: "approved" | "denied",
    reason?: string
  ): Promise<any>;
}

class EmailFactory {
  private emailService: IEmailService;

  constructor() {
    // Use Brevo in production, SMTP in development
    if (config.NODE_ENV === "production" && config.BREVO_API_KEY) {
      console.log("🚀 Using Brevo for email (Production)");
      this.emailService = new BrevoService();
    } else {
      console.log("📧 Using SMTP for email (Development/Fallback)");
      this.emailService = new EmailService();
    }
  }

  getService(): IEmailService {
    return this.emailService;
  }
}

// Export a singleton instance
const emailFactory = new EmailFactory();
export const emailService = emailFactory.getService();

// Export for backward compatibility and direct access if needed
export { EmailService } from "./emailService.js";
export { BrevoService } from "./brevoService.js";