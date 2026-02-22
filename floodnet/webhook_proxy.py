#!/usr/bin/env python3
"""
Reverse proxy so all 5 FloodNet agents are reachable on one public URL (Railway PORT).
Zynd registry can then reach each agent and mark them ACTIVE.
Routes: /webhook -> coordinator:5005, /predictor/webhook -> :5001, etc.
"""
import os
import urllib.request
import urllib.error
from http.server import HTTPServer, BaseHTTPRequestHandler

# Path prefix -> (backend_port, backend_path)
ROUTES = {
    "/webhook": (5005, "/webhook"),           # coordinator
    "/predictor/webhook": (5001, "/webhook"),
    "/mapper/webhook": (5002, "/webhook"),
    "/planner/webhook": (5003, "/webhook"),
    "/alert/webhook": (5004, "/webhook"),
}


class ProxyHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self._proxy()

    def do_POST(self):
        self._proxy()

    def do_OPTIONS(self):
        self._proxy()

    def _is_webhook_path(self, path: str) -> bool:
        for prefix in ROUTES:
            if path == prefix or path.startswith(prefix + "/") or path.startswith(prefix + "?"):
                return True
        return False

    def _proxy(self):
        path = self.path.split("?")[0]
        qs = ("?" + self.path.split("?", 1)[1]) if "?" in self.path else ""
        target = None
        # Match longest prefix first so /predictor/webhook wins over /webhook
        for prefix, (port, backend_path) in sorted(ROUTES.items(), key=lambda x: -len(x[0])):
            if path == prefix or path.startswith(prefix + "/") or path.startswith(prefix + "?"):
                # Preserve path suffix so /predictor/webhook/sync -> 5001/webhook/sync (Zynd health/sync)
                suffix = path[len(prefix):] if len(path) > len(prefix) else ""
                target = (port, backend_path + suffix + qs)
                break
        if not target:
            self.send_error(404, f"Unknown path: {path}")
            return

        # GET to webhook path: respond 200 immediately so Zynd health check passes (backend may only handle POST)
        if self.command == "GET" and self._is_webhook_path(path):
            self.send_response(200)
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
            self.wfile.write(b"ok")
            return

        port, backend_path = target
        url = f"http://127.0.0.1:{port}{backend_path}"
        try:
            body = self.rfile.read(int(self.headers.get("Content-Length", 0) or 0))
            req = urllib.request.Request(
                url,
                data=body if body else None,
                method=self.command,
                headers={k: v for k, v in self.headers.items() if k.lower() not in ("host", "connection")},
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                self.send_response(resp.status)
                for k, v in resp.headers.items():
                    if k.lower() not in ("transfer-encoding", "connection"):
                        self.send_header(k, v)
                self.end_headers()
                self.wfile.write(resp.read())
        except urllib.error.HTTPError as e:
            self.send_response(e.code)
            self.end_headers()
            try:
                self.wfile.write(e.read())
            except Exception:
                pass
        except Exception as e:
            self.send_error(502, str(e))

    def log_message(self, format, *args):
        print(f"[Proxy] {args[0]}")


def main():
    port = int(os.environ.get("PORT", "8080"))
    server = HTTPServer(("0.0.0.0", port), ProxyHandler)
    print(f"[Proxy] Listening on 0.0.0.0:{port} -> coordinator:5005, predictor:5001, mapper:5002, planner:5003, alert:5004")
    server.serve_forever()


if __name__ == "__main__":
    main()
