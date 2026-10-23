# TuVehiculoSado

Sistema web basado en una arquitectura de microservicios para la gestión de usuarios, vehículos y compras. El proyecto utiliza Node.js, MySQL, Docker, Docker Compose, Docker Swarm y HAProxy.

## 1. Descripción del proyecto

TuVehiculoSado es una aplicación distribuida compuesta por varios microservicios independientes que permiten gestionar:

- Usuarios
- Vehículos
- Compras

Cada microservicio tiene su propia aplicación Node.js y su propia base de datos MySQL.

La arquitectura está diseñada para ejecutarse mediante contenedores Docker y puede desplegarse tanto con Docker Compose como mediante Docker Swarm.

## 2. Arquitectura

La aplicación está organizada de la siguiente manera:

```text
                         ┌─────────────────────┐
                         │      Frontend       │
                         │   Aplicación web    │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │       HAProxy       │
                         │   Balanceador HTTP  │
                         │      :5081          │
                         └──────────┬──────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
              ▼                     ▼                     ▼
      ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
      │   Usuarios   │      │  Vehículos   │      │   Compras    │
      │   Node.js    │      │   Node.js    │      │   Node.js    │
      │    :3010     │      │    :3011     │      │    :3012     │
      └──────┬───────┘      └──────┬───────┘      └──────┬───────┘
             │                      │                      │
             ▼                      ▼                      ▼
      ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
      │MySQL Usuarios│      │MySQL Vehículos│     │ MySQL Compras│
      └──────────────┘      └──────────────┘      └──────────────┘
```

Los microservicios se comunican mediante una red Docker y cada servicio mantiene separada su información.

## 3. Componentes principales

### Frontend

Se encuentra en:

```text
frontend/
```

Contiene las páginas HTML utilizadas para interactuar con la aplicación.

### Microservicio de usuarios

Ubicación:

```text
usuarios/
```

Tecnología:

- Node.js
- Express
- MySQL

Puerto:

```text
3010
```

Imagen publicada en Docker Hub:

```text
roxsanaparis/proyecto-usuarios:1.0
```

### Microservicio de vehículos

Ubicación:

```text
vehiculos/
```

Tecnología:

- Node.js
- Express
- MySQL

Puerto:

```text
3011
```

Imagen publicada en Docker Hub:

```text
roxsanaparis/proyecto-vehiculos:1.0
```

### Microservicio de compras

Ubicación:

```text
compras/
```

Tecnología:

- Node.js
- Express
- MySQL

Puerto:

```text
3012
```

Imagen publicada en Docker Hub:

```text
roxsanaparis/proyecto-compras:1.0
```

### Bases de datos

Se utilizan tres instancias independientes de MySQL:

```text
mysql-usuarios
mysql-vehiculos
mysql-compras
```

Cada una utiliza una base de datos diferente:

```text
usuarios_db
vehiculos_db
compras_db
```

## 4. Docker Compose

El archivo:

```text
docker-compose.yml
```

permite ejecutar la aplicación utilizando Docker Compose.

Los principales servicios definidos son:

```text
mysql-usuarios
mysql-vehiculos
mysql-compras
usuarios
vehiculos
compras
haproxy
```

Para levantar la aplicación:

```bash
docker compose up -d
```

Para comprobar los contenedores:

```bash
docker ps
```

Para detener los servicios:

```bash
docker compose down
```

## 5. Docker Swarm

El archivo:

```text
docker-stack.yml
```

permite desplegar la aplicación utilizando Docker Swarm.

El despliegue utiliza una red:

```text
almacen-net
```

de tipo:

```text
overlay
```

Los microservicios tienen dos réplicas en el despliegue Swarm:

```text
usuarios    → 2 réplicas
vehiculos   → 2 réplicas
compras     → 2 réplicas
```

Esto permite distribuir las instancias entre los nodos disponibles del clúster.

Para comprobar el estado de Swarm:

```bash
docker info | grep -A5 -i swarm
```

Para desplegar el stack:

```bash
docker stack deploy -c docker-stack.yml almacen
```

Para consultar los servicios:

```bash
docker service ls
```

Para consultar las réplicas de un servicio:

```bash
docker service ps almacen_usuarios
docker service ps almacen_vehiculos
docker service ps almacen_compras
```

## 6. HAProxy

HAProxy funciona como balanceador y punto de entrada para las solicitudes HTTP.

Su configuración se encuentra en:

```text
haproxy/haproxy.cfg
```

El servicio está publicado mediante el puerto:

```text
5081
```

Las rutas principales son:

```text
/api/usuarios
/api/vehiculos
/api/compras
```

HAProxy utiliza balanceo `roundrobin` para distribuir las solicitudes entre las instancias disponibles.

## 7. Estadísticas de HAProxy

El proyecto utiliza el panel de estadísticas de HAProxy para observar el estado de los servicios y el tráfico recibido.

El panel está disponible mediante el puerto:

```text
8404
```

y la ruta:

```text
/stats
```

Por ejemplo:

```text
http://localhost:8404/stats
```

Desde este panel se pueden observar métricas relacionadas con las solicitudes y el estado de los backends.

## 8. Docker Hub

Las imágenes de los microservicios están publicadas en Docker Hub.

Usuarios:

```text
roxsanaparis/proyecto-usuarios:1.0
```

Vehículos:

```text
roxsanaparis/proyecto-vehiculos:1.0
```

Compras:

```text
roxsanaparis/proyecto-compras:1.0
```

Estas imágenes permiten que Docker Swarm pueda descargar las aplicaciones desde un repositorio externo en lugar de depender únicamente de imágenes construidas localmente.

## 9. Dataset

El proyecto incluye un dataset ubicado en:

```text
dataset/
```

Contiene:

```text
usuarios.csv
vehiculos.csv
compras.csv
README.md
```

Cantidad de registros:

| Archivo | Registros |
|---|---:|
| usuarios.csv | 10.000 |
| vehiculos.csv | 5.000 |
| compras.csv | 30.000 |
| **Total** | **45.000** |

El dataset está pensado para utilizarse en pruebas de carga, consultas SQL y validación del funcionamiento de los microservicios.

## 10. Pruebas de carga

Para generar tráfico sobre la aplicación se utiliza Apache JMeter.

El objetivo de las pruebas es generar múltiples solicitudes hacia los endpoints de los microservicios y observar:

- Tiempo de respuesta
- Cantidad de solicitudes
- Solicitudes exitosas
- Errores
- Porcentaje de error
- Tráfico recibido por HAProxy

El tráfico generado puede observarse mediante las estadísticas de HAProxy.

## 11. Estructura del proyecto

```text
tuvehiculousado/
│
├── compras/
│   ├── Dockerfile
│   ├── index.js
│   ├── package.json
│   └── package-lock.json
│
├── usuarios/
│   ├── Dockerfile
│   ├── index.js
│   ├── package.json
│   └── package-lock.json
│
├── vehiculos/
│   ├── Dockerfile
│   ├── index.js
│   ├── package.json
│   └── package-lock.json
│
├── frontend/
│   └── archivos HTML
│
├── haproxy/
│   ├── Dockerfile
│   ├── haproxy.cfg
│   └── error503.http
│
├── dataset/
│   ├── usuarios.csv
│   ├── vehiculos.csv
│   ├── compras.csv
│   └── README.md
│
├── docker-compose.yml
├── docker-stack.yml
├── usuarios.sql
├── vehiculos.sql
├── compras.sql
├── capasAlmacen.sql
└── README.md
```

## 12. Tecnologías utilizadas

- Node.js
- Express
- MySQL
- Docker
- Docker Compose
- Docker Swarm
- HAProxy
- Apache JMeter
- Git
- GitHub
- Docker Hub

## 13. Flujo general

El funcionamiento general del sistema es:

```text
Usuario
   │
   ▼
Frontend
   │
   ▼
HAProxy
   │
   ├──────────────► Microservicio Usuarios ─────► MySQL Usuarios
   │
   ├──────────────► Microservicio Vehículos ────► MySQL Vehículos
   │
   └──────────────► Microservicio Compras ──────► MySQL Compras
   │
   ▼
Estadísticas HAProxy
   │
   ▼
Pruebas de carga con JMeter
```

## 14. Repositorio

El código fuente, archivos de configuración y dataset del proyecto se encuentran disponibles públicamente en GitHub:

https://github.com/roxsanaparis/tuvehiculousado
