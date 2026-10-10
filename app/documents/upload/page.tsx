"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Shield,
  Layers,
  Sparkles,
  Lock,
} from "lucide-react";
import { MedicalDocumentCategory } from "@/lib/types/database";
import { getLocalSession } from "@/lib/auth";

export default function DocumentUploadPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadCategory, setUploadCategory] =
    useState<MedicalDocumentCategory>("xray");
  const [uploadDocDate, setUploadDocDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [uploadDoctor, setUploadDoctor] = useState("");
  const [uploadHospital, setUploadHospital] = useState("");
  const [uploadNotes, setUploadNotes] = useState("");
  const [uploadedFilePreview, setUploadedFilePreview] = useState<string | null>(
    null
  );
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [uploadedFileType, setUploadedFileType] = useState("");
  const [uploadedFileSize, setUploadedFileSize] = useState<number>(0);
  const [statusMsg, setStatusMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const session = getLocalSession();
    if (!session) {
      setAuthenticated(false);
    } else {
      setAuthenticated(true);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setUploadedFileType(file.type);
    setUploadedFileSize(file.size);

    if (!uploadTitle) {
      const cleanName = file.name
        .replace(/\.[^/.]+$/, "")
        .replace(/[_-]/g, " ");
      setUploadTitle(cleanName);
    }

    if (file.type === "application/pdf") {
      setUploadCategory("lab_pdf");
    } else if (file.type.startsWith("image/")) {
      if (
        file.name.toLowerCase().includes("xray") ||
        file.name.toLowerCase().includes("x-ray") ||
        file.name.toLowerCase().includes("chest")
      ) {
        setUploadCategory("xray");
      } else if (
        file.name.toLowerCase().includes("mri") ||
        file.name.toLowerCase().includes("ct")
      ) {
        setUploadCategory("mri_ct");
      } else {
        setUploadCategory("clinical_photo");
      }
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedFilePreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handlePrefillDemo = (kind: "xray" | "mri" | "pdf") => {
    if (kind === "xray") {
      setUploadTitle("Chest Radiograph (PA & Lateral View)");
      setUploadCategory("xray");
      setUploadDocDate(new Date().toISOString().split("T")[0]);
      setUploadDoctor("Dr. Priya Patel");
      setUploadHospital("Metro General Hospital Imaging Dept");
      setUploadNotes(
        "Standard erect PA projection. Clear lung parenchyma, no infiltrates or consolidations."
      );
      setUploadedFileName("Chest_XRay_PA_Demo.jpg");
      setUploadedFileType("image/jpeg");
      setUploadedFileSize(2450000);
      setUploadedFilePreview(
        "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=1200&q=80"
      );
    } else if (kind === "mri") {
      setUploadTitle("Lumbar Spine MRI (T1 & T2 Sagittal)");
      setUploadCategory("mri_ct");
      setUploadDocDate(new Date().toISOString().split("T")[0]);
      setUploadDoctor("Dr. Anil Mehta");
      setUploadHospital("Apex Diagnostic Imaging & MRI Center");
      setUploadNotes(
        "1.5 Tesla Scan. Mild L4-L5 disc desiccation with central protrusion."
      );
      setUploadedFileName("Lumbar_MRI_Scan.jpg");
      setUploadedFileType("image/jpeg");
      setUploadedFileSize(4120000);
      setUploadedFilePreview(
        "https://images.unsplash.com/photo-1530497610245-94d3c16cda28?auto=format&fit=crop&w=1200&q=80"
      );
    } else {
      setUploadTitle("Comprehensive Metabolic & Lipid Profile (PDF)");
      setUploadCategory("lab_pdf");
      setUploadDocDate(new Date().toISOString().split("T")[0]);
      setUploadDoctor("Dr. Priya Patel");
      setUploadHospital("Metro Pathology Diagnostics");
      setUploadNotes(
        "Full blood panel. Fasting blood glucose 114 mg/dL, HbA1c 6.9%. Total Cholesterol 195 mg/dL."
      );
      setUploadedFileName("Comprehensive_Metabolic_Report.pdf");
      setUploadedFileType("application/pdf");
      setUploadedFileSize(750000);
      setUploadedFilePreview(
        "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
      );
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim() || !uploadedFilePreview) {
      setStatusMsg({
        type: "error",
        text: "Please provide a record title and select a scan or PDF file.",
      });
      return;
    }

    try {
      setIsUploading(true);
      const session = getLocalSession();
      const patientId = session?.user?.id || "demo-patient-001";

      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: patientId,
          title: uploadTitle.trim(),
          category: uploadCategory,
          file_name: uploadedFileName || "scan_record.jpg",
          file_type: uploadedFileType || "image/jpeg",
          file_size_bytes: uploadedFileSize || 1500000,
          file_url: uploadedFilePreview,
          doc_date: uploadDocDate,
          doctor: uploadDoctor.trim(),
          hospital: uploadHospital.trim(),
          notes: uploadNotes.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStatusMsg({
          type: "success",
          text: `"${uploadTitle}" stored successfully! Redirecting to Medical Vault...`,
        });
        setTimeout(() => {
          router.push("/documents");
        }, 1200);
      } else {
        setStatusMsg({
          type: "error",
          text: data.error || "Failed to upload document",
        });
      }
    } catch (err: any) {
      setStatusMsg({
        type: "error",
        text: "Error saving document: " + err.message,
      });
    } finally {
      setIsUploading(false);
    }
  };

  if (authenticated === false) {
    return (
      <div className="max-w-md mx-auto py-24 px-4 text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
          <Lock className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white">
            Sign In to Upload Medical Scans
          </h2>
          <p className="text-xs text-emerald-300/70">
            Please sign in to upload and store diagnostic scans, X-rays, and lab
            PDFs to your patient vault.
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

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 sm:px-6 space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/documents"
          className="inline-flex items-center gap-1.5 text-xs text-emerald-400/80 hover:text-emerald-300 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Medical Vault
        </Link>
      </div>

      {/* Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#0a271c] to-[#071912] border border-emerald-500/30 space-y-2 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          Secure Record Archival
        </div>
        <h1 className="text-2xl font-black text-white">
          Upload Medical Scans & PDFs
        </h1>
        <p className="text-xs sm:text-sm text-emerald-200/80">
          Store radiographic X-ray photos, MRI/CT scans, sonograms, or diagnostic
          PDF reports so you can view and inspect them whenever needed.
        </p>
      </div>

      {/* Status Alert */}
      {statusMsg && (
        <div
          className={`p-3.5 rounded-xl flex items-center gap-3 text-xs font-semibold ${
            statusMsg.type === "success"
              ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-200"
              : "bg-rose-500/20 border border-rose-500/40 text-rose-200"
          }`}
        >
          {statusMsg.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Demo Preset Buttons */}
      <div className="p-4 rounded-xl bg-[#091b15] border border-emerald-900/40 space-y-2">
        <span className="text-[10px] font-mono uppercase text-emerald-400/80 block">
          One-Click Demo Presets:
        </span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handlePrefillDemo("xray")}
            className="px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold hover:bg-amber-500/25 transition-colors"
          >
            🩻 Preset Chest X-Ray
          </button>
          <button
            type="button"
            onClick={() => handlePrefillDemo("mri")}
            className="px-3 py-1.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold hover:bg-indigo-500/25 transition-colors"
          >
            🧠 Preset Spine MRI
          </button>
          <button
            type="button"
            onClick={() => handlePrefillDemo("pdf")}
            className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/25 transition-colors"
          >
            📄 Preset Lab PDF
          </button>
        </div>
      </div>

      {/* Upload Form Card */}
      <form
        onSubmit={handleUploadSubmit}
        className="p-6 rounded-2xl bg-[#081813] border border-emerald-900/50 space-y-5 text-xs shadow-xl"
      >
        {/* File Dropzone */}
        <div className="space-y-1.5">
          <label className="font-semibold text-emerald-200 block text-xs">
            Medical File / Scan Photo *
          </label>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />

          {uploadedFilePreview ? (
            <div className="p-4 rounded-xl bg-[#04100c] border border-emerald-500/40 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 truncate">
                {uploadedFileType === "application/pdf" ? (
                  <div className="w-12 h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                    <FileText className="w-6 h-6" />
                  </div>
                ) : (
                  <img
                    src={uploadedFilePreview}
                    alt="preview"
                    className="w-12 h-12 rounded-lg object-cover border border-emerald-500/30 shrink-0"
                  />
                )}
                <div className="truncate">
                  <span className="font-bold text-white block truncate text-sm">
                    {uploadedFileName}
                  </span>
                  <span className="text-[10px] text-emerald-400/60 font-mono">
                    {uploadedFileType}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setUploadedFilePreview(null);
                  setUploadedFileName("");
                  setUploadedFileType("");
                }}
                className="text-xs text-rose-400 hover:text-rose-300 font-semibold shrink-0"
              >
                Change File
              </button>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-emerald-500/30 hover:border-emerald-400/70 rounded-xl p-8 text-center cursor-pointer bg-[#05110d]/50 hover:bg-emerald-500/5 transition-all group"
            >
              <UploadCloud className="w-10 h-10 text-emerald-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <p className="font-bold text-white text-sm">
                Click to browse or drop your scan / PDF here
              </p>
              <p className="text-[11px] text-emerald-300/60 mt-1">
                Supports JPG, PNG, WEBP (X-Rays, Scans) & PDF documents
              </p>
            </div>
          )}
        </div>

        {/* Title and Category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="font-semibold text-emerald-200">
              Record Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Chest Radiograph (PA View)"
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
              className="w-full bg-[#05110d] border border-emerald-900/60 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-emerald-200">Category *</label>
            <select
              value={uploadCategory}
              onChange={(e) =>
                setUploadCategory(e.target.value as MedicalDocumentCategory)
              }
              className="w-full bg-[#05110d] border border-emerald-900/60 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
            >
              <option value="xray">X-Ray Radiograph</option>
              <option value="mri_ct">MRI / CT Scan</option>
              <option value="ultrasound">Ultrasound Sonogram</option>
              <option value="lab_pdf">Lab Report (PDF)</option>
              <option value="prescription_pdf">Prescription Slip</option>
              <option value="discharge_summary">
                Hospital Discharge Summary
              </option>
              <option value="clinical_photo">Clinical / Symptom Photo</option>
              <option value="other">Other Document</option>
            </select>
          </div>
        </div>

        {/* Date and Doctor */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="font-semibold text-emerald-200">
              Date of Scan / Examination *
            </label>
            <input
              type="date"
              required
              value={uploadDocDate}
              onChange={(e) => setUploadDocDate(e.target.value)}
              className="w-full bg-[#05110d] border border-emerald-900/60 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-emerald-200">
              Doctor / Radiologist Name
            </label>
            <input
              type="text"
              placeholder="e.g. Dr. Priya Patel"
              value={uploadDoctor}
              onChange={(e) => setUploadDoctor(e.target.value)}
              className="w-full bg-[#05110d] border border-emerald-900/60 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
            />
          </div>
        </div>

        {/* Hospital */}
        <div className="space-y-1.5">
          <label className="font-semibold text-emerald-200">
            Hospital / Imaging Center
          </label>
          <input
            type="text"
            placeholder="e.g. Metro General Hospital Imaging Dept"
            value={uploadHospital}
            onChange={(e) => setUploadHospital(e.target.value)}
            className="w-full bg-[#05110d] border border-emerald-900/60 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
          />
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="font-semibold text-emerald-200">
            Clinical Findings / Diagnostic Impression
          </label>
          <textarea
            rows={3}
            placeholder="e.g. Normal cardiothoracic ratio, clear bilateral lung fields, no effusion."
            value={uploadNotes}
            onChange={(e) => setUploadNotes(e.target.value)}
            className="w-full bg-[#05110d] border border-emerald-900/60 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-400 resize-none"
          />
        </div>

        {/* Submit Button */}
        <div className="pt-3 border-t border-emerald-900/40 flex items-center justify-end gap-3">
          <Link
            href="/documents"
            className="px-4 py-2.5 rounded-xl bg-[#05110d] text-emerald-300 font-semibold hover:bg-emerald-500/10 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isUploading}
            className="px-6 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-[#071410] font-bold text-xs shadow-lg shadow-emerald-400/20 flex items-center gap-2 disabled:opacity-50 transition-all"
          >
            <UploadCloud className="w-4 h-4" />
            {isUploading ? "Uploading & Encrypting..." : "Store in Medical Vault"}
          </button>
        </div>
      </form>
    </div>
  );
}
