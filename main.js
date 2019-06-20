#!/usr/bin/env node
const WebSocketServer = require('websocket').server;
const http = require('http');
const app = require('express')();
const config = require('./config.json');

const server = http.createServer((request, response) => {
    console.log((new Date()) + ' Received request for ' + request.url);
    response.writeHead(404);
    response.end();
});

const webWS = http.createServer((request, response) => {
    console.log((new Date()) + ' Received request for ' + request.url);
    response.writeHead(404);
    response.end();
});

let activeRooms = config.active_rooms;
let warningRooms = {};
let webSockets = [];
let change = false;
let masterSystem = false;

app.set('view engine', 'ejs');

app.get('/', (req, res) => {
    // render `home.ejs` with the list of posts
    res.render('home')
});

server.listen(8080, () => {
    console.log((new Date()) + ' Server is listening on port 8080');
});
webWS.listen(8081, () => {
    console.log((new Date()) + ' Server is listening on port 8081');
});
app.listen(8000, () => {
    console.log((new Date()) + ' Web server is listening on port 8000');
});

wsServer = new WebSocketServer({
    httpServer: server,
    // You should not use autoAcceptConnections for production
    // applications, as it defeats all standard cross-origin protection
    // facilities built into the protocol and the browser.  You should
    // *always* verify the connection's origin and decide whether or not
    // to accept it.
    autoAcceptConnections: false
});

htmlWS = new WebSocketServer({
    httpServer: webWS,
    autoAcceptConnections: false
});

function originIsAllowed(origin) {
    // put logic here to detect whether the specified origin is allowed.
    return true;
}

function pack(data) {
    return JSON.stringify(data);
}

function unpack(data) {
    return JSON.parse(data);
}

setInterval(() => {
    let skip = false;
    for (let id in webSockets) {
        webSockets[id].connection.send(pack({id: "heartbeat", room: webSockets[id].room}));
        // Skipping the initial load
        if (webSockets[id].room === "") skip = true;
    }

    if (skip) return;

    for (let room in activeRooms) {
        if (activeRooms.hasOwnProperty(room)) {
            if (!warningRooms.hasOwnProperty(room)) warningRooms[room] = 0;

            if (warningRooms[room] >= config.maxTickError) {
                console.log(`${room} does not work`);
                warningRooms[room] = 0;
            }

            if (!activeRooms[room]) {
                //console.log(`${room} has ${warningRooms[room]} warnings`);
                warningRooms[room] ++;
            }
        }
    }
}, config.heartbeat_interval * 1000);

wsServer.on('request', (request) => {
    if (!originIsAllowed(request.origin)) {
        // Make sure we only accept requests from an allowed origin
        request.reject();
        console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
        return;
    }

    webSockets[request.remoteAddress] = {room: '', connection: request.accept('echo-protocol', request.origin)};
    console.log((new Date()) + ' Connection accepted.');

    webSockets[request.remoteAddress].connection.on('message', (message) => {
        let data = unpack(message.utf8Data);
        if (data) {
            switch(data.id) {
               case 'heartbeat':
                    webSockets[request.remoteAddress].room = data.room;
                    if (!activeRooms[data.room]) {
                        activeRooms[data.room] = true;
                        warningRooms[data.room] = 0;
                        change = true;
                    }
                    break;
            }
        }
    });

    webSockets[request.remoteAddress].connection.on('close', (reasonCode, description) => {
        console.log((new Date()) + ' Peer ' + request.remoteAddress + ' disconnected.');
        activeRooms[webSockets[request.remoteAddress].room] = false;
        change = true;
        delete webSockets[request.remoteAddress];
    });
});

htmlWS.on('request', (request) => {
    let server = request.accept('echo-protocol', request.origin);
    console.log((new Date()) + ' Connection accepted.');

    // initial send
    server.send(pack({id: "Update", activeRooms: activeRooms}));

    setInterval(() => {
        if (change) {
            server.send(pack({id: "Update", activeRooms: activeRooms}));
            change = false;
        }
    }, 500);

    server.on('message', (message) => {
        if (message.utf8Data === "initial") {
            server.send(JSON.stringify({id: "initial", system: masterSystem}))
        }
        masterSystem = message.utf8Data === "true";
    });

    server.on('close', (reasonCode, description) => {
        console.log((new Date()) + ' Peer ' + request.remoteAddress + ' disconnected.');
    });
});