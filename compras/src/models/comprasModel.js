const mysql = require('mysql2/promise');

const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;

if (!DB_USER || !DB_PASSWORD) {
    throw new Error('Faltan las variables DB_USER o DB_PASSWORD');
}

const connection = mysql.createPool({
    host: 'mysql-compras',
    user: DB_USER,
    password: DB_PASSWORD,
    port: 3306,
    database: 'compras_db',
    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 5,
    idleTimeout: 60000,
    queueLimit: 0,
    connectTimeout: 10000,
    enableKeepAlive: true
});

async function crearCompra(usuario_id, vehiculo_id, precio, metodo_pago) {
    const [resultado] = await connection.execute(
        `INSERT INTO compra
        (usuario_id, vehiculo_id, precio, estado, metodo_pago)
        VALUES (?, ?, ?, 'completada', ?)`,
        [usuario_id, vehiculo_id, precio, metodo_pago]
    );

    return resultado;
}

async function obtenerCompras() {
    const [compras] = await connection.execute(
        `SELECT id, usuario_id, vehiculo_id, precio, fecha, estado, metodo_pago
         FROM compra ORDER BY id ASC`
    );
    return compras;
}

async function obtenerCompraPorId(id) {
    const [compras] = await connection.execute(
        `SELECT id, usuario_id, vehiculo_id, precio, fecha, estado, metodo_pago
         FROM compra WHERE id = ?`,
        [id]
    );
    return compras[0];
}

async function obtenerComprasPorUsuario(usuario_id) {
    const [compras] = await connection.execute(
        `SELECT id, usuario_id, vehiculo_id, precio, fecha, estado, metodo_pago
         FROM compra WHERE usuario_id = ? ORDER BY id ASC`,
        [usuario_id]
    );
    return compras;
}

module.exports = {
    crearCompra,
    obtenerCompras,
    obtenerCompraPorId,
    obtenerComprasPorUsuario
};
