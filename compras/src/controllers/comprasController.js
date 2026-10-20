const express = require('express');
const axios = require('axios');

const {
    crearCompra,
    obtenerCompras,
    obtenerCompraPorId,
    obtenerComprasPorUsuario,
 } = require('../models/comprasModel');

const router = express.Router();

const URL_USUARIOS =
    process.env.USUARIOS_URL || 'http://usuarios:3010/api/usuarios';

const URL_VEHICULOS =
    process.env.VEHICULOS_URL || 'http://vehiculos:3011/api/vehiculos';


// ======================================================
// OBTENER USUARIO
// ======================================================

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


// ======================================================
// OBTENER VEHÍCULO
// ======================================================

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


// ======================================================
// DISMINUIR CANTIDAD DEL VEHÍCULO
// ======================================================

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


// ======================================================
// CREAR COMPRA
// ======================================================

router.post('/api/compras', async (req, res) => {

    try {

        const {
            usuario_id,
            vehiculo_id
        } = req.body;


        // --------------------------------------------------
        // VALIDAR DATOS
        // --------------------------------------------------

        if (!usuario_id || !vehiculo_id) {

            return res.status(400).json({
                mensaje: 'usuario_id y vehiculo_id son obligatorios'
            });
        }


        // --------------------------------------------------
        // BUSCAR USUARIO
        // --------------------------------------------------

        const usuario = await obtenerUsuario(usuario_id);


        // --------------------------------------------------
        // SOLO CLIENTES PUEDEN COMPRAR
        // --------------------------------------------------

        if (usuario.rol !== 'cliente') {

            return res.status(403).json({
                mensaje: 'Solo los clientes pueden realizar compras',
                rol: usuario.rol
            });
        }


        // --------------------------------------------------
        // BUSCAR VEHÍCULO
        // --------------------------------------------------

        const vehiculo = await obtenerVehiculo(vehiculo_id);


        // --------------------------------------------------
        // VERIFICAR STOCK
        // --------------------------------------------------

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


        // --------------------------------------------------
        // DISMINUIR STOCK PRIMERO
        // --------------------------------------------------

        await disminuirCantidad(
            vehiculo_id,
            usuario_id
        );


        // --------------------------------------------------
        // CREAR COMPRA
        // --------------------------------------------------

        let resultado;

        try {

            resultado = await crearCompra(
                usuario_id,
                vehiculo_id,
                vehiculo.precio
            );

        } catch (error) {

            /*
             * Si la compra falla después de disminuir el stock,
             * el stock queda desincronizado.
             *
             * Por eso mostramos el error y no fingimos
             * que la compra fue exitosa.
             */

            console.error(
                'Error al registrar la compra:',
                error
            );

            return res.status(500).json({
                mensaje: 'No se pudo registrar la compra'
            });
        }


        // --------------------------------------------------
        // RESPUESTA
        // --------------------------------------------------

        return res.status(201).json({

            mensaje: 'Compra realizada correctamente',

            compra_id: resultado.insertId,

            usuario: usuario,

            vehiculo: {
                ...vehiculo,
                cantidad:
                    Number(vehiculo.cantidad) - 1
            }
        });


    } catch (error) {

        console.error(
            'Error al realizar compra:',
            error
        );

        return res.status(
            error.status || 500
        ).json({

            mensaje:
                error.message ||
                'Error al realizar la compra'
        });
    }
});


// ======================================================
// OBTENER TODAS LAS COMPRAS
// ======================================================

router.get('/api/compras', async (req, res) => {

    try {

        const compras = await obtenerCompras();

        return res.status(200).json(compras);

    } catch (error) {

        console.error(
            'Error al consultar compras:',
            error
        );

        return res.status(500).json({
            mensaje: 'Error al consultar compras'
        });
    }
});


// ======================================================
// OBTENER COMPRA POR ID
// ======================================================

router.get('/api/compras/:id', async (req, res) => {

    try {

        const {
            id
        } = req.params;


        const compra =
            await obtenerCompraPorId(id);


        if (!compra) {

            return res.status(404).json({
                mensaje: 'Compra no encontrada'
            });
        }


        return res.status(200).json(compra);

    } catch (error) {

        console.error(
            'Error al consultar compra:',
            error
        );

        return res.status(500).json({
            mensaje: 'Error al consultar compra'
        });
    }
});


// ======================================================
// OBTENER COMPRAS DE UN USUARIO
// ======================================================

router.get(
    '/api/compras/usuario/:id',
    async (req, res) => {

        try {

            const {
                id
            } = req.params;


            const compras =
                await obtenerComprasPorUsuario(id);


            return res.status(200).json(compras);

        } catch (error) {

            console.error(
                'Error al consultar compras del usuario:',
                error
            );

            return res.status(500).json({
                mensaje:
                    'Error al consultar compras del usuario'
            });
        }
    }
);


module.exports = router;
