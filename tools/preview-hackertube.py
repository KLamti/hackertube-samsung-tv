#!/usr/bin/env python3
"""Local-only preview; API proxy is never included in the installed TV app."""
import argparse
import http.server
import json
import pathlib
import urllib.error
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--port', type=int, default=8767)
args = parser.parse_args()

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(ROOT / 'hackertube'), **kw)

    def do_GET(self):
        parsed = urllib.parse.urlsplit(self.path)
        if parsed.path in ['/api/feed', '/api/list', '/api/search', '/api/browse', '/api/video']:
            try:
                with urllib.request.urlopen('https://hackertube.org' + self.path, timeout=20) as response:
                    body = response.read()
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', str(len(body)))
                self.end_headers()
                self.wfile.write(body)
            except (BrokenPipeError, ConnectionResetError):
                pass  # A preview reload may cancel an in-flight catalogue request.
            except (OSError, urllib.error.URLError):
                self.send_error(502, 'HackerTube is unavailable')
            return
        if parsed.path.startswith('/api/'):
            self.send_error(404)
            return
        super().do_GET()

print('HackerTube preview: http://127.0.0.1:%d' % args.port, flush=True)
http.server.ThreadingHTTPServer(('127.0.0.1', args.port), Handler).serve_forever()
