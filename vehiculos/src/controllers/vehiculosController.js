const express = require('express');
const axios = require('axios');

const {
    crearVehiculo,
    obtenerVehiculos,
    obtenerVehiculoPorId,
    actualizarVehiculo,
    eliminarVehiculo,
    disminuirCantidad,
    obtenerPropietarioVehiculo
} = require('../models/vehiculosModel');

const router = express.Router();

const URL_USUARIOS =
    process.env.USUARIOS_URL || 'http://usuarios:3010/api/usuarios';

// =====================================================
// FUNCIÓN PARA CONSULTAR EL USUARIO MEDIANTE AXIOS
// =====================================================

async function obtenerUsuario(idUsuario) {
    try {
        const respuesta = await axios.get(
            `${URL_USUARIOS}/${idUsuario}`
        );

        return respuesta.data;

    } catch (error) {

        if (error.response) {
            const respuestaError = new Error(
                'No se pudo consultar el usuario'
            );

            respuestaError.status = error.response.status;
            throw respuestaError;
        }

        const respuestaError = new Error(
            'El microservicio Usuarios no está disponible'
        );

        respuestaError.status = 503;
        throw respuestaError;
    }
}


// =====================================================
// POST - CREAR VEHÍCULO
// =====================================================

router.post('/api/vehiculos', async (req, res) => {

    try {

        const {
            tipo,
            marca,
            modelo,
            anio,
            precio,
            cantidad,
            descripcion,
            usuario_id
        } = req.body;


        if (
            !tipo ||
            !marca ||
            !modelo ||
            !anio ||
            precio === undefined ||
            cantidad === undefined ||
            !descripcion ||
            !usuario_id
        ) {
            return res.status(400).json({
                mensaje: 'Todos los campos son obligatorios'
            });
        }


        // Consultamos al usuario mediante Axios
        const usuario = await obtenerUsuario(usuario_id);


        // Solo administrador y vendedor pueden crear vehículos
        if (
            usuario.rol !== 'administrador' &&
            usuario.rol !== 'vendedor'
        ) {
            return res.status(403).json({
                mensaje: 'El usuario no tiene permiso para crear vehículos',
                rol: usuario.rol
            });
        }


        const resultado = await crearVehiculo(
            tipo,
            marca,
            modelo,
            anio,
            precio,
            cantidad,
            descripcion,
            usuario_id
        );


        res.status(201).json({
            mensaje: 'Vehículo creado correctamente',
            id: resultado.insertId,
            usuario: usuario
        });

    } catch (error) {

        console.error(error);

        res.status(error.status || 500).json({
            mensaje: error.message || 'Error al crear vehículo'
        });
    }
});


// =====================================================
// GET - CONSULTAR TODOS LOS VEHÍCULOS
// =====================================================

router.get('/api/vehiculos', async (req, res) => {

    try {

        const vehiculos = await obtenerVehiculos();

        res.status(200).json(vehiculos);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            mensaje: 'Error al consultar vehículos'
        });
    }
});


// =====================================================
// GET - CONSULTAR VEHÍCULO POR ID
// =====================================================

router.get('/api/vehiculos/:id', async (req, res) => {

    try {

        const { id } = req.params;

        const vehiculo = await obtenerVehiculoPorId(id);


        if (!vehiculo) {
            return res.status(404).json({
                mensaje: 'Vehículo no encontrado'
            });
        }


        res.status(200).json(vehiculo);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            mensaje: 'Error al consultar vehículo'
        });
    }
});


// =====================================================
// GET - CONSULTAR INFORMACIÓN DE UN USUARIO CON AXIOS
// =====================================================

router.get('/api/vehiculos/usuario/:id', async (req, res) => {

    try {

        const { id } = req.params;

        const usuario = await obtenerUsuario(id);


        res.status(200).json({
            microservicio: 'Vehículos',
            relacion: 'Vehículos → Axios → Usuarios',
            usuario: usuario
        });

    } catch (error) {

        console.error(error);

        res.status(error.status || 500).json({
            mensaje: error.message || 'Error al consultar usuario'
        });
    }
});


// =====================================================
// PUT - ACTUALIZAR VEHÍCULO
// =====================================================

router.put('/api/vehiculos/:id', async (req, res) => {

    try {

        const { id } = req.params;

        const {
            tipo,
            marca,
            modelo,
            anio,
            precio,
            cantidad,
            descripcion,
            usuario_id
        } = req.body;


        if (
            !tipo ||
            !marca ||
            !modelo ||
            !anio ||
            precio === undefined ||
            cantidad === undefined ||
            !descripcion ||
            !usuario_id
        ) {
            return res.status(400).json({
                mensaje: 'Todos los campos son obligatorios'
            });
        }


        // Consultar usuario mediante Axios
        const usuario = await obtenerUsuario(usuario_id);


        // Verificar que el vehículo exista
        const vehiculo = await obtenerVehiculoPorId(id);


        if (!vehiculo) {
            return res.status(404).json({
                mensaje: 'Vehículo no encontrado'
            });
        }


        // Administrador puede actualizar cualquier vehículo
        if (usuario.rol === 'administrador') {

            await actualizarVehiculo(
                id,
                tipo,
                marca,
                modelo,
                anio,
                precio,
                cantidad,
                descripcion
            );

            return res.status(200).json({
                mensaje: 'Vehículo actualizado correctamente',
                usuario: usuario
            });
        }


        // Vendedor solamente puede actualizar sus vehículos
        if (usuario.rol === 'vendedor') {

            if (vehiculo.usuario_id !== usuario_id) {

                return res.status(403).json({
                    mensaje: 'El vendedor solo puede actualizar sus propios vehículos'
                });
            }


            await actualizarVehiculo(
                id,
                tipo,
                marca,
                modelo,
                anio,
                precio,
                cantidad,
                descripcion
            );

            return res.status(200).json({
                mensaje: 'Vehículo actualizado correctamente',
                usuario: usuario
            });
        }


        // Cliente no puede actualizar
        return res.status(403).json({
            mensaje: 'Los clientes no pueden actualizar vehículos'
        });

    } catch (error) {

        console.error(error);

        res.status(error.status || 500).json({
            mensaje: error.message || 'Error al actualizar vehículo'
        });
    }
});


// =====================================================
// DELETE - ELIMINAR VEHÍCULO
// =====================================================

router.delete('/api/vehiculos/:id', async (req, res) => {

    try {

        const { id } = req.params;

        const { usuario_id } = req.body;


        if (!usuario_id) {
            return res.status(400).json({
                mensaje: 'Debe indicar el usuario que realiza la operación'
            });
        }


        // Consultar usuario mediante Axios
        const usuario = await obtenerUsuario(usuario_id);


        // Verificar vehículo
        const vehiculo = await obtenerVehiculoPorId(id);


        if (!vehiculo) {
            return res.status(404).json({
                mensaje: 'Vehículo no encontrado'
            });
        }


        // Administrador puede eliminar cualquier vehículo
        if (usuario.rol === 'administrador') {

            await eliminarVehiculo(id);

            return res.status(200).json({
                mensaje: 'Vehículo eliminado correctamente',
                usuario: usuario
            });
        }


        // Vendedor solo puede eliminar sus propios vehículos
        if (usuario.rol === 'vendedor') {

            if (vehiculo.usuario_id !== usuario_id) {

                return res.status(403).json({
                    mensaje: 'El vendedor solo puede eliminar sus propios vehículos'
                });
            }


            await eliminarVehiculo(id);

            return res.status(200).json({
                mensaje: 'Vehículo eliminado correctamente',
                usuario: usuario
            });
        }


        // Cliente no puede eliminar
        return res.status(403).json({
            mensaje: 'Los clientes no pueden eliminar vehículos'
        });

    } catch (error) {

        console.error(error);

        res.status(error.status || 500).json({
            mensaje: error.message || 'Error al eliminar vehículo'
        });
    }
});


// =====================================================
// PUT - DISMINUIR CANTIDAD
// =====================================================

router.put('/api/vehiculos/:id/disminuir', async (req, res) => {

    try {

        const { id } = req.params;

        const vehiculo = await obtenerVehiculoPorId(id);

        if (!vehiculo) {
            return res.status(404).json({
                mensaje: 'Vehículo no encontrado'
            });
        }

        if (Number(vehiculo.cantidad) <= 0) {
            return res.status(400).json({
                mensaje: 'El vehículo no está disponible'
            });
        }

        const resultado = await disminuirCantidad(id);

        if (resultado.affectedRows === 0) {
            return res.status(400).json({
                mensaje: 'No se pudo disminuir la cantidad'
            });
        }

        return res.status(200).json({
            mensaje: 'Cantidad disminuida correctamente',
            vehiculo_id: Number(id),
            cantidad_anterior: Number(vehiculo.cantidad),
            cantidad_nueva: Number(vehiculo.cantidad) - 1
        });

    } catch (error) {

        console.error(
            'Error al disminuir cantidad:',
            error
        );

        return res.status(error.status || 500).json({
            mensaje:
                error.message ||
                'Error al disminuir cantidad'
        });
    }
});

module.exports = router;
