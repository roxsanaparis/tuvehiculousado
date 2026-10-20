# TuVehiculo

Sistema web para la gestión y venta de vehículos, desarrollado mediante una arquitectura basada en microservicios y contenedores Docker.

## Descripción

TuVehiculo permite gestionar usuarios, vehículos y compras mediante diferentes microservicios independientes. El sistema utiliza MySQL para la persistencia de datos y HAProxy como balanceador y punto de entrada para las peticiones.

## Arquitectura

El proyecto está compuesto por:

- **Microservicio de Usuarios** — puerto 3010
- **Microservicio de Vehículos** — puerto 3011
- **Microservicio de Compras** — puerto 3012
- **MySQL Usuarios**
- **MySQL Vehículos**
- **MySQL Compras**
- **Frontend web**
- **HAProxy** — balanceo y enrutamiento
- **Docker Compose**
- **Docker Swarm**

## Estructura

```text
tuvehiculousado/
├── usuarios/
│   ├── src/
│   │   ├── controllers/
│   │   └── models/
│   ├── Dockerfile
│   ├── index.js
│   └── package.json
│
├── vehiculos/
│   ├── src/
│   │   ├── controllers/
│   │   └── models/
│   ├── Dockerfile
│   ├── index.js
│   └── package.json
│
├── compras/
│   ├── src/
│   │   ├── controllers/
│   │   └── models/
│   ├── Dockerfile
│   ├── index.js
│   └── package.json
│
├── frontend/
├── haproxy/
├── usuarios.sql
├── vehiculos.sql
├── compras.sql
├── docker-compose.yml
└── docker-stack.yml
