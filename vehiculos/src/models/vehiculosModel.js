const mysql = require('mysql2/promise');

const connection = mysql.createPool({
    host: 'mysql-vehiculos',
    user: 'capasapp',
    password: 'admin',
    port: 3306,
    database: 'vehiculos_db'
});
async function crearVehiculo(
    tipo,
    marca,
    modelo,
    anio,
    precio,
    cantidad,
    descripcion,
    usuario_id
) {
    const nombre = `${tipo} ${marca} ${modelo} (${anio})`;

    const [resultado] = await connection.execute(
        `INSERT INTO producto
        (tipo, marca, modelo, anio, nombre, precio, cantidad, descripcion, usuario_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            tipo,
            marca,
            modelo,
            anio,
            nombre,
            precio,
            cantidad,
            descripcion,
            usuario_id
        ]
    );

    return resultado;
}

async function obtenerVehiculos() {
    const [vehiculos] = await connection.execute(
        `SELECT id, nombre, precio, cantidad,
                tipo, marca, modelo, anio, descripcion, usuario_id
         FROM producto
         ORDER BY id ASC`
    );

    return vehiculos;
}

async function obtenerVehiculoPorId(id) {
    const [vehiculos] = await connection.execute(
        `SELECT id, nombre, precio, cantidad,
                tipo, marca, modelo, anio, descripcion, usuario_id
         FROM producto
         WHERE id = ?`,
        [id]
    );

    return vehiculos[0];
}

async function actualizarVehiculo(
    id,
    tipo,
    marca,
    modelo,
    anio,
    precio,
    cantidad,
    descripcion
) {
    const nombre = `${tipo} ${marca} ${modelo} (${anio})`;

    const [resultado] = await connection.execute(
        `UPDATE producto
         SET tipo = ?,
             marca = ?,
             modelo = ?,
             anio = ?,
             nombre = ?,
             precio = ?,
             cantidad = ?,
             descripcion = ?
         WHERE id = ?`,
        [
            tipo,
            marca,
            modelo,
            anio,
            nombre,
            precio,
            cantidad,
            descripcion,
            id
        ]
    );

    return resultado;
}

async function eliminarVehiculo(id) {
    const [resultado] = await connection.execute(
        `DELETE FROM producto
         WHERE id = ?`,
        [id]
    );

    return resultado;
}

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
