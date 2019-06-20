#!/usr/bin/env node

const config = require('./config.json');

const WebSocketClient = require('websocket').client;
const client = new WebSocketClient();

let room = process.argv[2];

if (!config.active_rooms.hasOwnProperty(room)) {
    console.log(`${room} does not exist`)
    process.exit(1);
}

client.on('connectFailed', error => {
    console.log('Connect Error: ' + error.toString());
});

function pack(data) {
    return JSON.stringify(data);
}

function unpack(data) {
    return JSON.parse(data);
}

client.on('connect', connection => {
    console.log('WebSocket Client Connected');
    connection.on('error', error => {
        console.log("Connection Error: " + error.toString());
    });
    connection.on('close', () => {
        console.log('echo-protocol Connection Closed');
    });
    connection.on('message', message => {

        let data = unpack(message.utf8Data);
        if (!data) return;

        switch(data.id) {
            case 'heartbeat':
                connection.send(pack({id: "heartbeat", room: room}));
                break;
        }
    });
});

client.connect(`ws://${config.master_server}:8080/`, 'echo-protocol');