import type { GmsResourceRef } from "./types.js";

/** Builders for the `.yy` documents AGMS2 creates, in GameMaker 2.3+ format. */

export function eventYy(eventType: number, eventNum: number, collisionObject: GmsResourceRef | null): Record<string, unknown> {
  return {
    resourceType: "GMEvent",
    resourceVersion: "1.0",
    name: "",
    isDnD: false,
    eventType,
    eventNum,
    collisionObjectId: collisionObject
  };
}

export function objectYy(input: {
  name: string;
  parentFolder: GmsResourceRef;
  sprite: GmsResourceRef | null;
  parent: GmsResourceRef | null;
  events: Array<Record<string, unknown>>;
}): Record<string, unknown> {
  return {
    resourceType: "GMObject",
    resourceVersion: "1.0",
    name: input.name,
    parent: input.parentFolder,
    spriteId: input.sprite,
    solid: false,
    visible: true,
    managed: true,
    spriteMaskId: null,
    persistent: false,
    parentObjectId: input.parent,
    physicsObject: false,
    eventList: input.events,
    properties: [],
    overriddenProperties: []
  };
}

export function scriptYy(name: string, parentFolder: GmsResourceRef): Record<string, unknown> {
  return {
    resourceType: "GMScript",
    resourceVersion: "1.0",
    name,
    parent: parentFolder,
    isCompatibility: false,
    isDnD: false
  };
}

export function spriteYy(name: string, parentFolder: GmsResourceRef): Record<string, unknown> {
  return {
    resourceType: "GMSprite",
    resourceVersion: "1.0",
    name,
    parent: parentFolder,
    width: 0,
    height: 0,
    bboxMode: 0,
    collisionKind: 1,
    frames: []
  };
}

export function roomYy(input: {
  name: string;
  parentFolder: GmsResourceRef;
  width: number;
  height: number;
  persistent: boolean;
}): Record<string, unknown> {
  return {
    resourceType: "GMRoom",
    resourceVersion: "1.0",
    name: input.name,
    parent: input.parentFolder,
    creationCodeFile: "",
    inheritCode: false,
    inheritCreationOrder: false,
    inheritLayers: false,
    instanceCreationOrder: [],
    isDnd: false,
    layers: [
      {
        resourceType: "GMRInstanceLayer",
        resourceVersion: "1.0",
        name: "Instances",
        depth: 0,
        effectEnabled: true,
        effectType: null,
        gridX: 32,
        gridY: 32,
        hierarchyFrozen: false,
        inheritLayerDepth: false,
        inheritLayerSettings: false,
        inheritSubLayers: true,
        inheritVisibility: true,
        instances: [],
        layers: [],
        properties: [],
        userdefinedDepth: false,
        visible: true
      }
    ],
    parentRoom: null,
    physicsSettings: {
      inheritPhysicsSettings: false,
      PhysicsWorld: false,
      PhysicsWorldGravityX: 0,
      PhysicsWorldGravityY: 10,
      PhysicsWorldPixToMetres: 0.1
    },
    roomSettings: {
      Width: input.width,
      Height: input.height,
      inheritRoomSettings: false,
      persistent: input.persistent
    },
    sequenceId: null,
    views: [],
    viewSettings: {
      clearDisplayBuffer: true,
      clearViewBackground: false,
      enableViews: false,
      inheritViewSettings: false
    },
    volume: 1
  };
}

export function roomInstanceYy(name: string, object: GmsResourceRef, x: number, y: number): Record<string, unknown> {
  return {
    resourceType: "GMRInstance",
    resourceVersion: "1.0",
    name,
    objectId: object,
    x,
    y,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    imageIndex: 0,
    imageSpeed: 1,
    colour: 4294967295,
    hasCreationCode: false,
    inheritCode: false,
    inheritedItemId: null,
    inheritItemSettings: false,
    isDnd: false,
    frozen: false,
    ignore: false,
    properties: []
  };
}
