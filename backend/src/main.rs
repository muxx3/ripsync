use std::{ collections::HashMap, sync::Arc, time::Duration };

use axum::{extract::{ws::{Message, WebSocket}, State, WebSocketUpgrade}, response::IntoResponse, routing::get, routing::Router};
use futures::{SinkExt, StreamExt};
use serde_json::Value;
use tokio::{sync::{ broadcast, mpsc, Mutex }, time::interval};
use uuid::Uuid;


#[derive(Clone)]
struct AppState {
    connections: Arc<Mutex<HashMap<String, broadcast::Sender<Message>>>>,
}


#[tokio::main]
async fn main() {
    let state = AppState {
        connections: Arc::new(Mutex::new(HashMap::new()))
    };

    let app = Router::new()
        .route("/ws", get(websocket_handler))
        .with_state(state);



    // For testing on local host
    //let listener = tokio::net::TcpListener::bind("127.0.0.1:56789").await.unwrap();
    //println!("Server running on http://localhost:56789");



    let listener = tokio::net::TcpListener::bind("0.0.0.0:8000").await.unwrap();
    println!("Server running on http://localhost:8000");
    axum::serve(listener, app).await.unwrap();
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
