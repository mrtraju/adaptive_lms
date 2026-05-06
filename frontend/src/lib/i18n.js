export const LANGS = [
  { code: "en", label: "English", flag: "EN" },
  { code: "ms", label: "Bahasa Melayu", flag: "BM" },
  { code: "zh", label: "中文", flag: "ZH" },
];

export const T = {
  en: {
    appName: "Adaptive LMS",
    tagline: "A humanized AI tutor that teaches on your terms.",
    login: "Log in", register: "Register", logout: "Logout",
    email: "Email", password: "Password", name: "Full name", role: "Role",
    student: "Student", teacher: "Teacher", admin: "Admin", language: "Language",
    dashboard: "Dashboard", curriculum: "Curriculum", chooseTopic: "Choose a topic",
    choosePersonality: "Choose your tutor",
    personalities: { strict: "Strict Teacher", friendly: "Friendly Mentor", socratic: "Socratic Coach", motivational: "Motivational Coach" },
    startLesson: "Generate lesson", takeQuiz: "Take quiz", chatWithTutor: "Chat with tutor",
    send: "Send", typeMessage: "Type your question…",
    progress: "Progress", lessonsDone: "Lessons", quizzesDone: "Quizzes", avgScore: "Avg score", difficulty: "Level",
    students: "Students", newCurriculum: "Add new curriculum", title: "Title", subject: "Subject",
    level: "Level", description: "Description", objectives: "Learning objectives (comma separated)",
    add: "Add", delete: "Delete", submit: "Submit answers", score: "Score", tryAgain: "Try again",
    welcome: "Welcome back", keyPoints: "Key points", example: "Example", back: "Back",
    usage: "AI usage", totalUsers: "Total users", languages: "Languages",
    loading: "Generating…", emotion: "Mood", feelingNegative: "Needs help", feelingPositive: "Engaged", feelingNeutral: "Steady",
    download: "Download PDF", mic: "Voice", speaker: "Speak",
    intervention: "AI Intervention", risk: "Risk", summary: "Summary", recommendations: "Recommendations", nextTopics: "Next topics", close: "Close",
  },
  ms: {
    appName: "LMS Adaptif",
    tagline: "Tutor AI yang mengajar mengikut cara anda.",
    login: "Log masuk", register: "Daftar", logout: "Log keluar",
    email: "E-mel", password: "Kata laluan", name: "Nama penuh", role: "Peranan",
    student: "Pelajar", teacher: "Guru", admin: "Pentadbir", language: "Bahasa",
    dashboard: "Papan pemuka", curriculum: "Kurikulum", chooseTopic: "Pilih topik",
    choosePersonality: "Pilih tutor anda",
    personalities: { strict: "Guru Tegas", friendly: "Mentor Mesra", socratic: "Pembimbing Socratic", motivational: "Jurulatih Motivasi" },
    startLesson: "Jana pelajaran", takeQuiz: "Ambil kuiz", chatWithTutor: "Bual dengan tutor",
    send: "Hantar", typeMessage: "Taip soalan anda…",
    progress: "Kemajuan", lessonsDone: "Pelajaran", quizzesDone: "Kuiz", avgScore: "Purata markah", difficulty: "Tahap",
    students: "Pelajar", newCurriculum: "Tambah kurikulum baharu", title: "Tajuk", subject: "Subjek",
    level: "Tahap", description: "Keterangan", objectives: "Objektif pembelajaran (dipisahkan koma)",
    add: "Tambah", delete: "Padam", submit: "Hantar jawapan", score: "Markah", tryAgain: "Cuba lagi",
    welcome: "Selamat kembali", keyPoints: "Mata penting", example: "Contoh", back: "Kembali",
    usage: "Penggunaan AI", totalUsers: "Jumlah pengguna", languages: "Bahasa",
    loading: "Menjana…", emotion: "Mood", feelingNegative: "Perlu bantuan", feelingPositive: "Terlibat", feelingNeutral: "Stabil",
    download: "Muat turun PDF", mic: "Suara", speaker: "Bercakap",
    intervention: "Intervensi AI", risk: "Risiko", summary: "Ringkasan", recommendations: "Cadangan", nextTopics: "Topik seterusnya", close: "Tutup",
  },
  zh: {
    appName: "自适应学习系统",
    tagline: "一位人性化的 AI 导师，按你的节奏教学。",
    login: "登录", register: "注册", logout: "退出",
    email: "邮箱", password: "密码", name: "姓名", role: "角色",
    student: "学生", teacher: "教师", admin: "管理员", language: "语言",
    dashboard: "仪表板", curriculum: "课程", chooseTopic: "选择主题",
    choosePersonality: "选择你的导师",
    personalities: { strict: "严格老师", friendly: "友善导师", socratic: "苏格拉底教练", motivational: "激励教练" },
    startLesson: "生成课程", takeQuiz: "做测验", chatWithTutor: "与导师对话",
    send: "发送", typeMessage: "输入你的问题…",
    progress: "进度", lessonsDone: "课程", quizzesDone: "测验", avgScore: "平均分", difficulty: "难度",
    students: "学生", newCurriculum: "添加新课程", title: "标题", subject: "科目",
    level: "难度", description: "描述", objectives: "学习目标（逗号分隔）",
    add: "添加", delete: "删除", submit: "提交答案", score: "得分", tryAgain: "再试一次",
    welcome: "欢迎回来", keyPoints: "要点", example: "示例", back: "返回",
    usage: "AI 使用情况", totalUsers: "用户总数", languages: "语言",
    loading: "生成中…", emotion: "情绪", feelingNegative: "需要帮助", feelingPositive: "投入", feelingNeutral: "平稳",
    download: "下载 PDF", mic: "语音", speaker: "朗读",
    intervention: "AI 建议", risk: "风险", summary: "摘要", recommendations: "建议", nextTopics: "下一个主题", close: "关闭",
  },
};

export const t = (lang, key) => {
  const path = key.split(".");
  let cur = T[lang] || T.en;
  for (const p of path) cur = cur?.[p];
  return cur ?? key;
};
