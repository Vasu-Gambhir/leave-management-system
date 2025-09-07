import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import jwt from "jsonwebtoken";
import { google } from "googleapis";
import { googleCalendarService } from "../services/googleCalendar.js";
import { supabase } from "../services/supabaseClient.js";
import { config } from "../config/index.js";
import { authenticate } from "../middleware/auth.js";

const auth = new Hono();

auth.get("/google/url", async (c) => {
  try {
    const authUrl = googleCalendarService.getAuthUrl();
    return c.json({ authUrl });
  } catch (error) {
    console.error("Error generating auth URL:", error);
    return c.json({ error: "Failed to generate auth URL" }, 500);
  }
});

auth.post("/google/callback", async (c) => {
  try {
    const { code, organizationDomain } = await c.req.json();

    const tokens = await googleCalendarService.getTokens(code);
    if (!tokens.access_token) {
      throw new HTTPException(400, {
        message: "Failed to get access token from Google",
      });
    }

    if (!tokens.refresh_token) {
      throw new HTTPException(400, {
        message:
          "No refresh token received from Google. Please try again and ensure you grant all permissions.",
      });
    }

    const credentials: any = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    };
    googleCalendarService.setCredentials(credentials);

    const oauth2 = new google.auth.OAuth2();
    const oauth2Credentials: any = {
      access_token: tokens.access_token,
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

    // Check if user already exists with different organization before creating org
    const { data: existingUserAnyOrg } = await supabase
      .from("users")
      .select("*")
      .eq("email", googleUser.email)
      .single();

    let organization;
    const { data: existingOrg } = await supabase
      .from("organizations")
      .select("*")
      .eq("domain", organizationDomain)
      .single();

    if (existingOrg) {
      organization = existingOrg;
      
      // Check if user is trying to join a different organization
      if (
        existingUserAnyOrg &&
        existingUserAnyOrg.organization_id !== organization.id
      ) {
        return c.json(
          {
            error:
              "This email is already registered with another organization. Please contact support if you need to transfer your account.",
          },
          400
        );
      }
    } else {
      // Check if user exists with ANY organization before creating new org
      if (existingUserAnyOrg) {
        return c.json(
          {
            error:
              "This email is already registered with another organization. Please contact support if you need to transfer your account.",
          },
          400
        );
      }

      // Create new organization only if user doesn't exist anywhere
      const { data: newOrg, error: orgError } = await supabase
        .from("organizations")
        .insert({
          name: organizationDomain,
          domain: organizationDomain,
          settings: {},
          admin_count: 0,
        })
        .select()
        .single();

      if (orgError) {
        console.error("Error creating organization:", orgError);
        return c.json({ error: "Failed to create organization" }, 500);
      }
      organization = newOrg;
    }

    let user;
    const existingUser =
      existingUserAnyOrg?.organization_id === organization.id
        ? existingUserAnyOrg
        : null;

    if (existingUser) {
      user = existingUser;
      const isMasterUser =
        googleUser.email?.toLowerCase() === config.MASTER_EMAIL?.toLowerCase();
      const userRole = isMasterUser ? "admin" : existingUser.role;

      const { data: updatedUser, error: updateError } = await supabase
        .from("users")
        .update({
          google_id: googleUser.id,
          name: googleUser.name || googleUser.email,
          profile_picture: googleUser.picture,
          google_tokens: tokens,
          role: userRole,
        })
        .eq("id", existingUser.id)
        .select()
        .single();

      if (!updateError && updatedUser) {
        user = updatedUser;
      }
    } else {
      const isMasterUser =
        googleUser.email?.toLowerCase() === config.MASTER_EMAIL?.toLowerCase();
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

    const token = jwt.sign({ userId: user.id }, config.JWT_SECRET, {
      expiresIn: "24h",
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

auth.get("/me", authenticate, async (c) => {
  const user = c.get("user");
  return c.json({ user });
});

auth.post("/logout", authenticate, async (c) => {
  return c.json({ message: "Logged out successfully" });
});

export default auth;
