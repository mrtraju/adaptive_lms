import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { T, LANGS } from "../lib/i18n";
import { toast } from "sonner";
import { Sparkles, BrainCircuit, Languages, HeartHandshake } from "lucide-react";

export default function Login() {
  const { lang, setLang, login, register } = useApp();
  const nav = useNavigate();
  const tr = T[lang] || T.en;
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("student@lms.com");
  const [password, setPassword] = useState("student123");
  const [name, setName] = useState("");
  const [role, setRole] = useState("student");
  const [busy, setBusy] = useState(false);

  const go = (u) => {
    if (u.role === "admin") nav("/admin");
    else if (u.role === "teacher") nav("/teacher");
    else nav("/student");
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const u = mode === "login"
        ? await login(email, password)
        : await register({ email, password, name, role, language: lang });
      toast.success(`${tr.welcome}, ${u.name}`);
      go(u);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Error");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] grid lg:grid-cols-2 grid-dots">
      {/* Left: marketing */}
      <div className="hidden lg:flex flex-col justify-center px-14 gap-8">
        <span className="self-start px-4 py-1.5 rounded-full bg-[#FFE66D] brutal-sm text-xs font-black uppercase tracking-widest">
          Groq · Llama 3.3 · Adaptive
        </span>
        <h1 className="text-5xl xl:text-6xl font-black leading-[1.05] tracking-tight" style={{ fontFamily: "Outfit" }}>
          A humanized<br /> AI tutor that<br />
          <span className="bg-[#FF6B6B] text-white px-3 rounded-xl brutal-sm inline-block mt-2">teaches on your terms.</span>
        </h1>
        <p className="text-lg text-[#4A4A4A] max-w-lg">
          Curriculum-bound lessons, four distinct tutor personalities, emotion-aware pacing, and
          fully multilingual — English, Bahasa Melayu, 中文.
        </p>
        <div className="grid grid-cols-2 gap-4 max-w-md">
          {[
            { icon: Languages, label: "3 languages", bg: "#F4F0FF" },
            { icon: BrainCircuit, label: "4 tutors", bg: "#E8F5E9" },
            { icon: HeartHandshake, label: "Emotion-aware", bg: "#FFEBE6" },
            { icon: Sparkles, label: "Adaptive level", bg: "#FFF9C4" },
          ].map((f, i) => (
            <div key={i} className="brutal bg-white rounded-xl p-4 flex items-center gap-3" style={{ background: f.bg }}>
              <f.icon className="w-6 h-6" strokeWidth={2.5} />
              <span className="font-bold text-sm">{f.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center p-6 md:p-14">
        <form onSubmit={submit} className="w-full max-w-md bg-white brutal-lg rounded-2xl p-7 md:p-9" data-testid="auth-form">
          <div className="flex gap-2 mb-6 p-1 rounded-full bg-[#FAFAFA] brutal-sm">
            {["login", "register"].map(m => (
              <button key={m} type="button" onClick={() => setMode(m)}
                data-testid={`tab-${m}`}
                className={`flex-1 py-2 rounded-full text-sm font-black uppercase tracking-wide transition ${mode === m ? "bg-[#121212] text-white" : "text-[#4A4A4A]"}`}>
                {m === "login" ? tr.login : tr.register}
              </button>
            ))}
          </div>

          <div className="flex gap-2 mb-5 flex-wrap">
            {LANGS.map(l => (
              <button key={l.code} type="button" onClick={() => setLang(l.code)}
                data-testid={`form-lang-${l.code}`}
                className={`px-3 py-1 rounded-full text-xs font-bold border-2 border-[#121212] ${lang === l.code ? "bg-[#FFE66D]" : "bg-white"}`}>
                {l.label}
              </button>
            ))}
          </div>

          {mode === "register" && (
            <>
              <label className="text-xs font-black uppercase tracking-widest">{tr.name}</label>
              <input value={name} onChange={e => setName(e.target.value)} required
                data-testid="input-name"
                className="w-full mt-1 mb-4 px-4 py-3 rounded-lg brutal-sm bg-white font-medium focus:outline-none focus:border-[#FF6B6B]" />

              <label className="text-xs font-black uppercase tracking-widest">{tr.role}</label>
              <div className="grid grid-cols-3 gap-2 mt-1 mb-4">
                {["student", "teacher", "admin"].map(r => (
                  <button key={r} type="button" onClick={() => setRole(r)}
                    data-testid={`role-${r}`}
                    className={`py-2 rounded-lg text-xs font-black uppercase border-2 border-[#121212] ${role === r ? "bg-[#4ECDC4] text-[#121212]" : "bg-white"}`}>
                    {tr[r]}
                  </button>
                ))}
              </div>
            </>
          )}

          <label className="text-xs font-black uppercase tracking-widest">{tr.email}</label>
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" required
            data-testid="input-email"
            className="w-full mt-1 mb-4 px-4 py-3 rounded-lg brutal-sm bg-white font-medium focus:outline-none focus:border-[#FF6B6B]" />

          <label className="text-xs font-black uppercase tracking-widest">{tr.password}</label>
          <input value={password} onChange={e => setPassword(e.target.value)} type="password" required
            data-testid="input-password"
            className="w-full mt-1 mb-6 px-4 py-3 rounded-lg brutal-sm bg-white font-medium focus:outline-none focus:border-[#FF6B6B]" />

          <button disabled={busy} type="submit"
            data-testid="auth-submit"
            className="w-full py-3 rounded-full bg-[#FF6B6B] text-white font-black uppercase tracking-widest brutal-btn disabled:opacity-50">
            {busy ? "…" : (mode === "login" ? tr.login : tr.register)}
          </button>

          <p className="text-xs text-[#4A4A4A] mt-5 text-center">
            Demo: <span className="font-bold">student@lms.com / student123</span> ·
            <span className="font-bold"> teacher@lms.com / teacher123</span> ·
            <span className="font-bold"> admin@lms.com / admin123</span>
          </p>
        </form>
      </div>
    </div>
  );
}
