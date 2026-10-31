import dns from "node:dns/promises";
import * as cheerio from "cheerio";

/**
 * IPアドレスがプライベート、ループバック、リンクローカル、予約アドレスかを判定
 */
export function isPrivateOrReservedIp(ip: string): boolean {
  // IPv4 チェック
  if (ip.includes(".")) {
    const parts = ip.split(".").map(Number);
    if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
      return true; // 不正なIPは拒否
    }

    const [a, b] = parts;
    // 0.0.0.0/8 (Current network)
    if (a === 0) return true;
    // 10.0.0.0/8 (Private)
    if (a === 10) return true;
    // 127.0.0.0/8 (Loopback)
    if (a === 127) return true;
    // 169.254.0.0/16 (Link Local / Cloud Metadata)
    if (a === 169 && b === 254) return true;
    // 172.16.0.0/12 (Private: 172.16.0.0 - 172.31.255.255)
    if (a === 172 && b >= 16 && b <= 31) return true;
    // 192.168.0.0/16 (Private)
    if (a === 192 && b === 168) return true;
    // 100.64.0.0/10 (Shared Address Space / CGNAT)
    if (a === 100 && b >= 64 && b <= 127) return true;
    // 198.18.0.0/15 (Benchmarking)
    if (a === 198 && (b === 18 || b === 19)) return true;
    // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved)
    if (a >= 224) return true;

    return false;
  }

  // IPv6 チェック
  const normalized = ip.toLowerCase();
  // Loopback ::1
  if (normalized === "::1" || normalized === "0000:0000:0000:0000:0000:0000:0000:0001") return true;
  // Unspecified ::
  if (normalized === "::" || normalized === "0000:0000:0000:0000:0000:0000:0000:0000") return true;
  // Unique Local (fc00::/7) -> fc..., fd...
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  // Link Local (fe80::/10) -> fe8..., fe9..., fea..., feb...
  if (/^fe[89ab]/.test(normalized)) return true;
  // IPv4 mapped IPv6 (::ffff:x.x.x.x)
  if (normalized.startsWith("::ffff:")) {
    const ipv4Part = normalized.replace("::ffff:", "");
    return isPrivateOrReservedIp(ipv4Part);
  }

  return false;
}

/**
 * 指定ホスト名のDNS解決を行い、安全なIPアドレスであるかを検証
 */
export async function validateHostSafety(hostname: string): Promise<string> {
  const lowerHost = hostname.toLowerCase();
  if (
    lowerHost === "localhost" ||
    lowerHost.endsWith(".localhost") ||
    lowerHost.endsWith(".local") ||
    lowerHost.endsWith(".internal")
  ) {
    throw new Error(`SSRF Blocked: Local domain '${hostname}' is not permitted.`);
  }

  let addresses: string[] = [];
  try {
    const records = await dns.lookup(hostname, { all: true });
    addresses = records.map((r) => r.address);
  } catch {
    throw new Error(`DNS Resolution failed for host '${hostname}'.`);
  }

  if (addresses.length === 0) {
    throw new Error(`DNS Resolution returned no IP addresses for '${hostname}'.`);
  }

  for (const addr of addresses) {
    if (isPrivateOrReservedIp(addr)) {
      throw new Error(`SSRF Blocked: Host '${hostname}' resolved to private/reserved IP: ${addr}`);
    }
  }

  return addresses[0];
}

export interface ScrapedPageResult {
  url: string;
  title: string;
  description: string;
  textContent: string;
}

/**
 * SSRF対策済み・サイズ＆タイムアウト制限付きセキュアスクレイパー
 */
export async function scrapeUrlSafely(targetUrl: string): Promise<ScrapedPageResult> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(targetUrl);
  } catch {
    throw new Error(`Invalid URL format: ${targetUrl}`);
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error(`Invalid protocol '${parsedUrl.protocol}'. Only HTTP and HTTPS are permitted.`);
  }

  // ホストのDNS事前検証
  await validateHostSafety(parsedUrl.hostname);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒タイムアウト

  try {
    const response = await fetch(parsedUrl.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; JobInterviewAISpider/1.0; +https://zyuuuukak1n.dev)",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to fetch URL. HTTP status: ${response.status} ${response.statusText}`);
    }

    // リダイレクト後のホスト検証
    const finalUrl = new URL(response.url);
    await validateHostSafety(finalUrl.hostname);

    // 最大 2MB (2,097,152 bytes) までストリームで安全に読み込み
    const MAX_BYTES = 2 * 1024 * 1024;
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Unable to read response stream.");
    }

    const chunks: Uint8Array[] = [];
    let receivedBytes = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        receivedBytes += value.length;
        if (receivedBytes > MAX_BYTES) {
          await reader.cancel("Response size exceeded limit (2MB)");
          throw new Error("Response body exceeded 2MB limit.");
        }
        chunks.push(value);
      }
    }

    const totalBuffer = new Uint8Array(receivedBytes);
    let offset = 0;
    for (const chunk of chunks) {
      totalBuffer.set(chunk, offset);
      offset += chunk.length;
    }

    const html = new TextDecoder("utf-8").decode(totalBuffer);
    const $ = cheerio.load(html);

    // 不要な要素を削除
    $("script, style, noscript, svg, iframe, nav, footer, header, form").remove();

    const title = $("title").first().text().trim() || $("h1").first().text().trim() || "";
    const metaDescription =
      $('meta[name="description"]').attr("content")?.trim() ||
      $('meta[property="og:description"]').attr("content")?.trim() ||
      "";

    // 本文テキストをクリーンアップ
    const rawText = $("body").text();
    const cleanText = rawText
      .replace(/\s+/g, " ")
      .replace(/[\r\n\t]+/g, " ")
      .trim()
      .slice(0, 8000); // AIコンテキスト注入用に適切な文字数に制限

    return {
      url: targetUrl,
      title,
      description: metaDescription,
      textContent: cleanText,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new Error("Request timed out (5 seconds limit exceeded).");
    }
    throw err;
  }
}
