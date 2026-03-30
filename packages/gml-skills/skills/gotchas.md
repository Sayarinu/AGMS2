# Gotchas and Things to Avoid

## Key concepts
Many GML bugs come from engine-specific semantics that look ordinary at first glance: truthiness, `with` scope, alarm timing, array ownership, and persistent draw state. These bugs are often silent, so agents should write explicit, defensive code instead of relying on assumptions from other languages.

When in doubt, prefer named constants, explicit conversions, `instance_exists` guards, and cleanup code that makes lifetime obvious. The examples below focus on mistakes that compile but behave differently than many developers expect.

## Syntax and usage
```gml
// Real division vs integer division
show_debug_message(10 / 3);   // 3.333...
show_debug_message(10 div 3); // 3
```

```gml
// Truthiness
if (0.5) {
    show_debug_message("This runs");
}
```

```gml
// String conversion
var coins = 12;
draw_text(16, 16, "Coins: " + string(coins));
```

```gml
// with scope
var _caller = id;
with (obj_enemy) {
    target_ref = _caller;
}
```

```gml
// noone checks
var hit = instance_place(x, y, obj_enemy);
if (hit != noone && instance_exists(hit)) {
    hit.hp -= 10;
}
```

```gml
// Alarm timing
alarm[0] = 1; // fires on the next step, not immediately
```

## Common patterns
Copy arrays intentionally when isolation matters:

```gml
var src = [1, 2, 3];
var dst = [];
array_copy(dst, 0, src, 0, array_length(src));
```

Destroy DS containers in Cleanup:

```gml
// Create Event
loot_table = ds_list_create();

// Cleanup Event
if (loot_table != undefined) {
    ds_list_destroy(loot_table);
}
```

Respect draw order and coordinate direction:

```gml
// Lower depth is in front
depth = -100;

// Positive y moves downward
y += 4;
```

## What to avoid
- `10 / 3` is real division; use `div` for integer division.
- Booleans are numeric: `true == 1`, `false == 0`, and any non-zero value is truthy.
- Convert numbers with `string()` before concatenating into UI text.
- Inside `with`, `self` becomes the iterated instance; save the caller id first if needed.
- Never compare `noone` to `false` or `0`; use `!= noone` or `instance_exists`.
- Arrays can behave like shared references in structs/functions; use `array_copy` when you need separation.
- Forgetting to destroy `ds_*` structures is the most common GMS2 memory leak.
- Higher depth draws first and ends up behind lower depth.
- `alarm[n] = 1` schedules for the next step, not the current one.
- Never use `globalvar`; use `global.variable_name`.
- Room origin is top-left and positive `y` moves downward.
- `image_index` wraps automatically with `image_speed`; do not reset it every step unless you want manual control.

## Built-ins used
`string`, `self`, `id`, `instance_place`, `instance_exists`, `noone`, `array_copy`, `array_length`, `ds_list_create`, `ds_list_destroy`, `depth`, `y`, `image_index`, `image_speed`, `global`
