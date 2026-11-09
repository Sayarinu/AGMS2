import { describe, expect, it } from "vitest";
import { describeEvent, eventCatalog } from "../src/language/eventCatalog.js";

describe("eventCatalog", () => {
  it("numbers user events as Other 10-25", () => {
    const userEvents = eventCatalog.filter(entry => entry.label.startsWith("User Event"));
    expect(userEvents).toHaveLength(16);
    expect(userEvents.every((entry, index) => entry.eventType === 7 && entry.eventNum === 10 + index)).toBe(true);
  });

  it("does not offer Key Press or Key Release events without a key", () => {
    expect(eventCatalog.some(entry => entry.eventType === 9 || entry.eventType === 10)).toBe(false);
  });

  it("has no duplicate event entries", () => {
    const keys = eventCatalog.map(entry => `${entry.eventType}:${entry.eventNum}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("describeEvent", () => {
  it("labels known, collision and unknown events", () => {
    expect(describeEvent({ eventType: 8, eventNum: 64, collisionObject: null })).toBe("Draw GUI");
    expect(describeEvent({ eventType: 7, eventNum: 12, collisionObject: null })).toBe("User Event 2");
    expect(describeEvent({ eventType: 4, eventNum: 0, collisionObject: "obj_wall" })).toBe("Collision: obj_wall");
    expect(describeEvent({ eventType: 5, eventNum: 37, collisionObject: null })).toBe("Event 5_37");
  });
});
