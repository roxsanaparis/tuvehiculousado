const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const comprasController = require('./src/controllers/comprasController');

const app = express();

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.use(comprasController);

app.get('/', (req, res) => {
    res.status(200).json({
        microservicio: 'Compras',
        estado: 'funcionando',
        puerto: 3012
    });
});

app.listen(3012, '0.0.0.0', () => {
    console.log(
        'Microservicio Compras ejecutándose en el puerto 3012'
    );
});
