import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { T } from "../lib/i18n";
import { Check, Sparkles, Crown, X } from "lucide-react";
import { toast } from "sonner";

const FEATURES_FREE = {
  en: ["3 AI lesson generations / day", "Friendly & Strict tutor personalities", "Quizzes with adaptive difficulty", "All 3 languages (EN / MS / ZH)"],
  ms: ["3 penjanaan pelajaran AI / hari", "Personaliti Tutor Mesra & Tegas", "Kuiz dengan tahap kesukaran adaptif", "Semua 3 bahasa (EN / MS / ZH)"],
  zh: ["每日 3 次 AI 课程生成", "友善与严格导师个性", "自适应难度测验", "全部 3 种语言（EN / BM / ZH）"],
};
const FEATURES_PREMIUM = {
  en: ["Everything in Free", "Unlimited AI lesson regenerations", "All 4 tutor personalities (Socratic & Motivational unlocked)", "Bilingual Bridge Mode for teachers", "Teacher: AI Intervention suggestions", "Streaming tutor responses + voice I/O"],
  ms: ["Semua dalam Percuma", "Penjanaan pelajaran AI tanpa had", "Semua 4 personaliti tutor (Socratic & Motivasi dibuka)", "Mod Jambatan Dwibahasa untuk guru", "Guru: cadangan intervensi AI", "Respons tutor aliran + suara I/O"],
  zh: ["包含免费版全部功能", "无限 AI 课程重生成", "全部 4 位导师（苏格拉底 & 激励解锁）", "教师双语桥接模式", "教师：AI 干预建议", "流式导师响应 + 语音"],
};
const COPY = {
  en: { title: "Upgrade to Premium", sub: "Unlock the full Adaptive LMS experience.", free: "Free", premium: "Premium", month: "/ month", current: "Current plan", upgrade: "Upgrade now", downgrade: "Back to Free", mocked: "MOCKED payment — one click upgrade for demo. Replace with Stripe Checkout in production." },
  ms: { title: "Naik taraf ke Premium", sub: "Buka kunci pengalaman LMS Adaptif penuh.", free: "Percuma", premium: "Premium", month: "/ bulan", current: "Pelan semasa", upgrade: "Naik taraf sekarang", downgrade: "Kembali ke Percuma", mocked: "Pembayaran MOCKED — satu klik untuk demo. Gantikan dengan Stripe Checkout dalam pengeluaran." },
  zh: { title: "升级至高级版", sub: "解锁完整的自适应 LMS 体验。", free: "免费", premium: "高级", month: "/ 月", current: "当前计划", upgrade: "立即升级", downgrade: "回到免费", mocked: "模拟支付（MOCKED）— 一键升级供演示。生产中替换为 Stripe Checkout。" },
};

export default function Upgrade() {
  const { user, lang, upgrade, downgrade, isPremium } = useApp();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const tr = T[lang] || T.en;
  const c = COPY[lang] || COPY.en;

  const doUpgrade = async () => {
    setBusy(true);
    try {
      await upgrade();
      toast.success(`${c.premium} ${tr.dashboard}!`);
      const dest = user?.role === "admin" ? "/admin" : user?.role === "teacher" ? "/teacher" : "/student";
      nav(dest);
    } catch (e) { toast.error("Upgrade failed"); }
    finally { setBusy(false); }
  };

  const doDowngrade = async () => {
    setBusy(true);
    try { await downgrade(); toast.success(c.free); } catch { toast.error("Failed"); }
    finally { setBusy(false); }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-12 grid-dots min-h-[80vh]">
      <div className="text-center mb-12">
        <p className="text-xs uppercase tracking-[0.3em] font-black text-[#FF6B6B]">Pricing</p>
        <h1 className="text-4xl md:text-6xl font-black tracking-tight mt-2" style={{ fontFamily: "Outfit" }}>{c.title}</h1>
        <p className="text-lg text-[#4A4A4A] mt-3">{c.sub}</p>
        <p className="text-[11px] uppercase tracking-widest text-[#4A4A4A] mt-2 font-bold">⚠ {c.mocked}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* FREE */}
        <div className="brutal rounded-2xl bg-white p-7 md:p-9 flex flex-col" data-testid="plan-free">
          <span className="self-start px-3 py-1 rounded-full bg-[#FAFAFA] brutal-sm text-[10px] font-black uppercase tracking-widest">{c.free}</span>
          <div className="mt-4">
            <span className="text-5xl md:text-6xl font-black tracking-tight" style={{ fontFamily: "Outfit" }}>$0</span>
            <span className="text-[#4A4A4A] font-bold ml-1">{c.month}</span>
          </div>
          <ul className="space-y-3 mt-6 flex-1">
            {FEATURES_FREE[lang].map((f, i) => (
              <li key={i} className="flex items-start gap-3 text-sm font-medium">
                <Check className="w-5 h-5 mt-0.5 flex-shrink-0" strokeWidth={3} /> {f}
              </li>
            ))}
          </ul>
          {!isPremium ? (
            <div className="mt-6 py-3 text-center rounded-full bg-[#FAFAFA] brutal-sm font-black uppercase text-sm tracking-widest">{c.current}</div>
          ) : (
            <button onClick={doDowngrade} disabled={busy} data-testid="btn-downgrade" className="mt-6 py-3 rounded-full bg-white brutal-btn font-black uppercase text-sm tracking-widest">{c.downgrade}</button>
          )}
        </div>

        {/* PREMIUM */}
        <div className="brutal-lg rounded-2xl p-7 md:p-9 flex flex-col relative" style={{ background: "#FFF9C4" }} data-testid="plan-premium">
          <span className="absolute -top-4 right-6 px-4 py-1 rounded-full bg-[#FF6B6B] text-white brutal-sm text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
            <Crown className="w-3 h-3" /> Most popular
          </span>
          <span className="self-start px-3 py-1 rounded-full bg-white brutal-sm text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> {c.premium}
          </span>
          <div className="mt-4">
            <span className="text-5xl md:text-6xl font-black tracking-tight" style={{ fontFamily: "Outfit" }}>$9</span>
            <span className="text-[#4A4A4A] font-bold ml-1">{c.month}</span>
          </div>
          <ul className="space-y-3 mt-6 flex-1">
            {FEATURES_PREMIUM[lang].map((f, i) => (
              <li key={i} className="flex items-start gap-3 text-sm font-medium">
                <Check className="w-5 h-5 mt-0.5 flex-shrink-0 text-[#FF6B6B]" strokeWidth={3} /> {f}
              </li>
            ))}
          </ul>
          {isPremium ? (
            <div className="mt-6 py-3 text-center rounded-full bg-white brutal-sm font-black uppercase text-sm tracking-widest flex items-center justify-center gap-2">
              <Crown className="w-4 h-4" /> {c.current}
            </div>
          ) : (
            <button onClick={doUpgrade} disabled={busy} data-testid="btn-upgrade" className="mt-6 py-3 rounded-full bg-[#FF6B6B] text-white brutal-btn font-black uppercase text-sm tracking-widest flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4" /> {busy ? "…" : c.upgrade}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
