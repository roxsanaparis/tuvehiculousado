
from pyspark.sql import SparkSession
from pyspark.sql.functions import (
    col, count, sum, avg, round, month, year,
    to_date, desc, when, lit
)
from pyspark.sql.types import StructType, StructField, StringType, LongType
import os
import csv

# ==========================================
# 1. SESION SPARK
# ==========================================

spark = SparkSession.builder \
    .appName("AnaliticaTuVehiculoUsado_MySQL") \
    .config("spark.sql.shuffle.partitions", "4") \
    .getOrCreate()

spark.sparkContext.setLogLevel("WARN")

salida = "/home/vagrant/tuvehiculousado/analitica/resultados_powerbi/"

# ==========================================
# 2. CONEXIONES MYSQL
# ==========================================

def leer_mysql(host, puerto, base, tabla):
    url = f"jdbc:mysql://{host}:{puerto}/{base}"

    usuario = os.getenv("SPARK_DB_USER")
    contrasena = os.getenv("SPARK_DB_PASSWORD")

    if not usuario or not contrasena:
        raise RuntimeError(
            "Faltan SPARK_DB_USER o SPARK_DB_PASSWORD"
        )

    return spark.read.format("jdbc") \
        .option("url", url) \
        .option("dbtable", tabla) \
        .option("user", usuario) \
        .option("password", contrasena) \
        .option("driver", "com.mysql.cj.jdbc.Driver") \
        .load()

print("Leyendo usuarios...")
usuarios = leer_mysql(
    "192.168.100.2", "3307", "usuarios_db", "usuario"
)

print("Leyendo vehiculos...")
vehiculos = leer_mysql(
    "192.168.100.3", "3308", "vehiculos_db", "producto"
)

print("Leyendo compras...")
compras = leer_mysql(
    "192.168.100.3", "3309", "compras_db", "compra"
)

# ==========================================
# 3. PREPARAR COLUMNAS
# ==========================================

usuarios = usuarios.select(
    col("id").alias("id_usuario"),
    col("ciudad"),
    col("estado")
).dropDuplicates(["id_usuario"])

vehiculos = vehiculos.select(
    col("id").alias("id_vehiculo"),
    col("marca"),
    col("modelo"),
    col("precio"),
    col("cantidad"),
    col("usuario_id")
).dropDuplicates(["id_vehiculo"])

compras = compras.select(
    col("id").alias("id_compra"),
    col("usuario_id"),
    col("vehiculo_id"),
    col("precio").alias("monto"),
    to_date(col("fecha")).alias("fecha_compra"),
    col("metodo_pago")
).dropDuplicates(["id_compra"])

# ==========================================
# 4. RELACIONAR LAS TABLAS
# ==========================================

detalle = compras.alias("c") \
    .join(
        usuarios.alias("u"),
        col("c.usuario_id") == col("u.id_usuario"),
        "left"
    ) \
    .join(
        vehiculos.alias("v"),
        col("c.vehiculo_id") == col("v.id_vehiculo"),
        "left"
    ) \
    .select(
        col("c.*"),
        col("u.ciudad").alias("ciudad"),
        col("u.estado").alias("estado_usuario"),
        col("v.marca").alias("marca"),
        col("v.modelo").alias("modelo"),
        col("v.precio").alias("precio_vehiculo")
    )

# ==========================================
# 5. INDICADORES DE USUARIOS
# ==========================================

indicadores_usuarios = usuarios.agg(
    count("*").alias("total_usuarios")
)

usuarios_ciudad = usuarios.groupBy("ciudad").agg(
    count("*").alias("cantidad_usuarios")
).orderBy(desc("cantidad_usuarios"))

usuarios_estado = usuarios.groupBy("estado").agg(
    count("*").alias("cantidad_usuarios")
)

# ==========================================
# 6. INDICADORES DE VEHICULOS
# ==========================================

indicadores_vehiculos = vehiculos.agg(
    count("*").alias("total_vehiculos")
)

vehiculos_marca = vehiculos.groupBy("marca").agg(
    count("*").alias("cantidad_vehiculos"),
    round(avg("precio"), 2).alias("precio_promedio")
).orderBy(desc("cantidad_vehiculos"))

vehiculos_estado = vehiculos.withColumn(
    "estado",
    when(col("cantidad") > 0, "disponible").otherwise("sin_existencias")
).groupBy("estado").agg(
    count("*").alias("cantidad_vehiculos")
)

# ==========================================
# 7. INDICADORES DE COMPRAS E INGRESOS
# ==========================================

indicadores_compras = compras.agg(
    count("*").alias("total_compras"),
    lit(None).cast("long").alias("compras_completadas"),
    lit(None).cast("long").alias("compras_canceladas")
)

indicadores_ingresos = compras.agg(
    round(sum("monto"), 2).alias("ingresos_totales"),
    round(avg("monto"), 2).alias("valor_promedio_compra")
)

# ==========================================
# 8. VENTAS POR MES
# ==========================================

ventas_mensuales = compras \
    .filter(col("fecha_compra").isNotNull()) \
    .groupBy(
        year("fecha_compra").alias("anio"),
        month("fecha_compra").alias("mes")
    ).agg(
        count("*").alias("cantidad_compras"),
        round(sum("monto"), 2).alias("ingresos")
    ).orderBy("anio", "mes")

# ==========================================
# 9. MARCAS Y MODELOS MAS VENDIDOS
# ==========================================

marcas_mas_vendidas = detalle.filter(
    col("marca").isNotNull()
).groupBy("marca").agg(
    count("*").alias("unidades_vendidas"),
    round(sum("monto"), 2).alias("ingresos")
).orderBy(desc("unidades_vendidas"))

modelos_mas_vendidos = detalle.filter(
    col("marca").isNotNull()
).groupBy("marca", "modelo").agg(
    count("*").alias("unidades_vendidas")
).orderBy(desc("unidades_vendidas"))

# ==========================================
# 10. METODOS DE PAGO
# ==========================================

metodos_pago = compras \
    .withColumn(
        "metodo_pago",
        when(
            col("metodo_pago").isNull() | (col("metodo_pago") == ""),
            lit("Sin método registrado")
        ).otherwise(col("metodo_pago"))
    ) \
    .groupBy("metodo_pago") \
    .agg(
        count("*").alias("cantidad_compras"),
        round(sum("monto"), 2).alias("ingresos")
    )

# ==========================================
# 11. RESULTADOS
# ==========================================

resultados = {
    "indicadores_usuarios": indicadores_usuarios,
    "usuarios_ciudad": usuarios_ciudad,
    "usuarios_estado": usuarios_estado,
    "indicadores_vehiculos": indicadores_vehiculos,
    "vehiculos_marca": vehiculos_marca,
    "vehiculos_estado": vehiculos_estado,
    "indicadores_compras": indicadores_compras,
    "indicadores_ingresos": indicadores_ingresos,
    "ventas_mensuales": ventas_mensuales,
    "marcas_mas_vendidas": marcas_mas_vendidas,
    "modelos_mas_vendidos": modelos_mas_vendidos,
    "metodos_pago": metodos_pago
}

# ==========================================
# 12. GUARDAR RESULTADOS CSV
# ==========================================

os.makedirs(salida, exist_ok=True)

for nombre, dataframe in resultados.items():
    ruta_archivo = os.path.join(salida, nombre + ".csv")

    filas = dataframe.collect()

    with open(ruta_archivo, "w", newline="", encoding="utf-8-sig") as archivo:
        escritor = csv.writer(archivo)
        escritor.writerow(dataframe.columns)

        for fila in filas:
            escritor.writerow(list(fila))

    print("Resultado guardado:", ruta_archivo)

# ==========================================
# 13. MOSTRAR RESULTADOS
# ==========================================

print("\n========== USUARIOS ==========")
indicadores_usuarios.show()

print("\n========== VEHICULOS ==========")
indicadores_vehiculos.show()

print("\n========== COMPRAS REGISTRADAS ==========")
indicadores_compras.show()

print("\n========== INGRESOS REGISTRADOS ==========")
indicadores_ingresos.show()

print("\n========== MARCAS MAS VENDIDAS ==========")
marcas_mas_vendidas.show(10, truncate=False)

print("\n========== VENTAS MENSUALES ==========")
ventas_mensuales.show(20)

print("\nPROCESAMIENTO ANALITICO FINALIZADO")

spark.stop()
