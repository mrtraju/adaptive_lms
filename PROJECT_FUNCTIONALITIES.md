# Adaptive AI LMS - Project Functionalities

The **Adaptive Learning Management System (LMS)** is a comprehensive, AI-powered platform designed to provide personalized, multilingual, and emotionally intelligent learning experiences. The system uses a modular monolith architecture with a **FastAPI backend** and a **React frontend**, integrating **Groq API** (Llama-3 model) for its core AI tutoring capabilities.

---

## 1. Role-Based Architecture
The application supports three distinct user roles, each with specialized access and dashboards:

### 🧑‍🎓 Student Role
- **Student Dashboard:** View overall progress, average scores, and available curriculum topics.
- **Adaptive Lessons:** AI dynamically generates customized lesson content based on the student's proficiency level (beginner, intermediate, advanced) and chosen language.
- **AI Tutor Chat:** Interact with an AI tutor that features:
  - **Multiple Personalities:** Choose from Friendly, Strict, Socratic (Premium), and Motivational (Premium) teaching styles.
  - **Emotion Detection:** The tutor analyzes the student's message sentiment (positive, negative, neutral) and dynamically adjusts its tone and pacing (e.g., slowing down and reassuring if the student is frustrated).
- **Interactive Teaching Loop (Premium):** A live-teaching mode where the AI drives the lesson one concept at a time, asking checking questions, and reacting to the student's input like a real classroom teacher.
- **Bridge Mode (Premium):** Helps bilingual learners by providing explanations in a primary language and summarizing key concepts in a secondary language.
- **AI Quizzes:** Automatically generated, context-aware multiple-choice quizzes that adapt to the user's difficulty level. 
- **Subscription Management:** Free tier users have daily limits on AI generation. Premium users unlock unlimited generations, advanced AI personalities, and bridge mode.

### 👩‍🏫 Teacher Role
- **Teacher Dashboard:** A central hub to manage curriculum and monitor student performance.
- **Curriculum Management:** Create, edit, and delete curriculum topics, defining subjects, levels, and specific learning objectives that the AI strictly adheres to.
- **Student Analytics:** View a roster of students, their average scores, lessons completed, and current difficulty level.
- **AI Interventions (Premium):** Get AI-generated actionable advice on specific students based on their recent performance metrics, highlighting areas of risk and recommending the next topics to teach.

### 👨‍💻 Admin Role
- **Admin Dashboard:** High-level platform analytics and system monitoring.
- **Platform Analytics:** Real-time metrics on total users, student/teacher ratios, and curriculum count.
- **AI Usage Tracking:** Breakdown of AI usage across different features (chat, lesson generation, quizzes, interventions, etc.).
- **Demographics & Plans:** Analytics on the distribution of languages (English, Malay, Mandarin) and subscription plans (Free vs. Premium).

---

## 2. Core AI Capabilities (Powered by Groq / Llama-3)

- **Strict Curriculum Adherence:** AI generation is strictly bound by the objectives defined by teachers. If a student veers off-topic, the AI gently redirects them.
- **Multilingual Support:** The entire learning experience, including lessons, quizzes, and chat, supports English (`en`), Bahasa Melayu (`ms`), and Mandarin (`zh`).
- **Dynamic Difficulty Scaling:** As students submit quizzes, their average score dictates their difficulty level (beginner, intermediate, or advanced). The AI automatically adjusts its vocabulary, depth, and quiz questions based on this level.
- **Streaming Responses:** The AI tutor chat utilizes Server-Sent Events (SSE) to stream responses token-by-token for a fast, conversational feel.

---

## 3. Technical Functionalities

- **Authentication:** Secure JWT-based authentication with bcrypt password hashing.
- **Database:** Asynchronous MongoDB (Motor) integration handling `users`, `curriculum`, `lessons`, `quizzes`, `progress`, and `ai_usage` collections.
- **Short-Lived Streaming Tokens:** Enhances security for SSE endpoints by issuing 2-minute scoped tokens specifically for streaming AI responses.
- **In-Memory Caching:** Utilizes TTL caches (e.g., for Teacher Interventions) to reduce redundant AI API calls and improve performance.
- **Idempotent Seeding:** On startup, the backend automatically seeds default admin/teacher/student accounts and initial curriculum data if the database is empty.
- **Responsive UI:** The frontend is built with React, styled using Tailwind CSS, and utilizes Radix UI primitives for accessible, high-quality interactive components.
