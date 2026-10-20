const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const usuariosController = require('./src/controllers/usuariosController');

const app = express();

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.use(usuariosController);

app.get('/', (req, res) => {
    res.status(200).json({
        microservicio: 'Usuarios',
        estado: 'funcionando',
        puerto: 3010
    });
});

app.listen(3010, '0.0.0.0', () => {
    console.log('Microservicio Usuarios ejecutándose en el puerto 3010');
});
