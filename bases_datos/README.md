# Bases de datos - TuVehiculoUsado

El proyecto utiliza MySQL 8.0 y tres bases de datos:

| Base de datos | Tabla principal |
|---|---|
| usuarios_db | usuario |
| vehiculos_db | producto |
| compras_db | compra |

## Carpetas

- inicializacion/: scripts SQL para crear la estructura inicial.
- estado_actual/: exportaciones SQL con los datos existentes al momento de la copia.

## Restaurar las bases de datos

Crear las bases de datos:

    mysql -u root -p -e "CREATE DATABASE usuarios_db;"
    mysql -u root -p -e "CREATE DATABASE vehiculos_db;"
    mysql -u root -p -e "CREATE DATABASE compras_db;"

Importar los respaldos:

    mysql -u root -p usuarios_db < estado_actual/usuarios_db.sql
    mysql -u root -p vehiculos_db < estado_actual/vehiculos_db.sql
    mysql -u root -p compras_db < estado_actual/compras_db.sql

Configurar después las credenciales y conexiones de los microservicios según el entorno.
