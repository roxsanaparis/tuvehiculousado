CREATE DATABASE IF NOT EXISTS vehiculos_db;
USE vehiculos_db;

CREATE TABLE IF NOT EXISTS producto (
    id INT NOT NULL AUTO_INCREMENT,
    tipo VARCHAR(50) NOT NULL,
    marca VARCHAR(100) NOT NULL,
    modelo VARCHAR(100) NOT NULL,
    anio INT NOT NULL,
    nombre VARCHAR(200) NOT NULL,
    precio DECIMAL(15,2) NOT NULL,
    cantidad INT NOT NULL,
    descripcion TEXT,
    usuario_id INT DEFAULT NULL,
    PRIMARY KEY (id)
);
