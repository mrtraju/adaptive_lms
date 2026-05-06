import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { api, API } from "../lib/api";
import { T } from "../lib/i18n";
import { toast } from "sonner";
import { ArrowLeft, Send, Sparkles, ClipboardCheck, Smile, Meh, Frown, Mic, MicOff, Volume2, VolumeX, Printer, Languages, GraduationCap } from "lucide-react";
import InteractiveTeach from "../components/InteractiveTeach";

const EMO_ICON = { positive: Smile, neutral: Meh, negative: Frown };
const LANG_TAG = { en: "en-US", ms: "ms-MY", zh: "zh-CN" };
const LANG_LABELS = { en: "English", ms: "Bahasa", zh: "中文" };

export default function Lesson() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const avatar = sp.get("avatar") || "friendly";
  const { lang, isPremium } = useApp();
  const tr = T[lang] || T.en;
  const nav = useNavigate();

  const [lesson, setLesson] = useState(null);
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [result, setResult] = useState(null);
  const [emotion, setEmotion] = useState("neutral");
  const [listening, setListening] = useState(false);
  const [speakOn, setSpeakOn] = useState(false);
  const [bridgeOpen, setBridgeOpen] = useState(false);
  const [bridgeSecondary, setBridgeSecondary] = useState(lang === "en" ? "zh" : "en");
  const [bridgeResult, setBridgeResult] = useState(null);
  const [bridgeBusy, setBridgeBusy] = useState(false);
  const [teachOpen, setTeachOpen] = useState(false);
  const endRef = useRef(null);
  const recogRef = useRef(null);
  const esRef = useRef(null);
  const quizRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => () => { esRef.current?.close(); window.speechSynthesis?.cancel(); recogRef.current?.stop?.(); }, []);

  const genLesson = async () => {
    setBusy(true);
    try {
      const r = await api.post("/lessons/generate", { curriculum_id: id, language: lang });
      setLesson(r.data.content);
      toast.success("Lesson ready");
    } catch (e) {
      const detail = e?.response?.data?.detail || "Failed";
      if (e?.response?.status === 402) { toast.error(detail); nav("/upgrade"); }
      else toast.error(detail);
    }
    finally { setBusy(false); }
  };

  useEffect(() => { genLesson(); /* eslint-disable-next-line */ }, [id, lang]);

  // --- Streaming chat ---
  const speak = (text) => {
    if (!speakOn || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = LANG_TAG[lang] || "en-US";
    u.rate = 1.0;
    window.speechSynthesis.speak(u);
  };

  const sendChat = async () => {
    const msg = input.trim();
    if (!msg || streaming) return;
    setInput("");
    setMessages(m => [...m, { role: "user", content: msg }, { role: "assistant", content: "" }]);
    setStreaming(true);
    let streamToken;
    try {
      const tk = await api.post("/auth/stream-token");
      streamToken = tk.data.stream_token;
    } catch (e) { toast.error("Auth failed"); setStreaming(false); return; }
    const params = new URLSearchParams({ token: streamToken, curriculum_id: id, personality: avatar, language: lang, message: msg });
    const url = `${API}/tutor/chat/stream?${params.toString()}`;
    const es = new EventSource(url);
    esRef.current = es;
    let buffer = "";
    es.addEventListener("meta", (ev) => {
      try { const d = JSON.parse(ev.data); if (d.emotion) setEmotion(d.emotion); } catch { /* noop */ }
    });
    es.addEventListener("token", (ev) => {
      try {
        const d = JSON.parse(ev.data);
        buffer += d.t;
        setMessages(m => { const c = [...m]; c[c.length - 1] = { role: "assistant", content: buffer }; return c; });
      } catch { /* noop */ }
    });
    es.addEventListener("done", () => { es.close(); setStreaming(false); speak(buffer); });
    es.addEventListener("error", () => { es.close(); setStreaming(false); toast.error("Chat stream error"); });
  };

  const runBridge = async () => {
    const msg = input.trim();
    if (!msg) { toast.error("Type a question first"); return; }
    if (!isPremium) { toast.error("Premium feature"); nav("/upgrade"); return; }
    setBridgeBusy(true); setBridgeResult(null); setBridgeOpen(true);
    try {
      const r = await api.post("/tutor/bridge", { curriculum_id: id, primary: lang, secondary: bridgeSecondary, question: msg });
      setBridgeResult(r.data);
    } catch (e) {
      const s = e?.response?.status;
      if (s === 402) { toast.error("Premium feature"); nav("/upgrade"); }
      else toast.error(e?.response?.data?.detail || "Bridge failed");
      setBridgeOpen(false);
    } finally { setBridgeBusy(false); }
  };

  // --- Voice input ---
  const toggleMic = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast.error("Voice input not supported in this browser"); return; }
    if (listening) { recogRef.current?.stop(); return; }
    const r = new SR();
    r.lang = LANG_TAG[lang] || "en-US";
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onresult = (e) => setInput(prev => (prev ? prev + " " : "") + e.results[0][0].transcript);
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recogRef.current = r;
    r.start();
    setListening(true);
  };

  // --- Quiz ---
  const genQuiz = async () => {
    setBusy(true); setResult(null); setQuiz(null);
    try {
      const r = await api.post("/quiz/generate", { curriculum_id: id, language: lang, num_questions: 5 });
      const questions = r.data?.questions || [];
      if (questions.length === 0) {
        toast.error("Quiz returned no questions — please try again");
        setBusy(false);
        return;
      }
      setQuiz(r.data);
      setAnswers(new Array(questions.length).fill(-1));
      // Scroll to quiz card so user sees Question 1 immediately
      setTimeout(() => quizRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (e) {
      const detail = e?.response?.data?.detail || e?.message || "Quiz generation failed";
      toast.error(detail);
    }
    finally { setBusy(false); }
  };

  const submitQuiz = async () => {
    if (answers.some(a => a < 0)) { toast.error("Answer all questions"); return; }
    try {
      const r = await api.post("/quiz/submit", { quiz_id: quiz.id, answers });
      setResult(r.data);
      toast.success(`${tr.score}: ${r.data.score}%`);
    } catch (e) { toast.error("Submit failed"); }
  };

  const EmoIcon = EMO_ICON[emotion];

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
      <button onClick={() => nav("/student")} data-testid="back-btn" className="no-print flex items-center gap-2 mb-6 px-4 py-2 bg-white brutal-btn rounded-full font-bold text-sm">
        <ArrowLeft className="w-4 h-4" /> {tr.back}
      </button>

      <div className="grid lg:grid-cols-[1.2fr_1fr] gap-6">
        {/* Lesson + Quiz */}
        <div className="space-y-6">
          <div id="lesson-print" className="brutal rounded-2xl bg-white p-6 md:p-8" data-testid="lesson-card">
            {busy && !lesson && <div className="py-10 text-center text-[#4A4A4A] animate-pulse">{tr.loading}</div>}
            {lesson && (
              <>
                <div className="flex flex-wrap items-center gap-2 mb-3 no-print">
                  <span className="px-3 py-1 rounded-full bg-[#FFE66D] brutal-sm text-[10px] font-black uppercase tracking-widest">AI Lesson</span>
                  <span className="px-3 py-1 rounded-full bg-[#4ECDC4] brutal-sm text-[10px] font-black uppercase tracking-widest">{lang}</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-black tracking-tight" style={{ fontFamily: "Outfit" }}>{lesson.title}</h1>
                <p className="text-[#4A4A4A] mt-3">{lesson.summary}</p>
                <div className="mt-6 space-y-5">
                  {(lesson.sections || []).map((s, i) => (
                    <div key={i} className="border-l-4 border-[#FF6B6B] pl-4">
                      <h3 className="font-black text-lg">{s.heading}</h3>
                      <p className="text-[#121212] mt-1 whitespace-pre-wrap">{s.content}</p>
                    </div>
                  ))}
                </div>
                {lesson.key_points?.length > 0 && (
                  <div className="mt-6 p-5 rounded-xl bg-[#F4F0FF] brutal-sm">
                    <div className="text-xs font-black uppercase tracking-widest mb-2">{tr.keyPoints}</div>
                    <ul className="list-disc pl-5 space-y-1 font-medium">{lesson.key_points.map((k, i) => <li key={i}>{k}</li>)}</ul>
                  </div>
                )}
                {lesson.example && (
                  <div className="mt-4 p-5 rounded-xl bg-[#FFF9C4] brutal-sm">
                    <div className="text-xs font-black uppercase tracking-widest mb-2">{tr.example}</div>
                    <p className="font-medium">{lesson.example}</p>
                  </div>
                )}
                <div className="mt-6 flex gap-3 flex-wrap no-print">
                  <button onClick={genLesson} disabled={busy} data-testid="regen-lesson" className="px-5 py-2.5 rounded-full bg-white brutal-btn font-black uppercase text-xs tracking-widest flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> {tr.startLesson}
                  </button>
                  <button onClick={genQuiz} disabled={busy} data-testid="gen-quiz" className="px-5 py-2.5 rounded-full bg-[#FF6B6B] text-white brutal-btn font-black uppercase text-xs tracking-widest flex items-center gap-2">
                    <ClipboardCheck className="w-4 h-4" /> {tr.takeQuiz}
                  </button>
                  <button onClick={() => setTeachOpen(true)} data-testid="teach-open" className="px-5 py-2.5 rounded-full bg-[#9D4EDD] text-white brutal-btn font-black uppercase text-xs tracking-widest flex items-center gap-2">
                    <GraduationCap className="w-4 h-4" /> Teach me live
                  </button>
                  <button onClick={() => window.print()} data-testid="print-lesson" className="px-5 py-2.5 rounded-full bg-[#4ECDC4] brutal-btn font-black uppercase text-xs tracking-widest flex items-center gap-2">
                    <Printer className="w-4 h-4" /> {tr.download}
                  </button>
                </div>
              </>
            )}
          </div>

          {quiz && (
            <div ref={quizRef} className="brutal rounded-2xl bg-white p-6 md:p-8 no-print" data-testid="quiz-card">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <h2 className="text-2xl font-black" style={{ fontFamily: "Outfit" }}>{tr.takeQuiz}</h2>
                <span className={`px-3 py-1 rounded-full brutal-sm text-[10px] font-black uppercase tracking-widest ${
                  quiz.difficulty === "advanced" ? "bg-[#FF6B6B] text-white" :
                  quiz.difficulty === "intermediate" ? "bg-[#FFE66D]" : "bg-[#E8F5E9]"
                }`}>{quiz.difficulty || "beginner"}</span>
                <span className="px-3 py-1 rounded-full bg-[#F4F0FF] brutal-sm text-[10px] font-black uppercase tracking-widest">{quiz.questions?.length || 0} Questions</span>
              </div>
              <div className="space-y-5">
                {quiz.questions.map((q, qi) => (
                  <div key={qi} className="p-4 rounded-xl bg-[#FAFAFA] brutal-sm">
                    <p className="font-bold mb-3">{qi + 1}. {q.q}</p>
                    <div className="grid gap-2">
                      {q.options.map((opt, oi) => {
                        const selected = answers[qi] === oi;
                        const correct = result && oi === q.answer;
                        const wrong = result && selected && oi !== q.answer;
                        return (
                          <button key={oi} onClick={() => !result && setAnswers(a => a.map((v, i) => i === qi ? oi : v))}
                            data-testid={`q${qi}-opt${oi}`}
                            className={`text-left px-4 py-2 rounded-lg border-2 font-medium transition ${correct ? "bg-[#E8F5E9] border-[#121212]" : wrong ? "bg-[#FFEBE6] border-[#121212]" : selected ? "bg-[#FFE66D] border-[#121212]" : "bg-white border-[#121212] hover:bg-gray-50"}`}>
                            {String.fromCharCode(65 + oi)}. {opt}
                          </button>
                        );
                      })}
                    </div>
                    {result && <p className="text-sm mt-2 text-[#4A4A4A] italic">{result.breakdown[qi].explanation}</p>}
                  </div>
                ))}
              </div>
              {!result ? (
                <button onClick={submitQuiz} data-testid="submit-quiz" className="mt-5 px-6 py-3 rounded-full bg-[#4ECDC4] brutal-btn font-black uppercase text-sm tracking-widest">{tr.submit}</button>
              ) : (
                <div className="mt-5 p-5 rounded-xl bg-[#F4F0FF] brutal-sm">
                  <div className="text-xs font-black uppercase tracking-widest">{tr.score}</div>
                  <div className="text-4xl font-black">{result.score}%</div>
                  <div className="text-xs mt-1">{result.correct}/{result.total} · Level → <span className="font-black uppercase">{result.new_difficulty}</span></div>
                  <button onClick={genQuiz} data-testid="retry-quiz" className="mt-3 px-4 py-2 rounded-full bg-white brutal-btn text-xs font-black uppercase tracking-widest">{tr.tryAgain}</button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tutor Chat */}
        <div className="brutal-lg rounded-2xl bg-white flex flex-col h-[70vh] sticky top-20 overflow-hidden no-print" data-testid="chat-card">
          <div className="border-b-2 border-[#121212] px-5 py-4 flex items-center justify-between bg-[#FAFAFA]">
            <div>
              <div className="text-[10px] uppercase font-black tracking-widest text-[#4A4A4A]">{tr.chatWithTutor}</div>
              <div className="font-black text-lg">{tr.personalities[avatar]}</div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setSpeakOn(s => !s)} data-testid="toggle-speak"
                className={`p-2 rounded-full brutal-sm ${speakOn ? "bg-[#4ECDC4]" : "bg-white"}`}
                title={tr.speaker}>
                {speakOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
              <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-white brutal-sm">
                <EmoIcon className="w-4 h-4" strokeWidth={2.5} />
                <span className="text-[10px] font-black uppercase tracking-widest">{tr[`feeling${emotion.charAt(0).toUpperCase() + emotion.slice(1)}`]}</span>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
            {messages.length === 0 && <p className="text-center text-[#4A4A4A] my-auto">Ask the tutor anything about this topic.</p>}
            {messages.map((m, i) => (
              <div key={i} className={`max-w-[85%] p-3 rounded-2xl brutal-sm ${m.role === "user" ? "self-end bg-[#E8F5E9] rounded-tr-none" : "self-start bg-[#F4F0FF] rounded-tl-none"}`}>
                <p className="whitespace-pre-wrap text-sm">{m.content}{streaming && i === messages.length - 1 && m.role === "assistant" && <span className="inline-block w-2 h-4 bg-[#FF6B6B] align-middle ml-1 animate-pulse" />}</p>
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <div className="border-t-2 border-[#121212] p-3 flex gap-2 bg-[#FAFAFA]">
            <button onClick={toggleMic} data-testid="chat-mic"
              className={`p-2.5 rounded-full brutal-sm ${listening ? "bg-[#FF6B6B] text-white animate-pulse" : "bg-white"}`}
              title={tr.mic}>
              {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <button onClick={runBridge} data-testid="chat-bridge"
              className={`p-2.5 rounded-full brutal-sm ${isPremium ? "bg-[#9D4EDD] text-white" : "bg-white opacity-70"}`}
              title="Bridge mode (Premium)">
              <Languages className="w-4 h-4" />
            </button>
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendChat()}
              placeholder={tr.typeMessage}
              data-testid="chat-input"
              className="flex-1 px-4 py-2.5 rounded-full brutal-sm bg-white font-medium focus:outline-none focus:border-[#FF6B6B]" />
            <button onClick={sendChat} disabled={streaming} data-testid="chat-send" className="px-4 rounded-full bg-[#FF6B6B] text-white brutal-btn disabled:opacity-50">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {bridgeOpen && (        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setBridgeOpen(false)}>
          <div onClick={e => e.stopPropagation()} className="bg-white brutal-lg rounded-2xl p-6 md:p-8 w-full max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="bridge-modal">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="text-xs uppercase tracking-[0.3em] font-black text-[#9D4EDD]">Bilingual Bridge</div>
                <h3 className="text-2xl font-black mt-1" style={{ fontFamily: "Outfit" }}>{LANG_LABELS[lang]} → {LANG_LABELS[bridgeSecondary]}</h3>
              </div>
              <button onClick={() => setBridgeOpen(false)} data-testid="bridge-close" className="p-2 rounded-full bg-white brutal-btn"><span className="sr-only">close</span>✕</button>
            </div>
            <div className="flex gap-2 mb-4">
              {["en", "ms", "zh"].filter(l => l !== lang).map(l => (
                <button key={l} onClick={() => setBridgeSecondary(l)} data-testid={`bridge-lang-${l}`}
                  className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-widest brutal-sm ${bridgeSecondary === l ? "bg-[#FFE66D]" : "bg-white"}`}>
                  {LANG_LABELS[l]}
                </button>
              ))}
            </div>
            {bridgeBusy ? (
              <div className="py-10 text-center animate-pulse text-[#4A4A4A]">{tr.loading}</div>
            ) : bridgeResult && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-[#F4F0FF] brutal-sm">
                  <div className="text-[10px] uppercase tracking-widest font-black text-[#4A4A4A] mb-1">{LANG_LABELS[bridgeResult.primary]}</div>
                  <p className="text-sm whitespace-pre-wrap">{bridgeResult.primary_explanation}</p>
                </div>
                <div className="p-4 rounded-xl bg-[#FFF9C4] brutal-sm">
                  <div className="text-[10px] uppercase tracking-widest font-black text-[#4A4A4A] mb-2">{LANG_LABELS[bridgeResult.secondary]}</div>
                  <ul className="list-disc pl-5 space-y-1 text-sm font-medium">{(bridgeResult.secondary_summary || []).map((b, i) => <li key={i}>{b}</li>)}</ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <InteractiveTeach
        open={teachOpen}
        onClose={() => setTeachOpen(false)}
        curriculumId={id}
        personality={avatar}
        avatarLabel={tr.personalities[avatar]}
      />
    </div>
  );
}
