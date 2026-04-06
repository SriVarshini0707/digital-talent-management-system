import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MessageSquare, Send, UserCircle, ArrowLeft } from "lucide-react";
import { motion } from "motion/react";
import { ChatContact, DirectMessage, UserRole } from "../../types";
import { useAuth } from "../../App";

export default function DirectMessages() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string>("");
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [contactsError, setContactsError] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);

  const selectedContact = useMemo(
    () => contacts.find((contact) => contact.id === selectedContactId) || null,
    [contacts, selectedContactId]
  );

  const refreshContacts = async () => {
    const res = await fetch("/api/chat/contacts", { credentials: "include" });
    const data = await res.json();
    if (!res.ok) {
      setContacts([]);
      setContactsError(data?.error || "Unable to load chat contacts.");
      return;
    }
    setContactsError("");
    const nextContacts = Array.isArray(data) ? data : [];
    setContacts(nextContacts);
    setSelectedContactId((current) => current || nextContacts[0]?.id || "");
  };

  const refreshMessages = async (contactId: string) => {
    if (!contactId) {
      setMessages([]);
      return;
    }
    setIsLoadingMessages(true);
    setError("");
    try {
      const res = await fetch(`/api/chat/${contactId}/messages`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Unable to load messages.");
        setMessages([]);
        return;
      }
      setMessages(Array.isArray(data) ? data : []);
      setContacts((current) => current.map((contact) => (
        contact.id === contactId ? { ...contact, unread_count: 0 } : contact
      )));
    } catch {
      setError("Unable to load messages.");
      setMessages([]);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      setIsLoadingContacts(true);
      try {
        await refreshContacts();
      } finally {
        setIsLoadingContacts(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!selectedContactId) return;
    refreshMessages(selectedContactId);
  }, [selectedContactId]);

  useEffect(() => {
    if (!selectedContactId) return;
    const interval = window.setInterval(() => {
      refreshContacts().catch(() => {});
      refreshMessages(selectedContactId).catch(() => {});
    }, 8000);
    return () => window.clearInterval(interval);
  }, [selectedContactId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedContactId || !draft.trim()) return;
    setIsSending(true);
    setError("");
    try {
      const res = await fetch(`/api/chat/${selectedContactId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: draft.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Unable to send message.");
        return;
      }
      setDraft("");
      await Promise.all([refreshContacts(), refreshMessages(selectedContactId)]);
    } catch {
      setError("Unable to send message.");
    } finally {
      setIsSending(false);
    }
  };

  const counterpartLabel = user?.role === UserRole.ADMIN ? "Users" : "Admins";
  const emptyContactsLabel = user?.role === UserRole.ADMIN
    ? "No user accounts are available to message yet."
    : "No admin accounts are available to message yet.";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-7xl space-y-6"
    >
      <div className="overflow-hidden rounded-[2rem] border border-sky-200/60 bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_48%,#f97316_100%)] p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-sky-100/80">Direct Messages</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">Private chat between admins and users</h1>
            <p className="mt-2 max-w-2xl text-sm text-sky-50/90">
              Send one-to-one messages, ask questions, and keep follow-ups out of task cards when they do not belong to a specific submission.
            </p>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/15"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <section className="rounded-[1.75rem] border border-slate-200 bg-white/90 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-2xl bg-sky-100 p-3 text-sky-700">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">{counterpartLabel}</h2>
              <p className="text-xs text-slate-500">Choose one person to start chatting.</p>
            </div>
          </div>

          <div className="space-y-2">
            {isLoadingContacts && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                Loading contacts...
              </div>
            )}
            {!isLoadingContacts && contactsError && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {contactsError}
              </div>
            )}
            {!isLoadingContacts && !contactsError && contacts.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                {emptyContactsLabel}
              </div>
            )}
            {contacts.map((contact) => {
              const isActive = contact.id === selectedContactId;
              return (
                <button
                  key={contact.id}
                  type="button"
                  onClick={() => setSelectedContactId(contact.id)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition-all ${isActive ? "border-sky-300 bg-sky-50 shadow-[0_10px_24px_rgba(14,165,233,0.08)]" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{contact.name}</p>
                      <p className="truncate text-xs text-slate-500">{contact.email}</p>
                      <p className="mt-1 truncate text-xs text-slate-400">{contact.latest_message || "No messages yet"}</p>
                    </div>
                    {!!contact.unread_count && (
                      <span className="rounded-full bg-pink-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                        {contact.unread_count}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="flex min-h-[620px] flex-col overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white/92 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <div className="border-b border-slate-200 px-6 py-4">
            {selectedContact ? (
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-slate-100 p-2 text-slate-500">
                  <UserCircle className="h-8 w-8" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">{selectedContact.name}</h2>
                  <p className="text-xs uppercase tracking-wider text-slate-500">{selectedContact.role}</p>
                </div>
              </div>
            ) : (
              <div>
                <h2 className="font-semibold text-slate-900">Conversation</h2>
                <p className="text-xs text-slate-500">Pick a contact to open the chat.</p>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto bg-[linear-gradient(180deg,#f8fbff_0%,#fffaf5_100%)] px-4 py-5 sm:px-6">
            {error && (
              <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}
            {isLoadingMessages && selectedContact && (
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                Loading conversation...
              </div>
            )}
            {!selectedContact && (
              <div className="flex h-full items-center justify-center">
                <div className="max-w-sm rounded-[2rem] border border-dashed border-slate-200 bg-white/80 px-6 py-8 text-center">
                  <p className="text-lg font-semibold text-slate-900">Choose a person to start chatting</p>
                  <p className="mt-2 text-sm text-slate-500">Messages here are private between admins and users only.</p>
                </div>
              </div>
            )}
            {selectedContact && !isLoadingMessages && messages.length === 0 && (
              <div className="flex h-full items-center justify-center">
                <div className="max-w-sm rounded-[2rem] border border-dashed border-slate-200 bg-white/80 px-6 py-8 text-center">
                  <p className="text-lg font-semibold text-slate-900">No messages yet</p>
                  <p className="mt-2 text-sm text-slate-500">Send the first message to start the conversation.</p>
                </div>
              </div>
            )}
            <div className="space-y-3">
              {messages.map((message) => {
                const isMine = message.sender_id === user?.id;
                return (
                  <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-[1.5rem] px-4 py-3 shadow-sm ${isMine ? "bg-[linear-gradient(135deg,#0ea5e9,#8b5cf6)] text-white" : "border border-slate-200 bg-white text-slate-800"}`}>
                      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.content}</p>
                      <p className={`mt-2 text-[10px] uppercase tracking-wider ${isMine ? "text-sky-100/80" : "text-slate-400"}`}>
                        {message.sender_name} • {new Date(message.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>
          </div>

          <form onSubmit={sendMessage} className="border-t border-slate-200 bg-white px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row">
              <textarea
                rows={2}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                disabled={!selectedContact || isSending}
                placeholder={selectedContact ? "Write a private message..." : "Select a contact to start chatting"}
                className="min-h-[56px] flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={!selectedContact || isSending || !draft.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#ec4899,#8b5cf6)] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(168,85,247,0.2)] transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSending ? "Sending..." : "Send"}
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </section>
      </div>
    </motion.div>
  );
}
