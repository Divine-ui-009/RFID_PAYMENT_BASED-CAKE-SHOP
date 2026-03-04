const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const mqtt = require('mqtt');
const http = require('http');
const WebSocket = require('ws');
const session = require('express-session');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const TEAM_ID = "Darius_Divine_Louise"; 
const MQTT_BROKER = "mqtt://broker.benax.rw:1883";

app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({ secret: 'bloom-secret', resave: false, saveUninitialized: true }));

const db = new sqlite3.Database('./rfid_database.db');

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (rfid_uid TEXT UNIQUE, name TEXT, balance REAL DEFAULT 0.0)`);
    // Table matches the seed script
    db.run(`CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, price REAL, stock INTEGER, icon TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, rfid_uid TEXT, type TEXT, amount REAL, details TEXT, time DATETIME DEFAULT CURRENT_TIMESTAMP)`);
});

// MQTT WebSocket Bridge
const mqttClient = mqtt.connect(MQTT_BROKER);
mqttClient.on('connect', () => mqttClient.subscribe(`rfid/${TEAM_ID}/card/status`));
mqttClient.on('message', (topic, msg) => {
    try {
        const data = JSON.parse(msg.toString());
        db.get("SELECT name, balance FROM users WHERE rfid_uid = ?", [data.uid], (err, user) => {
            const payload = JSON.stringify({ type: 'SCAN', uid: data.uid, known: !!user, name: user ? user.name : 'Unknown', balance: user ? user.balance : 0 });
            wss.clients.forEach(c => c.readyState === WebSocket.OPEN && c.send(payload));
        });
    } catch(e) {}
});

const auth = (req, res, next) => req.session.admin ? next() : res.redirect('/login');

app.get('/login', (req, res) => res.render('login', { error: null }));
app.post('/login', (req, res) => {
    if (req.body.username === 'admin' && req.body.password === '1234') { req.session.admin = true; res.redirect('/'); }
    else res.render('login', { error: 'Invalid' });
});
app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/login'); });

app.get('/', auth, (req, res) => {
    db.all("SELECT * FROM products", (err, products) => res.render('pos', { products }));
});

app.get('/inventory', auth, (req, res) => {
    db.all("SELECT * FROM products", (err, products) => res.render('inventory', { products }));
});

app.get('/users', auth, (req, res) => {
    db.all("SELECT * FROM users", (err, users) => res.render('users', { users }));
});

app.get('/history', auth, (req, res) => {
    const sql = `SELECT t.*, u.name as user_name FROM transactions t LEFT JOIN users u ON t.rfid_uid = u.rfid_uid ORDER BY t.time DESC`;
    db.all(sql, (err, logs) => res.render('history', { logs }));
});

app.post('/products/update', auth, (req, res) => {
    const { id, name, price, stock } = req.body;
    db.run("UPDATE products SET name=?, price=?, stock=? WHERE id=?", [name, price, stock, id], () => res.redirect('/inventory'));
});

app.post('/products/add', auth, (req, res) => {
    const { name, price, stock, icon } = req.body;
    db.run("INSERT INTO products (name, price, stock, icon) VALUES (?, ?, ?, ?)", [name, price, stock, icon], () => res.redirect('/inventory'));
});

app.post('/topup', auth, (req, res) => {
    const { uid, name, amount } = req.body;
    db.run("INSERT INTO users (rfid_uid, name, balance) VALUES (?, ?, ?) ON CONFLICT(rfid_uid) DO UPDATE SET balance = balance + ?, name = ?", 
    [uid, name, amount, amount, name], () => {
        db.run("INSERT INTO transactions (rfid_uid, type, amount, details) VALUES (?, 'TOPUP', ?, 'Deposit')", [uid, amount], () => res.redirect('/'));
    });
});

app.post('/checkout', auth, (req, res) => {
    const { uid, total, items } = req.body;
    db.get("SELECT name, balance FROM users WHERE rfid_uid = ?", [uid], (err, user) => {
        if (!user || user.balance < total) return res.json({ success: false });
        const newBal = user.balance - total;
        db.run("UPDATE users SET balance = ? WHERE rfid_uid = ?", [newBal, uid], () => {
            db.run("INSERT INTO transactions (rfid_uid, type, amount, details) VALUES (?, 'PAYMENT', ?, ?)", [uid, total, items], () => {
                res.json({ success: true, name: user.name, newBalance: newBal });
            });
        });
    });
});

server.listen(3000, () => console.log("Bloom & Batter running on Port 3000"));