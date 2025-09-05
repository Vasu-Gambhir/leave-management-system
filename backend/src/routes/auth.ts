import { Hono } from "hono";
import { HTTPException } from 'hono/http-exception';
import jwt from "jsonwebtoken";
import { google } from "googleapis";
import { googleCalendarService } from "../services/googleCalendar.js";
import { supabase } from "../services/supabaseClient.js";
import { config } from "../config/index.js";
import { authenticate } from "../middleware/auth.js";

const auth = new Hono();

// Get Google OAuth URL
auth.get("/google/url", async (c) => {
  try {
    const authUrl = googleCalendarService.getAuthUrl();
    return c.json({ authUrl });
  } catch (error) {
    console.error("Error generating auth URL:", error);
    return c.json({ error: "Failed to generate auth URL" }, 500);
  }
});

// Handle Google OAuth callback
auth.post("/google/callback", async (c) => {
  try {
    const { code, organizationDomain } = await c.req.json();

    // Get tokens from Google
    const tokens = await googleCalendarService.getTokens(code);
    if (!tokens.access_token) {
      throw new HTTPException(400, { message: 'Failed to get access token from Google' });
    }
    const credentials: any = {
      access_token: tokens.access_token
    };
    if (tokens.refresh_token) {
      credentials.refresh_token = tokens.refresh_token;
    }
    googleCalendarService.setCredentials(credentials);

    // Get user info from Google
    const oauth2 = new google.auth.OAuth2();
    const oauth2Credentials: any = {
      access_token: tokens.access_token
    };
    if (tokens.refresh_token) {
      oauth2Credentials.refresh_token = tokens.refresh_token;
    }
    oauth2.setCredentials(oauth2Credentials);

    const oauth2Client = google.oauth2({ version: "v2", auth: oauth2 });
    const { data: googleUser } = await oauth2Client.userinfo.get();

    if (!googleUser.email) {
      return c.json({ error: "No email found in Google account" }, 400);
    }

    // Check if organization exists or create it
    let organization;
    const { data: existingOrg } = await supabase
      .from("organizations")
      .select("*")
      .eq("domain", organizationDomain)
      .single();

    if (existingOrg) {
      organization = existingOrg;
    } else {
      // Create new organization with NO admins initially
      const { data: newOrg, error: orgError } = await supabase
        .from("organizations")
        .insert({
          name: organizationDomain,
          domain: organizationDomain,
          settings: {},
          admin_count: 0, // All orgs start with 0 admins
        })
        .select()
        .single();

      if (orgError) {
        console.error("Error creating organization:", orgError);
        return c.json({ error: "Failed to create organization" }, 500);
      }
      organization = newOrg;
    }

    // Check if user exists
    let user;
    const { data: existingUser } = await supabase
      .from("users")
      .select("*")
      .eq("email", googleUser.email)
      .eq("organization_id", organization.id)
      .single();

    if (existingUser) {
      user = existingUser;
      // Update user with latest Google info
      const isMasterUser = googleUser.email?.toLowerCase() === config.MASTER_EMAIL?.toLowerCase();
      const userRole = isMasterUser ? "admin" : existingUser.role; // Keep existing role unless master
      
      const { data: updatedUser, error: updateError } = await supabase
        .from("users")
        .update({
          google_id: googleUser.id,
          name: googleUser.name || googleUser.email,
          profile_picture: googleUser.picture,
          google_tokens: tokens,
          role: userRole, // Update role for master user
        })
        .eq("id", existingUser.id)
        .select()
        .single();

      if (!updateError && updatedUser) {
        user = updatedUser;
      }
    } else {
      // Create new user
      const isMasterUser = googleUser.email?.toLowerCase() === config.MASTER_EMAIL?.toLowerCase();
      const userRole = isMasterUser ? "admin" : "team_member";
      
      const { data: newUser, error: userError } = await supabase
        .from("users")
        .insert({
          email: googleUser.email,
          name: googleUser.name || googleUser.email,
          google_id: googleUser.id!,
          organization_id: organization.id,
          role: userRole,
          profile_picture: googleUser.picture,
          google_tokens: tokens,
        })
        .select()
        .single();

      if (userError) {
        console.error("Error creating user:", userError);
        return c.json({ error: "Failed to create user" }, 500);
      }
      user = newUser;
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user.id }, config.JWT_SECRET, {
      expiresIn: "7d",
    });

    return c.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organization_id: user.organization_id,
        profile_picture: user.profile_picture,
      },
    });
  } catch (error) {
    console.error("Error in Google callback:", error);
    return c.json({ error: "Authentication failed" }, 500);
  }
});

// Get current user
auth.get("/me", authenticate, async (c) => {
  const user = c.get("user");
  return c.json({ user });
});

// Logout
auth.post("/logout", authenticate, async (c) => {
  return c.json({ message: "Logged out successfully" });
});

export default auth;
