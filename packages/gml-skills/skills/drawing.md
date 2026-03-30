# Drawing and GUI

## Key concepts
All `draw_*` work must happen in a Draw event or Draw GUI event. Calling drawing functions from Step or Alarm has no visible effect because rendering is performed later in the frame. Draw state such as color, alpha, font, alignment, and blend mode persists until changed again, so always restore state after custom drawing to avoid contaminating other objects.

Use the Draw event for room-space rendering and Draw GUI for fixed UI in GUI-space coordinates. If you override the Draw event and still want the assigned sprite visible, call `draw_self()` explicitly.

## Syntax and usage
```gml
// Draw Event
draw_self();
draw_set_color(c_white);
draw_text(x - 16, y - 24, string(hp));
```

```gml
// Draw GUI Event
draw_set_font(fnt_ui);
draw_set_halign(fa_left);
draw_set_valign(fa_top);
draw_text(24, 24, "Coins: " + string(global.coins));
```

```gml
draw_set_alpha(0.5);
draw_rectangle(x - 16, y - 16, x + 16, y + 16, false);
draw_set_alpha(1);
```

```gml
var surf = application_surface;
if (surface_exists(surf)) {
    draw_surface(surf, 0, 0);
}
```

```gml
gpu_set_blendmode(bm_add);
draw_circle(x, y, 12, false);
gpu_set_blendmode(bm_normal);
```

## Common patterns
Reset draw state in the same event that changed it:

```gml
draw_set_color(c_red);
draw_sprite(spr_warning, 0, x, y);
draw_set_color(c_white);
```

Use Draw GUI for HUD because it is independent of camera movement:

```gml
draw_set_color(c_white);
draw_text(16, 16, "HP: " + string(player_hp));
```

Render to a surface for post-processing pipelines:

```gml
if (!surface_exists(light_surface)) {
    light_surface = surface_create(camera_get_view_width(view_camera[0]), camera_get_view_height(view_camera[0]));
}
```

## What to avoid
- Never call `draw_*` in Step expecting visible output.
- Always reset persistent draw state like `draw_set_color`, `draw_set_alpha`, `draw_set_font`, and blend mode.
- Do not mix room-space coordinates and GUI-space coordinates in the same mental model.
- Do not forget `draw_self()` when custom Draw code should still render the sprite.
- Do not create surfaces every frame without destroying or reusing them.

## Built-ins used
`draw_self`, `draw_sprite`, `draw_text`, `draw_rectangle`, `draw_circle`, `draw_set_color`, `draw_set_alpha`, `draw_set_font`, `draw_set_halign`, `draw_set_valign`, `draw_surface`, `surface_exists`, `surface_create`, `application_surface`, `gpu_set_blendmode`, `bm_add`, `bm_normal`, `c_white`, `c_red`, `fa_left`, `fa_top`
