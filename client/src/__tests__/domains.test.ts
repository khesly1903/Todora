import { describe, expect, it } from "vitest";
import { getAppUrl, getLandingUrl, isAppDomain, isLocalhost, isProdLandingDomain } from "../domains";

describe("domain detection and formatting", () => {
  it("detects app domains", () => {
    expect(isAppDomain("app.todora.xyz")).toBe(true);
    expect(isAppDomain("app.localhost")).toBe(true);
    expect(isAppDomain("todora.xyz")).toBe(false);
    expect(isAppDomain("localhost")).toBe(false);
  });

  it("detects production landing domains", () => {
    expect(isProdLandingDomain("todora.xyz")).toBe(true);
    expect(isProdLandingDomain("www.todora.xyz")).toBe(true);
    expect(isProdLandingDomain("app.todora.xyz")).toBe(false);
    expect(isProdLandingDomain("localhost")).toBe(false);
  });

  it("detects localhost", () => {
    expect(isLocalhost("localhost")).toBe(true);
    expect(isLocalhost("app.localhost")).toBe(true);
    expect(isLocalhost("127.0.0.1")).toBe(true);
    expect(isLocalhost("todora.xyz")).toBe(false);
  });

  it("formats URLs correctly for default paths", () => {
    expect(getAppUrl("/login")).toContain("/login");
    expect(getLandingUrl("/")).toContain("/");
  });
});
