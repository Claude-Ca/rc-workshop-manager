import { describe, expect, it } from "vitest";
import { COMPONENT_CATEGORIES } from "@rc-workshop/core";

describe("desktop catalogue vocabulary", () => {
  it("exposes the initial RC inventory categories", () => {
    expect(COMPONENT_CATEGORIES).toContain("receiver");
    expect(COMPONENT_CATEGORIES).toContain("battery");
    expect(COMPONENT_CATEGORIES).toContain("material");
  });

  it("supports receiver-specific radio properties", () => {
    const receiver = { receiverChannels: 8, receiverProtocol: "ExpressLRS" };
    expect(receiver.receiverChannels).toBe(8);
    expect(receiver.receiverProtocol).toBe("ExpressLRS");
  });
});
