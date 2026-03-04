const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./rfid_database.db');

const products = [
    { name: 'Velvet Dream Cake', price: 5.50, stock: 50, icon: '🍰' },
    { name: 'Midnight Cocoa', price: 4.75, stock: 40, icon: '🍫' },
    { name: 'Lemon Zest Tart', price: 3.50, stock: 30, icon: '🍋' },
    { name: 'Strawberry Shortcake', price: 5.00, stock: 25, icon: '🍓' },
    { name: 'Carrot Delight', price: 4.25, stock: 35, icon: '🥕' },
    { name: 'Golden Croissant', price: 2.75, stock: 60, icon: '🥐' },
    { name: 'Pain au Chocolat', price: 3.25, stock: 45, icon: '🥖' },
    { name: 'Glazed Orbit Donut', price: 2.50, stock: 100, icon: '🍩' },
    { name: 'Berry Danish', price: 3.80, stock: 20, icon: '🫐' },
    { name: 'Cinnamon Swirl', price: 3.00, stock: 50, icon: '🌀' },
    { name: 'Choco-Chip Monster', price: 1.50, stock: 150, icon: '🍪' },
    { name: 'Rainbow Macaron', price: 2.00, stock: 80, icon: '🌈' },
    { name: 'Oatmeal Raisin', price: 1.75, stock: 60, icon: '🌾' },
    { name: 'Matcha Greenie', price: 2.25, stock: 40, icon: '🍵' },
    { name: 'Salted Brownie', price: 3.15, stock: 30, icon: '🍮' },
    { name: 'Vanilla Bean Latte', price: 4.50, stock: 200, icon: '☕' },
    { name: 'Cold Brew Spark', price: 4.00, stock: 100, icon: '🧊' },
    { name: 'Matcha Whisk', price: 4.80, stock: 60, icon: '🌿' },
    { name: 'Hot Cocoa Clouds', price: 3.50, stock: 100, icon: '☁️' },
    { name: 'Earl Grey Mist', price: 3.20, stock: 90, icon: '🫖' }
];

db.serialize(() => {
    // Drop and recreate to ensure 'icon' exists
    db.run("DROP TABLE IF EXISTS products");
    db.run("CREATE TABLE products (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, price REAL, stock INTEGER, icon TEXT)");
    
    const stmt = db.prepare("INSERT INTO products (name, price, stock, icon) VALUES (?, ?, ?, ?)");
    products.forEach(p => stmt.run(p.name, p.price, p.stock, p.icon));
    stmt.finalize();
    console.log("✅ 20 Bloom & Batter products seeded successfully!");
});
db.close();