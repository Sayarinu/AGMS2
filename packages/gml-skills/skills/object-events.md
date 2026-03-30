# Object Events

## Key concepts
GML code is event-driven, so correctness depends on putting logic in the right event and understanding when it runs. The Create event runs before the first frame update for a new instance, Step is split into Begin Step, Step, and End Step within the same frame, and drawing happens afterward. If you override Draw, GameMaker stops drawing the sprite automatically, so you must call `draw_self()` yourself when you still want the assigned sprite rendered.

Common event type constants used with `event_perform` and related APIs include `ev_create`, `ev_destroy`, `ev_cleanup`, `ev_alarm`, `ev_step`, `ev_collision`, `ev_draw`, and `ev_async`. For event numbers, the default sub-event is `0`, alarm slots are `0..11`, and Step sub-events map to Begin Step, Step, and End Step through `ev_step_begin`, `ev_step_normal`, and `ev_step_end`. Prefer named constants over raw numeric codes even though `event_number` exposes the underlying numeric sub-event value at runtime.

## Syntax and usage
```gml
// Create Event
hp = 100;
speed_walk = 4;
target_id = noone;
alarm[0] = room_speed;
```

```gml
// Begin Step Event
input_x = keyboard_check(vk_right) - keyboard_check(vk_left);
input_y = keyboard_check(vk_down) - keyboard_check(vk_up);
```

```gml
// Step Event
x += input_x * speed_walk;
y += input_y * speed_walk;
```

```gml
// End Step Event
image_angle = point_direction(xprevious, yprevious, x, y);
```

```gml
// Draw Event
draw_self();
draw_text(x, y - 24, string(hp));
```

```gml
// Collision Event with obj_enemy
if (other.team != team) {
    hp -= other.contact_damage;
}
```

```gml
// Parent object Step Event
event_inherited();
state_update();
```

```gml
// Trigger another event manually
event_perform(ev_step, ev_step_begin);
```

## Common patterns
Use Create for one-time instance setup and alarms for deferred actions:

```gml
// Create Event
fuse_time = room_speed * 2;
alarm[0] = fuse_time;
```

```gml
// Alarm 0 Event
instance_destroy();
```

Use Cleanup for final teardown of references and DS structures, because `instance_destroy()` marks the instance for destruction but Cleanup is where guaranteed final release should happen:

```gml
// Cleanup Event
if (path_points != undefined) {
    ds_list_destroy(path_points);
}
```

Route async work through the relevant async event instead of Step polling:

```gml
// Async - HTTP Event
if (async_load[? "id"] == request_id) {
    response_json = async_load[? "result"];
}
```

## What to avoid
- Do not assume Draw happens automatically after overriding the Draw event; call `draw_self()` if you still want the sprite.
- Do not treat `other` as a global instance reference. In collision events it means the colliding instance; in some other event contexts it can mean something else.
- Do not free DS structures in arbitrary Step code when the instance may still need them later in the frame. Cleanup is the safe teardown point.
- Do not use `event_perform` expecting engine side effects. It only runs the target event code and does not simulate real input, alarms, or collisions.
- Do not forget that Create runs before the first Step, so variables initialized there are available by the time Step begins.

## Built-ins used
`event_perform`, `event_inherited`, `event_type`, `event_number`, `ev_create`, `ev_destroy`, `ev_cleanup`, `ev_alarm`, `ev_step`, `ev_step_begin`, `ev_step_normal`, `ev_step_end`, `ev_collision`, `ev_draw`, `ev_async`, `other`, `alarm`, `draw_self`, `draw_text`, `instance_destroy`, `keyboard_check`, `vk_right`, `vk_left`, `vk_down`, `vk_up`
