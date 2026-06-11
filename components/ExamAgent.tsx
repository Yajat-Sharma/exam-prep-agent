"use client";

import { useState, useRef } from "react";

const N8N_WEBHOOK_URL = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || "";

const TIME_OPTIONS = ["8 hours", "1 day", "2 days", "3 days", "1 week"];

const STEPS = [
  "Query classifier",
  "PYQ analysis",
  "Web search",
  "Syllabus map",
  "Supervisor",
  "Ranking",
];

// ─── Types ─────────────────────────────────────────────────────────────────

type Topic = { name: string; why?: string; confidence?: number } | string;
type Question = {
  question?: string;
  text?: string;
  type?: string;
  question_type?: string;
  marks?: number;
  confidence?: number;
  answer_outline?: string[];
  common_mistakes?: string[];
} | string;
type PlanItem = {
  time?: string; hour?: string; slot?: string;
  task?: string; topic?: string; activity?: string;
  detail?: string; description?: string; objective?: string;
} | string;
type VivaItem = { question?: string; text?: string } | string;

interface TopicRanking {
  rank: number;
  topic: string;
  final_confidence: number;
  agreement_score: string;
  why_it_matters: string;
  evidence_sources?: string[];
}

interface StudyStrategy {
  topics: string[];
  expected_marks: string;
  study_hours: string;
}

interface RevisionPlanItem {
  topic?: string;
  hours?: string | number;
  objective?: string;
  deliverable?: string;
}

interface AnswerIntelligence {
  topic: string;
  ideal_structure: string[];
  must_draw_diagrams: string[];
  key_definitions: string[];
  examiner_expectations: string[];
  common_mistakes: string[];
}

interface MarksOptimization {
  topics_for_40_percent: string[];
  topics_for_50_percent: string[];
  topics_for_60_percent: string[];
  topics_for_75_percent: string[];
  topics_for_90_percent: string[];
}

interface PriorityMatrix {
  high_impact_low_effort: string[];
  high_impact_high_effort: string[];
  low_impact_low_effort: string[];
  low_impact_high_effort: string[];
}

interface AgentResult {
  // Flat aliases (set by Code node)
  important_topics?: Topic[];
  topics?: Topic[];
  predicted_questions?: Question[];
  questions?: Question[];
  frequently_asked?: Question[];
  study_plan?: PlanItem[];
  schedule?: PlanItem[];
  plan?: PlanItem[];
  revision_notes?: string;
  notes?: string;
  summary?: string;
  viva_questions?: VivaItem[];
  viva?: VivaItem[];

  // Rich supervisor schema
  agent?: string;
  subject?: string;
  confidence_summary?: {
    overall_confidence: number;
    agreement_level: string;
    sources_considered: number;
    strongest_signal: string;
  };
  topic_rankings?: TopicRanking[];
  top_predictions?: Array<{
    rank: number;
    topic: string;
    confidence: number;
    question: string;
    marks: number;
    type: string;
    evidence: string[];
    why: string;
    preparation_strategy: string;
  }>;
  marks_optimization?: MarksOptimization;
  priority_matrix?: PriorityMatrix;
  study_strategies?: {
    pass_strategy: StudyStrategy;
    first_class_strategy: StudyStrategy;
    distinction_strategy: StudyStrategy;
    topper_strategy: StudyStrategy;
  };
  revision_plans?: {
    "24_hours": RevisionPlanItem[];
    "3_days": RevisionPlanItem[];
    "7_days": RevisionPlanItem[];
    "15_days": RevisionPlanItem[];
  };
  answer_writing_intelligence?: AnswerIntelligence[];
  risk_analysis?: {
    hidden_high_importance_topics: string[];
    overhyped_topics: string[];
    underestimated_topics: string[];
    high_failure_risk_topics: string[];
  };
  do_not_skip?: string[];
  safe_to_skip?: string[];
  exam_forecast?: {
    most_important_unit: string;
    most_important_topic: string;
    most_likely_numerical: string;
    most_likely_theory: string;
    most_likely_long_question: string;
    most_likely_diagram: string;
    expected_difficulty: string;
    forecast_confidence: number;
  };
  final_verdict?: {
    single_best_topic_to_master: string;
    best_unit_for_maximum_marks: string;
    highest_return_topic: string;
    most_predictable_question: string;
    minimum_preparation_for_pass: string;
    recommended_strategy: string;
  };
}

type TabKey = "topics" | "questions" | "strategy" | "plan" | "answer" | "risk" | "forecast";

// ─── Component ─────────────────────────────────────────────────────────────

export default function ExamAgent() {
  const [subject, setSubject] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(-1);
  const [doneSteps, setDoneSteps] = useState<number[]>([]);
  const [loadingLabel, setLoadingLabel] = useState("Analyzing subject...");
  const [result, setResult] = useState<AgentResult | null>(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("topics");
  const [expandedQ, setExpandedQ] = useState<number | null>(null);
  const [activeStrategy, setActiveStrategy] = useState<"pass" | "first_class" | "distinction" | "topper">("pass");
  const [activePlan, setActivePlan] = useState<"24_hours" | "3_days" | "7_days" | "15_days">("24_hours");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const stepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const canSubmit = subject.trim() && selectedTime;

  function startStepAnimation() {
    let i = 0;
    setActiveStep(0);
    setDoneSteps([]);
    setLoadingLabel(STEPS[0] + "...");
    stepTimerRef.current = setInterval(() => {
      i++;
      if (i < STEPS.length) {
        setDoneSteps((prev) => [...prev, i - 1]);
        setActiveStep(i);
        setLoadingLabel(STEPS[i] + "...");
      } else {
        setDoneSteps((prev) => [...prev, i - 1]);
        setActiveStep(-1);
        if (stepTimerRef.current) clearInterval(stepTimerRef.current);
      }
    }, 2800);
  }

  function stopStepAnimation() {
    if (stepTimerRef.current) clearInterval(stepTimerRef.current);
    setDoneSteps([0, 1, 2, 3, 4, 5]);
    setActiveStep(-1);
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setError("");
    setResult(null);
    setLoading(true);
    startStepAnimation();
    try {
      const urgencyMode =
        selectedTime === "8 hours" ? "EMERGENCY" :
        selectedTime === "1 day"   ? "URGENT" : "NORMAL";

      const res = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          time_left: selectedTime,
          exam_date: "",
          urgency_mode: urgencyMode,
        }),
      });

      if (!res.ok) throw new Error(`Webhook returned ${res.status}. Check your n8n URL.`);

      const text = await res.text();
      const firstBrace = text.indexOf("{");
      const lastBrace  = text.lastIndexOf("}");
      if (firstBrace === -1 || lastBrace === -1) {
        throw new Error("Agent returned no JSON. Check your n8n Final Output node.");
      }

      const clean = text.slice(firstBrace, lastBrace + 1);
      let raw: AgentResult;
      try { raw = JSON.parse(clean); }
      catch (e) {
        throw new Error("JSON parse failed: " + (e instanceof Error ? e.message : String(e)));
      }

      const topicRankings = (raw as unknown as { topic_rankings?: { topic: string; why_it_matters: string; final_confidence: number }[] }).topic_rankings;

      const data: AgentResult = {
        ...raw,
        important_topics: topicRankings?.map(t => ({
          name: t.topic,
          why: t.why_it_matters,
          confidence: t.final_confidence,
        })) || raw.important_topics || [],

        predicted_questions: raw.predicted_questions?.map(q => {
          if (typeof q === "string") return q;
          return {
            question: q.question,
            type: q.question_type || q.type || "theory",
            marks: q.marks || 0,
            confidence: q.confidence || 0,
            answer_outline: q.answer_outline || [],
            common_mistakes: q.common_mistakes || [],
          };
        }) || [],

        study_plan:
          raw.revision_plans?.["24_hours"] ||
          raw.revision_plans?.["3_days"]   ||
          raw.study_plan || [],

        revision_notes: [
          raw.final_verdict?.recommended_strategy         ? "Strategy: "     + raw.final_verdict.recommended_strategy         : null,
          raw.final_verdict?.minimum_preparation_for_pass ? "Min to pass: "  + raw.final_verdict.minimum_preparation_for_pass : null,
          raw.final_verdict?.single_best_topic_to_master  ? "Best topic: "   + raw.final_verdict.single_best_topic_to_master  : null,
          raw.final_verdict?.best_unit_for_maximum_marks  ? "Best unit: "    + raw.final_verdict.best_unit_for_maximum_marks  : null,
        ].filter(Boolean).join("\n\n") || raw.revision_notes || "",

        viva_questions: raw.answer_writing_intelligence?.flatMap(a =>
          (a.key_definitions || []).map(d => `${a.topic}: ${d}`)
        ) || raw.viva_questions || [],
      };

      stopStepAnimation();
      setResult(data);
    } catch (err: unknown) {
      stopStepAnimation();
      setError(err instanceof Error ? err.message : "Something went wrong. Check your webhook URL.");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setResult(null); setSubject(""); setSelectedTime("");
    setFiles([]); setError(""); setActiveTab("topics");
    setExpandedQ(null);
  }

  // ─── Data resolution (flat aliases → rich schema fallback) ───────────────
  const topics: Topic[] =
    result?.important_topics ||
    result?.topic_rankings?.map(t => ({ name: t.topic, why: t.why_it_matters, confidence: t.final_confidence })) ||
    result?.topics || [];

  const questions: Question[] =
    result?.predicted_questions ||
    result?.top_predictions?.map(p => ({ question: p.question, type: p.type, marks: p.marks, confidence: p.confidence })) ||
    result?.questions || result?.frequently_asked || [];

  const plan: PlanItem[] =
    result?.study_plan ||
    result?.revision_plans?.[activePlan] ||
    result?.schedule || result?.plan || [];

  const notes: string =
    result?.revision_notes || result?.notes || result?.summary || "";

  const viva: VivaItem[] =
    result?.viva_questions ||
    result?.answer_writing_intelligence?.flatMap(a =>
      a.key_definitions?.map(d => `${a.topic}: ${d}`) || []
    ) ||
    result?.viva || [];

  const hasRichData = !!(result?.study_strategies || result?.marks_optimization || result?.exam_forecast);

  const TABS: [TabKey, string][] = [
    ["topics", "Topics"],
    ["questions", "Questions"],
    ...(hasRichData ? [["strategy", "Strategy"] as [TabKey, string]] : []),
    ["plan", "Study Plan"],
    ...(hasRichData ? [["answer", "Answer Guide"] as [TabKey, string]] : []),
    ...(hasRichData ? [["risk", "Risk Analysis"] as [TabKey, string]] : []),
    ...(hasRichData ? [["forecast", "Forecast"] as [TabKey, string]] : []),
  ];

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={s.app}>
      {/* Header */}
      <div style={s.header}>
        <h1 style={s.h1}>🧠 Exam Prep Agent</h1>
        <p style={s.subtitle}>Enter your subject and available time — the AI builds your complete study plan.</p>
      </div>

      {/* Input */}
      {!loading && !result && (
        <div>
          <div style={s.card}>
            <label style={s.label}>Subject name</label>
            <input style={s.input} type="text"
              placeholder="e.g. Operating Systems, Data Structures, DBMS..."
              value={subject} onChange={(e) => setSubject(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
          </div>

          <div style={s.card}>
            <label style={s.label}>Time before exam</label>
            <div style={s.pillRow}>
              {TIME_OPTIONS.map((t) => (
                <button key={t} onClick={() => setSelectedTime(t)}
                  style={{ ...s.pill, ...(selectedTime === t ? s.pillActive : {}) }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div style={s.card}>
            <label style={s.label}>Upload files <span style={{ fontWeight: 400, color: "#888" }}>(optional)</span></label>
            <div style={s.uploadArea} onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const dropped = Array.from(e.dataTransfer.files);
                setFiles((prev) => { const ex = prev.map(f => f.name); return [...prev, ...dropped.filter(f => !ex.includes(f.name))]; });
              }}>
              <span style={s.uploadIcon}>⬆</span>
              <p style={{ fontSize: 14, margin: "4px 0 0", color: "#666" }}>Drop syllabus, PYQs, or notes here</p>
              <span style={{ fontSize: 12, color: "#999" }}>PDF, images supported</span>
            </div>
            <input ref={fileInputRef} type="file" multiple accept=".pdf,.png,.jpg,.jpeg" style={{ display: "none" }}
              onChange={(e) => {
                const picked = Array.from(e.target.files || []);
                setFiles((prev) => { const ex = prev.map(f => f.name); return [...prev, ...picked.filter(f => !ex.includes(f.name))]; });
              }} />
            {files.length > 0 && (
              <div style={{ marginTop: 8 }}>
                {files.map((f, i) => (
                  <span key={i} style={s.fileChip}>📄 {f.name}
                    <button onClick={() => removeFile(i)} style={s.chipClose} aria-label={`Remove ${f.name}`}>×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {error && <div style={s.errorBox}>⚠ {error}</div>}

          <button onClick={handleSubmit} disabled={!canSubmit}
            style={{ ...s.goBtn, ...(canSubmit ? {} : s.goBtnDisabled) }}>
            ✨ Generate Study Plan
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={s.loadingBox}>
          <div style={s.spinner} />
          <p style={{ fontSize: 15, fontWeight: 500, marginTop: 12 }}>{loadingLabel}</p>
          <p style={{ fontSize: 13, color: "#888", marginTop: 4 }}>Your agents are working — this takes 10–20 seconds</p>
          <div style={s.stepRow}>
            {STEPS.map((step, i) => (
              <span key={i} style={{ ...s.stepBadge, ...(doneSteps.includes(i) ? s.stepDone : activeStep === i ? s.stepActive : {}) }}>
                {doneSteps.includes(i) ? "✓ " : ""}{step}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div>
          {/* Results header with confidence badge */}
          <div style={s.resultsHeader}>
            <div>
              <h2 style={s.h2}>Study Plan: {subject}</h2>
              {result.confidence_summary && (
                <span style={s.confidenceBadge}>
                  {result.confidence_summary.overall_confidence}% confidence · {result.confidence_summary.agreement_level}
                </span>
              )}
            </div>
            <button onClick={handleReset} style={s.resetBtn}>↺ New plan</button>
          </div>

          {/* Exam forecast banner */}
          {result.exam_forecast && (
            <div style={s.forecastBanner}>
              <div style={s.forecastItem}>
                <span style={s.forecastLabel}>Top topic</span>
                <span style={s.forecastValue}>{result.exam_forecast.most_important_topic}</span>
              </div>
              <div style={s.forecastItem}>
                <span style={s.forecastLabel}>Difficulty</span>
                <span style={s.forecastValue}>{result.exam_forecast.expected_difficulty}</span>
              </div>
              <div style={s.forecastItem}>
                <span style={s.forecastLabel}>Forecast confidence</span>
                <span style={s.forecastValue}>{result.exam_forecast.forecast_confidence}%</span>
              </div>
              {result.final_verdict && (
                <div style={s.forecastItem}>
                  <span style={s.forecastLabel}>Best unit</span>
                  <span style={s.forecastValue}>{result.final_verdict.best_unit_for_maximum_marks}</span>
                </div>
              )}
            </div>
          )}

          {/* Tabs */}
          <div style={s.tabs}>
            {TABS.map(([key, label]) => (
              <button key={key} onClick={() => setActiveTab(key)}
                style={{ ...s.tab, ...(activeTab === key ? s.tabActive : {}) }}>
                {label}
              </button>
            ))}
          </div>

          {/* ── Topics Tab ── */}
          {activeTab === "topics" && (
            <div>
              {result.do_not_skip && result.do_not_skip.length > 0 && (
                <div style={s.alertBox}>
                  🚨 <strong>Do not skip:</strong> {result.do_not_skip.join(" · ")}
                </div>
              )}
              <div style={s.grid}>
                {topics.length === 0 && <p style={s.empty}>No topics found in response.</p>}
                {topics.map((t, i) => {
                  const name = typeof t === "string" ? t : t.name || "";
                  const why = typeof t === "object" && "why" in t ? t.why : undefined;
                  const conf = typeof t === "object" && "confidence" in t ? t.confidence : undefined;
                  return (
                    <div key={i} style={s.topicCard}>
                      <div style={{ ...s.rank, ...(i < 3 ? s.rankHigh : i < 6 ? s.rankMed : {}) }}>{i + 1}</div>
                      <div style={{ flex: 1 }}>
                        <div style={s.topicName}>{name}</div>
                        {why && <div style={s.topicMeta}>{why}</div>}
                        {conf !== undefined && (
                          <div style={s.confBar}>
                            <div style={{ ...s.confFill, width: `${conf}%` }} />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {result.safe_to_skip && result.safe_to_skip.length > 0 && (
                <div style={{ ...s.alertBox, ...s.alertGray, marginTop: 16 }}>
                  ✓ <strong>Safe to skip:</strong> {result.safe_to_skip.join(" · ")}
                </div>
              )}
            </div>
          )}

          {/* ── Questions Tab ── */}
          {activeTab === "questions" && (
            <div style={s.list}>
              {questions.length === 0 && <p style={s.empty}>No predicted questions in response.</p>}
              {questions.map((q, i) => {
                const text = typeof q === "string" ? q : q.question || (q as { text?: string }).text || "";
                const type = typeof q === "object" && "type" in q ? (q.type || q.question_type || "likely") : "likely";
                const marks = typeof q === "object" && "marks" in q ? q.marks : undefined;
                const conf = typeof q === "object" && "confidence" in q ? q.confidence : undefined;
                const outline = typeof q === "object" && "answer_outline" in q ? q.answer_outline : undefined;
                const mistakes = typeof q === "object" && "common_mistakes" in q ? q.common_mistakes : undefined;
                const badgeStyle = type.toLowerCase().includes("theory") ? s.badgeTheory
                  : type.toLowerCase().includes("numerical") ? s.badgeNumerical
                  : type.toLowerCase().includes("long") ? s.badgeLong
                  : type.toLowerCase().includes("common") ? s.badgeCommon : s.badgeLikely;
                const isExpanded = expandedQ === i;
                return (
                  <div key={i} style={s.qCard}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                      <span style={s.qText}>{text}</span>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
                        {marks && <span style={s.marksBadge}>{marks}M</span>}
                        {conf && <span style={s.confText}>{conf}%</span>}
                        <span style={{ ...s.badge, ...badgeStyle }}>{type}</span>
                      </div>
                    </div>
                    {(outline?.length || mistakes?.length) && (
                      <button onClick={() => setExpandedQ(isExpanded ? null : i)} style={s.expandBtn}>
                        {isExpanded ? "▲ Hide details" : "▼ Show answer outline"}
                      </button>
                    )}
                    {isExpanded && (
                      <div style={s.expandPanel}>
                        {outline && outline.length > 0 && (
                          <div>
                            <div style={s.expandLabel}>Answer outline</div>
                            {outline.map((o, j) => <div key={j} style={s.outlineItem}>→ {o}</div>)}
                          </div>
                        )}
                        {mistakes && mistakes.length > 0 && (
                          <div style={{ marginTop: 8 }}>
                            <div style={s.expandLabel}>Common mistakes</div>
                            {mistakes.map((m, j) => <div key={j} style={{ ...s.outlineItem, color: "#b91c1c" }}>✗ {m}</div>)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Strategy Tab ── */}
          {activeTab === "strategy" && result.study_strategies && (
            <div>
              {/* Marks optimization */}
              {result.marks_optimization && (
                <div style={{ marginBottom: 20 }}>
                  <div style={s.sectionLabel}>Marks optimization</div>
                  {(["topics_for_40_percent","topics_for_50_percent","topics_for_60_percent","topics_for_75_percent","topics_for_90_percent"] as const).map((key) => {
                    const pct = key.replace("topics_for_","").replace("_percent","");
                    const topicList = result.marks_optimization![key];
                    if (!topicList?.length) return null;
                    return (
                      <div key={key} style={s.marksRow}>
                        <span style={{ ...s.marksPct, ...(parseInt(pct) >= 75 ? s.marksPctHigh : parseInt(pct) >= 60 ? s.marksPctMed : {}) }}>{pct}%</span>
                        <span style={s.marksTopics}>{topicList.join(" · ")}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Strategy selector */}
              <div style={s.sectionLabel}>Study strategies</div>
              <div style={s.strategyTabs}>
                {(["pass","first_class","distinction","topper"] as const).map(k => (
                  <button key={k} onClick={() => setActiveStrategy(k)}
                    style={{ ...s.stratTab, ...(activeStrategy === k ? s.stratTabActive : {}) }}>
                    {k === "pass" ? "Pass (40%)" : k === "first_class" ? "First Class (60%)" : k === "distinction" ? "Distinction (75%)" : "Topper (90%)"}
                  </button>
                ))}
              </div>
              {(() => {
                const strat = result.study_strategies![`${activeStrategy}_strategy`];
                if (!strat) return null;
                return (
                  <div style={s.stratCard}>
                    <div style={s.stratMeta}>
                      <span>🎯 Expected: <strong>{strat.expected_marks}</strong></span>
                      <span>⏱ Hours: <strong>{strat.study_hours}</strong></span>
                    </div>
                    <div style={s.stratTopics}>
                      {strat.topics?.map((t, i) => <span key={i} style={s.stratTopic}>{t}</span>)}
                    </div>
                  </div>
                );
              })()}

              {/* Priority matrix */}
              {result.priority_matrix && (
                <div style={{ marginTop: 20 }}>
                  <div style={s.sectionLabel}>Priority matrix</div>
                  <div style={s.matrixGrid}>
                    {([
                      ["high_impact_low_effort", "High impact · Low effort", "#f0fdf4", "#166534"],
                      ["high_impact_high_effort", "High impact · High effort", "#fffbeb", "#92400e"],
                      ["low_impact_low_effort", "Low impact · Low effort", "#f9fafb", "#6b7280"],
                      ["low_impact_high_effort", "Low impact · High effort", "#fef2f2", "#991b1b"],
                    ] as const).map(([key, label, bg, color]) => {
                      const items = result.priority_matrix![key];
                      if (!items?.length) return null;
                      return (
                        <div key={key} style={{ ...s.matrixCard, background: bg }}>
                          <div style={{ ...s.matrixLabel, color }}>{label}</div>
                          {items.map((item, i) => <div key={i} style={{ ...s.matrixItem, color }}>{item}</div>)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Study Plan Tab ── */}
          {activeTab === "plan" && (
            <div>
              {result.revision_plans && (
                <div style={s.planTabs}>
                  {(["24_hours","3_days","7_days","15_days"] as const).map(k => (
                    <button key={k} onClick={() => setActivePlan(k)}
                      style={{ ...s.stratTab, ...(activePlan === k ? s.stratTabActive : {}) }}>
                      {k.replace("_"," ")}
                    </button>
                  ))}
                </div>
              )}
              <div style={s.list}>
                {plan.length === 0 && <p style={s.empty}>No study plan in response.</p>}
                {plan.map((p, i) => {
                  const time = typeof p === "object" ? ((p as {time?:string}).time || (p as {hour?:string}).hour || (p as {slot?:string}).slot || "") : "";
                  const task = typeof p === "string" ? p : ((p as {task?:string}).task || (p as {topic?:string}).topic || (p as {activity?:string}).activity || "");
                  const detail = typeof p === "object" ? ((p as {detail?:string}).detail || (p as {description?:string}).description || (p as {objective?:string}).objective || "") : "";
                  const hours = typeof p === "object" ? (p as {hours?:string|number}).hours : undefined;
                  return (
                    <div key={i} style={s.planCard}>
                      {time && <div style={s.planTime}>{time}</div>}
                      <div style={{ flex: 1 }}>
                        <div style={s.planTask}>{task}</div>
                        {hours && <div style={s.planDetail}>⏱ {hours} hrs</div>}
                        {detail && <div style={s.planDetail}>{detail}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
              {notes && (
                <div style={{ ...s.notesBlock, marginTop: 16 }}>{notes}</div>
              )}
            </div>
          )}

          {/* ── Answer Guide Tab ── */}
          {activeTab === "answer" && (
            <div style={s.list}>
              {(!result.answer_writing_intelligence || result.answer_writing_intelligence.length === 0) && (
                <p style={s.empty}>No answer writing guide in response.</p>
              )}
              {result.answer_writing_intelligence?.map((a, i) => (
                <div key={i} style={s.answerCard}>
                  <div style={s.answerTopic}>{a.topic}</div>
                  {a.ideal_structure?.length > 0 && (
                    <div style={s.answerSection}>
                      <div style={s.answerSectionLabel}>✏ Ideal answer structure</div>
                      {a.ideal_structure.map((item, j) => <div key={j} style={s.answerItem}>{j+1}. {item}</div>)}
                    </div>
                  )}
                  {a.must_draw_diagrams?.length > 0 && (
                    <div style={s.answerSection}>
                      <div style={s.answerSectionLabel}>📐 Must draw diagrams</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {a.must_draw_diagrams.map((d, j) => <span key={j} style={s.diagramBadge}>{d}</span>)}
                      </div>
                    </div>
                  )}
                  {a.key_definitions?.length > 0 && (
                    <div style={s.answerSection}>
                      <div style={s.answerSectionLabel}>📖 Key definitions</div>
                      {a.key_definitions.map((d, j) => <div key={j} style={s.answerItem}>→ {d}</div>)}
                    </div>
                  )}
                  {a.examiner_expectations?.length > 0 && (
                    <div style={s.answerSection}>
                      <div style={s.answerSectionLabel}>🎯 Examiner expects</div>
                      {a.examiner_expectations.map((e, j) => <div key={j} style={s.answerItem}>✓ {e}</div>)}
                    </div>
                  )}
                  {a.common_mistakes?.length > 0 && (
                    <div style={s.answerSection}>
                      <div style={s.answerSectionLabel}>⚠ Common mistakes</div>
                      {a.common_mistakes.map((m, j) => <div key={j} style={{ ...s.answerItem, color: "#b91c1c" }}>✗ {m}</div>)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── Risk Analysis Tab ── */}
          {activeTab === "risk" && (
            <div style={s.list}>
              {result.risk_analysis && (
                <>
                  {result.risk_analysis.hidden_high_importance_topics?.length > 0 && (
                    <div style={{ ...s.riskCard, borderLeftColor: "#7c3aed" }}>
                      <div style={{ ...s.riskLabel, color: "#7c3aed" }}>🔍 Hidden high-importance topics</div>
                      {result.risk_analysis.hidden_high_importance_topics.map((t, i) => <div key={i} style={s.riskItem}>{t}</div>)}
                    </div>
                  )}
                  {result.risk_analysis.high_failure_risk_topics?.length > 0 && (
                    <div style={{ ...s.riskCard, borderLeftColor: "#dc2626" }}>
                      <div style={{ ...s.riskLabel, color: "#dc2626" }}>🚨 High failure risk</div>
                      {result.risk_analysis.high_failure_risk_topics.map((t, i) => <div key={i} style={s.riskItem}>{t}</div>)}
                    </div>
                  )}
                  {result.risk_analysis.overhyped_topics?.length > 0 && (
                    <div style={{ ...s.riskCard, borderLeftColor: "#d97706" }}>
                      <div style={{ ...s.riskLabel, color: "#d97706" }}>📢 Overhyped topics</div>
                      {result.risk_analysis.overhyped_topics.map((t, i) => <div key={i} style={s.riskItem}>{t}</div>)}
                    </div>
                  )}
                  {result.risk_analysis.underestimated_topics?.length > 0 && (
                    <div style={{ ...s.riskCard, borderLeftColor: "#0891b2" }}>
                      <div style={{ ...s.riskLabel, color: "#0891b2" }}>💡 Underestimated topics</div>
                      {result.risk_analysis.underestimated_topics.map((t, i) => <div key={i} style={s.riskItem}>{t}</div>)}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Forecast Tab ── */}
          {activeTab === "forecast" && result.exam_forecast && (
            <div>
              <div style={s.forecastGrid}>
                {[
                  ["Most important topic", result.exam_forecast.most_important_topic],
                  ["Most likely theory Q", result.exam_forecast.most_likely_theory],
                  ["Most likely long Q", result.exam_forecast.most_likely_long_question],
                  ["Most likely numerical", result.exam_forecast.most_likely_numerical],
                  ["Most likely diagram", result.exam_forecast.most_likely_diagram],
                  ["Expected difficulty", result.exam_forecast.expected_difficulty],
                ].map(([label, value]) => value && (
                  <div key={label} style={s.forecastCard}>
                    <div style={s.forecastCardLabel}>{label}</div>
                    <div style={s.forecastCardValue}>{value}</div>
                  </div>
                ))}
              </div>
              {result.final_verdict && (
                <div style={s.verdictCard}>
                  <div style={s.sectionLabel}>Final verdict</div>
                  {[
                    ["Single best topic to master", result.final_verdict.single_best_topic_to_master],
                    ["Minimum prep to pass", result.final_verdict.minimum_preparation_for_pass],
                    ["Recommended strategy", result.final_verdict.recommended_strategy],
                    ["Highest return topic", result.final_verdict.highest_return_topic],
                    ["Most predictable question", result.final_verdict.most_predictable_question],
                  ].map(([label, value]) => value && (
                    <div key={label} style={s.verdictRow}>
                      <span style={s.verdictLabel}>{label}</span>
                      <span style={s.verdictValue}>{value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  app: { maxWidth: 860, margin: "0 auto", padding: "2rem 1.25rem", fontFamily: "system-ui, -apple-system, sans-serif" },
  header: { marginBottom: "2rem" },
  h1: { fontSize: 22, fontWeight: 600, margin: 0 },
  h2: { fontSize: 18, fontWeight: 600, margin: 0 },
  subtitle: { fontSize: 14, color: "#666", marginTop: 4 },
  card: { border: "1px solid #e5e7eb", borderRadius: 12, padding: "1rem 1.25rem", marginBottom: "1rem", background: "#fff" },
  label: { fontSize: 13, fontWeight: 500, color: "#555", display: "block", marginBottom: 8 },
  input: { width: "100%", padding: "10px 12px", fontSize: 14, border: "1px solid #d1d5db", borderRadius: 8, outline: "none", boxSizing: "border-box" },
  pillRow: { display: "flex", gap: 8, flexWrap: "wrap" },
  pill: { padding: "7px 16px", borderRadius: 20, fontSize: 13, border: "1px solid #d1d5db", cursor: "pointer", background: "transparent", color: "#555" },
  pillActive: { background: "#ede9fe", borderColor: "#a78bfa", color: "#4c1d95" },
  uploadArea: { border: "1.5px dashed #d1d5db", borderRadius: 8, padding: "1.5rem", textAlign: "center", cursor: "pointer", marginTop: 4 },
  uploadIcon: { fontSize: 22, display: "block", color: "#999" },
  fileChip: { display: "inline-flex", alignItems: "center", gap: 6, background: "#f3f4f6", borderRadius: 20, padding: "4px 10px", fontSize: 12, color: "#555", marginRight: 4, marginTop: 4 },
  chipClose: { background: "none", border: "none", cursor: "pointer", color: "#999", fontSize: 16, lineHeight: 1, padding: 0 },
  goBtn: { width: "100%", padding: 14, background: "#7c3aed", color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 500, cursor: "pointer", marginTop: 8 },
  goBtnDisabled: { background: "#e5e7eb", color: "#9ca3af", cursor: "not-allowed" },
  errorBox: { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", fontSize: 14, color: "#b91c1c", marginTop: 8 },
  loadingBox: { textAlign: "center", padding: "3rem 1rem" },
  spinner: { width: 36, height: 36, border: "3px solid #e5e7eb", borderTopColor: "#7c3aed", borderRadius: "50%", margin: "0 auto", animation: "spin 0.8s linear infinite" },
  stepRow: { display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 20 },
  stepBadge: { padding: "4px 12px", borderRadius: 20, fontSize: 12, border: "1px solid #e5e7eb", color: "#9ca3af" },
  stepActive: { background: "#ede9fe", borderColor: "#a78bfa", color: "#4c1d95" },
  stepDone: { background: "#f0fdf4", borderColor: "#86efac", color: "#166534" },
  resultsHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" },
  confidenceBadge: { fontSize: 12, color: "#7c3aed", background: "#ede9fe", padding: "2px 10px", borderRadius: 10, marginTop: 4, display: "inline-block" },
  resetBtn: { background: "none", border: "1px solid #d1d5db", borderRadius: 8, padding: "6px 14px", fontSize: 13, cursor: "pointer", color: "#555", flexShrink: 0 },
  forecastBanner: { display: "flex", gap: 12, background: "#1e1b4b", borderRadius: 10, padding: "12px 16px", marginBottom: "1.25rem", flexWrap: "wrap" },
  forecastItem: { display: "flex", flexDirection: "column", gap: 2, minWidth: 120 },
  forecastLabel: { fontSize: 11, color: "#a5b4fc", textTransform: "uppercase" as const, letterSpacing: "0.05em" },
  forecastValue: { fontSize: 13, fontWeight: 500, color: "#fff" },
  tabs: { display: "flex", gap: 0, borderBottom: "1px solid #e5e7eb", marginBottom: "1.25rem", overflowX: "auto" },
  tab: { padding: "9px 14px", fontSize: 13, cursor: "pointer", color: "#666", background: "none", border: "none", borderBottom: "2px solid transparent", whiteSpace: "nowrap" },
  tabActive: { color: "#7c3aed", borderBottomColor: "#7c3aed", fontWeight: 500 },
  alertBox: { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#991b1b", marginBottom: 12 },
  alertGray: { background: "#f0fdf4", borderColor: "#bbf7d0", color: "#166534" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 },
  topicCard: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "flex-start", gap: 10 },
  rank: { width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, flexShrink: 0, background: "#ede9fe", color: "#4c1d95" },
  rankHigh: { background: "#fef2f2", color: "#991b1b" },
  rankMed: { background: "#fffbeb", color: "#92400e" },
  topicName: { fontSize: 14, fontWeight: 500 },
  topicMeta: { fontSize: 12, color: "#888", marginTop: 2 },
  confBar: { height: 3, background: "#e5e7eb", borderRadius: 2, marginTop: 6, overflow: "hidden" },
  confFill: { height: "100%", background: "#7c3aed", borderRadius: 2 },
  list: { display: "flex", flexDirection: "column", gap: 10 },
  qCard: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "12px 14px" },
  qText: { fontSize: 14, flex: 1 },
  badge: { fontSize: 11, padding: "2px 9px", borderRadius: 10, whiteSpace: "nowrap", flexShrink: 0 },
  badgeLikely: { background: "#fef2f2", color: "#991b1b" },
  badgeCommon: { background: "#fffbeb", color: "#92400e" },
  badgeTheory: { background: "#ede9fe", color: "#4c1d95" },
  badgeNumerical: { background: "#ecfdf5", color: "#065f46" },
  badgeLong: { background: "#eff6ff", color: "#1e40af" },
  marksBadge: { fontSize: 11, padding: "2px 7px", borderRadius: 8, background: "#f3f4f6", color: "#374151", fontWeight: 600 },
  confText: { fontSize: 11, color: "#7c3aed", fontWeight: 500 },
  expandBtn: { background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#7c3aed", marginTop: 8, padding: 0 },
  expandPanel: { background: "#f9fafb", borderRadius: 8, padding: "10px 12px", marginTop: 8 },
  expandLabel: { fontSize: 11, fontWeight: 600, color: "#555", marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: "0.04em" },
  outlineItem: { fontSize: 13, color: "#374151", marginBottom: 3 },
  sectionLabel: { fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 10 },
  marksRow: { display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "1px solid #f3f4f6" },
  marksPct: { fontSize: 13, fontWeight: 700, color: "#6b7280", minWidth: 36 },
  marksPctMed: { color: "#d97706" },
  marksPctHigh: { color: "#7c3aed" },
  marksTopics: { fontSize: 13, color: "#374151" },
  strategyTabs: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 },
  stratTab: { padding: "6px 14px", borderRadius: 8, fontSize: 13, border: "1px solid #d1d5db", cursor: "pointer", background: "transparent", color: "#555" },
  stratTabActive: { background: "#ede9fe", borderColor: "#a78bfa", color: "#4c1d95", fontWeight: 500 },
  stratCard: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "1rem 1.25rem" },
  stratMeta: { display: "flex", gap: 20, fontSize: 14, color: "#555", marginBottom: 12 },
  stratTopics: { display: "flex", flexWrap: "wrap", gap: 8 },
  stratTopic: { background: "#f3f4f6", borderRadius: 6, padding: "4px 10px", fontSize: 13, color: "#374151" },
  matrixGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  matrixCard: { borderRadius: 10, padding: "12px 14px" },
  matrixLabel: { fontSize: 12, fontWeight: 600, marginBottom: 6 },
  matrixItem: { fontSize: 13, marginBottom: 3 },
  planTabs: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 },
  planCard: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "flex-start", gap: 12 },
  planTime: { fontSize: 12, color: "#666", background: "#f9fafb", borderRadius: 8, padding: "4px 10px", whiteSpace: "nowrap", minWidth: 70, textAlign: "center", flexShrink: 0 },
  planTask: { fontSize: 14, fontWeight: 500 },
  planDetail: { fontSize: 12, color: "#888", marginTop: 2 },
  notesBlock: { background: "#f9fafb", borderRadius: 10, padding: "1rem 1.25rem", fontSize: 14, lineHeight: 1.75, whiteSpace: "pre-line" },
  answerCard: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "1rem 1.25rem" },
  answerTopic: { fontSize: 15, fontWeight: 600, marginBottom: 10, color: "#1e1b4b" },
  answerSection: { marginBottom: 10 },
  answerSectionLabel: { fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: 4 },
  answerItem: { fontSize: 13, color: "#374151", marginBottom: 3 },
  diagramBadge: { background: "#eff6ff", color: "#1e40af", fontSize: 12, padding: "3px 10px", borderRadius: 6 },
  riskCard: { background: "#fff", border: "1px solid #e5e7eb", borderLeft: "4px solid #e5e7eb", borderRadius: 10, padding: "12px 14px" },
  riskLabel: { fontSize: 13, fontWeight: 600, marginBottom: 8 },
  riskItem: { fontSize: 13, color: "#374151", marginBottom: 4 },
  forecastGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10, marginBottom: 16 },
  forecastCard: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "12px 14px" },
  forecastCardLabel: { fontSize: 11, color: "#9ca3af", marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: "0.04em" },
  forecastCardValue: { fontSize: 14, fontWeight: 500, color: "#111" },
  verdictCard: { background: "#1e1b4b", borderRadius: 12, padding: "1.25rem" },
  verdictRow: { display: "flex", flexDirection: "column", gap: 2, marginBottom: 12 },
  verdictLabel: { fontSize: 11, color: "#a5b4fc", textTransform: "uppercase" as const, letterSpacing: "0.05em" },
  verdictValue: { fontSize: 14, fontWeight: 500, color: "#fff" },
  empty: { fontSize: 14, color: "#888" },
};
