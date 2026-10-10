"use client";

import { useEffect, useState, useRef, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  FileText,
  FileImage,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Plus,
  Trash2,
  Save,
  Loader2,
  ExternalLink,
  ShieldCheck,
  Eye,
  Info,
} from "lucide-react";
import { StoredDocument } from "@/lib/documents/store";
import { MedicalDataExtract } from "@/lib/llm/adapter";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function DocumentReviewPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();

  const [document, setDocument] = useState<StoredDocument | null>(null);
  const [formData, setFormData] = useState<MedicalDataExtract | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Viewer controls
  const [zoomLevel, setZoomLevel] = useState(100);
  const [rotation, setRotation] = useState(0);

  // Canvas ref for PDF rendering
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pdfRenderError, setPdfRenderError] = useState(false);

  // Load document data
  useEffect(() => {
    async function fetchDoc() {
      try {
        const res = await fetch(`/api/documents/${id}`);
        if (!res.ok) {
          throw new Error("Document not found");
        }
        const data = await res.json();
        setDocument(data.document);
        setFormData(data.document.draft_json || null);
      } catch (err: unknown) {
        setErrorMsg((err as Error).message || "Failed to load document");
      } finally {
        setLoading(false);
      }
    }
    fetchDoc();
  }, [id]);

  // Client-side PDF rendering using pdfjs-dist
  useEffect(() => {
    if (!document || document.file_type !== "pdf" || !canvasRef.current) return;

    let isCancelled = false;

    async function renderPdf() {
      try {
        const pdfjs = await import("pdfjs-dist");
        // Set worker source
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

        let pdfData: Uint8Array;
        if (document?.file_data_url) {
          const base64 = document.file_data_url.split(",")[1];
          const binaryStr = atob(base64);
          pdfData = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            pdfData[i] = binaryStr.charCodeAt(i);
          }
        } else {
          // If no base64, render simple fallback notice
          return;
        }

        const loadingTask = pdfjs.getDocument({ data: pdfData });
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);

        if (isCancelled || !canvasRef.current) return;

        const viewport = page.getViewport({ scale: (zoomLevel / 100) * 1.5 });
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");

        if (context) {
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          await page.render({
            canvasContext: context,
            viewport,
            canvas,
          }).promise;
        }
      } catch (err) {
        console.warn("Client PDF canvas rendering fallback:", err);
        setPdfRenderError(true);
      }
    }

    renderPdf();

    return () => {
      isCancelled = true;
    };
  }, [document, zoomLevel, rotation]);

  async function handleConfirmAndSave() {
    if (!formData) return;
    setSaving(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/documents/${id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewed_data: formData }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to confirm document");
      }

      setSuccessMsg("Document confirmed! Clinical records synchronized successfully.");
      setTimeout(() => {
        router.push("/documents");
      }, 1200);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message);
      setSaving(false);
    }
  }

  // Trigger extraction if document is in uploaded state
  async function handleReExtract() {
    setLoading(true);
    try {
      const res = await fetch(`/api/documents/${id}/extract`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDocument(data.document);
      setFormData(data.extraction);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  // Medication handlers
  function updateMedication(index: number, field: string, value: string) {
    if (!formData || formData.document_type !== "prescription") return;
    const updatedMeds = [...formData.medications];
    updatedMeds[index] = { ...updatedMeds[index], [field]: value };
    setFormData({ ...formData, medications: updatedMeds });
  }

  function deleteMedication(index: number) {
    if (!formData || formData.document_type !== "prescription") return;
    const updatedMeds = formData.medications.filter((_, i) => i !== index);
    setFormData({ ...formData, medications: updatedMeds });
  }

  function addMedication() {
    if (!formData || formData.document_type !== "prescription") return;
    const newMed = {
      name: "",
      generic_name: "",
      dosage: "",
      frequency: "Once a day",
      instructions: "",
      evidence_text: "Manually added during patient review",
      confidence: 1.0,
    };
    setFormData({ ...formData, medications: [...formData.medications, newMed] });
  }

  // Lab handlers
  function updateLab(index: number, field: string, value: string) {
    if (!formData || formData.document_type !== "lab_report") return;
    const updatedLabs = [...formData.lab_results];
    updatedLabs[index] = { ...updatedLabs[index], [field]: value };
    setFormData({ ...formData, lab_results: updatedLabs });
  }

  function deleteLab(index: number) {
    if (!formData || formData.document_type !== "lab_report") return;
    const updatedLabs = formData.lab_results.filter((_, i) => i !== index);
    setFormData({ ...formData, lab_results: updatedLabs });
  }

  function addLab() {
    if (!formData || formData.document_type !== "lab_report") return;
    const newLab = {
      test_name: "",
      value: "",
      unit: "",
      reference_range: "",
      evidence_text: "Manually added during patient review",
      confidence: 1.0,
    };
    setFormData({ ...formData, lab_results: [...formData.lab_results, newLab] });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-sky-400 animate-spin mx-auto" />
          <p className="text-sm text-slate-400">Loading document extraction for review...</p>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">Document Not Found</h2>
          <p className="text-xs text-slate-400">
            Could not find document with ID {id}.
          </p>
          <Link
            href="/documents"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Documents
          </Link>
        </div>
      </div>
    );
  }

  const overallConfidence = formData?.confidence_score || document.confidence_score || 0;
  const isDocumentLowConfidence = overallConfidence > 0 && overallConfidence < 80;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Bar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur px-4 py-3 shrink-0 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/documents"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors shrink-0"
            title="Back to dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-white truncate">
                {document.file_name}
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 shrink-0 uppercase">
                {document.file_type}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Human-in-the-Loop Review Screen • Verify AI extracted entities before saving
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            disabled={saving || !formData}
            onClick={handleConfirmAndSave}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold shadow-md transition-all ${
              saving || !formData
                ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30"
            }`}
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Confirm & Save
              </>
            )}
          </button>
        </div>
      </header>

      {/* Low Confidence Document Banner (< 80) */}
      {isDocumentLowConfidence && (
        <div className="bg-amber-950/70 border-b border-amber-500/50 px-4 py-2.5 flex items-center gap-3 text-xs text-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <div className="flex-1">
            <strong>Warning: Overall Document Confidence is Low ({overallConfidence}%)</strong>
            <span className="hidden sm:inline">
              {" "}— Poor lighting, smudged ink, or handwritten script detected. Please check each field against the scan on the left.
            </span>
          </div>
        </div>
      )}

      {/* Success Banner */}
      {successMsg && (
        <div className="bg-emerald-950/70 border-b border-emerald-500/50 px-4 py-2.5 flex items-center gap-3 text-xs text-emerald-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Error Banner */}
      {errorMsg && (
        <div className="bg-red-950/70 border-b border-red-500/50 px-4 py-2.5 flex items-center gap-3 text-xs text-red-200">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Split-Screen Main Content: Left Side (Viewer) & Right Side (Form) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* ======================================================== */}
        {/* LEFT PANE: Document Scan / PDF Viewer                    */}
        {/* ======================================================== */}
        <section className="w-full lg:w-1/2 border-b lg:border-b-0 lg:border-r border-slate-800 bg-slate-900/40 flex flex-col min-h-[350px] lg:min-h-0">
          {/* Viewer Toolbar */}
          <div className="border-b border-slate-800 bg-slate-950/60 px-3 py-2 flex items-center justify-between text-xs text-slate-300 shrink-0">
            <div className="flex items-center gap-2">
              <Eye className="w-3.5 h-3.5 text-sky-400" />
              <span className="font-semibold text-slate-200">Original Document Scan</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(50, z - 20))}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono text-[11px] px-1.5">{zoomLevel}%</span>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(250, z + 20))}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 ml-1"
                title="Rotate Clockwise"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Viewer Body */}
          <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-950/80">
            {document.file_type === "pdf" ? (
              <div
                className="transition-transform duration-150 origin-center max-w-full"
                style={{
                  transform: `rotate(${rotation}deg) scale(${zoomLevel / 100})`,
                }}
              >
                {!pdfRenderError ? (
                  <canvas
                    ref={canvasRef}
                    className="shadow-2xl rounded border border-slate-700 bg-white max-w-full"
                  />
                ) : (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center max-w-md">
                    <FileText className="w-12 h-12 text-sky-400 mx-auto mb-3" />
                    <h3 className="text-sm font-semibold text-white">PDF Document Preview</h3>
                    <p className="text-xs text-slate-400 mt-1 mb-4">
                      {document.file_name} (Page 1)
                    </p>
                    {document.file_data_url && (
                      <a
                        href={document.file_data_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 font-medium"
                      >
                        Open in New Tab <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Image Viewer (JPG / PNG) */
              <div
                className="transition-transform duration-150 origin-center max-w-full max-h-full"
                style={{
                  transform: `rotate(${rotation}deg) scale(${zoomLevel / 100})`,
                }}
              >
                {document.file_data_url ? (
                  <img
                    src={document.file_data_url}
                    alt={document.file_name}
                    className="rounded shadow-2xl border border-slate-800 max-h-[70vh] object-contain"
                  />
                ) : (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
                    <FileImage className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-300 font-medium">{document.file_name}</p>
                    <p className="text-xs text-slate-500 mt-1">Image scan ready for extraction review</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ======================================================== */}
        {/* RIGHT PANE: Human-In-The-Loop Review Form                */}
        {/* ======================================================== */}
        <section className="w-full lg:w-1/2 flex flex-col bg-slate-950 overflow-y-auto">
          <div className="p-4 sm:p-6 space-y-6">
            {/* Header & Confidence Indicator */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-sky-400">
                  Clinical Abstract
                </span>
                <h2 className="text-lg font-bold text-white capitalize">
                  {formData && "clinic_name" in formData && (formData.clinic_name?.toLowerCase().includes("pill") || formData.clinic_name?.toLowerCase().includes("packaging"))
                    ? "Medicine Packaging / Pill Scan"
                    : formData?.document_type
                    ? formData.document_type.replace("_", " ")
                    : "Medical Record"}
                </h2>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase text-slate-400 font-medium block">
                  Overall Quality
                </span>
                <span
                  className={`text-sm font-mono font-bold px-2.5 py-1 rounded-md border inline-block ${
                    isDocumentLowConfidence
                      ? "bg-amber-950/60 text-amber-300 border-amber-500/50"
                      : "bg-emerald-950/60 text-emerald-300 border-emerald-500/50"
                  }`}
                >
                  {overallConfidence}%
                </span>
              </div>
            </div>

            {/* If no extraction data yet, show trigger button */}
            {!formData && (
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 text-center space-y-3">
                <FileText className="w-10 h-10 text-slate-500 mx-auto" />
                <h3 className="text-sm font-semibold text-white">Extraction Pending</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  This document has been uploaded but not yet processed by the Vision LLM.
                </p>
                <button
                  type="button"
                  onClick={handleReExtract}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-xs font-semibold rounded-lg text-white"
                >
                  Run Clinical Extraction Now
                </button>
              </div>
            )}

            {/* FORM: PRESCRIPTION EXTRACTION */}
            {formData && formData.document_type === "prescription" && (
              <div className="space-y-6">
                {/* Clinician / Clinic Metadata */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
                  <div>
                    <label className="text-[11px] font-medium text-slate-400 block mb-1">
                      Prescribing Physician
                    </label>
                    <input
                      type="text"
                      value={formData.doctor_name || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, doctor_name: e.target.value })
                      }
                      placeholder="Doctor Name"
                      className="w-full text-xs bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-400 block mb-1">
                      Clinic / Facility
                    </label>
                    <input
                      type="text"
                      value={formData.clinic_name || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, clinic_name: e.target.value })
                      }
                      placeholder="Clinic Name"
                      className="w-full text-xs bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                {/* Medications List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                      <span>Prescribed Medications</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                        {formData.medications.length}
                      </span>
                    </h3>
                    <button
                      type="button"
                      onClick={addMedication}
                      className="inline-flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 font-medium"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Medication
                    </button>
                  </div>

                  {formData.medications.map((med, idx) => {
                    const isLowConfidence = med.confidence < 0.7;

                    return (
                      <div
                        key={idx}
                        className={`rounded-xl p-4 transition-all ${
                          isLowConfidence
                            ? "ring-2 ring-yellow-400 bg-amber-500/10 border border-yellow-400/80 shadow-lg shadow-amber-500/5"
                            : "bg-slate-900/60 border border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        {/* Item Confidence Alert */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-200">
                              #{idx + 1}
                            </span>
                            {isLowConfidence ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-yellow-300 bg-yellow-400/20 px-2 py-0.5 rounded border border-yellow-400/50">
                                <AlertTriangle className="w-3 h-3 text-yellow-400" />
                                Low Confidence ({(med.confidence * 100).toFixed(0)}%) — Verify Against Scan
                              </span>
                            ) : (
                              <span className="text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                {(med.confidence * 100).toFixed(0)}% AI Confidence
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => deleteMedication(idx)}
                            className="p-1 text-slate-500 hover:text-red-400 rounded transition-colors"
                            title="Remove medication"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Input Fields */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-medium text-slate-400 block mb-1">
                              Drug Name (Brand)
                            </label>
                            <input
                              type="text"
                              value={med.name}
                              onChange={(e) =>
                                updateMedication(idx, "name", e.target.value)
                              }
                              className={`w-full text-xs rounded-md px-3 py-2 text-white focus:outline-none ${
                                isLowConfidence
                                  ? "bg-slate-950/80 border border-yellow-400/80 text-yellow-100 focus:ring-2 focus:ring-yellow-400"
                                  : "bg-slate-950 border border-slate-800 focus:border-sky-500"
                              }`}
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-medium text-slate-400 block mb-1">
                              Generic Name (Normalized)
                            </label>
                            <input
                              type="text"
                              value={med.generic_name || ""}
                              onChange={(e) =>
                                updateMedication(idx, "generic_name", e.target.value)
                              }
                              placeholder="e.g. metformin"
                              className="w-full text-xs bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-white focus:outline-none focus:border-sky-500 font-mono"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-medium text-slate-400 block mb-1">
                              Dosage & Strength
                            </label>
                            <input
                              type="text"
                              value={med.dosage}
                              onChange={(e) =>
                                updateMedication(idx, "dosage", e.target.value)
                              }
                              className={`w-full text-xs rounded-md px-3 py-2 text-white focus:outline-none ${
                                isLowConfidence
                                  ? "bg-slate-950/80 border border-yellow-400/80 text-yellow-100 focus:ring-2 focus:ring-yellow-400"
                                  : "bg-slate-950 border border-slate-800 focus:border-sky-500"
                              }`}
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-medium text-slate-400 block mb-1">
                              Frequency (Standardized)
                            </label>
                            <input
                              type="text"
                              value={med.frequency}
                              onChange={(e) =>
                                updateMedication(idx, "frequency", e.target.value)
                              }
                              className="w-full text-xs bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="text-[11px] font-medium text-slate-400 block mb-1">
                              Patient Instructions
                            </label>
                            <input
                              type="text"
                              value={med.instructions || ""}
                              onChange={(e) =>
                                updateMedication(idx, "instructions", e.target.value)
                              }
                              placeholder="e.g. Take with morning meal"
                              className="w-full text-xs bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                            />
                          </div>
                        </div>

                        {/* OCR Evidence Snippet */}
                        {med.evidence_text && (
                          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-start gap-2 text-[11px] text-slate-400">
                            <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px] shrink-0 mt-0.5">
                              Visual Evidence:
                            </span>
                            <span className="font-mono text-slate-300 italic">
                              &ldquo;{med.evidence_text}&rdquo;
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* FORM: LAB REPORT EXTRACTION */}
            {formData && formData.document_type === "lab_report" && (
              <div className="space-y-6">
                {/* Lab Metadata */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
                  <div>
                    <label className="text-[11px] font-medium text-slate-400 block mb-1">
                      Laboratory Name
                    </label>
                    <input
                      type="text"
                      value={formData.lab_name || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, lab_name: e.target.value })
                      }
                      className="w-full text-xs bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-400 block mb-1">
                      Ordering Physician
                    </label>
                    <input
                      type="text"
                      value={formData.doctor_name || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, doctor_name: e.target.value })
                      }
                      className="w-full text-xs bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* Lab Results Table / Cards */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                      <span>Lab Analytes & Biomarkers</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                        {formData.lab_results.length}
                      </span>
                    </h3>
                    <button
                      type="button"
                      onClick={addLab}
                      className="inline-flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 font-medium"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Test
                    </button>
                  </div>

                  {formData.lab_results.map((lab, idx) => {
                    const isLowConfidence = lab.confidence < 0.7;

                    return (
                      <div
                        key={idx}
                        className={`rounded-xl p-4 transition-all ${
                          isLowConfidence
                            ? "ring-2 ring-yellow-400 bg-amber-500/10 border border-yellow-400/80 shadow-lg shadow-amber-500/5"
                            : "bg-slate-900/60 border border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-200">
                              #{idx + 1}
                            </span>
                            {isLowConfidence ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-yellow-300 bg-yellow-400/20 px-2 py-0.5 rounded border border-yellow-400/50">
                                <AlertTriangle className="w-3 h-3 text-yellow-400" />
                                Low Confidence ({(lab.confidence * 100).toFixed(0)}%) — Verify Value
                              </span>
                            ) : (
                              <span className="text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                {(lab.confidence * 100).toFixed(0)}% Confidence
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => deleteLab(idx)}
                            className="p-1 text-slate-500 hover:text-red-400 rounded"
                            title="Remove test"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                          <div className="sm:col-span-2">
                            <label className="text-[11px] font-medium text-slate-400 block mb-1">
                              Analyte / Test Name
                            </label>
                            <input
                              type="text"
                              value={lab.test_name}
                              onChange={(e) =>
                                updateLab(idx, "test_name", e.target.value)
                              }
                              className={`w-full text-xs rounded-md px-3 py-2 text-white focus:outline-none ${
                                isLowConfidence
                                  ? "bg-slate-950/80 border border-yellow-400/80 text-yellow-100 focus:ring-2 focus:ring-yellow-400"
                                  : "bg-slate-950 border border-slate-800 focus:border-sky-500"
                              }`}
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-medium text-slate-400 block mb-1">
                              Result Value
                            </label>
                            <input
                              type="text"
                              value={lab.value}
                              onChange={(e) =>
                                updateLab(idx, "value", e.target.value)
                              }
                              className={`w-full text-xs font-mono font-bold rounded-md px-3 py-2 text-white focus:outline-none ${
                                isLowConfidence
                                  ? "bg-slate-950/80 border border-yellow-400/80 text-yellow-100 focus:ring-2 focus:ring-yellow-400"
                                  : "bg-slate-950 border border-slate-800 focus:border-sky-500"
                              }`}
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-medium text-slate-400 block mb-1">
                              Unit
                            </label>
                            <input
                              type="text"
                              value={lab.unit}
                              onChange={(e) =>
                                updateLab(idx, "unit", e.target.value)
                              }
                              className="w-full text-xs bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-white focus:outline-none"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="text-[11px] font-medium text-slate-400 block mb-1">
                              Reference Range
                            </label>
                            <input
                              type="text"
                              value={lab.reference_range || ""}
                              onChange={(e) =>
                                updateLab(idx, "reference_range", e.target.value)
                              }
                              placeholder="e.g. 70 - 99"
                              className="w-full text-xs bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-white focus:outline-none"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="text-[11px] font-medium text-slate-400 block mb-1">
                              Clinical Flag
                            </label>
                            <select
                              value={lab.flag || "normal"}
                              onChange={(e) =>
                                updateLab(
                                  idx,
                                  "flag",
                                  e.target.value as "normal" | "high" | "low" | "abnormal"
                                )
                              }
                              className="w-full text-xs bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-white focus:outline-none"
                            >
                              <option value="normal">Normal</option>
                              <option value="high">High (Elevated)</option>
                              <option value="low">Low</option>
                              <option value="abnormal">Abnormal</option>
                            </select>
                          </div>
                        </div>

                        {lab.evidence_text && (
                          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-start gap-2 text-[11px] text-slate-400">
                            <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px] shrink-0 mt-0.5">
                              Evidence:
                            </span>
                            <span className="font-mono text-slate-300 italic">
                              &ldquo;{lab.evidence_text}&rdquo;
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* FORM: OTHER / UNREADABLE FALLBACK */}
            {formData && formData.document_type === "other" && (
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-amber-400 text-sm font-semibold">
                  <AlertTriangle className="w-4 h-4" />
                  Unrecognized Medical Document
                </div>
                <p className="text-xs text-slate-300">
                  {formData.notes || "No clinical entities could be confidently extracted from this file."}
                </p>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <Link
                href="/documents"
                className="text-xs text-slate-400 hover:text-slate-300"
              >
                Discard Changes & Exit
              </Link>

              <button
                type="button"
                disabled={saving || !formData}
                onClick={handleConfirmAndSave}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-900/30 transition-all"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? "Synchronizing..." : "Confirm & Commit to Health Records"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}