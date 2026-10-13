#!/usr/bin/env python3
"""WS probe: for each host+path, attempt handshake with optional subprotocol.
Records: handshake success/fail, status code if HTTP rejection, response headers,
and first N seconds of unsolicited frames."""
import asyncio, json, sys, ssl, pathlib, time, re
import websockets
from websockets.exceptions import InvalidStatus, InvalidHandshake, ConnectionClosedError, ConnectionClosedOK

OUT = pathlib.Path("/home/user/claude-agents/recon-payflows/raw/luigi")

HOSTS = [
    "luigi-public-ws.payflows.io",
    "luigi-api-public-ws.payflows.io",
    "luigi-ws.payflows.io",
    "luigi-api-ws.payflows.io",
]

PATHS = [
    "/", "/ws", "/websocket", "/socket", "/api/ws", "/v1/ws",
    "/stream", "/events", "/sub", "/pubsub", "/mqtt",
    "/graphql", "/signalr",
    "/socket.io/?EIO=4&transport=websocket",
]

SUBPROTOS = [
    None,
    "graphql-ws",
    "graphql-transport-ws",
    "v10.stomp",
    "v11.stomp",
    "v12.stomp",
    "wamp.2.json",
    "soap",
    "ocpp1.6",
    "mqtt",
    "mqttv3.1",
]

LISTEN_SECONDS = 4

def slug(host, path, proto):
    s = re.sub(r'[^a-zA-Z0-9]+', '-', f"{path}__{proto or 'noproto'}").strip('-')
    return f"{host}__{s}"

async def probe(host, path, subproto):
    url = f"wss://{host}{path}"
    kw = {"open_timeout": 6, "close_timeout": 2, "max_size": 2**20}
    if subproto:
        kw["subprotocols"] = [subproto]
    result = {"host": host, "path": path, "subproto": subproto, "url": url}
    try:
        async with websockets.connect(url, **kw) as ws:
            result["status"] = "connected"
            result["server_subproto"] = ws.subprotocol
            result["response_headers"] = dict(ws.response.headers.raw) if hasattr(ws, 'response') else {}
            frames = []
            deadline = time.monotonic() + LISTEN_SECONDS
            while True:
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    break
                try:
                    msg = await asyncio.wait_for(ws.recv(), timeout=remaining)
                    frames.append(msg if isinstance(msg, str) else msg.hex())
                except asyncio.TimeoutError:
                    break
                except (ConnectionClosedError, ConnectionClosedOK) as e:
                    result["closed_during_listen"] = {"code": e.code, "reason": e.reason}
                    break
            result["frames"] = frames
    except InvalidStatus as e:
        result["status"] = "http_rejected"
        try:
            result["http_status"] = e.response.status_code
            result["response_headers"] = dict(e.response.headers.raw)
            body = e.response.body if hasattr(e.response, 'body') else b""
            result["body_snippet"] = body[:400].decode('utf-8', errors='replace') if body else ""
        except Exception as ex:
            result["detail"] = f"{type(ex).__name__}:{ex}"
    except InvalidHandshake as e:
        result["status"] = "invalid_handshake"
        result["detail"] = f"{type(e).__name__}:{e}"
    except ConnectionClosedError as e:
        result["status"] = "closed_on_connect"
        result["detail"] = f"code={e.code} reason={e.reason}"
    except asyncio.TimeoutError:
        result["status"] = "timeout"
    except Exception as e:
        result["status"] = "error"
        result["detail"] = f"{type(e).__name__}:{e}"
    return result

async def main():
    tasks = []
    for host in HOSTS:
        for path in PATHS:
            for proto in SUBPROTOS:
                tasks.append((host, path, proto))
    sem = asyncio.Semaphore(3)
    results = []
    async def one(t):
        async with sem:
            r = await probe(*t)
            results.append(r)
            print(json.dumps({k:v for k,v in r.items() if k not in ("frames","response_headers","body_snippet")}, default=str), flush=True)
            await asyncio.sleep(0.2)
    await asyncio.gather(*[one(t) for t in tasks])
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "wsprobe-all.json").write_text(json.dumps(results, indent=2, default=str))

asyncio.run(main())
