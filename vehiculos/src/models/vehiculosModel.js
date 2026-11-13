const mysql = require('mysql2/promise');

const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;

if (!DB_USER || !DB_PASSWORD) {
    throw new Error('Faltan las variables DB_USER o DB_PASSWORD');
}

const connection = mysql.createPool({
    host: 'mysql-vehiculos',
    user: DB_USER,
    password: DB_PASSWORD,
    port: 3306,
    database: 'vehiculos_db',
    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 5,
    idleTimeout: 60000,
    queueLimit: 0,
    connectTimeout: 10000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

// CREAR VEHÍCULO
async function crearVehiculo(datos) {
    const {
        tipo,
        marca,
        modelo,
        anio,
        combustible,
        transmision,
        kilometraje,
        precio,
        estado,
        cantidad,
        descripcion,
        usuario_id
    } = datos;

    const nombre = `${tipo} ${marca} ${modelo} (${anio})`;

    const [resultado] = await connection.execute(
        `INSERT INTO producto
        (
            tipo, marca, modelo, anio, nombre,
            combustible, transmision, kilometraje,
            precio, estado, cantidad, descripcion, usuario_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            tipo,
            marca,
            modelo,
            anio,
            nombre,
            combustible,
            transmision,
            kilometraje,
            precio,
            estado,
            cantidad,
            descripcion || '',
            usuario_id
        ]
    );

    return resultado;
}

// CONSULTAR TODOS LOS VEHÍCULOS
async function obtenerVehiculos() {
    const [vehiculos] = await connection.execute(
        `SELECT
            id,
            id AS id_vehiculo,
            marca,
            modelo,
            anio,
            tipo,
            combustible,
            transmision,
            kilometraje,
            precio,
            estado,
            cantidad,
            nombre,
            descripcion,
            usuario_id
         FROM producto
         ORDER BY id ASC`
    );

    return vehiculos;
}

// CONSULTAR VEHÍCULO POR ID
async function obtenerVehiculoPorId(id) {
    const [vehiculos] = await connection.execute(
        `SELECT
            id,
            id AS id_vehiculo,
            marca,
            modelo,
            anio,
            tipo,
            combustible,
            transmision,
            kilometraje,
            precio,
            estado,
            cantidad,
            nombre,
            descripcion,
            usuario_id
         FROM producto
         WHERE id = ?`,
        [id]
    );

    return vehiculos[0];
}

// ACTUALIZAR VEHÍCULO
async function actualizarVehiculo(id, datos) {
    const {
        tipo,
        marca,
        modelo,
        anio,
        combustible,
        transmision,
        kilometraje,
        precio,
        estado,
        cantidad,
        descripcion
    } = datos;

    const nombre = `${tipo} ${marca} ${modelo} (${anio})`;

    const [resultado] = await connection.execute(
        `UPDATE producto
         SET
            tipo = ?,
            marca = ?,
            modelo = ?,
            anio = ?,
            nombre = ?,
            combustible = ?,
            transmision = ?,
            kilometraje = ?,
            precio = ?,
            estado = ?,
            cantidad = ?,
            descripcion = ?
         WHERE id = ?`,
        [
            tipo,
            marca,
            modelo,
            anio,
            nombre,
            combustible,
            transmision,
            kilometraje,
            precio,
            estado,
            cantidad,
            descripcion || '',
            id
        ]
    );

    return resultado;
}

// ELIMINAR VEHÍCULO
async function eliminarVehiculo(id) {
    const [resultado] = await connection.execute(
        `DELETE FROM producto WHERE id = ?`,
        [id]
    );

    return resultado;
}

// DISMINUIR CANTIDAD DESPUÉS DE UNA COMPRA
async function disminuirCantidad(id) {
    const [resultado] = await connection.execute(
        `UPDATE producto
         SET cantidad = cantidad - 1
         WHERE id = ?
         AND cantidad > 0`,
        [id]
    );

    return resultado;
}

// CONSULTAR PROPIETARIO
async function obtenerPropietarioVehiculo(id) {
    const [vehiculos] = await connection.execute(
        `SELECT usuario_id
         FROM producto
         WHERE id = ?`,
        [id]
    );

    return vehiculos[0];
}

module.exports = {
    crearVehiculo,
    obtenerVehiculos,
    obtenerVehiculoPorId,
    actualizarVehiculo,
    eliminarVehiculo,
    disminuirCantidad,
    obtenerPropietarioVehiculo
};
