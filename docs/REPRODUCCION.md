# Guía de reproducción - TuVehiculoUsado

## 1. Arquitectura

El proyecto está compuesto por:

- Frontend web.
- Microservicio de usuarios.
- Microservicio de vehículos.
- Microservicio de compras.
- Tres bases de datos MySQL.
- HAProxy para balanceo de carga.
- Docker Swarm para orquestación y escalabilidad.
- Apache Spark para procesamiento distribuido.
- API de analítica y resultados para Power BI.

## 2. Entorno original

| Nodo | Dirección | Función |
|---|---|---|
| servidorUbuntu1 | 192.168.100.2 | Worker Swarm y nodo Spark Worker |
| servidorUbuntu2 | 192.168.100.3 | Manager Swarm y nodo Spark Master |

Versiones verificadas:
- Docker Engine 29.8.2
- Apache Spark 3.5.1
- MySQL 8.0
- HAProxy 2.9

Las direcciones IP son las del laboratorio original. Deben adaptarse al entorno de instalación.

## 3. Requisitos

- Dos máquinas Ubuntu para reproducir el clúster original.
- Docker Engine en ambos nodos.
- Git.
- Conectividad entre nodos.
- Apache Spark 3.5.1 y Java compatible.
- Power BI Desktop para visualizar los resultados.

## 4. Obtener el proyecto

    git clone git@github.com:roxsanaparis/tuvehiculosado.git
    cd tuvehiculosado

También se puede descargar el repositorio desde GitHub.

## 5. Configuración

Crear localmente un archivo `.env` a partir de los nombres de variables utilizados en `docker-compose.yml` y `docker-stack.yml`.

Configurar las credenciales de MySQL, los usuarios de aplicación y las conexiones de analítica.

No compartir el archivo `.env`.

Docker Swarm utiliza el secreto `jwt_secret`. Debe crearse antes del despliegue, utilizando un valor propio y seguro.

## 6. Bases de datos

Las bases utilizadas son:

- usuarios_db
- vehiculos_db
- compras_db

Los respaldos actuales están en `bases_datos/estado_actual/`.

Los scripts de inicialización y estructura se encuentran en `capasAlmacen.sql` y en los archivos SQL del proyecto.

Restaurar cada respaldo en una instancia MySQL limpia, utilizando los nombres de base de datos correspondientes.

No restaurar encima de bases que ya contengan información.

## 7. Docker Swarm

Inicializar el clúster en el nodo manager:

    docker swarm init --advertise-addr 192.168.100.3

Unir el segundo nodo utilizando el comando `docker swarm join` generado por el manager.

Crear previamente los secretos requeridos y comprobar la red y los volúmenes.

Validar la configuración:

    docker stack config -c docker-stack.yml

Desplegar desde el manager, con las variables de entorno cargadas:

    set -a
    source .env
    set +a
    docker stack deploy -c docker-stack.yml tuvehiculosado

Consultar servicios:

    docker service ls

Consultar tareas:

    docker service ps NOMBRE_SERVICIO

## 8. Microservicios

Cada microservicio tiene su propio Dockerfile y archivos package.json y package-lock.json.

Directorios:

- usuarios/
- vehiculos/
- compras/

Para construir imágenes localmente:

    docker build -t proyecto-usuarios:local ./usuarios
    docker build -t proyecto-vehiculos:local ./vehiculos
    docker build -t proyecto-compras:local ./compras

Las referencias de imágenes del archivo Stack deben ajustarse a las imágenes disponibles en el entorno de destino.

## 9. HAProxy

La configuración está en:

    haproxy/haproxy.cfg

Revisar las direcciones de los backends antes de iniciar el servicio.

Las rutas principales distribuyen las solicitudes de usuarios, vehículos y compras.

## 10. Apache Spark y analítica

El procesamiento se encuentra en:

- analitica/procesamiento.py
- analitica/actualizar_analitica.sh
- analitica/receptor_eventos.py

La API de analítica está en:

- analitica/api_corregida/app.py
- analitica/api_corregida/Dockerfile
- analitica/api_corregida/requirements.txt

Instalar las dependencias de Python:

    pip install -r analitica/api_corregida/requirements.txt

Configurar Spark Master, Worker, conectividad JDBC y credenciales de lectura antes de ejecutar el procesamiento.

Los resultados CSV se generan para su consulta y visualización en Power BI.

## 11. Dataset

Los datos originales están en `dataset/`:

- usuarios.csv
- vehiculos.csv
- compras.csv

Los resultados y exportaciones posteriores de las bases se documentan por separado.

## 12. Power BI

Los resultados CSV para Power BI están en:

    analitica/resultados_powerbi/

Configurar las fuentes de datos con las direcciones accesibles desde el equipo que ejecuta Power BI.

Actualizar el modelo después de generar nuevos resultados.

## 13. Pruebas

Comprobar:

- Disponibilidad de los microservicios.
- Consultas a las tres bases de datos.
- Balanceo de solicitudes mediante HAProxy.
- Escalado de réplicas en Docker Swarm.
- Ejecución distribuida de Spark.
- Generación de archivos CSV.
- Consumo de resultados desde Power BI.

Los resultados de las pruebas deben interpretarse según el hardware y la configuración utilizados.

## 14. Seguridad

- No publicar archivos `.env`.
- Utilizar secretos propios en Docker Swarm.
- No reutilizar las contraseñas del laboratorio.
- No restaurar respaldos sobre bases de producción.
- Configurar las direcciones IP y puertos según cada instalación.
