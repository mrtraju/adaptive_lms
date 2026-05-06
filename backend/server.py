"""
Adaptive AI LMS backend (modular monolith).
Auth (JWT), Curriculum, AI Tutor (Groq), Lessons, Quiz, Progress, Admin analytics,
Subscriptions (free / premium), Bridge mode, short-lived stream tokens, intervention cache.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os, logging, uuid, json, bcrypt, jwt
from pathlib import Path
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Literal
from datetime import datetime, timezone, timedelta
from groq import AsyncGroq
from cachetools import TTLCache

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
GROQ_API_KEY = os.environ["GROQ_API_KEY"]
GROQ_MODEL = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES = int(os.environ.get("JWT_EXPIRE_MINUTES", "10080"))

FREE_LESSON_REGEN_PER_DAY = 3
PREMIUM_PERSONALITIES = {"socratic", "motivational"}

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]
groq_client = AsyncGroq(api_key=GROQ_API_KEY)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("lms")

# In-memory TTL caches
_intervention_cache: TTLCache = TTLCache(maxsize=1000, ttl=600)  # 10 min


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Seed users if empty
    if await db.users.count_documents({}) == 0:
        now = datetime.now(timezone.utc).isoformat()
        seeds = [
            {"id": str(uuid.uuid4()), "email": "admin@lms.com", "name": "System Admin",
             "password": _hash_pw("admin123"), "role": "admin", "language": "en",
             "plan": "premium", "premium_since": now, "created": now},
            {"id": str(uuid.uuid4()), "email": "teacher@lms.com", "name": "Sarah",
             "password": _hash_pw("teacher123"), "role": "teacher", "language": "en",
             "plan": "premium", "premium_since": now, "created": now},
            {"id": str(uuid.uuid4()), "email": "student@lms.com", "name": "Alex",
             "password": _hash_pw("student123"), "role": "student", "language": "en",
             "plan": "free", "premium_since": None, "created": now},
        ]
        await db.users.insert_many(seeds)
        logger.info("Seeded default users")

    if await db.curriculum.count_documents({}) == 0:
        now = datetime.now(timezone.utc).isoformat()
        teacher = await db.users.find_one({"role": "teacher"})
        tid = teacher["id"] if teacher else "system"
        items = [
            {"id": str(uuid.uuid4()), "title": "Fractions Basics", "subject": "Math", "level": "beginner",
             "description": "Introduction to fractions, numerator, denominator, equivalent fractions.",
             "objectives": ["Identify numerator and denominator", "Simplify fractions", "Compare fractions"],
             "created_by": tid, "created": now},
            {"id": str(uuid.uuid4()), "title": "Photosynthesis", "subject": "Science", "level": "intermediate",
             "description": "How plants convert light energy to chemical energy.",
             "objectives": ["Describe the chemical equation", "Explain chloroplast function", "List factors affecting rate"],
             "created_by": tid, "created": now},
            {"id": str(uuid.uuid4()), "title": "Simple Past Tense", "subject": "English", "level": "beginner",
             "description": "Forming and using the simple past tense in English.",
             "objectives": ["Regular past forms", "Irregular verbs", "Question forms"],
             "created_by": tid, "created": now},
        ]
        await db.curriculum.insert_many(items)
        logger.info("Seeded default curriculum")

    # Backfill plan field on pre-existing users (safe migration)
    await db.users.update_many({"plan": {"$exists": False}}, {"$set": {"plan": "free", "premium_since": None}})
    # Idempotently re-assert seeded premium accounts (admin + teacher)
    now_iso = datetime.now(timezone.utc).isoformat()
    await db.users.update_many(
        {"email": {"$in": ["admin@lms.com", "teacher@lms.com"]}, "plan": {"$ne": "premium"}},
        {"$set": {"plan": "premium", "premium_since": now_iso}},
    )

    yield
    client.close()


app = FastAPI(title="Adaptive AI LMS", lifespan=lifespan)
api = APIRouter(prefix="/api")
bearer = HTTPBearer(auto_error=False)

# ---------- Models ----------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: Literal["student", "teacher", "admin"] = "student"
    language: Literal["en", "ms", "zh"] = "en"

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class TokenOut(BaseModel):
    token: str
    user: dict

class CurriculumIn(BaseModel):
    title: str
    subject: str
    level: str = "beginner"
    description: str = ""
    objectives: List[str] = []

class LessonGenIn(BaseModel):
    curriculum_id: str
    language: Literal["en", "ms", "zh"] = "en"

class QuizGenIn(BaseModel):
    curriculum_id: str
    language: Literal["en", "ms", "zh"] = "en"
    num_questions: int = 5

class QuizSubmitIn(BaseModel):
    quiz_id: str
    answers: List[int]

class TutorChatIn(BaseModel):
    curriculum_id: Optional[str] = None
    personality: Literal["strict", "friendly", "socratic", "motivational"] = "friendly"
    language: Literal["en", "ms", "zh"] = "en"
    message: str
    history: List[dict] = []

class BridgeIn(BaseModel):
    curriculum_id: str
    primary: Literal["en", "ms", "zh"]
    secondary: Literal["en", "ms", "zh"]
    question: str

class TeachStepIn(BaseModel):
    curriculum_id: str
    personality: Literal["strict", "friendly", "socratic", "motivational"] = "friendly"
    language: Literal["en", "ms", "zh"] = "en"
    step: int = 0
    total_steps: int = 7
    history: List[dict] = []
    student_reply: Optional[str] = None

# ---------- Helpers ----------
def _hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def hash_pw(pw: str) -> str:
    return _hash_pw(pw)

def verify_pw(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False

def make_token(user_id: str, role: str, minutes: Optional[int] = None, extra: Optional[dict] = None) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=minutes if minutes is not None else JWT_EXPIRE_MINUTES),
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def current_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer)):
    if not creds:
        raise HTTPException(401, "Missing token")
    try:
        data = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid token")
    if data.get("kind") == "stream":
        raise HTTPException(401, "Stream token not valid for API calls")
    user = await db.users.find_one({"id": data["sub"]}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(401, "User not found")
    return user

def require_role(*roles):
    async def checker(user=Depends(current_user)):
        if user["role"] not in roles:
            raise HTTPException(403, "Forbidden")
        return user
    return checker

def require_premium(user=Depends(current_user)):
    if user.get("plan") != "premium":
        raise HTTPException(402, "Premium plan required")
    return user

LANG_NAMES = {"en": "English", "ms": "Bahasa Melayu", "zh": "Chinese (Mandarin)"}
PERSONALITIES = {
    "strict": "You are a strict, highly disciplined teacher. Keep replies concise and precise, correct mistakes directly, and expect students to work hard. Tone: formal, demanding but fair.",
    "friendly": "You are a warm, friendly mentor. Use encouraging language, emojis sparingly, relate concepts to daily life. Tone: kind, relatable.",
    "socratic": "You are a Socratic coach. Never give the answer directly; ask guiding questions that lead the student to discover it themselves. Tone: curious, patient.",
    "motivational": "You are a motivational coach. Celebrate small wins, push the student forward with energetic encouragement, reframe failure as learning. Tone: upbeat, inspiring.",
}

def detect_emotion(text: str) -> str:
    t = text.lower()
    neg = ["confused", "don't understand", "hard", "difficult", "hate", "boring", "give up", "stuck", "sucks", "bingung", "susah", "困惑", "不懂", "难"]
    pos = ["got it", "understand", "thanks", "love", "easy", "cool", "paham", "terima kasih", "懂了", "谢谢", "明白"]
    if any(k in t for k in neg):
        return "negative"
    if any(k in t for k in pos):
        return "positive"
    return "neutral"

def build_system_prompt(personality: str, language: str, curriculum: Optional[dict], emotion: str, difficulty: str) -> str:
    lang = LANG_NAMES.get(language, "English")
    base = PERSONALITIES[personality]
    cur_str = ""
    if curriculum:
        objs = "; ".join(curriculum.get("objectives") or [])
        cur_str = (
            f"\nCURRICULUM CONTEXT:\n"
            f"- Topic: {curriculum['title']}\n- Subject: {curriculum['subject']}\n"
            f"- Level: {curriculum['level']}\n- Description: {curriculum.get('description','')}\n"
            f"- Objectives: {objs}\n"
            f"STRICT RULE: Stay inside this curriculum. If the student asks something off-topic, "
            f"politely redirect them back to the curriculum in {lang}."
        )
    emo_rule = {
        "negative": "The student sounds frustrated. Simplify, reassure, and break the idea into smaller steps.",
        "positive": "The student sounds engaged. Challenge them slightly with a follow-up question or deeper idea.",
        "neutral": "Keep a balanced pace.",
    }[emotion]
    return (
        f"{base}\n"
        f"LANGUAGE: Respond ONLY in {lang}. Match cultural tone appropriate for {lang}.\n"
        f"DIFFICULTY: {difficulty}. Adjust vocabulary and depth accordingly.\n"
        f"EMOTION: {emo_rule}\n"
        f"FORMAT: Keep replies under 180 words. Use short paragraphs and one example when useful."
        f"{cur_str}"
    )

async def get_user_difficulty(user_id: str) -> str:
    prog = await db.progress.find_one({"user_id": user_id}, {"_id": 0})
    if not prog:
        return "beginner"
    avg = prog.get("avg_score", 0)
    if avg >= 80:
        return "advanced"
    if avg >= 60:
        return "intermediate"
    return "beginner"

async def update_difficulty(user_id: str, score: int):
    prog = await db.progress.find_one({"user_id": user_id})
    if not prog:
        doc = {"user_id": user_id, "scores": [score], "avg_score": score, "updated": datetime.now(timezone.utc).isoformat()}
        await db.progress.insert_one(doc)
        return
    scores = prog.get("scores", []) + [score]
    avg = sum(scores) / len(scores)
    await db.progress.update_one(
        {"user_id": user_id},
        {"$set": {"scores": scores, "avg_score": avg, "updated": datetime.now(timezone.utc).isoformat()}},
    )

async def count_lesson_regens_today(user_id: str) -> int:
    start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    return await db.ai_usage.count_documents({"user_id": user_id, "kind": "lesson", "ts": {"$gte": start}})

def _strip_user(u: dict) -> dict:
    return {k: v for k, v in u.items() if k not in ("password", "_id")}

async def groq_json(sys_prompt: str, user_msg: str, *, max_tokens: int = 1000, temperature: float = 0.6) -> dict:
    """Call Groq with JSON mode, retry once on parse failure with a stricter reminder."""
    messages = [
        {"role": "system", "content": sys_prompt},
        {"role": "user", "content": user_msg},
    ]
    for attempt in range(2):
        try:
            resp = await groq_client.chat.completions.create(
                model=GROQ_MODEL, messages=messages,
                temperature=temperature, max_tokens=max_tokens,
                response_format={"type": "json_object"},
            )
            raw = resp.choices[0].message.content
            return json.loads(raw)
        except json.JSONDecodeError:
            if attempt == 0:
                messages.append({"role": "assistant", "content": raw})
                messages.append({"role": "user", "content": "That was not valid JSON. Respond with ONLY valid JSON, no prose, no code fences."})
                continue
            logger.exception("Groq returned invalid JSON twice")
            raise HTTPException(502, "AI returned malformed JSON")
        except Exception as e:
            logger.exception("Groq call failed")
            raise HTTPException(502, f"AI error: {e}")

# ---------- Routes: auth ----------
@api.get("/")
async def root():
    return {"message": "Adaptive AI LMS online"}

@api.post("/auth/register", response_model=TokenOut)
async def register(body: RegisterIn):
    exists = await db.users.find_one({"email": body.email.lower()})
    if exists:
        raise HTTPException(400, "Email already registered")
    uid = str(uuid.uuid4())
    doc = {
        "id": uid, "email": body.email.lower(), "name": body.name,
        "password": hash_pw(body.password), "role": body.role, "language": body.language,
        "plan": "free", "premium_since": None,
        "created": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(doc)
    return {"token": make_token(uid, body.role), "user": _strip_user(doc)}

@api.post("/auth/login", response_model=TokenOut)
async def login(body: LoginIn):
    u = await db.users.find_one({"email": body.email.lower()})
    if not u or not verify_pw(body.password, u["password"]):
        raise HTTPException(401, "Invalid credentials")
    return {"token": make_token(u["id"], u["role"]), "user": _strip_user(u)}

@api.get("/auth/me")
async def me(user=Depends(current_user)):
    return user

@api.post("/auth/stream-token")
async def stream_token(user=Depends(current_user)):
    """Issue a short-lived (2 min) token scoped to SSE endpoints only."""
    token = make_token(user["id"], user["role"], minutes=2, extra={"kind": "stream"})
    return {"stream_token": token, "expires_in": 120}

# ---------- Routes: subscription ----------
@api.get("/subscription/me")
async def my_subscription(user=Depends(current_user)):
    regens = await count_lesson_regens_today(user["id"]) if user["role"] == "student" else 0
    return {
        "plan": user.get("plan", "free"),
        "premium_since": user.get("premium_since"),
        "daily_lesson_regens": {
            "used": regens,
            "limit": None if user.get("plan") == "premium" else FREE_LESSON_REGEN_PER_DAY,
        },
        "features": {
            "all_personalities": user.get("plan") == "premium",
            "unlimited_lessons": user.get("plan") == "premium",
            "ai_interventions": user.get("plan") == "premium",
            "bridge_mode": user.get("plan") == "premium",
            "interactive_teach": user.get("plan") == "premium",
            "premium_personalities": sorted(PREMIUM_PERSONALITIES),
        },
    }

@api.post("/subscription/upgrade")
async def upgrade(user=Depends(current_user)):
    # NOTE: MOCKED upgrade. In production replace with Stripe Checkout.
    now = datetime.now(timezone.utc).isoformat()
    await db.users.update_one({"id": user["id"]}, {"$set": {"plan": "premium", "premium_since": now}})
    u = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password": 0})
    return {"ok": True, "user": u}

@api.post("/subscription/downgrade")
async def downgrade(user=Depends(current_user)):
    await db.users.update_one({"id": user["id"]}, {"$set": {"plan": "free", "premium_since": None}})
    u = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password": 0})
    return {"ok": True, "user": u}

# ---------- Routes: curriculum ----------
@api.get("/curriculum")
async def list_curriculum(user=Depends(current_user)):
    return await db.curriculum.find({}, {"_id": 0}).sort("created", -1).to_list(500)

@api.post("/curriculum")
async def create_curriculum(body: CurriculumIn, user=Depends(require_role("teacher", "admin"))):
    doc = body.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_by"] = user["id"]
    doc["created"] = datetime.now(timezone.utc).isoformat()
    await db.curriculum.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.delete("/curriculum/{cid}")
async def delete_curriculum(cid: str, user=Depends(require_role("teacher", "admin"))):
    await db.curriculum.delete_one({"id": cid})
    return {"ok": True}

# ---------- Routes: lessons ----------
@api.post("/lessons/generate")
async def generate_lesson(body: LessonGenIn, user=Depends(current_user)):
    cur = await db.curriculum.find_one({"id": body.curriculum_id}, {"_id": 0})
    if not cur:
        raise HTTPException(404, "Curriculum not found")

    # Free tier: limit lesson regens per day
    if user.get("plan", "free") != "premium" and user["role"] == "student":
        used = await count_lesson_regens_today(user["id"])
        if used >= FREE_LESSON_REGEN_PER_DAY:
            raise HTTPException(402, f"Free tier limit of {FREE_LESSON_REGEN_PER_DAY} lessons per day reached. Upgrade to Premium for unlimited.")

    difficulty = await get_user_difficulty(user["id"])
    lang = LANG_NAMES[body.language]
    sys_prompt = (
        f"You are an expert LMS content writer. Generate a structured lesson in {lang}. "
        f"Keep it strictly within the curriculum topic. Difficulty: {difficulty}. "
        f"Return ONLY valid JSON with this exact schema:\n"
        f'{{"title": str, "summary": str, "sections": [{{"heading": str, "content": str}}], "key_points": [str], "example": str}}\n'
        f"All string values must be in {lang}. Do not add any text outside the JSON."
    )
    user_msg = (
        f"Topic: {cur['title']} | Subject: {cur['subject']} | Level: {cur['level']} | "
        f"Description: {cur.get('description','')} | Objectives: {', '.join(cur.get('objectives') or [])}"
    )
    try:
        data = await groq_json(sys_prompt, user_msg, max_tokens=1400, temperature=0.6)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("lesson gen failed")
        raise HTTPException(500, f"Lesson generation failed: {e}")
    lesson_id = str(uuid.uuid4())
    doc = {
        "id": lesson_id, "user_id": user["id"], "curriculum_id": cur["id"],
        "language": body.language, "difficulty": difficulty, "content": data,
        "created": datetime.now(timezone.utc).isoformat(),
    }
    await db.lessons.insert_one(doc)
    await db.ai_usage.insert_one({"user_id": user["id"], "kind": "lesson", "ts": datetime.now(timezone.utc).isoformat()})
    doc.pop("_id", None)
    return doc

# ---------- Routes: quiz ----------
@api.post("/quiz/generate")
async def generate_quiz(body: QuizGenIn, user=Depends(current_user)):
    cur = await db.curriculum.find_one({"id": body.curriculum_id}, {"_id": 0})
    if not cur:
        raise HTTPException(404, "Curriculum not found")
    difficulty = await get_user_difficulty(user["id"])
    lang = LANG_NAMES[body.language]

    # Map difficulty level to pedagogical instructions
    diff_instructions = {
        "beginner": "Simple vocabulary. Test basic recall and understanding of core concepts only.",
        "intermediate": "Moderate complexity. Test application and analysis, not just recall.",
        "advanced": "Advanced vocabulary. Challenge deep understanding with synthesis questions and tricky distractors.",
    }.get(difficulty, "Moderate complexity appropriate for the topic.")

    sys_prompt = (
        f"You are an expert teacher creating a multiple-choice quiz for an LMS.\n"
        f"Language: {lang}. Student difficulty level: {difficulty.upper()}.\n"
        f"Difficulty guidance: {diff_instructions}\n"
        f"Produce EXACTLY {body.num_questions} questions. Each must have exactly 4 answer options.\n"
        f'Return ONLY valid JSON with this EXACT structure:\n'
        f'{{"questions": [{{"q": "question text", "options": ["option A", "option B", "option C", "option D"], "answer": 0, "explanation": "why answer is correct"}}]}}\n'
        f"Rules: 'answer' is the 0-based index of the correct option (0=A, 1=B, 2=C, 3=D). "
        f"All text must be in {lang}. Questions must relate directly to the topic. "
        f"Do NOT include any text outside the JSON."
    )
    user_msg = (
        f"Topic: {cur['title']} | Subject: {cur['subject']} | Curriculum Level: {cur['level']} | "
        f"Description: {cur.get('description', '')} | Student Difficulty: {difficulty}"
    )
    try:
        data = await groq_json(sys_prompt, user_msg, max_tokens=2000, temperature=0.5)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("quiz gen failed")
        raise HTTPException(500, f"Quiz generation failed: {e}")

    questions = data.get("questions", [])
    if not questions:
        logger.error("Quiz AI returned empty questions. Raw data: %s", data)
        raise HTTPException(502, "AI returned no quiz questions. Please try again.")

    qid = str(uuid.uuid4())
    doc = {
        "id": qid, "user_id": user["id"], "curriculum_id": cur["id"],
        "language": body.language, "difficulty": difficulty,
        "questions": questions[:body.num_questions],
        "created": datetime.now(timezone.utc).isoformat(),
    }
    await db.quizzes.insert_one(doc)
    await db.ai_usage.insert_one({"user_id": user["id"], "kind": "quiz", "ts": datetime.now(timezone.utc).isoformat()})
    doc.pop("_id", None)
    return doc

@api.post("/quiz/submit")
async def submit_quiz(body: QuizSubmitIn, user=Depends(current_user)):
    quiz = await db.quizzes.find_one({"id": body.quiz_id}, {"_id": 0})
    if not quiz or quiz["user_id"] != user["id"]:
        raise HTTPException(404, "Quiz not found")
    qs = quiz["questions"]
    if len(body.answers) != len(qs):
        raise HTTPException(400, "Answer count mismatch")
    correct = 0
    breakdown = []
    for i, q in enumerate(qs):
        ok = int(body.answers[i]) == int(q["answer"])
        if ok:
            correct += 1
        breakdown.append({"q": q["q"], "correct": ok, "your_answer": body.answers[i], "answer": q["answer"], "explanation": q.get("explanation", "")})
    score = int((correct / len(qs)) * 100)
    await db.quizzes.update_one({"id": body.quiz_id}, {"$set": {"submitted": True, "score": score, "submitted_at": datetime.now(timezone.utc).isoformat()}})
    await update_difficulty(user["id"], score)
    new_diff = await get_user_difficulty(user["id"])
    return {"score": score, "correct": correct, "total": len(qs), "breakdown": breakdown, "new_difficulty": new_diff}

# ---------- Routes: tutor chat ----------
def _check_personality_allowed(personality: str, user: dict):
    if personality in PREMIUM_PERSONALITIES and user.get("plan") != "premium":
        raise HTTPException(402, f"'{personality}' tutor is a Premium feature. Upgrade to unlock.")

@api.post("/tutor/chat")
async def tutor_chat(body: TutorChatIn, user=Depends(current_user)):
    _check_personality_allowed(body.personality, user)
    cur = None
    if body.curriculum_id:
        cur = await db.curriculum.find_one({"id": body.curriculum_id}, {"_id": 0})
    difficulty = await get_user_difficulty(user["id"])
    emotion = detect_emotion(body.message)
    sys_prompt = build_system_prompt(body.personality, body.language, cur, emotion, difficulty)
    msgs = [{"role": "system", "content": sys_prompt}]
    for m in body.history[-8:]:
        if m.get("role") in ("user", "assistant") and m.get("content"):
            msgs.append({"role": m["role"], "content": m["content"]})
    msgs.append({"role": "user", "content": body.message})
    try:
        resp = await groq_client.chat.completions.create(
            model=GROQ_MODEL, messages=msgs, temperature=0.7, max_tokens=500
        )
        reply = resp.choices[0].message.content.strip()
    except Exception as e:
        logger.exception("tutor chat failed")
        raise HTTPException(500, f"Tutor error: {e}")
    await db.ai_usage.insert_one({"user_id": user["id"], "kind": "chat", "ts": datetime.now(timezone.utc).isoformat()})
    return {"reply": reply, "emotion": emotion, "difficulty": difficulty, "personality": body.personality}


@api.get("/tutor/chat/stream")
async def tutor_chat_stream(
    token: str = Query(...),
    curriculum_id: Optional[str] = Query(None),
    personality: str = Query("friendly"),
    language: str = Query("en"),
    message: str = Query(...),
):
    try:
        data = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid token")
    if data.get("kind") != "stream":
        raise HTTPException(401, "A stream token is required")
    user = await db.users.find_one({"id": data["sub"]}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(401, "User not found")
    _check_personality_allowed(personality, user)

    cur = None
    if curriculum_id:
        cur = await db.curriculum.find_one({"id": curriculum_id}, {"_id": 0})
    difficulty = await get_user_difficulty(user["id"])
    emotion = detect_emotion(message)
    sys_prompt = build_system_prompt(personality, language, cur, emotion, difficulty)

    async def gen():
        yield f"event: meta\ndata: {json.dumps({'emotion': emotion, 'difficulty': difficulty})}\n\n"
        try:
            stream = await groq_client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[{"role": "system", "content": sys_prompt}, {"role": "user", "content": message}],
                temperature=0.7, max_tokens=500, stream=True,
            )
            async for chunk in stream:
                delta = chunk.choices[0].delta.content if chunk.choices else None
                if delta:
                    yield f"event: token\ndata: {json.dumps({'t': delta})}\n\n"
            yield "event: done\ndata: {}\n\n"
            await db.ai_usage.insert_one({"user_id": user["id"], "kind": "chat", "ts": datetime.now(timezone.utc).isoformat()})
        except Exception as e:
            logger.exception("stream failed")
            yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream")


@api.post("/tutor/bridge")
async def tutor_bridge(body: BridgeIn, user=Depends(require_premium)):
    """Bridge mode: explain in primary language, then summarise key concepts in secondary.
    Premium-only feature."""
    if body.primary == body.secondary:
        raise HTTPException(400, "primary and secondary languages must differ")
    cur = await db.curriculum.find_one({"id": body.curriculum_id}, {"_id": 0})
    if not cur:
        raise HTTPException(404, "Curriculum not found")
    difficulty = await get_user_difficulty(user["id"])
    primary = LANG_NAMES[body.primary]
    secondary = LANG_NAMES[body.secondary]
    sys_prompt = (
        f"You are a bilingual LMS tutor. The student is studying '{cur['title']}' ({cur['subject']}, {cur['level']}, difficulty {difficulty}). "
        f"FIRST, answer the question in {primary} (3-5 short sentences). "
        f"THEN, under a clearly labelled section, repeat ONLY the key concepts as a bullet list in {secondary}. "
        f"Return ONLY valid JSON: {{\"primary_explanation\": str in {primary}, \"secondary_summary\": [str in {secondary}]}}. "
        f"Stay inside the curriculum."
    )
    try:
        data = await groq_json(sys_prompt, body.question, max_tokens=700, temperature=0.6)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("bridge failed")
        raise HTTPException(500, f"Bridge error: {e}")
    await db.ai_usage.insert_one({"user_id": user["id"], "kind": "bridge", "ts": datetime.now(timezone.utc).isoformat()})
    return {"primary": body.primary, "secondary": body.secondary, **data}


@api.post("/tutor/teach")
async def tutor_teach(body: TeachStepIn, user=Depends(current_user)):
    """Interactive live-teaching loop. AI drives the lesson one concept per turn,
    addresses the student by name, asks checking questions, and reacts to the student's reply.
    Premium for Socratic / Motivational personalities."""
    _check_personality_allowed(body.personality, user)
    cur = await db.curriculum.find_one({"id": body.curriculum_id}, {"_id": 0})
    if not cur:
        raise HTTPException(404, "Curriculum not found")
    difficulty = await get_user_difficulty(user["id"])
    emotion = detect_emotion(body.student_reply or "")
    lang = LANG_NAMES[body.language]
    persona = PERSONALITIES[body.personality]
    total = max(5, min(body.total_steps, 10))
    step = max(1, body.step + 1)  # we always advance to the next teaching step
    is_first = step == 1
    is_last = step >= total

    if is_first:
        stage = (
            "OPENING: Greet the student warmly BY NAME with real energy. Use 1 quick warm-up line "
            "(a rhetorical micro-question, a playful analogy, or a bold promise of what they're about to learn). "
            "End with a fast check — 'Ready?' / 'Shall we?' — in the student's language."
        )
    elif is_last:
        stage = (
            "CLOSING: Celebrate the student BY NAME. Give a punchy 3-line recap of the most important concepts. "
            "Drop one motivating line ('You showed up — that's half the battle'). Ask ONE open reflection question. "
            "Set done=true."
        )
    else:
        stage = (
            f"MIDDLE (step {step} of {total}): React to the student's reply in 1 quick sentence "
            f"('Yes! Exactly.', 'Almost — watch this…', 'Good — stay with me, {user['name']}'). "
            f"Then teach ONE new concrete concept using a short analogy or real-world example. "
            f"End with ONE specific checking question the student must answer before we continue."
        )

    emo_rule = {
        "negative": "Student sounds lost — slow down, reassure warmly, shrink the example, but stay upbeat.",
        "positive": "Student is engaged — match their energy, gently push the depth.",
        "neutral": "Keep a natural, upbeat teaching pace.",
    }[emotion]

    sys_prompt = (
        f"{persona}\n\n"
        f"YOU ARE LIVE-TEACHING {user['name']} — like a real classroom teacher at the front of the room.\n"
        f"Topic: '{cur['title']}' (subject: {cur['subject']}, level: {cur['level']}, difficulty: {difficulty}).\n"
        f"Objectives: {', '.join(cur.get('objectives') or [])}.\n"
        f"LANGUAGE: Respond ONLY in {lang}.\n"
        f"{emo_rule}\n"
        f"STAGE: {stage}\n\n"
        f"DELIVERY RULES (CRITICAL — this is voice output, it WILL be spoken aloud):\n"
        f"• Be ACTIVE and ENERGETIC. Talk like you are standing in front of the class, not reading an essay.\n"
        f"• Use SHORT punchy sentences. Max ~14 words each. Break long ideas with em-dashes (—) and ellipses (…).\n"
        f"• Address {user['name']} by name AT LEAST ONCE per turn. Vary where you place it.\n"
        f"• Use natural teacher verbal moves: 'Alright', 'OK so', 'Now — watch this', 'Here's the trick', 'Bam.', 'Quick question'.\n"
        f"• Use at least ONE exclamation mark OR rhetorical question. NOT MORE THAN THREE.\n"
        f"• Use one concrete example or everyday analogy. Never lecture.\n"
        f"• Sprinkle ONE stage-direction cue in square brackets to hint at gesture/tone — e.g. [leans in], [taps board], [smiles]. ONLY ONE.\n"
        f"• Total 'reply' length: 55-110 words. If you go over, cut.\n"
        f"• STRICT: stay inside the curriculum. If the student drifts, pull them back in {lang} with warmth.\n\n"
        f"Return ONLY valid JSON: "
        f'{{"reply": str (warm, active, energetic teacher speech in {lang}, 55-110 words), '
        f'"question": str or null (one checking question in {lang}; null on the closing step), '
        f'"done": bool (true only on the closing step)}}'
    )
    history_str = json.dumps(body.history[-6:], ensure_ascii=False) if body.history else "[]"
    user_msg = (
        f"Step: {step}/{total}\n"
        f"Student name: {user['name']}\n"
        f"Student's previous reply: {body.student_reply or '(none — this is the opening turn)'}\n"
        f"Conversation so far: {history_str}"
    )
    data = await groq_json(sys_prompt, user_msg, max_tokens=600, temperature=0.75)
    await db.ai_usage.insert_one({"user_id": user["id"], "kind": "teach", "ts": datetime.now(timezone.utc).isoformat()})
    return {
        "reply": data.get("reply", ""),
        "question": data.get("question"),
        "step": step,
        "total_steps": total,
        "done": bool(data.get("done")) or is_last,
        "emotion": emotion,
        "personality": body.personality,
    }

# ---------- Routes: progress ----------
@api.get("/progress/me")
async def my_progress(user=Depends(current_user)):
    prog = await db.progress.find_one({"user_id": user["id"]}, {"_id": 0}) or {"scores": [], "avg_score": 0}
    lessons = await db.lessons.count_documents({"user_id": user["id"]})
    quizzes = await db.quizzes.count_documents({"user_id": user["id"], "submitted": True})
    diff = await get_user_difficulty(user["id"])
    return {"progress": prog, "lessons_completed": lessons, "quizzes_completed": quizzes, "current_difficulty": diff}

# ---------- Routes: teacher ----------
@api.get("/teacher/students")
async def list_students(user=Depends(require_role("teacher", "admin"))):
    students = await db.users.find({"role": "student"}, {"_id": 0, "password": 0}).to_list(500)
    out = []
    for s in students:
        prog = await db.progress.find_one({"user_id": s["id"]}, {"_id": 0}) or {}
        lessons = await db.lessons.count_documents({"user_id": s["id"]})
        quizzes = await db.quizzes.count_documents({"user_id": s["id"], "submitted": True})
        out.append({
            **s,
            "avg_score": round(prog.get("avg_score", 0), 1),
            "lessons": lessons, "quizzes": quizzes,
            "difficulty": await get_user_difficulty(s["id"]),
        })
    return out

@api.get("/teacher/interventions/{student_id}")
async def interventions(student_id: str, user=Depends(require_role("teacher", "admin"))):
    if user.get("plan") != "premium" and user["role"] != "admin":
        raise HTTPException(402, "AI Interventions require Premium")

    # TTL cache (cachetools handles expiry + LRU eviction automatically)
    cached = _intervention_cache.get(student_id)
    if cached:
        return cached

    student = await db.users.find_one({"id": student_id, "role": "student"}, {"_id": 0, "password": 0})
    if not student:
        raise HTTPException(404, "Student not found")
    prog = await db.progress.find_one({"user_id": student_id}, {"_id": 0}) or {"scores": [], "avg_score": 0}
    lessons = await db.lessons.count_documents({"user_id": student_id})
    quizzes = await db.quizzes.count_documents({"user_id": student_id, "submitted": True})
    diff = await get_user_difficulty(student_id)
    lang = LANG_NAMES.get(student.get("language", "en"), "English")

    sys_prompt = (
        f"You are a senior education coach. Based on the student data, produce specific, "
        f"actionable interventions for the teacher. Return ONLY JSON: "
        f'{{"risk_level":"low|medium|high","summary":str,"recommendations":[str,str,str],"next_topics":[str,str]}}. '
        f"Write all strings in {lang}. Be concise and practical."
    )
    user_msg = (
        f"Student: {student['name']} | Avg score: {round(prog.get('avg_score',0),1)}% | "
        f"Recent scores: {prog.get('scores', [])[-5:]} | Lessons: {lessons} | Quizzes: {quizzes} | Level: {diff}"
    )
    try:
        resp = await groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "system", "content": sys_prompt}, {"role": "user", "content": user_msg}],
            temperature=0.4, max_tokens=500, response_format={"type": "json_object"},
        )
        advice = json.loads(resp.choices[0].message.content)
    except Exception as e:
        logger.exception("intervention failed")
        raise HTTPException(500, f"AI error: {e}")
    await db.ai_usage.insert_one({"user_id": user["id"], "kind": "intervention", "ts": datetime.now(timezone.utc).isoformat()})
    out = {
        "student": {"id": student_id, "name": student["name"], "language": student.get("language", "en")},
        "stats": {"avg_score": round(prog.get("avg_score", 0), 1), "lessons": lessons, "quizzes": quizzes, "difficulty": diff},
        "advice": advice,
        "cached": False,
    }
    _intervention_cache[student_id] = {**out, "cached": True}
    return out

# ---------- Routes: admin ----------
@api.get("/admin/analytics")
async def analytics(user=Depends(require_role("admin"))):
    users = await db.users.count_documents({})
    students = await db.users.count_documents({"role": "student"})
    teachers = await db.users.count_documents({"role": "teacher"})
    curr = await db.curriculum.count_documents({})
    ai_total = await db.ai_usage.count_documents({})
    ai_by_kind = {}
    for k in ("chat", "lesson", "quiz", "intervention", "bridge", "teach"):
        ai_by_kind[k] = await db.ai_usage.count_documents({"kind": k})
    lang_dist = {}
    for code in ("en", "ms", "zh"):
        lang_dist[code] = await db.users.count_documents({"language": code})
    plan_dist = {
        "free": await db.users.count_documents({"plan": "free"}),
        "premium": await db.users.count_documents({"plan": "premium"}),
    }
    return {
        "users": users, "students": students, "teachers": teachers,
        "curriculum": curr, "ai_usage_total": ai_total, "ai_by_kind": ai_by_kind,
        "language_distribution": lang_dist, "plan_distribution": plan_dist,
    }

@api.get("/admin/users")
async def all_users(user=Depends(require_role("admin"))):
    return await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)

class AdminUpdateUserIn(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[Literal["student", "teacher", "admin"]] = None
    language: Optional[Literal["en", "ms", "zh"]] = None
    plan: Optional[Literal["free", "premium"]] = None
    password: Optional[str] = None  # only set if non-empty

@api.put("/admin/users/{uid}")
async def admin_update_user(uid: str, body: AdminUpdateUserIn, admin=Depends(require_role("admin"))):
    target = await db.users.find_one({"id": uid})
    if not target:
        raise HTTPException(404, "User not found")

    patch: dict = {}
    if body.name is not None:
        patch["name"] = body.name.strip()
    if body.email is not None:
        existing = await db.users.find_one({"email": body.email.lower(), "id": {"$ne": uid}})
        if existing:
            raise HTTPException(400, "Email already in use")
        patch["email"] = body.email.lower()
    if body.role is not None:
        patch["role"] = body.role
    if body.language is not None:
        patch["language"] = body.language
    if body.plan is not None:
        patch["plan"] = body.plan
        if body.plan == "premium" and not target.get("premium_since"):
            patch["premium_since"] = datetime.now(timezone.utc).isoformat()
        elif body.plan == "free":
            patch["premium_since"] = None
    if body.password:
        patch["password"] = hash_pw(body.password)

    if not patch:
        raise HTTPException(400, "No fields to update")

    await db.users.update_one({"id": uid}, {"$set": patch})
    updated = await db.users.find_one({"id": uid}, {"_id": 0, "password": 0})
    return updated

@api.delete("/admin/users/{uid}")
async def admin_delete_user(uid: str, admin=Depends(require_role("admin"))):
    if uid == admin["id"]:
        raise HTTPException(400, "Cannot delete your own account")
    target = await db.users.find_one({"id": uid})
    if not target:
        raise HTTPException(404, "User not found")
    await db.users.delete_one({"id": uid})
    # Clean up related data
    await db.progress.delete_many({"user_id": uid})
    await db.lessons.delete_many({"user_id": uid})
    await db.quizzes.delete_many({"user_id": uid})
    await db.ai_usage.delete_many({"user_id": uid})
    return {"ok": True, "deleted_id": uid}

app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
