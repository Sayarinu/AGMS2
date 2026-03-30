# File I/O and Persistence

## Key concepts
Use text file handles carefully and always close them. Unclosed handles can corrupt saves or leave partial writes behind. For structured save data, prefer `json_stringify` and `json_parse` over older DS-based JSON helpers.

Use `game_save_id` to build save paths instead of relying on `working_directory`, because `working_directory` may be read-only or unsuitable on some targets. File paths are platform-specific, so never hardcode Windows-style backslashes into portable game code.

## Syntax and usage
```gml
var save_data = {
    coins: global.coins,
    level: current_level
};

var path = game_save_id + "/save.json";
var file = file_text_open_write(path);
file_text_write_string(file, json_stringify(save_data));
file_text_close(file);
```

```gml
var path = game_save_id + "/save.json";
if (file_exists(path)) {
    var file = file_text_open_read(path);
    var text = file_text_read_string(file);
    file_text_close(file);
    var save_data = json_parse(text);
}
```

```gml
ini_open(game_save_id + "/settings.ini");
ini_write_real("audio", "music_volume", 0.8);
ini_close();
```

## Common patterns
Wrap handle management tightly:

```gml
var file = file_text_open_append(game_save_id + "/log.txt");
file_text_write_string(file, "Run complete");
file_text_writeln(file);
file_text_close(file);
```

Normalize save data through structs:

```gml
function build_save_blob() {
    return {
        hp: hp,
        position: [x, y],
        inventory: inventory
    };
}
```

## What to avoid
- Never leave file handles open after reading or writing.
- Do not use `working_directory` as the default save location.
- Do not use legacy DS-map JSON helpers when `json_parse` and `json_stringify` already fit the job.
- Do not hardcode path separators.
- Do not assume every platform allows arbitrary file writes outside the save location.

## Built-ins used
`file_text_open_read`, `file_text_open_write`, `file_text_open_append`, `file_text_read_string`, `file_text_read_real`, `file_text_write_string`, `file_text_writeln`, `file_text_close`, `json_stringify`, `json_parse`, `ini_open`, `ini_close`, `ini_write_real`, `game_save_id`, `working_directory`, `file_exists`
