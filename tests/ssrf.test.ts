import { describe, it, expect } from "vitest";
import { isPrivateOrReservedIp, scrapeUrlSafely } from "../src/lib/ssrf";

describe("SSRF Prevention Validator", () => {
  it("should detect private and reserved IPv4 addresses", () => {
    // Loopback
    expect(isPrivateOrReservedIp("127.0.0.1")).toBe(true);
    expect(isPrivateOrReservedIp("127.1.2.3")).toBe(true);

    // Private Class A (10.0.0.0/8)
    expect(isPrivateOrReservedIp("10.0.0.1")).toBe(true);
    expect(isPrivateOrReservedIp("10.255.255.254")).toBe(true);

    // Private Class B (172.16.0.0/12)
    expect(isPrivateOrReservedIp("172.16.0.1")).toBe(true);
    expect(isPrivateOrReservedIp("172.31.255.254")).toBe(true);
    expect(isPrivateOrReservedIp("172.32.0.1")).toBe(false); // Public

    // Private Class C (192.168.0.0/16)
    expect(isPrivateOrReservedIp("192.168.1.1")).toBe(true);

    // Cloud Metadata / Link Local (169.254.0.0/16)
    expect(isPrivateOrReservedIp("169.254.169.254")).toBe(true);

    // Current network (0.0.0.0/8)
    expect(isPrivateOrReservedIp("0.0.0.0")).toBe(true);

    // Multicast (224.0.0.0+)
    expect(isPrivateOrReservedIp("224.0.0.1")).toBe(true);
  });

  it("should permit valid public IPv4 addresses", () => {
    expect(isPrivateOrReservedIp("8.8.8.8")).toBe(false);
    expect(isPrivateOrReservedIp("1.1.1.1")).toBe(false);
    expect(isPrivateOrReservedIp("142.250.196.110")).toBe(false);
  });

  it("should detect private and reserved IPv6 addresses", () => {
    expect(isPrivateOrReservedIp("::1")).toBe(true);
    expect(isPrivateOrReservedIp("::")).toBe(true);
    expect(isPrivateOrReservedIp("fc00::1")).toBe(true);
    expect(isPrivateOrReservedIp("fd12:3456:789a::1")).toBe(true);
    expect(isPrivateOrReservedIp("fe80::1")).toBe(true);
  });

  it("should reject non-http/https protocols", async () => {
    await expect(scrapeUrlSafely("file:///etc/passwd")).rejects.toThrow(
      "Only HTTP and HTTPS are permitted."
    );
    await expect(scrapeUrlSafely("ftp://example.com")).rejects.toThrow(
      "Only HTTP and HTTPS are permitted."
    );
  });
});
