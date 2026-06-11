# Exam Prep Agent

AI-powered exam preparation for Mumbai University students.

## Stack
- **Frontend**: Next.js 15, React 19, TypeScript
- **AI Backend**: n8n multi-agent workflow (Groq/Llama + Google Gemini)
- **Deployment**: Vercel

## Setup

```bash
npm install
cp .env.local.example .env.local
# Add your n8n webhook URL to .env.local
npm run dev
```

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_N8N_WEBHOOK_URL` | Your n8n production webhook URL |

## n8n Workflow
The backend is a multi-agent n8n pipeline:
1. Query Classifier
2. PYQ Agent (Google Gemini)
3. Web Search Agent (Groq)
4. Social Media Agent (Groq)
5. Syllabus Agent (Groq)
6. Evidence Collector
7. Ranking Engine
8. Supervisor Agent (Groq)
9. Final Output

## Deploy
Push to GitHub → connect to Vercel → add environment variable → deploy.
