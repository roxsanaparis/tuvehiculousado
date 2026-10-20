const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const vehiculosController = require('./src/controllers/vehiculosController');

const app = express();

// ==========================================
// MIDDLEWARES
// ==========================================
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// ==========================================
// RUTAS DEL MICROSERVICIO VEHÍCULOS
// ==========================================
app.use(vehiculosController);

// ==========================================
// RUTA DE PRUEBA
// ==========================================
app.get('/', (req, res) => {
    res.status(200).json({
        microservicio: 'Vehículos',
        estado: 'funcionando',
        puerto: 3011
    });
});

// ==========================================
// INICIAR SERVIDOR
// ==========================================
app.listen(3011, '0.0.0.0', () => {
    console.log(
        'Microservicio Vehículos ejecutándose en el puerto 3011'
    );
});
