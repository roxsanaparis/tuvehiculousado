from flask import Flask, jsonify, request
import mysql.connector
import os

app = Flask(__name__)

# ==========================================
# CONFIGURACION CORS
# ==========================================

@app.after_request
def agregar_cors(response):
    origen = request.headers.get("Origin", "")

    origenes_permitidos = [
        "http://www.tuvehiculousado.com.co",
        "http://tuvehiculousado.com.co",
        "http://192.168.100.2"
    ]

    if origen in origenes_permitidos:
        response.headers["Access-Control-Allow-Origin"] = origen
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        response.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response.headers["Vary"] = "Origin"

    return response


# ==========================================
# CONEXIONES A LAS TRES BASES DE DATOS
# ==========================================

CONFIGURACIONES = {
    "usuarios": {
        "host": os.getenv("DB_USUARIOS_HOST", "mysql-usuarios"),
        "database": "usuarios_db"
    },
    "vehiculos": {
        "host": os.getenv("DB_VEHICULOS_HOST", "mysql-vehiculos"),
        "database": "vehiculos_db"
    },
    "compras": {
        "host": os.getenv("DB_COMPRAS_HOST", "mysql-compras"),
        "database": "compras_db"
    }
}


def consultar(tipo, sql):
    config = CONFIGURACIONES[tipo]

    conexion = mysql.connector.connect(
        host=config["host"],
        port=3306,
        user=os.getenv("DB_USER", "analitica_reader"),
        password=os.getenv("DB_PASSWORD"),
        database=config["database"],
        connection_timeout=10
    )

    cursor = conexion.cursor(dictionary=True)

    try:
        cursor.execute(sql)
        return cursor.fetchall()
    finally:
        cursor.close()
        conexion.close()


def responder_consulta(tipo, sql):
    try:
        return jsonify(consultar(tipo, sql))
    except Exception as error:
        app.logger.exception("Error consultando %s", tipo)
        return jsonify({
            "error": "No fue posible consultar la base de datos",
            "detalle": str(error)
        }), 500


# ==========================================
# SALUD DE LA API
# ==========================================

@app.route("/api/analitica/salud")
def salud():
    return jsonify({
        "estado": "activo",
        "servicio": "API de analitica en tiempo real",
        "fuentes": ["usuarios_db", "vehiculos_db", "compras_db"]
    })


# ==========================================
# USUARIOS
# ==========================================

@app.route("/api/analitica/usuarios")
def usuarios():
    return responder_consulta(
        "usuarios",
        """
        SELECT COUNT(*) AS total_usuarios
        FROM usuario
        """
    )


@app.route("/api/analitica/usuarios-ciudad")
def usuarios_ciudad():
    return responder_consulta(
        "usuarios",
        """
        SELECT
            COALESCE(NULLIF(ciudad, ''), 'Sin ciudad') AS ciudad,
            COUNT(*) AS cantidad_usuarios
        FROM usuario
        GROUP BY ciudad
        ORDER BY cantidad_usuarios DESC
        """
    )


# ==========================================
# VEHICULOS
# ==========================================

@app.route("/api/analitica/vehiculos")
def vehiculos():
    return responder_consulta(
        "vehiculos",
        """
        SELECT COUNT(*) AS total_vehiculos
        FROM producto
        """
    )


@app.route("/api/analitica/vehiculos-estado")
def vehiculos_estado():
    return responder_consulta(
        "vehiculos",
        """
        SELECT
            estado,
            COUNT(*) AS cantidad_vehiculos
        FROM producto
        GROUP BY estado
        ORDER BY cantidad_vehiculos DESC
        """
    )


# ==========================================
# COMPRAS E INDICADORES
# ==========================================

@app.route("/api/analitica/compras")
def compras():
    return responder_consulta(
        "compras",
        """
        SELECT
            COUNT(*) AS total_compras,
            COALESCE(SUM(CASE WHEN estado = 'completada' THEN 1 ELSE 0 END), 0) AS compras_completadas,
            COALESCE(SUM(CASE WHEN estado = 'cancelada' THEN 1 ELSE 0 END), 0) AS compras_canceladas,
            COALESCE(SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END), 0) AS compras_pendientes
        FROM compra
        """
    )


@app.route("/api/analitica/ingresos")
def ingresos():
    return responder_consulta(
        "compras",
        """
        SELECT
            COALESCE(SUM(CASE WHEN estado = 'completada' THEN precio ELSE 0 END), 0) AS ingresos_totales,
            COALESCE(AVG(CASE WHEN estado = 'completada' THEN precio END), 0) AS valor_promedio_compra
        FROM compra
        """
    )


@app.route("/api/analitica/ventas-mensuales")
def ventas_mensuales():
    return responder_consulta(
        "compras",
        """
        SELECT
            YEAR(fecha) AS anio,
            MONTH(fecha) AS mes,
            COUNT(*) AS cantidad_compras,
            COALESCE(SUM(CASE WHEN estado = 'completada' THEN precio ELSE 0 END), 0) AS ingresos
        FROM compra
        GROUP BY YEAR(fecha), MONTH(fecha)
        ORDER BY anio, mes
        """
    )


@app.route("/api/analitica/marcas-vendidas")
def marcas_vendidas():
    try:
        compras = consultar(
            "compras",
            """
            SELECT vehiculo_id, precio
            FROM compra
            WHERE estado = 'completada'
            """
        )

        vehiculos = consultar(
            "vehiculos",
            """
            SELECT id, marca
            FROM producto
            """
        )

        marcas = {str(v["id"]): v["marca"] for v in vehiculos}
        resumen = {}

        for compra in compras:
            marca = marcas.get(str(compra["vehiculo_id"]))
            if not marca:
                continue

            if marca not in resumen:
                resumen[marca] = {
                    "marca": marca,
                    "unidades_vendidas": 0,
                    "ingresos": 0
                }

            resumen[marca]["unidades_vendidas"] += 1
            resumen[marca]["ingresos"] += float(compra["precio"])

        resultado = sorted(
            resumen.values(),
            key=lambda x: x["unidades_vendidas"],
            reverse=True
        )
        return jsonify(resultado)

    except Exception as error:
        app.logger.exception("Error consultando marcas vendidas")
        return jsonify({"error": str(error)}), 500


@app.route("/api/analitica/metodos-pago")
def metodos_pago():
    return responder_consulta(
        "compras",
        """
        SELECT
            metodo_pago,
            COUNT(*) AS cantidad
        FROM compra
        WHERE metodo_pago IS NOT NULL
          AND metodo_pago <> ''
          AND metodo_pago <> 'Pendiente de registrar'
        GROUP BY metodo_pago
        ORDER BY cantidad DESC
        """
    )


@app.route("/api/analitica/tasa-cancelacion")
def tasa_cancelacion():
    try:
        filas = consultar(
            "compras",
            """
            SELECT
                COUNT(*) AS total_compras,
                COALESCE(SUM(CASE WHEN estado = 'completada' THEN 1 ELSE 0 END), 0) AS compras_completadas,
                COALESCE(SUM(CASE WHEN estado = 'cancelada' THEN 1 ELSE 0 END), 0) AS compras_canceladas
            FROM compra
            """
        )

        datos = filas[0]
        total = int(datos["total_compras"] or 0)
        canceladas = int(datos["compras_canceladas"] or 0)

        tasa = round((canceladas / total) * 100, 2) if total else 0

        return jsonify({
            "disponible": True,
            "total_compras": total,
            "compras_completadas": int(datos["compras_completadas"] or 0),
            "compras_canceladas": canceladas,
            "tasa_cancelacion": tasa
        })

    except Exception as error:
        app.logger.exception("Error calculando tasa de cancelacion")
        return jsonify({"error": str(error)}), 500


# ==========================================
# INICIO
# ==========================================

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
