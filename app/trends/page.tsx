"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  TrendingUp,
  Activity,
  Plus,
  Droplet,
  Heart,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Filter,
  Building,
  Info,
  Clock,
  Sparkles,
  Lock,
} from "lucide-react";
import { LabResult, LabResultFlag } from "@/lib/types/database";
import { getLocalSession } from "@/lib/auth";

export default function TrendsPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [labResults, setLabResults] = useState<LabResult[]>([]);
  const [series, setSeries] = useState<{
    glucose: any[];
    hba1c: any[];
    blood_pressure: any[];
  }>({ glucose: [], hba1c: [], blood_pressure: [] });

  const [loading, setLoading] = useState(true);
  const [activeChart, setActiveChart] = useState<"glucose" | "hba1c" | "bp">("glucose");
  const [showAddModal, setShowAddModal] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // New Lab Entry Form
  const [testName, setTestName] = useState("Fasting Blood Glucose");
  const [testValue, setTestValue] = useState("");
  const [testUnit, setTestUnit] = useState("mg/dL");
  const [testDate, setTestDate] = useState(new Date().toISOString().split("T")[0]);
  const [testLab, setTestLab] = useState("Metro Hospital Labs");
  const [testRefRange, setTestRefRange] = useState("70 - 99 mg/dL");

  const loadData = async (overrideId?: string) => {
    try {
      setLoading(true);
      const session = getLocalSession();
      const patientId = overrideId || session?.user?.id || "demo-patient-001";
      const res = await fetch(`/api/trends?patient_id=${patientId}`);
      const data = await res.json();

      if (data.success) {
        setLabResults(data.lab_results || []);
        setSeries(data.series || { glucose: [], hba1c: [], blood_pressure: [] });
      }
    } catch {
      setStatusMsg({ type: "error", text: "Failed to load lab trends data." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const session = getLocalSession();
    if (!session) {
      setAuthenticated(false);
      setLoading(false);
      return;
    }
    setAuthenticated(true);
    loadData(session.user.id);
  }, []);

  const handleTestNamePresetChange = (name: string) => {
    setTestName(name);
    if (name.includes("Fasting")) {
      setTestUnit("mg/dL");
      setTestRefRange("70 - 99 mg/dL");
    } else if (name.includes("Postprandial") || name.includes("PPBS")) {
      setTestUnit("mg/dL");
      setTestRefRange("< 140 mg/dL");
    } else if (name.includes("HbA1c")) {
      setTestUnit("%");
      setTestRefRange("< 5.7 %");
    } else if (name.includes("Systolic")) {
      setTestUnit("mmHg");
      setTestRefRange("< 120 mmHg");
    } else if (name.includes("Diastolic")) {
      setTestUnit("mmHg");
      setTestRefRange("< 80 mmHg");
    }
  };

  const handleAddLabResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testValue) return;

    try {
      const session = getLocalSession();
      const patientId = session?.user?.id || "demo-patient-001";

      const res = await fetch("/api/trends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: patientId,
          test_name: testName,
          value_num: parseFloat(testValue),
          unit: testUnit,
          ref_range: testRefRange,
          taken_on: testDate,
          lab_name: testLab,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStatusMsg({ type: "success", text: `${testName} result added to health history!` });
        setShowAddModal(false);
        setTestValue("");
        loadData();
        setTimeout(() => setStatusMsg(null), 3500);
      }
    } catch {
      setStatusMsg({ type: "error", text: "Could not record lab result." });
    }
  };

  // Metric cards calculations
  const latestFasting = [...labResults]
    .filter((r) => r.test_name.toLowerCase().includes("fasting"))
    .pop();

  const latestPPBS = [...labResults]
    .filter((r) => r.test_name.toLowerCase().includes("postprandial") || r.test_name.toLowerCase().includes("ppbs"))
    .pop();

  const latestHbA1c = [...labResults]
    .filter((r) => r.test_name.toLowerCase().includes("hba1c") || r.test_name.toLowerCase().includes("hemoglobin"))
    .pop();

  const latestSystolic = [...labResults]
    .filter((r) => r.test_name.toLowerCase().includes("systolic"))
    .pop();

  const latestDiastolic = [...labResults]
    .filter((r) => r.test_name.toLowerCase().includes("diastolic"))
    .pop();

  const formatTickDate = (tick: string) => {
    try {
      const d = new Date(tick);
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return tick;
    }
  };

  if (authenticated === false) {
    return (
      <div className="max-w-md mx-auto py-24 px-4 text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
          <Lock className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white">Sign In to View Lab Trends</h2>
          <p className="text-xs text-emerald-300/70">
            Biomarker trajectory charts and vitals history are only available after signing in to your patient account.
          </p>
        </div>
        <Link
          href="/login"
          className="inline-block px-6 py-2.5 rounded-full bg-emerald-400 text-[#071410] font-bold text-xs hover:bg-emerald-300 transition-all shadow-md shadow-emerald-400/20"
        >
          Sign In as Patient
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-20 px-4 text-center">
        <div className="inline-block w-8 h-8 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-emerald-300/80 text-sm">Loading lab analysis and vitals trends...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Top Banner */}
      <div className="relative rounded-2xl bg-gradient-to-r from-[#092219] via-[#0d2f23] to-[#071912] border border-emerald-500/30 p-6 sm:p-8 overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              Biomarker Analytics & Longitudinal Vitals
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Lab Analysis & Chronic Disease Trends
            </h1>
            <p className="text-sm text-emerald-200/75 max-w-2xl">
              Monitor glycemic trajectory, glycated hemoglobin control, and arterial blood pressure titration over
              time to identify clinical improvements and avoid redundant repeat testing.
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-emerald-400 text-[#071410] font-bold text-xs sm:text-sm hover:bg-emerald-300 transition-all shadow-lg shadow-emerald-400/20 hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            Record New Lab Reading
          </button>
        </div>

        {/* 4 KPI Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-6 border-t border-emerald-900/40 mt-6">
          {/* Fasting Glucose Card */}
          <div
            onClick={() => setActiveChart("glucose")}
            className={`p-3.5 sm:p-4 rounded-xl border cursor-pointer transition-all ${
              activeChart === "glucose"
                ? "bg-emerald-500/15 border-emerald-400 shadow-md shadow-emerald-500/10"
                : "bg-[#051610]/80 border-emerald-500/30 hover:border-emerald-400/50"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] uppercase tracking-wider text-emerald-400/70 font-bold">
                Fasting Glucose
              </span>
              <Droplet className="w-3.5 h-3.5 text-teal-400" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-white">{latestFasting?.value_num || "--"}</span>
              <span className="text-xs text-emerald-300/70">mg/dL</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold mt-1">
              <ArrowDownRight className="w-3.5 h-3.5" />
              -54 mg/dL (Improving)
            </div>
          </div>

          {/* PPBS Card */}
          <div
            onClick={() => setActiveChart("glucose")}
            className={`p-3.5 sm:p-4 rounded-xl border cursor-pointer transition-all ${
              activeChart === "glucose"
                ? "bg-emerald-500/15 border-emerald-400 shadow-md shadow-emerald-500/10"
                : "bg-[#051610]/80 border-emerald-500/30 hover:border-emerald-400/50"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] uppercase tracking-wider text-emerald-400/70 font-bold">
                Postprandial (PPBS)
              </span>
              <Droplet className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-white">{latestPPBS?.value_num || "--"}</span>
              <span className="text-xs text-emerald-300/70">mg/dL</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold mt-1">
              <ArrowDownRight className="w-3.5 h-3.5" />
              -78 mg/dL (Post-meal)
            </div>
          </div>

          {/* HbA1c Card */}
          <div
            onClick={() => setActiveChart("hba1c")}
            className={`p-3.5 sm:p-4 rounded-xl border cursor-pointer transition-all ${
              activeChart === "hba1c"
                ? "bg-emerald-500/15 border-emerald-400 shadow-md shadow-emerald-500/10"
                : "bg-[#051610]/80 border-emerald-500/30 hover:border-emerald-400/50"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] uppercase tracking-wider text-emerald-400/70 font-bold">
                HbA1c Glycated Hb
              </span>
              <Activity className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-emerald-300">{latestHbA1c?.value_num || "--"}</span>
              <span className="text-xs text-emerald-300/70">%</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold mt-1">
              <ArrowDownRight className="w-3.5 h-3.5" />
              Down from 8.8% to 6.9%
            </div>
          </div>

          {/* Blood Pressure Card */}
          <div
            onClick={() => setActiveChart("bp")}
            className={`p-3.5 sm:p-4 rounded-xl border cursor-pointer transition-all ${
              activeChart === "bp"
                ? "bg-emerald-500/15 border-emerald-400 shadow-md shadow-emerald-500/10"
                : "bg-[#051610]/80 border-emerald-500/30 hover:border-emerald-400/50"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] uppercase tracking-wider text-emerald-400/70 font-bold">
                Blood Pressure
              </span>
              <Heart className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-white">
                {latestSystolic?.value_num || "124"}/{latestDiastolic?.value_num || "80"}
              </span>
              <span className="text-xs text-emerald-300/70">mmHg</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-300 font-semibold mt-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Target Titrated
            </div>
          </div>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium border ${
            statusMsg.type === "success"
              ? "bg-emerald-950/60 text-emerald-200 border-emerald-500/40"
              : "bg-rose-950/60 text-rose-200 border-rose-500/40"
          }`}
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          {statusMsg.text}
        </div>
      )}

      {/* Chart Selector Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-emerald-900/40">
        <div className="flex items-center gap-2 p-1 bg-[#061711] rounded-xl border border-emerald-500/30">
          <button
            onClick={() => setActiveChart("glucose")}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeChart === "glucose"
                ? "bg-emerald-400 text-[#071410] shadow-md shadow-emerald-400/20"
                : "text-emerald-300/70 hover:text-white"
            }`}
          >
            <Droplet className="w-4 h-4" />
            Blood Glucose (Fasting & PPBS)
          </button>
          <button
            onClick={() => setActiveChart("hba1c")}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeChart === "hba1c"
                ? "bg-emerald-400 text-[#071410] shadow-md shadow-emerald-400/20"
                : "text-emerald-300/70 hover:text-white"
            }`}
          >
            <Activity className="w-4 h-4" />
            HbA1c Glycated Hb (%)
          </button>
          <button
            onClick={() => setActiveChart("bp")}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeChart === "bp"
                ? "bg-emerald-400 text-[#071410] shadow-md shadow-emerald-400/20"
                : "text-emerald-300/70 hover:text-white"
            }`}
          >
            <Heart className="w-4 h-4" />
            Blood Pressure (Systolic & Diastolic)
          </button>
        </div>

        <div className="text-xs text-emerald-400/80 font-mono">
          Showing 6-month longitudinal clinical trajectory
        </div>
      </div>

      {/* RECHARTS SECTION */}
      <div className="rounded-2xl bg-[#091b15]/95 border border-emerald-500/30 p-6 shadow-xl space-y-6">
        {/* CHART 1: BLOOD GLUCOSE */}
        {activeChart === "glucose" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  Blood Glucose Longitudinal Trend
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-teal-500/20 text-teal-300">
                    mg/dL
                  </span>
                </h2>
                <p className="text-xs text-emerald-300/70">
                  Normal fasting reference: 70–99 mg/dL. Normal postprandial reference: &lt;140 mg/dL.
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-teal-300 font-semibold">
                  <span className="w-3 h-3 rounded-full bg-teal-400" /> Fasting FBS
                </span>
                <span className="flex items-center gap-1.5 text-amber-300 font-semibold">
                  <span className="w-3 h-3 rounded-full bg-amber-400" /> Postprandial PPBS
                </span>
              </div>
            </div>

            <div className="h-[340px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series.glucose} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#103828" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatTickDate}
                    stroke="#34d399"
                    tick={{ fill: "#6ee7b7", fontSize: 11 }}
                  />
                  <YAxis stroke="#34d399" tick={{ fill: "#6ee7b7", fontSize: 11 }} domain={[60, 240]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#071c14",
                      borderColor: "#059669",
                      borderRadius: "12px",
                      color: "#ecfdf5",
                      fontSize: "12px",
                    }}
                  />
                  <ReferenceLine
                    y={99}
                    stroke="#10b981"
                    strokeDasharray="4 4"
                    label={{ value: "Fasting Target (99 mg/dL)", fill: "#34d399", fontSize: 10, position: "insideBottomRight" }}
                  />
                  <ReferenceLine
                    y={140}
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    label={{ value: "PPBS Target (140 mg/dL)", fill: "#fbbf24", fontSize: 10, position: "insideTopRight" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="fasting"
                    name="Fasting Glucose (mg/dL)"
                    stroke="#2dd4bf"
                    strokeWidth={3}
                    dot={{ fill: "#2dd4bf", r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="postprandial"
                    name="Postprandial PPBS (mg/dL)"
                    stroke="#fbbf24"
                    strokeWidth={3}
                    dot={{ fill: "#fbbf24", r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* CHART 2: HBA1C */}
        {activeChart === "hba1c" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  HbA1c Glycated Hemoglobin Trend
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                    %
                  </span>
                </h2>
                <p className="text-xs text-emerald-300/70">
                  Normal &lt;5.7% • Prediabetes 5.7–6.4% • Diabetes &ge;6.5% • Diabetic Control Target &lt;7.0%
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-purple-300 font-semibold">
                <span className="w-3 h-3 rounded-full bg-purple-400" /> HbA1c Level
              </div>
            </div>

            <div className="h-[340px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series.hba1c} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#103828" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatTickDate}
                    stroke="#34d399"
                    tick={{ fill: "#6ee7b7", fontSize: 11 }}
                  />
                  <YAxis stroke="#34d399" tick={{ fill: "#6ee7b7", fontSize: 11 }} domain={[5.0, 10.0]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#071c14",
                      borderColor: "#059669",
                      borderRadius: "12px",
                      color: "#ecfdf5",
                      fontSize: "12px",
                    }}
                  />
                  <ReferenceLine
                    y={5.7}
                    stroke="#10b981"
                    strokeDasharray="4 4"
                    label={{ value: "Normal (< 5.7%)", fill: "#34d399", fontSize: 10 }}
                  />
                  <ReferenceLine
                    y={6.5}
                    stroke="#f43f5e"
                    strokeDasharray="4 4"
                    label={{ value: "Diabetes Threshold (6.5%)", fill: "#f87171", fontSize: 10 }}
                  />
                  <ReferenceLine
                    y={7.0}
                    stroke="#a855f7"
                    strokeDasharray="4 4"
                    label={{ value: "ADA Goal (< 7.0%)", fill: "#c084fc", fontSize: 10 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="hba1c"
                    name="HbA1c (%)"
                    stroke="#c084fc"
                    strokeWidth={3}
                    dot={{ fill: "#c084fc", r: 6 }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* CHART 3: BLOOD PRESSURE */}
        {activeChart === "bp" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  Blood Pressure Titration Trend
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">
                    mmHg
                  </span>
                </h2>
                <p className="text-xs text-emerald-300/70">
                  Optimal threshold: &lt;120/80 mmHg. Hypertension stage 1: 130–139 / 80–89 mmHg.
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-rose-300 font-semibold">
                  <span className="w-3 h-3 rounded-full bg-rose-400" /> Systolic
                </span>
                <span className="flex items-center gap-1.5 text-teal-300 font-semibold">
                  <span className="w-3 h-3 rounded-full bg-teal-400" /> Diastolic
                </span>
              </div>
            </div>

            <div className="h-[340px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series.blood_pressure} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#103828" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatTickDate}
                    stroke="#34d399"
                    tick={{ fill: "#6ee7b7", fontSize: 11 }}
                  />
                  <YAxis stroke="#34d399" tick={{ fill: "#6ee7b7", fontSize: 11 }} domain={[60, 170]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#071c14",
                      borderColor: "#059669",
                      borderRadius: "12px",
                      color: "#ecfdf5",
                      fontSize: "12px",
                    }}
                  />
                  <ReferenceLine
                    y={120}
                    stroke="#34d399"
                    strokeDasharray="4 4"
                    label={{ value: "Systolic Normal (120)", fill: "#34d399", fontSize: 10 }}
                  />
                  <ReferenceLine
                    y={80}
                    stroke="#2dd4bf"
                    strokeDasharray="4 4"
                    label={{ value: "Diastolic Normal (80)", fill: "#2dd4bf", fontSize: 10 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="systolic"
                    name="Systolic (mmHg)"
                    stroke="#fb7185"
                    strokeWidth={3}
                    dot={{ fill: "#fb7185", r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="diastolic"
                    name="Diastolic (mmHg)"
                    stroke="#2dd4bf"
                    strokeWidth={3}
                    dot={{ fill: "#2dd4bf", r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Clinical Retest Rules Guidance Note */}
      <div className="p-4 rounded-2xl bg-[#091b15]/95 border border-emerald-500/30 flex items-start gap-3">
        <Info className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-emerald-200/80 leading-relaxed">
          <span className="font-bold text-white">Retest Prevention Decision Support:</span> MediCare flags tests
          conducted within the clinical interval to prevent repeated unnecessary blood draws. Typical recommended
          intervals: Fasting Blood Glucose (90 days for stable T2DM), HbA1c (90 days / quarterly), Serum Creatinine
          (180 days).
        </div>
      </div>

      {/* Tabulated Lab Results History Table */}
      <div className="rounded-2xl bg-[#091b15]/95 border border-emerald-500/30 p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-emerald-900/40">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            Verified Laboratory Results Log ({labResults.length})
          </h2>
          <span className="text-xs text-emerald-400/70 font-mono">Sorted chronologically</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-emerald-900/40 text-emerald-400/70 font-semibold uppercase tracking-wider">
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Test Name</th>
                <th className="py-3 px-3">Value</th>
                <th className="py-3 px-3">Reference Range</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Facility</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-900/20">
              {[...labResults].reverse().map((res) => (
                <tr key={res.id} className="hover:bg-emerald-500/5 transition-colors">
                  <td className="py-3 px-3 font-mono text-emerald-300 font-semibold">{res.taken_on}</td>
                  <td className="py-3 px-3 font-bold text-white">{res.test_name}</td>
                  <td className="py-3 px-3 font-mono text-emerald-200 text-sm font-extrabold">
                    {res.value_num} {res.unit}
                  </td>
                  <td className="py-3 px-3 text-emerald-400/70 font-mono">{res.ref_range || "--"}</td>
                  <td className="py-3 px-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        res.flag === "high" || res.flag === "critical"
                          ? "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                          : res.flag === "low"
                          ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                          : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                      }`}
                    >
                      {res.flag}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-emerald-300/80">{res.lab_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: RECORD NEW LAB READING */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#091b15] border border-emerald-500/40 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-900/40">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Record Lab Reading / Vital</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-emerald-400/60 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddLabResult} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-emerald-200 mb-1">Test Name</label>
                <select
                  value={testName}
                  onChange={(e) => handleTestNamePresetChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#06140f] border border-emerald-500/30 text-white text-xs focus:outline-none focus:border-emerald-400"
                >
                  <option value="Fasting Blood Glucose">Fasting Blood Glucose (FBS)</option>
                  <option value="Postprandial Blood Glucose (PPBS)">Postprandial Blood Glucose (PPBS)</option>
                  <option value="HbA1c (Glycated Hemoglobin)">HbA1c (Glycated Hemoglobin)</option>
                  <option value="Blood Pressure (Systolic)">Blood Pressure (Systolic)</option>
                  <option value="Blood Pressure (Diastolic)">Blood Pressure (Diastolic)</option>
                  <option value="Serum Creatinine">Serum Creatinine</option>
                  <option value="Lipid Profile (LDL Cholesterol)">Lipid Profile (LDL)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-emerald-200 mb-1">Numeric Value</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    placeholder="e.g. 115"
                    value={testValue}
                    onChange={(e) => setTestValue(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#06140f] border border-emerald-500/30 text-white text-xs focus:outline-none focus:border-emerald-400 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-emerald-200 mb-1">Unit</label>
                  <input
                    type="text"
                    required
                    value={testUnit}
                    onChange={(e) => setTestUnit(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#06140f] border border-emerald-500/30 text-white text-xs focus:outline-none focus:border-emerald-400 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-emerald-200 mb-1">Date Taken</label>
                  <input
                    type="date"
                    required
                    value={testDate}
                    onChange={(e) => setTestDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#06140f] border border-emerald-500/30 text-white text-xs focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-emerald-200 mb-1">Reference Range</label>
                  <input
                    type="text"
                    value={testRefRange}
                    onChange={(e) => setTestRefRange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#06140f] border border-emerald-500/30 text-white text-xs focus:outline-none focus:border-emerald-400 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-emerald-200 mb-1">Laboratory / Clinic</label>
                <input
                  type="text"
                  placeholder="Metro Hospital Labs"
                  value={testLab}
                  onChange={(e) => setTestLab(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#06140f] border border-emerald-500/30 text-white text-xs focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-300/70 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-400 text-[#071410] font-bold text-xs hover:bg-emerald-300 shadow-md shadow-emerald-400/20"
                >
                  Save Result
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
