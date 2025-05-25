use std::{collections::HashMap, sync::Arc, time::Duration, net::SocketAddr, env};

use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    response::IntoResponse,
    routing::get,
    Router,
};
use futures::{SinkExt, StreamExt};
use serde_json::Value;
use tokio::{
    sync::{broadcast, mpsc, Mutex},
    time::interval,
};
use uuid::Uuid;
use axum_server::tls_rustls::RustlsConfig;
use dotenv::dotenv;

#[derive(Clone)]
struct AppState {
    connections: Arc<Mutex<HashMap<String, broadcast::Sender<Message>>>>,
}

// keep all your other functions like websocket_handler and handle_socket as is

#[tokio::main]
async fn main() {

    dotenv().ok(); // loads .env file if exists

    let ip = env::var("SERVER_IP").unwrap_or_else(|_| "127.0.0.1".to_string());
    let port = env::var("SERVER_PORT").unwrap_or_else(|_| "8000".to_string());
    let addr: SocketAddr = format!("{}:{}", ip, port).parse().expect("Invalid address");

    println!("WebSocket HTTPS server running at https://{}:{}", ip, port);

    let state = AppState {
        connections: Arc::new(Mutex::new(HashMap::new())),
    };

    let app = Router::new()
        .route("/ws", get(websocket_handler))
        .with_state(state.clone());

    let tls_config = RustlsConfig::from_pem_file("ssl/cert.pem", "ssl/key.pem")
        .await
        .expect("failed to load TLS certs");

    //let addr: SocketAddr = "192.168.1.167:8000".parse().expect("Invalid address");

    axum_server::bind_rustls(addr, tls_config)
        .serve(app.into_make_service())
        .await
        .unwrap();
}

async fn websocket_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, state))
}

async fn handle_socket(socket: WebSocket, state: AppState) {
    let mut conn_id = Uuid::new_v4().to_string();
    let conn_id_clone = conn_id.clone();
    println!("New connection: {}", conn_id);

    let (tx, mut rx) = broadcast::channel(100);
    {
        let mut connections = state.connections.lock().await;
        connections.insert(conn_id.clone(), tx.clone());
    }

    let (mut sender, mut receiver) = socket.split();
    let (message_tx, mut message_rx) = mpsc::channel::<Message>(100);

    let sender_task = tokio::spawn(async move {
        while let Some(msg) = message_rx.recv().await {
            if sender.send(msg).await.is_err() {
                break;
            }
        }
    });

    let ping_tx = message_tx.clone();
    let ping_task = tokio::spawn(async move {
        let mut interval = interval(Duration::from_secs(30));
        loop {
            interval.tick().await;
            if ping_tx.send(Message::Ping(vec![])).await.is_err() {
                break;
            }
        }
    });

    let forward_tx = message_tx.clone();
    let forward_task = tokio::spawn(async move {
        while let Ok(msg) = rx.recv().await {
            if forward_tx.send(msg).await.is_err() {
                break;
            }
        }
    });

    let receive_task = tokio::spawn({
        let state = state.clone();
        let tx = tx.clone();
        let mut target_map: HashMap<String, String> = HashMap::new();

        async move {
            while let Some(Ok(msg)) = receiver.next().await {
                match msg {
                    Message::Text(text) => {
                        if let Ok(data) = serde_json::from_str::<Value>(&text) {
                            if data["type"] == "register" {
                                if let Some(id) = data["connectionId"].as_str() {
                                    conn_id = id.to_string();
                                    state.connections.lock().await.insert(id.to_string(), tx.clone());
                                }
                                continue;
                            }

                            if let Some(target_id) = data["target_id"].as_str() {
                                target_map.insert(conn_id.clone(), target_id.to_string());
                                if let Some(target_tx) = state.connections.lock().await.get(target_id) {
                                    let _ = target_tx.send(Message::Text(text));
                                }
                            }
                        }
                    }
                    Message::Binary(bin_data) => {
                        if let Some(target_id) = target_map.get(&conn_id) {
                            if let Some(target_tx) = state.connections.lock().await.get(target_id) {
                                let _ = target_tx.send(Message::Binary(bin_data));
                            }
                        } else {
                            println!("No Target set for binary transfer from {}", conn_id);
                        }
                    }
                    Message::Close(_) => break,
                    _ => continue,
                }
            }
        }
    });

    tokio::select! {
        _ = sender_task => {},
        _ = ping_task => {},
        _ = forward_task => {},
        _ = receive_task => {},
    };

    state.connections.lock().await.remove(&conn_id_clone);
    println!("Connection closed: {}", conn_id_clone);
}



