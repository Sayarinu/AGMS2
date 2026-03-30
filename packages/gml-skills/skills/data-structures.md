# Data Structures

## Key concepts
In modern GMS2, arrays and structs are usually the first choice because they are lightweight, expressive, and easier to reason about than legacy DS containers. Use arrays for ordered sequences, structs for named fields, and `ds_*` structures when you specifically need their APIs, mutability model, or specialized behavior such as priority ordering or 2D grids. Every `ds_*` structure must be destroyed manually or it will leak memory.

Arrays are value-typed in ordinary assignment, but when an array is stored inside a struct or passed to a function it behaves by reference. That means mutating the nested array can affect the original owner unless you clone it with `array_copy`. `ds_map_find_value` returns `undefined` for missing keys, so guard with `ds_map_exists` before assuming the value is present.

## Syntax and usage
```gml
var numbers = [10, 20, 30];
array_push(numbers, 40);
show_debug_message(array_length(numbers));
```

```gml
var grid = [
    [1, 2],
    [3, 4]
];
show_debug_message(grid[1][0]);
```

```gml
var player = {
    hp: 100,
    speed: 4,
    inventory: ["key", "potion"]
};
```

```gml
var stats = ds_map_create();
ds_map_add(stats, "coins", 12);

if (ds_map_exists(stats, "coins")) {
    show_debug_message(ds_map_find_value(stats, "coins"));
}

ds_map_destroy(stats);
```

```gml
function add_item(store, item) {
    array_push(store.items, item);
}

var store = { items: ["sword"] };
add_item(store, "shield");
// store.items is now ["sword", "shield"]
```

## Common patterns
Choose structures by access pattern:

```gml
// Array: ordered wave list
waves = [obj_slime, obj_bat, obj_knight];

// Struct: named state bundle
camera_state = {
    target: noone,
    shake: 0,
    zoom: 1
};

// ds_grid: tile-cost field
cost_grid = ds_grid_create(room_width div 16, room_height div 16);

// ds_priority: open set for pathfinding
open_set = ds_priority_create();
```

Clone nested arrays when you need isolation:

```gml
var source = { points: [1, 2, 3] };
var copy = { points: [] };
array_copy(copy.points, 0, source.points, 0, array_length(source.points));
```

## What to avoid
- Prefer arrays and structs over DS containers for ordinary gameplay state in GMS2 2022+ and later.
- Never forget to destroy `ds_map`, `ds_list`, `ds_grid`, `ds_priority`, `ds_stack`, and `ds_queue`.
- Do not assume `ds_map_find_value` distinguishes a missing key from a stored `undefined`; use `ds_map_exists`.
- Do not mutate an array nested in a struct unless shared reference behavior is intended.
- Do not use `ds_*` structures when a plain array or struct already solves the problem.

## Built-ins used
`array_length`, `array_push`, `array_copy`, `ds_map_create`, `ds_map_add`, `ds_map_find_value`, `ds_map_exists`, `ds_map_destroy`, `ds_list_create`, `ds_list_add`, `ds_list_destroy`, `ds_grid_create`, `ds_grid_destroy`, `ds_priority_create`, `ds_priority_destroy`, `ds_stack_create`, `ds_stack_destroy`, `ds_queue_create`, `ds_queue_destroy`, `undefined`
