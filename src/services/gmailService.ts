import { auth, googleProvider } from '../firebase/config';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

export interface GmailProfile {
  emailAddress: string;
  messagesTotal: number;
  threadsTotal: number;
  historyId: string;
}

export interface GmailMessageSummary {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  snippet: string;
  unread: boolean;
  labelIds: string[];
}

export interface GmailMessageDetail extends GmailMessageSummary {
  bodyText: string;
  bodyHtml?: string;
  hasAttachments: boolean;
}

// In-Memory Token Cache (per Google Workspace security requirement, never stored in localStorage)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export function getCachedGmailToken(): string | null {
  return cachedAccessToken;
}

export function setCachedGmailToken(token: string | null): void {
  cachedAccessToken = token;
}

export function clearGmailToken(): void {
  cachedAccessToken = null;
}

/**
 * Initiates Google OAuth popup with Gmail scopes and caches access token in memory
 */
export async function connectGmailWithPopup(): Promise<{ email: string; token: string }> {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken;

    if (!token) {
      throw new Error('No Gmail access token returned. Please approve the permissions.');
    }

    cachedAccessToken = token;
    return {
      email: result.user.email || '',
      token,
    };
  } catch (error: any) {
    console.error('Gmail connection error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
}

/**
 * Fetch authenticated user's Gmail profile
 */
export async function getGmailProfile(): Promise<GmailProfile> {
  const token = getCachedGmailToken();
  if (!token) {
    throw new Error('Gmail is not connected. Please connect with your Google Account.');
  }

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    if (res.status === 401) {
      clearGmailToken();
      throw new Error('Gmail session expired. Please reconnect your account.');
    }
    throw new Error(errorData.error?.message || `Failed to fetch Gmail profile: ${res.statusText}`);
  }

  return res.json();
}

/**
 * List messages with search query
 */
export async function listGmailMessages(
  query: string = '',
  maxResults: number = 20
): Promise<{ messages: GmailMessageSummary[]; nextPageToken?: string }> {
  const token = getCachedGmailToken();
  if (!token) {
    throw new Error('Gmail is not connected.');
  }

  const params = new URLSearchParams({
    maxResults: maxResults.toString(),
  });
  if (query) {
    params.set('q', query);
  }

  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    if (res.status === 401) {
      clearGmailToken();
      throw new Error('Gmail authentication token expired. Please re-authenticate.');
    }
    throw new Error(errorData.error?.message || 'Failed to list Gmail messages');
  }

  const data = await res.json();
  if (!data.messages || data.messages.length === 0) {
    return { messages: [] };
  }

  // Fetch summaries in parallel batches
  const detailedPromises = data.messages.slice(0, maxResults).map(async (msg: { id: string; threadId: string }) => {
    try {
      return await getGmailMessageSummary(msg.id, token);
    } catch {
      return null;
    }
  });

  const resolved = await Promise.all(detailedPromises);
  const messages = resolved.filter((m): m is GmailMessageSummary => m !== null);

  return {
    messages,
    nextPageToken: data.nextPageToken,
  };
}

/**
 * Fetch a single message summary
 */
async function getGmailMessageSummary(messageId: string, token: string): Promise<GmailMessageSummary> {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Date`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch message ${messageId}`);
  }

  const data = await res.json();
  const headers = data.payload?.headers || [];
  const getHeader = (name: string) => headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

  return {
    id: data.id,
    threadId: data.threadId,
    subject: getHeader('Subject') || '(No Subject)',
    from: getHeader('From') || 'Unknown',
    to: getHeader('To') || '',
    date: getHeader('Date') || '',
    snippet: data.snippet || '',
    unread: (data.labelIds || []).includes('UNREAD'),
    labelIds: data.labelIds || [],
  };
}

/**
 * Fetch full message details with decoded body
 */
export async function getGmailMessageDetail(messageId: string): Promise<GmailMessageDetail> {
  const token = getCachedGmailToken();
  if (!token) {
    throw new Error('Gmail is not connected.');
  }

  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error('Failed to retrieve full email content');
  }

  const data = await res.json();
  const headers = data.payload?.headers || [];
  const getHeader = (name: string) => headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

  let bodyText = '';
  let bodyHtml = '';

  const extractBody = (part: any) => {
    if (part.mimeType === 'text/plain' && part.body?.data) {
      bodyText += decodeBase64Url(part.body.data);
    } else if (part.mimeType === 'text/html' && part.body?.data) {
      bodyHtml += decodeBase64Url(part.body.data);
    }
    if (part.parts && Array.isArray(part.parts)) {
      part.parts.forEach(extractBody);
    }
  };

  if (data.payload) {
    extractBody(data.payload);
  }

  if (!bodyText && bodyHtml) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = bodyHtml;
    bodyText = tempDiv.textContent || tempDiv.innerText || '';
  }

  if (!bodyText && !bodyHtml) {
    bodyText = data.snippet || '';
  }

  return {
    id: data.id,
    threadId: data.threadId,
    subject: getHeader('Subject') || '(No Subject)',
    from: getHeader('From') || 'Unknown',
    to: getHeader('To') || '',
    date: getHeader('Date') || '',
    snippet: data.snippet || '',
    unread: (data.labelIds || []).includes('UNREAD'),
    labelIds: data.labelIds || [],
    bodyText,
    bodyHtml: bodyHtml || undefined,
    hasAttachments: Boolean(data.payload?.parts?.some((p: any) => p.filename && p.filename.length > 0)),
  };
}

/**
 * Send an email through Gmail API
 * Note: Must be guarded by an explicit user confirmation dialog in the UI
 */
export async function sendGmailEmail(options: {
  to: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  fromName?: string;
}): Promise<{ id: string; threadId: string }> {
  const token = getCachedGmailToken();
  if (!token) {
    throw new Error('Gmail is not connected. Please connect your Gmail account.');
  }

  const sender = options.fromName ? `${options.fromName} <me>` : 'me';

  const emailLines = [
    `From: ${sender}`,
    `To: ${options.to}`,
    `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(options.subject)))}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    options.bodyHtml || options.bodyText.replace(/\n/g, '<br/>'),
  ];

  const emailRaw = emailLines.join('\r\n');
  const encodedEmail = encodeBase64Url(emailRaw);

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: encodedEmail }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to send email: ${res.statusText}`);
  }

  return res.json();
}

/**
 * Move message to Trash
 * Note: Must be guarded by an explicit user confirmation dialog in the UI
 */
export async function trashGmailEmail(messageId: string): Promise<void> {
  const token = getCachedGmailToken();
  if (!token) {
    throw new Error('Gmail is not connected.');
  }

  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/trash`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Failed to move message to trash');
  }
}

// -------------------------------------------------------------
// Utilities
// -------------------------------------------------------------
function encodeBase64Url(str: string): string {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function decodeBase64Url(str: string): string {
  try {
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    return decodeURIComponent(escape(atob(base64)));
  } catch {
    return atob(str.replace(/-/g, '+').replace(/_/g, '/'));
  }
}
