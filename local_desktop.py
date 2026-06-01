# -*- coding: utf-8 -*-
import os
import socket
import sys
import threading
import time
import urllib.request
import webbrowser

import webview

import app as jxc_app


def request_ok(url):
    try:
        with urllib.request.urlopen(url, timeout=1.5) as resp:
            return resp.status == 200
    except Exception:
        return False


def find_available_port(preferred):
    for port in range(int(preferred), int(preferred) + 20):
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        try:
            sock.bind(("127.0.0.1", port))
            return port
        except OSError:
            pass
        finally:
            sock.close()
    return int(preferred)


def start_server(port):
    jxc_app.init_db()
    jxc_app.app.run(host="0.0.0.0", port=port, debug=False, use_reloader=False)


def resolve_url():
    preferred = int(os.environ.get("JXC_PORT", "5001"))
    existing_url = "http://127.0.0.1:%s" % preferred
    if request_ok(existing_url + "/api/health"):
        return existing_url, False

    port = find_available_port(preferred)
    url = "http://127.0.0.1:%s" % port
    thread = threading.Thread(target=start_server, args=(port,))
    thread.daemon = True
    thread.start()

    for _ in range(40):
        if request_ok(url + "/api/health"):
            return url, True
        time.sleep(0.25)
    return url, True


def main():
    url, _started = resolve_url()
    try:
        webview.create_window("管家婆进销存 V2 本地版", url, width=1280, height=820, min_size=(980, 640))
        webview.start()
    except Exception:
        webbrowser.open(url)
        if getattr(sys, "frozen", False):
            time.sleep(3)


if __name__ == "__main__":
    main()
