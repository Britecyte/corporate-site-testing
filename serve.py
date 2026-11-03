#!/usr/bin/env python3
"""Serve the corporate-site-testing preview for both sites.

    http://127.0.0.1:8002/            → index of the two sites
    http://127.0.0.1:8002/lipoderma/  → new Lipoderma build
    http://127.0.0.1:8002/britecyte/  → Britecyte company site

No caching, so edits show up on reload.
"""
from __future__ import annotations

import http.server
import os
import socket
import socketserver

PORT = 8002
ROOT = os.path.dirname(os.path.abspath(__file__))


def local_ip() -> str:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):  # quiet
        pass


class ThreadingServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    daemon_threads = True
    allow_reuse_address = True


if __name__ == "__main__":
    ip = local_ip()
    with ThreadingServer(("0.0.0.0", PORT), Handler) as httpd:
        print(f"Serving preview at http://127.0.0.1:{PORT}/")
        print(f"  Lipoderma  http://127.0.0.1:{PORT}/lipoderma/")
        print(f"  Britecyte  http://127.0.0.1:{PORT}/britecyte/")
        print(f"On your phone (same Wi-Fi): http://{ip}:{PORT}/lipoderma/")
        print("Ctrl+C to stop.")
        httpd.serve_forever()
