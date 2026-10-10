"use client";

import { useState, useEffect } from "react";
import { Mail, ExternalLink, RefreshCw, Clock, Inbox, CheckCircle2, AlertCircle } from "lucide-react";

interface InboxItem {
  id: string;
  to_email: string;
  subject: string;
  body: string;
  link?: string | null;
  created_at: string;
}

export default function DemoInboxPage() {
  const [messages, setMessages] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<InboxItem | null>(null);

  const fetchInbox = async () => {
    setLoading(true);
    try {
      // Query inbox from backend API or fetch server route
      const res = await fetch("/api/demo-inbox");
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        if (data.messages && data.messages.length > 0) {
          setSelectedMessage(data.messages[0]);
        }
      }
    } catch (_err) {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInbox();
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 pb-16">
      {/* Header Banner */}
      <header className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white py-8 px-4 sm:px-6 border-b border-indigo-900/40">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold mb-2 border border-indigo-500/30">
              <Inbox className="w-3.5 h-3.5" /> Testing & Mail Simulation
            </div>
            <h1 className="text-2xl font-bold tracking-tight">MediCare Demo Mailbox</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              In-app mailbox capturing outgoing emergency approval emails and security notifications.
            </p>
          </div>
          <button
            onClick={fetchInbox}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 text-xs font-medium border border-slate-700 flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 mt-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-950 rounded-2xl border border-slate-800 p-4 min-h-[500px] shadow-2xl">
          {/* Messages List Sidebar */}
          <div className="md:col-span-1 border-r border-slate-800 pr-4 space-y-2 overflow-y-auto max-h-[600px]">
            <h3 className="text-xs font-semibold uppercase text-slate-500 tracking-wider mb-3 px-2">
              Inbox ({messages.length})
            </h3>

            {messages.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                <Mail className="w-8 h-8 mx-auto mb-2 opacity-40" /> No email messages yet.
              </div>
            ) : (
              messages.map((msg) => {
                const isSelected = selectedMessage?.id === msg.id;
                return (
                  <div
                    key={msg.id}
                    onClick={() => setSelectedMessage(msg)}
                    className={`p-3 rounded-xl cursor-pointer transition-all border ${
                      isSelected
                        ? "bg-indigo-950/80 border-indigo-500/50 text-white"
                        : "bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                      <span className="font-mono text-indigo-300 truncate max-w-[130px]">
                        To: {msg.to_email}
                      </span>
                      <span className="text-[10px]">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <h4 className="text-xs font-semibold line-clamp-1">{msg.subject}</h4>
                    <p className="text-[11px] text-slate-400 line-clamp-1 mt-1">{msg.body}</p>
                  </div>
                );
              })
            )}
          </div>

          {/* Message Content Viewer */}
          <div className="md:col-span-2 p-4 flex flex-col justify-between">
            {selectedMessage ? (
              <div className="space-y-6">
                <div className="border-b border-slate-800 pb-4">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span><strong>To:</strong> <code className="text-indigo-300 font-mono">{selectedMessage.to_email}</code></span>
                    <span>{new Date(selectedMessage.created_at).toLocaleString()}</span>
                  </div>
                  <h2 className="text-lg font-bold text-white">{selectedMessage.subject}</h2>
                </div>

                <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-wrap">
                  {selectedMessage.body}
                </div>

                {selectedMessage.link && (
                  <div className="p-4 bg-indigo-950/60 border border-indigo-500/30 rounded-xl space-y-3">
                    <span className="text-xs font-semibold text-indigo-300 block">
                      Action Link Included in Email:
                    </span>
                    <a
                      href={selectedMessage.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg transition-all"
                    >
                      Open Action / Approval Page <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                Select a message to view content
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 text-center text-xs text-slate-500">
        MediCare In-App Demo Inbox • Simulated Email Adapter
      </footer>
    </div>
  );
}
