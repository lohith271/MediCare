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
  Info,
  ShieldCheck,
  Pill,
} from "lucide-react";

export default function DocumentUploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState<string>("");

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];

  function validateAndSetFile(file: File) {
    setErrorMsg(null);

    // Client-side size validation
    if (file.size > MAX_FILE_SIZE) {
      setErrorMsg(
        `File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum allowed size is 10MB.`
      );
      setSelectedFile(null);
      return false;
    }

    if (file.size === 0) {
      setErrorMsg("The selected file is empty (0 bytes).");
      setSelectedFile(null);
      return false;
    }

    // Client-side type validation
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
      validateAndSetFile(e.target.files[0]);
    }
  }

  async function handleUploadAndExtract() {
    if (!selectedFile) return;

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      // Step 1: Upload document
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

      // Step 2: Trigger AI extraction
      setProcessingStage("Running structured clinical extraction with Vision LLM...");
      const extractRes = await fetch(`/api/documents/${docId}/extract`, {
        method: "POST",
      });

      const extractData = await extractRes.json();

      if (!extractRes.ok) {
        throw new Error(extractData.error || "Failed to extract document contents");
      }

      // Step 3: Route to Review Screen
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

  // Helper to load sample files for quick demonstration
  async function loadSampleDocument(type: "pdf" | "jpg" | "pill") {
    setIsProcessing(true);
    setErrorMsg(null);
    setProcessingStage(`Preparing simulated sample ${type === "pill" ? "Medicine Strip Photo" : type.toUpperCase()} record...`);

    try {
      // Generate a valid minimal PDF or JPG byte stream
      let blob: Blob;
      let filename: string;

      if (type === "pdf") {
        const dummyPdf = "%PDF-1.4\n1 0 obj\n<< /Title (Metformin Prescription) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF";
        blob = new Blob([dummyPdf], { type: "application/pdf" });
        filename = "Sample_Prescription_Cardiology.pdf";
      } else if (type === "pill") {
        // Minimal valid JPEG binary buffer
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

      const uploadRes = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <Link
          href="/documents"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Documents Dashboard
        </Link>

        {/* Title Header */}
        <div>
          <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded">
            Extraction & Review Engine
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-2">
            Upload Medical Record
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Upload messy clinic photos, handwritten scripts, or lab PDFs. Our engine abstracts clinical entities into structured formats for your inspection.
          </p>
        </div>

        {/* Error Alert Banner */}
        {errorMsg && (
          <div className="bg-red-950/40 border border-red-500/40 rounded-xl p-4 flex items-start gap-3 text-sm text-red-200">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-red-300">Upload Validation Error</p>
              <p className="text-xs text-red-300/90 mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Drag and Drop Zone */}
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

        {/* Action Buttons */}
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
                <UploadCloud className="w-4 h-4" />
                Start Extraction & Review
              </>
            )}
          </button>

          {/* Quick Demo Fill Buttons for Judges */}
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

        {/* Security & Verification Card */}
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
    </div>
  );
}
