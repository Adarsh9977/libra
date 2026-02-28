import { google } from "googleapis";
import { getPrisma } from "@/lib/db";

const SCOPES = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/drive.metadata.readonly",
];

function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI ?? `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/drive/oauth/callback`;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required");
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Generate the authorization URL for the first step of OAuth 2.0.
 */
export function getAuthUrl(state?: string): string {
  const oauth2 = getOAuth2Client();
  return oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state: state ?? undefined,
  });
}

/**
 * Exchange code for tokens. Returns token data (caller stores them).
 */
export async function exchangeCodeForTokens(
  code: string
): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date }> {
  const oauth2 = getOAuth2Client();
  const { tokens } = await oauth2.getToken(code);
  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error("Missing access_token or refresh_token");
  }
  const expiresAt = tokens.expiry_date
    ? new Date(tokens.expiry_date)
    : new Date(Date.now() + 3600 * 1000);
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt,
  };
}

const EXPIRY_BUFFER_MS = 5 * 60 * 1000; // refresh 5 min before expiry

/**
 * Get valid access token for userId, refreshing if necessary.
 */
export async function getValidAccessToken(userId: string): Promise<string> {
  const prisma = getPrisma();
  const row = await prisma.driveToken.findUnique({
    where: { userId },
    select: { accessToken: true, refreshToken: true, expiresAt: true },
  });
  if (!row) {
    throw new Error("No Drive tokens found for user. Complete OAuth first.");
  }
  const expiresAt = row.expiresAt.getTime();
  if (Date.now() + EXPIRY_BUFFER_MS < expiresAt) {
    return row.accessToken;
  }
  const oauth2 = getOAuth2Client();
  oauth2.setCredentials({
    refresh_token: row.refreshToken,
  });
  const { credentials } = await oauth2.refreshAccessToken();
  if (!credentials.access_token) {
    throw new Error("Failed to refresh access token");
  }
  const newExpiresAt = credentials.expiry_date
    ? new Date(credentials.expiry_date)
    : new Date(Date.now() + 3600 * 1000);
  await prisma.driveToken.update({
    where: { userId },
    data: {
      accessToken: credentials.access_token,
      expiresAt: newExpiresAt,
    },
  });
  return credentials.access_token;
}

/**
 * Return a Drive API v3 client for the given user (with token refresh).
 */
export async function getDriveClient(userId: string): Promise<ReturnType<typeof google.drive> | null> {
  try {
    const accessToken = await getValidAccessToken(userId);
    const oauth2 = getOAuth2Client();
    oauth2.setCredentials({ access_token: accessToken });
    const drive = google.drive({ version: "v3", auth: oauth2 });
    return drive;
  } catch {
    return null;
  }
}
