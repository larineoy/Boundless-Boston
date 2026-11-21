"""Persistent local demo supervisor. Commands: start, status, stop (Windows)."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import time
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / '.cache' / 'demo'
STATE = CACHE / 'state.json'
STOP = CACHE / 'stop'
URLS = {'backend': 'http://127.0.0.1:8000/api/health', 'frontend': 'http://127.0.0.1:5173/'}


def healthy(url):
    try:
        with urlopen(url, timeout=3) as response:
            return response.status == 200
    except Exception:
        return False


def state():
    try:
        return json.loads(STATE.read_text())
    except (OSError, ValueError):
        return {}


def save(value):
    temporary = STATE.with_suffix('.tmp')
    temporary.write_text(json.dumps(value))
    temporary.replace(STATE)


def supervise():
    import msvcrt
    # An OS lock prevents two concurrent start commands from creating supervisors.
    lock = (CACHE / 'supervisor.lock').open('a+b')
    lock.write(b'0')
    lock.flush()
    lock.seek(0)
    try:
        msvcrt.locking(lock.fileno(), msvcrt.LK_NBLCK, 1)
    except OSError:
        return
    STOP.unlink(missing_ok=True)
    commands = {
        'backend': [sys.executable, '-m', 'uvicorn', 'app.main:app', '--app-dir', 'backend', '--host', '127.0.0.1', '--port', '8000'],
        'frontend': [shutil.which('node'), 'node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5173', '--strictPort'],
    }
    children, started, failures = {}, {}, {}
    logs = {name: (CACHE / f'{name}.log').open('ab', buffering=0) for name in commands}
    try:
        while not STOP.exists():
            for name, command in commands.items():
                process = children.get(name)
                if process is None or process.poll() is not None:
                    # Never kill or replace an unrelated process using our ports.
                    if healthy(URLS[name]):
                        continue
                    logs[name].write(f'\nStarting {name} at {time.ctime()}\n'.encode())
                    children[name] = subprocess.Popen(command, cwd=ROOT, stdin=subprocess.DEVNULL,
                        stdout=logs[name], stderr=subprocess.STDOUT, creationflags=subprocess.CREATE_NO_WINDOW)
                    started[name], failures[name] = time.monotonic(), 0
                elif time.monotonic() - started[name] > 60:
                    failures[name] = 0 if healthy(URLS[name]) else failures[name] + 1
                    if failures[name] >= 3:
                        process.terminate()
                        try:
                            process.wait(timeout=10)
                        except subprocess.TimeoutExpired:
                            process.kill()
                            process.wait()
            save({'supervisor_pid': os.getpid(), 'heartbeat': time.time(),
                  'children': {name: process.pid for name, process in children.items() if process.poll() is None}})
            time.sleep(3)
    finally:
        for process in children.values():
            if process.poll() is None:
                process.terminate()
                try:
                    process.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait()
        save({'stopped': True})
        for log in logs.values():
            log.close()
        lock.close()


def main():
    CACHE.mkdir(parents=True, exist_ok=True)
    action = sys.argv[1] if len(sys.argv) > 1 else 'start'
    if action == 'supervise':
        supervise()
        return
    if action == 'stop':
        STOP.touch()
        deadline = time.monotonic() + 30
        while time.monotonic() < deadline:
            if state().get('stopped') or time.time() - state().get('heartbeat', 0) > 30:
                print('Demo supervisor stopped.')
                return
            time.sleep(1)
        raise SystemExit('Stop timed out; check .cache/demo logs.')
    if action == 'start':
        if not shutil.which('node'):
            raise SystemExit('Node.js is required. Install dependencies with npm install first.')
        previous = state()
        if previous.get('stopped') or time.time() - previous.get('heartbeat', 0) > 20:
            STOP.unlink(missing_ok=True)
            with (CACHE / 'supervisor.log').open('ab') as log:
                subprocess.Popen([sys.executable, str(Path(__file__).resolve()), 'supervise'],
                    cwd=ROOT, stdin=subprocess.DEVNULL, stdout=log, stderr=log,
                    creationflags=subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP,
                    close_fds=True)
        deadline = time.monotonic() + 90
        while time.monotonic() < deadline:
            if all(healthy(url) for url in URLS.values()):
                print('Demo running in background: http://127.0.0.1:5173')
                print('Use npm run demo:status or npm run demo:stop. Logs: .cache/demo/')
                return
            time.sleep(1)
        raise SystemExit('Demo did not become healthy. Check .cache/demo/*.log.')
    if action == 'status':
        current = state()
        print('Supervisor:', 'running' if time.time() - current.get('heartbeat', 0) < 20 else 'stopped')
        for name, url in URLS.items():
            print(f'{name}: {"healthy" if healthy(url) else "unavailable"} ({url})')
        return
    raise SystemExit('Use start, status, or stop.')


if __name__ == '__main__':
    main()
