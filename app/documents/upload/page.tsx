"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  UploadCloud,
  FileText,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  FileImage,
  ShieldCheck,
  Pill,
  Sparkles,
  Archive,
} from "lucide-react";
import { MedicalDocumentCategory } from "@/lib/types/database";
import { useSession } from "@/lib/auth";
import SignInRequired from "@/components/SignInRequired";

export default function DocumentUploadPage() {
  const { session, loading: sessionLoading } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Mode Switcher: "ai_extract" (Member 2 Engine) vs "manual_vault" (Vault Storage)
  const [activeTab, setActiveTab] = useState<"ai_extract" | "manual_vault">("ai_extract");

  // Shared / AI Extraction State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState<string>("");

  // Manual Vault State
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadCategory, setUploadCategory] = useState<MedicalDocumentCategory>("prescription_pdf");
  const [uploadDocDate, setUploadDocDate] = useState(new Date().toISOString().split("T")[0]);
  const [uploadDoctor, setUploadDoctor] = useState("");
  const [uploadHospital, setUploadHospital] = useState("");
  const [uploadNotes, setUploadNotes] = useState("");
  const [manualFilePreview, setManualFilePreview] = useState<string | null>(null);
  const [manualFileType, setManualFileType] = useState("");
  const [manualFileName, setManualFileName] = useState("");

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];

  function validateAndSetFile(file: File) {
    setErrorMsg(null);

    if (file.size > MAX_FILE_SIZE) {
      setErrorMsg(`File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum allowed size is 10MB.`);
      setSelectedFile(null);
      return false;
    }

    if (file.size === 0) {
      setErrorMsg("The selected file is empty (0 bytes).");
      setSelectedFile(null);
      return false;
    }

    const fileExt = file.name.split(".").pop()?.toLowerCase();
    const isValidExt = fileExt === "pdf" || fileExt === "jpg" || fileExt === "jpeg" || fileExt === "png";
    const isValidMime = ALLOWED_TYPES.includes(file.type);

    if (!isValidExt && !isValidMime) {
      setErrorMsg("Unsupported file format. Please upload a PDF, JPG, or PNG document.");
      setSelectedFile(null);
      return false;
    }

    setSelectedFile(file);
    return true;
  }

  function handleDrag(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      validateAndSetFile(file);

      // Also set preview for manual mode if active (blob URL, no base64)
      setManualFilePreview(URL.createObjectURL(file));
      setManualFileName(file.name);
      setManualFileType(file.type);
    }
  }

  async function handleUploadAndExtract() {
    if (!selectedFile) return;

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      setProcessingStage("Uploading document & validating format signatures...");
      const formData = new FormData();
      formData.append("file", selectedFile);

      const uploadRes = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        throw new Error(uploadData.error || "Failed to upload document");
      }

      const docId = uploadData.document.id;

      setProcessingStage("Running structured clinical extraction with Vision LLM...");
      const extractRes = await fetch(`/api/documents/${docId}/extract`, {
        method: "POST",
      });

      const extractData = await extractRes.json();
      if (!extractRes.ok) {
        throw new Error(extractData.error || "Failed to extract document contents");
      }

      setProcessingStage("Extraction complete! Redirecting to human-in-the-loop review...");
      setTimeout(() => {
        router.push(`/documents/${docId}/review`);
      }, 500);
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg((err as Error).message || "An unexpected error occurred during processing.");
      setIsProcessing(false);
      setProcessingStage("");
    }
  }

  async function handleManualVaultSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manualFilePreview && !selectedFile) {
      setErrorMsg("Please choose or upload a file first.");
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      let res: Response;
      if (selectedFile) {
        // Picked files go up as multipart. The server checks the file bytes.
        const form = new FormData();
        form.append("file", selectedFile);
        res = await fetch("/api/documents", { method: "POST", body: form });
      } else {
        // No file picked: the sample https link, which the server accepts in JSON.
        res = await fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: uploadTitle || manualFileName || "Medical Document",
            category: uploadCategory,
            file_name: manualFileName || "document.jpg",
            file_type: manualFileType || "image/jpeg",
            file_url: manualFilePreview || "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&q=80&w=1200",
            doc_date: uploadDocDate,
            doctor: uploadDoctor,
            hospital: uploadHospital,
            notes: uploadNotes,
          }),
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      router.push("/documents");
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to save to vault");
      setIsProcessing(false);
    }
  }

  async function loadSampleDocument(type: "pdf" | "jpg" | "pill") {
    setIsProcessing(true);
    setErrorMsg(null);
    setProcessingStage(`Preparing sample ${type === "pill" ? "Medicine Strip Photo" : type.toUpperCase()} record...`);

    try {
      let blob: Blob;
      let filename: string;

      if (type === "pdf") {
        const dummyPdf = "%PDF-1.4\n1 0 obj\n<< /Title (Metformin Prescription) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF";
        blob = new Blob([dummyPdf], { type: "application/pdf" });
        filename = "Sample_Prescription_Cardiology.pdf";
      } else if (type === "pill") {
        const jpegBytes = new Uint8Array([
          0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
          0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
          0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
          0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20, 0x24, 0x2e, 0x27, 0x20,
          0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29, 0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27,
          0x39, 0x3d, 0x38, 0x32, 0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
          0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0xda, 0x00, 0x08, 0x01,
          0x01, 0x00, 0x00, 0x3f, 0x00, 0x37, 0xff, 0xd9
        ]);
        blob = new Blob([jpegBytes], { type: "image/jpeg" });
        filename = "Sample_Medicine_Strip_Dolo650.jpg";
      } else {
        const jpegBytes = new Uint8Array([
          0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
          0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
          0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
          0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20, 0x24, 0x2e, 0x27, 0x20,
          0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29, 0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27,
          0x39, 0x3d, 0x38, 0x32, 0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
          0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0xda, 0x00, 0x08, 0x01,
          0x01, 0x00, 0x00, 0x3f, 0x00, 0x37, 0xff, 0xd9
        ]);
        blob = new Blob([jpegBytes], { type: "image/jpeg" });
        filename = "Sample_Metabolic_Panel.jpg";
      }

      const sampleFile = new File([blob], filename, { type: blob.type });
      validateAndSetFile(sampleFile);

      setProcessingStage("Uploading sample document...");
      const formData = new FormData();
      formData.append("file", sampleFile);

      const uploadRes = await fetch("/api/documents", { method: "POST", body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error);

      const docId = uploadData.document.id;
      setProcessingStage("Running Vision LLM extraction on sample document...");
      const extractRes = await fetch(`/api/documents/${docId}/extract`, { method: "POST" });
      const extractData = await extractRes.json();
      if (!extractRes.ok) throw new Error(extractData.error);

      setProcessingStage("Redirecting to side-by-side review...");
      setTimeout(() => {
        router.push(`/documents/${docId}/review`);
      }, 500);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message);
      setIsProcessing(false);
    }
  }

  if (!sessionLoading && !session) return <SignInRequired />;
  if (session && session.user.role !== "patient") {
    return <SignInRequired message="Uploads are available to patient accounts." showLink={false} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <Link
          href="/documents"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Medical Vault & Documents
        </Link>

        {/* Title Header */}
        <div>
          <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded">
            MediCare Document Vault & Extraction Engine
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-2">
            Upload Medical Record
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Upload messy clinic scans, handwritten scripts, lab PDFs, or photos of medicine strips & pill bottles.
          </p>
        </div>

        {/* Tab Switcher: AI Vision Extract vs Manual Vault Entry */}
        <div className="grid grid-cols-2 p-1 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("ai_extract")}
            className={`py-2 rounded-lg flex items-center justify-center gap-2 transition-all ${
              activeTab === "ai_extract"
                ? "bg-sky-600 text-white shadow-md shadow-sky-600/30 font-bold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI Extraction & Review (Recommended)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("manual_vault")}
            className={`py-2 rounded-lg flex items-center justify-center gap-2 transition-all ${
              activeTab === "manual_vault"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30 font-bold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            Manual Vault Entry
          </button>
        </div>

        {/* Error Alert Banner */}
        {errorMsg && (
          <div className="bg-red-950/40 border border-red-500/40 rounded-xl p-4 flex items-start gap-3 text-sm text-red-200">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-red-300">Validation Notice</p>
              <p className="text-xs text-red-300/90 mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 1: AI EXTRACTION & REVIEW (Member 2 Engine)                 */}
        {/* ============================================================== */}
        {activeTab === "ai_extract" && (
          <div className="space-y-6">
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
                dragActive
                  ? "border-sky-400 bg-sky-950/20 scale-[1.01]"
                  : "border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/60"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                onChange={handleChange}
                className="hidden"
              />

              <div className="w-16 h-16 rounded-full bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mx-auto mb-4 text-sky-400">
                <UploadCloud className="w-8 h-8" />
              </div>

              <h3 className="text-base font-semibold text-white">
                {selectedFile ? selectedFile.name : "Choose a file or drag & drop here"}
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 max-w-sm mx-auto">
                Supported formats: PDF, JPG, PNG (Max 10MB). Magic bytes checked to prevent spoofed uploads.
              </p>

              {selectedFile && (
                <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sky-950 border border-sky-800 text-xs text-sky-200 font-mono">
                  <CheckCircle2 className="w-4 h-4 text-sky-400" />
                  {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </div>
              )}
            </div>

            <div className="space-y-3">
              <button
                type="button"
                disabled={!selectedFile || isProcessing}
                onClick={handleUploadAndExtract}
                className={`w-full py-3 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-lg ${
                  !selectedFile || isProcessing
                    ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                    : "bg-sky-600 hover:bg-sky-500 text-white shadow-sky-600/20"
                }`}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {processingStage || "Processing..."}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Start AI Extraction & Review
                  </>
                )}
              </button>

              <div className="pt-2">
                <div className="flex items-center gap-2 my-2 text-xs text-slate-500 uppercase tracking-wider justify-center">
                  <span className="h-px bg-slate-800 flex-1" />
                  <span>Or Test Instant Demo Records</span>
                  <span className="h-px bg-slate-800 flex-1" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => loadSampleDocument("pdf")}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-300 transition-colors"
                  >
                    <FileText className="w-4 h-4 text-sky-400" />
                    Sample Prescription (PDF)
                  </button>

                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => loadSampleDocument("pill")}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-300 transition-colors"
                  >
                    <Pill className="w-4 h-4 text-purple-400" />
                    Sample Medicine Strip (Photo)
                  </button>

                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => loadSampleDocument("jpg")}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-300 transition-colors"
                  >
                    <FileImage className="w-4 h-4 text-emerald-400" />
                    Sample Lab Panel (Photo)
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 text-xs text-slate-400 space-y-2">
              <div className="flex items-center gap-2 text-slate-300 font-semibold">
                <ShieldCheck className="w-4 h-4 text-sky-400" />
                Zero Guesswork Clinical Abstractor Protocol
              </div>
              <p>
                MediCare enforces strict Zod structured output. Every extracted item must link to an explicit visual evidence text snippet. Values with confidence scores under 70% will be highlighted in yellow for mandatory human confirmation before saving.
              </p>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: MANUAL VAULT ENTRY (Vault Storage)                       */}
        {/* ============================================================== */}
        {activeTab === "manual_vault" && (
          <form
            onSubmit={handleManualVaultSubmit}
            className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-5 text-xs shadow-xl"
          >
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-200 block text-xs">
                Medical File / Scan Photo *
              </label>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={handleChange}
                className="hidden"
              />

              {manualFilePreview ? (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 truncate">
                    {manualFileType === "application/pdf" ? (
                      <div className="w-12 h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                        <FileText className="w-6 h-6" />
                      </div>
                    ) : (
                      <img
                        src={manualFilePreview}
                        alt="preview"
                        className="w-12 h-12 rounded-lg object-cover border border-slate-800 shrink-0"
                      />
                    )}
                    <div className="truncate">
                      <span className="font-bold text-white block truncate text-sm">
                        {manualFileName}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {manualFileType}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setManualFilePreview(null);
                      setManualFileName("");
                      setManualFileType("");
                    }}
                    className="text-xs text-rose-400 hover:text-rose-300 font-semibold shrink-0"
                  >
                    Change File
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-800 hover:border-slate-700 rounded-xl p-8 text-center cursor-pointer bg-slate-950/50 hover:bg-slate-900 transition-all group"
                >
                  <UploadCloud className="w-10 h-10 text-emerald-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <p className="font-bold text-white text-sm">
                    Click to browse or drop your scan / PDF here
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Supports JPG, PNG, WEBP (X-Rays, Scans) & PDF documents
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-200">Record Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chest Radiograph (PA View)"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-200">Category *</label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value as MedicalDocumentCategory)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
                >
                  <option value="xray">X-Ray Radiograph</option>
                  <option value="mri_ct">MRI / CT Scan</option>
                  <option value="ultrasound">Ultrasound Sonogram</option>
                  <option value="lab_pdf">Lab Report (PDF)</option>
                  <option value="prescription_pdf">Prescription Slip</option>
                  <option value="discharge_summary">Hospital Discharge Summary</option>
                  <option value="clinical_photo">Clinical / Symptom Photo</option>
                  <option value="other">Other Document</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-200">Date of Scan / Examination *</label>
                <input
                  type="date"
                  required
                  value={uploadDocDate}
                  onChange={(e) => setUploadDocDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-200">Doctor / Radiologist Name</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Priya Patel"
                  value={uploadDoctor}
                  onChange={(e) => setUploadDoctor(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-200">Hospital / Imaging Center</label>
              <input
                type="text"
                placeholder="e.g. Metro General Hospital Imaging Dept"
                value={uploadHospital}
                onChange={(e) => setUploadHospital(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-200">Clinical Findings / Diagnostic Impression</label>
              <textarea
                rows={3}
                placeholder="e.g. Normal cardiothoracic ratio, clear bilateral lung fields, no effusion."
                value={uploadNotes}
                onChange={(e) => setUploadNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-400 resize-none"
              />
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
              <Link
                href="/documents"
                className="px-4 py-2.5 rounded-xl bg-slate-950 text-slate-300 font-semibold hover:bg-slate-800 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isProcessing}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/30 flex items-center gap-2 disabled:opacity-50 transition-all"
              >
                <Archive className="w-4 h-4" />
                {isProcessing ? "Storing in Vault..." : "Store in Medical Vault"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
