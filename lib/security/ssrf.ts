import "server-only";
import { lookup } from "node:dns/promises";
import net from "node:net";

/**
 * SSRF protection for fetching externally-supplied URLs (spec security).
 *
 * Only http/https is allowed; the hostname is resolved and every resulting IP is
 * checked against private, loopback, link-local (incl. cloud metadata
 * 169.254.169.254), CGNAT, and reserved ranges. Redirects are disabled by
 * safeFetch so a public URL cannot redirect into an internal address.
 */

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map((p) => Number(p));
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return true;
  const [a, b] = parts as [number, number, number, number];
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true; // link-local + cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multicast / reserved
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true;
  if (lower.startsWith("fe80")) return true; // link-local
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique local
  const mapped = /::ffff:(\d+\.\d+\.\d+\.\d+)/.exec(lower);
  if (mapped && mapped[1]) return isPrivateIPv4(mapped[1]);
  return false;
}

/** Validates the URL and asserts it does not resolve to an internal address. */
export async function assertSafeUrl(raw: string): Promise<void> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("URL 형식이 올바르지 않습니다.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("http 또는 https URL만 허용됩니다.");
  }

  const host = url.hostname;
  const ips: string[] = [];
  if (net.isIP(host)) {
    ips.push(host);
  } else {
    const results = await lookup(host, { all: true });
    for (const r of results) ips.push(r.address);
  }
  if (ips.length === 0) throw new Error("호스트를 확인할 수 없습니다.");

  for (const ip of ips) {
    const blocked = net.isIPv6(ip) ? isPrivateIPv6(ip) : isPrivateIPv4(ip);
    if (blocked) {
      throw new Error("사설/내부 주소로의 요청은 차단됩니다.");
    }
  }
}

/** Fetches an externally-supplied URL with SSRF checks and redirects disabled. */
export async function safeFetch(raw: string, init?: RequestInit): Promise<Response> {
  await assertSafeUrl(raw);
  return fetch(raw, { ...init, redirect: "error" });
}
