const fs = require('fs');
const path = require('path');
const https = require('https');
const express = require('express');
const next = require('next');
require('dotenv').config({ path: path.join(__dirname, '.env.local') }); // ← Load .env.local

const port = process.env.FRONTEND_PORT;
const IP = process.env.NEXT_PUBLIC_WS_SERVER_IP;
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const httpsOptions = {
    key: fs.readFileSync(path.join(__dirname, 'ssl', 'key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'ssl', 'cert.pem')),
};

app.prepare().then(() => {
    const server = express();

    server.all('*', (req, res) => {
        return handle(req, res);
    });

    https.createServer(httpsOptions, server).listen(port, IP, () => {
        console.log(`> HTTPS server ready on https://${IP}:${port}`);
    });
});

