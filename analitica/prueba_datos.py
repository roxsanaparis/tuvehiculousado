from pyspark.sql import SparkSession

spark = SparkSession.builder \
    .appName("AnalisisTuVehiculoUsado") \
    .getOrCreate()

ruta = "/home/vagrant/tuvehiculousado/dataset/"

usuarios = spark.read.csv(ruta + "usuarios.csv", header=True, inferSchema=True)
vehiculos = spark.read.csv(ruta + "vehiculos.csv", header=True, inferSchema=True)
compras = spark.read.csv(ruta + "compras.csv", header=True, inferSchema=True)

print("========== USUARIOS ==========")
usuarios.printSchema()
print("Total usuarios:", usuarios.count())

print("========== VEHICULOS ==========")
vehiculos.printSchema()
print("Total vehiculos:", vehiculos.count())

print("========== COMPRAS ==========")
compras.printSchema()
print("Total compras:", compras.count())

spark.stop()
