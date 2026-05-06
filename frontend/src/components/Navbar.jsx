import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { LANGS, T } from "../lib/i18n";
import { GraduationCap, LogOut, Globe, Crown, Sparkles } from "lucide-react";

export default function Navbar() {
  const { user, lang, setLang, logout, isPremium } = useApp();
  const nav = useNavigate();
  const tr = T[lang] || T.en;

  const home = user ? (user.role === "admin" ? "/admin" : user.role === "teacher" ? "/teacher" : "/student") : "/";

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b-2 border-[#121212] px-5 md:px-8 py-3 flex items-center justify-between">
      <Link to={home} className="flex items-center gap-2 font-black text-xl" data-testid="nav-logo">
        <span className="w-9 h-9 rounded-xl bg-[#FF6B6B] brutal-sm flex items-center justify-center">
          <GraduationCap className="w-5 h-5 text-white" strokeWidth={2.5} />
        </span>
        <span style={{ fontFamily: "Outfit" }}>{tr.appName}</span>
      </Link>

      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-1 px-2 py-1 rounded-full bg-[#FFF9C4] brutal-sm" data-testid="lang-switcher">
          <Globe className="w-4 h-4 ml-1" strokeWidth={2.5} />
          {LANGS.map(l => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              data-testid={`lang-${l.code}`}
              className={`px-3 py-1 text-xs font-bold rounded-full transition ${lang === l.code ? "bg-[#121212] text-white" : "text-[#121212] hover:bg-white"}`}
            >{l.flag}</button>
          ))}
        </div>

        {user ? (
          <>
            {isPremium ? (
              <Link to="/upgrade" data-testid="nav-premium" className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#FFE66D] brutal-sm text-xs font-black uppercase tracking-widest">
                <Crown className="w-3.5 h-3.5" /> Premium
              </Link>
            ) : (
              <Link to="/upgrade" data-testid="nav-upgrade" className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#FF6B6B] text-white brutal-btn text-xs font-black uppercase tracking-widest">
                <Sparkles className="w-3.5 h-3.5" /> Upgrade
              </Link>
            )}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#E8F5E9] brutal-sm">
              <div className="w-7 h-7 rounded-full bg-[#4ECDC4] flex items-center justify-center text-xs font-black text-white">
                {user.name?.[0]?.toUpperCase() ?? "U"}
              </div>
              <span className="text-sm font-bold truncate max-w-[120px]">{user.name}</span>
              <span className="text-[10px] uppercase tracking-widest font-black px-2 py-0.5 rounded-full bg-[#FFE66D] brutal-sm">{user.role}</span>
            </div>
            <button
              onClick={() => { logout(); nav("/"); }}
              data-testid="nav-logout"
              className="px-3 py-2 rounded-full bg-white brutal-btn text-sm font-bold flex items-center gap-1"
            ><LogOut className="w-4 h-4" /> {tr.logout}</button>
          </>
        ) : (
          <Link to="/" data-testid="nav-login" className="px-4 py-2 rounded-full bg-[#FF6B6B] text-white brutal-btn text-sm font-bold">
            {tr.login}
          </Link>
        )}
      </div>
    </nav>
  );
}
