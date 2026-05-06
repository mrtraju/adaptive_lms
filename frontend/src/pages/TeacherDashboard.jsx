import React, { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { api } from "../lib/api";
import { T } from "../lib/i18n";
import { toast } from "sonner";
import { Plus, Trash2, BookOpen, Users, Sparkles, X, Crown } from "lucide-react";
import { Link } from "react-router-dom";

export default function TeacherDashboard() {
  const { user, lang, isPremium } = useApp();
  const tr = T[lang] || T.en;
  const [topics, setTopics] = useState([]);
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState({ title: "", subject: "", level: "beginner", description: "", objectives: "" });
  const [interv, setInterv] = useState(null);
  const [intervBusy, setIntervBusy] = useState(false);

  const openIntervention = async (student) => {
    if (!isPremium && user.role !== "admin") { toast.error("Premium feature"); return; }
    setIntervBusy(true);
    setInterv({ loading: true, student });
    try {
      const r = await api.get(`/teacher/interventions/${student.id}`);
      setInterv(r.data);
    } catch (e) { toast.error("AI intervention failed"); setInterv(null); }
    finally { setIntervBusy(false); }
  };

  const reload = async () => {
    const [c, s] = await Promise.all([api.get("/curriculum"), api.get("/teacher/students")]);
    setTopics(c.data); setStudents(s.data);
  };

  useEffect(() => { reload(); }, []);

  const add = async (e) => {
    e.preventDefault();
    try {
      await api.post("/curriculum", {
        ...form,
        objectives: form.objectives.split(",").map(s => s.trim()).filter(Boolean),
      });
      setForm({ title: "", subject: "", level: "beginner", description: "", objectives: "" });
      toast.success("Added");
      reload();
    } catch (e) { toast.error("Failed"); }
  };

  const del = async (id) => {
    try { await api.delete(`/curriculum/${id}`); toast.success("Deleted"); reload(); } catch { toast.error("Failed"); }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-10">
      <p className="text-xs uppercase tracking-[0.3em] font-black text-[#FF6B6B]">{tr.welcome}</p>
      <h1 className="text-4xl md:text-5xl font-black tracking-tight mt-2 mb-10" style={{ fontFamily: "Outfit" }}>
        {user?.name} <span className="inline-block px-3 py-1 bg-[#4ECDC4] brutal-sm rounded-xl text-2xl align-middle ml-2">{tr.teacher}</span>
      </h1>

      <div className="grid lg:grid-cols-[1fr_1.2fr] gap-6 mb-10">
        <form onSubmit={add} className="brutal rounded-2xl bg-white p-6" data-testid="curriculum-form">
          <h2 className="text-xl font-black mb-4 flex items-center gap-2"><BookOpen className="w-5 h-5" />{tr.newCurriculum}</h2>
          {[
            { k: "title", ph: tr.title }, { k: "subject", ph: tr.subject },
            { k: "description", ph: tr.description }, { k: "objectives", ph: tr.objectives },
          ].map(f => (
            <input key={f.k} required={f.k !== "description"} placeholder={f.ph}
              value={form[f.k]} onChange={e => setForm({ ...form, [f.k]: e.target.value })}
              data-testid={`cf-${f.k}`}
              className="w-full mb-3 px-4 py-2.5 rounded-lg brutal-sm bg-white font-medium focus:outline-none focus:border-[#FF6B6B]" />
          ))}
          <div className="flex gap-2 mb-4">
            {["beginner", "intermediate", "advanced"].map(l => (
              <button key={l} type="button" onClick={() => setForm({ ...form, level: l })}
                data-testid={`cf-level-${l}`}
                className={`flex-1 py-2 rounded-lg text-xs font-black uppercase border-2 border-[#121212] ${form.level === l ? "bg-[#FFE66D]" : "bg-white"}`}>{l}</button>
            ))}
          </div>
          <button type="submit" data-testid="cf-add" className="w-full py-2.5 rounded-full bg-[#FF6B6B] text-white brutal-btn font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" />{tr.add}
          </button>
        </form>

        <div className="brutal rounded-2xl bg-white p-6" data-testid="curriculum-list">
          <h2 className="text-xl font-black mb-4">{tr.curriculum} ({topics.length})</h2>
          <div className="space-y-3 max-h-[420px] overflow-y-auto">
            {topics.map(t => (
              <div key={t.id} className="p-3 rounded-xl brutal-sm bg-[#FAFAFA] flex justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex gap-2 items-center mb-1">
                    <span className="px-2 py-0.5 rounded-full bg-[#4ECDC4] brutal-sm text-[10px] font-black uppercase">{t.subject}</span>
                    <span className="text-[10px] uppercase font-bold text-[#4A4A4A]">{t.level}</span>
                  </div>
                  <div className="font-black">{t.title}</div>
                  <div className="text-xs text-[#4A4A4A] truncate">{t.description}</div>
                </div>
                <button onClick={() => del(t.id)} data-testid={`cf-del-${t.id}`} className="self-start p-2 rounded-lg bg-[#FFEBE6] brutal-sm">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="brutal rounded-2xl bg-white p-6" data-testid="students-panel">
        <h2 className="text-xl font-black mb-4 flex items-center gap-2"><Users className="w-5 h-5" />{tr.students} ({students.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-[#121212]">
                {[tr.name, tr.email, tr.language, tr.lessonsDone, tr.quizzesDone, tr.avgScore, tr.difficulty, ""].map(h => (
                  <th key={h} className="text-left py-2 px-2 font-black uppercase text-[10px] tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s.id} className="border-b border-[#E0E0E0]">
                  <td className="py-2 px-2 font-bold">{s.name}</td>
                  <td className="py-2 px-2 text-[#4A4A4A]">{s.email}</td>
                  <td className="py-2 px-2">{s.language}</td>
                  <td className="py-2 px-2">{s.lessons}</td>
                  <td className="py-2 px-2">{s.quizzes}</td>
                  <td className="py-2 px-2">
                    <span className="px-2 py-0.5 rounded-full bg-[#FFF9C4] brutal-sm text-xs font-black">{s.avg_score}%</span>
                  </td>
                  <td className="py-2 px-2">
                    <span className="px-2 py-0.5 rounded-full bg-[#E8F5E9] brutal-sm text-[10px] font-black uppercase">{s.difficulty}</span>
                  </td>
                  <td className="py-2 px-2">
                    {isPremium || user.role === "admin" ? (
                      <button onClick={() => openIntervention(s)} data-testid={`interv-${s.id}`} className="px-3 py-1 rounded-full bg-[#9D4EDD] text-white brutal-sm text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> {tr.intervention}
                      </button>
                    ) : (
                      <Link to="/upgrade" data-testid={`interv-locked-${s.id}`} className="px-3 py-1 rounded-full bg-white brutal-sm text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                        <Crown className="w-3 h-3" /> Pro
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
              {students.length === 0 && <tr><td colSpan="8" className="py-8 text-center text-[#4A4A4A]">No students yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {interv && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setInterv(null)}>
          <div onClick={e => e.stopPropagation()} className="bg-white brutal-lg rounded-2xl p-6 md:p-8 w-full max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="interv-modal">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="text-xs uppercase tracking-[0.3em] font-black text-[#9D4EDD]">{tr.intervention}</div>
                <h3 className="text-2xl font-black mt-1" style={{ fontFamily: "Outfit" }}>{interv.student?.name}</h3>
              </div>
              <button onClick={() => setInterv(null)} data-testid="interv-close" className="p-2 rounded-full bg-white brutal-btn"><X className="w-4 h-4" /></button>
            </div>
            {intervBusy || interv.loading ? (
              <div className="py-10 text-center animate-pulse text-[#4A4A4A]">{tr.loading}</div>
            ) : interv.advice && (
              <div className="space-y-4">
                <div className="flex gap-2 flex-wrap">
                  {[
                    { k: tr.risk, v: interv.advice.risk_level, bg: interv.advice.risk_level === "high" ? "#FFEBE6" : interv.advice.risk_level === "medium" ? "#FFF9C4" : "#E8F5E9" },
                    { k: tr.avgScore, v: `${interv.stats.avg_score}%`, bg: "#F4F0FF" },
                    { k: tr.difficulty, v: interv.stats.difficulty, bg: "#FFF9C4" },
                  ].map((b, i) => (
                    <div key={i} className="px-3 py-2 rounded-xl brutal-sm" style={{ background: b.bg }}>
                      <div className="text-[10px] uppercase font-black tracking-widest text-[#4A4A4A]">{b.k}</div>
                      <div className="font-black uppercase text-sm">{b.v}</div>
                    </div>
                  ))}
                </div>
                <div className="p-4 rounded-xl bg-[#FAFAFA] brutal-sm">
                  <div className="text-xs font-black uppercase tracking-widest mb-1">{tr.summary}</div>
                  <p className="text-sm">{interv.advice.summary}</p>
                </div>
                <div className="p-4 rounded-xl bg-[#F4F0FF] brutal-sm">
                  <div className="text-xs font-black uppercase tracking-widest mb-2">{tr.recommendations}</div>
                  <ul className="list-disc pl-5 space-y-1 text-sm font-medium">{(interv.advice.recommendations || []).map((r, i) => <li key={i}>{r}</li>)}</ul>
                </div>
                {interv.advice.next_topics?.length > 0 && (
                  <div className="p-4 rounded-xl bg-[#FFF9C4] brutal-sm">
                    <div className="text-xs font-black uppercase tracking-widest mb-2">{tr.nextTopics}</div>
                    <div className="flex flex-wrap gap-2">{interv.advice.next_topics.map((t, i) => <span key={i} className="px-3 py-1 rounded-full bg-white brutal-sm text-xs font-bold">{t}</span>)}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
