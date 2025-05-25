const fs = require('fs');
const https = require('https');
const next = require('next');
const express = require('express');
const path = require('path');

const port = 3000;
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

    https.createServer(httpsOptions, server).listen(port, '192.168.1.167', () => {
        console.log(`> HTTPS server ready on https://192.168.1.167:${port}`);
    });
    
});

