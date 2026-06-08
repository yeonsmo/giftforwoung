import "server-only";
import crypto from "node:crypto";
import { serverEnv } from "@/lib/env";

/**
 * AES-256-GCM encryption for secrets stored in the database (spec 0-1-2, 4-1-4).
 * The master key comes from APP_ENCRYPTION_KEY (base64-encoded 32 bytes) and
 * never leaves the server.
 */

function getKey(): Buffer {
  const raw = serverEnv().APP_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "APP_ENCRYPTION_KEY가 설정되지 않았습니다. 32바이트 키를 base64로 인코딩하여 설정하십시오.",
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("APP_ENCRYPTION_KEY는 base64로 인코딩된 32바이트여야 합니다.");
  }
  return key;
}

export interface SecretBundle {
  ciphertext: string;
  iv: string;
  authTag: string;
}

export function encryptSecret(plaintext: string): SecretBundle {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    ciphertext: enc.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}

export function decryptSecret(bundle: SecretBundle): string {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getKey(),
    Buffer.from(bundle.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(bundle.authTag, "base64"));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(bundle.ciphertext, "base64")),
    decipher.final(),
  ]);
  return dec.toString("utf8");
}
