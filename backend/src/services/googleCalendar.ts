import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";

export class GoogleCalendarService {
  private oauth2Client: OAuth2Client;
  private calendar;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    this.calendar = google.calendar({ version: "v3", auth: this.oauth2Client });
  }

  setCredentials(tokens: { access_token: string; refresh_token?: string }) {
    if (!tokens.refresh_token) {
      throw new Error(
        "No refresh token provided. Please re-authorize the application."
      );
    }
    this.oauth2Client.setCredentials(tokens);
  }

  getAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: [
        // "https://www.googleapis.com/auth/calendar",
        // "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/userinfo.email",
      ],
    });
  }

  async getTokens(code: string) {
    const { tokens } = await this.oauth2Client.getToken(code);
    return tokens;
  }

  async refreshAccessToken(): Promise<{
    access_token: string;
    refresh_token?: string;
  }> {
    try {
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      return {
        access_token: credentials.access_token!,
        ...(credentials.refresh_token && {
          refresh_token: credentials.refresh_token,
        }),
      };
    } catch (error) {
      throw new Error(
        "Failed to refresh access token. Please re-authorize the application."
      );
    }
  }

  async createLeaveEvent(leaveData: {
    employeeName: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    reason?: string;
  }): Promise<string> {
    try {
      // Google Calendar treats end date as exclusive for all-day events
      // Need to add 1 day to the end date to include the final day
      const endDate = new Date(leaveData.endDate);
      endDate.setDate(endDate.getDate() + 1);
      const adjustedEndDate = endDate.toISOString().substring(0, 10); // Format: YYYY-MM-DD

      const event = {
        summary: `${leaveData.leaveType} | ${leaveData.employeeName}`,
        description: leaveData.reason || "Leave request approved",
        start: {
          date: leaveData.startDate,
        },
        end: {
          date: adjustedEndDate,
        },
        colorId: "4",
      };

      const response = await this.calendar.events.insert({
        calendarId: "primary",
        requestBody: event,
      });

      return response.data.id!;
    } catch (error) {
      console.error("Error creating calendar event:", error);
      throw error;
    }
  }

  async deleteLeaveEvent(eventId: string): Promise<void> {
    try {
      await this.calendar.events.delete({
        calendarId: "primary",
        eventId: eventId,
      });
    } catch (error) {
      console.error("Error deleting calendar event:", error);
      throw error;
    }
  }

  async updateLeaveEvent(
    eventId: string,
    leaveData: {
      employeeName: string;
      leaveType: string;
      startDate: string;
      endDate: string;
      reason?: string;
    }
  ): Promise<void> {
    try {
      // Google Calendar treats end date as exclusive for all-day events
      // Need to add 1 day to the end date to include the final day
      const endDate = new Date(leaveData.endDate);
      endDate.setDate(endDate.getDate() + 1);
      const adjustedEndDate = endDate.toISOString().substring(0, 10); // Format: YYYY-MM-DD

      const event = {
        summary: `${leaveData.leaveType} | ${leaveData.employeeName}`,
        description: leaveData.reason || "Leave request approved",
        start: {
          date: leaveData.startDate,
        },
        end: {
          date: adjustedEndDate,
        },
      };

      await this.calendar.events.update({
        calendarId: "primary",
        eventId: eventId,
        requestBody: event,
      });
    } catch (error) {
      console.error("Error updating calendar event:", error);
      throw error;
    }
  }
}

export const googleCalendarService = new GoogleCalendarService();
