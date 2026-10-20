const mysql = require('mysql2/promise');

const connection = mysql.createPool({
    host: 'mysql-usuarios',
    user: 'capasapp',
    password: 'admin',
    port: 3306,
    database: 'usuarios_db'
});

// CREAR USUARIO
async function crearUsuario(nombre, correo, password, rol) {
    const [resultado] = await connection.execute(
        `INSERT INTO usuario
        (nombre, correo, password, rol)
        VALUES (?, ?, ?, ?)`,
        [nombre, correo, password, rol]
    );

    return resultado;
}

// CONSULTAR TODOS
async function obtenerUsuarios() {
    const [usuarios] = await connection.execute(
        `SELECT id, nombre, correo, rol
         FROM usuario
         ORDER BY id ASC`
    );

    return usuarios;
}

// CONSULTAR POR ID
async function obtenerUsuarioPorId(id) {
    const [usuarios] = await connection.execute(
        `SELECT id, nombre, correo, rol
         FROM usuario
         WHERE id = ?`,
        [id]
    );

    return usuarios[0];
}

// CONSULTAR POR CORREO
async function obtenerUsuarioPorCorreo(correo) {
    const [usuarios] = await connection.execute(
        `SELECT id, nombre, correo, rol
         FROM usuario
         WHERE correo = ?`,
        [correo]
    );

    return usuarios[0];
}

// VALIDAR CREDENCIALES
async function validarCredenciales(correo, password) {
    const [usuarios] = await connection.execute(
        `SELECT id, nombre, correo, rol
         FROM usuario
         WHERE correo = ?
         AND password = ?`,
        [correo, password]
    );

    return usuarios[0];
}

// ACTUALIZAR
async function actualizarUsuario(
    id,
    nombre,
    correo,
    password,
    rol
) {
    const [resultado] = await connection.execute(
        `UPDATE usuario
         SET nombre = ?,
             correo = ?,
             password = ?,
             rol = ?
         WHERE id = ?`,
        [nombre, correo, password, rol, id]
    );

    return resultado;
}

// ELIMINAR
async function eliminarUsuario(id) {
    const [resultado] = await connection.execute(
        `DELETE FROM usuario
         WHERE id = ?`,
        [id]
    );

    return resultado;
}

module.exports = {
    crearUsuario,
    obtenerUsuarios,
    obtenerUsuarioPorId,
    obtenerUsuarioPorCorreo,
    validarCredenciales,
    actualizarUsuario,
    eliminarUsuario
};
