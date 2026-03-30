# Room and Instance Management

## Key concepts
Room and instance APIs control scene flow, dynamic spawning, and cross-room persistence. `instance_create_layer` needs a valid existing layer name or layer id, while `instance_create_depth` is often easier for purely dynamic spawning because it does not depend on a named room layer. Persistent instances survive room changes and do not re-run Create when they enter the next room.

`instance_destroy()` destroys `self` when called with no argument, and can also target another instance when called with an id. `with (noone)` is a safe no-op, which makes some broadcast code simpler.

## Syntax and usage
```gml
room_goto(rm_gameplay);
```

```gml
var enemy = instance_create_depth(x, y, depth, obj_enemy);
enemy.hp = 25;
```

```gml
var fx = instance_create_layer(x, y, "FX", obj_spark);
```

```gml
if (instance_exists(boss_ref)) {
    instance_destroy(boss_ref);
}
```

```gml
with (obj_enemy) {
    alerted = true;
}
```

## Common patterns
Guard a singleton controller in Create:

```gml
if (instance_number(object_index) > 1) {
    instance_destroy();
    exit;
}

persistent = true;
```

Spawn onto a named layer only when you know it exists:

```gml
var _fx_layer = layer_get_id("FX");
if (_fx_layer != -1) {
    layer_add_instance(_fx_layer, instance_create_depth(x, y, depth, obj_spark));
}
```

Inspect room metadata with `room_get_info` for tools or setup code:

```gml
var info = room_get_info(room);
show_debug_message(info.width);
```

## What to avoid
- Do not call `instance_create_layer` with a layer name that is missing from the room.
- Do not expect a persistent instance to run Create again after a room change.
- Do not destroy another instance by raw id unless you are sure the reference is still valid.
- Do not overuse room transitions for UI flow that can stay in one room with layers or controllers.
- Do not be afraid of `with (noone)`; it safely does nothing.

## Built-ins used
`room_goto`, `room_goto_next`, `room_goto_previous`, `room_restart`, `room_get_info`, `instance_create_layer`, `instance_create_depth`, `instance_destroy`, `instance_exists`, `instance_number`, `instance_find`, `layer_get_id`, `layer_add_instance`, `persistent`, `room`, `object_index`
