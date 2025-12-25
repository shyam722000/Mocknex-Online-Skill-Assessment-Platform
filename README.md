# 📝 NOVIINDUS Online Exam Portal

A fully functional online examination system built using **Next.js (App Router)** and **Redux Toolkit**.  
Includes authentication, protected routes, live question status tracking, countdown timer, and secure restrictions on refresh/back navigation.

---

## 🚀 Features

### 👨‍🎓 Examination
- Live MCQ test interface
- Mark for Review / Answered / Not Answered status indicators
- Timer with auto countdown ⏱
- Comprehension paragraph view (modal)
- Restricts:
  - Page refresh (F5 / Ctrl+R)
  - Closing tab without confirmation
  - Back button navigation

### 🔐 Authentication
- Login & Signup pages (Email + Password)
- Protected Routes using AuthGuard

### 📊 Result System
- Score summary page after submission
- Auto calculate:
  - Correct Questions
  - Wrong Answers
  - Not Attended count

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **Next.js 13+ (App Router)** | Frontend UI + Routing |
| **Redux Toolkit** | Global State Management |
| **Tailwind CSS** | UI Styling |
| **Custom REST APIs** | Questions & Answer Submission |

---

## 📂 Project Structure

app/
├─ exam/
│ └─ page.tsx # Main exam UI
├─ login/
│ └─ page.tsx # Login screen
├─ signup/
│ └─ page.tsx # Signup screen
├─ result/
│ └─ page.tsx # Result screen
├─ protected/
│ └─ layout.tsx # AuthGuard wrapper
│
├─ Providers.tsx # Redux Provider
├─ layout.tsx # Global layout wrapper
├─ globals.css # Global Tailwind styles
│
store/
├─ store.ts # Redux store config
├─ examSlice.ts # Exam state logic (timer + answers)
└─ hooks.ts # Typed Redux hooks
│
lib/
└─ api.js # API helpers (re usable api functions)
│
components/
├─ Navbar.tsx
├─ AuthGuard.tsx
└─ HomeLayout.tsx