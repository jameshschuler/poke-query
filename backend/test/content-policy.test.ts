import { describe, expect, it } from "vitest";

import { findBlockedTerm } from "../src/lib/content-policy.js";

describe("content policy", () => {
  it("flags normal profane tokens", () => {
    expect(findBlockedTerm("bitch")).toBeTruthy();
    expect(findBlockedTerm("test bitch")).toBeTruthy();
  });

  it("flags profanity embedded inside larger strings", () => {
    expect(findBlockedTerm("testbitch")).toBe("bitch");
    expect(findBlockedTerm("123fuck456")).toBe("fuck");
  });

  it("allows clean strings", () => {
    expect(findBlockedTerm("great league attackers")).toBeNull();
  });
});
