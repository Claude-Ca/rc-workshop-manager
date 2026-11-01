import { describe, expect, it } from "vitest";
import { COMPONENT_CATEGORIES } from "@rc-workshop/core";

describe("desktop catalogue vocabulary", () => {
  it("exposes the initial RC inventory categories", () => {
    expect(COMPONENT_CATEGORIES).toContain("receiver");
    expect(COMPONENT_CATEGORIES).toContain("battery");
    expect(COMPONENT_CATEGORIES).toContain("material");
  });
});
