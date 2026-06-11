import { useState, useRef, useEffect, useCallback } from "react";

const N8N_WEBHOOK_URL = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || "";
const TIME_OPTIONS = ["8 hours", "1 day", "2 days", "3 days", "1 week"];
const STEPS = ["Query classifier","PYQ analysis","Web search","Syllabus map","Supervisor","Ranking"];

// ─── Types ──────────────────────────────────────────────────────────────────

type Topic = { name: string; why?: string; confidence?: number } | string;
type Question = {
  question?: string; text?: string; type?: string; question_type?: string;
  marks?: number; confidence?: number; answer_outline?: string[];
  common_mistakes?: string[]; topic?: string; expected_diagrams?: string[];
  evidence_sources?: string[];
} | string;
type PlanItem = {
  time?: string; hour?: string; slot?: string; task?: string; topic?: string;
  activity?: string; detail?: string; description?: string; objective?: string;
  hours?: string | number; deliverable?: string;
} | string;
type VivaItem = { question?: string; text?: string } | string;

interface TopicRanking {
  rank: number; topic: string; final_confidence: number;
  agreement_score: string; why_it_matters: string; evidence_sources?: string[];
}
interface StudyStrategy { topics: string[]; expected_marks: string; study_hours: string; }
interface RevisionPlanItem { topic?: string; hours?: string | number; objective?: string; deliverable?: string; }
interface AnswerIntelligence {
  topic: string; ideal_structure: string[]; must_draw_diagrams: string[];
  key_definitions: string[]; examiner_expectations: string[]; common_mistakes: string[];
}
interface AgentResult {
  important_topics?: Topic[]; topics?: Topic[];
  predicted_questions?: Question[]; questions?: Question[]; frequently_asked?: Question[];
  study_plan?: PlanItem[]; schedule?: PlanItem[]; plan?: PlanItem[];
  revision_notes?: string; notes?: string; summary?: string;
  viva_questions?: VivaItem[]; viva?: VivaItem[];
  topic_rankings?: TopicRanking[];
  top_predictions?: Array<{ rank:number; topic:string; confidence:number; question:string; marks:number; type:string; evidence:string[]; why:string; preparation_strategy:string; }>;
  marks_optimization?: { topics_for_40_percent:string[]; topics_for_50_percent:string[]; topics_for_60_percent:string[]; topics_for_75_percent:string[]; topics_for_90_percent:string[]; };
  priority_matrix?: { high_impact_low_effort:string[]; high_impact_high_effort:string[]; low_impact_low_effort:string[]; low_impact_high_effort:string[]; };
  study_strategies?: { pass_strategy:StudyStrategy; first_class_strategy:StudyStrategy; distinction_strategy:StudyStrategy; topper_strategy:StudyStrategy; };
  revision_plans?: { "24_hours":RevisionPlanItem[]; "3_days":RevisionPlanItem[]; "7_days":RevisionPlanItem[]; "15_days":RevisionPlanItem[]; };
  answer_writing_intelligence?: AnswerIntelligence[];
  risk_analysis?: { hidden_high_importance_topics:string[]; overhyped_topics:string[]; underestimated_topics:string[]; high_failure_risk_topics:string[]; };
  do_not_skip?: string[]; safe_to_skip?: string[];
  exam_forecast?: { most_important_unit:string; most_important_topic:string; most_likely_numerical:string; most_likely_theory:string; most_likely_long_question:string; most_likely_diagram:string; expected_difficulty:string; forecast_confidence:number; };
  final_verdict?: { single_best_topic_to_master:string; best_unit_for_maximum_marks:string; highest_return_topic:string; most_predictable_question:string; minimum_preparation_for_pass:string; recommended_strategy:string; };
  confidence_summary?: { overall_confidence:number; agreement_level:string; sources_considered:number; strongest_signal:string; };
}

type ViewKey = "home" | "topics" | "questions" | "strategy" | "plan" | "answer" | "risk" | "forecast";

// ─── Helpers ────────────────────────────────────────────────────────────────

function confidenceColor(c: number) {
  if (c >= 80) return "#22C55E";
  if (c >= 60) return "#FF9500";
  if (c >= 40) return "#F59E0B";
  return "#EF4444";
}

function difficultyLabel(type: string) {
  const t = type?.toLowerCase() || "";
  if (t.includes("numerical")) return { label: "Numerical", color: "#3B82F6" };
  if (t.includes("long")) return { label: "Long Answer", color: "#A78BFA" };
  if (t.includes("theory")) return { label: "Theory", color: "#FF9500" };
  if (t.includes("diagram")) return { label: "Diagram", color: "#22C55E" };
  if (t.includes("short")) return { label: "Short Answer", color: "#8A9BBE" };
  return { label: type || "Theory", color: "#FF9500" };
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div style={{ background:"var(--navy3)", borderRadius:16, padding:"1.5rem", marginBottom:12, overflow:"hidden", position:"relative" }}>
      <div style={{ height:16, width:"60%", borderRadius:8, background:"linear-gradient(90deg,var(--navy4) 25%,var(--navy2) 50%,var(--navy4) 75%)", backgroundSize:"200% 100%", animation:"shimmer 1.5s infinite" }} />
      <div style={{ height:12, width:"40%", borderRadius:8, marginTop:10, background:"linear-gradient(90deg,var(--navy4) 25%,var(--navy2) 50%,var(--navy4) 75%)", backgroundSize:"200% 100%", animation:"shimmer 1.5s infinite 0.2s" }} />
      <div style={{ height:12, width:"80%", borderRadius:8, marginTop:8, background:"linear-gradient(90deg,var(--navy4) 25%,var(--navy2) 50%,var(--navy4) 75%)", backgroundSize:"200% 100%", animation:"shimmer 1.5s infinite 0.4s" }} />
    </div>
  );
}

function NavItem({ icon, label, active, onClick, hasData }: { icon:string; label:string; active:boolean; onClick:()=>void; hasData:boolean; }) {
  return (
    <button onClick={onClick} style={{
      display:"flex", alignItems:"center", gap:10, width:"100%",
      padding:"10px 14px", borderRadius:10, border:"none",
      background: active ? "rgba(255,149,0,0.15)" : "transparent",
      color: active ? "var(--saffron)" : hasData ? "var(--cream)" : "var(--slate2)",
      fontSize:14, fontWeight: active ? 600 : 400,
      transition:"all 0.15s", cursor: hasData ? "pointer" : "default",
      borderLeft: active ? "2px solid var(--saffron)" : "2px solid transparent",
    }}>
      <span style={{ fontSize:16, width:20, textAlign:"center" }}>{icon}</span>
      <span>{label}</span>
      {!hasData && <span style={{ marginLeft:"auto", fontSize:10, color:"var(--slate2)", background:"var(--navy3)", padding:"2px 6px", borderRadius:4 }}>LOCKED</span>}
    </button>
  );
}

function SectionHeader({ icon, title, subtitle, badge }: { icon:string; title:string; subtitle?:string; badge?:string }) {
  return (
    <div style={{ marginBottom:"2rem", animation:"fadeUp 0.4s ease" }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:6 }}>
        <span style={{ fontSize:28 }}>{icon}</span>
        <div>
          <h1 style={{ fontSize:24, fontWeight:700, color:"var(--cream)", margin:0 }}>{title}</h1>
          {subtitle && <p style={{ fontSize:14, color:"var(--slate)", margin:0, marginTop:2 }}>{subtitle}</p>}
        </div>
        {badge && <span style={{ marginLeft:"auto", background:"rgba(255,149,0,0.15)", color:"var(--saffron)", fontSize:12, fontWeight:600, padding:"4px 12px", borderRadius:20, border:"1px solid rgba(255,149,0,0.3)" }}>{badge}</span>}
      </div>
      <div style={{ height:1, background:"linear-gradient(90deg,var(--saffron),transparent)", marginTop:8, opacity:0.4 }} />
    </div>
  );
}

function QuestionCard({ q, index, subject }: { q: Question; index: number; subject: string }) {
  const [expanded, setExpanded] = useState(false);
  const text = typeof q === "string" ? q : (q.question || q.text || "");
  const type = typeof q === "object" ? (q.question_type || q.type || "theory") : "theory";
  const marks = typeof q === "object" ? (q.marks || 0) : 0;
  const conf = typeof q === "object" ? (q.confidence || 0) : 0;
  const outline = typeof q === "object" ? (q.answer_outline || []) : [];
  const mistakes = typeof q === "object" ? (q.common_mistakes || []) : [];
  const diagrams = typeof q === "object" ? (q.expected_diagrams || []) : [];
  const topic = typeof q === "object" ? (q.topic || subject) : subject;
  const { label: typeLabel, color: typeColor } = difficultyLabel(type);
  const cColor = confidenceColor(conf);

  const copyToClipboard = () => {
    const content = `Q${index+1}: ${text}\n\nAnswer Outline:\n${outline.map((o,i)=>`${i+1}. ${o}`).join('\n')}\n\nCommon Mistakes:\n${mistakes.map(m=>`• ${m}`).join('\n')}`;
    navigator.clipboard?.writeText(content);
  };

  return (
    <div style={{
      background:"var(--navy2)", border:"1px solid rgba(255,255,255,0.06)",
      borderRadius:16, overflow:"hidden", marginBottom:16,
      animation:`fadeUp 0.4s ease ${index * 0.05}s both`,
      transition:"border-color 0.2s, transform 0.2s",
    }}
    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,149,0,0.3)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)"; }}
    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.06)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}
    >
      {/* Card header */}
      <div style={{ padding:"1.25rem 1.5rem", display:"flex", gap:16, alignItems:"flex-start" }}>
        {/* Confidence mercury bar */}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4, flexShrink:0 }}>
          <div style={{ width:4, height:80, background:"var(--navy4)", borderRadius:2, overflow:"hidden", position:"relative" }}>
            <div style={{
              position:"absolute", bottom:0, width:"100%",
              height:`${conf}%`, background:cColor, borderRadius:2,
              transition:"height 1s ease 0.3s",
            }} />
          </div>
          <span style={{ fontSize:10, color:cColor, fontWeight:700 }}>{conf}%</span>
        </div>

        {/* Content */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:10 }}>
            <span style={{ fontSize:11, fontWeight:700, color:"var(--slate)", background:"var(--navy3)", padding:"2px 8px", borderRadius:4 }}>Q{index+1}</span>
            <span style={{ fontSize:11, fontWeight:600, color:typeColor, background:`${typeColor}18`, padding:"2px 8px", borderRadius:4, border:`1px solid ${typeColor}30` }}>{typeLabel}</span>
            {marks > 0 && <span style={{ fontSize:11, fontWeight:600, color:"var(--saffron)", background:"rgba(255,149,0,0.1)", padding:"2px 8px", borderRadius:4 }}>{marks} Marks</span>}
            {topic && <span style={{ fontSize:11, color:"var(--slate)", background:"var(--navy3)", padding:"2px 8px", borderRadius:4 }}>{topic}</span>}
          </div>
          <p style={{ fontSize:15, fontWeight:500, color:"var(--cream)", lineHeight:1.65, fontFamily:"Georgia, serif", margin:0 }}>{text}</p>
        </div>

        {/* Actions */}
        <div style={{ display:"flex", gap:6, flexShrink:0 }}>
          <button onClick={copyToClipboard} title="Copy question" style={{ width:32, height:32, borderRadius:8, border:"1px solid rgba(255,255,255,0.1)", background:"transparent", color:"var(--slate)", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center" }}>⎘</button>
          <button onClick={() => setExpanded(e => !e)} style={{
            width:32, height:32, borderRadius:8, border:"1px solid rgba(255,255,255,0.1)",
            background: expanded ? "rgba(255,149,0,0.15)" : "transparent",
            color: expanded ? "var(--saffron)" : "var(--slate)", fontSize:14,
            display:"flex", alignItems:"center", justifyContent:"center",
            transition:"all 0.15s",
          }}>
            {expanded ? "▲" : "▼"}
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ borderTop:"1px solid rgba(255,255,255,0.06)", animation:"fadeIn 0.25s ease" }}>
          {outline.length > 0 && (
            <div style={{ padding:"1.25rem 1.5rem", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ fontSize:11, fontWeight:700, color:"var(--saffron)", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:12 }}>📝 Answer Outline</div>
              <ol style={{ paddingLeft:0, listStyle:"none", display:"flex", flexDirection:"column", gap:8 }}>
                {outline.map((o, i) => (
                  <li key={i} style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                    <span style={{ flexShrink:0, width:22, height:22, borderRadius:"50%", background:"rgba(255,149,0,0.15)", color:"var(--saffron)", fontSize:11, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>{i+1}</span>
                    <span style={{ fontSize:14, color:"var(--cream2)", lineHeight:1.6 }}>{o}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {diagrams.length > 0 && (
            <div style={{ padding:"1rem 1.5rem", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#22C55E", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:10 }}>📐 Draw These Diagrams</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                {diagrams.map((d, i) => (
                  <span key={i} style={{ fontSize:13, color:"#22C55E", background:"rgba(34,197,94,0.1)", border:"1px solid rgba(34,197,94,0.25)", padding:"4px 12px", borderRadius:6 }}>📊 {d}</span>
                ))}
              </div>
            </div>
          )}

          {mistakes.length > 0 && (
            <div style={{ padding:"1rem 1.5rem" }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#EF4444", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:10 }}>⚠ Common Mistakes to Avoid</div>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {mistakes.map((m, i) => (
                  <div key={i} style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
                    <span style={{ color:"#EF4444", flexShrink:0, marginTop:2 }}>✗</span>
                    <span style={{ fontSize:13, color:"var(--cream2)", lineHeight:1.6 }}>{m}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TopicCard({ t, index }: { t: Topic; index: number }) {
  const name = typeof t === "string" ? t : (t.name || "");
  const why = typeof t === "object" ? (t.why || "") : "";
  const conf = typeof t === "object" ? (t.confidence || 0) : 0;
  const cColor = confidenceColor(conf);
  const isTop3 = index < 3;

  return (
    <div style={{
      background: isTop3 ? "linear-gradient(135deg,var(--navy2),rgba(255,149,0,0.05))" : "var(--navy2)",
      border: isTop3 ? "1px solid rgba(255,149,0,0.25)" : "1px solid rgba(255,255,255,0.06)",
      borderRadius:14, padding:"1.25rem",
      animation:`fadeUp 0.4s ease ${index * 0.04}s both`,
      position:"relative", overflow:"hidden",
    }}>
      {isTop3 && <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,var(--saffron),transparent)` }} />}
      <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
        <div style={{
          width:32, height:32, borderRadius:"50%", flexShrink:0,
          background: index === 0 ? "rgba(255,149,0,0.2)" : index === 1 ? "rgba(255,255,255,0.08)" : index === 2 ? "rgba(184,115,51,0.2)" : "var(--navy3)",
          color: index === 0 ? "var(--saffron)" : index === 1 ? "var(--cream2)" : index === 2 ? "#CD7F32" : "var(--slate)",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:13, fontWeight:700,
        }}>{index + 1}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:15, fontWeight:600, color:"var(--cream)", marginBottom:4 }}>{name}</div>
          {why && <div style={{ fontSize:13, color:"var(--slate)", lineHeight:1.5 }}>{why}</div>}
          {conf > 0 && (
            <div style={{ marginTop:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <span style={{ fontSize:11, color:"var(--slate2)" }}>Exam probability</span>
                <span style={{ fontSize:11, fontWeight:700, color:cColor }}>{conf}%</span>
              </div>
              <div style={{ height:4, background:"var(--navy4)", borderRadius:2, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${conf}%`, background:cColor, borderRadius:2, transition:"width 1s ease" }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ExamAgent() {
  const [subject, setSubject] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(-1);
  const [doneSteps, setDoneSteps] = useState<number[]>([]);
  const [loadingLabel, setLoadingLabel] = useState("Analyzing subject...");
  const [result, setResult] = useState<AgentResult | null>(null);
  const [error, setError] = useState("");
  const [activeView, setActiveView] = useState<ViewKey>("home");
  const [searchQ, setSearchQ] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [activeStrategy, setActiveStrategy] = useState<"pass"|"first_class"|"distinction"|"topper">("pass");
  const [activePlan, setActivePlan] = useState<"24_hours"|"3_days"|"7_days"|"15_days">("24_hours");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const stepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const canSubmit = subject.trim() && selectedTime;

  const startSteps = useCallback(() => {
    let i = 0; setActiveStep(0); setDoneSteps([]); setLoadingLabel(STEPS[0] + "...");
    stepTimerRef.current = setInterval(() => {
      i++;
      if (i < STEPS.length) { setDoneSteps(p => [...p, i-1]); setActiveStep(i); setLoadingLabel(STEPS[i] + "..."); }
      else { setDoneSteps(p => [...p, i-1]); setActiveStep(-1); if (stepTimerRef.current) clearInterval(stepTimerRef.current); }
    }, 2800);
  }, []);

  const stopSteps = useCallback(() => {
    if (stepTimerRef.current) clearInterval(stepTimerRef.current);
    setDoneSteps([0,1,2,3,4,5]); setActiveStep(-1);
  }, []);

  async function handleSubmit() {
    if (!canSubmit) return;
    setError(""); setResult(null); setLoading(true); startSteps();
    try {
      const urgencyMode = selectedTime === "8 hours" ? "EMERGENCY" : selectedTime === "1 day" ? "URGENT" : "NORMAL";
      const res = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim(), time_left: selectedTime, exam_date: "", urgency_mode: urgencyMode }),
      });
      if (!res.ok) throw new Error(`Webhook returned ${res.status}. Check your n8n URL.`);
      const text = await res.text();
      const firstBrace = text.indexOf("{"), lastBrace = text.lastIndexOf("}");
      if (firstBrace === -1 || lastBrace === -1) throw new Error("Agent returned no JSON. Check your n8n Final Output node.");
      const clean = text.slice(firstBrace, lastBrace + 1);
      let raw: AgentResult;
      try { raw = JSON.parse(clean); } catch (e) { throw new Error("JSON parse failed: " + (e instanceof Error ? e.message : String(e))); }

      const topicRankings = (raw as unknown as { topic_rankings?: TopicRanking[] }).topic_rankings;
      const data: AgentResult = {
        ...raw,
        important_topics: topicRankings?.map(t => ({ name: t.topic, why: t.why_it_matters, confidence: t.final_confidence })) || raw.important_topics || [],
        predicted_questions: raw.predicted_questions?.map(q => {
          if (typeof q === "string") return q;
          return { question: q.question, type: q.question_type || q.type || "theory", marks: q.marks || 0, confidence: q.confidence || 0, answer_outline: q.answer_outline || [], common_mistakes: q.common_mistakes || [], topic: q.topic || "", expected_diagrams: q.expected_diagrams || [] };
        }) || [],
        study_plan: raw.revision_plans?.["24_hours"] || raw.revision_plans?.["3_days"] || raw.study_plan || [],
        revision_notes: [
          raw.final_verdict?.recommended_strategy        ? "Strategy: "    + raw.final_verdict.recommended_strategy        : null,
          raw.final_verdict?.minimum_preparation_for_pass ? "Min to pass: " + raw.final_verdict.minimum_preparation_for_pass : null,
          raw.final_verdict?.single_best_topic_to_master  ? "Best topic: "  + raw.final_verdict.single_best_topic_to_master  : null,
          raw.final_verdict?.best_unit_for_maximum_marks  ? "Best unit: "   + raw.final_verdict.best_unit_for_maximum_marks  : null,
        ].filter(Boolean).join("\n\n") || raw.revision_notes || "",
        viva_questions: raw.answer_writing_intelligence?.flatMap(a => (a.key_definitions || []).map(d => `${a.topic}: ${d}`)) || raw.viva_questions || [],
      };
      stopSteps(); setResult(data); setActiveView("topics");
    } catch (err: unknown) {
      stopSteps(); setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally { setLoading(false); }
  }

  const topics: Topic[] = result?.important_topics || result?.topic_rankings?.map(t => ({ name: t.topic, why: t.why_it_matters, confidence: t.final_confidence })) || result?.topics || [];
  const allQuestions: Question[] = result?.predicted_questions || result?.top_predictions?.map(p => ({ question: p.question, type: p.type, marks: p.marks, confidence: p.confidence })) || result?.questions || result?.frequently_asked || [];
  const filteredQuestions = allQuestions.filter(q => {
    const text = typeof q === "string" ? q : (q.question || "");
    const type = typeof q === "object" ? (q.type || q.question_type || "") : "";
    const matchSearch = text.toLowerCase().includes(searchQ.toLowerCase());
    const matchFilter = filterType === "all" || type.toLowerCase().includes(filterType.toLowerCase());
    return matchSearch && matchFilter;
  });

  const hasRich = !!(result?.study_strategies || result?.marks_optimization || result?.exam_forecast);

  const NAV_ITEMS: { key: ViewKey; icon: string; label: string; requires: boolean }[] = [
    { key: "topics",    icon: "📚", label: "Important Topics",   requires: true },
    { key: "questions", icon: "❓", label: "Predicted Questions", requires: true },
    { key: "strategy",  icon: "🎯", label: "Exam Strategy",      requires: hasRich },
    { key: "plan",      icon: "📅", label: "Study Plan",         requires: true },
    { key: "answer",    icon: "✍️",  label: "Answer Guide",      requires: hasRich },
    { key: "risk",      icon: "⚠️",  label: "Risk Analysis",     requires: hasRich },
    { key: "forecast",  icon: "🔮", label: "Exam Forecast",      requires: hasRich },
  ];

  // ── Home / Input View ────────────────────────────────────────────────────
  if (!result && !loading) {
    return (
      <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:"2rem 1rem" }}>
        <div style={{ width:"100%", maxWidth:560, animation:"fadeUp 0.5s ease" }}>
          {/* Logo */}
          <div style={{ textAlign:"center", marginBottom:"3rem" }}>
            <div style={{ fontSize:48, marginBottom:12 }}>🧠</div>
            <h1 style={{ fontSize:32, fontWeight:700, color:"var(--cream)", margin:0 }}>Exam Prep Agent</h1>
            <p style={{ fontSize:15, color:"var(--slate)", marginTop:8 }}>AI-powered exam intelligence for Mumbai University students</p>
            <div style={{ display:"flex", justifyContent:"center", gap:20, marginTop:16 }}>
              {["Multi-agent AI","PYQ Analysis","Exam Strategy"].map(f => (
                <span key={f} style={{ fontSize:12, color:"var(--saffron)", background:"rgba(255,149,0,0.1)", padding:"3px 10px", borderRadius:20, border:"1px solid rgba(255,149,0,0.2)" }}>{f}</span>
              ))}
            </div>
          </div>

          {/* Input card */}
          <div style={{ background:"var(--navy2)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:20, padding:"2rem", boxShadow:"0 24px 48px rgba(0,0,0,0.4)" }}>
            <div style={{ marginBottom:"1.5rem" }}>
              <label style={{ fontSize:12, fontWeight:600, color:"var(--slate)", letterSpacing:"0.08em", textTransform:"uppercase", display:"block", marginBottom:8 }}>Subject</label>
              <input
                value={subject} onChange={e => setSubject(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmit()}
                placeholder="e.g. Operating Systems, DBMS, Data Structures..."
                style={{ width:"100%", padding:"14px 16px", background:"var(--navy3)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:12, color:"var(--cream)", fontSize:15, outline:"none", transition:"border-color 0.2s" }}
                onFocus={e => (e.target.style.borderColor = "var(--saffron)")}
                onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
              />
            </div>

            <div style={{ marginBottom:"2rem" }}>
              <label style={{ fontSize:12, fontWeight:600, color:"var(--slate)", letterSpacing:"0.08em", textTransform:"uppercase", display:"block", marginBottom:8 }}>Time before exam</label>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {TIME_OPTIONS.map(t => (
                  <button key={t} onClick={() => setSelectedTime(t)} style={{
                    padding:"9px 18px", borderRadius:10, fontSize:13, fontWeight:500,
                    border: selectedTime === t ? "1px solid var(--saffron)" : "1px solid rgba(255,255,255,0.1)",
                    background: selectedTime === t ? "rgba(255,149,0,0.15)" : "var(--navy3)",
                    color: selectedTime === t ? "var(--saffron)" : "var(--slate)",
                    transition:"all 0.15s",
                  }}>{t}</button>
                ))}
              </div>
              {selectedTime === "8 hours" && <div style={{ marginTop:10, padding:"8px 12px", background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:8, fontSize:13, color:"#EF4444" }}>🚨 Emergency mode — optimised for maximum marks in minimum time</div>}
            </div>

            {error && <div style={{ marginBottom:"1rem", padding:"10px 14px", background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:10, fontSize:13, color:"#EF4444" }}>⚠ {error}</div>}

            <button onClick={handleSubmit} disabled={!canSubmit} style={{
              width:"100%", padding:"15px", borderRadius:12, border:"none", fontSize:15, fontWeight:600,
              background: canSubmit ? "linear-gradient(135deg,var(--saffron),var(--saffron2))" : "var(--navy4)",
              color: canSubmit ? "var(--navy)" : "var(--slate2)",
              cursor: canSubmit ? "pointer" : "not-allowed", transition:"all 0.2s",
              boxShadow: canSubmit ? "0 8px 24px rgba(255,149,0,0.25)" : "none",
            }}>
              ✨ Generate Study Plan
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Loading View ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:"2rem" }}>
        <div style={{ textAlign:"center", maxWidth:480, width:"100%" }}>
          <div style={{ width:56, height:56, border:"3px solid var(--navy3)", borderTopColor:"var(--saffron)", borderRadius:"50%", margin:"0 auto 1.5rem", animation:"spin 0.8s linear infinite" }} />
          <h2 style={{ fontSize:20, fontWeight:600, color:"var(--cream)", marginBottom:6 }}>{loadingLabel}</h2>
          <p style={{ fontSize:14, color:"var(--slate)", marginBottom:"2rem" }}>6 AI agents working in parallel — this takes 15–30 seconds</p>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
            {STEPS.map((s, i) => (
              <div key={i} style={{
                padding:"8px 12px", borderRadius:8, fontSize:12, fontWeight:500,
                background: doneSteps.includes(i) ? "rgba(34,197,94,0.1)" : activeStep === i ? "rgba(255,149,0,0.15)" : "var(--navy2)",
                border: doneSteps.includes(i) ? "1px solid rgba(34,197,94,0.3)" : activeStep === i ? "1px solid rgba(255,149,0,0.3)" : "1px solid rgba(255,255,255,0.05)",
                color: doneSteps.includes(i) ? "#22C55E" : activeStep === i ? "var(--saffron)" : "var(--slate2)",
                transition:"all 0.3s",
              }}>
                {doneSteps.includes(i) ? "✓ " : activeStep === i ? "⟳ " : ""}{s}
              </div>
            ))}
          </div>
          <div style={{ marginTop:"2rem" }}>
            {[1,2,3].map(i => <SkeletonCard key={i} />)}
          </div>
        </div>
      </div>
    );
  }

  // ── Results Layout ────────────────────────────────────────────────────────
  const plan: PlanItem[] = result?.revision_plans?.[activePlan] || result?.study_plan || result?.schedule || result?.plan || [];
  const notes = result?.revision_notes || result?.notes || result?.summary || "";
  const viva: VivaItem[] = result?.viva_questions || result?.answer_writing_intelligence?.flatMap(a => (a.key_definitions || []).map(d => `${a.topic}: ${d}`)) || result?.viva || [];

  return (
    <div style={{ display:"flex", minHeight:"100vh", position:"relative" }}>

      {/* Sidebar */}
      <aside style={{
        width:240, flexShrink:0, background:"var(--navy2)", borderRight:"1px solid rgba(255,255,255,0.06)",
        display:"flex", flexDirection:"column", position:"sticky", top:0, height:"100vh", overflowY:"auto",
      }}>
        {/* Brand */}
        <div style={{ padding:"1.5rem 1rem 1rem", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
            <span style={{ fontSize:20 }}>🧠</span>
            <span style={{ fontSize:14, fontWeight:700, color:"var(--cream)" }}>Exam Prep Agent</span>
          </div>
          <div style={{ fontSize:12, color:"var(--saffron)", fontWeight:600, background:"rgba(255,149,0,0.1)", padding:"3px 8px", borderRadius:6, display:"inline-block" }}>{subject}</div>
          {result?.confidence_summary && (
            <div style={{ fontSize:11, color:"var(--slate)", marginTop:6 }}>
              {result.confidence_summary.overall_confidence}% overall confidence
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ padding:"0.75rem", flex:1 }}>
          <div style={{ fontSize:10, fontWeight:700, color:"var(--slate2)", letterSpacing:"0.1em", textTransform:"uppercase", padding:"6px 8px 4px", marginBottom:4 }}>Sections</div>
          {NAV_ITEMS.map(item => (
            <NavItem key={item.key} icon={item.icon} label={item.label}
              active={activeView === item.key} onClick={() => item.requires && setActiveView(item.key)}
              hasData={item.requires} />
          ))}
        </nav>

        {/* New plan button */}
        <div style={{ padding:"1rem", borderTop:"1px solid rgba(255,255,255,0.06)" }}>
          <button onClick={() => { setResult(null); setSubject(""); setSelectedTime(""); setError(""); setActiveView("home"); }}
            style={{ width:"100%", padding:"9px", borderRadius:8, border:"1px solid rgba(255,255,255,0.1)", background:"transparent", color:"var(--slate)", fontSize:13, transition:"all 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--navy3)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--cream)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "var(--slate)"; }}
          >↺ New Plan</button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex:1, overflowY:"auto", padding:"2rem 2.5rem", maxWidth:"100%" }}>

        {/* ── Topics ── */}
        {activeView === "topics" && (
          <div style={{ maxWidth:900 }}>
            <SectionHeader icon="📚" title="Important Topics" subtitle={`${topics.length} topics ranked by exam probability for ${subject}`} badge={result?.do_not_skip ? `${result.do_not_skip.length} must-study` : undefined} />
            {result?.do_not_skip && result.do_not_skip.length > 0 && (
              <div style={{ background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:12, padding:"1rem 1.25rem", marginBottom:"1.5rem" }}>
                <div style={{ fontSize:12, fontWeight:700, color:"#EF4444", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:8 }}>🚨 Do Not Skip Under Any Circumstances</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                  {result.do_not_skip.map((t,i) => <span key={i} style={{ fontSize:13, color:"#EF4444", background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)", padding:"4px 12px", borderRadius:6 }}>{t}</span>)}
                </div>
              </div>
            )}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:12 }}>
              {topics.length === 0 ? <p style={{ color:"var(--slate)" }}>No topics found in response.</p> : topics.map((t, i) => <TopicCard key={i} t={t} index={i} />)}
            </div>
            {result?.safe_to_skip && result.safe_to_skip.length > 0 && (
              <div style={{ background:"rgba(34,197,94,0.06)", border:"1px solid rgba(34,197,94,0.15)", borderRadius:12, padding:"1rem 1.25rem", marginTop:"1.5rem" }}>
                <div style={{ fontSize:12, fontWeight:700, color:"#22C55E", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:8 }}>✓ Safe to Skip (if short on time)</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                  {result.safe_to_skip.map((t,i) => <span key={i} style={{ fontSize:13, color:"#22C55E", background:"rgba(34,197,94,0.08)", padding:"4px 12px", borderRadius:6 }}>{t}</span>)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Questions ── */}
        {activeView === "questions" && (
          <div style={{ maxWidth:860 }}>
            <SectionHeader icon="❓" title="Predicted Questions" subtitle={`${filteredQuestions.length} questions predicted by AI analysis of PYQs, syllabus & trends`} />

            {/* Filter bar */}
            <div style={{ display:"flex", gap:10, marginBottom:"1.5rem", flexWrap:"wrap", alignItems:"center" }}>
              <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search questions..."
                style={{ flex:1, minWidth:200, padding:"9px 14px", background:"var(--navy2)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:10, color:"var(--cream)", fontSize:14, outline:"none" }} />
              {["all","theory","numerical","long","diagram","short"].map(f => (
                <button key={f} onClick={() => setFilterType(f)} style={{
                  padding:"7px 14px", borderRadius:8, fontSize:12, fontWeight:500,
                  border: filterType === f ? "1px solid var(--saffron)" : "1px solid rgba(255,255,255,0.08)",
                  background: filterType === f ? "rgba(255,149,0,0.12)" : "var(--navy2)",
                  color: filterType === f ? "var(--saffron)" : "var(--slate)",
                  textTransform:"capitalize",
                }}>{f}</button>
              ))}
            </div>

            {filteredQuestions.length === 0
              ? <div style={{ textAlign:"center", padding:"4rem 2rem", color:"var(--slate)" }}><div style={{ fontSize:40, marginBottom:12 }}>🔍</div><p>No questions match your filters.</p></div>
              : filteredQuestions.map((q, i) => <QuestionCard key={i} q={q} index={i} subject={subject} />)
            }
          </div>
        )}

        {/* ── Strategy ── */}
        {activeView === "strategy" && (
          <div style={{ maxWidth:860 }}>
            <SectionHeader icon="🎯" title="Exam Strategy" subtitle="Choose your target and get a precise study roadmap" />

            {/* Marks optimization */}
            {result?.marks_optimization && (
              <div style={{ background:"var(--navy2)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:16, padding:"1.5rem", marginBottom:"1.5rem" }}>
                <div style={{ fontSize:13, fontWeight:700, color:"var(--saffron)", letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:16 }}>📊 Marks Optimization — What to study for each target</div>
                {(["topics_for_40_percent","topics_for_50_percent","topics_for_60_percent","topics_for_75_percent","topics_for_90_percent"] as const).map(key => {
                  const pct = key.replace("topics_for_","").replace("_percent","");
                  const list = result.marks_optimization![key];
                  if (!list?.length) return null;
                  const barColor = parseInt(pct) >= 75 ? "var(--saffron)" : parseInt(pct) >= 60 ? "#A78BFA" : "#3B82F6";
                  return (
                    <div key={key} style={{ display:"flex", alignItems:"center", gap:14, padding:"10px 0", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                      <div style={{ width:48, textAlign:"right", fontSize:14, fontWeight:700, color:barColor, flexShrink:0 }}>{pct}%</div>
                      <div style={{ width:4, height:4, borderRadius:"50%", background:barColor, flexShrink:0 }} />
                      <div style={{ fontSize:13, color:"var(--cream2)", lineHeight:1.5 }}>{list.join(" · ")}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Strategy tabs */}
            {result?.study_strategies && (
              <div style={{ background:"var(--navy2)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:16, padding:"1.5rem" }}>
                <div style={{ fontSize:13, fontWeight:700, color:"var(--saffron)", letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:16 }}>🗺 Study Strategies</div>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:"1.25rem" }}>
                  {(["pass","first_class","distinction","topper"] as const).map(k => {
                    const labels = { pass:"Pass (40%)", first_class:"First Class (60%)", distinction:"Distinction (75%)", topper:"Topper (90%+)" };
                    return (
                      <button key={k} onClick={() => setActiveStrategy(k)} style={{
                        padding:"8px 16px", borderRadius:8, fontSize:13, fontWeight:500,
                        border: activeStrategy === k ? "1px solid var(--saffron)" : "1px solid rgba(255,255,255,0.08)",
                        background: activeStrategy === k ? "rgba(255,149,0,0.15)" : "var(--navy3)",
                        color: activeStrategy === k ? "var(--saffron)" : "var(--slate)",
                      }}>{labels[k]}</button>
                    );
                  })}
                </div>
                {(() => {
                  const strat = result.study_strategies![`${activeStrategy}_strategy`];
                  if (!strat) return null;
                  return (
                    <div style={{ animation:"fadeIn 0.2s ease" }}>
                      <div style={{ display:"flex", gap:20, marginBottom:16 }}>
                        <div style={{ background:"var(--navy3)", borderRadius:10, padding:"10px 16px", flex:1 }}>
                          <div style={{ fontSize:11, color:"var(--slate)", marginBottom:4 }}>Expected Marks</div>
                          <div style={{ fontSize:16, fontWeight:700, color:"var(--saffron)" }}>{strat.expected_marks}</div>
                        </div>
                        <div style={{ background:"var(--navy3)", borderRadius:10, padding:"10px 16px", flex:1 }}>
                          <div style={{ fontSize:11, color:"var(--slate)", marginBottom:4 }}>Study Hours</div>
                          <div style={{ fontSize:16, fontWeight:700, color:"var(--cream)" }}>{strat.study_hours}</div>
                        </div>
                      </div>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                        {strat.topics?.map((t, i) => <span key={i} style={{ background:"var(--navy3)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:8, padding:"6px 12px", fontSize:13, color:"var(--cream2)" }}>{t}</span>)}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Priority matrix */}
            {result?.priority_matrix && (
              <div style={{ marginTop:"1.5rem" }}>
                <div style={{ fontSize:13, fontWeight:700, color:"var(--slate)", letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:12 }}>Priority Matrix</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  {([
                    ["high_impact_low_effort","🟢 High Impact · Low Effort","rgba(34,197,94,0.08)","rgba(34,197,94,0.2)","#22C55E"],
                    ["high_impact_high_effort","🟡 High Impact · High Effort","rgba(255,149,0,0.08)","rgba(255,149,0,0.2)","var(--saffron)"],
                    ["low_impact_low_effort","⚪ Low Impact · Low Effort","rgba(255,255,255,0.02)","rgba(255,255,255,0.06)","var(--slate)"],
                    ["low_impact_high_effort","🔴 Low Impact · High Effort","rgba(239,68,68,0.06)","rgba(239,68,68,0.15)","#EF4444"],
                  ] as const).map(([key, label, bg, border, color]) => {
                    const items = result.priority_matrix![key];
                    if (!items?.length) return null;
                    return (
                      <div key={key} style={{ background:bg, border:`1px solid ${border}`, borderRadius:12, padding:"1rem" }}>
                        <div style={{ fontSize:12, fontWeight:700, color, marginBottom:10 }}>{label}</div>
                        <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                          {items.map((item, i) => <div key={i} style={{ fontSize:13, color:"var(--cream2)" }}>→ {item}</div>)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Study Plan ── */}
        {activeView === "plan" && (
          <div style={{ maxWidth:800 }}>
            <SectionHeader icon="📅" title="Study Plan" subtitle="Hour-by-hour and day-by-day preparation schedule" />
            {result?.revision_plans && (
              <div style={{ display:"flex", gap:8, marginBottom:"1.5rem", flexWrap:"wrap" }}>
                {(["24_hours","3_days","7_days","15_days"] as const).map(k => (
                  <button key={k} onClick={() => setActivePlan(k)} style={{
                    padding:"8px 16px", borderRadius:8, fontSize:13,
                    border: activePlan === k ? "1px solid var(--saffron)" : "1px solid rgba(255,255,255,0.08)",
                    background: activePlan === k ? "rgba(255,149,0,0.15)" : "var(--navy2)",
                    color: activePlan === k ? "var(--saffron)" : "var(--slate)",
                  }}>{k.replace("_"," ")}</button>
                ))}
              </div>
            )}
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {plan.length === 0 ? <p style={{ color:"var(--slate)" }}>No study plan in response.</p> : plan.map((p, i) => {
                const time = typeof p === "object" ? ((p as {time?:string}).time || (p as {hour?:string}).hour || (p as {slot?:string}).slot || `Step ${i+1}`) : `Step ${i+1}`;
                const task = typeof p === "string" ? p : ((p as {task?:string}).task || (p as {topic?:string}).topic || (p as {activity?:string}).activity || "");
                const detail = typeof p === "object" ? ((p as {detail?:string}).detail || (p as {description?:string}).description || (p as {objective?:string}).objective || "") : "";
                const hours = typeof p === "object" ? (p as {hours?:string|number}).hours : undefined;
                const deliverable = typeof p === "object" ? (p as {deliverable?:string}).deliverable : undefined;
                return (
                  <div key={i} style={{ background:"var(--navy2)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:12, padding:"1rem 1.25rem", display:"flex", gap:14, alignItems:"flex-start", animation:`fadeUp 0.3s ease ${i*0.04}s both` }}>
                    <div style={{ background:"rgba(255,149,0,0.1)", border:"1px solid rgba(255,149,0,0.2)", borderRadius:8, padding:"6px 10px", fontSize:12, color:"var(--saffron)", fontWeight:600, whiteSpace:"nowrap", flexShrink:0, minWidth:64, textAlign:"center" }}>{time}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:14, fontWeight:600, color:"var(--cream)", marginBottom: detail ? 4 : 0 }}>{task}</div>
                      {hours && <div style={{ fontSize:12, color:"var(--saffron)", marginBottom:3 }}>⏱ {hours} hrs</div>}
                      {detail && <div style={{ fontSize:13, color:"var(--slate)", lineHeight:1.5 }}>{detail}</div>}
                      {deliverable && <div style={{ fontSize:12, color:"#22C55E", marginTop:6 }}>✓ Goal: {deliverable}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
            {notes && (
              <div style={{ background:"var(--navy2)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:12, padding:"1.25rem", marginTop:"1.5rem" }}>
                <div style={{ fontSize:12, fontWeight:700, color:"var(--saffron)", letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:10 }}>📋 Revision Notes</div>
                <div style={{ fontSize:14, color:"var(--cream2)", lineHeight:1.75, whiteSpace:"pre-line" }}>{notes}</div>
              </div>
            )}
            {viva.length > 0 && (
              <div style={{ marginTop:"1.5rem" }}>
                <div style={{ fontSize:13, fontWeight:700, color:"var(--slate)", letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:12 }}>🎤 Viva / Key Definitions</div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {viva.map((v, i) => {
                    const text = typeof v === "string" ? v : (v.question || v.text || "");
                    return <div key={i} style={{ background:"var(--navy2)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:10, padding:"10px 14px", fontSize:13, color:"var(--cream2)" }}>→ {text}</div>;
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Answer Guide ── */}
        {activeView === "answer" && (
          <div style={{ maxWidth:860 }}>
            <SectionHeader icon="✍️" title="Answer Writing Guide" subtitle="Exactly what examiners want to see in your answers" />
            {(!result?.answer_writing_intelligence || result.answer_writing_intelligence.length === 0)
              ? <p style={{ color:"var(--slate)" }}>No answer guide in response.</p>
              : result.answer_writing_intelligence.map((a, i) => (
                <div key={i} style={{ background:"var(--navy2)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:16, padding:"1.5rem", marginBottom:14, animation:`fadeUp 0.3s ease ${i*0.05}s both` }}>
                  <div style={{ fontSize:16, fontWeight:700, color:"var(--cream)", marginBottom:"1rem", display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ width:28, height:28, borderRadius:"50%", background:"rgba(255,149,0,0.15)", color:"var(--saffron)", fontSize:12, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{i+1}</span>
                    {a.topic}
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                    {a.ideal_structure?.length > 0 && (
                      <div style={{ background:"var(--navy3)", borderRadius:10, padding:"1rem" }}>
                        <div style={{ fontSize:11, fontWeight:700, color:"var(--saffron)", letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:8 }}>✏ Answer Structure</div>
                        {a.ideal_structure.map((s, j) => <div key={j} style={{ fontSize:13, color:"var(--cream2)", marginBottom:4 }}>{j+1}. {s}</div>)}
                      </div>
                    )}
                    {a.examiner_expectations?.length > 0 && (
                      <div style={{ background:"var(--navy3)", borderRadius:10, padding:"1rem" }}>
                        <div style={{ fontSize:11, fontWeight:700, color:"#3B82F6", letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:8 }}>🎯 Examiner Expects</div>
                        {a.examiner_expectations.map((e, j) => <div key={j} style={{ fontSize:13, color:"var(--cream2)", marginBottom:4 }}>✓ {e}</div>)}
                      </div>
                    )}
                    {a.must_draw_diagrams?.length > 0 && (
                      <div style={{ background:"var(--navy3)", borderRadius:10, padding:"1rem" }}>
                        <div style={{ fontSize:11, fontWeight:700, color:"#22C55E", letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:8 }}>📐 Must Draw</div>
                        <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                          {a.must_draw_diagrams.map((d, j) => <span key={j} style={{ fontSize:12, color:"#22C55E", background:"rgba(34,197,94,0.1)", border:"1px solid rgba(34,197,94,0.2)", padding:"3px 10px", borderRadius:6 }}>{d}</span>)}
                        </div>
                      </div>
                    )}
                    {a.common_mistakes?.length > 0 && (
                      <div style={{ background:"var(--navy3)", borderRadius:10, padding:"1rem" }}>
                        <div style={{ fontSize:11, fontWeight:700, color:"#EF4444", letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:8 }}>⚠ Common Mistakes</div>
                        {a.common_mistakes.map((m, j) => <div key={j} style={{ fontSize:13, color:"var(--cream2)", marginBottom:4 }}>✗ {m}</div>)}
                      </div>
                    )}
                  </div>
                  {a.key_definitions?.length > 0 && (
                    <div style={{ background:"var(--navy3)", borderRadius:10, padding:"1rem", marginTop:10 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:"#A78BFA", letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:8 }}>📖 Key Definitions to Memorize</div>
                      <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                        {a.key_definitions.map((d, j) => <div key={j} style={{ fontSize:13, color:"var(--cream2)" }}>→ {d}</div>)}
                      </div>
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}

        {/* ── Risk Analysis ── */}
        {activeView === "risk" && result?.risk_analysis && (
          <div style={{ maxWidth:800 }}>
            <SectionHeader icon="⚠️" title="Risk Analysis" subtitle="What most students get wrong — and how to avoid it" />
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              {[
                { key:"hidden_high_importance_topics" as const, icon:"🔍", label:"Hidden High-Importance Topics", color:"#A78BFA", bg:"rgba(167,139,250,0.08)", border:"rgba(167,139,250,0.2)", desc:"Topics that appear unimportant but carry significant marks" },
                { key:"high_failure_risk_topics" as const, icon:"🚨", label:"High Failure Risk", color:"#EF4444", bg:"rgba(239,68,68,0.08)", border:"rgba(239,68,68,0.2)", desc:"Topics where most students lose marks — prepare carefully" },
                { key:"overhyped_topics" as const, icon:"📢", label:"Overhyped Topics", color:"#F59E0B", bg:"rgba(245,158,11,0.08)", border:"rgba(245,158,11,0.2)", desc:"Topics students over-study relative to their exam weight" },
                { key:"underestimated_topics" as const, icon:"💡", label:"Underestimated Topics", color:"#22C55E", bg:"rgba(34,197,94,0.08)", border:"rgba(34,197,94,0.2)", desc:"Easy marks that students skip — don't make that mistake" },
              ].map(({ key, icon, label, color, bg, border, desc }) => {
                const items = result.risk_analysis![key];
                if (!items?.length) return null;
                return (
                  <div key={key} style={{ background:bg, border:`1px solid ${border}`, borderRadius:14, padding:"1.25rem 1.5rem", animation:"fadeUp 0.3s ease" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                      <span style={{ fontSize:18 }}>{icon}</span>
                      <div>
                        <div style={{ fontSize:14, fontWeight:700, color }}>{label}</div>
                        <div style={{ fontSize:12, color:"var(--slate)" }}>{desc}</div>
                      </div>
                    </div>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginTop:12 }}>
                      {items.map((t, i) => <span key={i} style={{ fontSize:13, color, background:`${color}18`, border:`1px solid ${color}30`, padding:"5px 12px", borderRadius:8 }}>{t}</span>)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Forecast ── */}
        {activeView === "forecast" && result?.exam_forecast && (
          <div style={{ maxWidth:800 }}>
            <SectionHeader icon="🔮" title="Exam Forecast" subtitle={`AI prediction engine · ${result.exam_forecast.forecast_confidence}% overall confidence`} />
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:12, marginBottom:"1.5rem" }}>
              {[
                ["Most Important Topic", result.exam_forecast.most_important_topic, "var(--saffron)"],
                ["Most Likely Theory Q", result.exam_forecast.most_likely_theory, "#3B82F6"],
                ["Most Likely Long Q", result.exam_forecast.most_likely_long_question, "#A78BFA"],
                ["Most Likely Numerical", result.exam_forecast.most_likely_numerical, "#22C55E"],
                ["Most Likely Diagram", result.exam_forecast.most_likely_diagram, "#F59E0B"],
                ["Expected Difficulty", result.exam_forecast.expected_difficulty, result.exam_forecast.expected_difficulty?.toLowerCase().includes("hard") ? "#EF4444" : "#22C55E"],
              ].filter(([,v]) => v).map(([label, value, color]) => (
                <div key={label as string} style={{ background:"var(--navy2)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:12, padding:"1rem 1.25rem" }}>
                  <div style={{ fontSize:11, color:"var(--slate)", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>{label as string}</div>
                  <div style={{ fontSize:14, fontWeight:600, color: color as string, lineHeight:1.4 }}>{value as string}</div>
                </div>
              ))}
            </div>
            {result.final_verdict && (
              <div style={{ background:"linear-gradient(135deg,var(--navy2),rgba(255,149,0,0.04))", border:"1px solid rgba(255,149,0,0.2)", borderRadius:16, padding:"1.5rem", boxShadow:"0 8px 32px rgba(0,0,0,0.3)" }}>
                <div style={{ fontSize:13, fontWeight:700, color:"var(--saffron)", letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:"1.25rem" }}>⭐ Final Verdict</div>
                <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  {[
                    ["Single Best Topic to Master", result.final_verdict.single_best_topic_to_master],
                    ["Minimum Prep to Pass", result.final_verdict.minimum_preparation_for_pass],
                    ["Recommended Strategy", result.final_verdict.recommended_strategy],
                    ["Highest Return Topic", result.final_verdict.highest_return_topic],
                    ["Most Predictable Question", result.final_verdict.most_predictable_question],
                  ].filter(([,v]) => v).map(([label, value]) => (
                    <div key={label as string} style={{ display:"flex", flexDirection:"column", gap:3, padding:"10px 0", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                      <span style={{ fontSize:11, color:"var(--slate)", textTransform:"uppercase", letterSpacing:"0.06em" }}>{label as string}</span>
                      <span style={{ fontSize:14, fontWeight:500, color:"var(--cream)", lineHeight:1.5 }}>{value as string}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}