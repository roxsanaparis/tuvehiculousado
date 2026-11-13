from http.server import BaseHTTPRequestHandler, HTTPServer
from threading import Timer, Lock
import subprocess
import json
import os
from datetime import datetime

BASE = "/home/vagrant/tuvehiculousado/analitica"
BLOQUEO = Lock()
temporizador = None

def actualizar():
    print(f"[{datetime.now()}] Iniciando actualización Spark", flush=True)
    subprocess.run(
        [BASE + "/actualizar_analitica.sh"],
        cwd=BASE
    )

class Receptor(BaseHTTPRequestHandler):
    def do_POST(self):
        global temporizador

        if self.path != "/evento":
            self.send_response(404)
            self.end_headers()
            return

        longitud = int(self.headers.get("Content-Length", 0))
        datos = self.rfile.read(longitud)

        print("Evento recibido:", datos.decode("utf-8", errors="replace"), flush=True)

        with BLOQUEO:
            if temporizador:
                temporizador.cancel()
            temporizador = Timer(5, actualizar)
            temporizador.start()

        self.send_response(202)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps({"mensaje": "Actualización programada"}).encode())

    def log_message(self, formato, *args):
        print(formato % args, flush=True)

HTTPServer(("0.0.0.0", 5050), Receptor).serve_forever()
