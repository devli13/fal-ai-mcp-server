/**
 * Fal.ai client wrapper for MCP server
 */

import { fal } from "@fal-ai/client";
import https from "https";
import { URL } from "url";

/**
 * Configure the fal client with API key from environment
 * Only call this if FAL_KEY is available
 */
export function configureFalClient(): void {
  const apiKey = process.env.FAL_KEY || process.env.FAL_API_KEY;

  if (!apiKey) {
    throw new Error("FAL_KEY environment variable is not set.");
  }

  fal.config({
    credentials: apiKey,
  });
}

/**
 * Make authenticated HTTP request to fal.ai API
 */
export async function falRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const apiKey = process.env.FAL_KEY || process.env.FAL_API_KEY;

  if (!apiKey) {
    throw new Error("FAL_KEY (or FAL_API_KEY) environment variable is not set");
  }

  const method = (options.method || "GET").toUpperCase();

  // For GET requests, use https module to ensure no body is sent
  if (method === "GET" || method === "HEAD") {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const requestOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 443,
        path: parsedUrl.pathname + parsedUrl.search,
        method: method,
        headers: {
          "Authorization": `Key ${apiKey}`,
        },
      };

      const req = https.request(requestOptions, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(data) as T);
            } catch (e) {
              reject(new Error(`Failed to parse JSON response: ${data}`));
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        });
      });

      req.on("error", (error) => {
        reject(error);
      });

      req.end(); // Important: no body is sent
    });
  }

  // For POST/PUT/PATCH, use fetch as before
  const headers: Record<string, string> = {
    "Authorization": `Key ${apiKey}`,
    "Content-Type": "application/json",
  };

  // Copy existing headers if any
  if (options.headers) {
    Object.entries(options.headers).forEach(([key, value]) => {
      if (typeof value === 'string') {
        headers[key] = value;
      }
    });
  }

  const response = await fetch(url, {
    method,
    headers,
    body: options.body,
    signal: options.signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  return response.json() as Promise<T>;
}

/**
 * Make HTTP request to fal.ai Platform API without authentication
 * Platform API v1 endpoints work without auth (with rate limits)
 * Note: Queue API keys don't work with Platform API v1
 */
export async function publicRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  // Don't include auth - Platform API v1 doesn't accept Queue API key format
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...options.headers as Record<string, string>,
  };

  const response = await fetch(url, {
    method: "GET",
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  return response.json() as Promise<T>;
}

export { fal };
