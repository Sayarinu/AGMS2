# Collision Detection

## Key concepts
Collision helpers answer slightly different questions, so pick the one that matches the job. `place_meeting(x, y, obj)` asks whether a collision would happen at a target position and is ideal for predictive movement. `instance_place` and `instance_position` return an instance id or `noone`, which is useful when you need to inspect the hit object.

Collision events only fire for object pairs configured to collide in the IDE. Precise collision checks are more expensive than bounding-box style checks, so use precise masks only where that extra accuracy materially matters.

## Syntax and usage
```gml
if (!place_meeting(x + hsp, y, obj_wall)) {
    x += hsp;
}
```

```gml
var hit = instance_place(x, y + 1, obj_solid);
if (hit != noone) {
    y = hit.bbox_top - sprite_height;
}
```

```gml
if (position_meeting(mouse_x, mouse_y, obj_button)) {
    hover = true;
}
```

```gml
var target = collision_circle(x, y, 64, obj_enemy, false, true);
if (target != noone) {
    target.alert = true;
}
```

## Common patterns
Predict and resolve movement per axis:

```gml
if (!place_meeting(x + hsp, y, obj_wall)) {
    x += hsp;
} else {
    while (!place_meeting(x + sign(hsp), y, obj_wall)) {
        x += sign(hsp);
    }
    hsp = 0;
}
```

Check instance-returning functions safely:

```gml
var _pickup = instance_position(x, y, obj_pickup);
if (_pickup != noone) {
    collect_item(_pickup);
}
```

## What to avoid
- Do not use `instance_place` without checking against `noone`.
- Do not use collision events as your only collision system if you need predictive movement logic.
- Do not enable precise collision masks on every object by default.
- Do not assume collision events fire automatically for any object pair; the object relationship must exist in the IDE.
- Do not use room coordinates from the previous frame when you really need a future-position query.

## Built-ins used
`place_meeting`, `position_meeting`, `instance_place`, `instance_position`, `collision_rectangle`, `collision_circle`, `collision_line`, `collision_point`, `noone`, `sign`
