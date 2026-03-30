# Shaders

## Key concepts
Shaders in GMS2 are applied by calling `shader_set` before drawing and `shader_reset` afterward. Uniform locations should be cached with `shader_get_uniform` rather than looked up every frame. GMS2 shaders use a GLSL ES style split between vertex and fragment programs.

The most common mistake is forgetting to reset the shader or forgetting that the shader only affects draw calls issued while it is active. Keep shader setup and draw calls tightly grouped.

## Syntax and usage
```gml
// Create Event
u_time = shader_get_uniform(shd_wave, "u_time");
```

```gml
// Draw Event
shader_set(shd_wave);
shader_set_uniform_f(u_time, current_time / 1000);
draw_self();
shader_reset();
```

```glsl
// Vertex shader
attribute vec3 in_Position;
attribute vec4 in_Colour;
attribute vec2 in_TextureCoord;

varying vec2 v_vTexcoord;
varying vec4 v_vColour;

void main() {
    gl_Position = gm_Matrices[MATRIX_WORLD_VIEW_PROJECTION] * vec4(in_Position, 1.0);
    v_vColour = in_Colour;
    v_vTexcoord = in_TextureCoord;
}
```

```glsl
// Fragment shader
varying vec2 v_vTexcoord;
varying vec4 v_vColour;

uniform float u_time;

void main() {
    vec4 base = texture2D(gm_BaseTexture, v_vTexcoord);
    base.rgb += sin(u_time) * 0.1;
    gl_FragColor = base * v_vColour;
}
```

## Common patterns
Cache uniforms once:

```gml
// Create Event
u_color = shader_get_uniform(shd_tint, "u_color");
```

Apply a shader only around the specific draw calls that need it:

```gml
shader_set(shd_outline);
draw_sprite(sprite_index, image_index, x, y);
shader_reset();
```

## What to avoid
- Do not leave a shader active after the intended draw block.
- Do not call `shader_get_uniform` every frame unless profiling proves it is irrelevant.
- Do not expect a shader to affect already-drawn sprites.
- Do not write desktop-only GLSL features that are not valid in GMS2's GLSL ES pipeline.

## Built-ins used
`shader_set`, `shader_reset`, `shader_get_uniform`, `shader_set_uniform_f`, `draw_self`, `draw_sprite`, `current_time`, `image_index`, `sprite_index`
