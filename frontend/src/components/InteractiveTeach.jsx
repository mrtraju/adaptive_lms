import React, { useEffect, useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import { api } from "../lib/api";
import { toast } from "sonner";
import { Mic, MicOff, Send, Play, X, Sparkles, CheckCircle2 } from "lucide-react";

const LANG_TAG = { en: "en-US", ms: "ms-MY", zh: "zh-CN" };

// Preferred (usually more expressive) voice name hints per language — we fall back to any
// matching-locale voice if none of these are installed.
const PREFERRED_VOICES = {
  en: [
    /Google US English/i, /Microsoft (Aria|Jenny|Guy|Ryan).*Online/i,
    /Samantha/i, /Karen/i, /Moira/i, /Daniel/i, /Alex/i,
  ],
  ms: [/Microsoft Osman/i, /Microsoft Yasmin/i, /Malay/i],
  zh: [
    /Microsoft (Xiaoxiao|Yunxi|Yaoyao).*Online/i, /Google 普通话/i,
    /Tingting/i, /Sinji/i, /Zh-CN/i,
  ],
};

const pickBestVoice = (lang) => {
  const all = window.speechSynthesis?.getVoices?.() || [];
  if (!all.length) return null;
  const tag = LANG_TAG[lang];
  const localeMatch = all.filter(v => v.lang?.toLowerCase().startsWith(tag.toLowerCase().slice(0, 2)));
  const pool = localeMatch.length ? localeMatch : all;
  for (const re of PREFERRED_VOICES[lang] || []) {
    const hit = pool.find(v => re.test(v.name));
    if (hit) return hit;
  }
  // Prefer voices flagged as "online"/"neural"/"enhanced" if the browser exposes them
  return pool.find(v => /neural|online|enhanced|premium/i.test(v.name)) || pool[0];
};

// Split reply into speakable chunks on sentence boundaries (keeps natural prosody pauses)
const splitForSpeech = (text) =>
  (text || "")
    .replace(/\[[^\]]+\]/g, " ") // strip gesture cues like [leans in] before speaking
    .split(/(?<=[.!?…。！？])\s+|(?<=—)\s+/)
    .map(s => s.trim())
    .filter(Boolean);

const AVATAR_IMG = {
  strict: "https://images.unsplash.com/photo-1669042490014-6a1b76025e0c?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NTN8MHwxfHNlYXJjaHwzfHxjb2xvcmZ1bCUyMGFic3RyYWN0JTIwc2hhcGUlMjAzZHxlbnwwfHx8fDE3NzY4NDQ3Njh8MA&ixlib=rb-4.1.0&q=85",
  friendly: "https://images.unsplash.com/photo-1680355466499-39701c0be79f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1MDV8MHwxfHNlYXJjaHwyfHxyb2JvdCUyMGZhY2UlMjBwb3J0cmFpdCUyMDNkJTIwaWxsdXN0cmF0aW9ufGVufDB8fHx8MTc3Njg0NDc2M3ww&ixlib=rb-4.1.0&q=85",
  socratic: "https://images.unsplash.com/photo-1692250775015-75ec99f14486?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1MDV8MHwxfHNlYXJjaHw0fHxyb2JvdCUyMGZhY2UlMjBwb3J0cmFpdCUyMDNkJTIwaWxsdXN0cmF0aW9ufGVufDB8fHx8MTc3Njg0NDc2M3ww&ixlib=rb-4.1.0&q=85",
  motivational: "https://images.unsplash.com/photo-1682071531961-3c50cff9feaa?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NTN8MHwxfHNlYXJjaHwxfHxjb2xvcmZ1bCUyMGFic3RyYWN0JTIwc2hhcGUlMjAzZHxlbnwwfHx8fDE3NzY4NDQ3Njh8MA&ixlib=rb-4.1.0&q=85",
};

export default function InteractiveTeach({ open, onClose, curriculumId, personality, avatarLabel }) {
  const { user, lang } = useApp();
  const [state, setState] = useState("idle"); // idle | teaching | waiting | done
  const [step, setStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(7);
  const [turns, setTurns] = useState([]); // {role, content, question?}
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [speakOn, setSpeakOn] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recogRef = useRef(null);
  const endRef = useRef(null);
  const speakingQueueRef = useRef([]);

  useEffect(() => () => { window.speechSynthesis?.cancel(); recogRef.current?.stop?.(); setIsSpeaking(false); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [turns]);

  // Warm up voices so pickBestVoice() has data on first call in some browsers
  useEffect(() => {
    if (!window.speechSynthesis) return;
    const kick = () => window.speechSynthesis.getVoices();
    kick();
    window.speechSynthesis.onvoiceschanged = kick;
  }, []);

  const speak = (fullText) => {
    if (!speakOn || !window.speechSynthesis || !fullText) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(true);
    const chunks = splitForSpeech(fullText);
    speakingQueueRef.current = chunks;
    const voice = pickBestVoice(lang);
    const playNext = () => {
      const next = speakingQueueRef.current.shift();
      if (!next) { setIsSpeaking(false); return; }
      const u = new SpeechSynthesisUtterance(next);
      u.lang = LANG_TAG[lang] || "en-US";
      if (voice) u.voice = voice;
      // Active & energetic: slightly faster, slightly higher pitch, questions a touch higher still
      const isQuestion = /[?？]$/.test(next);
      const isBang = /[!！]$/.test(next);
      u.rate = 1.1;
      u.pitch = isQuestion ? 1.25 : isBang ? 1.2 : 1.1;
      u.volume = 1.0;
      u.onend = playNext;
      u.onerror = playNext;
      window.speechSynthesis.speak(u);
    };
    playNext();
  };

  const stopSpeaking = () => {
    speakingQueueRef.current = [];
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  };

  const step_ = async (studentReply) => {
    setBusy(true); setState("teaching");
    try {
      const r = await api.post("/tutor/teach", {
        curriculum_id: curriculumId, personality, language: lang,
        step, total_steps: totalSteps,
        history: turns.slice(-6).map(({ role, content }) => ({ role, content })),
        student_reply: studentReply || null,
      });
      setStep(r.data.step);
      setTotalSteps(r.data.total_steps);
      setTurns(t => [
        ...t,
        ...(studentReply ? [{ role: "user", content: studentReply }] : []),
        { role: "assistant", content: r.data.reply, question: r.data.question },
      ]);
      speak([r.data.reply, r.data.question].filter(Boolean).join(" "));
      setState(r.data.done ? "done" : (r.data.question ? "waiting" : "teaching"));
    } catch (e) {
      const d = e?.response?.data?.detail || "Teach error";
      toast.error(d);
      setState("idle");
    } finally { setBusy(false); }
  };

  const start = async () => {
    setTurns([]); setStep(0);
    await step_(null);
  };

  const submitReply = async () => {
    const r = reply.trim();
    if (!r) return;
    setReply("");
    stopSpeaking();
    await step_(r);
  };

  const toggleMic = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast.error("Voice input not supported"); return; }
    if (listening) { recogRef.current?.stop(); return; }
    const rg = new SR();
    rg.lang = LANG_TAG[lang] || "en-US";
    rg.interimResults = false;
    rg.onresult = (e) => setReply(prev => (prev ? prev + " " : "") + e.results[0][0].transcript);
    rg.onend = () => setListening(false);
    rg.onerror = () => setListening(false);
    recogRef.current = rg;
    rg.start();
    setListening(true);
  };

  // Render the reply with gesture cues pulled out as a separate pill
  const renderReply = (content) => {
    const gestures = [];
    const clean = (content || "").replace(/\[([^\]]+)\]/g, (_, g) => {
      gestures.push(g.trim());
      return "";
    }).replace(/\s{2,}/g, " ").trim();
    return { clean, gestures };
  };

  if (!open) return null;
  const progress = step && totalSteps ? Math.round((step / totalSteps) * 100) : 0;
  const avatarSrc = AVATAR_IMG[personality] || AVATAR_IMG.friendly;
  const avatarAnim = isSpeaking ? "teach-avatar-speaking" : "";

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="bg-white brutal-lg rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        data-testid="teach-modal">
        {/* Header with avatar */}
        <div className="border-b-2 border-[#121212] px-6 py-5 bg-[#FFF9C4] flex items-center gap-4">
          <div className="relative">
            <div className={`w-16 h-16 rounded-full overflow-hidden brutal-sm ${avatarAnim}`}>
              <img src={avatarSrc} alt={personality} className="w-full h-full object-cover" />
            </div>
            {isSpeaking && (
              <>
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#FF6B6B] border-2 border-[#121212] animate-ping" />
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#FF6B6B] border-2 border-[#121212]" />
              </>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-[0.3em] font-black text-[#9D4EDD] flex items-center gap-2">
              Live Teaching {isSpeaking && <span className="inline-flex gap-0.5" aria-label="speaking"><i className="teach-bar" /><i className="teach-bar" style={{ animationDelay: "0.15s" }} /><i className="teach-bar" style={{ animationDelay: "0.3s" }} /></span>}
            </div>
            <h3 className="text-xl md:text-2xl font-black truncate" style={{ fontFamily: "Outfit" }}>{avatarLabel}</h3>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full bg-white brutal-sm overflow-hidden">
                <div className="h-full bg-[#FF6B6B] transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-xs font-black tracking-widest" data-testid="teach-progress">{step}/{totalSteps}</span>
            </div>
          </div>
          <button onClick={() => { setSpeakOn(s => { if (s) stopSpeaking(); return !s; }); }} data-testid="teach-speak"
            className={`p-2 rounded-full brutal-sm ${speakOn ? "bg-[#4ECDC4]" : "bg-white"}`}
            title="Voice output">
            <span className="text-xs font-black">{speakOn ? "🔊" : "🔇"}</span>
          </button>
          <button onClick={() => { stopSpeaking(); onClose(); }} data-testid="teach-close" className="p-2 rounded-full bg-white brutal-btn">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Conversation */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 bg-[#FAFAFA]">
          {turns.length === 0 && state === "idle" && (
            <div className="m-auto text-center max-w-md">
              <div className="text-5xl mb-3">🎓</div>
              <h4 className="text-xl font-black mb-2" style={{ fontFamily: "Outfit" }}>Ready for a live lesson?</h4>
              <p className="text-sm text-[#4A4A4A] mb-5">Your tutor will teach you this topic like a real classroom — one concept at a time, asking questions as you go.</p>
              <button onClick={start} data-testid="teach-start"
                className="px-6 py-3 rounded-full bg-[#FF6B6B] text-white brutal-btn font-black uppercase text-sm tracking-widest flex items-center gap-2 mx-auto">
                <Play className="w-4 h-4" /> Start lesson
              </button>
            </div>
          )}

          {turns.map((m, i) => {
            if (m.role === "user") {
              return (
                <div key={i} className="max-w-[85%] p-4 rounded-2xl brutal-sm self-end bg-[#E8F5E9] rounded-tr-none">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</p>
                </div>
              );
            }
            const { clean, gestures } = renderReply(m.content);
            return (
              <div key={i} className="max-w-[85%] p-4 rounded-2xl brutal-sm self-start bg-white rounded-tl-none">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full overflow-hidden brutal-sm"><img src={avatarSrc} alt="" className="w-full h-full object-cover" /></div>
                  <span className="text-[10px] uppercase tracking-widest font-black text-[#4A4A4A]">{avatarLabel}</span>
                </div>
                {gestures.map((g, gi) => (
                  <div key={gi} className="mb-2 inline-flex items-center px-2 py-0.5 rounded-full bg-[#F4F0FF] brutal-sm text-[10px] font-bold italic text-[#4A4A4A]">✦ {g}</div>
                ))}
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{clean}</p>
                {m.question && (
                  <div className="mt-3 pt-3 border-t-2 border-dashed border-[#12121233]">
                    <div className="text-[10px] uppercase tracking-widest font-black text-[#FF6B6B] mb-1">Your turn</div>
                    <p className="text-sm font-bold">{m.question}</p>
                  </div>
                )}
              </div>
            );
          })}
          {busy && state !== "idle" && <div className="self-start text-xs text-[#4A4A4A] italic animate-pulse">✎ typing…</div>}
          {state === "done" && (
            <div className="self-center mt-3 px-5 py-3 rounded-2xl bg-[#E8F5E9] brutal-sm flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" strokeWidth={2.5} />
              <span className="font-black uppercase tracking-widest text-sm">Lesson complete</span>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input area */}
        {state !== "done" && turns.length > 0 && (
          <div className="border-t-2 border-[#121212] p-4 flex gap-2 bg-white">
            <button onClick={toggleMic} data-testid="teach-mic"
              className={`p-2.5 rounded-full brutal-sm ${listening ? "bg-[#FF6B6B] text-white animate-pulse" : "bg-white"}`}>
              {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <input value={reply} onChange={e => setReply(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submitReply()}
              placeholder={state === "waiting" ? "Answer your tutor…" : "Reply to continue…"}
              disabled={busy}
              data-testid="teach-input"
              className="flex-1 px-4 py-3 rounded-full brutal-sm bg-white font-medium focus:outline-none focus:border-[#FF6B6B] disabled:opacity-60" />
            <button onClick={submitReply} disabled={busy || !reply.trim()} data-testid="teach-send"
              className="px-5 rounded-full bg-[#FF6B6B] text-white brutal-btn disabled:opacity-50 flex items-center gap-2">
              <Send className="w-4 h-4" /> <span className="hidden sm:inline font-black uppercase text-xs tracking-widest">Send</span>
            </button>
          </div>
        )}
        {state === "done" && (
          <div className="border-t-2 border-[#121212] p-4 flex justify-center gap-3 bg-white">
            <button onClick={start} data-testid="teach-restart"
              className="px-5 py-2.5 rounded-full bg-white brutal-btn font-black uppercase text-xs tracking-widest flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Teach again
            </button>
            <button onClick={() => { stopSpeaking(); onClose(); }} data-testid="teach-finish"
              className="px-5 py-2.5 rounded-full bg-[#FF6B6B] text-white brutal-btn font-black uppercase text-xs tracking-widest">
              Finish
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
