import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "../lib/api";

const Ctx = createContext(null);

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [lang, setLang] = useState(localStorage.getItem("lms_lang") || "en");
  const [loading, setLoading] = useState(true);

  const fetchSubscription = useCallback(async () => {
    try {
      const r = await api.get("/subscription/me");
      setSubscription(r.data);
    } catch { /* ignore */ }
  }, []);

  const refresh = useCallback(async () => {
    const t = localStorage.getItem("lms_token");
    if (!t) { setLoading(false); return; }
    try {
      const r = await api.get("/auth/me");
      setUser(r.data);
      if (r.data.language) setLang(r.data.language);
      await fetchSubscription();
    } catch (e) {
      localStorage.removeItem("lms_token");
    } finally { setLoading(false); }
  }, [fetchSubscription]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { localStorage.setItem("lms_lang", lang); }, [lang]);

  const login = async (email, password) => {
    const r = await api.post("/auth/login", { email, password });
    localStorage.setItem("lms_token", r.data.token);
    setUser(r.data.user);
    if (r.data.user.language) setLang(r.data.user.language);
    await fetchSubscription();
    return r.data.user;
  };
  const register = async (payload) => {
    const r = await api.post("/auth/register", payload);
    localStorage.setItem("lms_token", r.data.token);
    setUser(r.data.user);
    setLang(payload.language || "en");
    await fetchSubscription();
    return r.data.user;
  };
  const logout = () => {
    localStorage.removeItem("lms_token");
    setUser(null);
    setSubscription(null);
  };
  const upgrade = async () => {
    const r = await api.post("/subscription/upgrade");
    setUser(r.data.user);
    await fetchSubscription();
    return r.data.user;
  };
  const downgrade = async () => {
    const r = await api.post("/subscription/downgrade");
    setUser(r.data.user);
    await fetchSubscription();
    return r.data.user;
  };

  const isPremium = user?.plan === "premium";

  return (
    <Ctx.Provider value={{ user, subscription, lang, setLang, loading, login, register, logout, upgrade, downgrade, isPremium, refreshSubscription: fetchSubscription }}>
      {children}
    </Ctx.Provider>
  );
}

export const useApp = () => useContext(Ctx);
