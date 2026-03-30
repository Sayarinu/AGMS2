# Control Flow and Loops

## Key concepts
GML supports the usual structured flow tools: `if`, ternary expressions, `switch`, `for`, `while`, `do ... until`, `repeat`, `with`, `break`, `continue`, `return`, `exit`, and `try` / `catch` / `throw`. Choose the smallest construct that makes intent obvious. `with (obj_enemy)` is a loop over every matching instance, not a shortcut to a single instance.

`exit` ends the current event or script immediately, while `return` ends a function and can provide a value. `repeat(n)` is compact for a counted loop with no index, and `switch` falls through unless you `break`.

## Syntax and usage
```gml
if (hp <= 0) {
    instance_destroy();
} else {
    image_blend = c_white;
}
```

```gml
var _sprite = is_hurt ? spr_player_hurt : spr_player_idle;
sprite_index = _sprite;
```

```gml
switch (state) {
case PlayerState.Idle:
    idle_update();
    break;
case PlayerState.Run:
    run_update();
    break;
default:
    state = PlayerState.Idle;
    break;
}
```

```gml
for (var i = 0; i < array_length(items); i++) {
    show_debug_message(items[i]);
}
```

```gml
repeat(3) {
    instance_create_depth(x, y, depth, obj_spark);
}
```

```gml
with (obj_enemy) {
    alert = true;
}
```

```gml
function safe_divide(a, b) {
    if (b == 0) {
        throw "Division by zero";
    }
    return a / b;
}
```

## Common patterns
Use early exits to flatten logic:

```gml
if (!instance_exists(target_ref)) {
    exit;
}

move_towards_point(target_ref.x, target_ref.y, move_speed);
```

Use `for` when you need an index and `repeat` when you do not:

```gml
for (var i = 0; i < 8; i++) {
    var _dir = i * 45;
    spawn_bullet(_dir);
}
```

Use `try` / `catch` for code that may throw during parsing or validation:

```gml
try {
    profile = json_parse(buffer_string);
} catch (_err) {
    show_debug_message("Failed to parse save");
}
```

## What to avoid
- Do not use `with` when you only want one instance unless you already filtered to an id.
- Do not forget `break` in `switch` unless you intentionally want fallthrough.
- Do not use `repeat(n)` when your logic depends on the current index.
- Do not confuse `exit` with `return`; `return` is for functions and can return a value.
- Do not rely on exceptions for normal gameplay branches; reserve `throw` / `catch` for truly exceptional cases.

## Built-ins used
`array_length`, `instance_exists`, `move_towards_point`, `json_parse`
