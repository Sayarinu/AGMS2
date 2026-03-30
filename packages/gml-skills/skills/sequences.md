# Sequences and Animation

## Key concepts
Sequences are timeline-style assets that can be created on layers, queried at runtime, and used to drive animation or broadcast messages. Use them when you need authored multi-track timing rather than simple sprite animation. Runtime interaction often centers on `layer_sequence_create`, `sequence_get`, and message handling.

Treat sequence instances as runtime objects with their own ids and playback state. Keep authored cinematic behavior separate from gameplay state where possible.

## Syntax and usage
```gml
var seq_inst = layer_sequence_create("Cutscene", x, y, seq_intro);
```

```gml
var seq_asset = sequence_get(seq_intro);
show_debug_message(seq_asset);
```

```gml
// Sequence event / broadcast receiver
if (message == "boss_spawn") {
    instance_create_depth(320, 180, 0, obj_boss);
}
```

## Common patterns
Spawn a sequence on a dedicated layer:

```gml
if (layer_exists("Cinematics")) {
    layer_sequence_create("Cinematics", 0, 0, seq_intro);
}
```

Use broadcast messages to bridge authored timing into gameplay code:

```gml
switch (message) {
case "flash":
    screen_flash = 1;
    break;
case "spawn_reward":
    instance_create_depth(x, y, 0, obj_reward);
    break;
}
```

## What to avoid
- Do not use sequences as a replacement for all gameplay logic.
- Do not assume a sequence asset and a spawned sequence instance are the same thing.
- Do not hardcode layer names without ensuring the room contains them.
- Do not bury critical gameplay rules exclusively inside timeline-authored messages without a clear owner.

## Built-ins used
`layer_sequence_create`, `sequence_get`, `layer_exists`, `instance_create_depth`, `show_debug_message`
