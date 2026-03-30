import type { AssetEventIndexEntry } from "../types.js";

export interface EventCatalogEntry {
  label: string;
  detail: string;
  eventType: number;
  eventNum: number;
  requiresCollisionObject?: boolean;
}

const baseEvents: EventCatalogEntry[] = [
  { label: "Create", detail: "Create event", eventType: 0, eventNum: 0 },
  { label: "Destroy", detail: "Destroy event", eventType: 1, eventNum: 0 },
  { label: "Alarm 0", detail: "Alarm 0", eventType: 2, eventNum: 0 },
  { label: "Alarm 1", detail: "Alarm 1", eventType: 2, eventNum: 1 },
  { label: "Alarm 2", detail: "Alarm 2", eventType: 2, eventNum: 2 },
  { label: "Alarm 3", detail: "Alarm 3", eventType: 2, eventNum: 3 },
  { label: "Alarm 4", detail: "Alarm 4", eventType: 2, eventNum: 4 },
  { label: "Alarm 5", detail: "Alarm 5", eventType: 2, eventNum: 5 },
  { label: "Alarm 6", detail: "Alarm 6", eventType: 2, eventNum: 6 },
  { label: "Alarm 7", detail: "Alarm 7", eventType: 2, eventNum: 7 },
  { label: "Alarm 8", detail: "Alarm 8", eventType: 2, eventNum: 8 },
  { label: "Alarm 9", detail: "Alarm 9", eventType: 2, eventNum: 9 },
  { label: "Alarm 10", detail: "Alarm 10", eventType: 2, eventNum: 10 },
  { label: "Alarm 11", detail: "Alarm 11", eventType: 2, eventNum: 11 },
  { label: "Step", detail: "Step event", eventType: 3, eventNum: 0 },
  { label: "Begin Step", detail: "Begin Step event", eventType: 3, eventNum: 1 },
  { label: "End Step", detail: "End Step event", eventType: 3, eventNum: 2 },
  { label: "Collision", detail: "Collision with object", eventType: 4, eventNum: 0, requiresCollisionObject: true },
  { label: "Keyboard", detail: "Keyboard event", eventType: 5, eventNum: 0 },
  { label: "Mouse", detail: "Mouse event", eventType: 6, eventNum: 0 },
  { label: "Other: Outside Room", detail: "Outside Room", eventType: 7, eventNum: 0 },
  { label: "Other: Boundary", detail: "Boundary", eventType: 7, eventNum: 1 },
  { label: "Other: Room Start", detail: "Room Start", eventType: 7, eventNum: 4 },
  { label: "Other: Room End", detail: "Room End", eventType: 7, eventNum: 5 },
  { label: "Other: Game Start", detail: "Game Start", eventType: 7, eventNum: 2 },
  { label: "Other: Game End", detail: "Game End", eventType: 7, eventNum: 3 },
  { label: "Other: Animation End", detail: "Animation End", eventType: 7, eventNum: 7 },
  { label: "Other: End of Path", detail: "End of Path", eventType: 7, eventNum: 8 },
  { label: "Draw", detail: "Draw event", eventType: 8, eventNum: 0 },
  { label: "Draw GUI", detail: "Draw GUI event", eventType: 8, eventNum: 64 },
  { label: "Asynchronous", detail: "Async event", eventType: 9, eventNum: 0 },
  { label: "User Event 0", detail: "User Event 0", eventType: 10, eventNum: 0 },
  { label: "User Event 1", detail: "User Event 1", eventType: 10, eventNum: 1 },
  { label: "User Event 2", detail: "User Event 2", eventType: 10, eventNum: 2 },
  { label: "User Event 3", detail: "User Event 3", eventType: 10, eventNum: 3 },
  { label: "User Event 4", detail: "User Event 4", eventType: 10, eventNum: 4 },
  { label: "User Event 5", detail: "User Event 5", eventType: 10, eventNum: 5 },
  { label: "User Event 6", detail: "User Event 6", eventType: 10, eventNum: 6 },
  { label: "User Event 7", detail: "User Event 7", eventType: 10, eventNum: 7 },
  { label: "User Event 8", detail: "User Event 8", eventType: 10, eventNum: 8 },
  { label: "User Event 9", detail: "User Event 9", eventType: 10, eventNum: 9 },
  { label: "User Event 10", detail: "User Event 10", eventType: 10, eventNum: 10 },
  { label: "User Event 11", detail: "User Event 11", eventType: 10, eventNum: 11 },
  { label: "User Event 12", detail: "User Event 12", eventType: 10, eventNum: 12 },
  { label: "User Event 13", detail: "User Event 13", eventType: 10, eventNum: 13 },
  { label: "User Event 14", detail: "User Event 14", eventType: 10, eventNum: 14 },
  { label: "User Event 15", detail: "User Event 15", eventType: 10, eventNum: 15 },
  { label: "Clean Up", detail: "Clean Up event", eventType: 12, eventNum: 0 }
];

export const eventCatalog = baseEvents;

export function describeEvent(event: Pick<AssetEventIndexEntry, "eventType" | "eventNum" | "collisionObject">): string {
  if (event.eventType === 4) {
    return event.collisionObject ? `Collision: ${event.collisionObject}` : "Collision";
  }
  const match = eventCatalog.find(entry => entry.eventType === event.eventType && entry.eventNum === event.eventNum);
  return match?.label ?? `Event ${event.eventType}_${event.eventNum}`;
}
