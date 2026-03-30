# Audio

## Key concepts
Use the audio runtime to play, stop, stream, and group-manage sounds. `audio_play_sound` is the common choice for regular effects and music assets, while `audio_create_stream` is useful for external or long-form streamed content. Audio groups help manage memory by loading and unloading related sets of sounds at runtime.

For positional sound, use 3D-aware helpers such as `audio_play_sound_at`. Runtime gain, pitch, and looping decisions should be centralized instead of scattered across many objects.

## Syntax and usage
```gml
audio_play_sound(snd_jump, 0, false);
```

```gml
var music_id = audio_play_sound(snd_music, 10, true);
audio_sound_gain(music_id, 0.7, 0);
```

```gml
audio_stop_sound(snd_alarm);
audio_pause_sound(snd_alarm);
```

```gml
var stream = audio_create_stream(game_save_id + "/voice.ogg");
audio_play_sound(stream, 5, false);
```

```gml
audio_group_load(audiogroup_level2);
audio_group_unload(audiogroup_level1);
```

## Common patterns
Fade music using runtime sound ids:

```gml
if (music_id != noone) {
    audio_sound_gain(music_id, 0, room_speed);
}
```

Load heavy groups only when entering a room set:

```gml
if (!audio_group_is_loaded(audiogroup_boss)) {
    audio_group_load(audiogroup_boss);
}
```

## What to avoid
- Do not keep every audio group loaded for the entire game if memory is tight.
- Do not confuse a sound asset id with a runtime playback id when adjusting gain or pitch.
- Do not create streams repeatedly when one reused stream is enough.
- Do not apply volume changes across many objects independently without a shared mixer policy.

## Built-ins used
`audio_play_sound`, `audio_stop_sound`, `audio_pause_sound`, `audio_sound_gain`, `audio_create_stream`, `audio_play_sound_at`, `audio_group_load`, `audio_group_unload`, `audio_group_is_loaded`, `game_save_id`, `noone`
