"""Serve the local preview without HTTP caching or conditional 304 responses."""
import hashlib
import io
import re
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class PreviewHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def send_head(self):
        for name in ("If-Modified-Since", "If-None-Match"):
            if name in self.headers:
                del self.headers[name]
        root = Path(self.directory)
        path = Path(self.translate_path(self.path))
        if path.is_dir():
            path = path / "index.html"
        if path.is_file() and path.suffix in (".html", ".mjs"):
            digest = hashlib.sha256()
            for source in sorted(root.iterdir()):
                if source.is_file() and source.suffix in (".html", ".mjs", ".css"):
                    digest.update(source.name.encode())
                    digest.update(source.read_bytes())
            version = digest.hexdigest()[:16]
            text = path.read_text()
            if path.suffix == ".html":
                text = re.sub(r'(src="[^"?]+\.mjs)(?:\?[^"]*)?"', lambda m: m[1] + "?dev=" + version + '"', text)
                text = re.sub(r'(href="[^"?]+\.css)(?:\?[^" ]*)?"', lambda m: m[1] + "?dev=" + version + '"', text)
            else:
                text = re.sub(r"(from ['\"]\./[^'\"?]+\.mjs)(?:\?[^'\"]*)?(['\"])", lambda m: m[1] + "?dev=" + version + m[2], text)
            data = text.encode()
            self.send_response(200)
            self.send_header("Content-Type", ("text/html" if path.suffix == ".html" else "text/javascript") + "; charset=utf-8")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            return io.BytesIO(data)
        return super().send_head()


if __name__ == "__main__":
    root = Path(__file__).resolve().parent.parent / "dist"
    handler = partial(PreviewHandler, directory=str(root))
    server = ThreadingHTTPServer(("127.0.0.1", 4173), handler)
    print("Local preview: http://127.0.0.1:4173/ (HTTP cache disabled)", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
