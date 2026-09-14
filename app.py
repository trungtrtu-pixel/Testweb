#!/usr/bin/env python3
from http.server import HTTPServer, SimpleHTTPRequestHandler
import os
PORT = 8080
class Handler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        print(f"[{self.log_date_time_string()}] {args[0]}")
if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)) or ".")
    print("=" * 50)
    print("  Free Drop – Tự động Netlify")
    print(f"  Mở: http://127.0.0.1:{PORT}")
    print("=" * 50)
    HTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
