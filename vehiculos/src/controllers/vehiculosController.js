const express = require('express');
const axios = require('axios');

const {
    crearVehiculo,
    obtenerVehiculos,
    obtenerVehiculoPorId,
    actualizarVehiculo,
    eliminarVehiculo,
    disminuirCantidad
} = require('../models/vehiculosModel');

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



const URL_USUARIOS =
    process.env.USUARIOS_URL || 'http://usuarios:3010/api/usuarios';

// NORMALIZAR ROLES
function normalizarRol(rol) {
    return String(rol || '').trim().toLowerCase();
}

function esAdministrador(rol) {
    const rolNormalizado = normalizarRol(rol);

    return rolNormalizado === 'admin' ||
           rolNormalizado === 'administrador';
}

// CONSULTAR USUARIO MEDIANTE AXIOS
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

// VALIDAR DATOS DEL VEHÍCULO
function validarVehiculo(datos) {
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
        cantidad
    } = datos;

    if (
        !tipo ||
        !marca ||
        !modelo ||
        !anio ||
        !combustible ||
        !transmision ||
        kilometraje === undefined ||
        precio === undefined ||
        !estado ||
        cantidad === undefined
    ) {
        return 'Todos los campos del vehículo son obligatorios';
    }

    if (
        !Number.isInteger(Number(anio)) ||
        Number(anio) < 1900 ||
        Number(anio) > new Date().getFullYear() + 1
    ) {
        return 'El año del vehículo no es válido';
    }

    if (
        !Number.isFinite(Number(kilometraje)) ||
        Number(kilometraje) < 0
    ) {
        return 'El kilometraje no es válido';
    }

    if (
        !Number.isFinite(Number(precio)) ||
        Number(precio) <= 0
    ) {
        return 'El precio debe ser mayor que cero';
    }

    if (
        !Number.isInteger(Number(cantidad)) ||
        Number(cantidad) < 0
    ) {
        return 'La cantidad no es válida';
    }

    return null;
}

// =====================================================
// POST - CREAR VEHÍCULO
// =====================================================

router.post('/api/vehiculos', async (req, res) => {
    try {
        const datos = req.body;
        const { usuario_id } = datos;

        const errorValidacion = validarVehiculo(datos);

        if (errorValidacion) {
            return res.status(400).json({
                mensaje: errorValidacion
            });
        }

        if (!usuario_id) {
            return res.status(400).json({
                mensaje: 'Debe indicar el usuario que registra el vehículo'
            });
        }

        const usuario = await obtenerUsuario(usuario_id);
        const rol = normalizarRol(usuario.rol);

        if (!esAdministrador(rol) && rol !== 'vendedor') {
            return res.status(403).json({
                mensaje: 'El usuario no tiene permiso para crear vehículos'
            });
        }

        const resultado = await crearVehiculo(datos);

        return res.status(201).json({
            mensaje: 'Vehículo creado correctamente',
            id: resultado.insertId,
            id_vehiculo: resultado.insertId,
            usuario: usuario
        });

    } catch (error) {
        console.error('Error al crear vehículo:', error);

        return res.status(error.status || 500).json({
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

        return res.status(200).json(vehiculos);

    } catch (error) {
        console.error('Error al consultar vehículos:', error);

        return res.status(500).json({
            mensaje: 'Error al consultar vehículos'
        });
    }
});

// =====================================================
// GET - CONSULTAR VEHÍCULO POR ID
// =====================================================

router.get('/api/vehiculos/:id', async (req, res) => {
    try {
        const vehiculo = await obtenerVehiculoPorId(req.params.id);

        if (!vehiculo) {
            return res.status(404).json({
                mensaje: 'Vehículo no encontrado'
            });
        }

        return res.status(200).json(vehiculo);

    } catch (error) {
        console.error('Error al consultar vehículo:', error);

        return res.status(500).json({
            mensaje: 'Error al consultar vehículo'
        });
    }
});

// =====================================================
// GET - CONSULTAR USUARIO MEDIANTE AXIOS
// =====================================================

router.get('/api/vehiculos/usuario/:id', async (req, res) => {
    try {
        const usuario = await obtenerUsuario(req.params.id);

        return res.status(200).json({
            microservicio: 'Vehículos',
            relacion: 'Vehículos → Axios → Usuarios',
            usuario: usuario
        });

    } catch (error) {
        console.error('Error al consultar usuario:', error);

        return res.status(error.status || 500).json({
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
        const datos = req.body;
        const { usuario_id } = datos;

        const errorValidacion = validarVehiculo(datos);

        if (errorValidacion) {
            return res.status(400).json({
                mensaje: errorValidacion
            });
        }

        if (!usuario_id) {
            return res.status(400).json({
                mensaje: 'Debe indicar el usuario que realiza la operación'
            });
        }

        const usuario = await obtenerUsuario(usuario_id);
        const vehiculo = await obtenerVehiculoPorId(id);

        if (!vehiculo) {
            return res.status(404).json({
                mensaje: 'Vehículo no encontrado'
            });
        }

        const rol = normalizarRol(usuario.rol);

        if (esAdministrador(rol)) {
            await actualizarVehiculo(id, datos);

            return res.status(200).json({
                mensaje: 'Vehículo actualizado correctamente',
                usuario: usuario
            });
        }

        if (rol === 'vendedor') {
            if (
                String(vehiculo.usuario_id) !== String(usuario_id)
            ) {
                return res.status(403).json({
                    mensaje: 'El vendedor solo puede actualizar sus propios vehículos'
                });
            }

            await actualizarVehiculo(id, datos);

            return res.status(200).json({
                mensaje: 'Vehículo actualizado correctamente',
                usuario: usuario
            });
        }

        return res.status(403).json({
            mensaje: 'Los clientes no pueden actualizar vehículos'
        });

    } catch (error) {
        console.error('Error al actualizar vehículo:', error);

        return res.status(error.status || 500).json({
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

        const usuario = await obtenerUsuario(usuario_id);
        const vehiculo = await obtenerVehiculoPorId(id);

        if (!vehiculo) {
            return res.status(404).json({
                mensaje: 'Vehículo no encontrado'
            });
        }

        const rol = normalizarRol(usuario.rol);

        if (esAdministrador(rol)) {
            await eliminarVehiculo(id);

            return res.status(200).json({
                mensaje: 'Vehículo eliminado correctamente'
            });
        }

        if (rol === 'vendedor') {
            if (
                String(vehiculo.usuario_id) !== String(usuario_id)
            ) {
                return res.status(403).json({
                    mensaje: 'El vendedor solo puede eliminar sus propios vehículos'
                });
            }

            await eliminarVehiculo(id);

            return res.status(200).json({
                mensaje: 'Vehículo eliminado correctamente'
            });
        }

        return res.status(403).json({
            mensaje: 'Los clientes no pueden eliminar vehículos'
        });

    } catch (error) {
        console.error('Error al eliminar vehículo:', error);

        return res.status(error.status || 500).json({
            mensaje: error.message || 'Error al eliminar vehículo'
        });
    }
});

// =====================================================
// PUT - DISMINUIR CANTIDAD DESPUÉS DE UNA COMPRA
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
        console.error('Error al disminuir cantidad:', error);

        return res.status(error.status || 500).json({
            mensaje: error.message || 'Error al disminuir cantidad'
        });
    }
});

module.exports = router;
