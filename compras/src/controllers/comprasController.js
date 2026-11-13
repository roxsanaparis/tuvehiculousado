
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const { parse } = require('csv-parse/sync');

const {
    crearCompra,
    obtenerCompras,
    obtenerCompraPorId,
    obtenerComprasPorUsuario
} = require('../models/comprasModel');

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

const URL_VEHICULOS =
    process.env.VEHICULOS_URL || 'http://vehiculos:3011/api/vehiculos';

const RUTA_DATASET = '/data/compras.csv';

function obtenerSecretoJWT() {
    return fs.readFileSync('/run/secrets/jwt_secret', 'utf8').trim();
}

// ==========================================
// AUTENTICAR ADMINISTRADOR
// ==========================================

function autenticarAdmin(req, res, next) {
    const autorizacion = req.headers.authorization || '';
    const partes = autorizacion.split(' ');

    if (partes[0] !== 'Bearer' || !partes[1]) {
        return res.status(401).json({
            mensaje: 'Debes iniciar sesión para consultar este historial'
        });
    }

    try {
        const payload = jwt.verify(partes[1], obtenerSecretoJWT());

        const rol = String(payload.rol || '').trim().toLowerCase();

        if (!['admin', 'administrador'].includes(rol)) {
            return res.status(403).json({
                mensaje: 'No tienes permisos para consultar este historial'
            });
        }

        req.usuarioAdmin = payload;
        next();

    } catch (error) {
        return res.status(401).json({
            mensaje: 'La sesión no es válida o ha expirado'
        });
    }
}

// ==========================================
// OBTENER USUARIO
// ==========================================

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

// ==========================================
// OBTENER VEHÍCULO
// ==========================================

async function obtenerVehiculo(idVehiculo) {
    try {
        const respuesta = await axios.get(
            `${URL_VEHICULOS}/${idVehiculo}`
        );

        return respuesta.data;

    } catch (error) {
        if (error.response) {
            const respuestaError = new Error(
                'No se pudo consultar el vehículo'
            );

            respuestaError.status = error.response.status;
            throw respuestaError;
        }

        const respuestaError = new Error(
            'El microservicio Vehículos no está disponible'
        );

        respuestaError.status = 503;
        throw respuestaError;
    }
}

// ==========================================
// DISMINUIR CANTIDAD DEL VEHÍCULO
// ==========================================

async function disminuirCantidad(idVehiculo, idUsuario) {
    try {
        await axios.put(
            `${URL_VEHICULOS}/${idVehiculo}/disminuir`,
            {
                usuario_id: idUsuario
            }
        );

    } catch (error) {
        console.error(
            'Error al disminuir cantidad:',
            error.response?.data || error.message
        );

        if (error.response) {
            const respuestaError = new Error(
                error.response.data?.mensaje ||
                'No se pudo disminuir la cantidad del vehículo'
            );

            respuestaError.status = error.response.status;
            throw respuestaError;
        }

        const respuestaError = new Error(
            'El microservicio Vehículos no está disponible'
        );

        respuestaError.status = 503;
        throw respuestaError;
    }
}

// ==========================================
// CREAR COMPRA TRANSACCIONAL EN MYSQL
// ==========================================

router.post('/api/compras', async (req, res) => {
    try {
        const { usuario_id, vehiculo_id, metodo_pago } = req.body;

        if (!usuario_id || !vehiculo_id || !metodo_pago) {
            return res.status(400).json({
                mensaje: 'usuario_id, vehiculo_id y metodo_pago son obligatorios'
            });
        }

        const usuario = await obtenerUsuario(usuario_id);

        if (String(usuario.rol).trim().toLowerCase() !== 'cliente') {
            return res.status(403).json({
                mensaje: 'Solo los clientes pueden realizar compras',
                rol: usuario.rol
            });
        }

        const vehiculo = await obtenerVehiculo(vehiculo_id);

        if (
            vehiculo.cantidad === undefined ||
            vehiculo.cantidad === null
        ) {
            return res.status(500).json({
                mensaje: 'El vehículo no tiene información de cantidad'
            });
        }

        if (Number(vehiculo.cantidad) <= 0) {
            return res.status(400).json({
                mensaje: 'El vehículo no está disponible'
            });
        }

        await disminuirCantidad(vehiculo_id, usuario_id);

        let resultado;

        try {
            resultado = await crearCompra(
                usuario_id,
                vehiculo_id,
                vehiculo.precio,
                metodo_pago
            );

        } catch (error) {
            console.error('Error al registrar la compra:', error);

            return res.status(500).json({
                mensaje: 'No se pudo registrar la compra'
            });
        }

        return res.status(201).json({
            mensaje: 'Compra realizada correctamente',
            compra_id: resultado.insertId,
            estado: 'completada',
            metodo_pago,
            usuario,
            vehiculo: {
                ...vehiculo,
                cantidad: Number(vehiculo.cantidad) - 1
            }
        });

    } catch (error) {
        console.error('Error al realizar compra:', error);

        return res.status(error.status || 500).json({
            mensaje: error.message || 'Error al realizar la compra'
        });
    }
});

// ==========================================
// HISTORIAL DEL DATASET CSV
// SOLO ADMINISTRADORES
// GET /api/compras/dataset/historial
// ==========================================

router.get(
    '/api/compras/dataset/historial',
    autenticarAdmin,
    async (req, res) => {
        try {
            if (!fs.existsSync(RUTA_DATASET)) {
                return res.status(500).json({
                    mensaje: 'No se encuentra el archivo del historial'
                });
            }

            const contenido = fs.readFileSync(RUTA_DATASET, 'utf8');

            const registros = parse(contenido, {
                columns: true,
                skip_empty_lines: true,
                trim: true,
                bom: true
            });

            const idUsuario = String(
                req.query.id_usuario || ''
            ).trim();

            const estado = String(
                req.query.estado || ''
            ).trim().toLowerCase();

            const comprasFiltradas = registros.filter(compra => {
                const coincideUsuario =
                    !idUsuario ||
                    String(compra.id_usuario) === idUsuario;

                const coincideEstado =
                    !estado ||
                    String(compra.estado).trim().toLowerCase() === estado;

                return coincideUsuario && coincideEstado;
            });

            const compras = comprasFiltradas.map(compra => ({
                id_compra: Number(compra.id_compra),
                id_usuario: Number(compra.id_usuario),
                id_vehiculo: Number(compra.id_vehiculo),
                fecha_compra: compra.fecha_compra,
                metodo_pago: compra.metodo_pago,
                estado: compra.estado,
                descuento: Number(compra.descuento),
                precio: Number(compra.precio),
                monto: Number(compra.monto)
            }));

            return res.status(200).json({
                total: compras.length,
                filtros: {
                    id_usuario: idUsuario || null,
                    estado: estado || null
                },
                compras
            });

        } catch (error) {
            console.error('Error al consultar historial CSV:', error);

            return res.status(500).json({
                mensaje: 'Error al consultar el historial del dataset'
            });
        }
    }
);


// ==========================================
// HISTORIAL REAL DE COMPRAS MYSQL
// SOLO ADMINISTRADORES
// GET /api/compras/historial/real
// ==========================================

router.get(
    '/api/compras/historial/real',
    autenticarAdmin,
    async (req, res) => {
        try {
            const idUsuario = String(
                req.query.id_usuario || ''
            ).trim();

            let compras = await obtenerCompras();

            if (idUsuario) {
                compras = compras.filter(
                    compra =>
                        String(compra.usuario_id) === idUsuario
                );
            }

            return res.status(200).json({
                total: compras.length,
                origen: 'MySQL - compras_db',
                compras
            });

        } catch (error) {
            console.error(
                'Error consultando historial real:',
                error
            );

            return res.status(500).json({
                mensaje: 'Error al consultar las compras reales'
            });
        }
    }
);

// ==========================================
// OBTENER TODAS LAS COMPRAS DE MYSQL
// ==========================================

router.get('/api/compras', async (req, res) => {
    try {
        const compras = await obtenerCompras();

        return res.status(200).json(compras);

    } catch (error) {
        console.error('Error al consultar compras:', error);

        return res.status(500).json({
            mensaje: 'Error al consultar compras'
        });
    }
});

// ==========================================
// OBTENER COMPRAS DE UN USUARIO
// ==========================================

router.get('/api/compras/usuario/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const compras = await obtenerComprasPorUsuario(id);

        return res.status(200).json(compras);

    } catch (error) {
        console.error('Error al consultar compras del usuario:', error);

        return res.status(500).json({
            mensaje: 'Error al consultar compras del usuario'
        });
    }
});

// ==========================================
// OBTENER COMPRA MYSQL POR ID
// ==========================================

router.get('/api/compras/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const compra = await obtenerCompraPorId(id);

        if (!compra) {
            return res.status(404).json({
                mensaje: 'Compra no encontrada'
            });
        }

        return res.status(200).json(compra);

    } catch (error) {
        console.error('Error al consultar compra:', error);

        return res.status(500).json({
            mensaje: 'Error al consultar compra'
        });
    }
});

module.exports = router;
