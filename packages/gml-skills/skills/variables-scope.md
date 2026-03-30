# Variables and Scope

## Key concepts
Use `var` for event-local temporaries, plain assignment for instance variables, and `global.` only for true cross-game state. Local `var` variables do not persist between events, so any event that needs a local must declare it again. Instance variables created in the Create event persist on that instance and are readable from its later events without re-declaring them.

`static` inside functions is useful for cached state that should persist across calls without becoming global. `globalvar` is deprecated and should never be used in new code; always use `global.variable_name` instead. If a script file is also acting as a function namespace, do not place top-level `var` declarations in it.

## Syntax and usage
```gml
// Local temporary inside Step
var _move = keyboard_check(vk_right) - keyboard_check(vk_left);
x += _move * walk_speed;
```

```gml
// Create Event instance variables
walk_speed = 4;
hp = 100;
target_ref = noone;
```

```gml
// Global state
if (!variable_global_exists("score")) {
    global.score = 0;
}
```

```gml
function next_id() {
    static counter = 0;
    counter += 1;
    return counter;
}
```

```gml
// Direct instance reference
if (instance_exists(target_ref)) {
    target_ref.hp -= 10;
}
```

```gml
// with scope
var _caller = id;
with (obj_enemy) {
    target_id = _caller;
}
```

## Common patterns
Guard against missing instance variables when interoperating with objects that initialize in different orders:

```gml
if (!variable_instance_exists(id, "facing")) {
    facing = 1;
}
```

Read another instance directly when you already hold its id:

```gml
if (instance_exists(player_ref) && player_ref.invulnerable == false) {
    player_ref.hp -= contact_damage;
}
```

Use `self` and `id` when passing references into helper functions:

```gml
apply_knockback(self, other.id, 6);
```

## What to avoid
- Never use `globalvar`; it is deprecated and makes ownership of state harder to follow.
- Do not expect `var` locals created in Create to exist in Step or Draw; re-declare locals per event.
- Do not store long-lived gameplay state in globals when instance, controller, or struct state would be clearer.
- Do not access another instance variable without checking `instance_exists` if the reference may be stale.
- Do not put top-level `var` in a script file that is also defining namespaced functions.

## Built-ins used
`self`, `other`, `id`, `global`, `instance_exists`, `variable_instance_exists`, `variable_global_exists`, `variable_instance_get`
