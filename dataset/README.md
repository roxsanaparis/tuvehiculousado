# Dataset TuVehiculoUsado

Dataset sintético generado para el proyecto académico de microservicios.

Archivos:
- usuarios.csv: 10,000 usuarios
- vehiculos.csv: 5,000 vehículos
- compras.csv: 30,000 compras

Relaciones:
- compras.id_usuario -> usuarios.id_usuario
- compras.id_vehiculo -> vehiculos.id_vehiculo

Uso:
- Poblar MySQL
- Probar consultas SQL
- Probar los microservicios de Usuarios, Vehículos y Compras
- Generar carga con JMeter

Nota: es un dataset sintético, no contiene datos personales reales.
