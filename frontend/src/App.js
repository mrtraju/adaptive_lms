import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AppProvider, useApp } from "@/context/AppContext";
import Navbar from "@/components/Navbar";
import Login from "@/pages/Login";
import StudentDashboard from "@/pages/StudentDashboard";
import Lesson from "@/pages/Lesson";
import TeacherDashboard from "@/pages/TeacherDashboard";
import AdminDashboard from "@/pages/AdminDashboard";
import Upgrade from "@/pages/Upgrade";
import ErrorBoundary from "@/components/ErrorBoundary";

function Protected({ children, roles }) {
  const { user, loading } = useApp();
  if (loading) return <div className="p-10 text-center">Loading…</div>;
  if (!user) return <Navigate to="/" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <ErrorBoundary>{children}</ErrorBoundary>;
}

function Shell() {
  const { user, loading } = useApp();
  if (loading) return <div className="p-10 text-center">Loading…</div>;
  return (
    <div className="App min-h-screen">
      <Navbar />
      <Routes>
        <Route path="/" element={user ? <Navigate to={`/${user.role}`} replace /> : <Login />} />
        <Route path="/student" element={<Protected roles={["student"]}><StudentDashboard /></Protected>} />
        <Route path="/lesson/:id" element={<Protected><Lesson /></Protected>} />
        <Route path="/teacher" element={<Protected roles={["teacher", "admin"]}><TeacherDashboard /></Protected>} />
        <Route path="/admin" element={<Protected roles={["admin"]}><AdminDashboard /></Protected>} />
        <Route path="/upgrade" element={<Protected><Upgrade /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Shell />
      </AppProvider>
    </BrowserRouter>
  );
}
