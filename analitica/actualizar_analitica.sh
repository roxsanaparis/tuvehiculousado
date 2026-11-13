
#!/bin/bash

BASE="/home/vagrant/tuvehiculousado/analitica"
SPARK="/home/vagrant/labSpark/spark-3.5.1-bin-hadoop3/bin/spark-submit"
JAR="/home/vagrant/labSpark/spark-3.5.1-bin-hadoop3/jars/mysql-connector-j-8.4.0.jar"
LOG="$BASE/logs/actualizacion.log"
DESTINO="vagrant@192.168.100.2:/var/www/html/capasFront/datos-spark/"

# Cargar las variables de entorno
set -a
source /home/vagrant/tuvehiculousado/.env
set +a

# Evitar ejecuciones simultáneas
mkdir -p "$BASE/logs"
exec 9>"$BASE/actualizacion.lock"
flock -n 9 || exit 0

cd "$BASE" || exit 1

echo "===== Actualización: $(date) =====" >> "$LOG"

# Ejecutar Spark en el clúster distribuido
if "$SPARK" \
    --master spark://192.168.100.3:7077 \
    --deploy-mode client \
    --jars "$JAR" \
    procesamiento.py >> "$LOG" 2>&1; then

    echo "Procesamiento distribuido terminado correctamente: $(date)" >> "$LOG"

    # Publicar resultados CSV en el servidor frontend
    if scp "$BASE"/resultados_powerbi/*.csv "$DESTINO" >> "$LOG" 2>&1; then
        echo "CSV publicados en SU1 correctamente: $(date)" >> "$LOG"
    else
        echo "ERROR al copiar los CSV a SU1: $(date)" >> "$LOG"
        exit 1
    fi

else
    echo "ERROR en procesamiento Spark: $(date)" >> "$LOG"
    exit 1
fi
