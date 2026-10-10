"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  FileText,
  Image as ImageIcon,
  File,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Contrast,
  Eye,
  Trash2,
  Plus,
  Search,
  Calendar,
  Stethoscope,
  Building,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldAlert,
  X,
  Lock,
  UploadCloud,
  ExternalLink,
  Filter,
  Shield,
  Layers,
  Sparkles,
  Upload,
  FileCode,
} from "lucide-react";
import { MedicalDocumentCategory } from "@/lib/types/database";
import { getLocalSession } from "@/lib/auth";

export interface DashboardDocument {
  id: string;
  patient_id?: string;
  title?: string;
  file_name: string;
  file_type: string;
  file_size_bytes?: number;
  size_bytes?: number;
  file_url?: string;
  storage_path?: string;
  file_data_url?: string;
  category?: MedicalDocumentCategory | string;
  doc_type?: string;
  doc_date?: string;
  doctor?: string;
  hospital?: string;
  notes?: string;
  status?: "uploaded" | "extracting" | "needs_review" | "confirmed" | "failed";
  confidence_score?: number;
  created_at?: string;
}

const CATEGORY_MAP: Record<
  string,
  { label: string; badgeClass: string; icon: any }
> = {
  xray: {
    label: "X-Ray Scan",
    badgeClass: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    icon: ImageIcon,
  },
  mri_ct: {
    label: "MRI / CT Scan",
    badgeClass: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
    icon: Layers,
  },
  ultrasound: {
    label: "Ultrasound",
    badgeClass: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
    icon: Sparkles,
  },
  lab_pdf: {
    label: "Lab Report (PDF)",
    badgeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    icon: FileText,
  },
  lab_report: {
    label: "Lab Report",
    badgeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    icon: FileText,
  },
  prescription_pdf: {
    label: "Prescription",
    badgeClass: "bg-teal-500/20 text-teal-300 border-teal-500/30",
    icon: FileText,
  },
  prescription: {
    label: "Prescription",
    badgeClass: "bg-teal-500/20 text-teal-300 border-teal-500/30",
    icon: FileText,
  },
  discharge_summary: {
    label: "Discharge Summary",
    badgeClass: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    icon: FileText,
  },
  clinical_photo: {
    label: "Clinical Photo",
    badgeClass: "bg-rose-500/20 text-rose-300 border-rose-500/30",
    icon: ImageIcon,
  },
  other: {
    label: "Other Record",
    badgeClass: "bg-gray-500/20 text-gray-300 border-gray-500/30",
    icon: File,
  },
};

export default function MedicalDocumentsPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [documents, setDocuments] = useState<DashboardDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "images" | "pdfs">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "title">("newest");
  const [statusMsg, setStatusMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Lightbox / Inspection Viewer State
  const [selectedDoc, setSelectedDoc] = useState<DashboardDocument | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [isInverted, setIsInverted] = useState<boolean>(false);

  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
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

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Verify auth session
  useEffect(() => {
    const session = getLocalSession();
    if (!session) {
      setAuthenticated(false);
      setLoading(false);
    } else {
      setAuthenticated(true);
      fetchDocuments(session.user?.id);
    }
  }, []);

  // Listen to keyboard ESC to close viewer modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeLightbox();
        setShowUploadModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const fetchDocuments = async (patientId?: string) => {
    try {
      setLoading(true);
      const pid = patientId || "demo-patient-001";
      const res = await fetch(`/api/documents?patient_id=${pid}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.documents)) {
        setDocuments(data.documents);
      }
    } catch (err) {
      console.error("Error loading documents:", err);
    } finally {
      setLoading(false);
    }
  };

  const closeLightbox = () => {
    setSelectedDoc(null);
    setZoomLevel(1);
    setRotation(0);
    setIsInverted(false);
  };

  const handleOpenDoc = (doc: DashboardDocument) => {
    setSelectedDoc(doc);
    setZoomLevel(1);
    setRotation(0);
    setIsInverted(false);
  };

  const handleDelete = async (docId: string, docTitle: string) => {
    if (!confirm(`Are you sure you want to remove "${docTitle}" from your vault?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/documents?id=${docId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setDocuments((prev) => prev.filter((d) => d.id !== docId));
        setStatusMsg({
          type: "success",
          text: `"${docTitle}" removed from archive.`,
        });
        if (selectedDoc?.id === docId) {
          closeLightbox();
        }
        setTimeout(() => setStatusMsg(null), 3000);
      }
    } catch {
      setStatusMsg({ type: "error", text: "Failed to delete document." });
    }
  };

  // Handle local file selection in quick modal
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
      const lower = file.name.toLowerCase();
      if (
        lower.includes("xray") ||
        lower.includes("x-ray") ||
        lower.includes("chest") ||
        lower.includes("radiograph")
      ) {
        setUploadCategory("xray");
      } else if (lower.includes("mri") || lower.includes("ct")) {
        setUploadCategory("mri_ct");
      } else if (lower.includes("ultrasound")) {
        setUploadCategory("ultrasound");
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

  // Prefill preset demo scans
  const handlePrefillDemo = (kind: "xray" | "mri" | "pdf") => {
    if (kind === "xray") {
      setUploadTitle("Chest Radiograph (PA & Lateral View)");
      setUploadCategory("xray");
      setUploadDocDate(new Date().toISOString().split("T")[0]);
      setUploadDoctor("Dr. Priya Patel");
      setUploadHospital("Metro General Hospital Imaging Dept");
      setUploadNotes(
        "Standard erect PA projection. Clear lung fields, normal bronchovascular markings, no cardiomegaly."
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
        "1.5 Tesla Scan. Mild L4-L5 disc desiccation with central protrusion without thecal sac compromise."
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
      alert("Please provide a title and select a scan or document file.");
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
      if (data.success && data.document) {
        setDocuments((prev) => [data.document, ...prev]);
        setShowUploadModal(false);
        setStatusMsg({
          type: "success",
          text: `"${uploadTitle}" securely archived in your vault!`,
        });
        setUploadTitle("");
        setUploadDoctor("");
        setUploadHospital("");
        setUploadNotes("");
        setUploadedFilePreview(null);
        setUploadedFileName("");
        setUploadedFileType("");
        setUploadedFileSize(0);
        setTimeout(() => setStatusMsg(null), 3500);
      } else {
        alert(data.error || "Failed to upload document");
      }
    } catch (err: any) {
      alert("Error saving document: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "1.2 MB";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const getDocTitle = (doc: DashboardDocument) =>
    doc.title || doc.file_name;

  const getDocCategory = (doc: DashboardDocument): string => {
    if (doc.category) return doc.category;
    if (doc.doc_type) return doc.doc_type;
    return "other";
  };

  const getDocUrl = (doc: DashboardDocument): string =>
    doc.file_url || doc.file_data_url || doc.storage_path || "";

  const isDocPdf = (doc: DashboardDocument) => {
    const fType = (doc.file_type || "").toLowerCase();
    const fName = (doc.file_name || "").toLowerCase();
    const cat = getDocCategory(doc).toLowerCase();
    return (
      fType.includes("pdf") ||
      fName.endsWith(".pdf") ||
      cat.includes("pdf")
    );
  };

  // Filtered & Sorted Documents
  const filteredDocuments = documents
    .filter((doc) => {
      // Category filter
      const cat = getDocCategory(doc);
      if (categoryFilter !== "all") {
        if (categoryFilter === "lab_pdf" && !cat.includes("lab")) return false;
        if (categoryFilter === "prescription_pdf" && !cat.includes("prescription")) return false;
        if (categoryFilter !== "lab_pdf" && categoryFilter !== "prescription_pdf" && cat !== categoryFilter) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== "all" && doc.status !== statusFilter) {
        return false;
      }

      // Type filter
      const isPdf = isDocPdf(doc);
      if (typeFilter === "images" && isPdf) return false;
      if (typeFilter === "pdfs" && !isPdf) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const title = (getDocTitle(doc) || "").toLowerCase();
        const docName = (doc.doctor || "").toLowerCase();
        const hospName = (doc.hospital || "").toLowerCase();
        const notes = (doc.notes || "").toLowerCase();
        const filename = (doc.file_name || "").toLowerCase();
        if (
          !title.includes(query) &&
          !docName.includes(query) &&
          !hospName.includes(query) &&
          !notes.includes(query) &&
          !filename.includes(query)
        ) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => {
      const dateA = a.doc_date ? new Date(a.doc_date).getTime() : 0;
      const dateB = b.doc_date ? new Date(b.doc_date).getTime() : 0;
      if (sortBy === "newest") return dateB - dateA;
      if (sortBy === "oldest") return dateA - dateB;
      return getDocTitle(a).localeCompare(getDocTitle(b));
    });

  // Vault Stats
  const imageCount = documents.filter((d) => !isDocPdf(d)).length;
  const pdfCount = documents.filter((d) => isDocPdf(d)).length;
  const needsReviewCount = documents.filter((d) => d.status === "needs_review").length;
  const totalBytes = documents.reduce(
    (acc, cur) => acc + (cur.file_size_bytes || cur.size_bytes || 1200000),
    0
  );

  if (authenticated === false) {
    return (
      <div className="max-w-md mx-auto py-24 px-4 text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
          <Lock className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white">
            Sign In to Access Medical Files & Records
          </h2>
          <p className="text-xs text-emerald-300/70">
            Your radiographic X-rays, MRI scans, prescriptions, and lab reports are
            stored securely in your private MediCare vault. Sign in to view and inspect.
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
        <p className="text-emerald-300/80 text-sm">
          Loading your medical records, scans & reports...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Top Banner */}
      <div className="relative rounded-2xl bg-gradient-to-r from-[#0a271c] via-[#0e3527] to-[#071912] border border-emerald-500/30 p-6 sm:p-8 overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              Patient Diagnostic Vault & AI Extraction Engine
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Medical Scans, Prescriptions & Reports
            </h1>
            <p className="text-xs sm:text-sm text-emerald-200/80 max-w-2xl leading-relaxed">
              Store, inspect, and extract medical records using multi-modal AI. Upload prescription slips,
              pill packages, lab PDFs, and radiology scans with side-by-side human-in-the-loop verification.
            </p>
            <div className="flex items-center gap-2 pt-1 text-[11px] text-emerald-400/80 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              AI Vision Extraction Active • Human-in-the-Loop Confirmation Required
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/documents/upload"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-[#071410] font-bold text-xs transition-all shadow-lg shadow-emerald-400/20 active:scale-95"
            >
              <Sparkles className="w-4 h-4 stroke-[2.5]" />
              Upload & AI Extract
            </Link>
            <button
              type="button"
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#092219] hover:bg-[#0d3024] text-emerald-300 border border-emerald-500/30 font-semibold text-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              Quick Vault Store
            </button>
            <Link
              href="/consultations"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#092219] hover:bg-[#0d3024] text-emerald-300 border border-emerald-500/30 font-semibold text-xs transition-colors"
            >
              <Stethoscope className="w-3.5 h-3.5 text-emerald-400" />
              Doctor Notes
            </Link>
          </div>
        </div>
      </div>

      {/* Status Alert Banner */}
      {statusMsg && (
        <div
          className={`p-3.5 rounded-xl flex items-center gap-3 text-xs font-semibold transition-all ${
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

      {/* Vault Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl bg-[#091b15] border border-emerald-900/40 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300/70">
              Total Records
            </span>
            <FileText className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black text-white">{documents.length}</p>
          <p className="text-[10px] text-emerald-300/60">
            Archived medical documents
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#091b15] border border-emerald-900/40 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-300/70">
              Needs AI Review
            </span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black text-amber-300">{needsReviewCount}</p>
          <p className="text-[10px] text-amber-300/70">
            Awaiting user confirmation
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#091b15] border border-emerald-900/40 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-cyan-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-cyan-300/70">
              Scans & Photos
            </span>
            <ImageIcon className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black text-white">{imageCount}</p>
          <p className="text-[10px] text-emerald-300/60">
            X-rays, pills & clinical photos
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#091b15] border border-emerald-900/40 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-teal-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-teal-300/70">
              Vault Storage
            </span>
            <UploadCloud className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black text-white">
            {formatFileSize(totalBytes)}
          </p>
          <p className="text-[10px] text-emerald-300/60">
            {pdfCount} PDFs / Reports cached
          </p>
        </div>
      </div>

      {/* Filter, Search & Sort Toolbar */}
      <div className="p-4 rounded-2xl bg-[#081813] border border-emerald-900/40 space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-emerald-400/60 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by title, filename, doctor, hospital, or clinical notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#05110d] border border-emerald-900/60 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-emerald-400/40 focus:outline-none focus:border-emerald-400 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-emerald-400/60 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Format filter */}
            <div className="flex bg-[#05110d] p-1 rounded-xl border border-emerald-900/60 text-xs">
              <button
                type="button"
                onClick={() => setTypeFilter("all")}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  typeFilter === "all"
                    ? "bg-emerald-400 text-[#071410]"
                    : "text-emerald-300/70 hover:text-white"
                }`}
              >
                All Files
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter("images")}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  typeFilter === "images"
                    ? "bg-emerald-400 text-[#071410]"
                    : "text-emerald-300/70 hover:text-white"
                }`}
              >
                Scans & Photos
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter("pdfs")}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  typeFilter === "pdfs"
                    ? "bg-emerald-400 text-[#071410]"
                    : "text-emerald-300/70 hover:text-white"
                }`}
              >
                PDFs
              </button>
            </div>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#05110d] border border-emerald-900/60 rounded-xl px-3 py-2 text-xs text-emerald-200 focus:outline-none focus:border-emerald-400"
            >
              <option value="all">All Statuses</option>
              <option value="needs_review">Needs Review</option>
              <option value="confirmed">Confirmed</option>
              <option value="extracting">Extracting</option>
              <option value="uploaded">Uploaded</option>
            </select>

            {/* Sort dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-[#05110d] border border-emerald-900/60 rounded-xl px-3 py-2 text-xs text-emerald-200 focus:outline-none focus:border-emerald-400"
            >
              <option value="newest">Newest Date</option>
              <option value="oldest">Oldest Date</option>
              <option value="title">Title (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-emerald-400/60 text-[11px] font-semibold mr-1 flex items-center gap-1 shrink-0">
            <Filter className="w-3 h-3" /> Category:
          </span>
          <button
            type="button"
            onClick={() => setCategoryFilter("all")}
            className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-all ${
              categoryFilter === "all"
                ? "bg-emerald-400 text-[#071410]"
                : "bg-[#05110d] text-emerald-300/80 hover:bg-emerald-500/10 border border-emerald-900/40"
            }`}
          >
            All Categories ({documents.length})
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter("xray")}
            className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-all ${
              categoryFilter === "xray"
                ? "bg-amber-400 text-[#071410]"
                : "bg-[#05110d] text-amber-300/80 hover:bg-amber-500/10 border border-amber-900/40"
            }`}
          >
            X-Rays ({documents.filter((d) => getDocCategory(d) === "xray").length})
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter("mri_ct")}
            className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-all ${
              categoryFilter === "mri_ct"
                ? "bg-indigo-400 text-[#071410]"
                : "bg-[#05110d] text-indigo-300/80 hover:bg-indigo-500/10 border border-indigo-900/40"
            }`}
          >
            MRI & CT ({documents.filter((d) => getDocCategory(d) === "mri_ct").length})
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter("prescription_pdf")}
            className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-all ${
              categoryFilter === "prescription_pdf"
                ? "bg-teal-400 text-[#071410]"
                : "bg-[#05110d] text-teal-300/80 hover:bg-teal-500/10 border border-teal-900/40"
            }`}
          >
            Prescriptions ({documents.filter((d) => getDocCategory(d).includes("prescription")).length})
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter("lab_pdf")}
            className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-all ${
              categoryFilter === "lab_pdf"
                ? "bg-emerald-400 text-[#071410]"
                : "bg-[#05110d] text-emerald-300/80 hover:bg-emerald-500/10 border border-emerald-900/40"
            }`}
          >
            Lab Reports ({documents.filter((d) => getDocCategory(d).includes("lab")).length})
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter("discharge_summary")}
            className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-all ${
              categoryFilter === "discharge_summary"
                ? "bg-blue-400 text-[#071410]"
                : "bg-[#05110d] text-blue-300/80 hover:bg-blue-500/10 border border-blue-900/40"
            }`}
          >
            Discharge Summaries ({documents.filter((d) => getDocCategory(d) === "discharge_summary").length})
          </button>
        </div>
      </div>

      {/* Gallery Cards Grid */}
      {filteredDocuments.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#091b15] border border-emerald-900/30 space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
            <ImageIcon className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">
              No medical records match your criteria
            </h3>
            <p className="text-xs text-emerald-300/70 max-w-md mx-auto">
              {searchQuery
                ? `No records found matching "${searchQuery}". Try clearing search filters or uploading a new scan.`
                : "Your medical vault is empty. Upload your prescription slip, lab report, or X-ray scan to begin."}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/documents/upload"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-400 text-[#071410] font-bold text-xs hover:bg-emerald-300 transition-colors"
            >
              <Sparkles className="w-4 h-4" /> Upload & AI Extract
            </Link>
            <button
              type="button"
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#05110d] text-emerald-300 border border-emerald-500/30 font-semibold text-xs hover:bg-emerald-500/10 transition-colors"
            >
              <Plus className="w-4 h-4" /> Quick Vault Store
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDocuments.map((doc) => {
            const rawCat = getDocCategory(doc);
            const catInfo = CATEGORY_MAP[rawCat] || CATEGORY_MAP.other;
            const CatIcon = catInfo.icon;
            const isPdf = isDocPdf(doc);
            const docUrl = getDocUrl(doc);
            const title = getDocTitle(doc);
            const isLowConfidence =
              doc.confidence_score !== undefined &&
              doc.confidence_score > 0 &&
              doc.confidence_score < 80;

            return (
              <div
                key={doc.id}
                className="group relative rounded-2xl bg-[#081813] border border-emerald-900/40 hover:border-emerald-500/50 transition-all flex flex-col overflow-hidden shadow-lg hover:shadow-emerald-500/10"
              >
                {/* Media Thumbnail Box */}
                <div
                  onClick={() => handleOpenDoc(doc)}
                  className="relative w-full h-48 bg-[#040c09] cursor-pointer overflow-hidden border-b border-emerald-900/30 flex items-center justify-center group-hover:opacity-95"
                >
                  {isPdf ? (
                    <div className="flex flex-col items-center justify-center gap-2 p-6 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                        <FileText className="w-8 h-8" />
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-300">
                        PDF DOCUMENT
                      </span>
                      <span className="text-[10px] text-emerald-400/60 font-mono">
                        {formatFileSize(doc.file_size_bytes || doc.size_bytes)}
                      </span>
                    </div>
                  ) : docUrl ? (
                    <div className="w-full h-full relative">
                      <img
                        src={docUrl}
                        alt={title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#040c09] via-transparent to-transparent opacity-60" />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 p-6 text-center text-slate-500">
                      <FileCode className="w-8 h-8 text-emerald-400/60" />
                      <span className="text-xs font-mono text-emerald-300/70">
                        {doc.file_name}
                      </span>
                    </div>
                  )}

                  {/* Hover Inspect Badge Overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="px-3.5 py-1.5 rounded-full bg-emerald-400 text-[#071410] font-bold text-xs flex items-center gap-1.5 shadow-lg transform -translate-y-1 group-hover:translate-y-0 transition-all">
                      <Eye className="w-3.5 h-3.5" />
                      {isPdf ? "Preview Document" : "Inspect Record"}
                    </span>
                  </div>

                  {/* Category Pill Tag */}
                  <div className="absolute top-3 left-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border backdrop-blur-md ${catInfo.badgeClass}`}
                    >
                      <CatIcon className="w-3 h-3" />
                      {catInfo.label}
                    </span>
                  </div>

                  {/* Scan Date Badge */}
                  <div className="absolute top-3 right-3">
                    <span className="px-2 py-0.5 rounded-md bg-[#071410]/80 border border-emerald-500/20 text-[10px] font-mono text-emerald-300 backdrop-blur-md">
                      {formatDate(doc.doc_date)}
                    </span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3
                        onClick={() => handleOpenDoc(doc)}
                        className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors line-clamp-1 cursor-pointer flex-1"
                        title={title}
                      >
                        {title}
                      </h3>
                      {doc.confidence_score !== undefined && doc.confidence_score > 0 && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-mono font-medium border shrink-0 ${
                            isLowConfidence
                              ? "bg-amber-950/40 text-amber-300 border-amber-600/50"
                              : "bg-emerald-950/40 text-emerald-300 border-emerald-600/50"
                          }`}
                        >
                          {doc.confidence_score}% Conf
                        </span>
                      )}
                    </div>

                    {/* Status Badge */}
                    {doc.status && (
                      <div className="flex items-center gap-2">
                        {doc.status === "needs_review" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            <AlertTriangle className="w-3 h-3" />
                            Needs Review
                          </span>
                        )}
                        {doc.status === "confirmed" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            Confirmed
                          </span>
                        )}
                        {doc.status === "extracting" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30 animate-pulse">
                            <Clock className="w-3 h-3" />
                            Extracting...
                          </span>
                        )}
                        {doc.status === "uploaded" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                            Uploaded
                          </span>
                        )}
                      </div>
                    )}

                    {/* Metadata details */}
                    <div className="space-y-1 text-[11px] text-emerald-300/80">
                      {doc.doctor && (
                        <div className="flex items-center gap-1.5 truncate">
                          <Stethoscope className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="truncate">{doc.doctor}</span>
                        </div>
                      )}
                      {doc.hospital && (
                        <div className="flex items-center gap-1.5 truncate">
                          <Building className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="truncate">{doc.hospital}</span>
                        </div>
                      )}
                    </div>

                    {/* Clinical Notes snippet */}
                    {doc.notes && (
                      <p className="text-[11px] text-emerald-200/60 line-clamp-2 leading-relaxed bg-[#05110d] p-2 rounded-lg border border-emerald-900/30">
                        {doc.notes}
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-emerald-900/40 flex flex-col gap-2 text-xs">
                    {/* Primary CTA: Review or Inspect */}
                    <div className="flex items-center justify-between gap-2">
                      {doc.status === "needs_review" ? (
                        <Link
                          href={`/documents/${doc.id}/review`}
                          className="flex-1 py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Review Extraction
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenDoc(doc)}
                          className="inline-flex items-center gap-1.5 font-bold text-emerald-300 hover:text-emerald-200 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Inspect & View
                        </button>
                      )}

                      <div className="flex items-center gap-1">
                        {doc.status === "confirmed" && (
                          <Link
                            href={`/documents/${doc.id}/review`}
                            className="p-1.5 rounded-lg text-emerald-400/80 hover:text-white hover:bg-emerald-500/10 transition-colors text-[11px] font-semibold flex items-center gap-1"
                            title="View AI extracted items"
                          >
                            <FileCode className="w-3.5 h-3.5" />
                            Data
                          </Link>
                        )}
                        {docUrl && (
                          <a
                            href={docUrl}
                            download={doc.file_name}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg text-emerald-400/80 hover:text-white hover:bg-emerald-500/10 transition-colors"
                            title="Download file"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(doc.id, title)}
                          className="p-1.5 rounded-lg text-emerald-400/60 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Delete from archive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Clinical Disclaimer Notice */}
      <div className="flex items-start gap-3 bg-slate-900/30 border border-slate-800/80 rounded-xl p-4 text-xs text-slate-400">
        <ShieldAlert className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <p>
          <strong className="text-slate-300">Clinical Safety Notice:</strong> MediCare is a patient records app, not insurance. Demo with simulated data. Multi-modal AI extraction provides decision support only and does not constitute medical diagnosis. Extracted records require human-in-the-loop confirmation before being committed to your longitudinal timeline.
        </p>
      </div>

      {/* =========================================================================
          LIGHTBOX MEDICAL INSPECTION VIEWER MODAL
      ========================================================================= */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4">
          <div className="relative w-full max-w-6xl h-[92vh] rounded-2xl bg-[#06140f] border border-emerald-500/40 shadow-2xl flex flex-col overflow-hidden">
            {/* Top Lightbox Header */}
            <div className="px-5 py-3.5 border-b border-emerald-900/50 bg-[#071912] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 truncate">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                    (CATEGORY_MAP[getDocCategory(selectedDoc)] || CATEGORY_MAP.other)
                      .badgeClass
                  }`}
                >
                  {
                    (CATEGORY_MAP[getDocCategory(selectedDoc)] || CATEGORY_MAP.other)
                      .label
                  }
                </span>
                <h2 className="text-sm sm:text-base font-bold text-white truncate">
                  {getDocTitle(selectedDoc)}
                </h2>
                <span className="hidden sm:inline-block text-[11px] text-emerald-400/60 font-mono">
                  ({formatDate(selectedDoc.doc_date)})
                </span>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={closeLightbox}
                className="p-1.5 rounded-xl bg-emerald-500/10 hover:bg-rose-500/20 text-emerald-300 hover:text-rose-300 transition-colors"
                title="Close viewer (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Viewer Body */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              {/* Media Display Area */}
              <div className="flex-1 bg-[#020705] relative flex flex-col overflow-hidden">
                {/* Control Toolbar (Only for Image/Scan) */}
                {!isDocPdf(selectedDoc) && getDocUrl(selectedDoc) && (
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-[#091f16]/90 border border-emerald-500/30 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg">
                    <button
                      type="button"
                      onClick={() =>
                        setZoomLevel((prev) => Math.min(prev + 0.25, 3))
                      }
                      className="p-1 rounded text-emerald-300 hover:text-white hover:bg-emerald-500/20"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <span className="text-[11px] font-mono text-emerald-300 px-1 min-w-[42px] text-center">
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setZoomLevel((prev) => Math.max(prev - 0.25, 0.5))
                      }
                      className="p-1 rounded text-emerald-300 hover:text-white hover:bg-emerald-500/20"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <div className="w-[1px] h-4 bg-emerald-500/30 mx-1" />
                    <button
                      type="button"
                      onClick={() => setRotation((prev) => (prev + 90) % 360)}
                      className="p-1 rounded text-emerald-300 hover:text-white hover:bg-emerald-500/20 flex items-center gap-1 text-[11px]"
                      title="Rotate 90 degrees"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                    <div className="w-[1px] h-4 bg-emerald-500/30 mx-1" />
                    {/* Radiology Invert Contrast Mode */}
                    <button
                      type="button"
                      onClick={() => setIsInverted((prev) => !prev)}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                        isInverted
                          ? "bg-amber-400 text-[#071410]"
                          : "text-emerald-300 hover:bg-emerald-500/20"
                      }`}
                      title="Invert contrast (radiology negative view)"
                    >
                      <Contrast className="w-3.5 h-3.5" />
                      Invert
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setZoomLevel(1);
                        setRotation(0);
                        setIsInverted(false);
                      }}
                      className="text-[11px] text-emerald-400/80 hover:text-white px-1.5 py-0.5"
                      title="Reset orientation"
                    >
                      Reset
                    </button>
                  </div>
                )}

                {/* Media Presentation View */}
                <div className="flex-1 overflow-auto flex items-center justify-center p-4 select-none">
                  {isDocPdf(selectedDoc) && getDocUrl(selectedDoc) ? (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                      <iframe
                        src={getDocUrl(selectedDoc)}
                        className="w-full h-full rounded-xl border border-emerald-900/60 bg-white"
                        title={getDocTitle(selectedDoc)}
                      />
                    </div>
                  ) : getDocUrl(selectedDoc) ? (
                    <div className="transition-transform duration-150 flex items-center justify-center">
                      <img
                        src={getDocUrl(selectedDoc)}
                        alt={getDocTitle(selectedDoc)}
                        style={{
                          transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                          filter: isInverted
                            ? "invert(100%) contrast(125%) brightness(110%)"
                            : "none",
                        }}
                        className="max-h-[75vh] max-w-[85vw] object-contain rounded-lg shadow-2xl transition-all"
                      />
                    </div>
                  ) : (
                    <div className="text-center p-8 text-emerald-400/70">
                      <FileCode className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm font-semibold text-white">{getDocTitle(selectedDoc)}</p>
                      <p className="text-xs text-emerald-300/60 mt-1">Stored record metadata available</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar with Findings & Details */}
              <div className="w-full lg:w-80 bg-[#071912] border-t lg:border-t-0 lg:border-l border-emerald-900/40 p-5 flex flex-col justify-between overflow-y-auto space-y-4">
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400/70 block">
                      Record Details
                    </span>
                    <h3 className="text-base font-bold text-white mt-1">
                      {getDocTitle(selectedDoc)}
                    </h3>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="p-2.5 rounded-xl bg-[#04100c] border border-emerald-900/40 space-y-1">
                      <span className="text-[10px] text-emerald-400/60 block font-mono">
                        DATE OF EXAMINATION / RECORD
                      </span>
                      <div className="flex items-center gap-1.5 text-white font-semibold">
                        <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                        {formatDate(selectedDoc.doc_date)}
                      </div>
                    </div>

                    {selectedDoc.doctor && (
                      <div className="p-2.5 rounded-xl bg-[#04100c] border border-emerald-900/40 space-y-1">
                        <span className="text-[10px] text-emerald-400/60 block font-mono">
                          PHYSICIAN / PROVIDER
                        </span>
                        <div className="flex items-center gap-1.5 text-white font-semibold">
                          <Stethoscope className="w-3.5 h-3.5 text-emerald-400" />
                          {selectedDoc.doctor}
                        </div>
                      </div>
                    )}

                    {selectedDoc.hospital && (
                      <div className="p-2.5 rounded-xl bg-[#04100c] border border-emerald-900/40 space-y-1">
                        <span className="text-[10px] text-emerald-400/60 block font-mono">
                          FACILITY / CLINIC
                        </span>
                        <div className="flex items-center gap-1.5 text-white font-semibold">
                          <Building className="w-3.5 h-3.5 text-emerald-400" />
                          {selectedDoc.hospital}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Notes & Findings */}
                  {selectedDoc.notes && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400/70 block">
                        CLINICAL NOTES & FINDINGS
                      </span>
                      <div className="p-3 rounded-xl bg-[#04100c] border border-emerald-900/40 text-xs text-emerald-200/90 leading-relaxed whitespace-pre-line">
                        {selectedDoc.notes}
                      </div>
                    </div>
                  )}

                  {/* Review CTA link if available */}
                  <Link
                    href={`/documents/${selectedDoc.id}/review`}
                    className="w-full py-2 px-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-amber-500/25 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Inspect AI Structured Data
                  </Link>

                  {/* Safety & Archival Notice */}
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300/80 leading-relaxed space-y-1">
                    <span className="font-bold text-emerald-300 flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5" /> Archival Record
                    </span>
                    Stored for patient record retention and doctor consultation.
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-4 border-t border-emerald-900/40 space-y-2">
                  {getDocUrl(selectedDoc) && (
                    <>
                      <a
                        href={getDocUrl(selectedDoc)}
                        download={selectedDoc.file_name}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-2.5 px-4 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-[#071410] font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-400/10"
                      >
                        <Download className="w-4 h-4" /> Download Original Record
                      </a>
                      <a
                        href={getDocUrl(selectedDoc)}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-2 px-4 rounded-xl bg-[#092219] hover:bg-[#0c2f22] text-emerald-300 border border-emerald-500/20 font-semibold text-xs transition-colors flex items-center justify-center gap-2"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Open in New Tab
                      </a>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          UPLOAD DOCUMENT / SCAN MODAL
      ========================================================================= */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-2xl bg-[#071912] border border-emerald-500/30 p-6 space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-emerald-900/40 pb-3">
              <div className="space-y-0.5">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <UploadCloud className="w-5 h-5 text-emerald-400" />
                  Store Medical Scan or PDF
                </h3>
                <p className="text-xs text-emerald-300/70">
                  Upload an X-ray photo, MRI scan, sonogram, or lab report PDF
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="p-1 rounded-lg text-emerald-400 hover:text-white hover:bg-emerald-500/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Demo Pre-fill Buttons */}
            <div className="p-3 rounded-xl bg-[#05110d] border border-emerald-900/50 space-y-2">
              <span className="text-[10px] font-mono uppercase text-emerald-400/80 block">
                Quick Demo Presets (Test in 1-Click):
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handlePrefillDemo("xray")}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold hover:bg-amber-500/25"
                >
                  🩻 Preset Chest X-Ray
                </button>
                <button
                  type="button"
                  onClick={() => handlePrefillDemo("mri")}
                  className="px-2.5 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold hover:bg-indigo-500/25"
                >
                  🧠 Preset Spine MRI
                </button>
                <button
                  type="button"
                  onClick={() => handlePrefillDemo("pdf")}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/25"
                >
                  📄 Preset Lab PDF
                </button>
              </div>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
              {/* File Dropzone / Picker */}
              <div className="space-y-1.5">
                <label className="font-semibold text-emerald-200 block">
                  Select File (Photos, X-Rays, Scans or PDF) *
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {uploadedFilePreview ? (
                  <div className="p-3 rounded-xl bg-[#04100c] border border-emerald-500/40 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 truncate">
                      {uploadedFileType === "application/pdf" ? (
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                      ) : (
                        <img
                          src={uploadedFilePreview}
                          alt="preview"
                          className="w-10 h-10 rounded-lg object-cover border border-emerald-500/30 shrink-0"
                        />
                      )}
                      <div className="truncate">
                        <span className="font-bold text-white block truncate text-xs">
                          {uploadedFileName}
                        </span>
                        <span className="text-[10px] text-emerald-400/60 font-mono">
                          {formatFileSize(uploadedFileSize)} • {uploadedFileType}
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
                      Change
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-emerald-500/30 hover:border-emerald-400/70 rounded-xl p-6 text-center cursor-pointer bg-[#05110d]/50 hover:bg-emerald-500/5 transition-all group"
                  >
                    <UploadCloud className="w-8 h-8 text-emerald-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                    <p className="font-bold text-white text-xs">
                      Click to choose or drag & drop scan file
                    </p>
                    <p className="text-[11px] text-emerald-300/60 mt-1">
                      Supports JPG, PNG, WEBP (X-rays, MRI, CT) & PDF documents
                    </p>
                  </div>
                )}
              </div>

              {/* Title & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-emerald-200">
                    Record Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Chest Radiograph PA View"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    className="w-full bg-[#05110d] border border-emerald-900/60 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-emerald-200">
                    Category *
                  </label>
                  <select
                    value={uploadCategory}
                    onChange={(e) =>
                      setUploadCategory(
                        e.target.value as MedicalDocumentCategory
                      )
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
                    <option value="clinical_photo">
                      Clinical / Symptom Photo
                    </option>
                    <option value="other">Other Document</option>
                  </select>
                </div>
              </div>

              {/* Date & Physician */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-emerald-200">
                    Date of Scan / Exam *
                  </label>
                  <input
                    type="date"
                    required
                    value={uploadDocDate}
                    onChange={(e) => setUploadDocDate(e.target.value)}
                    className="w-full bg-[#05110d] border border-emerald-900/60 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div className="space-y-1">
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

              {/* Facility */}
              <div className="space-y-1">
                <label className="font-semibold text-emerald-200">
                  Hospital / Imaging Center
                </label>
                <input
                  type="text"
                  placeholder="e.g. Metro Diagnostic Imaging Lab"
                  value={uploadHospital}
                  onChange={(e) => setUploadHospital(e.target.value)}
                  className="w-full bg-[#05110d] border border-emerald-900/60 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="font-semibold text-emerald-200">
                  Clinical Impression / Findings
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Normal cardiothoracic ratio. No focal consolidations or pleural effusion."
                  value={uploadNotes}
                  onChange={(e) => setUploadNotes(e.target.value)}
                  className="w-full bg-[#05110d] border border-emerald-900/60 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-400 resize-none"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-emerald-900/40 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#05110d] text-emerald-300 font-semibold hover:bg-emerald-500/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-5 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-[#071410] font-bold shadow-md shadow-emerald-400/20 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isUploading ? "Storing in Vault..." : "Save to Vault"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
