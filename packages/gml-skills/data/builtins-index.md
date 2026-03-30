| Name | Return / Type | Description |
|------|----------------|-------------|
| abs | Real | Returns the absolute value of a number. |
| alarm | Array<Real> | Array of alarm countdown slots for the instance. |
| application_surface | Id.Surface | Default application surface id. |
| arccos | Real | Returns the inverse cosine of a value. |
| arcsin | Real | Returns the inverse sine of a value. |
| arctan2 | Real | Returns the angle from X and Y components. |
| array_contains | Bool | Checks whether an array contains a value. |
| array_copy | N/A | Copies a range of values between arrays. |
| array_delete | N/A | Deletes one or more values from an array. |
| array_filter | Array | Returns a filtered array using a callback. |
| array_insert | N/A | Inserts a value into an array. |
| array_length | Real | Returns the number of items in an array. |
| array_map | Array | Returns a mapped array using a callback. |
| array_pop | Any | Removes and returns the last array value. |
| array_push | Real | Appends one or more values to an array. |
| array_reduce | Any | Reduces an array to one accumulated value. |
| array_sort | N/A | Sorts an array in place. |
| async_load | Id.DSMap | DS map payload supplied to async events. |
| audio_create_stream | Asset.Sound | Creates a streamed sound from a file. |
| audio_group_is_loaded | Bool | Checks whether an audio group is loaded. |
| audio_group_load | Bool | Loads an audio group into memory. |
| audio_group_unload | Bool | Unloads an audio group from memory. |
| audio_pause_sound | N/A | Pauses a sound asset or playback id. |
| audio_play_sound | Id.AudioPlayback | Starts playing a sound and returns a playback id. |
| audio_play_sound_at | Id.AudioPlayback | Plays a sound in 3D space. |
| audio_sound_gain | N/A | Changes gain immediately or over time. |
| audio_stop_sound | N/A | Stops a sound asset or playback id. |
| bm_add | BlendMode | Additive blend mode. |
| bm_normal | BlendMode | Standard alpha blend mode. |
| buffer_create | Id.Buffer | Creates a buffer and returns its id. |
| buffer_delete | N/A | Deletes a buffer and frees memory. |
| buffer_grow | BufferType | Buffer type that grows when needed. |
| buffer_string | BufferValueType | Buffer value type for strings. |
| buffer_tell | Real | Returns the current cursor position in a buffer. |
| buffer_u16 | BufferValueType | Unsigned 16-bit buffer value type. |
| buffer_u8 | BufferValueType | Unsigned 8-bit buffer value type. |
| buffer_write | N/A | Writes a typed value into a buffer. |
| c_red | Color | Packed color constant for red. |
| c_white | Color | Packed color constant for white. |
| camera_create_view | Id.Camera | Creates a camera configured as a view. |
| camera_get_view_height | Real | Returns the view height of a camera. |
| camera_get_view_width | Real | Returns the view width of a camera. |
| camera_set_view_pos | N/A | Sets the top-left position of a camera view. |
| ceil | Real | Rounds a number up. |
| choose | Any | Returns one randomly chosen argument. |
| clamp | Real | Clamps a value into a range. |
| collision_circle | Id.Instance\|noone | Returns an instance overlapping a circle. |
| collision_line | Id.Instance\|noone | Returns an instance intersecting a line. |
| collision_point | Id.Instance\|noone | Returns an instance colliding with a point. |
| collision_rectangle | Id.Instance\|noone | Returns an instance overlapping a rectangle. |
| cos | Real | Returns the cosine of an angle in radians. |
| current_time | Real | Current elapsed time in milliseconds. |
| damp | Real | Smoothly damps a value toward a target. |
| depth | Real | The draw depth of the instance. |
| device_mouse_check_button | Bool | Checks a mouse or touch button on a device. |
| draw_circle | N/A | Draws a circle at a position. |
| draw_rectangle | N/A | Draws a filled or outlined rectangle. |
| draw_self | N/A | Draws the instance's current sprite normally. |
| draw_set_alpha | N/A | Sets the current drawing alpha state. |
| draw_set_color | N/A | Sets the current drawing color state. |
| draw_set_font | N/A | Sets the current font for text drawing. |
| draw_set_halign | N/A | Sets horizontal text alignment. |
| draw_set_valign | N/A | Sets vertical text alignment. |
| draw_sprite | N/A | Draws a sprite frame at a position. |
| draw_surface | N/A | Draws a surface at a position. |
| draw_text | N/A | Draws text at a position. |
| ds_grid_clear | N/A | Fills every cell in a ds_grid. |
| ds_grid_create | Id.DSGrid | Creates a ds_grid and returns its id. |
| ds_grid_destroy | N/A | Destroys a ds_grid and frees memory. |
| ds_grid_get | Any | Gets a value from a ds_grid cell. |
| ds_grid_set | N/A | Sets a value in a ds_grid cell. |
| ds_list_add | N/A | Adds one or more values to a ds_list. |
| ds_list_create | Id.DSList | Creates a ds_list and returns its id. |
| ds_list_delete | N/A | Deletes a value from a ds_list. |
| ds_list_destroy | N/A | Destroys a ds_list and frees memory. |
| ds_list_find_value | Any | Returns a value from a ds_list position. |
| ds_list_size | Real | Returns how many values a ds_list holds. |
| ds_map_add | Bool | Adds a key-value pair to a ds_map. |
| ds_map_create | Id.DSMap | Creates a ds_map and returns its id. |
| ds_map_delete | N/A | Deletes a key from a ds_map. |
| ds_map_destroy | N/A | Destroys a ds_map and frees memory. |
| ds_map_exists | Bool | Checks whether a ds_map key exists. |
| ds_map_find_value | Any\|undefined | Returns a ds_map value or undefined. |
| ds_priority_create | Id.DSPriority | Creates a ds_priority queue. |
| ds_priority_destroy | N/A | Destroys a ds_priority queue. |
| ds_queue_create | Id.DSQueue | Creates a ds_queue and returns its id. |
| ds_queue_destroy | N/A | Destroys a ds_queue and frees memory. |
| ds_stack_create | Id.DSStack | Creates a ds_stack and returns its id. |
| ds_stack_destroy | N/A | Destroys a ds_stack and frees memory. |
| ev_alarm | EventType | Event constant for Alarm. |
| ev_async | EventType | Event constant for Async events. |
| ev_cleanup | EventType | Event constant for Cleanup. |
| ev_collision | EventType | Event constant for Collision. |
| ev_create | EventType | Event constant for Create. |
| ev_destroy | EventType | Event constant for Destroy. |
| ev_draw | EventType | Event constant for Draw events. |
| ev_step | EventType | Event constant for Step events. |
| ev_step_begin | EventNumber | Sub-event constant for Begin Step. |
| ev_step_end | EventNumber | Sub-event constant for End Step. |
| ev_step_normal | EventNumber | Sub-event constant for Step. |
| event_inherited | N/A | Runs the inherited parent event code. |
| event_number | Real | The sub-event number currently running. |
| event_perform | N/A | Runs another event on the current instance. |
| event_type | EventType | The type of the event currently running. |
| event_user | N/A | Runs a user event on the current instance. |
| fa_left | TextAlign.Horizontal | Left text alignment constant. |
| fa_top | TextAlign.Vertical | Top text alignment constant. |
| false | Bool | Boolean false value. |
| file_exists | Bool | Checks whether a file exists. |
| file_text_close | N/A | Closes an open text file handle. |
| file_text_open_append | Real | Opens a text file for appending. |
| file_text_open_read | Real | Opens a text file for reading. |
| file_text_open_write | Real | Opens a text file for writing. |
| file_text_read_real | Real | Reads a real value from a text file. |
| file_text_read_string | String | Reads a string token from a text file. |
| file_text_write_string | N/A | Writes a string to a text file. |
| file_text_writeln | N/A | Writes a line break to a text file. |
| floor | Real | Rounds a number down. |
| game_save_id | String | Per-game writable save location root. |
| gamepad_axis_value | Real | Returns a normalized gamepad axis value. |
| gamepad_button_check | Bool | Checks whether a gamepad button is held. |
| gamepad_button_check_pressed | Bool | Checks whether a gamepad button was pressed. |
| gamepad_button_check_released | Bool | Checks whether a gamepad button was released. |
| gamepad_is_connected | Bool | Checks whether a gamepad slot is connected. |
| global | Namespace | Namespace used to access global variables. |
| gp_axislh | GamepadAxis | Gamepad constant for left horizontal axis. |
| gp_axislv | GamepadAxis | Gamepad constant for left vertical axis. |
| gpu_set_blendmode | N/A | Sets the GPU blend mode for later draws. |
| http_get | Real | Starts an HTTP GET request and returns its id. |
| http_post_string | Real | Starts an HTTP POST request with a string body. |
| id | Id.Instance | The unique id of the current instance. |
| image_index | Real | Current subimage index for the assigned sprite. |
| image_speed | Real | Speed at which the sprite animation advances. |
| ini_close | N/A | Closes the currently open INI file. |
| ini_open | N/A | Opens an INI file for reading and writing. |
| ini_write_real | N/A | Writes a real value into an INI file. |
| instance_create_depth | Id.Instance | Creates an instance at a depth and returns its id. |
| instance_create_layer | Id.Instance | Creates an instance on a room layer and returns its |
| instance_destroy | N/A | Destroys self or a target instance. |
| instance_exists | Bool | Checks whether an instance or object currently exists. |
| instance_find | Id.Instance\|noone | Returns the nth instance of an object or noone. |
| instance_number | Real | Returns how many instances of an object exist. |
| instance_place | Id.Instance\|noone | Returns the colliding instance at a test position. |
| instance_position | Id.Instance\|noone | Returns the instance at a point or noone. |
| irandom | Real | Returns a random integer from 0 to n. |
| json_parse | Any | Parses JSON text into structs and arrays. |
| json_stringify | String | Converts a struct or array to JSON text. |
| keyboard_check | Bool | Checks whether a key is currently held. |
| keyboard_check_pressed | Bool | Checks whether a key was pressed this frame. |
| keyboard_check_released | Bool | Checks whether a key was released this frame. |
| layer_add_instance | N/A | Adds an existing instance to a layer. |
| layer_exists | Bool | Checks whether a named layer exists. |
| layer_get_id | Id.Layer\|Real | Returns a layer id from its name. |
| layer_sequence_create | Id.SequenceInstance | Creates a sequence instance on a layer. |
| lengthdir_x | Real | Returns the X offset for a length and direction. |
| lengthdir_y | Real | Returns the Y offset for a length and direction. |
| lerp | Real | Linearly interpolates between two values. |
| mb_left | MouseButton | Mouse button constant for left click. |
| mouse_check_button | Bool | Checks whether a mouse button is held. |
| mouse_check_button_pressed | Bool | Checks whether a mouse button was pressed. |
| mouse_check_button_released | Bool | Checks whether a mouse button was released. |
| mouse_x | Real | Mouse X position in room coordinates. |
| mouse_y | Real | Mouse Y position in room coordinates. |
| move_towards_point | N/A | Sets direction and speed toward a point. |
| network_connect | Bool | Connects a socket to a host and port. |
| network_create_socket | Real | Creates a network socket. |
| network_send_packet | Real | Sends bytes from a buffer through a socket. |
| network_send_raw | Real | Sends raw data through a socket. |
| network_socket_tcp | NetworkSocketType | Socket type constant for TCP. |
| network_type_connect | NetworkEventType | Async networking constant for connection success. |
| network_type_data | NetworkEventType | Async networking constant for incoming data. |
| network_type_disconnect | NetworkEventType | Async networking constant for disconnect. |
| noone | Id.Instance | Represents the absence of an instance. |
| object_index | Asset.GMObject | The object asset index of the current instance. |
| ord | Real | Returns the code of the first character. |
| other | Id.Instance | Reference to the paired instance for certain event scopes. |
| persistent | Bool | Whether the instance survives room changes. |
| place_meeting | Bool | Tests whether a collision would happen at a position. |
| point_direction | Real | Returns the direction from one point to another. |
| point_distance | Real | Returns the distance between two points. |
| position_meeting | Bool | Tests whether a point overlaps a target. |
| random | Real | Returns a random real from 0 up to n. |
| room | Asset.Room | The current room asset index. |
| room_get_info | Struct | Returns room metadata as a struct. |
| room_goto | N/A | Transitions to a target room. |
| room_goto_next | N/A | Transitions to the next room in order. |
| room_goto_previous | N/A | Transitions to the previous room in order. |
| room_restart | N/A | Restarts the current room. |
| room_speed | Real | The current game step rate. |
| round | Real | Rounds a number to the nearest integer. |
| self | Id.Instance | Reference to the current instance in scope. |
| sequence_get | Struct | Returns sequence asset data as a struct. |
| shader_get_uniform | Real | Gets a uniform handle from a shader. |
| shader_reset | N/A | Resets rendering back to the default shader. |
| shader_set | N/A | Activates a shader for future draw calls. |
| shader_set_uniform_f | N/A | Writes float uniform values to a shader. |
| show_debug_message | N/A | Writes a value to the debug console. |
| sign | Real | Returns -1, 0, or 1 from a number sign. |
| sin | Real | Returns the sine of an angle in radians. |
| sprite_index | Asset.Sprite | The sprite currently assigned to the instance. |
| string | String | Converts a value to a string. |
| string_copy | String | Copies a substring from a string. |
| string_length | Real | Returns the number of characters in a string. |
| string_lower | String | Returns a string in lowercase. |
| string_pos | Real | Returns the first position of a substring. |
| string_replace | String | Replaces the first matching substring. |
| string_split | Array<String> | Splits a string into an array of substrings. |
| string_upper | String | Returns a string in uppercase. |
| surface_create | Id.Surface | Creates a surface and returns its id. |
| surface_exists | Bool | Checks whether a surface id is valid. |
| tan | Real | Returns the tangent of an angle in radians. |
| true | Bool | Boolean true value. |
| undefined | Undefined | Represents an undefined value. |
| variable_global_exists | Bool | Checks whether a global variable exists. |
| variable_instance_exists | Bool | Checks whether an instance variable exists. |
| variable_instance_get | Any | Gets a variable value from an instance. |
| variable_struct_exists | Bool | Checks whether a struct field exists. |
| variable_struct_get | Any | Gets a field value from a struct. |
| variable_struct_set | N/A | Sets a field value on a struct. |
| view_enabled | Bool | Whether the legacy view system is enabled. |
| view_set_camera | N/A | Assigns a camera to a view slot. |
| view_visible | Array<Bool> | Visibility flags for view slots. |
| vk_down | KeyCode | Virtual-key constant for Down Arrow. |
| vk_left | KeyCode | Virtual-key constant for Left Arrow. |
| vk_right | KeyCode | Virtual-key constant for Right Arrow. |
| vk_space | KeyCode | Virtual-key constant for Space. |
| vk_up | KeyCode | Virtual-key constant for Up Arrow. |
| working_directory | String | The runtime working directory path. |
| x | Real | The instance X position in the room. |
| y | Real | The instance Y position in the room. |
