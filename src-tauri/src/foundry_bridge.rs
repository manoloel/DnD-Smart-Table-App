use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{
    io::{Read, Write},
    net::{TcpListener, TcpStream},
    sync::{Arc, Mutex, OnceLock},
    thread,
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Emitter};

const BRIDGE_ADDR: &str = "127.0.0.1:30000";
const WS_GUID: &str = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

static BRIDGE: OnceLock<Arc<FoundryBridgeState>> = OnceLock::new();

#[derive(Default)]
struct FoundryBridgeState {
    config: Mutex<FoundryBridgeConfig>,
    clients: Mutex<Vec<Arc<Mutex<TcpStream>>>>,
}

#[derive(Default)]
struct FoundryBridgeConfig {
    enabled: bool,
    secret: String,
}

#[derive(Deserialize)]
struct FoundryAuthMessage {
    #[serde(rename = "type")]
    message_type: String,
    role: String,
    module: String,
    secret: String,
    #[serde(rename = "worldId")]
    world_id: String,
    #[serde(rename = "worldTitle")]
    world_title: String,
    #[serde(rename = "userId")]
    user_id: String,
    #[serde(rename = "userName")]
    user_name: String,
}

#[derive(Serialize, Clone)]
pub struct FoundryBridgeSnapshot {
    pub enabled: bool,
    pub endpoint: String,
    pub client_connected: bool,
}

pub fn start_foundry_bridge(app: AppHandle) {
    let state = BRIDGE
        .get_or_init(|| Arc::new(FoundryBridgeState::default()))
        .clone();

    thread::spawn(move || {
        let listener = match TcpListener::bind(BRIDGE_ADDR) {
            Ok(listener) => listener,
            Err(error) => {
                let _ = app.emit(
                    "foundry://bridge",
                    json!({ "type": "error", "message": format!("Failed to bind {BRIDGE_ADDR}: {error}") }),
                );
                return;
            }
        };

        let _ = app.emit(
            "foundry://bridge",
            json!({ "type": "listening", "endpoint": format!("ws://{BRIDGE_ADDR}/foundry") }),
        );

        for incoming in listener.incoming() {
            match incoming {
                Ok(stream) => {
                    let app = app.clone();
                    let state = state.clone();
                    thread::spawn(move || handle_connection(stream, app, state));
                }
                Err(error) => {
                    let _ = app.emit(
                        "foundry://bridge",
                        json!({ "type": "error", "message": format!("Foundry bridge accept failed: {error}") }),
                    );
                }
            }
        }
    });
}

pub fn configure_foundry_bridge(enabled: bool, secret: String) -> FoundryBridgeSnapshot {
    let state = BRIDGE
        .get_or_init(|| Arc::new(FoundryBridgeState::default()))
        .clone();
    if let Ok(mut config) = state.config.lock() {
        config.enabled = enabled;
        config.secret = secret;
    }
    snapshot(&state)
}

pub fn send_foundry_next_turn() -> Result<usize, String> {
    send_to_foundry(json!({
        "type": "command",
        "requestId": make_request_id(),
        "command": "combat.nextTurn",
        "source": "smart-table"
    }))
}

pub fn send_foundry_ping() -> Result<usize, String> {
    send_to_foundry(json!({ "type": "ping" }))
}

fn snapshot(state: &Arc<FoundryBridgeState>) -> FoundryBridgeSnapshot {
    FoundryBridgeSnapshot {
        enabled: state.config.lock().map(|config| config.enabled).unwrap_or(false),
        endpoint: format!("ws://{BRIDGE_ADDR}/foundry"),
        client_connected: state.clients.lock().map(|clients| !clients.is_empty()).unwrap_or(false),
    }
}

fn handle_connection(mut stream: TcpStream, app: AppHandle, state: Arc<FoundryBridgeState>) {
    let _ = stream.set_read_timeout(Some(Duration::from_secs(30)));
    let mut buffer = [0_u8; 8192];
    let read = match stream.read(&mut buffer) {
        Ok(read) => read,
        Err(_) => return,
    };
    if read == 0 {
        return;
    }

    let request = String::from_utf8_lossy(&buffer[..read]).to_string();
    if request.starts_with("GET /foundry ") {
        handle_websocket(stream, &request, app, state);
        return;
    }

    let _ = write_http_response(&mut stream, "404 Not Found", json!({ "error": "not_found" }));
}

fn handle_websocket(mut stream: TcpStream, request: &str, app: AppHandle, state: Arc<FoundryBridgeState>) {
    let websocket_key = match header_value(request, "sec-websocket-key") {
        Some(key) => key,
        None => {
            let _ = write_http_response(&mut stream, "400 Bad Request", json!({ "error": "missing_websocket_key" }));
            return;
        }
    };

    let accept = websocket_accept_key(&websocket_key);
    let response = format!(
        "HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: {accept}\r\n\r\n"
    );
    if stream.write_all(response.as_bytes()).is_err() {
        return;
    }

    let writer_stream = match stream.try_clone() {
        Ok(stream) => Arc::new(Mutex::new(stream)),
        Err(_) => return,
    };

    let first_message = match read_ws_text(&mut stream) {
        Ok(Some(message)) => message,
        _ => return,
    };

    let auth = match serde_json::from_str::<FoundryAuthMessage>(&first_message) {
        Ok(auth) => auth,
        Err(_) => {
            let _ = write_ws_json(&writer_stream, json!({ "type": "auth.error", "reason": "invalid_auth_payload" }));
            return;
        }
    };

    let (enabled, secret) = match state.config.lock() {
        Ok(config) => (config.enabled, config.secret.clone()),
        Err(_) => (false, String::new()),
    };

    if !enabled || auth.message_type != "auth" || auth.secret != secret {
        let _ = write_ws_json(&writer_stream, json!({ "type": "auth.error", "reason": "invalid_secret" }));
        return;
    }

    if state.clients.lock().map(|clients| !clients.is_empty()).unwrap_or(true) {
        let _ = write_ws_json(&writer_stream, json!({ "type": "auth.error", "reason": "client_already_connected" }));
        return;
    }

    if write_ws_json(&writer_stream, json!({ "type": "auth.ok" })).is_err() {
        return;
    }
    let _ = stream.set_read_timeout(None);

    if let Ok(mut clients) = state.clients.lock() {
        clients.push(writer_stream.clone());
    }

    let _ = app.emit(
        "foundry://ws",
        json!({
            "type": "connected",
            "role": auth.role,
            "module": auth.module,
            "worldId": auth.world_id,
            "worldTitle": auth.world_title,
            "userId": auth.user_id,
            "userName": auth.user_name
        }),
    );

    while let Ok(Some(message)) = read_ws_text(&mut stream) {
        let parsed = serde_json::from_str::<Value>(&message).unwrap_or_else(|_| json!({ "type": "text", "message": message }));
        if parsed.get("type").and_then(Value::as_str) == Some("event") {
            let _ = app.emit("foundry://event", parsed);
        } else {
            let _ = app.emit("foundry://ws", parsed);
        }
    }

    if let Ok(mut clients) = state.clients.lock() {
        clients.retain(|client| !Arc::ptr_eq(client, &writer_stream));
    }
    let _ = app.emit("foundry://ws", json!({ "type": "disconnected" }));
}

fn send_to_foundry(message: Value) -> Result<usize, String> {
    let state = BRIDGE
        .get_or_init(|| Arc::new(FoundryBridgeState::default()))
        .clone();
    let clients = state.clients.lock().map_err(|error| error.to_string())?;
    let mut sent = 0;
    for client in clients.iter() {
        if write_ws_json(client, message.clone()).is_ok() {
            sent += 1;
        }
    }
    if sent == 0 {
        return Err("No authenticated Foundry clients connected".to_string());
    }
    Ok(sent)
}

fn make_request_id() -> String {
    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or_default();
    format!("req-{millis}")
}

fn header_value(request: &str, name: &str) -> Option<String> {
    let needle = name.to_ascii_lowercase();
    request.lines().find_map(|line| {
        let (key, value) = line.split_once(':')?;
        if key.trim().to_ascii_lowercase() == needle {
            Some(value.trim().to_string())
        } else {
            None
        }
    })
}

fn write_http_response(stream: &mut TcpStream, status: &str, body: Value) -> std::io::Result<()> {
    let body = body.to_string();
    let response = format!(
        "HTTP/1.1 {status}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
        body.as_bytes().len()
    );
    stream.write_all(response.as_bytes())
}

fn read_ws_text(stream: &mut TcpStream) -> std::io::Result<Option<String>> {
    let mut header = [0_u8; 2];
    stream.read_exact(&mut header)?;
    let opcode = header[0] & 0x0f;
    if opcode == 0x8 {
        return Ok(None);
    }

    let masked = header[1] & 0x80 != 0;
    let mut length = u64::from(header[1] & 0x7f);
    if length == 126 {
        let mut bytes = [0_u8; 2];
        stream.read_exact(&mut bytes)?;
        length = u64::from(u16::from_be_bytes(bytes));
    } else if length == 127 {
        let mut bytes = [0_u8; 8];
        stream.read_exact(&mut bytes)?;
        length = u64::from_be_bytes(bytes);
    }

    let mut mask = [0_u8; 4];
    if masked {
        stream.read_exact(&mut mask)?;
    }

    let mut payload = vec![0_u8; length as usize];
    stream.read_exact(&mut payload)?;
    if masked {
        for (index, byte) in payload.iter_mut().enumerate() {
            *byte ^= mask[index % 4];
        }
    }

    if opcode == 0x9 {
        return Ok(Some("{\"type\":\"ping\"}".to_string()));
    }

    Ok(Some(String::from_utf8_lossy(&payload).to_string()))
}

fn write_ws_json(client: &Arc<Mutex<TcpStream>>, value: Value) -> std::io::Result<()> {
    write_ws_text(client, &value.to_string())
}

fn write_ws_text(client: &Arc<Mutex<TcpStream>>, text: &str) -> std::io::Result<()> {
    let mut frame = vec![0x81_u8];
    let payload = text.as_bytes();
    if payload.len() < 126 {
        frame.push(payload.len() as u8);
    } else if payload.len() <= u16::MAX as usize {
        frame.push(126);
        frame.extend_from_slice(&(payload.len() as u16).to_be_bytes());
    } else {
        frame.push(127);
        frame.extend_from_slice(&(payload.len() as u64).to_be_bytes());
    }
    frame.extend_from_slice(payload);

    let mut stream = client.lock().map_err(|_| std::io::ErrorKind::BrokenPipe)?;
    stream.write_all(&frame)
}

fn websocket_accept_key(key: &str) -> String {
    let digest = sha1(format!("{key}{WS_GUID}").as_bytes());
    base64_encode(&digest)
}

fn base64_encode(bytes: &[u8]) -> String {
    const TABLE: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut output = String::new();
    for chunk in bytes.chunks(3) {
        let b0 = chunk[0];
        let b1 = *chunk.get(1).unwrap_or(&0);
        let b2 = *chunk.get(2).unwrap_or(&0);

        output.push(TABLE[(b0 >> 2) as usize] as char);
        output.push(TABLE[(((b0 & 0b0000_0011) << 4) | (b1 >> 4)) as usize] as char);
        output.push(if chunk.len() > 1 {
            TABLE[(((b1 & 0b0000_1111) << 2) | (b2 >> 6)) as usize] as char
        } else {
            '='
        });
        output.push(if chunk.len() > 2 {
            TABLE[(b2 & 0b0011_1111) as usize] as char
        } else {
            '='
        });
    }
    output
}

fn sha1(input: &[u8]) -> [u8; 20] {
    let mut h0: u32 = 0x67452301;
    let mut h1: u32 = 0xefcdab89;
    let mut h2: u32 = 0x98badcfe;
    let mut h3: u32 = 0x10325476;
    let mut h4: u32 = 0xc3d2e1f0;

    let bit_len = (input.len() as u64) * 8;
    let mut message = input.to_vec();
    message.push(0x80);
    while message.len() % 64 != 56 {
        message.push(0);
    }
    message.extend_from_slice(&bit_len.to_be_bytes());

    for chunk in message.chunks(64) {
        let mut words = [0_u32; 80];
        for index in 0..16 {
            let start = index * 4;
            words[index] = u32::from_be_bytes([
                chunk[start],
                chunk[start + 1],
                chunk[start + 2],
                chunk[start + 3],
            ]);
        }
        for index in 16..80 {
            words[index] = (words[index - 3] ^ words[index - 8] ^ words[index - 14] ^ words[index - 16]).rotate_left(1);
        }

        let mut a = h0;
        let mut b = h1;
        let mut c = h2;
        let mut d = h3;
        let mut e = h4;

        for (index, word) in words.iter().enumerate() {
            let (f, k) = match index {
                0..=19 => ((b & c) | ((!b) & d), 0x5a827999),
                20..=39 => (b ^ c ^ d, 0x6ed9eba1),
                40..=59 => ((b & c) | (b & d) | (c & d), 0x8f1bbcdc),
                _ => (b ^ c ^ d, 0xca62c1d6),
            };
            let temp = a
                .rotate_left(5)
                .wrapping_add(f)
                .wrapping_add(e)
                .wrapping_add(k)
                .wrapping_add(*word);
            e = d;
            d = c;
            c = b.rotate_left(30);
            b = a;
            a = temp;
        }

        h0 = h0.wrapping_add(a);
        h1 = h1.wrapping_add(b);
        h2 = h2.wrapping_add(c);
        h3 = h3.wrapping_add(d);
        h4 = h4.wrapping_add(e);
    }

    let mut digest = [0_u8; 20];
    digest[..4].copy_from_slice(&h0.to_be_bytes());
    digest[4..8].copy_from_slice(&h1.to_be_bytes());
    digest[8..12].copy_from_slice(&h2.to_be_bytes());
    digest[12..16].copy_from_slice(&h3.to_be_bytes());
    digest[16..20].copy_from_slice(&h4.to_be_bytes());
    digest
}
