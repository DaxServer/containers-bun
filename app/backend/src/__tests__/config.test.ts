import { describe, expect, it } from "bun:test";
import { config } from "@/config";

describe("config", () => {
  it("default port is 8000", () => {
    expect(config.port).toBe(8000);
  });

  it("redisUrl without password is redis://localhost:6379", () => {
    expect(config.redisUrl).toBe("redis://localhost:6379");
  });

  it("userAgent contains Curator", () => {
    expect(config.userAgent).toContain("Curator");
  });

  it("wikimediaUrls.baseUrl is https://commons.wikimedia.org/w/api.php", () => {
    expect(config.wikimediaUrls.baseUrl).toBe(
      "https://commons.wikimedia.org/w/api.php",
    );
  });
});
