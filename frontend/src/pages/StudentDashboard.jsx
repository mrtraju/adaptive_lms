import React, { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { api } from "../lib/api";
import { T } from "../lib/i18n";
import { useNavigate, Link } from "react-router-dom";
import { BookOpen, Flame, Trophy, Target, Lock, Crown } from "lucide-react";
import { toast } from "sonner";

const AVATARS = [
  { id: "strict", label: { en: "Strict Teacher", ms: "Guru Tegas", zh: "严格老师" }, bg: "#E8F5E9", img: "https://images.unsplash.com/photo-1669042490014-6a1b76025e0c?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NTN8MHwxfHNlYXJjaHwzfHxjb2xvcmZ1bCUyMGFic3RyYWN0JTIwc2hhcGUlMjAzZHxlbnwwfHx8fDE3NzY4NDQ3Njh8MA&ixlib=rb-4.1.0&q=85" },
  { id: "friendly", label: { en: "Friendly Mentor", ms: "Mentor Mesra", zh: "友善导师" }, bg: "#F4F0FF", img: "https://images.unsplash.com/photo-1680355466499-39701c0be79f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1MDV8MHwxfHNlYXJjaHwyfHxyb2JvdCUyMGZhY2UlMjBwb3J0cmFpdCUyMDNkJTIwaWxsdXN0cmF0aW9ufGVufDB8fHx8MTc3Njg0NDc2M3ww&ixlib=rb-4.1.0&q=85" },
  { id: "socratic", premium: true, label: { en: "Socratic Coach", ms: "Pembimbing Socratic", zh: "苏格拉底教练" }, bg: "#FFF9C4", img: "https://images.unsplash.com/photo-1692250775015-75ec99f14486?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1MDV8MHwxfHNlYXJjaHw0fHxyb2JvdCUyMGZhY2UlMjBwb3J0cmFpdCUyMDNkJTIwaWxsdXN0cmF0aW9ufGVufDB8fHx8MTc3Njg0NDc2M3ww&ixlib=rb-4.1.0&q=85" },
  { id: "motivational", premium: true, label: { en: "Motivational Coach", ms: "Jurulatih Motivasi", zh: "激励教练" }, bg: "#FFEBE6", img: "https://images.unsplash.com/photo-1682071531961-3c50cff9feaa?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NTN8MHwxfHNlYXJjaHwxfHxjb2xvcmZ1bCUyMGFic3RyYWN0JTIwc2hhcGUlMjAzZHxlbnwwfHx8fDE3NzY4NDQ3Njh8MA&ixlib=rb-4.1.0&q=85" },
];

export default function StudentDashboard() {
  const { user, lang, isPremium, subscription } = useApp();
  const tr = T[lang] || T.en;
  const nav = useNavigate();
  const [topics, setTopics] = useState([]);
  const [progress, setProgress] = useState(null);
  const [avatar, setAvatar] = useState(localStorage.getItem("lms_avatar") || "friendly");

  useEffect(() => {
    api.get("/curriculum").then(r => setTopics(r.data)).catch(() => {});
    api.get("/progress/me").then(r => setProgress(r.data)).catch(() => {});
  }, []);

  const premiumSet = new Set(subscription?.features?.premium_personalities || ["socratic", "motivational"]);
  const isLocked = (id) => premiumSet.has(id) && !isPremium;

  const pick = (a) => {
    if (isLocked(a.id)) { toast.error("Premium feature"); nav("/upgrade"); return; }
    setAvatar(a.id); localStorage.setItem("lms_avatar", a.id); toast.success(`Tutor: ${tr.personalities[a.id]}`);
  };
  const start = (topicId) => nav(`/lesson/${topicId}?avatar=${avatar}`);

  const stats = [
    { icon: BookOpen, label: tr.lessonsDone, val: progress?.lessons_completed ?? 0, bg: "#F4F0FF" },
    { icon: Trophy, label: tr.quizzesDone, val: progress?.quizzes_completed ?? 0, bg: "#FFF9C4" },
    { icon: Flame, label: tr.avgScore, val: Math.round(progress?.progress?.avg_score ?? 0), bg: "#FFEBE6" },
    { icon: Target, label: tr.difficulty, val: progress?.current_difficulty ?? "beginner", bg: "#E8F5E9" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-10">
      <div className="mb-10">
        <p className="text-xs uppercase tracking-[0.3em] font-black text-[#FF6B6B]">{tr.welcome}</p>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight mt-2" style={{ fontFamily: "Outfit" }}>
          {user?.name} <span className="inline-block px-3 py-1 bg-[#FFE66D] brutal-sm rounded-xl text-2xl align-middle ml-2">{tr.student}</span>
        </h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        {stats.map((s, i) => (
          <div key={i} className="brutal rounded-2xl p-5" style={{ background: s.bg }} data-testid={`stat-${i}`}>
            <s.icon className="w-6 h-6 mb-2" strokeWidth={2.5} />
            <div className="text-3xl font-black">{s.val}</div>
            <div className="text-xs uppercase tracking-widest font-bold mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="mb-12">
        <h2 className="text-2xl font-black mb-5" style={{ fontFamily: "Outfit" }}>{tr.choosePersonality}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {AVATARS.map(a => {
            const locked = isLocked(a.id);
            return (
              <button key={a.id} onClick={() => pick(a)}
                data-testid={`avatar-${a.id}`}
                className={`rounded-2xl p-5 text-left transition relative ${avatar === a.id ? "brutal-lg bg-[#FFF9C4] -translate-y-1" : "brutal bg-white"} ${locked ? "opacity-80" : ""}`}
                style={avatar === a.id ? { background: "#FFF9C4" } : { background: a.bg }}>
                <div className="w-16 h-16 rounded-xl overflow-hidden brutal-sm mb-3 bg-white">
                  <img src={a.img} alt={a.id} className="w-full h-full object-cover" />
                </div>
                <div className="font-black text-base flex items-center gap-1">
                  {a.label[lang] || a.label.en}
                </div>
                {locked && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full bg-[#FF6B6B] text-white brutal-sm text-[9px] font-black uppercase tracking-widest">
                    <Lock className="w-3 h-3" strokeWidth={3} /> Pro
                  </div>
                )}
                {avatar === a.id && !locked && <div className="text-[10px] uppercase tracking-widest font-black text-[#FF6B6B] mt-1">Selected</div>}
              </button>
            );
          })}
        </div>
      </div>

      {!isPremium && (
        <div className="brutal rounded-2xl bg-[#FFF9C4] p-5 mb-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-3" data-testid="upgrade-banner">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FF6B6B] text-white brutal-sm flex items-center justify-center"><Crown className="w-5 h-5" strokeWidth={2.5} /></div>
            <div>
              <div className="font-black text-base">Unlock the Socratic & Motivational coaches</div>
              <div className="text-xs text-[#4A4A4A]">
                {subscription?.daily_lesson_regens ? `Free tier: ${subscription.daily_lesson_regens.used}/${subscription.daily_lesson_regens.limit} lessons today` : "Upgrade for unlimited lessons"}
              </div>
            </div>
          </div>
          <Link to="/upgrade" data-testid="banner-upgrade" className="px-5 py-2.5 rounded-full bg-[#FF6B6B] text-white brutal-btn font-black uppercase text-xs tracking-widest">Upgrade</Link>
        </div>
      )}

      <div>
        <h2 className="text-2xl font-black mb-5" style={{ fontFamily: "Outfit" }}>{tr.chooseTopic}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {topics.map(t => (
            <button key={t.id} onClick={() => start(t.id)}
              data-testid={`topic-${t.id}`}
              className="brutal rounded-2xl p-6 bg-white text-left">
              <div className="flex justify-between items-start mb-3">
                <span className="px-2 py-1 rounded-full bg-[#4ECDC4] brutal-sm text-[10px] font-black uppercase tracking-widest">{t.subject}</span>
                <span className="text-xs uppercase font-bold text-[#4A4A4A]">{t.level}</span>
              </div>
              <h3 className="text-xl font-black mb-1">{t.title}</h3>
              <p className="text-sm text-[#4A4A4A] line-clamp-2">{t.description}</p>
              <div className="mt-4 text-[#FF6B6B] text-sm font-black uppercase tracking-widest">→ {tr.startLesson}</div>
            </button>
          ))}
          {topics.length === 0 && <div className="col-span-full text-center py-10 text-[#4A4A4A]">No topics yet.</div>}
        </div>
      </div>
    </div>
  );
}
