
const express = require('express');
const router = express.Router();

// Notificar cambios exitosos al servicio de analítica en SU2
const http = require('http');

router.use((req, res, next) => {
    const metodos = ['POST', 'PUT', 'PATCH', 'DELETE'];

    if (metodos.includes(req.method)) {
        res.on('finish', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const datos = JSON.stringify({
                    servicio: req.baseUrl || req.path,
                    metodo: req.method,
                    ruta: req.originalUrl,
                    fecha: new Date().toISOString()
                });

                const peticion = http.request({
                    hostname: '192.168.100.3',
                    port: 5050,
                    path: '/evento',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(datos)
                    },
                    timeout: 3000
                });

                peticion.on('error', error =>
                    console.error('Aviso: no se notificó a Spark:', error.message)
                );

                peticion.on('timeout', () => peticion.destroy());
                peticion.write(datos);
                peticion.end();
            }
        });
    }

    next();
});


const jwt = require('jsonwebtoken');
const fs = require('fs');

const usuariosModel = require('../models/usuariosModel');

// Leer el secreto de Docker Swarm
function obtenerSecretoJWT() {
    return fs.readFileSync('/run/secrets/jwt_secret', 'utf8').trim();
}

// ==========================================
// CREAR USUARIO
// ==========================================

router.post('/api/usuarios', async (req, res) => {
    try {
        const {
            nombre,
            correo,
            password,
            rol,
            ciudad,
            telefono
        } = req.body;

        if (!nombre || !correo || !password || !rol || !ciudad || !telefono) {
            return res.status(400).json({
                error: 'Todos los campos son obligatorios'
            });
        }

        const usuarioExistente =
            await usuariosModel.obtenerUsuarioPorCorreo(correo);

        if (usuarioExistente) {
            return res.status(400).json({
                error: 'Ya existe un usuario con ese correo'
            });
        }

        await usuariosModel.crearUsuario(
            nombre,
            correo,
            password,
            rol,
            ciudad,
            telefono
        );

        res.status(201).json({
            mensaje: 'Usuario registrado correctamente'
        });

    } catch (error) {
        console.error('Error al registrar usuario:', error);

        res.status(500).json({
            error: 'Error al registrar usuario'
        });
    }
});

// ==========================================
// CONSULTAR TODOS LOS USUARIOS
// ==========================================

router.get('/api/usuarios', async (req, res) => {
    try {
        const usuarios = await usuariosModel.obtenerUsuarios();

        res.status(200).json(usuarios);

    } catch (error) {
        console.error('Error al consultar usuarios:', error);

        res.status(500).json({
            error: 'Error al consultar usuarios'
        });
    }
});

// ==========================================
// LOGIN Y GENERACIÓN DEL TOKEN JWT
// ==========================================

router.get('/api/usuarios/validar', async (req, res) => {
    try {
        const { correo, password } = req.query;

        if (!correo || !password) {
            return res.status(400).json({
                error: 'Correo y contraseña son obligatorios'
            });
        }

        const usuario = await usuariosModel.validarCredenciales(
            correo,
            password
        );

        if (!usuario) {
            return res.status(401).json({
                mensaje: 'Credenciales incorrectas'
            });
        }

        const token = jwt.sign(
            {
                sub: String(usuario.id),
                rol: usuario.rol
            },
            obtenerSecretoJWT(),
            {
                expiresIn: '8h'
            }
        );

        res.status(200).json({
            mensaje: 'Credenciales correctas',
            usuario,
            token
        });

    } catch (error) {
        console.error('ERROR LOGIN:', error);

        res.status(500).json({
            error: 'Error al validar las credenciales'
        });
    }
});

// ==========================================
// CONSULTAR USUARIO POR ID
// ==========================================

router.get('/api/usuarios/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        const usuario = await usuariosModel.obtenerUsuarioPorId(id);

        if (!usuario) {
            return res.status(404).json({
                error: 'Usuario no encontrado'
            });
        }

        res.status(200).json(usuario);

    } catch (error) {
        console.error('Error al consultar usuario:', error);

        res.status(500).json({
            error: 'Error al consultar usuario'
        });
    }
});

// ==========================================
// ACTUALIZAR PERFIL
// ==========================================

router.put('/api/usuarios/:id/perfil', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { ciudad, telefono } = req.body;

        if (!ciudad || !telefono) {
            return res.status(400).json({
                error: 'Ciudad y teléfono son obligatorios'
            });
        }

        const usuario = await usuariosModel.obtenerUsuarioPorId(id);

        if (!usuario) {
            return res.status(404).json({
                error: 'Usuario no encontrado'
            });
        }

        await usuariosModel.actualizarPerfil(id, ciudad, telefono);

        res.status(200).json({
            mensaje: 'Perfil actualizado correctamente'
        });

    } catch (error) {
        console.error('Error al actualizar perfil:', error);

        res.status(500).json({
            error: 'Error al actualizar perfil'
        });
    }
});

// ==========================================
// ACTUALIZAR USUARIO
// ==========================================

router.put('/api/usuarios/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        const {
            nombre,
            correo,
            password,
            rol,
            ciudad,
            telefono,
            estado
        } = req.body;

        if (!nombre || !correo || !password || !rol ||
            !ciudad || !telefono || !estado) {
            return res.status(400).json({
                error: 'Todos los campos son obligatorios'
            });
        }

        const usuario = await usuariosModel.obtenerUsuarioPorId(id);

        if (!usuario) {
            return res.status(404).json({
                error: 'Usuario no encontrado'
            });
        }

        const usuarioCorreo =
            await usuariosModel.obtenerUsuarioPorCorreo(correo);

        if (usuarioCorreo && usuarioCorreo.id !== id) {
            return res.status(400).json({
                error: 'Ese correo ya pertenece a otro usuario'
            });
        }

        await usuariosModel.actualizarUsuario(
            id,
            nombre,
            correo,
            password,
            rol,
            ciudad,
            telefono,
            estado
        );

        res.status(200).json({
            mensaje: 'Usuario actualizado correctamente'
        });

    } catch (error) {
        console.error('Error al actualizar usuario:', error);

        res.status(500).json({
            error: 'Error al actualizar usuario'
        });
    }
});

// ==========================================
// ELIMINAR USUARIO
// ==========================================

router.delete('/api/usuarios/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        const resultado = await usuariosModel.eliminarUsuario(id);

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                error: 'Usuario no encontrado'
            });
        }

        res.status(200).json({
            mensaje: 'Usuario eliminado correctamente'
        });

    } catch (error) {
        console.error('Error al eliminar usuario:', error);

        res.status(500).json({
            error: 'Error al eliminar usuario'
        });
    }
});

module.exports = router;
