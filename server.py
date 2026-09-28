import os
import uuid
import re
import bcrypt
import jwt
import logging
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any

from dotenv import load_dotenv
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

# --- Config ---
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")
load_dotenv(ROOT_DIR / "app" / "backend" / ".env")

IS_PRODUCTION = os.environ.get("RENDER", "") or os.environ.get("NODE_ENV") == "production"

JWT_SECRET = os.environ.get("JWT_SECRET", "").strip()
if not JWT_SECRET:
    if IS_PRODUCTION:
        raise RuntimeError("JWT_SECRET must be set in production")
    JWT_SECRET = "saathi-dev-secret-change-me"
    logging.getLogger("saathi").warning(
        "JWT_SECRET is unset — using an insecure development fallback. "
        "Set JWT_SECRET before deploying."
    )
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours for prototype

mongo_url = os.environ.get("MONGO_URL", "").strip()
if not mongo_url:
    raise RuntimeError("MONGO_URL is required. Set it in .env or as a Render env var.")
db_name = os.environ.get("DB_NAME", "").strip()
if not db_name:
    raise RuntimeError("DB_NAME is required. Set it in .env or as a Render env var.")

_origins = os.environ.get("CORS_ORIGINS", "*")
CORS_ORIGINS = [o.strip() for o in _origins.split(",") if o.strip()] or ["*"]

client = AsyncIOMotorClient(
    mongo_url,
    serverSelectionTimeoutMS=int(os.environ.get("MONGO_TIMEOUT_MS", "5000")),
    connectTimeoutMS=int(os.environ.get("MONGO_TIMEOUT_MS", "5000")),
)
db = client[db_name]

app = FastAPI(title="SAATHI Counsellor API")
api_router = APIRouter(prefix="/api")
bearer_scheme = HTTPBearer(auto_error=False)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("saathi")


# --- Auth utils ---
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_counsellor(
    request: Request,
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> Dict[str, Any]:
    token = None
    if creds and creds.scheme.lower() == "bearer":
        token = creds.credentials
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.counsellors.find_one({"id": payload["sub"]}, {"password_hash": 0, "_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# --- Models ---
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AssessmentSubmit(BaseModel):
    distress_level: int = Field(ge=1, le=5)  # 1 low, 5 high
    sleep_quality: int = Field(ge=1, le=5)   # 1 poor, 5 great
    safety_feeling: int = Field(ge=1, le=5)  # 1 unsafe, 5 safe
    support_system: int = Field(ge=1, le=5)  # 1 none, 5 strong
    hopefulness: int = Field(ge=1, le=5)     # 1 low, 5 high
    notes: Optional[str] = ""


# --- Constants ---
URGENT_KEYWORDS = ["hurt", "unsafe", "harm", "kill", "suicide", "beat", "threaten", "weapon"]
STATUS_URGENT = "urgent"
STATUS_PRIORITY = "priority"
STATUS_REVIEW = "review"
STATUS_ROUTINE = "routine"


def compute_priority_score(case: dict, checkins: List[dict]) -> int:
    """Return priority score out of 100 (higher = more urgent)."""
    if not checkins:
        return 50
    recent = sorted(checkins, key=lambda c: c["timestamp"], reverse=True)[:6]
    avg = sum(c["score"] for c in recent) / len(recent)
    # score 1-10 -> low score = high priority
    base = int((10 - avg) * 8)  # 0-72
    # Drop delta bonus
    if len(recent) >= 3:
        newest = sum(c["score"] for c in recent[:3]) / 3
        older = sum(c["score"] for c in recent[3:]) / max(1, len(recent[3:]))
        drop = older - newest
        if drop >= 1.5:
            base += 18
        elif drop >= 0.8:
            base += 10
    # Missed checkin
    latest_ts = recent[0]["timestamp"]
    if isinstance(latest_ts, str):
        latest_ts = datetime.fromisoformat(latest_ts.replace("Z", "+00:00"))
    hours = (datetime.now(timezone.utc) - latest_ts).total_seconds() / 3600
    if hours > 24:
        base += 8
    # Keyword hit
    latest_note = (recent[0].get("note") or "").lower()
    if any(k in latest_note for k in URGENT_KEYWORDS):
        base = max(base, 88)
    return max(0, min(100, base))


def derive_status(score: int) -> str:
    if score >= 80:
        return STATUS_URGENT
    if score >= 60:
        return STATUS_PRIORITY
    if score >= 40:
        return STATUS_REVIEW
    return STATUS_ROUTINE


async def refresh_case_status(case_id: str):
    case = await db.cases.find_one({"id": case_id}, {"_id": 0})
    if not case:
        return
    checkins = await db.checkins.find({"case_ref": case_id}, {"_id": 0}).to_list(200)
    score = compute_priority_score(case, checkins)
    status = derive_status(score)
    await db.cases.update_one(
        {"id": case_id},
        {"$set": {"priority_score": score, "status": status, "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    return {"score": score, "status": status}


async def maybe_generate_alerts(case_id: str):
    case = await db.cases.find_one({"id": case_id}, {"_id": 0})
    if not case:
        return
    checkins = sorted(
        await db.checkins.find({"case_ref": case_id}, {"_id": 0}).to_list(200),
        key=lambda c: c["timestamp"],
        reverse=True,
    )
    if not checkins:
        return
    latest = checkins[0]
    latest_ts = latest["timestamp"]
    if isinstance(latest_ts, str):
        latest_ts_dt = datetime.fromisoformat(latest_ts.replace("Z", "+00:00"))
    else:
        latest_ts_dt = latest_ts
    now = datetime.now(timezone.utc)

    def add_alert(a_type: str, reason: str):
        alert = {
            "id": str(uuid.uuid4()),
            "case_ref": case_id,
            "case_alias": case["alias"],
            "case_code": case["case_id"],
            "type": a_type,
            "reason": reason,
            "read": False,
            "created_at": now.isoformat(),
        }
        return alert

    new_alerts = []
    # Keyword scan
    note = (latest.get("note") or "").lower()
    if any(k in note for k in URGENT_KEYWORDS):
        new_alerts.append(add_alert("urgent", f"Critical safety keyword detected in latest check-in note"))
    # Missed > 24h
    hours = (now - latest_ts_dt).total_seconds() / 3600
    if hours > 24:
        new_alerts.append(add_alert("review", f"No check-in for {int(hours)}h — follow up recommended"))
    # Wellbeing drop across 3
    if len(checkins) >= 3:
        drop = checkins[2]["score"] - checkins[0]["score"]
        if drop >= 1.5:
            new_alerts.append(add_alert("priority", f"Well-being score dropped {drop:.1f} points across last 3 check-ins"))
    if new_alerts:
        # avoid duplicates within last 24h with same reason
        recent_reasons = await db.alerts.find(
            {"case_ref": case_id, "created_at": {"$gte": (now - timedelta(hours=24)).isoformat()}},
            {"_id": 0, "reason": 1},
        ).to_list(50)
        seen = {r["reason"] for r in recent_reasons}
        fresh = [a for a in new_alerts if a["reason"] not in seen]
        if fresh:
            await db.alerts.insert_many(fresh)


# --- Auth Endpoints ---
@api_router.post("/auth/login")
async def login(payload: LoginRequest):
    email = payload.email.lower().strip()
    user = await db.counsellors.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user["id"], user["email"])
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "language": user.get("language", "en"),
        },
    }


@api_router.get("/auth/me")
async def me(user=Depends(get_current_counsellor)):
    return user


@api_router.post("/auth/logout")
async def logout(user=Depends(get_current_counsellor)):
    return {"ok": True}


# --- Dashboard ---
@api_router.get("/dashboard/summary")
async def dashboard_summary(user=Depends(get_current_counsellor)):
    cases = await db.cases.find({"assigned_to": user["id"]}, {"_id": 0}).to_list(500)
    counts = {STATUS_URGENT: 0, STATUS_PRIORITY: 0, STATUS_REVIEW: 0, STATUS_ROUTINE: 0}
    for c in cases:
        counts[c.get("status", STATUS_ROUTINE)] += 1
    return {"counts": counts, "total": len(cases)}


@api_router.get("/dashboard/trend")
async def dashboard_trend(user=Depends(get_current_counsellor)):
    """Average well-being across last 6 check-ins per case, aggregated by ordinal position."""
    cases = await db.cases.find({"assigned_to": user["id"]}, {"_id": 0, "id": 1}).to_list(500)
    case_ids = [c["id"] for c in cases]
    if not case_ids:
        return {"points": []}
    # For each case, get last 6 checkins ordered oldest->newest, aggregate by index
    buckets: List[List[float]] = [[] for _ in range(6)]
    for cid in case_ids:
        cks = await db.checkins.find({"case_ref": cid}, {"_id": 0}).to_list(200)
        cks = sorted(cks, key=lambda c: c["timestamp"], reverse=True)[:6]
        cks = list(reversed(cks))
        for i, ck in enumerate(cks):
            buckets[6 - len(cks) + i].append(ck["score"])
    points = []
    for i, b in enumerate(buckets):
        if b:
            points.append({"label": f"T-{6-i}", "avg": round(sum(b) / len(b), 2)})
        else:
            points.append({"label": f"T-{6-i}", "avg": None})
    return {"points": points}


# --- Cases ---
@api_router.get("/cases")
async def list_cases(
    status: Optional[str] = None,
    q: Optional[str] = None,
    user=Depends(get_current_counsellor),
):
    query: Dict[str, Any] = {"assigned_to": user["id"]}
    if status and status != "all":
        query["status"] = status
    if q:
        rx = re.compile(re.escape(q), re.IGNORECASE)
        query["$or"] = [{"case_id": rx}, {"alias": rx}]
    cases = await db.cases.find(query, {"_id": 0}).to_list(500)
    # Attach sparkline
    for c in cases:
        cks = await db.checkins.find({"case_ref": c["id"]}, {"_id": 0}).to_list(200)
        cks = sorted(cks, key=lambda x: x["timestamp"], reverse=True)[:6]
        c["sparkline"] = [ck["score"] for ck in reversed(cks)]
        c["last_checkin"] = cks[0]["timestamp"] if cks else None
    cases.sort(key=lambda c: c.get("priority_score", 0), reverse=True)
    return {"cases": cases}


@api_router.get("/cases/{case_id}")
async def get_case(case_id: str, user=Depends(get_current_counsellor)):
    case = await db.cases.find_one({"id": case_id, "assigned_to": user["id"]}, {"_id": 0})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    checkins = await db.checkins.find({"case_ref": case_id}, {"_id": 0}).to_list(200)
    checkins = sorted(checkins, key=lambda c: c["timestamp"])
    assessments = await db.assessments.find({"case_ref": case_id}, {"_id": 0}).to_list(200)
    assessments = sorted(assessments, key=lambda a: a["created_at"], reverse=True)
    alerts = await db.alerts.find({"case_ref": case_id}, {"_id": 0}).to_list(50)
    alerts = sorted(alerts, key=lambda a: a["created_at"], reverse=True)
    # Reason for flag
    why = []
    if case.get("priority_score", 0) >= 80:
        why.append("Priority score in the urgent range.")
    if checkins:
        last = checkins[-1]
        note = (last.get("note") or "").lower()
        if any(k in note for k in URGENT_KEYWORDS):
            why.append("Safety keyword detected in latest note.")
        latest_ts = last["timestamp"]
        if isinstance(latest_ts, str):
            latest_ts = datetime.fromisoformat(latest_ts.replace("Z", "+00:00"))
        hours = (datetime.now(timezone.utc) - latest_ts).total_seconds() / 3600
        if hours > 24:
            why.append(f"No check-in for {int(hours)}h.")
    if len(checkins) >= 3:
        recent = list(reversed(checkins))[:3]
        drop = recent[-1]["score"] - recent[0]["score"]
        if drop >= 1.5:
            why.append(f"Well-being dropped {drop:.1f} points across last 3 check-ins.")
    if not why:
        why.append("No active flags — case appears stable.")
    # Recommendation
    if case.get("status") == "urgent":
        recommend = "Immediate outreach: call within 1 hour, verify safety, activate safety plan."
    elif case.get("status") == "priority":
        recommend = "Schedule assessment within 24h and increase check-in frequency."
    elif case.get("status") == "review":
        recommend = "Reach out for a wellness check and update case notes."
    else:
        recommend = "Continue routine check-ins. No immediate action required."
    return {
        "case": case,
        "checkins": checkins,
        "assessments": assessments,
        "alerts": alerts,
        "why_flagged": why,
        "recommended_next_step": recommend,
    }


@api_router.post("/cases/{case_id}/assessment")
async def submit_assessment(case_id: str, payload: AssessmentSubmit, user=Depends(get_current_counsellor)):
    case = await db.cases.find_one({"id": case_id, "assigned_to": user["id"]}, {"_id": 0})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    # Outcome score: normalized 0-100 (higher = more urgent risk)
    # distress high = urgent; sleep/safety/support/hope low = urgent
    urgent_pts = (payload.distress_level - 1) * 5 + (5 - payload.sleep_quality) * 4 + \
                 (5 - payload.safety_feeling) * 6 + (5 - payload.support_system) * 4 + \
                 (5 - payload.hopefulness) * 4
    outcome_score = min(100, int(urgent_pts * (100 / 92)))
    if outcome_score >= 75:
        outcome = "urgent"
    elif outcome_score >= 55:
        outcome = "priority"
    elif outcome_score >= 35:
        outcome = "review"
    else:
        outcome = "routine"
    now = datetime.now(timezone.utc).isoformat()
    assessment_doc = {
        "id": str(uuid.uuid4()),
        "case_ref": case_id,
        "counsellor_ref": user["id"],
        "counsellor_name": user["name"],
        "answers": payload.model_dump(),
        "outcome": outcome,
        "outcome_score": outcome_score,
        "created_at": now,
    }
    await db.assessments.insert_one(assessment_doc)
    # Also log as a check-in with derived 1-10 well-being score
    wellbeing = round(10 - (outcome_score / 10), 1)
    checkin = {
        "id": str(uuid.uuid4()),
        "case_ref": case_id,
        "score": wellbeing,
        "note": f"Assessment by {user['name']}: {payload.notes or 'no notes'}",
        "missed": False,
        "source": "assessment",
        "timestamp": now,
    }
    await db.checkins.insert_one(checkin)
    await db.cases.update_one({"id": case_id}, {"$set": {"assessed": True, "last_assessed_at": now}})
    await refresh_case_status(case_id)
    await maybe_generate_alerts(case_id)
    assessment_doc.pop("_id", None)
    return {"assessment": assessment_doc}


# --- Alerts ---
@api_router.get("/alerts")
async def list_alerts(limit: int = 20, user=Depends(get_current_counsellor)):
    case_ids = [c["id"] async for c in db.cases.find({"assigned_to": user["id"]}, {"_id": 0, "id": 1})]
    alerts = await db.alerts.find({"case_ref": {"$in": case_ids}}, {"_id": 0}).to_list(500)
    alerts = sorted(alerts, key=lambda a: a["created_at"], reverse=True)[:limit]
    return {"alerts": alerts}


@api_router.post("/alerts/{alert_id}/read")
async def mark_alert_read(alert_id: str, user=Depends(get_current_counsellor)):
    await db.alerts.update_one({"id": alert_id}, {"$set": {"read": True}})
    return {"ok": True}


# --- Health ---
@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "saathi-api"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=CORS_ORIGINS != ["*"],
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Seed data ---
async def seed_data():
    # Validate config before touching Mongo so misconfiguration fails fast.
    seed_password = os.environ.get("SEED_PASSWORD", "").strip()
    if not seed_password:
        raise RuntimeError(
            "SEED_PASSWORD is required to seed counsellor accounts. "
            "Set it in .env or as a Render env var."
        )
    owner_email = os.environ.get(
        "SEED_OWNER_EMAIL", "counsellor@saathi.org"
    ).strip()

    # Indexes
    await db.counsellors.create_index("email", unique=True)
    await db.cases.create_index("case_id", unique=True)
    await db.checkins.create_index("case_ref")
    await db.alerts.create_index("case_ref")

    # Counsellors
    # Passwords come from SEED_PASSWORD so no credential lives in source.
    counsellors_seed = [
        {"email": owner_email, "name": "Lead Counsellor", "language": "en"},
        {"email": "priya@saathi.org", "name": "Priya Sharma", "language": "en"},
        {"email": "rajesh@saathi.org", "name": "Rajesh Iyer", "language": "en"},
    ]
    counsellor_ids = {}
    for c in counsellors_seed:
        existing = await db.counsellors.find_one({"email": c["email"]})
        if existing:
            counsellor_ids[c["email"]] = existing["id"]
            continue
        cid = str(uuid.uuid4())
        counsellor_ids[c["email"]] = cid
        await db.counsellors.insert_one({
            "id": cid,
            "email": c["email"],
            "name": c["name"],
            "password_hash": hash_password(seed_password),
            "language": c["language"],
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    # Only seed cases if none exist
    existing_count = await db.cases.count_documents({})
    if existing_count > 0:
        return

    owner = counsellor_ids[owner_email]
    priya = counsellor_ids["priya@saathi.org"]

    now = datetime.now(timezone.utc)

    cases_seed = [
        # (case_id, alias, language, channel, stage, assigned, scores 6 recent oldest->newest, notes)
        ("STH-1042", "Survivor #1042 (Meera)", "hi", "IVRS", "intake", owner,
         [7.5, 7.2, 6.8, 6.2, 5.4, 4.6],
         ["Feeling okay today", "Some anxiety at night", "Argument with in-laws", "Can't sleep", "Feeling unsafe at home", "He threatened me again — I feel scared"]),
        ("STH-1043", "Survivor #1043 (Kavita)", "hi", "WhatsApp", "counselling", owner,
         [6.0, 6.2, 6.4, 6.1, 6.3, 6.5],
         ["Steady", "Attended session", "Better sleep", "Family visit went okay", "Stable", "Feeling supported"]),
        ("STH-1044", "Survivor #1044 (Anita)", "en", "WhatsApp", "safety-plan", owner,
         [5.4, 5.2, 4.8, 4.6, 4.2, 3.9],
         ["Struggling", "Missed appointment", "Feeling isolated", "No support from family", "Overwhelmed", "Very low today, can't get out of bed"]),
        ("STH-1045", "Survivor #1045 (Farida)", "en", "IVRS", "monitoring", owner,
         [8.0, 8.2, 7.9, 8.1, 8.3, 8.5],
         ["Doing well", "Started new job", "Kids are okay", "Attending support group", "Feeling hopeful", "Great week overall"]),
        ("STH-1046", "Survivor #1046 (Pooja)", "hi", "WhatsApp", "intake", owner,
         [6.5, 6.3, 6.0, 5.7, 5.3, 4.8],
         ["Okay", "Tired", "Some conflict at home", "Feeling scared to go out", "Anxious", "Worried about the kids' safety"]),
        ("STH-1047", "Survivor #1047 (Rekha)", "en", "IVRS", "counselling", priya,
         [7.0, 6.8, 6.5, 6.7, 6.9, 7.1],
         ["Stable", "Session went well", "Good day", "Manageable", "Improving", "Feeling stronger"]),
        ("STH-1048", "Survivor #1048 (Sunita)", "hi", "WhatsApp", "safety-plan", owner,
         [4.5, 4.2, 3.8, 3.5, 3.1, 2.7],
         ["Distressed", "Cannot sleep", "He hurt me again", "Feeling unsafe", "Threatened by partner", "I fear he might harm me tonight"]),
        ("STH-1049", "Survivor #1049 (Neelam)", "en", "IVRS", "monitoring", owner,
         [7.8, 7.6, 7.9, 7.7, 7.8, 8.0],
         ["Good", "Positive", "Family therapy helping", "Steady", "Feeling grounded", "Best week in a while"]),
    ]

    for i, (case_code, alias, lang, chan, stage, assigned, scores, notes) in enumerate(cases_seed):
        case_uuid = str(uuid.uuid4())
        # Latest offset — for STH-1044 make missed >24h
        latest_hours_ago = 30 if case_code == "STH-1044" else 3
        for j, (score, note) in enumerate(zip(scores, notes)):
            hours_ago = latest_hours_ago + (len(scores) - 1 - j) * 22
            ts = (now - timedelta(hours=hours_ago)).isoformat()
            await db.checkins.insert_one({
                "id": str(uuid.uuid4()),
                "case_ref": case_uuid,
                "score": score,
                "note": note,
                "missed": False,
                "source": "checkin",
                "timestamp": ts,
            })
        await db.cases.insert_one({
            "id": case_uuid,
            "case_id": case_code,
            "alias": alias,
            "language": lang,
            "channel": chan,
            "stage": stage,
            "assigned_to": assigned,
            "status": "routine",
            "priority_score": 50,
            "flags": [],
            "assessed": False,
            "created_at": (now - timedelta(days=14)).isoformat(),
            "updated_at": now.isoformat(),
        })
        await refresh_case_status(case_uuid)
        await maybe_generate_alerts(case_uuid)


@app.on_event("startup")
async def on_startup():
    try:
        await seed_data()
        logger.info("Seed complete")
    except Exception as e:
        logger.error(f"Seed error: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
