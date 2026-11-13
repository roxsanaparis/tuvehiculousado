from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from threading import Timer, Lock
import subprocess
import json
from datetime import datetime

BASE = "/home/vagrant/tuvehiculousado/analitica"

BLOQUEO = Lock()
temporizador = None
procesando = False
pendiente = False

def actualizar():
    global procesando, pendiente, temporizador

    with BLOQUEO:
        if procesando:
            pendiente = True
            return
        procesando = True
        pendiente = False

    try:
        while True:
            print(
                f"[{datetime.now()}] Iniciando actualización Spark",
                flush=True
            )

            resultado = subprocess.run(
                ["/bin/bash", BASE + "/actualizar_analitica.sh"],
                cwd=BASE
            )

            print(
                f"[{datetime.now()}] Spark finalizó con código {resultado.returncode}",
                flush=True
            )

            with BLOQUEO:
                if pendiente:
                    pendiente = False
                    continue

                procesando = False
                break

    finally:
        with BLOQUEO:
            procesando = False


class Receptor(BaseHTTPRequestHandler):

    def do_POST(self):
        global temporizador, pendiente

        if self.path != "/evento":
            self.send_response(404)
            self.end_headers()
            return

        longitud = int(self.headers.get("Content-Length", 0))
        datos = self.rfile.read(longitud)

        print(
            "Evento recibido:",
            datos.decode("utf-8", errors="replace"),
            flush=True
        )

        with BLOQUEO:
            if procesando:
                pendiente = True

            if temporizador:
                temporizador.cancel()

            temporizador = Timer(2, actualizar)
            temporizador.start()

        self.send_response(202)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(
            json.dumps({
                "mensaje": "Actualización programada"
            }).encode()
        )

    def log_message(self, formato, *args):
        print(formato % args, flush=True)


ThreadingHTTPServer(
    ("0.0.0.0", 5050),
    Receptor
).serve_forever()
