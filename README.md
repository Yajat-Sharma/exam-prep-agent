# 🚀 AI Exam Prep Agent

> **An intelligent multi-agent exam preparation platform that transforms scattered study material into a personalized, data-driven revision strategy.**

Instead of blindly studying every chapter, students receive **AI-generated topic rankings, predicted exam questions, optimized study plans, revision roadmaps, and exam-winning insights** in seconds.

---

## 🌟 Why I Built This

Most students waste valuable time deciding **what to study** instead of actually studying.

This project solves that problem by combining multiple AI agents that independently analyze:

* 📚 Syllabus weightage
* 📝 Previous Year Questions (PYQs)
* 🌐 Web research
* 👥 Student discussions and trends

The results are fused into a single intelligent report that helps students focus on the topics most likely to maximize their exam score.

---

## ✨ Key Features

* 🤖 Multi-agent AI architecture
* 📊 Smart topic prioritization based on evidence
* 🎯 Predicted theory and numerical questions
* 📚 Personalized revision strategy
* ⏳ Time-based study plans (24 hours, 3 days, etc.)
* 🧠 Answer-writing guidance and examiner tips
* ⚠️ "Do Not Skip" and "Safe to Skip" recommendations
* 📈 Marks optimization strategy for different target scores
* 📱 Responsive modern UI with a clean learning experience
* ⚡ Real-time integration with an n8n automation workflow

---

## 🏗️ System Architecture

```text
                User Input
                     │
                     ▼
          ┌────────────────────┐
          │   Next.js Frontend │
          └────────────────────┘
                     │
                     ▼
            n8n Multi-Agent Engine
                     │
 ┌─────────────┬──────────────┬──────────────┬─────────────┐
 │             │              │              │             │
 ▼             ▼              ▼              ▼             ▼
Syllabus     PYQ          Web Research   Student Data   AI Ranking
 Agent       Agent           Agent          Agent         Engine
 │             │              │              │             │
 └─────────────┴──────────────┴──────────────┴─────────────┘
                     │
                     ▼
           Supervisor Intelligence
                     │
                     ▼
      Comprehensive Exam Preparation Report
```

---

## 🛠️ Tech Stack

### Frontend

* ⚛️ Next.js 15
* ⚛️ React 19
* 🟦 TypeScript

### AI & Automation

* 🔄 n8n Multi-Agent Workflow
* 🦙 Groq / Llama Models
* 💎 Google Gemini

### Deployment

* ▲ Vercel

---

## 📋 AI Workflow

The backend coordinates multiple specialized agents:

1. Query Classifier
2. PYQ Intelligence Agent
3. Web Research Agent
4. Student Discussion Agent
5. Syllabus Intelligence Agent
6. Evidence Collection Layer
7. Topic Ranking Engine
8. Supervisor Intelligence Agent
9. Final Report Generator

Each agent contributes unique signals before the Supervisor produces the final recommendations.

---

## 🚀 Local Setup

```bash
npm install

# Create your environment file
cp .env.local.example .env.local

# Add your webhook URL
NEXT_PUBLIC_N8N_WEBHOOK_URL=<your-n8n-webhook>

# Start development server
npm run dev
```

---

## 🔐 Environment Variables

| Variable                      | Description                             |
| ----------------------------- | --------------------------------------- |
| `NEXT_PUBLIC_N8N_WEBHOOK_URL` | Public n8n webhook used by the frontend |

---

## 🎯 Sample Output

For a subject like **Operating Systems**, the platform can generate:

* ✅ Ranked high-priority topics
* ✅ Predicted long-answer questions
* ✅ Revision timelines
* ✅ Marks optimization strategies
* ✅ Answer-writing guidance
* ✅ High-risk and low-priority areas
* ✅ Best units to master for maximum returns

---

## 💡 Future Roadmap

* 📄 PDF export for revision reports
* 🎙️ AI-powered viva preparation
* 📊 Analytics dashboard
* 🧩 Adaptive quizzes and mock tests
* 🏆 Personalized performance tracking
* 🌍 Support for additional universities and curricula

---

## 👨‍💻 Author

Built with a focus on solving a real student problem by combining modern frontend engineering, workflow automation, and multi-agent AI reasoning into a practical educational tool.

⭐ If you found this project interesting, consider giving it a star!
