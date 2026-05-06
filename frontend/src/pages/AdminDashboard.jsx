import React, { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { api } from "../lib/api";
import { T } from "../lib/i18n";
import {
  Users, BookOpen, Bot, Globe2,
  Pencil, Trash2, X, Save, ShieldCheck, Eye, EyeOff,
  GraduationCap, Tag, CalendarDays, FlaskConical,
} from "lucide-react";

/* ── tiny helpers ─────────────────────────────────────────── */
const ROLE_COLORS = {
  admin:   "bg-[#EDE7F6] text-[#6200EA]",
  teacher: "bg-[#E8F5E9] text-[#2E7D32]",
  student: "bg-[#FFF9C4] text-[#F57F17]",
};
const PLAN_COLORS = {
  premium: "bg-[#FFF3E0] text-[#E65100]",
  free:    "bg-[#F5F5F5] text-[#757575]",
};

/* ── Edit modal ───────────────────────────────────────────── */
function EditUserModal({ target, onClose, onSaved, currentUserId }) {
  const [form, setForm] = useState({
    name:     target.name,
    email:    target.email,
    role:     target.role,
    language: target.language,
    plan:     target.plan || "free",
    password: "",
  });
  const [showPw, setShowPw]   = useState(false);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        name:     form.name.trim(),
        email:    form.email.trim(),
        role:     form.role,
        language: form.language,
        plan:     form.plan,
      };
      if (form.password) payload.password = form.password;
      const { data } = await api.put(`/admin/users/${target.id}`, payload);
      onSaved(data);
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to update user.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="brutal rounded-2xl bg-white w-full max-w-md mx-4 p-6 relative"
        style={{ animation: "slideUp .25s ease" }}
      >
        {/* header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[10px] uppercase tracking-[.3em] font-black text-[#9D4EDD]">Edit user</p>
            <h2 className="text-xl font-black">{target.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#F5F5F5] transition"
            id="close-edit-modal"
          >
            <X size={16} />
          </button>
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 bg-[#FFEBEE] border-2 border-[#EF9A9A] rounded-xl text-sm font-bold text-[#C62828]">
            {error}
          </div>
        )}

        <form onSubmit={save} className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-[10px] uppercase tracking-widest font-black text-[#4A4A4A] block mb-1">Full name</label>
            <input
              id="edit-name"
              value={form.name}
              onChange={set("name")}
              required
              className="w-full border-2 border-[#121212] rounded-xl px-3 py-2 font-semibold text-sm focus:outline-none focus:border-[#9D4EDD] transition"
            />
          </div>

          {/* Email */}
          <div>
            <label className="text-[10px] uppercase tracking-widest font-black text-[#4A4A4A] block mb-1">Email</label>
            <input
              id="edit-email"
              type="email"
              value={form.email}
              onChange={set("email")}
              required
              className="w-full border-2 border-[#121212] rounded-xl px-3 py-2 font-semibold text-sm focus:outline-none focus:border-[#9D4EDD] transition"
            />
          </div>

          {/* Role + Language row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-widest font-black text-[#4A4A4A] block mb-1">Role</label>
              <select
                id="edit-role"
                value={form.role}
                onChange={set("role")}
                className="w-full border-2 border-[#121212] rounded-xl px-3 py-2 font-semibold text-sm focus:outline-none focus:border-[#9D4EDD] transition bg-white"
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest font-black text-[#4A4A4A] block mb-1">Language</label>
              <select
                id="edit-language"
                value={form.language}
                onChange={set("language")}
                className="w-full border-2 border-[#121212] rounded-xl px-3 py-2 font-semibold text-sm focus:outline-none focus:border-[#9D4EDD] transition bg-white"
              >
                <option value="en">English</option>
                <option value="ms">Bahasa Melayu</option>
                <option value="zh">中文</option>
              </select>
            </div>
          </div>

          {/* Plan */}
          <div>
            <label className="text-[10px] uppercase tracking-widest font-black text-[#4A4A4A] block mb-1">Plan</label>
            <div className="flex gap-2">
              {["free", "premium"].map((p) => (
                <button
                  key={p}
                  type="button"
                  id={`edit-plan-${p}`}
                  onClick={() => setForm((f) => ({ ...f, plan: p }))}
                  className={`flex-1 py-2 rounded-xl border-2 font-black text-xs uppercase transition
                    ${form.plan === p
                      ? "border-[#9D4EDD] bg-[#9D4EDD] text-white"
                      : "border-[#E0E0E0] text-[#4A4A4A] hover:border-[#9D4EDD]"}`}
                >
                  {p === "premium" && <ShieldCheck size={12} className="inline mr-1" />}
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* New password (optional) */}
          <div>
            <label className="text-[10px] uppercase tracking-widest font-black text-[#4A4A4A] block mb-1">
              New password <span className="normal-case font-normal text-[#9E9E9E]">(leave blank to keep)</span>
            </label>
            <div className="relative">
              <input
                id="edit-password"
                type={showPw ? "text" : "password"}
                value={form.password}
                onChange={set("password")}
                placeholder="••••••••"
                className="w-full border-2 border-[#121212] rounded-xl px-3 py-2 pr-10 font-semibold text-sm focus:outline-none focus:border-[#9D4EDD] transition"
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9E9E9E] hover:text-[#121212]"
              >
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border-2 border-[#E0E0E0] font-black text-sm hover:border-[#121212] transition"
            >
              Cancel
            </button>
            <button
              id="save-user-btn"
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-[#9D4EDD] text-white font-black text-sm flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-60"
            >
              <Save size={14} />
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>

      <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}

/* ── Delete confirmation ──────────────────────────────────── */
function DeleteConfirm({ target, onClose, onDeleted }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError]       = useState("");

  async function confirm() {
    setDeleting(true);
    setError("");
    try {
      await api.delete(`/admin/users/${target.id}`);
      onDeleted(target.id);
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to delete user.");
      setDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
    >
      <div className="brutal rounded-2xl bg-white w-full max-w-sm mx-4 p-6" style={{ animation: "slideUp .2s ease" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-[#FFEBEE] flex items-center justify-center">
            <Trash2 size={18} className="text-[#EF5350]" />
          </div>
          <div>
            <p className="font-black text-base">Delete user?</p>
            <p className="text-xs text-[#9E9E9E]">This action cannot be undone.</p>
          </div>
        </div>

        <div className="rounded-xl bg-[#FAFAFA] border-2 border-[#E0E0E0] px-4 py-3 mb-4">
          <p className="font-black text-sm">{target.name}</p>
          <p className="text-xs text-[#9E9E9E]">{target.email}</p>
        </div>

        {error && (
          <p className="mb-3 text-xs font-bold text-[#C62828] bg-[#FFEBEE] px-3 py-2 rounded-xl">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            id="cancel-delete-btn"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border-2 border-[#E0E0E0] font-black text-sm hover:border-[#121212] transition"
          >
            Cancel
          </button>
          <button
            id="confirm-delete-btn"
            onClick={confirm}
            disabled={deleting}
            className="flex-1 py-2.5 rounded-xl bg-[#EF5350] text-white font-black text-sm flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-60"
          >
            <Trash2 size={14} />
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
      <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}

/* ── Main dashboard ───────────────────────────────────────── */
export default function AdminDashboard() {
  const { user, lang } = useApp();
  const tr = T[lang] || T.en;
  const [data, setData]           = useState(null);
  const [users, setUsers]         = useState([]);
  const [curriculum, setCurriculum] = useState([]);
  const [editing, setEditing]     = useState(null);   // user object being edited
  const [deleting, setDeleting]   = useState(null); // user object to delete
  const [toast, setToast]         = useState("");

  useEffect(() => {
    api.get("/admin/analytics").then((r) => setData(r.data));
    api.get("/admin/users").then((r) => setUsers(r.data));
    api.get("/curriculum").then((r) => setCurriculum(r.data));
  }, []);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2800);
  }

  function handleSaved(updated) {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    // Refresh analytics to reflect any role/plan changes
    api.get("/admin/analytics").then((r) => setData(r.data));
    setEditing(null);
    showToast("User updated successfully ✓");
  }

  function handleDeleted(uid) {
    setUsers((prev) => prev.filter((u) => u.id !== uid));
    api.get("/admin/analytics").then((r) => setData(r.data));
    setDeleting(null);
    showToast("User deleted ✓");
  }

  if (!data) return <div className="p-10 text-center">Loading…</div>;

  const stats = [
    { label: tr.totalUsers,  val: data.users,           icon: Users,    bg: "#F4F0FF" },
    { label: tr.curriculum,  val: data.curriculum,       icon: BookOpen, bg: "#E8F5E9" },
    { label: tr.usage,       val: data.ai_usage_total,   icon: Bot,      bg: "#FFF9C4" },
    { label: tr.languages,   val: Object.keys(data.language_distribution).length, icon: Globe2, bg: "#FFEBE6" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-10">
      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-6 right-6 z-50 px-5 py-3 brutal rounded-2xl bg-[#1B1B1B] text-white font-bold text-sm shadow-2xl"
          style={{ animation: "slideUp .25s ease" }}
        >
          {toast}
        </div>
      )}

      <p className="text-xs uppercase tracking-[0.3em] font-black text-[#FF6B6B]">{tr.welcome}</p>
      <h1 className="text-4xl md:text-5xl font-black tracking-tight mt-2 mb-10" style={{ fontFamily: "Outfit" }}>
        {user?.name}{" "}
        <span className="inline-block px-3 py-1 bg-[#9D4EDD] text-white brutal-sm rounded-xl text-2xl align-middle ml-2">
          {tr.admin}
        </span>
      </h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {stats.map((s, i) => (
          <div key={i} className="brutal rounded-2xl p-5" style={{ background: s.bg }} data-testid={`admin-stat-${i}`}>
            <s.icon className="w-6 h-6 mb-2" strokeWidth={2.5} />
            <div className="text-4xl font-black">{s.val}</div>
            <div className="text-xs uppercase font-bold mt-1 tracking-widest">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-2 gap-6 mb-10">
        <div className="brutal rounded-2xl bg-white p-6" data-testid="ai-breakdown">
          <h2 className="text-xl font-black mb-4">{tr.usage}</h2>
          <div className="space-y-3">
            {Object.entries(data.ai_by_kind).map(([k, v]) => {
              const max = Math.max(...Object.values(data.ai_by_kind), 1);
              return (
                <div key={k}>
                  <div className="flex justify-between text-sm font-bold mb-1">
                    <span className="uppercase tracking-widest text-xs">{k}</span>
                    <span>{v}</span>
                  </div>
                  <div className="h-5 bg-[#FAFAFA] brutal-sm rounded-full overflow-hidden">
                    <div className="h-full bg-[#FF6B6B] transition-all duration-700" style={{ width: `${(v / max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="brutal rounded-2xl bg-white p-6" data-testid="lang-dist">
          <h2 className="text-xl font-black mb-4">{tr.languages}</h2>
          <div className="space-y-3">
            {Object.entries(data.language_distribution).map(([k, v]) => {
              const max = Math.max(...Object.values(data.language_distribution), 1);
              const color = k === "en" ? "#4ECDC4" : k === "ms" ? "#FFE66D" : "#9D4EDD";
              return (
                <div key={k}>
                  <div className="flex justify-between text-sm font-bold mb-1">
                    <span className="uppercase tracking-widest text-xs">{k}</span>
                    <span>{v}</span>
                  </div>
                  <div className="h-5 bg-[#FAFAFA] brutal-sm rounded-full overflow-hidden">
                    <div className="h-full transition-all duration-700" style={{ width: `${(v / max) * 100}%`, background: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Users table */}
      <div className="brutal rounded-2xl bg-white p-6" data-testid="admin-users">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-black">All users ({users.length})</h2>
          <p className="text-xs text-[#9E9E9E] font-semibold">Click ✏️ to edit · 🗑️ to delete</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-[#121212]">
                {["Name", "Email", "Role", "Plan", "Language", "Actions"].map((h) => (
                  <th key={h} className="text-left py-2 px-2 font-black uppercase text-[10px] tracking-widest">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-[#F0F0F0] hover:bg-[#FAFAFA] transition"
                >
                  <td className="py-2.5 px-2 font-bold">{u.name}</td>
                  <td className="py-2.5 px-2 text-[#4A4A4A] text-xs">{u.email}</td>
                  <td className="py-2.5 px-2">
                    <span className={`px-2 py-0.5 rounded-full brutal-sm text-[10px] font-black uppercase ${ROLE_COLORS[u.role] || ""}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-2.5 px-2">
                    <span className={`px-2 py-0.5 rounded-full brutal-sm text-[10px] font-black uppercase ${PLAN_COLORS[u.plan] || PLAN_COLORS.free}`}>
                      {u.plan || "free"}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 uppercase text-xs font-semibold">{u.language}</td>
                  <td className="py-2.5 px-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        id={`edit-user-${u.id}`}
                        onClick={() => setEditing(u)}
                        title="Edit user"
                        className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#EDE7F6] text-[#6200EA] hover:bg-[#D1C4E9] transition"
                      >
                        <Pencil size={13} />
                      </button>
                      {u.id !== user?.id && (
                        <button
                          id={`delete-user-${u.id}`}
                          onClick={() => setDeleting(u)}
                          title="Delete user"
                          className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#FFEBEE] text-[#EF5350] hover:bg-[#FFCDD2] transition"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Curriculum section */}
      <div className="brutal rounded-2xl bg-white p-6 mt-6" data-testid="admin-curriculum">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-black">Active Curriculum</h2>
            <p className="text-xs text-[#9E9E9E] font-semibold mt-0.5">{curriculum.length} module{curriculum.length !== 1 ? "s" : ""} in the system</p>
          </div>
          <BookOpen className="w-6 h-6 text-[#2E7D32]" strokeWidth={2.5} />
        </div>

        {curriculum.length === 0 ? (
          <div className="text-center py-10 text-[#BDBDBD]">
            <BookOpen size={36} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm font-semibold">No curriculum added yet</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {curriculum.map((c) => {
              const creator = users.find((u) => u.id === c.created_by);
              const LEVEL_STYLE = {
                beginner:     { bg: "#E8F5E9", color: "#2E7D32" },
                intermediate: { bg: "#FFF9C4", color: "#F57F17" },
                advanced:     { bg: "#FFEBE6", color: "#C62828" },
              };
              const lvl = LEVEL_STYLE[c.level] || LEVEL_STYLE.beginner;
              return (
                <div
                  key={c.id}
                  className="brutal-sm rounded-2xl border-2 border-[#E0E0E0] p-4 flex flex-col gap-3 hover:border-[#9D4EDD] transition"
                >
                  {/* Title + subject */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-black text-base leading-tight">{c.title}</h3>
                      <span
                        className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black uppercase border-2"
                        style={{ background: lvl.bg, color: lvl.color, borderColor: lvl.color + "44" }}
                      >
                        {c.level}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <FlaskConical size={12} className="text-[#9E9E9E]" />
                      <span className="text-xs font-semibold text-[#4A4A4A]">{c.subject}</span>
                    </div>
                  </div>

                  {/* Description */}
                  {c.description && (
                    <p className="text-xs text-[#6B6B6B] leading-relaxed line-clamp-2">{c.description}</p>
                  )}

                  {/* Objectives */}
                  {c.objectives?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {c.objectives.slice(0, 3).map((obj, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F4F0FF] text-[#6200EA] text-[10px] font-bold"
                        >
                          <Tag size={9} />{obj}
                        </span>
                      ))}
                      {c.objectives.length > 3 && (
                        <span className="px-2 py-0.5 rounded-full bg-[#F5F5F5] text-[#9E9E9E] text-[10px] font-bold">
                          +{c.objectives.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Footer: creator + date */}
                  <div className="flex items-center justify-between mt-auto pt-2 border-t border-[#F0F0F0]">
                    <div className="flex items-center gap-1.5">
                      <GraduationCap size={12} className="text-[#9E9E9E]" />
                      <span className="text-[10px] font-semibold text-[#9E9E9E]">
                        {creator ? creator.name : "System"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CalendarDays size={11} className="text-[#BDBDBD]" />
                      <span className="text-[10px] text-[#BDBDBD] font-semibold">
                        {c.created ? new Date(c.created).toLocaleDateString() : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      {editing && (
        <EditUserModal
          target={editing}
          currentUserId={user?.id}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}
      {deleting && (
        <DeleteConfirm
          target={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}
