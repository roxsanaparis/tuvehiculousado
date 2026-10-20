const express = require('express');
const router = express.Router();

const usuariosModel = require('../models/usuariosModel');

// ==========================================
// CREAR USUARIO
// POST /api/usuarios
// ==========================================
router.post('/api/usuarios', async (req, res) => {
    try {
        const { nombre, correo, password, rol } = req.body;

        if (!nombre || !correo || !password || !rol) {
            return res.status(400).json({
                error: 'Todos los campos son obligatorios'
            });
        }

        // Verificar si ya existe el correo
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
            rol
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
// GET /api/usuarios
// ==========================================
router.get('/api/usuarios', async (req, res) => {
    try {
        const usuarios =
            await usuariosModel.obtenerUsuarios();

        res.status(200).json(usuarios);

    } catch (error) {
        console.error('Error al consultar usuarios:', error);

        res.status(500).json({
            error: 'Error al consultar usuarios'
        });
    }
});


// ==========================================
// VALIDAR CREDENCIALES
// GET /api/usuarios/validar
// ==========================================
// IMPORTANTE:
// Esta ruta debe estar ANTES de /:id
router.get('/api/usuarios/validar', async (req, res) => {
    try {
        const { correo, password } = req.query;

        if (!correo || !password) {
            return res.status(400).json({
                error: 'Correo y contraseña son obligatorios'
            });
        }

        const usuario =
            await usuariosModel.validarCredenciales(
                correo,
                password
            );

        if (!usuario) {
            return res.status(401).json({
                mensaje: 'Credenciales incorrectas'
            });
        }

        res.status(200).json({
            mensaje: 'Credenciales correctas',
            usuario: usuario
        });

    } catch (error) {
        console.error(
            'Error al validar credenciales:',
            error
        );

        res.status(500).json({
            error: 'Error al validar las credenciales'
        });
    }
});


// ==========================================
// CONSULTAR UN USUARIO
// GET /api/usuarios/:id
// ==========================================
router.get('/api/usuarios/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const usuario =
            await usuariosModel.obtenerUsuarioPorId(id);

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
// ACTUALIZAR USUARIO
// PUT /api/usuarios/:id
// ==========================================
router.put('/api/usuarios/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            nombre,
            correo,
            password,
            rol
        } = req.body;

        if (!nombre || !correo || !password || !rol) {
            return res.status(400).json({
                error: 'Todos los campos son obligatorios'
            });
        }

        const usuario =
            await usuariosModel.obtenerUsuarioPorId(id);

        if (!usuario) {
            return res.status(404).json({
                error: 'Usuario no encontrado'
            });
        }

        const correoUsado =
            await usuariosModel.obtenerUsuarioPorCorreo(correo);

        if (correoUsado && correoUsado.id != id) {
            return res.status(400).json({
                error: 'Ese correo ya pertenece a otro usuario'
            });
        }

        await usuariosModel.actualizarUsuario(
            id,
            nombre,
            correo,
            password,
            rol
        );

        res.status(200).json({
            mensaje: 'Usuario actualizado correctamente'
        });

    } catch (error) {
        console.error(
            'Error al actualizar usuario:',
            error
        );

        res.status(500).json({
            error: 'Error al actualizar usuario'
        });
    }
});


// ==========================================
// ELIMINAR USUARIO
// DELETE /api/usuarios/:id
// ==========================================
router.delete('/api/usuarios/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const resultado =
            await usuariosModel.eliminarUsuario(id);

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                error: 'Usuario no encontrado'
            });
        }

        res.status(200).json({
            mensaje: 'Usuario eliminado correctamente'
        });

    } catch (error) {
        console.error(
            'Error al eliminar usuario:',
            error
        );

        res.status(500).json({
            error: 'Error al eliminar usuario'
        });
    }
});


module.exports = router;
