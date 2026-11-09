/**
 * GameMaker names each object event's code file after the event type, e.g. `Create_0.gml`,
 * `Alarm_3.gml`, `Draw_64.gml`, `Other_10.gml` (User Event 0) or `Collision_obj_wall.gml`.
 */
const eventTypeNames = new Map<number, string>([
  [0, "Create"],
  [1, "Destroy"],
  [2, "Alarm"],
  [3, "Step"],
  [4, "Collision"],
  [5, "Keyboard"],
  [6, "Mouse"],
  [7, "Other"],
  [8, "Draw"],
  [9, "KeyPress"],
  [10, "KeyRelease"],
  [11, "Trigger"],
  [12, "CleanUp"],
  [13, "Gesture"],
  [14, "PreCreate"]
]);

export const COLLISION_EVENT = 4;

export function eventFileName(eventType: number, eventNum: number, collisionObject: string | null): string {
  const typeName = eventTypeNames.get(eventType);
  if (!typeName) {
    throw new Error(`Unknown event type ${eventType}.`);
  }
  if (eventType === COLLISION_EVENT) {
    if (!collisionObject) {
      throw new Error("Collision events need a collision object.");
    }
    return `${typeName}_${collisionObject}.gml`;
  }
  return `${typeName}_${eventNum}.gml`;
}

/** File name used by AGMS2 0.1.0, which wrote events as `<type>_<num>.gml`. */
export function legacyEventFileName(eventType: number, eventNum: number): string {
  return `${eventType}_${eventNum}.gml`;
}

export function eventLabel(eventType: number, eventNum: number, collisionObject: string | null): string {
  return eventType === COLLISION_EVENT && collisionObject ? `Collision_${collisionObject}` : `${eventTypeNames.get(eventType) ?? eventType}_${eventNum}`;
}
