"""Forma API: гостевые аккаунты с ключом входа, синхронизация данных, пуш о конце отдыха."""
import asyncio
import base64
import hashlib
import json
import logging
import os
import secrets
import time
from collections import defaultdict, deque
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

import asyncpg
from cryptography.hazmat.primitives import serialization
from fastapi import Depends, FastAPI, Header, HTTPException, Request
from pydantic import BaseModel, Field
from py_vapid import Vapid
from pywebpush import WebPushException, webpush

log = logging.getLogger("forma")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://forma:forma@127.0.0.1:5432/forma")
DATA_DIR = Path(os.environ.get("DATA_DIR", "./data"))
VAPID_SUB = os.environ.get("VAPID_SUB", "mailto:admin@forma.app")
KINDS = {"profile", "place", "workout", "measurement", "exercise"}
KEY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  token_hash TEXT UNIQUE NOT NULL,
  key_hash TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE SEQUENCE IF NOT EXISTS rec_seq;
CREATE TABLE IF NOT EXISTS records (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  id TEXT NOT NULL,
  data JSONB NOT NULL,
  updated_at BIGINT NOT NULL,
  deleted BOOLEAN NOT NULL DEFAULT false,
  seq BIGINT NOT NULL,
  PRIMARY KEY (user_id, kind, id)
);
CREATE INDEX IF NOT EXISTS records_seq ON records (user_id, seq);
CREATE TABLE IF NOT EXISTS push_subs (
  endpoint TEXT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS push_jobs (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  fire_at TIMESTAMPTZ NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  PRIMARY KEY (user_id, tag)
);
CREATE INDEX IF NOT EXISTS push_jobs_fire ON push_jobs (fire_at);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pass_hash TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS users_email ON users (email);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions (user_id);
"""

pool: asyncpg.Pool | None = None
vapid_pem: Path = DATA_DIR / "vapid.pem"
vapid_public = ""


def sha(s: str) -> str:
    return hashlib.sha256(s.encode()).hexdigest()


def hash_pw(pw: str) -> str:
    salt = secrets.token_bytes(16)
    h = hashlib.scrypt(pw.encode(), salt=salt, n=16384, r=8, p=1)
    return f"scrypt${salt.hex()}${h.hex()}"


def check_pw(pw: str, stored: str) -> bool:
    try:
        _, salt, h = stored.split("$")
        got = hashlib.scrypt(pw.encode(), salt=bytes.fromhex(salt), n=16384, r=8, p=1)
        return secrets.compare_digest(got.hex(), h)
    except Exception:  # noqa: BLE001
        return False


def norm_email(e: str) -> str:
    return e.strip().lower()


def valid_email(e: str) -> bool:
    return 3 <= len(e) <= 254 and "@" in e and "." in e.split("@")[-1] and " " not in e


def new_key() -> str:
    g = lambda: "".join(secrets.choice(KEY_ALPHABET) for _ in range(4))  # noqa: E731
    return f"FORMA-{g()}-{g()}-{g()}-{g()}"


def norm_key(k: str) -> str:
    k = "".join(ch for ch in k.upper() if ch.isalnum())
    if k.startswith("FORMA"):
        k = k[5:]
    return k


def load_vapid():
    global vapid_public
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    v = Vapid()
    if vapid_pem.exists():
        v = Vapid.from_file(str(vapid_pem))
    else:
        v.generate_keys()
        v.save_key(str(vapid_pem))
        os.chmod(vapid_pem, 0o600)
    raw = v.public_key.public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)
    vapid_public = base64.urlsafe_b64encode(raw).decode().rstrip("=")


def send_push(sub: dict, payload: dict) -> int:
    try:
        webpush(
            subscription_info={"endpoint": sub["endpoint"], "keys": {"p256dh": sub["p256dh"], "auth": sub["auth"]}},
            data=json.dumps(payload),
            vapid_private_key=str(vapid_pem),
            vapid_claims={"sub": VAPID_SUB},
            ttl=120,
            headers={"Urgency": "high"},
        )
        return 201
    except WebPushException as e:
        return e.response.status_code if e.response is not None else 500
    except Exception:  # noqa: BLE001
        log.exception("push failed")
        return 500


async def push_loop():
    while True:
        try:
            async with pool.acquire() as c:
                jobs = await c.fetch("DELETE FROM push_jobs WHERE fire_at <= now() RETURNING user_id, tag, title, body")
                for j in jobs:
                    subs = await c.fetch("SELECT endpoint, p256dh, auth FROM push_subs WHERE user_id=$1", j["user_id"])
                    for s in subs:
                        code = await asyncio.to_thread(send_push, dict(s), {"title": j["title"], "body": j["body"], "tag": j["tag"], "url": "/workout"})
                        if code in (404, 410):
                            await c.execute("DELETE FROM push_subs WHERE endpoint=$1", s["endpoint"])
        except Exception:  # noqa: BLE001
            log.exception("push loop")
        await asyncio.sleep(1)


@asynccontextmanager
async def lifespan(_: FastAPI):
    global pool
    load_vapid()
    pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=10)
    async with pool.acquire() as c:
        await c.execute(SCHEMA)
    task = asyncio.create_task(push_loop())
    yield
    task.cancel()
    await pool.close()


app = FastAPI(lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)

# — простое ограничение частоты для создания аккаунтов и ввода ключа —
_hits: dict[str, deque] = defaultdict(deque)


def limit(req: Request, bucket: str, n: int, per: int):
    ip = req.headers.get("x-real-ip") or (req.client.host if req.client else "?")
    q = _hits[f"{bucket}:{ip}"]
    now = time.time()
    while q and q[0] < now - per:
        q.popleft()
    if len(q) >= n:
        raise HTTPException(429, "too many requests")
    q.append(now)


async def user_id(authorization: str = Header(default="")) -> int:
    if not authorization.startswith("Bearer "):
        raise HTTPException(401)
    tok = authorization[7:].strip()
    async with pool.acquire() as c:
        uid = await c.fetchval("UPDATE sessions SET seen_at=now() WHERE token_hash=$1 RETURNING user_id", sha(tok))
        if not uid:
            uid = await c.fetchval("UPDATE users SET seen_at=now() WHERE token_hash=$1 RETURNING id", sha(tok))
    if not uid:
        raise HTTPException(401)
    return uid


@app.get("/api/health")
async def health():
    async with pool.acquire() as c:
        n = await c.fetchval("SELECT count(*) FROM users")
    return {"ok": True, "users": n, "time": datetime.now(timezone.utc).isoformat()}


@app.post("/api/auth/guest")
async def guest(req: Request):
    limit(req, "guest", 30, 3600)
    tok, key = secrets.token_urlsafe(32), new_key()
    async with pool.acquire() as c:
        await c.execute("INSERT INTO users(token_hash, key_hash) VALUES($1,$2)", sha(tok), sha(norm_key(key)))
    return {"token": tok, "key": key}


@app.get("/api/auth/key")
async def rotate_key(uid: int = Depends(user_id)):
    key = new_key()
    async with pool.acquire() as c:
        await c.execute("UPDATE users SET key_hash=$1 WHERE id=$2", sha(norm_key(key)), uid)
    return {"key": key}


class RecoverIn(BaseModel):
    key: str = Field(max_length=64)


@app.post("/api/auth/recover")
async def recover(body: RecoverIn, req: Request):
    limit(req, "recover", 10, 600)
    tok = secrets.token_urlsafe(32)
    async with pool.acquire() as c:
        uid = await c.fetchval("UPDATE users SET token_hash=$1, seen_at=now() WHERE key_hash=$2 RETURNING id", sha(tok), sha(norm_key(body.key)))
    if not uid:
        raise HTTPException(404, "unknown key")
    k = body.key.strip().upper()
    return {"token": tok, "key": k}


class RegisterIn(BaseModel):
    email: str = Field(max_length=254)
    password: str = Field(min_length=8, max_length=128)


@app.post("/api/auth/register")
async def register(body: RegisterIn, req: Request, uid: int = Depends(user_id)):
    limit(req, "register", 10, 3600)
    email = norm_email(body.email)
    if not valid_email(email):
        raise HTTPException(400, "bad email")
    async with pool.acquire() as c:
        cur = await c.fetchval("SELECT email FROM users WHERE id=$1", uid)
        if cur:
            raise HTTPException(409, "already registered")
        try:
            await c.execute("UPDATE users SET email=$1, pass_hash=$2 WHERE id=$3", email, hash_pw(body.password), uid)
        except asyncpg.UniqueViolationError:
            raise HTTPException(409, "email taken") from None
    return {"email": email}


class LoginIn(BaseModel):
    email: str = Field(max_length=254)
    password: str = Field(max_length=128)


@app.post("/api/auth/login")
async def login(body: LoginIn, req: Request):
    limit(req, "login", 20, 600)
    email = norm_email(body.email)
    async with pool.acquire() as c:
        row = await c.fetchrow("SELECT id, pass_hash FROM users WHERE email=$1", email)
        if not row or not row["pass_hash"] or not await asyncio.to_thread(check_pw, body.password, row["pass_hash"]):
            raise HTTPException(401, "wrong credentials")
        tok = secrets.token_urlsafe(32)
        await c.execute("INSERT INTO sessions(token_hash, user_id) VALUES($1,$2)", sha(tok), row["id"])
    return {"token": tok, "email": email}


@app.post("/api/auth/logout")
async def logout(authorization: str = Header(default="")):
    if authorization.startswith("Bearer "):
        async with pool.acquire() as c:
            await c.execute("DELETE FROM sessions WHERE token_hash=$1", sha(authorization[7:].strip()))
    return {"ok": True}


class PasswordIn(BaseModel):
    old: str = Field(max_length=128)
    new: str = Field(min_length=8, max_length=128)


@app.post("/api/auth/password")
async def change_password(body: PasswordIn, req: Request, uid: int = Depends(user_id)):
    limit(req, "password", 10, 600)
    async with pool.acquire() as c:
        ph = await c.fetchval("SELECT pass_hash FROM users WHERE id=$1", uid)
        if not ph or not await asyncio.to_thread(check_pw, body.old, ph):
            raise HTTPException(401, "wrong password")
        await c.execute("UPDATE users SET pass_hash=$1 WHERE id=$2", hash_pw(body.new), uid)
    return {"ok": True}


@app.get("/api/auth/me")
async def me(uid: int = Depends(user_id)):
    async with pool.acquire() as c:
        email = await c.fetchval("SELECT email FROM users WHERE id=$1", uid)
    return {"email": email}


class Change(BaseModel):
    kind: str
    id: str = Field(max_length=80)
    data: dict
    updatedAt: int
    deleted: bool = False


class SyncIn(BaseModel):
    since: int = 0
    changes: list[Change] = Field(default_factory=list, max_length=1000)


@app.post("/api/sync")
async def sync(body: SyncIn, uid: int = Depends(user_id)):
    async with pool.acquire() as c:
        async with c.transaction():
            for ch in body.changes:
                if ch.kind not in KINDS:
                    continue
                raw = json.dumps(ch.data, ensure_ascii=False)
                if len(raw) > 512_000:
                    continue
                await c.execute(
                    """INSERT INTO records(user_id, kind, id, data, updated_at, deleted, seq)
                       VALUES($1,$2,$3,$4::jsonb,$5,$6,nextval('rec_seq'))
                       ON CONFLICT (user_id, kind, id) DO UPDATE
                       SET data=EXCLUDED.data, updated_at=EXCLUDED.updated_at, deleted=EXCLUDED.deleted, seq=EXCLUDED.seq
                       WHERE records.updated_at < EXCLUDED.updated_at""",
                    uid, ch.kind, ch.id, raw, ch.updatedAt, ch.deleted,
                )
        rows = await c.fetch("SELECT kind, data, seq FROM records WHERE user_id=$1 AND seq>$2 ORDER BY seq LIMIT 20000", uid, body.since)
    cursor = max([r["seq"] for r in rows], default=body.since)
    return {"changes": [{"kind": r["kind"], "data": json.loads(r["data"])} for r in rows], "cursor": cursor}


@app.get("/api/push/key")
async def push_key():
    return {"key": vapid_public}


class SubIn(BaseModel):
    endpoint: str = Field(max_length=2000)
    keys: dict


@app.post("/api/push/subscribe")
async def subscribe(body: SubIn, uid: int = Depends(user_id)):
    p, a = body.keys.get("p256dh"), body.keys.get("auth")
    if not p or not a:
        raise HTTPException(400, "bad subscription")
    async with pool.acquire() as c:
        await c.execute(
            """INSERT INTO push_subs(endpoint, user_id, p256dh, auth) VALUES($1,$2,$3,$4)
               ON CONFLICT (endpoint) DO UPDATE SET user_id=EXCLUDED.user_id, p256dh=EXCLUDED.p256dh, auth=EXCLUDED.auth""",
            body.endpoint, uid, p, a,
        )
    return {"ok": True}


class UnsubIn(BaseModel):
    endpoint: str


@app.post("/api/push/unsubscribe")
async def unsubscribe(body: UnsubIn, uid: int = Depends(user_id)):
    async with pool.acquire() as c:
        await c.execute("DELETE FROM push_subs WHERE endpoint=$1 AND user_id=$2", body.endpoint, uid)
    return {"ok": True}


class ScheduleIn(BaseModel):
    tag: str = Field(max_length=40)
    at: int  # миллисекунды
    title: str = Field(max_length=120)
    body: str = Field(default="", max_length=240)


@app.post("/api/push/schedule")
async def schedule(body: ScheduleIn, uid: int = Depends(user_id)):
    at = datetime.fromtimestamp(body.at / 1000, tz=timezone.utc)
    if (at - datetime.now(timezone.utc)).total_seconds() > 3600:
        raise HTTPException(400, "too far")
    async with pool.acquire() as c:
        if body.body:
            await c.execute(
                """INSERT INTO push_jobs(user_id, tag, fire_at, title, body) VALUES($1,$2,$3,$4,$5)
                   ON CONFLICT (user_id, tag) DO UPDATE SET fire_at=EXCLUDED.fire_at, title=EXCLUDED.title, body=EXCLUDED.body""",
                uid, body.tag, at, body.title, body.body,
            )
        else:  # изменили только время
            await c.execute("UPDATE push_jobs SET fire_at=$3 WHERE user_id=$1 AND tag=$2", uid, body.tag, at)
    return {"ok": True}


class CancelIn(BaseModel):
    tag: str


@app.post("/api/push/cancel")
async def cancel(body: CancelIn, uid: int = Depends(user_id)):
    async with pool.acquire() as c:
        await c.execute("DELETE FROM push_jobs WHERE user_id=$1 AND tag=$2", uid, body.tag)
    return {"ok": True}
