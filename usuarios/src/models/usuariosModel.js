const mysql = require('mysql2/promise');

const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;

if (!DB_USER || !DB_PASSWORD) {
    throw new Error('Faltan las variables DB_USER o DB_PASSWORD');
}

const connection = mysql.createPool({
    host: 'mysql-usuarios',
    user: DB_USER,
    password: DB_PASSWORD,
    port: 3306,
    database: 'usuarios_db',
    charset: 'utf8mb4',

    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 5,
    idleTimeout: 60000,
    queueLimit: 0,
    connectTimeout: 10000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

// CREAR USUARIO
async function crearUsuario(nombre, correo, password, rol, ciudad, telefono) {
    const [resultado] = await connection.execute(
        `INSERT INTO usuario
        (nombre, correo, password, rol, ciudad, telefono)
        VALUES (?, ?, ?, ?, ?, ?)`,
        [nombre, correo, password, rol, ciudad, telefono]
    );

    return resultado;
}

// CONSULTAR TODOS LOS USUARIOS
async function obtenerUsuarios() {
    const [usuarios] = await connection.execute(
        `SELECT id, nombre, correo, rol, ciudad, telefono,
                fecha_registro, estado
         FROM usuario
         ORDER BY id ASC`
    );

    return usuarios;
}

// CONSULTAR USUARIO POR ID
async function obtenerUsuarioPorId(id) {
    const [usuarios] = await connection.execute(
        `SELECT id, nombre, correo, rol, ciudad, telefono,
                fecha_registro, estado
         FROM usuario
         WHERE id = ?`,
        [id]
    );

    return usuarios[0];
}

// CONSULTAR USUARIO POR CORREO
async function obtenerUsuarioPorCorreo(correo) {
    const [usuarios] = await connection.execute(
        `SELECT id, nombre, correo, password, rol, ciudad,
                telefono, fecha_registro, estado
         FROM usuario
         WHERE correo = ?`,
        [correo]
    );

    return usuarios[0];
}

// VALIDAR CREDENCIALES
async function validarCredenciales(correo, password) {
    const [usuarios] = await connection.execute(
        `SELECT id, nombre, correo, rol, ciudad, telefono
         FROM usuario
         WHERE correo = ?
         AND password = ?
         AND estado = 'activo'`,
        [correo, password]
    );

    return usuarios[0];
}

// ACTUALIZAR USUARIO
async function actualizarUsuario(
    id, nombre, correo, password, rol, ciudad, telefono, estado
) {
    const [resultado] = await connection.execute(
        `UPDATE usuario
         SET nombre = ?, correo = ?, password = ?, rol = ?,
             ciudad = ?, telefono = ?, estado = ?
         WHERE id = ?`,
        [nombre, correo, password, rol, ciudad, telefono, estado, id]
    );

    return resultado;
}

// ACTUALIZAR PERFIL
async function actualizarPerfil(id, ciudad, telefono) {
    const [resultado] = await connection.execute(
        `UPDATE usuario
         SET ciudad = ?, telefono = ?
         WHERE id = ?`,
        [ciudad, telefono, id]
    );

    return resultado;
}

// ELIMINAR USUARIO
async function eliminarUsuario(id) {
    const [resultado] = await connection.execute(
        `DELETE FROM usuario WHERE id = ?`,
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
    actualizarPerfil,
    eliminarUsuario
};
