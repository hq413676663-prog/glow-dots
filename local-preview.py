"""Double-click launcher helper; local preview only, not a deployment dependency."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import hashlib
import subprocess
import sys
import time
import urllib.request

ROOT = Path(__file__).resolve().parent
IDENTITY = hashlib.sha256(str(ROOT).encode()).hexdigest()


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/__glow_preview_identity__':
            data = IDENTITY.encode()
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain')
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            self.wfile.write(data)
            return
        super().do_GET()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


def is_ours(port):
    try:
        with urllib.request.urlopen(
            f'http://127.0.0.1:{port}/__glow_preview_identity__', timeout=0.4
        ) as response:
            return response.read(128).decode() == IDENTITY
    except Exception:
        return False


if len(sys.argv) == 3 and sys.argv[1] == '--serve':
    ThreadingHTTPServer(
        ('127.0.0.1', int(sys.argv[2])), partial(Handler, directory=str(ROOT))
    ).serve_forever()
else:
    for port in range(4176, 4196):
        if not is_ours(port):
            process = subprocess.Popen(
                [sys.executable, str(Path(__file__).resolve()), '--serve', str(port)],
                stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL, start_new_session=True,
            )
            for _ in range(20):
                if is_ours(port) or process.poll() is not None:
                    break
                time.sleep(0.1)
        if is_ours(port):
            url = f'http://127.0.0.1:{port}/index.html'
            subprocess.run(['open', url], check=True)
            print('网站已打开。修改文件后，刷新浏览器即可查看。此窗口可以关闭。')
            break
    else:
        raise SystemExit('本地服务启动失败，请检查 4176–4195 端口是否可用。')
