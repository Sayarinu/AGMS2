# Common Patterns and Idioms

## Key concepts
Idiomatic GML tends to favor small controller objects, enum-backed state, instance-local variables set in Create, and modern arrays/structs for data ownership. These patterns are optimized for readability in an event-driven engine: the goal is to keep Step code predictable, cross-instance references safe, and cleanup responsibilities explicit.

Prefer patterns that work with GameMaker's runtime model instead of fighting it. That usually means using events, alarms, controller objects, and structs together rather than inventing heavy abstraction layers.

## Syntax and usage
```gml
enum PlayerState {
    Idle,
    Run,
    Attack
}
```

```gml
function tween_damp(current, target, smoothing) {
    return current + (target - current) * smoothing;
}
```

## Common patterns
State machine using an enum and `switch` in Step:

```gml
// Create Event
enum EnemyState {
    Idle,
    Chase,
    Attack
}

state = EnemyState.Idle;
target_ref = noone;
move_speed = 2;
```

```gml
// Step Event
switch (state) {
case EnemyState.Idle:
    if (instance_exists(obj_player)) {
        target_ref = obj_player;
        state = EnemyState.Chase;
    }
    break;
case EnemyState.Chase:
    if (!instance_exists(target_ref)) {
        state = EnemyState.Idle;
        break;
    }
    move_towards_point(target_ref.x, target_ref.y, move_speed);
    if (point_distance(x, y, target_ref.x, target_ref.y) < 24) {
        state = EnemyState.Attack;
    }
    break;
case EnemyState.Attack:
    speed = 0;
    alarm[0] = 10;
    state = EnemyState.Chase;
    break;
}
```

Object pooling by deactivating and reusing instances:

```gml
// obj_bullet Create Event
active = false;
speed = 0;
visible = false;
```

```gml
function bullet_spawn(_x, _y, _dir, _speed) {
    var _bullet = noone;

    with (obj_bullet) {
        if (!active) {
            _bullet = id;
            break;
        }
    }

    if (_bullet == noone) {
        _bullet = instance_create_depth(_x, _y, 0, obj_bullet);
    }

    _bullet.x = _x;
    _bullet.y = _y;
    _bullet.direction = _dir;
    _bullet.speed = _speed;
    _bullet.active = true;
    _bullet.visible = true;
    return _bullet;
}
```

Event bus via a controller object and `with` broadcast:

```gml
// obj_event_bus: User Event 0
event_name = argument0;
event_data = argument1;

with (obj_listener_parent) {
    on_bus_event(other.event_name, other.event_data);
}
```

```gml
function bus_emit(_name, _data) {
    with (obj_event_bus) {
        event_name = _name;
        event_data = _data;
        event_user(0);
    }
}
```

Component pattern using structs on instances:

```gml
// Create Event
movement = {
    speed: 3,
    accel: 0.2,
    velocity: [0, 0]
};
```

```gml
// Step Event
movement.velocity[0] = lerp(movement.velocity[0], input_x * movement.speed, movement.accel);
movement.velocity[1] = lerp(movement.velocity[1], input_y * movement.speed, movement.accel);
x += movement.velocity[0];
y += movement.velocity[1];
```

Singleton controller with an `instance_number` guard:

```gml
// Create Event
if (instance_number(object_index) > 1) {
    instance_destroy();
    exit;
}

persistent = true;
global.game_controller = id;
```

Initialization guard before reading expected variables:

```gml
if (!variable_instance_exists(id, "inventory")) {
    inventory = [];
}
```

Safe instance reference storage and validation:

```gml
// Store
target_ref = other.id;

// Use later
if (instance_exists(target_ref)) {
    move_towards_point(target_ref.x, target_ref.y, 2);
}
```

Coroutine-style sequencing with alarms:

```gml
// Create Event
phase = 0;
alarm[0] = room_speed;
```

```gml
// Alarm 0 Event
switch (phase) {
case 0:
    show_debug_message("Wind-up");
    phase = 1;
    alarm[0] = 15;
    break;
case 1:
    instance_create_depth(x + 32, y, 0, obj_explosion);
    phase = 2;
    alarm[0] = room_speed;
    break;
case 2:
    instance_destroy();
    break;
}
```

Tween helper using `lerp` and a damp-style helper:

```gml
function damp(_current, _target, _smoothing) {
    return _current + (_target - _current) * _smoothing;
}

// Step Event
x = damp(x, target_x, 0.12);
y = lerp(y, target_y, 0.12);
```

Camera setup and target follow:

```gml
// Create Event
cam = camera_create_view(0, 0, 640, 360, 0, obj_player, -1, -1, 320, 180);
view_enabled = true;
view_visible[0] = true;
view_set_camera(0, cam);
target_ref = obj_player;
```

```gml
// End Step Event
if (instance_exists(target_ref)) {
    var _cam_x = target_ref.x - camera_get_view_width(cam) * 0.5;
    var _cam_y = target_ref.y - camera_get_view_height(cam) * 0.5;
    camera_set_view_pos(cam, _cam_x, _cam_y);
}
```

## What to avoid
- Do not replace every problem with a giant controller; patterns should reduce complexity, not centralize everything.
- Do not store unsafe instance ids without checking `instance_exists` before later use.
- Do not create and destroy bullets or particles every frame when pooling would work better.
- Do not let alarms become hidden state machines without clear phase names or comments when the flow is non-obvious.
- Do not use globals for ownership when a singleton controller or component struct is enough.

## Built-ins used
`instance_exists`, `instance_create_depth`, `instance_number`, `instance_destroy`, `event_user`, `variable_instance_exists`, `lerp`, `point_distance`, `move_towards_point`, `show_debug_message`, `alarm`, `camera_create_view`, `view_set_camera`, `camera_get_view_width`, `camera_get_view_height`, `camera_set_view_pos`, `object_index`, `persistent`, `global`, `noone`, `id`, `other`
