const mysql = require('mysql2/promise');

const connection = mysql.createPool({
    host: 'mysql-compras',
    user: 'capasapp',
    password: 'admin',
    port: 3306,
    database: 'compras_db'
});
async function crearCompra(usuario_id, vehiculo_id, precio) {
    const [resultado] = await connection.execute(
        `INSERT INTO compra
        (usuario_id, vehiculo_id, precio)
        VALUES (?, ?, ?)`,
        [
            usuario_id,
            vehiculo_id,
            precio
        ]
    );

    return resultado;
}

async function obtenerCompras() {
    const [compras] = await connection.execute(
        `SELECT id, usuario_id, vehiculo_id, precio, fecha
         FROM compra
         ORDER BY id ASC`
    );

    return compras;
}

async function obtenerCompraPorId(id) {
    const [compras] = await connection.execute(
        `SELECT id, usuario_id, vehiculo_id, precio, fecha
         FROM compra
         WHERE id = ?`,
        [id]
    );

    return compras[0];
}

async function obtenerComprasPorUsuario(usuario_id) {
    const [compras] = await connection.execute(
        `SELECT id, usuario_id, vehiculo_id, precio, fecha
         FROM compra
         WHERE usuario_id = ?
         ORDER BY id ASC`,
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
