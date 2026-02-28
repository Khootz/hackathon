/**
 * AWS Signature V4 signing for React Native / Hermes.
 *
 * Uses `crypto-js` (pure JS) so it works in environments without
 * Web Crypto API (i.e. Hermes / React Native).
 */

import HmacSHA256 from "crypto-js/hmac-sha256";
import SHA256 from "crypto-js/sha256";
import Hex from "crypto-js/enc-hex";

const AWS_ACCESS_KEY = process.env.EXPO_PUBLIC_AWS_ACCESS_KEY_ID ?? "";
const AWS_SECRET_KEY = process.env.EXPO_PUBLIC_AWS_SECRET_ACCESS_KEY ?? "";
const AWS_REGION = process.env.EXPO_PUBLIC_AWS_REGION ?? "us-east-1";

// ── helpers ──────────────────────────────────────────────────────────────────

function sha256Hex(data: string): string {
  return SHA256(data).toString(Hex);
}

function hmacSha256(key: string | CryptoJS.lib.WordArray, data: string) {
  return HmacSHA256(data, key);
}

function getSignatureKey(
  secretKey: string,
  dateStamp: string,
  region: string,
  service: string
) {
  const kDate = hmacSha256(`AWS4${secretKey}`, dateStamp);
  const kRegion = hmacSha256(kDate, region);
  const kService = hmacSha256(kRegion, service);
  const kSigning = hmacSha256(kService, "aws4_request");
  return kSigning;
}

// ── public ───────────────────────────────────────────────────────────────────

/**
 * Sign an AWS request using SigV4. Returns the full set of headers
 * (original + Host, X-Amz-Date, Authorization).
 */
/**
 * AWS SigV4 URI-encode a path: encode each segment per AWS rules
 * (encode everything except A-Z a-z 0-9 - _ . ~ and /).
 */
function awsUriEncodePath(rawPath: string): string {
  return rawPath
    .split("/")
    .map((seg) =>
      encodeURIComponent(seg)
        .replace(/!/g, "%21")
        .replace(/'/g, "%27")
        .replace(/\(/g, "%28")
        .replace(/\)/g, "%29")
        .replace(/\*/g, "%2A")
    )
    .join("/");
}

export function signRequest(
  method: string,
  url: string,
  headers: Record<string, string>,
  body: string,
  service: string
): Record<string, string> {
  const parsed = new URL(url);
  const host = parsed.host;
  // Use AWS SigV4 URI encoding for the canonical path
  const path = awsUriEncodePath(parsed.pathname);

  const now = new Date();
  const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const dateStamp = amzDate.slice(0, 8);

  const payloadHash = sha256Hex(body);

  const canonicalHeaders =
    `content-type:${headers["Content-Type"]}\n` +
    `host:${host}\n` +
    `x-amz-date:${amzDate}\n`;

  const signedHeaders = "content-type;host;x-amz-date";

  const canonicalRequest = [
    method,
    path,
    "", // query string (none)
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${AWS_REGION}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const signingKey = getSignatureKey(
    AWS_SECRET_KEY,
    dateStamp,
    AWS_REGION,
    service
  );
  const signature = hmacSha256(signingKey, stringToSign).toString(Hex);

  const authHeader =
    `AWS4-HMAC-SHA256 Credential=${AWS_ACCESS_KEY}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, ` +
    `Signature=${signature}`;

  return {
    ...headers,
    Host: host,
    "X-Amz-Date": amzDate,
    Authorization: authHeader,
  };
}
