# Input Handling

## Key concepts
Use `_check` for held input, `_check_pressed` for the first frame, and `_check_released` for the release frame. This distinction matters for responsive movement versus one-shot actions such as jumping or menu confirm. Use `vk_*` constants for special keys and `ord()` for letters and digits.

Gamepad devices are indexed from slot `0`, not `1`. Mouse, touch, gamepad, and virtual key APIs each have their own polling style, so keep input collection centralized and normalize into gameplay-friendly variables where possible.

## Syntax and usage
```gml
var move_x = keyboard_check(vk_right) - keyboard_check(vk_left);

if (keyboard_check_pressed(vk_space)) {
    jump();
}
```

```gml
if (keyboard_check(ord("E"))) {
    interact();
}
```

```gml
if (mouse_check_button_pressed(mb_left)) {
    fire();
}
```

```gml
var pad = 0;
if (gamepad_is_connected(pad)) {
    aim_x = gamepad_axis_value(pad, gp_axislh);
    aim_y = gamepad_axis_value(pad, gp_axislv);
}
```

```gml
if (device_mouse_check_button(0, mb_left)) {
    tap_active = true;
}
```

## Common patterns
Collect all raw input in Begin Step and consume it in Step:

```gml
move_x = keyboard_check(vk_right) - keyboard_check(vk_left);
move_y = keyboard_check(vk_down) - keyboard_check(vk_up);
jump_pressed = keyboard_check_pressed(vk_space);
```

Fallback from gamepad to keyboard:

```gml
var _pad_x = 0;
if (gamepad_is_connected(0)) {
    _pad_x = gamepad_axis_value(0, gp_axislh);
}

move_x = abs(_pad_x) > 0.2 ? _pad_x : keyboard_check(vk_right) - keyboard_check(vk_left);
```

## What to avoid
- Do not use `_check_pressed` for movement that must stay active while the key is held.
- Do not hardcode numeric key codes for special keys; use `vk_*`.
- Do not assume gamepad slots start at `1`.
- Do not scatter input polling across unrelated objects unless there is a clear ownership model.
- Do not forget deadzone handling when reading analog axes.

## Built-ins used
`keyboard_check`, `keyboard_check_pressed`, `keyboard_check_released`, `mouse_check_button`, `mouse_check_button_pressed`, `mouse_check_button_released`, `device_mouse_check_button`, `gamepad_is_connected`, `gamepad_button_check`, `gamepad_button_check_pressed`, `gamepad_button_check_released`, `gamepad_axis_value`, `vk_left`, `vk_right`, `vk_up`, `vk_down`, `vk_space`, `ord`, `mb_left`, `gp_axislh`, `gp_axislv`, `abs`
