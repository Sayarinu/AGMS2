# Networking

## Key concepts
GameMaker networking is event-driven. Socket messages arrive in the Async Networking event, and HTTP results arrive in the Async HTTP event. They do not appear synchronously in Step, so code must route async payloads through `async_load`.

Buffers are the normal way to construct binary packets. Delete temporary buffers with `buffer_delete` once you are done with them to avoid memory leaks.

## Syntax and usage
```gml
socket = network_create_socket(network_socket_tcp);
network_connect(socket, "127.0.0.1", 9000);
```

```gml
var buff = buffer_create(256, buffer_grow, 1);
buffer_write(buff, buffer_u8, 1);
buffer_write(buff, buffer_string, "ping");
network_send_packet(socket, buff, buffer_tell(buff));
buffer_delete(buff);
```

```gml
request_id = http_get("https://example.com/profile.json");
```

```gml
// Async - Networking Event
var type = async_load[? "type"];
if (type == network_type_data) {
    var buffer = async_load[? "buffer"];
}
```

```gml
// Async - HTTP Event
if (async_load[? "id"] == request_id) {
    if (async_load[? "status"] == 0) {
        profile = json_parse(async_load[? "result"]);
    }
}
```

## Common patterns
Route async events through explicit type checks:

```gml
switch (async_load[? "type"]) {
case network_type_connect:
    connected = true;
    break;
case network_type_disconnect:
    connected = false;
    break;
case network_type_data:
    process_packet(async_load[? "buffer"]);
    break;
}
```

Build packets with a simple header:

```gml
var buff = buffer_create(128, buffer_grow, 1);
buffer_write(buff, buffer_u16, PacketType.Chat);
buffer_write(buff, buffer_string, message);
network_send_packet(socket, buff, buffer_tell(buff));
buffer_delete(buff);
```

## What to avoid
- Never wait for socket or HTTP results in Step.
- Always inspect `async_load[? "type"]` before routing async network data.
- Do not forget `buffer_delete` for temporary packet buffers.
- Do not assume an HTTP request succeeded because the request id exists.
- Do not mix binary packet protocols and string protocols without a clear framing scheme.

## Built-ins used
`network_create_socket`, `network_connect`, `network_send_packet`, `network_send_raw`, `buffer_create`, `buffer_write`, `buffer_tell`, `buffer_delete`, `http_get`, `http_post_string`, `async_load`, `json_parse`, `network_socket_tcp`, `network_type_connect`, `network_type_disconnect`, `network_type_data`, `buffer_grow`, `buffer_u8`, `buffer_u16`, `buffer_string`
