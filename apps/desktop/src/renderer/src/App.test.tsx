import { describe, expect, it } from "vitest";
import { COMPONENT_CATEGORIES } from "@rc-workshop/core";

describe("desktop catalogue vocabulary", () => {
  it("exposes the simplified top-level inventory categories", () => {
    expect(COMPONENT_CATEGORIES).toEqual(["motor", "esc", "radio", "servo", "battery", "supplies", "tool", "other"]);
  });

  it("supports transmitter and receiver radio properties", () => {
    const receiver = { radioType: "receiver", receiverChannels: 8, receiverProtocol: "ExpressLRS" };
    const transmitter = { radioType: "transmitter", transmitterChannels: 16, transmitterProtocols: ["ELRS"], firmwareVersion: "EdgeTX" };
    expect(receiver.receiverChannels).toBe(8);
    expect(receiver.receiverProtocol).toBe("ExpressLRS");
    expect(transmitter.transmitterChannels).toBe(16);
    expect(transmitter.transmitterProtocols).toContain("ELRS");
    expect(transmitter.firmwareVersion).toBe("EdgeTX");
  });
});
