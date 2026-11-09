#macro PLAYER_MAX_HP 3
#macro Debug:PLAYER_MAX_HP 99

function scr_clamp_speed(value) {
	return clamp(value, 0, 8);
}
