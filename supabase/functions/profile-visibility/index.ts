import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "npm:@supabase/supabase-js@2.105.3";
import { corsHeaders } from "npm:@supabase/supabase-js@2.105.3/cors";
import { recoverMessageAddress, type Hex } from "npm:viem@2.47.6";

const encoder = new TextEncoder();
const walletPattern = /^0x[0-9a-f]{40}$/;
const noncePattern = /^[0-9a-f]{64}$/;
const tokenPattern = /^[0-9a-f]{64}$/;
const signaturePattern = /^0x[0-9a-fA-F]{128,130}$/;
const challengeLifetimeMs = 5 * 60 * 1000;

type ChallengeRequest = {
  action: "challenge";
  wallet_address: string;
  visible: boolean;
};

type UpdateRequest = {
  action: "update";
  wallet_address: string;
  visible: boolean;
  nonce: string;
  expires_at: string;
  challenge_token: string;
  signature: string;
};

const jsonResponse = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: corsHeaders,
  });

const normalizeWallet = (value: unknown) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const toHex = (bytes: ArrayBuffer) =>
  Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");

const randomHex = (byteLength: number) => {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
};

const sha256 = async (value: string) =>
  toHex(await crypto.subtle.digest("SHA-256", encoder.encode(value)));

const getServerSecret = () => {
  const secretKeysJson = Deno.env.get("SUPABASE_SECRET_KEYS");

  if (secretKeysJson) {
    const secretKeys = JSON.parse(secretKeysJson) as Record<string, string>;
    if (secretKeys.default) {
      return secretKeys.default;
    }
  }

  const legacyServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!legacyServiceRoleKey) {
    throw new Error("Supabase server secret is unavailable");
  }

  return legacyServiceRoleKey;
};

const importHmacKey = (secret: string) =>
  crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );

const challengePayload = (
  walletAddress: string,
  visible: boolean,
  nonce: string,
  expiresAt: string,
) => JSON.stringify([walletAddress, visible, nonce, expiresAt]);

const challengeMessage = (
  walletAddress: string,
  visible: boolean,
  nonce: string,
  expiresAt: string,
) => `WEB3UOA profile visibility

Wallet: ${walletAddress}
Set profile: ${visible ? "visible" : "hidden"}
Nonce: ${nonce}
Expires: ${expiresAt}

Signing does not create a blockchain transaction.`;

const signChallenge = async (key: CryptoKey, payload: string) =>
  toHex(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)));

const verifyChallenge = async (
  key: CryptoKey,
  payload: string,
  token: string,
) => {
  const bytes = Uint8Array.from(token.match(/.{2}/g) ?? [], (pair) =>
    Number.parseInt(pair, 16),
  );

  return crypto.subtle.verify("HMAC", key, bytes, encoder.encode(payload));
};

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = (await request.json()) as ChallengeRequest | UpdateRequest;
    const walletAddress = normalizeWallet(body.wallet_address);

    if (!walletPattern.test(walletAddress) || typeof body.visible !== "boolean") {
      return jsonResponse({ error: "Invalid wallet or visibility value" }, 400);
    }

    const serverSecret = getServerSecret();
    const hmacKey = await importHmacKey(serverSecret);

    if (body.action === "challenge") {
      const nonce = randomHex(32);
      const expiresAt = new Date(Date.now() + challengeLifetimeMs).toISOString();
      const message = challengeMessage(
        walletAddress,
        body.visible,
        nonce,
        expiresAt,
      );
      const challengeToken = await signChallenge(
        hmacKey,
        challengePayload(walletAddress, body.visible, nonce, expiresAt),
      );

      return jsonResponse({
        message,
        nonce,
        expires_at: expiresAt,
        challenge_token: challengeToken,
      });
    }

    if (body.action !== "update") {
      return jsonResponse({ error: "Invalid action" }, 400);
    }

    if (
      !noncePattern.test(body.nonce) ||
      !tokenPattern.test(body.challenge_token) ||
      !signaturePattern.test(body.signature)
    ) {
      return jsonResponse({ error: "Invalid verification data" }, 400);
    }

    const expiresAtMs = Date.parse(body.expires_at);
    if (
      !Number.isFinite(expiresAtMs) ||
      expiresAtMs <= Date.now() ||
      expiresAtMs > Date.now() + challengeLifetimeMs + 30_000
    ) {
      return jsonResponse({ error: "This request expired. Please try again." }, 401);
    }

    const payload = challengePayload(
      walletAddress,
      body.visible,
      body.nonce,
      body.expires_at,
    );
    const validServerChallenge = await verifyChallenge(
      hmacKey,
      payload,
      body.challenge_token,
    );

    if (!validServerChallenge) {
      return jsonResponse({ error: "Invalid or altered request" }, 401);
    }

    const message = challengeMessage(
      walletAddress,
      body.visible,
      body.nonce,
      body.expires_at,
    );
    const recoveredAddress = await recoverMessageAddress({
      message,
      signature: body.signature as Hex,
    });

    if (recoveredAddress.toLowerCase() !== walletAddress) {
      return jsonResponse(
        { error: "The connected wallet did not sign this request" },
        401,
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!supabaseUrl) {
      throw new Error("Supabase URL is unavailable");
    }

    const supabaseAdmin = createClient(supabaseUrl, serverSecret, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const nonceHash = await sha256(body.nonce);
    const { data: applied, error } = await supabaseAdmin.rpc(
      "apply_profile_visibility_change",
      {
        input_wallet: walletAddress,
        input_visibility: body.visible,
        input_nonce_hash: nonceHash,
        input_expires_at: body.expires_at,
      },
    );

    if (error) {
      console.error("Profile visibility RPC failed", error.code);
      return jsonResponse({ error: "Unable to update profile visibility" }, 500);
    }

    if (!applied) {
      return jsonResponse(
        { error: "This request was already used or is no longer valid" },
        409,
      );
    }

    return jsonResponse({ visible: body.visible });
  } catch (error) {
    console.error(
      "Profile visibility function failed",
      error instanceof Error ? error.message : "Unknown error",
    );
    return jsonResponse({ error: "Unable to update profile visibility" }, 500);
  }
});
