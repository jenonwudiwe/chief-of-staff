import React, { useState, useEffect } from "react";
import {
  LayoutDashboard, Users, CheckSquare, Scale, UserRound, Sparkles,
  CalendarClock, Plus, Pencil, Trash2, X, AlertTriangle, Check, Copy,
  RotateCcw, Loader2, Flag, Building2, Circle, ChevronRight, Clock, ClipboardList,
  Search, FileText, Save, Calendar, Link2, ExternalLink,
  Boxes, TrendingUp, Crown, ArrowUpRight, ChevronLeft, PanelLeft
} from "lucide-react";

/* ---------- constants ---------- */
const KEY = "cos-state-v5";
const today = () => new Date().toISOString().slice(0, 10);
const uid = () => Math.random().toString(36).slice(2, 9);
const CLAUDE_URL = (typeof window !== "undefined" && window.storage) ? "https://api.anthropic.com/v1/messages" : "/api/claude";
function mondayOf(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d.toISOString().slice(0, 10);
}
function addDays(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function weekLabel(start) {
  const s = new Date(start + "T00:00:00");
  const e = new Date(s); e.setDate(e.getDate() + 4);
  const mo = (d) => d.toLocaleDateString("en-US", { month: "short" });
  const same = s.getMonth() === e.getMonth();
  return same ? `${mo(s)} ${s.getDate()}–${e.getDate()}, ${e.getFullYear()}` : `${mo(s)} ${s.getDate()} – ${mo(e)} ${e.getDate()}, ${e.getFullYear()}`;
}
function normalize(d) {
  return {
    teams: d.teams || TEAMS_SEED,
    people: d.people || [],
    workstreams: (d.workstreams || []).map((w) => ({ due: "", ...w })),
    tasks: (d.tasks || []).map((t) => ({ subtasks: [], links: [], blocker: "", ...t, status: t.status === "Doing" ? "In progress" : (t.status || "To do") })),
    decisions: d.decisions || [],
    meetings: d.meetings || [],
    weeks: d.weeks || [],
    currentWeekStart: d.currentWeekStart || mondayOf(today()),
  };
}

async function copyText(text) {  try { if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(text); return true; } } catch (e) {}
  try {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.top = "0"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.focus(); ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch (e) { return false; }
}
function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch (e) { return url.length > 24 ? url.slice(0, 24) + "…" : url; }
}

// Recurring weekly meetings (getDay: 1=Mon .. 5=Fri)
const SCHEDULE = [
  { weekday: 1, label: "Management meeting", type: "Management", scope: "management" },
  { weekday: 1, label: "Growth team", type: "Growth team", scope: "growth" },
  { weekday: 2, label: "Product team", type: "Product team", scope: "product" },
  { weekday: 3, label: "Management check-in", type: "Management", scope: "management" },
  { weekday: 4, label: "Growth team (if needed)", type: "Growth team", scope: "growth" },
  { weekday: 5, label: "Product team", type: "Product team", scope: "product" },
  { weekday: 5, label: "Growth team", type: "Growth team", scope: "growth" },
];

const TEAMS_SEED = [
  { id: "g-psam", name: "Partner Success & Account Management", org: "Growth" },
  { id: "g-mkt", name: "Marketing", org: "Growth" },
  { id: "g-tsi", name: "Technical Support, Integrations & Dev Experience", org: "Growth" },
  { id: "p-ifd", name: "Identity & Financial Data", org: "Product" },
  { id: "p-pay", name: "Payments", org: "Product" },
  { id: "p-plat", name: "Platforms", org: "Product" },
  { id: "p-owo", name: "Owo", org: "Product" },
];

const WS_STATUS = ["Not started", "In progress", "Pushing through", "Blocked", "Shipped", "Dropped"];
const TASK_TYPE = ["To-do", "Doc/Flow review", "Follow-up"];
const TASK_STATUS = ["To do", "In progress", "Blocked", "Done"];
const PRIORITY = ["P0", "P1", "P2"];
const DECIDER = ["Me", "Peer manager", "CEO"];
const DEC_STATUS = ["Open", "Needs input", "Ready to decide", "Decided", "Awaiting sign-off"];
const PEOPLE_STATUS = ["Thriving", "Steady", "Needs support", "At risk"];
const CADENCE = ["Weekly", "Biweekly", "Monthly"];
const MEETING_TYPE = ["Management", "Product team", "Growth team", "Sub-team", "1:1", "CEO 1:1"];

const PRIO_ORDER = { P0: 0, P1: 1, P2: 2 };

const TONES = {
  slate: "bg-slate-100 text-slate-600 border-slate-200",
  teal: "bg-teal-50 text-teal-700 border-teal-200",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  rose: "bg-rose-50 text-rose-700 border-rose-200",
  sky: "bg-sky-50 text-sky-700 border-sky-200",
  indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
};
const DOT = { slate: "bg-slate-400", teal: "bg-teal-500", emerald: "bg-emerald-500", amber: "bg-amber-500", rose: "bg-rose-500", sky: "bg-sky-500", indigo: "bg-indigo-500" };
const ACCENT = {
  slate: { chip: "bg-slate-100 text-slate-600", text: "text-slate-700", ring: "ring-slate-200", soft: "bg-slate-50" },
  indigo: { chip: "bg-indigo-100 text-indigo-600", text: "text-indigo-700", ring: "ring-indigo-200", soft: "bg-indigo-50" },
  emerald: { chip: "bg-emerald-100 text-emerald-600", text: "text-emerald-700", ring: "ring-emerald-200", soft: "bg-emerald-50" },
  amber: { chip: "bg-amber-100 text-amber-600", text: "text-amber-700", ring: "ring-amber-200", soft: "bg-amber-50" },
  teal: { chip: "bg-teal-100 text-teal-600", text: "text-teal-700", ring: "ring-teal-200", soft: "bg-teal-50" },
  rose: { chip: "bg-rose-100 text-rose-600", text: "text-rose-700", ring: "ring-rose-200", soft: "bg-rose-50" },
  sky: { chip: "bg-sky-100 text-sky-600", text: "text-sky-700", ring: "ring-sky-200", soft: "bg-sky-50" },
};
const WS_TONE = { "Not started": "slate", "In progress": "sky", "Pushing through": "emerald", "Blocked": "rose", "Shipped": "emerald", "Dropped": "slate" };
const TASK_TONE = { "To do": "slate", "In progress": "sky", "Doing": "sky", "Blocked": "rose", "Done": "emerald" };
const PRIO_TONE = { P0: "rose", P1: "amber", P2: "slate" };
const DECIDER_TONE = { "Me": "teal", "Peer manager": "indigo", "CEO": "amber" };
const DEC_TONE = { "Open": "slate", "Needs input": "amber", "Ready to decide": "sky", "Decided": "emerald", "Awaiting sign-off": "indigo" };
const PPL_TONE = { "Thriving": "emerald", "Steady": "sky", "Needs support": "amber", "At risk": "rose" };

/* ---------- storage wrapper (persistent, with in-memory fallback) ---------- */
const mem = {};
const store = {
  async get(k) {
    try { if (window.storage) { const r = await window.storage.get(k); return r ? r.value : null; } } catch (e) {}
    try { const v = localStorage.getItem(k); return v; } catch (e) { return mem[k] ?? null; }
  },
  async set(k, v) {
    try { if (window.storage) { await window.storage.set(k, v); return; } } catch (e) {}
    try { localStorage.setItem(k, v); return; } catch (e) {}
    mem[k] = v;
  },
};

/* ---------- seed ---------- */
function seed() {
  const M = "m-growth-0814";
  const P = "m-product-0814";
  return {
    teams: TEAMS_SEED,
    people: [
      { id: "pe-martha", name: "Martha Obike", org: "Growth", subTeam: "g-mkt", role: "Growth Marketer", cadence: "Monthly", nextOneOnOne: "2026-11-03", status: "Thriving" },
      { id: "pe-omolara", name: "Omolara Akanni", org: "Growth", subTeam: "g-psam", role: "", cadence: "Monthly", nextOneOnOne: "", status: "Steady" },
      { id: "pe-ogenna", name: "Ogenna Ogbogu", org: "Growth", subTeam: "g-tsi", role: "", cadence: "Monthly", nextOneOnOne: "", status: "Steady" },
      { id: "pe-ololade", name: "Ololade Akingbade", org: "Growth", subTeam: "g-psam", role: "Partner Success", cadence: "Monthly", nextOneOnOne: "2026-10-30", status: "Needs support" },
      { id: "pe-salim", name: "Salim Kobi", org: "Growth", subTeam: "g-psam", role: "", cadence: "Monthly", nextOneOnOne: "", status: "Steady" },
      { id: "pe-christian", name: "Christian Ndu", org: "Growth", subTeam: "g-psam", role: "", cadence: "Monthly", nextOneOnOne: "", status: "Steady" },
      { id: "pe-christianah", name: "Christianah Afonja", org: "Growth", subTeam: "g-tsi", role: "", cadence: "Monthly", nextOneOnOne: "", status: "Steady" },
      { id: "pe-king", name: "King Kenway-Davidson", org: "Growth", subTeam: "", role: "", cadence: "Monthly", nextOneOnOne: "", status: "Steady" },
      { id: "pe-kome", name: "Oghenekome Olomu", org: "Growth", subTeam: "", role: "", cadence: "Monthly", nextOneOnOne: "", status: "Steady" },
      { id: "pe-tolu", name: "Toluwalope Eniafe", org: "Growth", subTeam: "", role: "", cadence: "Monthly", nextOneOnOne: "", status: "Steady" },
      { id: "pe-tinuola", name: "Tinuola Oyepitan", org: "Product", subTeam: "p-plat", role: "Platform PM", cadence: "Monthly", nextOneOnOne: "2026-11-04", status: "Steady" },
      { id: "pe-anita", name: "Anita Onwuemene", org: "Product", subTeam: "p-pay", role: "Payments PM", cadence: "Monthly", nextOneOnOne: "2026-11-06", status: "Thriving" },
      { id: "pe-erowo", name: "Erowo Joseph-Ogeh", org: "Product", subTeam: "p-pay", role: "", cadence: "Monthly", nextOneOnOne: "", status: "Steady" },
      { id: "pe-halimah", name: "Halimah Balogun", org: "Product", subTeam: "p-owo", role: "", cadence: "Monthly", nextOneOnOne: "", status: "Steady" },
      { id: "pe-victor", name: "Victor", org: "Product", subTeam: "p-plat", role: "", cadence: "Monthly", nextOneOnOne: "", status: "Steady" },
      { id: "pe-seun", name: "Seun", org: "Product", subTeam: "p-plat", role: "", cadence: "Monthly", nextOneOnOne: "", status: "Steady" },
      { id: "pe-desmond", name: "Desmond", org: "Product", subTeam: "p-plat", role: "", cadence: "Monthly", nextOneOnOne: "", status: "Steady" },
    ],
    workstreams: [
      { id: "w-partner-followups", title: "Partner integration follow-ups", subTeam: "g-psam", owner: "pe-ololade", status: "In progress", blocker: "", thisWeek: true, needsReview: false, update: "Keystone, Fair Money, Tangerine, Interswitch and Axamman all in flight" },
      { id: "w-ai-agent", title: "AI agent for end-user conversations", subTeam: "g-tsi", owner: "pe-omolara", status: "In progress", blocker: "", thisWeek: true, needsReview: false, update: "Defining which conversation buckets the agent handles" },
      { id: "w-paid-social", title: "Paid social ads setup (LinkedIn, Instagram)", subTeam: "g-mkt", owner: "pe-martha", status: "Blocked", blocker: "Waiting on advertising budget and payment card confirmation", thisWeek: true, needsReview: false, update: "" },
      { id: "w-legacy-prove", title: "Sunset legacy upsell, route partners to Prove", subTeam: "g-tsi", owner: "", status: "Blocked", blocker: "Awaiting Abdul's confirmation on the Prove direction", thisWeek: true, needsReview: false, update: "Stop upselling legacy for now" },
      { id: "w-archived-pricing", title: "Archived data access pricing", subTeam: "g-psam", owner: "", status: "In progress", blocker: "", thisWeek: true, needsReview: true, update: "Working out the free window and the cost structure beyond it" },
      { id: "w-page-financial", title: "Page Financial onboarding", subTeam: "g-psam", owner: "pe-christian", status: "Blocked", blocker: "Team member has no reset code or Metabase account, awaiting admin invite", thisWeek: false, needsReview: false, update: "" },
      { id: "w-support-split", title: "Split support from account management, plan hiring", subTeam: "g-psam", owner: "", status: "In progress", blocker: "", thisWeek: false, needsReview: false, update: "Prepare onboarding, then finalise hiring plan with People team" },
      { id: "w-mandate-tier3", title: "Tighten mandate setup to tier-three accounts", subTeam: "g-psam", owner: "", status: "Pushing through", blocker: "", thisWeek: true, needsReview: false, update: "Aligned: restrict to tier three to cut A6 errors" },
      { id: "wp1", title: "Transfer on Banka", subTeam: "p-pay", owner: "pe-tinuola", status: "Pushing through", blocker: "", thisWeek: true, needsReview: false, due: "2026-06-26", update: "On prod. UI fixed, backend escalated to Seun. Adding a Banka transfer charge in billing." },
      { id: "wp2", title: "Banka onboarding and billing update", subTeam: "p-plat", owner: "pe-tinuola", status: "In progress", blocker: "", thisWeek: true, needsReview: false, due: "", update: "Reduced scope to minor onboarding plus a better billing structure; doc in progress." },
      { id: "wp3", title: "DD Dispute Automation II", subTeam: "p-pay", owner: "pe-erowo", status: "In progress", blocker: "", thisWeek: true, needsReview: false, due: "2026-08-17", update: "Fixes closed out; goes to prod once Abdulmuizz is back Monday." },
      { id: "wp4", title: "Disburse improvements", subTeam: "p-pay", owner: "pe-anita", status: "In progress", blocker: "", thisWeek: true, needsReview: false, due: "", update: "Added response code and crons for refund timing and NIBSS-downtime transitions." },
      { id: "wp5", title: "FLW MFB VA integration", subTeam: "p-pay", owner: "pe-anita", status: "In progress", blocker: "", thisWeek: true, needsReview: false, due: "", update: "PSA bank-name and activation-service updates done; test money movement after ledger transfer hits staging." },
      { id: "wp6", title: "Mono Sweep improvements", subTeam: "p-pay", owner: "pe-anita", status: "In progress", blocker: "", thisWeek: true, needsReview: false, due: "", update: "Updates in progress." },
      { id: "wp7", title: "Product ops monitoring", subTeam: "p-pay", owner: "pe-erowo", status: "In progress", blocker: "", thisWeek: true, needsReview: false, due: "", update: "Monitoring bank errors (Stanbic A9, several banks err 57); NIBSS downtime resolved." },
      { id: "wp8", title: "Partial Sweep go-live", subTeam: "p-pay", owner: "pe-anita", status: "Blocked", blocker: "Awaiting go-live deployment", thisWeek: true, needsReview: false, due: "", update: "" },
      { id: "wp9", title: "Payment dispute escalation", subTeam: "p-pay", owner: "pe-erowo", status: "In progress", blocker: "", thisWeek: true, needsReview: false, due: "", update: "Almost closed for July; starting August, awaiting pending-bank responses." },
      { id: "wp10", title: "Mandate advise issues", subTeam: "p-pay", owner: "pe-anita", status: "In progress", blocker: "", thisWeek: true, needsReview: true, due: "", update: "Wema, Kuda, Polaris, Access invalid-account and PND issues escalated to banks and NIBSS; GTB balance inquiry inconsistent." },
      { id: "wp11", title: "Sandbox for Sweep doc", subTeam: "p-pay", owner: "pe-erowo", status: "Not started", blocker: "", thisWeek: false, needsReview: false, due: "", update: "Doc shared with Modupe for review." },
      { id: "wp12", title: "Billing and Postpaid (API integration and testing)", subTeam: "p-plat", owner: "pe-tinuola", status: "In progress", blocker: "", thisWeek: true, needsReview: false, due: "", update: "Postpaid on Boring done; Dashboard in staging. Testing: Tolu on Prove, Ogenna on Payments, Tinu on Boring and Dashboard." },
      { id: "wp13", title: "Dashboard and Boring compliance updates", subTeam: "p-plat", owner: "pe-victor", status: "Blocked", blocker: "New blocker after the facial-recognition fix, blocking the next step", thisWeek: true, needsReview: false, due: "", update: "Victor leading bug fixes with Desmond." },
      { id: "wp14", title: "Dashboard updates: wallet funding and customer deletion", subTeam: "p-plat", owner: "", status: "In progress", blocker: "", thisWeek: true, needsReview: false, due: "2026-08-17", update: "Driven by Tolu and Ogenna with Christian on platform. Design screens expected Monday; deletion endpoint ready, next is dashboard UI." },
      { id: "wp15", title: "Sandbox optimization and compliance removal", subTeam: "p-plat", owner: "pe-tinuola", status: "Not started", blocker: "", thisWeek: false, needsReview: false, due: "", update: "" },
      { id: "wp16", title: "Tracking automation triggers for onboarding", subTeam: "p-plat", owner: "pe-tinuola", status: "In progress", blocker: "", thisWeek: true, needsReview: false, due: "", update: "Doc split into 4 sections; finishing the mapping table and confirming ownership." },
      { id: "wp17", title: "Webhook retry system (Dashboard and API)", subTeam: "p-plat", owner: "pe-tinuola", status: "In progress", blocker: "", thisWeek: true, needsReview: true, due: "", update: "Tech doc done; shared with leads for scoping. Eng starts once scope confirmed." },
    ],
    tasks: [
      { id: "t1", title: "Follow up Keystone", type: "To-do", assignee: "pe-salim", subTeam: "g-psam", status: "To do", priority: "P1", due: "", dependsOnMe: false, mine: false, thisWeek: true, sourceMeetingId: M, notes: "Live integration timeline" },
      { id: "t2", title: "Test Fair Money", type: "To-do", assignee: "pe-salim", subTeam: "g-tsi", status: "To do", priority: "P1", due: "", dependsOnMe: false, mine: false, thisWeek: true, sourceMeetingId: M, notes: "Validate 12 hour mandate link window in sandbox, share with Anita" },
      { id: "t3", title: "Update LinkedIn Ads", type: "To-do", assignee: "pe-martha", subTeam: "g-mkt", status: "To do", priority: "P2", due: "", dependsOnMe: false, mine: false, thisWeek: true, sourceMeetingId: M, notes: "Add the payment card" },
      { id: "t4", title: "Verify advertising budget", type: "To-do", assignee: "", subTeam: "g-mkt", status: "To do", priority: "P1", due: "", dependsOnMe: true, mine: true, thisWeek: true, sourceMeetingId: M, notes: "Share card details with Martha and confirm the budget" },
      { id: "t5", title: "Fix video design", type: "To-do", assignee: "pe-martha", subTeam: "g-mkt", status: "To do", priority: "P2", due: "", dependsOnMe: false, mine: false, thisWeek: true, sourceMeetingId: M, notes: "Coordinate with Abdul on file sizes and dimensions for the proof video ad" },
      { id: "t6", title: "Manage product images", type: "To-do", assignee: "", subTeam: "g-mkt", status: "To do", priority: "P2", due: "", dependsOnMe: false, mine: true, thisWeek: true, sourceMeetingId: M, notes: "Publish the unpublished product images on the LinkedIn company page" },
      { id: "t7", title: "Analyze support redirection", type: "To-do", assignee: "", subTeam: "g-tsi", status: "To do", priority: "P1", due: "", dependsOnMe: true, mine: true, thisWeek: true, sourceMeetingId: M, notes: "Investigate redirecting widget support to partners, replicate the issue for Christianah" },
      { id: "t8", title: "Categorize conversations", type: "To-do", assignee: "pe-omolara", subTeam: "g-tsi", status: "To do", priority: "P1", due: "", dependsOnMe: false, mine: false, thisWeek: true, sourceMeetingId: M, notes: "Meet Ogenna to define the AI agent conversation bucket" },
      { id: "t9", title: "Share conversation examples", type: "To-do", assignee: "pe-ogenna", subTeam: "g-tsi", status: "To do", priority: "P2", due: "", dependsOnMe: false, mine: false, thisWeek: true, sourceMeetingId: M, notes: "Send threads to Omolara" },
      { id: "t10", title: "Export partner transactions", type: "To-do", assignee: "pe-ogenna", subTeam: "g-psam", status: "To do", priority: "P1", due: "", dependsOnMe: false, mine: false, thisWeek: true, sourceMeetingId: M, notes: "Metabase data for the partner requesting older records" },
      { id: "t11", title: "Define data archiving policy", type: "To-do", assignee: "", subTeam: "g-psam", status: "To do", priority: "P1", due: "", dependsOnMe: false, mine: true, thisWeek: true, sourceMeetingId: M, notes: "Cost structure and communication strategy for archived transaction data" },
      { id: "t12", title: "Contact Tangerine", type: "To-do", assignee: "pe-ololade", subTeam: "g-psam", status: "To do", priority: "P0", due: "2026-08-17", dependsOnMe: false, mine: false, thisWeek: true, sourceMeetingId: M, notes: "Check in Monday on low mandate approval rates" },
      { id: "t13", title: "Pursue Interswitch", type: "To-do", assignee: "pe-ololade", subTeam: "g-psam", status: "To do", priority: "P1", due: "", dependsOnMe: false, mine: false, thisWeek: true, sourceMeetingId: M, notes: "Reach out for updates" },
      { id: "t14", title: "Build partner tracker", type: "To-do", assignee: "pe-ololade", subTeam: "g-psam", status: "To do", priority: "P2", due: "", dependsOnMe: false, mine: false, thisWeek: true, sourceMeetingId: M, notes: "Create a Lens Square tracker, share with Omolara" },
      { id: "t15", title: "Setup Instagram Ads", type: "To-do", assignee: "", subTeam: "g-mkt", status: "To do", priority: "P2", due: "", dependsOnMe: false, mine: true, thisWeek: true, sourceMeetingId: M, notes: "Configure via Facebook if other channels fail" },
      { id: "t16", title: "Identify NIN provider", type: "To-do", assignee: "", subTeam: "g-tsi", status: "To do", priority: "P1", due: "", dependsOnMe: false, mine: true, thisWeek: true, sourceMeetingId: M, notes: "Share options with Abdul, request his recommendation" },
      { id: "t17", title: "Email Axamman", type: "To-do", assignee: "pe-ololade", subTeam: "g-psam", status: "To do", priority: "P1", due: "", dependsOnMe: false, mine: false, thisWeek: true, sourceMeetingId: M, notes: "Follow up on failure to create mandates" },
      { id: "t18", title: "Review feedback", type: "To-do", assignee: "", subTeam: "", status: "To do", priority: "P2", due: "", dependsOnMe: false, mine: true, thisWeek: true, sourceMeetingId: M, notes: "Give resources on performance reviews when asked" },
      { id: "t19", title: "Plan team outing", type: "To-do", assignee: "", subTeam: "", status: "To do", priority: "P2", due: "", dependsOnMe: false, mine: true, thisWeek: true, sourceMeetingId: M, notes: "Joint getaway with Product, early September" },
      { id: "t20", title: "Organize event", type: "To-do", assignee: "", subTeam: "", status: "To do", priority: "P2", due: "", dependsOnMe: false, mine: true, thisWeek: true, sourceMeetingId: M, notes: "Send a poll for the Lagos event" },
      { id: "t21", title: "Discuss hiring", type: "To-do", assignee: "", subTeam: "g-psam", status: "To do", priority: "P1", due: "", dependsOnMe: false, mine: true, thisWeek: true, sourceMeetingId: M, notes: "Finalise support-role hiring plan with the People team" },
      { id: "t22", title: "Procure Linktree", type: "To-do", assignee: "", subTeam: "g-mkt", status: "To do", priority: "P2", due: "", dependsOnMe: false, mine: true, thisWeek: true, sourceMeetingId: M, notes: "Complete payment and setup" },
      { id: "t23", title: "Research edit button", type: "To-do", assignee: "", subTeam: "g-tsi", status: "To do", priority: "P1", due: "", dependsOnMe: false, mine: true, thisWeek: true, sourceMeetingId: M, notes: "Consult Praise, advocate a limited edit window" },
      { id: "t24", title: "Consolidate decisions for Abdul", type: "Doc/Flow review", assignee: "", subTeam: "", status: "To do", priority: "P1", due: "", dependsOnMe: false, mine: true, thisWeek: true, sourceMeetingId: M, notes: "Group pending product and strategy items into one document" },
      { id: "tp1", title: "Provide billing feedback", type: "To-do", assignee: "pe-tinuola", subTeam: "p-plat", status: "To do", priority: "P1", due: "", dependsOnMe: false, mine: false, thisWeek: true, sourceMeetingId: P, notes: "Billing-cycle corrections for Victor" },
      { id: "tp2", title: "Scope webhook retry system", type: "To-do", assignee: "", subTeam: "p-plat", status: "To do", priority: "P1", due: "", dependsOnMe: false, mine: false, thisWeek: true, sourceMeetingId: P, notes: "Team leads scope per product line" },
      { id: "tp3", title: "Share webhook doc with Design", type: "To-do", assignee: "pe-tinuola", subTeam: "p-plat", status: "To do", priority: "P2", due: "", dependsOnMe: false, mine: false, thisWeek: true, sourceMeetingId: P, notes: "" },
      { id: "tp4", title: "Draft sandbox optimization doc", type: "To-do", assignee: "pe-tinuola", subTeam: "p-plat", status: "To do", priority: "P2", due: "", dependsOnMe: false, mine: false, thisWeek: true, sourceMeetingId: P, notes: "" },
      { id: "tp5", title: "Review customer-deletion design", type: "Doc/Flow review", assignee: "pe-ogenna", subTeam: "p-plat", status: "To do", priority: "P2", due: "", dependsOnMe: false, mine: false, thisWeek: true, sourceMeetingId: P, notes: "" },
      { id: "tp6", title: "Raise customer-deletion ticket", type: "To-do", assignee: "pe-ogenna", subTeam: "p-plat", status: "To do", priority: "P1", due: "", dependsOnMe: false, mine: false, thisWeek: true, sourceMeetingId: P, notes: "" },
      { id: "tp7", title: "Review Lookup improvements doc", type: "Doc/Flow review", assignee: "", subTeam: "p-ifd", status: "To do", priority: "P1", due: "", dependsOnMe: false, mine: true, thisWeek: true, sourceMeetingId: P, notes: "" },
      { id: "tp8", title: "Coordinate test-accounts campaign", type: "To-do", assignee: "pe-tinuola", subTeam: "p-plat", status: "To do", priority: "P2", due: "", dependsOnMe: false, mine: false, thisWeek: true, sourceMeetingId: P, notes: "While legal completes the agreement draft" },
      { id: "tp9", title: "Discuss reseller transition strategy", type: "To-do", assignee: "pe-tinuola", subTeam: "p-plat", status: "To do", priority: "P1", due: "", dependsOnMe: false, mine: false, thisWeek: true, sourceMeetingId: P, notes: "Finalise move plans with Fei and Lash" },
      { id: "tp10", title: "Draft address API integration proposal", type: "To-do", assignee: "pe-tinuola", subTeam: "p-ifd", status: "To do", priority: "P2", due: "", dependsOnMe: false, mine: false, thisWeek: true, sourceMeetingId: P, notes: "" },
      { id: "tp11", title: "Verify Banka backend fixes", type: "To-do", assignee: "pe-tinuola", subTeam: "p-plat", status: "To do", priority: "P1", due: "", dependsOnMe: false, mine: false, thisWeek: true, sourceMeetingId: P, notes: "Follow up Seun" },
      { id: "tp12", title: "Document mandate management system", type: "To-do", assignee: "pe-anita", subTeam: "p-pay", status: "To do", priority: "P1", due: "", dependsOnMe: false, mine: false, thisWeek: true, sourceMeetingId: P, notes: "After review with engineering" },
      { id: "tp13", title: "Check account-restriction inquiries with NIBSS", type: "To-do", assignee: "pe-anita", subTeam: "p-pay", status: "To do", priority: "P1", due: "", dependsOnMe: false, mine: false, thisWeek: true, sourceMeetingId: P, notes: "Request status retrieval in inquiry logs" },
      { id: "tp14", title: "Monitor mandate errors", type: "To-do", assignee: "pe-anita", subTeam: "p-pay", status: "To do", priority: "P1", due: "", dependsOnMe: false, mine: false, thisWeek: true, sourceMeetingId: P, notes: "Share error logs with NIBSS" },
      { id: "tp15", title: "Share Echo Bank settlement feedback", type: "To-do", assignee: "pe-anita", subTeam: "p-pay", status: "To do", priority: "P1", due: "", dependsOnMe: false, mine: false, thisWeek: true, sourceMeetingId: P, notes: "Present charge-passing findings next meeting" },
      { id: "tp16", title: "Deploy DD automation to prod", type: "To-do", assignee: "", subTeam: "p-pay", status: "To do", priority: "P0", due: "2026-08-17", dependsOnMe: false, mine: false, thisWeek: true, sourceMeetingId: P, notes: "Once Abdu returns Monday" },
      { id: "tp17", title: "Close July dispute escalations", type: "To-do", assignee: "pe-erowo", subTeam: "p-pay", status: "To do", priority: "P1", due: "", dependsOnMe: false, mine: false, thisWeek: true, sourceMeetingId: P, notes: "Confirm with First Bank and FCMB" },
      { id: "tp18", title: "Review sandbox sweep doc with Modupe", type: "To-do", assignee: "pe-erowo", subTeam: "p-pay", status: "To do", priority: "P2", due: "", dependsOnMe: false, mine: false, thisWeek: true, sourceMeetingId: P, notes: "" },
      { id: "tp19", title: "Check Flutter web investor-existence errors", type: "To-do", assignee: "pe-halimah", subTeam: "p-owo", status: "To do", priority: "P1", due: "", dependsOnMe: false, mine: false, thisWeek: true, sourceMeetingId: P, notes: "" },
      { id: "tp20", title: "Resolve liveness session-ID error", type: "To-do", assignee: "pe-halimah", subTeam: "p-owo", status: "To do", priority: "P1", due: "", dependsOnMe: false, mine: false, thisWeek: true, sourceMeetingId: P, notes: "Consult Modupe" },
      { id: "tp21", title: "Coordinate quiz backend integration", type: "To-do", assignee: "pe-halimah", subTeam: "p-owo", status: "To do", priority: "P2", due: "", dependsOnMe: false, mine: false, thisWeek: true, sourceMeetingId: P, notes: "With Abdu Raman" },
      { id: "tp22", title: "Register WhatsApp partner account", type: "To-do", assignee: "pe-halimah", subTeam: "p-owo", status: "To do", priority: "P1", due: "", dependsOnMe: false, mine: false, thisWeek: true, sourceMeetingId: P, notes: "Claim company account, list services" },
      { id: "tp23", title: "Evaluate loan / borrowing product", type: "To-do", assignee: "", subTeam: "p-ifd", status: "To do", priority: "P2", due: "", dependsOnMe: false, mine: false, thisWeek: true, sourceMeetingId: P, notes: "Commercial case, UI, roadmap to Fei" },
      { id: "tp24", title: "Clean up product documentation", type: "To-do", assignee: "", subTeam: "", status: "To do", priority: "P2", due: "", dependsOnMe: false, mine: false, thisWeek: true, sourceMeetingId: P, notes: "Organise by category and year, add Q3/Q4" },
      { id: "tp25", title: "Record intern onboarding videos", type: "To-do", assignee: "", subTeam: "", status: "To do", priority: "P2", due: "", dependsOnMe: false, mine: false, thisWeek: true, sourceMeetingId: P, notes: "Dashboard and widget navigation series" },
      { id: "tp26", title: "Post meeting-time poll", type: "To-do", assignee: "", subTeam: "", status: "To do", priority: "P2", due: "", dependsOnMe: false, mine: true, thisWeek: true, sourceMeetingId: P, notes: "" },
    ],
    decisions: [
      { id: "dc1", title: "Customer contact support workflow", decider: "Me", priority: "P1", subTeam: "g-tsi", affects: "Support workflow, partner experience", whatsNeeded: "Decide shift-to-partner vs balanced issue logging", status: "Needs input", due: "", sourceMeetingId: M },
      { id: "dc2", title: "Archived data access pricing", decider: "Me", priority: "P1", subTeam: "g-psam", affects: "Data-access revenue, partner relationships", whatsNeeded: "Free window plus a cost structure beyond it", status: "Open", due: "", sourceMeetingId: M },
      { id: "dc3", title: "Dual NIN provider integration", decider: "CEO", priority: "P1", subTeam: "g-tsi", affects: "Verification stability for high-volume partners", whatsNeeded: "Abdul's recommendation on a fallback provider", status: "Needs input", due: "", sourceMeetingId: M },
      { id: "dc4", title: "Partner Success team expansion", decider: "CEO", priority: "P1", subTeam: "g-psam", affects: "Team structure and onboarding", whatsNeeded: "Hiring plan agreed with the People team", status: "Needs input", due: "", sourceMeetingId: M },
      { id: "dc5", title: "Edit button time limit", decider: "Me", priority: "P2", subTeam: "g-tsi", affects: "Partner communication quality", whatsNeeded: "Praise's read on feasibility", status: "Open", due: "", sourceMeetingId: M },
      { id: "dc6", title: "Restrict mandates to tier-three accounts", decider: "Me", priority: "P1", subTeam: "g-psam", affects: "A6 error rate", whatsNeeded: "", status: "Decided", due: "", sourceMeetingId: M },
      { id: "dc7", title: "Route set end-user conversations to the AI agent", decider: "Me", priority: "P1", subTeam: "g-tsi", affects: "Support load", whatsNeeded: "", status: "Decided", due: "", sourceMeetingId: M },
      { id: "dcp1", title: "Migrate all legacy partners to Prove", decider: "Me", priority: "P1", subTeam: "p-ifd", affects: "Reseller risk, verification", whatsNeeded: "", status: "Decided", due: "", sourceMeetingId: P },
      { id: "dcp2", title: "Restrict Kuda mandate creation to tier-three (enforced KYC)", decider: "Me", priority: "P1", subTeam: "p-pay", affects: "Mandate failure rate", whatsNeeded: "", status: "Decided", due: "", sourceMeetingId: P },
      { id: "dcp3", title: "Sign up for Chat Desk for WhatsApp support", decider: "Me", priority: "P2", subTeam: "p-owo", affects: "Support tooling", whatsNeeded: "", status: "Decided", due: "", sourceMeetingId: P },
      { id: "dcp4", title: "Require a commercial case before building new products", decider: "Me", priority: "P1", subTeam: "", affects: "Product roadmap", whatsNeeded: "", status: "Decided", due: "", sourceMeetingId: P },
      { id: "dcp5", title: "Standardise onboarding with Loom videos and structured docs", decider: "Me", priority: "P2", subTeam: "", affects: "Intern onboarding", whatsNeeded: "", status: "Decided", due: "", sourceMeetingId: P },
    ],
    meetings: [
      { id: P, title: "Product Team Check-in", type: "Product team", subTeam: "", personId: "", date: "2026-08-14", recording: "", rawNotes: "", summary: "Testing continues across Prove, Postpaid and dashboard, with strategic shifts to migrate legacy partners to Prove and manage BVN API spikes. Automation updates for mandates and disbursement refunds aim to cut transaction failures, alongside a compliance response on data caching and reseller activity. The team required a commercial case before new products and adopted Chat Desk for WhatsApp support and Loom-based onboarding.", preRead: "" },
      { id: M, title: "Growth Meeting", type: "Growth team", subTeam: "", personId: "", date: "2026-08-14", recording: "", rawNotes: "", summary: "Growth reviewed partner integration health and mandate authorization, with a push to standardize setup and cut transaction errors. Leadership set a direction to stop upselling legacy products and route partners to Prove instead. Support and messaging came up too: tightening who handles which end-user conversations, and handling the missing message edit button with stricter proofreading while a time-limited edit window is explored.", preRead: "" },
      { id: "o-anita-3", title: "1:1 with Anita", type: "1:1", subTeam: "p-pay", personId: "pe-anita", date: "2026-10-09", recording: "", rawNotes: "", summary: "Strong month. Shipped the disbursement cron fixes and the FLW MFB bank-name handling. Feeling stretched across Sweep and disputes at once. Agreed to hand Sweep monitoring to Erowo so she can focus on the VA migration. Wants a clearer growth path toward a lead role.", preRead: "" },
      { id: "o-anita-2", title: "1:1 with Anita", type: "1:1", subTeam: "p-pay", personId: "pe-anita", date: "2026-09-11", recording: "", rawNotes: "", summary: "Mandate-advise issues with Wema and Polaris are eating her week; most are bank-side. We aligned to escalate a batch to NIBSS rather than chase one by one. Morale good but frustrated by repeat downtime.", preRead: "" },
      { id: "o-anita-1", title: "1:1 with Anita", type: "1:1", subTeam: "p-pay", personId: "pe-anita", date: "2026-08-14", recording: "", rawNotes: "", summary: "First structured 1:1. Owns Sweep, Disburse, and VA integration. Clear communicator. Flagged she rarely gets uninterrupted build time; we blocked two focus mornings a week.", preRead: "" },
      { id: "o-tinuola-2", title: "1:1 with Tinuola", type: "1:1", subTeam: "p-plat", personId: "pe-tinuola", date: "2026-10-07", recording: "", rawNotes: "", summary: "Juggling billing, onboarding docs, webhooks, and dashboard at once. We cut her active doc list from five to three and parked sandbox optimization. Happier with the narrower focus. Keen to own the billing system end to end.", preRead: "" },
      { id: "o-tinuola-1", title: "1:1 with Tinuola", type: "1:1", subTeam: "p-plat", personId: "pe-tinuola", date: "2026-09-09", recording: "", rawNotes: "", summary: "Postpaid on Boring is done; Dashboard in staging. Coordinating three testers well. Wants more say in reseller strategy, which I said I'd bring her into.", preRead: "" },
      { id: "o-martha-2", title: "1:1 with Martha", type: "1:1", subTeam: "g-mkt", personId: "pe-martha", date: "2026-10-06", recording: "", rawNotes: "", summary: "Paid social is live once the budget confirms. Strong on creative, less confident on attribution. Pairing her with the analytics work to build that muscle. Thriving overall.", preRead: "" },
      { id: "o-martha-1", title: "1:1 with Martha", type: "1:1", subTeam: "g-mkt", personId: "pe-martha", date: "2026-09-08", recording: "", rawNotes: "", summary: "Blocked on the ad account and card for weeks, which is demotivating. I committed to unblocking the budget this week so she isn't stalled.", preRead: "" },
      { id: "o-ololade-2", title: "1:1 with Ololade", type: "1:1", subTeam: "g-psam", personId: "pe-ololade", date: "2026-10-02", recording: "", rawNotes: "", summary: "Carrying most partner follow-ups solo (Tangerine, Interswitch, Axamman). Doing well but at capacity, which supports the case for a Partner Success hire. Built the Lens Square tracker the team now relies on.", preRead: "" },
      { id: "o-ololade-1", title: "1:1 with Ololade", type: "1:1", subTeam: "g-psam", personId: "pe-ololade", date: "2026-09-04", recording: "", rawNotes: "", summary: "Low mandate approval rates with Tangerine are stressful since they're bank-dependent. Coached her on framing these as partner-side in updates so it doesn't read as her miss.", preRead: "" },
    ],
  };
}

/* ---------- small UI pieces ---------- */
const Pill = ({ tone = "slate", children, plain = false }) => (
  <span className={`inline-flex max-w-full items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium ${TONES[tone]}`}>
    {!plain && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT[tone]}`} />}
    <span className="truncate">{children}</span>
  </span>
);
const PageHeader = ({ title, subtitle, accent = "slate", icon: Icon, action }) => (
  <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
    <div className="flex min-w-0 items-center gap-3">
      {Icon && <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${ACCENT[accent].chip}`}><Icon size={22} /></div>}
      <div className="min-w-0">
        <h2 className="cos-display truncate text-2xl font-bold tracking-tight text-slate-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);
const SectionHeader = ({ children, right }) => (
  <div className="mb-3 flex items-center justify-between gap-2">
    <h3 className="cos-display text-sm font-bold uppercase tracking-wider text-slate-500">{children}</h3>
    {right}
  </div>
);
const Btn = ({ variant = "primary", onClick, children, className = "" }) => {
  const v = {
    primary: "bg-teal-600 hover:bg-teal-700 text-white border-transparent shadow-sm",
    ghost: "bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-sm",
    danger: "bg-white hover:bg-rose-50 text-rose-600 border-rose-200 shadow-sm",
  }[variant];
  return (
    <button onClick={onClick} className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-medium transition active:scale-95 ${v} ${className}`}>
      {children}
    </button>
  );
};
const Card = ({ children, className = "" }) => (
  <div className={`rounded-2xl border border-slate-200/70 bg-white shadow-sm ${className}`}>{children}</div>
);
const Eyebrow = ({ children }) => (
  <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">{children}</div>
);
const Empty = ({ title, hint }) => (
  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-10 text-center">
    <div className="text-sm font-medium text-slate-600">{title}</div>
    {hint && <div className="mt-1 text-xs text-slate-400">{hint}</div>}
  </div>
);
const IconAction = ({ onClick, title, children }) => (
  <button onClick={onClick} title={title} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
    {children}
  </button>
);

/* ---------- header hero slider (original illustrated scenes) ---------- */
function MountainEverest() {
  return (
    <svg viewBox="0 0 1200 400" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
      <defs>
        <linearGradient id="ev-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#161335" /><stop offset="0.5" stopColor="#5b2a86" />
          <stop offset="0.78" stopColor="#c85f46" /><stop offset="1" stopColor="#f3a860" />
        </linearGradient>
        <linearGradient id="ev-far" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8b7fb0" /><stop offset="1" stopColor="#6a5d90" />
        </linearGradient>
      </defs>
      <rect width="1200" height="400" fill="url(#ev-sky)" />
      <circle cx="880" cy="120" r="46" fill="#ffe6bf" opacity="0.85" />
      <g fill="#ffffff" opacity="0.6">
        <circle cx="120" cy="50" r="1.6" /><circle cx="240" cy="90" r="1.2" /><circle cx="360" cy="40" r="1.4" />
        <circle cx="520" cy="70" r="1.1" /><circle cx="70" cy="120" r="1.3" /><circle cx="300" cy="150" r="1" />
      </g>
      <path d="M0 250 L170 175 L320 235 L470 150 L650 225 L820 165 L1010 235 L1200 185 L1200 400 L0 400 Z" fill="url(#ev-far)" opacity="0.65" />
      <path d="M0 400 L0 305 L250 205 L440 300 L610 130 L800 300 L1000 220 L1200 320 L1200 400 Z" fill="#37305c" />
      <path d="M610 130 L565 205 L610 188 L655 208 Z" fill="#f6f8fc" />
      <path d="M1000 220 L972 262 L1000 250 L1032 268 Z" fill="#dfe6f1" />
      <path d="M250 205 L222 250 L250 240 L280 256 Z" fill="#dfe6f1" />
      <path d="M0 400 L0 355 L300 312 L600 362 L900 318 L1200 360 L1200 400 Z" fill="#221d3d" />
    </svg>
  );
}
function F1Corner() {
  return (
    <svg viewBox="0 0 1200 400" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
      <defs>
        <linearGradient id="f1-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0ea5b7" /><stop offset="0.6" stopColor="#7dd3d8" /><stop offset="1" stopColor="#e6f6f4" />
        </linearGradient>
        <linearGradient id="f1-road" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3a3f4a" /><stop offset="1" stopColor="#20242c" />
        </linearGradient>
      </defs>
      <rect width="1200" height="400" fill="url(#f1-sky)" />
      <rect x="0" y="150" width="1200" height="70" fill="#cfe8e6" />
      <g fill="#9fc3c2">{Array.from({ length: 24 }).map((_, i) => <rect key={i} x={i * 52} y="150" width="34" height="70" />)}</g>
      <rect x="0" y="214" width="1200" height="14" fill="#164e63" />
      <path d="M0 400 L0 300 Q 400 250 700 300 T 1200 280 L1200 400 Z" fill="url(#f1-road)" />
      <path d="M0 300 Q 400 250 700 300 T 1200 280" fill="none" stroke="#e5e7eb" strokeWidth="4" />
      <g>{Array.from({ length: 30 }).map((_, i) => <rect key={i} x={i * 42} y={392} width="20" height="8" fill={i % 2 ? "#dc2626" : "#f8fafc"} />)}</g>
      <g stroke="#ffffff" strokeWidth="3" opacity="0.5" strokeLinecap="round">
        <line x1="120" y1="330" x2="260" y2="330" /><line x1="90" y1="352" x2="240" y2="352" /><line x1="150" y1="372" x2="300" y2="372" />
      </g>
      <g transform="translate(430 300)">
        <rect x="-10" y="-46" width="16" height="34" rx="2" fill="#0f766e" />
        <path d="M0 0 L20 -30 L230 -30 L300 -8 L320 6 L300 20 L40 20 L0 12 Z" fill="#115e59" />
        <path d="M40 -12 L250 -12 L300 -4 L300 6 L40 10 Z" fill="#0d9488" />
        <path d="M150 -30 q 40 -34 90 0" fill="none" stroke="#0b3b38" strokeWidth="7" />
        <rect x="300" y="6" width="34" height="10" rx="2" fill="#0f766e" />
        <circle cx="120" cy="-6" r="20" fill="#f8fafc" />
        <text x="120" y="2" textAnchor="middle" fontFamily="ui-sans-serif, sans-serif" fontSize="22" fontWeight="800" fill="#115e59">44</text>
        <circle cx="70" cy="24" r="30" fill="#111827" /><circle cx="70" cy="24" r="12" fill="#4b5563" />
        <circle cx="270" cy="24" r="30" fill="#111827" /><circle cx="270" cy="24" r="12" fill="#4b5563" />
      </g>
    </svg>
  );
}
function MountainK2() {
  return (
    <svg viewBox="0 0 1200 400" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
      <defs>
        <linearGradient id="k2-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0b2a4a" /><stop offset="0.6" stopColor="#2f6f9e" /><stop offset="1" stopColor="#bfe3ea" />
        </linearGradient>
      </defs>
      <rect width="1200" height="400" fill="url(#k2-sky)" />
      <ellipse cx="300" cy="120" rx="140" ry="30" fill="#ffffff" opacity="0.25" />
      <ellipse cx="850" cy="90" rx="180" ry="34" fill="#ffffff" opacity="0.18" />
      <path d="M0 300 L200 230 L380 290 L1200 250 L1200 400 L0 400 Z" fill="#3f6f95" opacity="0.7" />
      <path d="M700 400 L900 90 L1120 400 Z" fill="#4a5b73" />
      <path d="M900 90 L845 175 L900 150 L960 178 Z" fill="#f4f8fb" />
      <path d="M900 90 L820 220 L860 205 L900 150 Z" fill="#5b6d86" opacity="0.6" />
      <path d="M900 92 q 60 -18 120 6 q -60 6 -120 -6 Z" fill="#ffffff" opacity="0.5" />
      <path d="M120 400 L360 150 L560 400 Z" fill="#405670" />
      <path d="M360 150 L318 214 L360 196 L404 218 Z" fill="#eaf1f7" />
      <path d="M0 400 L0 360 L250 335 L520 372 L780 340 L1050 375 L1200 348 L1200 400 Z" fill="#cfe6ef" />
      <path d="M0 400 L250 372 L560 400 Z" fill="#aecfdd" opacity="0.7" />
    </svg>
  );
}
function CircuitMap() {
  const d = "M180 300 C 120 180 320 120 460 170 C 560 205 560 300 680 300 C 820 300 780 150 920 150 C 1060 150 1040 300 900 320 C 760 340 700 250 560 260 C 380 274 320 360 220 340 C 150 326 150 320 180 300 Z";
  return (
    <svg viewBox="0 0 1200 400" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
      <defs>
        <linearGradient id="cm-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0f172a" /><stop offset="1" stopColor="#1e293b" />
        </linearGradient>
      </defs>
      <rect width="1200" height="400" fill="url(#cm-bg)" />
      <g stroke="#334155" strokeWidth="1" opacity="0.5">
        {Array.from({ length: 13 }).map((_, i) => <line key={"v" + i} x1={i * 100} y1="0" x2={i * 100} y2="400" />)}
        {Array.from({ length: 5 }).map((_, i) => <line key={"h" + i} x1="0" y1={i * 100} x2="1200" y2={i * 100} />)}
      </g>
      <path d={d} fill="none" stroke="#14b8a6" strokeWidth="12" strokeLinejoin="round" strokeLinecap="round" />
      <path d={d} fill="none" stroke="#5eead4" strokeWidth="3" strokeDasharray="2 14" strokeLinecap="round" />
      <g transform="translate(180 300) rotate(60)">
        {Array.from({ length: 6 }).map((_, i) => <rect key={i} x={-8} y={-14 + i * 5} width="16" height="5" fill={i % 2 ? "#0f172a" : "#e2e8f0"} />)}
      </g>
      <g transform="translate(700 300)">
        <circle r="20" fill="#f8fafc" />
        <text x="0" y="7" textAnchor="middle" fontFamily="ui-sans-serif, sans-serif" fontSize="20" fontWeight="800" fill="#0f766e">44</text>
      </g>
      <text x="70" y="58" fontFamily="ui-sans-serif, sans-serif" fontSize="18" fontWeight="700" fill="#64748b" letterSpacing="4">CIRCUIT</text>
    </svg>
  );
}
function MountainSunset() {
  return (
    <svg viewBox="0 0 1200 400" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
      <defs>
        <linearGradient id="ss-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b1d5e" /><stop offset="0.45" stopColor="#b23a6b" /><stop offset="0.75" stopColor="#ef7d4e" /><stop offset="1" stopColor="#ffd08a" />
        </linearGradient>
      </defs>
      <rect width="1200" height="400" fill="url(#ss-sky)" />
      <circle cx="600" cy="230" r="70" fill="#ffe1a6" opacity="0.9" />
      <path d="M0 260 L200 200 L360 250 L520 190 L700 250 L880 195 L1050 250 L1200 210 L1200 400 L0 400 Z" fill="#7a3a63" opacity="0.55" />
      <path d="M0 400 L0 320 L220 235 L430 320 L620 210 L820 320 L1010 250 L1200 330 L1200 400 Z" fill="#5b2b4d" />
      <path d="M620 210 L586 268 L620 254 L656 270 Z" fill="#ffdca0" opacity="0.9" />
      <path d="M0 400 L0 360 L300 322 L620 366 L920 326 L1200 362 L1200 400 Z" fill="#3d1c37" />
      <g fill="#2a1330"><ellipse cx="250" cy="150" rx="10" ry="3" /><ellipse cx="280" cy="140" rx="8" ry="2.5" /></g>
    </svg>
  );
}
const HERO_SLIDES = [MountainEverest, F1Corner, MountainK2, CircuitMap, MountainSunset];
function HeroSlider() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % HERO_SLIDES.length), 5000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="absolute inset-0">
      {HERO_SLIDES.map((S, i) => (
        <div key={i} className={`absolute inset-0 transition-opacity duration-1000 ${i === idx ? "opacity-100" : "opacity-0"}`}>
          <S />
        </div>
      ))}
      <div className="absolute bottom-3 right-4 z-20 flex gap-1.5">
        {HERO_SLIDES.map((_, i) => (
          <button key={i} onClick={() => setIdx(i)} title={`Slide ${i + 1}`} className={`h-1.5 rounded-full transition-all ${i === idx ? "w-5 bg-white" : "w-1.5 bg-white/60 hover:bg-white/80"}`} />
        ))}
      </div>
    </div>
  );
}

/* ---------- field config for the record form ---------- */
const CONFIGS = {
  task: [
    { key: "title", label: "Task", type: "text", req: true },
    { key: "type", label: "Type", type: "select", options: TASK_TYPE },
    { key: "subTeam", label: "Sub-team", type: "team" },
    { key: "assignee", label: "Assignee", type: "person" },
    { key: "status", label: "Status", type: "select", options: TASK_STATUS },
    { key: "blocker", label: "Blocked by (reason, shows when status is Blocked)", type: "text" },
    { key: "priority", label: "Priority", type: "select", options: PRIORITY },
    { key: "due", label: "Due", type: "date" },
    { key: "dependsOnMe", label: "Depends on me", type: "checkbox" },
    { key: "mine", label: "My task", type: "checkbox" },
    { key: "thisWeek", label: "This week (Monday agenda)", type: "checkbox" },
    { key: "subtasks", label: "Sub-tasks", type: "subtasks" },
    { key: "links", label: "Links", type: "links" },
    { key: "notes", label: "Notes", type: "textarea" },
  ],
  workstream: [
    { key: "title", label: "Workstream", type: "text", req: true },
    { key: "subTeam", label: "Sub-team", type: "team" },
    { key: "owner", label: "Owner", type: "person" },
    { key: "status", label: "Status", type: "select", options: WS_STATUS },
    { key: "blocker", label: "Blocker (if blocked)", type: "text" },
    { key: "due", label: "Due", type: "date" },
    { key: "update", label: "Latest update", type: "textarea" },
    { key: "thisWeek", label: "Active this week", type: "checkbox" },
    { key: "needsReview", label: "Needs my review", type: "checkbox" },
  ],
  decision: [
    { key: "title", label: "Decision", type: "text", req: true },
    { key: "decider", label: "Who signs off", type: "select", options: DECIDER },
    { key: "priority", label: "Priority", type: "select", options: PRIORITY },
    { key: "subTeam", label: "Sub-team", type: "team" },
    { key: "affects", label: "Affects", type: "text" },
    { key: "whatsNeeded", label: "What's needed to decide", type: "textarea" },
    { key: "status", label: "Status", type: "select", options: DEC_STATUS },
    { key: "due", label: "Due", type: "date" },
  ],
  person: [
    { key: "name", label: "Name", type: "text", req: true },
    { key: "org", label: "Org", type: "select", options: ["Growth", "Product"] },
    { key: "subTeam", label: "Sub-team", type: "team" },
    { key: "role", label: "Role", type: "text" },
    { key: "cadence", label: "1:1 cadence", type: "select", options: CADENCE },
    { key: "nextOneOnOne", label: "Next 1:1", type: "date" },
    { key: "status", label: "How they're doing", type: "select", options: PEOPLE_STATUS },
  ],
  team: [
    { key: "name", label: "Sub-team name", type: "text", req: true },
    { key: "org", label: "Org", type: "select", options: ["Growth", "Product"] },
  ],
  meeting: [
    { key: "title", label: "Title", type: "text", req: true },
    { key: "type", label: "Type", type: "select", options: MEETING_TYPE },
    { key: "subTeam", label: "Sub-team", type: "team" },
    { key: "personId", label: "Person (for 1:1)", type: "person" },
    { key: "date", label: "Date", type: "date" },
    { key: "summary", label: "Summary", type: "textarea" },
    { key: "rawNotes", label: "Raw notes", type: "textarea" },
  ],
};
const COLLECTION = { task: "tasks", workstream: "workstreams", decision: "decisions", person: "people", meeting: "meetings", team: "teams" };
const DEFAULTS = {
  task: { type: "To-do", status: "To do", priority: "P1", dependsOnMe: false, mine: false, thisWeek: false, subTeam: "", assignee: "", due: "", notes: "", blocker: "", subtasks: [], links: [] },
  workstream: { status: "Not started", thisWeek: false, needsReview: false, subTeam: "", owner: "", blocker: "", update: "", due: "" },
  decision: { decider: "Me", priority: "P1", status: "Open", subTeam: "", affects: "", whatsNeeded: "", due: "" },
  person: { org: "Product", cadence: "Monthly", status: "Steady", subTeam: "", role: "", nextOneOnOne: "" },
  meeting: { type: "Sub-team", date: today(), subTeam: "", personId: "", summary: "", rawNotes: "" },
  team: { org: "Growth", name: "" },
};

/* ---------- app ---------- */
export default function App() {
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("dashboard");
  const [data, setData] = useState(null);
  const [modal, setModal] = useState(null); // { entity, record }
  const [personView, setPersonView] = useState(null); // personId
  const [taskFilters, setTaskFilters] = useState({ team: "all", person: "all", status: "all", mine: false, dep: false, week: false, group: false });
  const [expanded, setExpanded] = useState({}); // task id -> bool (subtask disclosure)
  const [confirmDlg, setConfirmDlg] = useState(null); // { message, onConfirm }
  const [copyModal, setCopyModal] = useState(null); // text for manual copy fallback
  const [railOpen, setRailOpen] = useState(true);

  useEffect(() => {
    (async () => {
      const raw = await store.get(KEY);
      let d;
      if (raw) { try { d = JSON.parse(raw); } catch { d = seed(); } }
      else { d = seed(); }
      d = normalize(d);
      setData(d);
      await store.set(KEY, JSON.stringify(d));
      setLoading(false);
    })();
  }, []);

  const persist = (next) => { setData(next); store.set(KEY, JSON.stringify(next)); };

  const askConfirm = (message, onConfirm) => setConfirmDlg({ message, onConfirm });
  const doCopy = async (text) => { const ok = await copyText(text); if (!ok) setCopyModal(text); return ok; };

  const teamName = (id) => (data.teams.find((t) => t.id === id) || {}).name || "Unassigned";
  const teamOrg = (id) => (data.teams.find((t) => t.id === id) || {}).org || "";
  const personName = (id) => (data.people.find((p) => p.id === id) || {}).name || "";

  const saveRecord = (entity, record) => {
    const col = COLLECTION[entity];
    let list = data[col];
    if (record.id) list = list.map((r) => (r.id === record.id ? record : r));
    else list = [{ ...record, id: uid() }, ...list];
    persist({ ...data, [col]: list });
    setModal(null);
  };
  const deleteRecord = (entity, id) => {
    const col = COLLECTION[entity];
    persist({ ...data, [col]: data[col].filter((r) => r.id !== id) });
  };
  const openAdd = (entity, prefill = {}) => setModal({ entity, record: { ...DEFAULTS[entity], ...prefill } });
  const openEdit = (entity, record) => setModal({ entity, record: { ...record } });

  const toggleTaskDone = (t) => {
    const status = t.status === "Done" ? "To do" : "Done";
    persist({ ...data, tasks: data.tasks.map((x) => (x.id === t.id ? { ...x, status } : x)) });
  };
  const TASK_CYCLE = ["To do", "In progress", "Blocked", "Done"];
  const cycleTaskStatus = (t) => {
    const next = TASK_CYCLE[(TASK_CYCLE.indexOf(t.status) + 1) % TASK_CYCLE.length];
    persist({ ...data, tasks: data.tasks.map((x) => (x.id === t.id ? { ...x, status: next } : x)) });
  };
  const setTaskStatus = (t, status) => persist({ ...data, tasks: data.tasks.map((x) => (x.id === t.id ? { ...x, status } : x)) });
  const resolveTask = (t) => persist({ ...data, tasks: data.tasks.map((x) => (x.id === t.id ? { ...x, status: "In progress", blocker: "" } : x)) });
  const resolveWorkstream = (w) => persist({ ...data, workstreams: data.workstreams.map((x) => (x.id === w.id ? { ...x, status: "In progress", blocker: "" } : x)) });
  const toggleSubtask = (taskId, subId) => {
    persist({ ...data, tasks: data.tasks.map((t) => (t.id !== taskId ? t : { ...t, subtasks: (t.subtasks || []).map((s) => (s.id === subId ? { ...s, done: !s.done } : s)) })) });
  };
  const toggleExpand = (id) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  const resetAll = () => askConfirm("Clear all data and start fresh? This cannot be undone.", () => { const s = seed(); persist(s); setTab("dashboard"); });

  if (loading || !data) {
    return (
      <div className="flex h-96 items-center justify-center text-slate-400">
        <Loader2 className="mr-2 animate-spin" size={18} /> Loading your workspace
      </div>
    );
  }

  /* ---------- derived ---------- */
  const openTasks = data.tasks.filter((t) => t.status !== "Done");
  const blockedWs = data.workstreams.filter((w) => w.status === "Blocked");
  const blockedTasks = data.tasks.filter((t) => t.status === "Blocked");
  const dependsOnMe = openTasks.filter((t) => t.dependsOnMe);
  const myTasks = openTasks.filter((t) => t.mine);
  const openDecisions = data.decisions.filter((d) => d.status !== "Decided");
  const weekWs = data.workstreams.filter((w) => w.thisWeek);
  const reviews = openTasks.filter((t) => t.type === "Doc/Flow review");

  const sortTasks = (arr) => [...arr].sort((a, b) => (PRIO_ORDER[a.priority] - PRIO_ORDER[b.priority]) || (a.due || "z").localeCompare(b.due || "z"));

  const buildAgendaText = () => {
    let out = `WEEKLY AGENDA — week of ${weekLabel(data.currentWeekStart)}\n\n`;
    ["Product", "Growth"].forEach((org) => {
      out += `== ${org.toUpperCase()} ==\n`;
      data.teams.filter((t) => t.org === org).forEach((team) => {
        const ws = data.workstreams.filter((w) => w.subTeam === team.id && (w.thisWeek || w.status === "Blocked"));
        const tks = data.tasks.filter((t) => t.subTeam === team.id && t.thisWeek && t.status !== "Done");
        if (ws.length === 0 && tks.length === 0) return;
        out += `\n${team.name}\n`;
        ws.forEach((w) => { out += `  • [${w.status}] ${w.title}${w.blocker ? ` (blocked: ${w.blocker})` : ""}${w.due ? ` (due ${w.due})` : ""}\n`; });
        tks.forEach((t) => { out += `  - ${t.title} [${t.priority}]${t.due ? ` due ${t.due}` : ""}\n`; });
      });
      out += `\n`;
    });
    out += `== DECISIONS FOR THIS MEETING ==\n`;
    data.decisions.filter((d) => d.status !== "Decided").forEach((d) => { out += `  • ${d.title} [${d.priority}] — ${d.decider}\n`; });
    out += `\n== DEPENDS ON ME THIS WEEK ==\n`;
    dependsOnMe.filter((t) => t.thisWeek).forEach((t) => { out += `  • ${t.title}\n`; });
    return out;
  };

  const startNewWeek = () => askConfirm("Start a new week? Anything not marked done rolls into the new week; completed items drop off.", () => {
    const start = data.currentWeekStart;
    const thisWk = data.tasks.filter((t) => t.thisWeek);
    const snapshot = {
      id: uid(), start, label: weekLabel(start), archivedAt: today(), agenda: buildAgendaText(),
      tasksTotal: thisWk.length,
      tasksDone: thisWk.filter((t) => t.status === "Done").length,
      blockers: data.workstreams.filter((w) => w.status === "Blocked").length,
      decisionsOpen: data.decisions.filter((d) => d.status !== "Decided").length,
    };
    const tasks = data.tasks.map((t) => (t.thisWeek && t.status === "Done" ? { ...t, thisWeek: false } : t));
    const workstreams = data.workstreams.map((w) => (w.thisWeek && (w.status === "Shipped" || w.status === "Dropped") ? { ...w, thisWeek: false } : w));
    persist({ ...data, weeks: [snapshot, ...data.weeks], tasks, workstreams, currentWeekStart: addDays(start, 7) });
  });

  const buildScopeContext = (scope) => {
    if (scope === "management") {
      const blocks = data.workstreams.filter((w) => w.status === "Blocked").map((w) => `${teamName(w.subTeam)}: ${w.title}${w.blocker ? ` (blocked: ${w.blocker})` : ""}`);
      const decs = data.decisions.filter((d) => d.status !== "Decided").map((d) => `${d.title} — ${d.decider} [${d.priority}]`);
      const week = data.workstreams.filter((w) => w.thisWeek).map((w) => `${teamName(w.subTeam)}: ${w.title} [${w.status}]`);
      const dep = openTasks.filter((t) => t.dependsOnMe).map((t) => t.title);
      return `Scope: weekly management meeting across Growth and Product.\nBlockers:\n${blocks.join("\n") || "none"}\nOpen decisions:\n${decs.join("\n") || "none"}\nActive this week:\n${week.join("\n") || "none"}\nWaiting on me:\n${dep.join("\n") || "none"}`;
    }
    const org = scope === "growth" ? "Growth" : "Product";
    const ids = data.teams.filter((t) => t.org === org).map((t) => t.id);
    const ws = data.workstreams.filter((w) => ids.includes(w.subTeam)).map((w) => `${teamName(w.subTeam)}: ${w.title} [${w.status}]${w.blocker ? ` blocked: ${w.blocker}` : ""}`);
    const tks = openTasks.filter((t) => ids.includes(t.subTeam) && t.thisWeek).map((t) => `${t.title} [${t.priority}]`);
    const decs = data.decisions.filter((d) => ids.includes(d.subTeam) && d.status !== "Decided").map((d) => `${d.title} — ${d.decider}`);
    return `Scope: ${org} team meeting.\nWorkstreams:\n${ws.join("\n") || "none"}\nThis week's tasks:\n${tks.join("\n") || "none"}\nOpen decisions:\n${decs.join("\n") || "none"}`;
  };

  const runPreread = async (context) => {
    const prompt = `You are a chief-of-staff assistant preparing a pre-read before a meeting. Using only the context below, write a concise pre-read as plain text with these sections and short bullets: "Since last time", "Blockers to raise", "Decisions pending", "Status", and "Suggested agenda" (a short numbered list). No preamble and no closing remarks.\n\nCONTEXT:\n${context}`;
    try {
      const res = await fetch(CLAUDE_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, messages: [{ role: "user", content: prompt }] }) });
      const d = await res.json();
      return (d.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
    } catch (e) { return "Could not generate the pre-read right now. Try again."; }
  };

  /* ---------- nav ---------- */
  const NAV_GROUPS = [
    { heading: null, items: [{ id: "dashboard", label: "Command Center", Icon: LayoutDashboard }] },
    { heading: "Organizations", items: [
      { id: "product", label: "Product", Icon: Boxes },
      { id: "growth", label: "Growth", Icon: TrendingUp },
      { id: "leadership", label: "Leadership", Icon: Crown },
    ] },
    { heading: "Workspace", items: [
      { id: "tasks", label: "Tasks", Icon: CheckSquare },
      { id: "decisions", label: "Decisions", Icon: Scale },
      { id: "people", label: "People & 1:1s", Icon: UserRound },
      { id: "calendar", label: "Calendar", Icon: Calendar },
    ] },
    { heading: "Prepare", items: [
      { id: "prereads", label: "Pre-reads", Icon: FileText },
      { id: "process", label: "Process a meeting", Icon: Sparkles },
      { id: "monday", label: "Weekly agenda", Icon: CalendarClock },
    ] },
  ];
  const NAV = NAV_GROUPS.flatMap((g) => g.items);

  /* ---------- reusable rows ---------- */
  const TaskRow = ({ t, showTeam = true }) => {
    const subs = t.subtasks || [];
    const doneSubs = subs.filter((s) => s.done).length;
    const open = !!expanded[t.id];
    const stop = (e) => e.stopPropagation();
    const meta = [];
    if (showTeam && t.subTeam) meta.push(teamName(t.subTeam));
    if (t.assignee) meta.push(personName(t.assignee));
    if (t.due) meta.push("Due " + t.due);
    if (t.type === "Doc/Flow review") meta.push("Review");
    return (
      <div onClick={() => openEdit("task", t)} className="group cursor-pointer border-b border-slate-100 transition last:border-0 hover:bg-slate-50/70">
        <div className="flex items-start gap-3 px-4 py-4">
          <button onClick={(e) => { stop(e); toggleTaskDone(t); }} title="Mark done" className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${t.status === "Done" ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 hover:border-teal-500"}`}>
            {t.status === "Done" && <Check size={13} />}
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className={`min-w-0 break-words text-sm font-medium ${t.status === "Done" ? "text-slate-400 line-through" : "text-slate-800"}`}>{t.title}</div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Pill tone={PRIO_TONE[t.priority]} plain>{t.priority}</Pill>
                <button onClick={(e) => { stop(e); cycleTaskStatus(t); }} title="Click to change status: To do → In progress → Blocked → Done" className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium transition hover:opacity-80 ${TONES[TASK_TONE[t.status] || "slate"]}`}>
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT[TASK_TONE[t.status]]}`} />{t.status}
                </button>
              </div>
            </div>
            {meta.length > 0 && (
              <div className="mt-1 break-words text-xs text-slate-400">{meta.join("  ·  ")}{t.dependsOnMe && <span className="text-teal-600">  ·  Waiting on you</span>}</div>
            )}
            {(t.links || []).length > 0 || subs.length > 0 ? (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {(t.links || []).map((l) => l.url && (
                  <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer" onClick={stop} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-teal-700 hover:bg-teal-50">
                    <Link2 size={11} />{l.label || hostOf(l.url)}
                  </a>
                ))}
                {subs.length > 0 && (
                  <button onClick={(e) => { stop(e); toggleExpand(t.id); }} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600 hover:bg-slate-100">
                    <ChevronRight size={11} className={`transition-transform ${open ? "rotate-90" : ""}`} />{doneSubs}/{subs.length} sub-tasks
                  </button>
                )}
              </div>
            ) : null}
          </div>
          <IconAction onClick={(e) => { stop(e); deleteRecord("task", t.id); }} title="Delete"><Trash2 size={15} /></IconAction>
        </div>
        {open && subs.length > 0 && (
          <div className="space-y-1.5 pb-4 pl-12 pr-4">
            {subs.map((s) => (
              <div key={s.id} className="flex items-center gap-2">
                <button onClick={(e) => { stop(e); toggleSubtask(t.id, s.id); }} className="flex items-center gap-2 text-left">
                  <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${s.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300"}`}>{s.done && <Check size={11} />}</span>
                  <span className={`text-sm ${s.done ? "text-slate-400 line-through" : "text-slate-600"}`}>{s.title}</span>
                </button>
                {s.url && (
                  <a href={s.url} target="_blank" rel="noopener noreferrer" onClick={stop} className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-800">
                    <ExternalLink size={12} />{hostOf(s.url)}
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  /* ---------- views ---------- */
  const StatCard = ({ label, value, tone, onClick }) => (
    <button onClick={onClick} className="flex-1 rounded-2xl border border-slate-200/70 bg-white px-4 py-3.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
      <div className={`cos-display text-3xl font-bold tracking-tight ${tone}`}>{value}</div>
      <div className="mt-0.5 text-xs font-medium text-slate-500">{label}</div>
    </button>
  );

  const renderDashboard = () => (
    <div className="space-y-5">
      <PageHeader title="Command Center" subtitle="Everything that needs you, in one glance" accent="teal" icon={LayoutDashboard} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Blockers" value={blockedWs.length + blockedTasks.length} tone="text-rose-600" onClick={() => setTab("leadership")} />
        <StatCard label="Depends on me" value={dependsOnMe.length} tone="text-teal-600" onClick={() => setTab("tasks")} />
        <StatCard label="Decisions open" value={openDecisions.length} tone="text-amber-600" onClick={() => setTab("decisions")} />
        <StatCard label="Active this week" value={weekWs.length} tone="text-sky-600" onClick={() => setTab("product")} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
            <AlertTriangle size={16} className="text-rose-500" />
            <span className="text-sm font-semibold text-slate-700">Blockers, everywhere</span>
          </div>
          <div>
            {blockedWs.length === 0 && blockedTasks.length === 0 && <div className="p-4"><Empty title="Nothing blocked right now" /></div>}
            {blockedWs.map((w) => (
              <div key={w.id} className="flex items-start gap-3 border-b border-slate-100 px-4 py-3 last:border-0">
                <div className="min-w-0 flex-1">
                  <div className="break-words text-sm font-medium text-slate-800">{w.title}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <Pill tone="slate">{teamName(w.subTeam)}</Pill>
                    <Pill tone="indigo">Workstream</Pill>
                  </div>
                  {w.blocker && <div className="mt-1 break-words text-xs text-rose-600">{w.blocker}</div>}
                </div>
                <Btn variant="ghost" onClick={() => resolveWorkstream(w)} className="shrink-0"><Check size={14} />Resolve</Btn>
              </div>
            ))}
            {blockedTasks.map((t) => (
              <div key={t.id} className="flex items-start gap-3 border-b border-slate-100 px-4 py-3 last:border-0">
                <div className="min-w-0 flex-1">
                  <div className="break-words text-sm font-medium text-slate-800">{t.title}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {t.subTeam && <Pill tone="slate">{teamName(t.subTeam)}</Pill>}
                    {t.assignee && <Pill tone="slate">{personName(t.assignee)}</Pill>}
                    <Pill tone="amber">Task</Pill>
                  </div>
                  {t.blocker && <div className="mt-1 break-words text-xs text-rose-600">{t.blocker}</div>}
                </div>
                <Btn variant="ghost" onClick={() => resolveTask(t)} className="shrink-0"><Check size={14} />Resolve</Btn>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <CheckSquare size={16} className="text-teal-600" />
              <span className="text-sm font-semibold text-slate-700">My tasks</span>
            </div>
            <Btn variant="ghost" onClick={() => openAdd("task", { mine: true })}><Plus size={14} />Add</Btn>
          </div>
          <div>
            {myTasks.length === 0 ? <div className="p-4"><Empty title="No tasks assigned to you" hint="Anything you flag as yours shows here" /></div> : sortTasks(myTasks).map((t) => <TaskRow key={t.id} t={t} />)}
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
            <UserRound size={16} className="text-teal-600" />
            <span className="text-sm font-semibold text-slate-700">Waiting on me</span>
          </div>
          <div>
            {dependsOnMe.length === 0 ? <div className="p-4"><Empty title="Nothing is waiting on you" /></div> : sortTasks(dependsOnMe).map((t) => <TaskRow key={t.id} t={t} />)}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <Scale size={16} className="text-amber-600" />
              <span className="text-sm font-semibold text-slate-700">Decisions needing action</span>
            </div>
            <Btn variant="ghost" onClick={() => setTab("decisions")}>Open<ChevronRight size={14} /></Btn>
          </div>
          <div>
            {openDecisions.length === 0 ? <div className="p-4"><Empty title="No open decisions" /></div> : [...openDecisions].sort((a, b) => PRIO_ORDER[a.priority] - PRIO_ORDER[b.priority]).map((d) => (
              <div key={d.id} className="border-b border-slate-100 px-4 py-3 last:border-0">
                <div className="text-sm font-medium text-slate-800">{d.title}</div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <Pill tone={PRIO_TONE[d.priority]}>{d.priority}</Pill>
                  <Pill tone={DECIDER_TONE[d.decider]}>{d.decider}</Pill>
                  <Pill tone={DEC_TONE[d.status]}>{d.status}</Pill>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );

  const MiniStat = ({ label, value, accent = "slate" }) => (
    <div className="rounded-2xl border border-slate-200/70 bg-white px-4 py-3 shadow-sm">
      <div className={`cos-display text-2xl font-bold tracking-tight ${ACCENT[accent].text}`}>{value}</div>
      <div className="mt-0.5 text-xs font-medium text-slate-500">{label}</div>
    </div>
  );

  const ORG_META = {
    Product: { accent: "indigo", icon: Boxes, blurb: "Identity & Financial Data, Payments, Platforms, and Owo" },
    Growth: { accent: "emerald", icon: TrendingUp, blurb: "Partner Success, Marketing, and Technical Support & DevEx" },
  };
  const renderOrg = (org) => {
    const meta = ORG_META[org];
    const teams = data.teams.filter((t) => t.org === org);
    const orgWs = data.workstreams.filter((w) => teams.some((t) => t.id === w.subTeam));
    const orgTasks = openTasks.filter((t) => teams.some((x) => x.id === t.subTeam));
    const blocked = orgWs.filter((w) => w.status === "Blocked").length;
    return (
      <div className="space-y-5">
        <PageHeader
          title={org}
          subtitle={meta.blurb}
          accent={meta.accent}
          icon={meta.icon}
          action={<Btn variant="ghost" onClick={() => openAdd("team", { org })}><Plus size={14} />Add sub-team</Btn>}
        />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MiniStat label="Sub-teams" value={teams.length} accent={meta.accent} />
          <MiniStat label="Workstreams" value={orgWs.length} accent={meta.accent} />
          <MiniStat label="Open tasks" value={orgTasks.length} accent={meta.accent} />
          <MiniStat label="Blocked" value={blocked} accent={blocked ? "rose" : meta.accent} />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {teams.map((team) => {
            const ws = data.workstreams.filter((w) => w.subTeam === team.id);
            const tks = openTasks.filter((t) => t.subTeam === team.id);
            return (
              <Card key={team.id} className="overflow-hidden">
                <div className={`flex items-start justify-between gap-2 border-b border-slate-100 px-4 py-3 ${ACCENT[meta.accent].soft}`}>
                  <div className="min-w-0">
                    <div className="break-words text-sm font-semibold text-slate-800">{team.name}</div>
                    <div className="mt-0.5 text-xs text-slate-500">{ws.length} workstreams · {tks.length} open tasks</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <IconAction onClick={() => openEdit("team", team)} title="Rename sub-team"><Pencil size={15} /></IconAction>
                    <IconAction onClick={() => askConfirm("Delete this sub-team? Items assigned to it become Unassigned.", () => deleteRecord("team", team.id))} title="Delete sub-team"><Trash2 size={15} /></IconAction>
                    <IconAction onClick={() => openAdd("workstream", { subTeam: team.id })} title="Add workstream"><Plus size={16} /></IconAction>
                  </div>
                </div>
                <div>
                  {ws.length === 0 ? <div className="p-4"><Empty title="No workstreams yet" hint="Add what this team is working on" /></div> : ws.map((w) => {
                    const wMeta = [];
                    if (w.owner) wMeta.push(personName(w.owner));
                    if (w.due) wMeta.push("Due " + w.due);
                    if (w.needsReview) wMeta.push("Needs review");
                    return (
                      <div key={w.id} onClick={() => openEdit("workstream", w)} className="group flex cursor-pointer items-start gap-3 border-b border-slate-100 px-4 py-4 transition last:border-0 hover:bg-slate-50/70">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 break-words text-sm font-medium text-slate-800">{w.title}</div>
                            <div className="flex shrink-0 items-center gap-1.5">
                              {w.thisWeek && <Pill tone="sky" plain>This week</Pill>}
                              <Pill tone={WS_TONE[w.status]}>{w.status}</Pill>
                            </div>
                          </div>
                          {wMeta.length > 0 && <div className="mt-1 break-words text-xs text-slate-400">{wMeta.join("  ·  ")}</div>}
                        </div>
                        <IconAction onClick={(e) => { e.stopPropagation(); deleteRecord("workstream", w.id); }} title="Delete"><Trash2 size={15} /></IconAction>
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  const renderLeadership = () => {
    const signoff = data.decisions.filter((d) => (d.decider === "CEO" || d.decider === "Peer manager") && d.status !== "Decided");
    const myDecisions = data.decisions.filter((d) => d.decider === "Me" && d.status !== "Decided");
    const execTasks = openTasks.filter((t) => !t.subTeam);
    const escalate = data.workstreams.filter((w) => w.status === "Blocked");
    const mgmtMeetings = data.meetings.filter((m) => m.type === "Management" || m.type === "CEO 1:1").sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    return (
      <div className="space-y-6">
        <PageHeader
          title="Leadership"
          subtitle="Management and strategic work: sign-offs, your calls, and what to escalate"
          accent="amber"
          icon={Crown}
          action={<Btn onClick={() => openAdd("decision", { decider: "CEO" })}><Plus size={14} />Add decision</Btn>}
        />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MiniStat label="Awaiting sign-off" value={signoff.length} accent="amber" />
          <MiniStat label="My calls to make" value={myDecisions.length} accent="teal" />
          <MiniStat label="Strategic tasks" value={execTasks.length} accent="indigo" />
          <MiniStat label="To escalate" value={escalate.length} accent={escalate.length ? "rose" : "slate"} />
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div>
            <SectionHeader>Needs sign-off from CEO or a peer</SectionHeader>
            <Card>
              {signoff.length === 0 ? <div className="p-4"><Empty title="Nothing waiting on sign-off" /></div> : signoff.map((d) => (
                <div key={d.id} className="border-b border-slate-100 px-4 py-3 last:border-0">
                  <div className="break-words text-sm font-medium text-slate-800">{d.title}</div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Pill tone={PRIO_TONE[d.priority]}>{d.priority}</Pill>
                    <Pill tone={DECIDER_TONE[d.decider]}>{d.decider}</Pill>
                    <Pill tone={DEC_TONE[d.status]}>{d.status}</Pill>
                  </div>
                  {d.whatsNeeded && <div className="mt-1 break-words text-xs text-amber-700">Needs: {d.whatsNeeded}</div>}
                </div>
              ))}
            </Card>
          </div>
          <div>
            <SectionHeader right={<Btn variant="ghost" onClick={() => openAdd("task", { thisWeek: true, mine: true })}><Plus size={13} />Add</Btn>}>Strategic & admin tasks</SectionHeader>
            <Card>
              {execTasks.length === 0 ? <div className="p-4"><Empty title="No strategic tasks" hint="Tasks with no sub-team land here" /></div> : sortTasks(execTasks).map((t) => <TaskRow key={t.id} t={t} />)}
            </Card>
          </div>
          <div>
            <SectionHeader>Management meetings</SectionHeader>
            <Card>
              {mgmtMeetings.length === 0 ? <div className="p-4"><Empty title="No management meetings logged yet" hint="They appear here once processed" /></div> : mgmtMeetings.map((m) => (
                <div key={m.id} className="border-b border-slate-100 px-4 py-3 last:border-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate text-sm font-medium text-slate-800">{m.title}</div>
                    <div className="shrink-0 text-xs text-slate-400">{m.date}</div>
                  </div>
                  {m.summary && <div className="mt-1 break-words text-xs text-slate-500">{m.summary}</div>}
                </div>
              ))}
            </Card>
          </div>
          <div>
            <SectionHeader>Blockers to escalate</SectionHeader>
            <Card>
              {escalate.length === 0 ? <div className="p-4"><Empty title="Nothing blocked" /></div> : escalate.map((w) => (
                <div key={w.id} className="border-b border-slate-100 px-4 py-3 last:border-0">
                  <div className="break-words text-sm font-medium text-slate-800">{w.title}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5"><Pill tone="slate">{teamName(w.subTeam)}</Pill></div>
                  {w.blocker && <div className="mt-1 break-words text-xs text-rose-600">{w.blocker}</div>}
                </div>
              ))}
            </Card>
          </div>
        </div>
      </div>
    );
  };

  const TaskFilters = () => null; // filters handled by state below

  const renderTasks = () => <TasksTab />;

  function TasksTab() {
    const f = taskFilters;
    const setF = (patch) => setTaskFilters({ ...f, ...patch });
    // base: everything except the status filter (so status counts reflect the other filters)
    let base = data.tasks;
    if (f.team !== "all") base = base.filter((t) => t.subTeam === f.team);
    if (f.person !== "all") base = base.filter((t) => t.assignee === f.person);
    if (f.mine) base = base.filter((t) => t.mine);
    if (f.dep) base = base.filter((t) => t.dependsOnMe);
    if (f.week) base = base.filter((t) => t.thisWeek);
    const counts = { all: base.length };
    TASK_STATUS.forEach((s) => { counts[s] = base.filter((t) => t.status === s).length; });
    const list = sortTasks(f.status === "all" ? base : base.filter((t) => t.status === f.status));

    const Toggle = ({ on, onClick, children }) => (
      <button onClick={onClick} className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${on ? "border-teal-300 bg-teal-50 text-teal-700" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"}`}>{children}</button>
    );
    const sel = "rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600";
    const chips = [{ key: "all", label: "All", tone: "teal" }, ...TASK_STATUS.map((s) => ({ key: s, label: s, tone: TASK_TONE[s] }))];
    const StatusChip = ({ c }) => {
      const active = f.status === c.key;
      return (
        <button onClick={() => setF({ status: c.key })} className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${active ? TONES[c.tone] : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"}`}>
          {c.key !== "all" && <span className={`h-1.5 w-1.5 rounded-full ${DOT[c.tone]}`} />}{c.label}
          <span className={active ? "" : "text-slate-400"}>{c.key === "all" ? counts.all : counts[c.key]}</span>
        </button>
      );
    };

    return (
      <div className="space-y-4">
        <PageHeader
          title="Tasks"
          subtitle="Filter by state to see what's in progress, blocked, or done — your running history"
          accent="slate"
          icon={CheckSquare}
          action={<Btn onClick={() => openAdd("task")}><Plus size={14} />Add task</Btn>}
        />
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((c) => <StatusChip key={c.key} c={c} />)}
          <div className="ml-auto">
            <Toggle on={f.group} onClick={() => setF({ group: !f.group })}>Group by status</Toggle>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select className={sel} value={f.team} onChange={(e) => setF({ team: e.target.value })}>
            <option value="all">All teams</option>
            {data.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select className={sel} value={f.person} onChange={(e) => setF({ person: e.target.value })}>
            <option value="all">Anyone</option>
            {data.people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <Toggle on={f.mine} onClick={() => setF({ mine: !f.mine })}>Mine</Toggle>
          <Toggle on={f.dep} onClick={() => setF({ dep: !f.dep })}>Depends on me</Toggle>
          <Toggle on={f.week} onClick={() => setF({ week: !f.week })}>This week</Toggle>
        </div>

        {f.group ? (
          <div className="space-y-5">
            {TASK_STATUS.map((s) => {
              const items = sortTasks(base.filter((t) => t.status === s));
              if (items.length === 0) return null;
              return (
                <div key={s}>
                  <SectionHeader><span className="inline-flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${DOT[TASK_TONE[s]]}`} />{s} · {items.length}</span></SectionHeader>
                  <Card>{items.map((t) => <TaskRow key={t.id} t={t} />)}</Card>
                </div>
              );
            })}
            {base.length === 0 && <Empty title="No tasks match" hint="Clear a filter or add a task" />}
          </div>
        ) : (
          <Card>
            {list.length === 0 ? <div className="p-4"><Empty title="No tasks match" hint="Clear a filter or add a task" /></div> : list.map((t) => <TaskRow key={t.id} t={t} />)}
          </Card>
        )}
      </div>
    );
  }

  const renderDecisions = () => <DecisionsTab />;
  function DecisionsTab() {
    const [fDecider, setFDecider] = useState("all");
    const [fTeam, setFTeam] = useState("all");
    let list = data.decisions;
    if (fDecider !== "all") list = list.filter((d) => d.decider === fDecider);
    if (fTeam !== "all") list = list.filter((d) => d.subTeam === fTeam);
    const sel = "rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600";
    return (
      <div className="space-y-4">
        <PageHeader title="Decisions" subtitle="What you need to decide and what needs another sign-off, by priority" accent="amber" icon={Scale} />
        <div className="flex flex-wrap items-center gap-2">
          <select className={sel} value={fDecider} onChange={(e) => setFDecider(e.target.value)}>
            <option value="all">Any signer</option>
            {DECIDER.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select className={sel} value={fTeam} onChange={(e) => setFTeam(e.target.value)}>
            <option value="all">All teams</option>
            {data.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <div className="ml-auto"><Btn onClick={() => openAdd("decision")}><Plus size={14} />Add decision</Btn></div>
        </div>
        {PRIORITY.map((prio) => {
          const items = list.filter((d) => d.priority === prio);
          if (items.length === 0) return null;
          return (
            <div key={prio}>
              <div className="mb-2"><Eyebrow>{prio}</Eyebrow></div>
              <Card>
                {items.map((d) => (
                  <div key={d.id} className="flex items-start gap-3 border-b border-slate-100 px-4 py-3 last:border-0">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-slate-800">{d.title}</div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <Pill tone={DECIDER_TONE[d.decider]}>{d.decider}</Pill>
                        <Pill tone={DEC_TONE[d.status]}>{d.status}</Pill>
                        {d.subTeam && <Pill tone="slate">{teamName(d.subTeam)}</Pill>}
                        {d.due && <Pill tone="slate"><Clock size={11} />{d.due}</Pill>}
                      </div>
                      {d.affects && <div className="mt-1 text-xs text-slate-500">Affects: {d.affects}</div>}
                      {d.whatsNeeded && <div className="mt-0.5 text-xs text-amber-700">Needs: {d.whatsNeeded}</div>}
                    </div>
                    <div className="flex shrink-0">
                      <IconAction onClick={() => openEdit("decision", d)} title="Edit"><Pencil size={15} /></IconAction>
                      <IconAction onClick={() => deleteRecord("decision", d.id)} title="Delete"><Trash2 size={15} /></IconAction>
                    </div>
                  </div>
                ))}
              </Card>
            </div>
          );
        })}
        {list.length === 0 && <Empty title="No decisions logged" hint="Add the calls you or others need to make" />}
      </div>
    );
  }

  const renderPeople = () => (
    <div className="space-y-4">
      <PageHeader
        title="People & 1:1s"
        subtitle={`${data.people.length} people across both orgs — open anyone for their 1:1 history`}
        accent="teal"
        icon={UserRound}
        action={<Btn onClick={() => openAdd("person")}><Plus size={14} />Add person</Btn>}
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data.people.map((p) => {
          const oneOnOnes = data.meetings.filter((m) => m.personId === p.id && (m.type === "1:1" || m.type === "CEO 1:1"));
          const theirTasks = openTasks.filter((t) => t.assignee === p.id);
          return (
            <Card key={p.id} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-800">{p.name}</div>
                  <div className="text-xs text-slate-400">{p.role || "No role set"} · {teamName(p.subTeam)}</div>
                </div>
                <Pill tone={PPL_TONE[p.status]}>{p.status}</Pill>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
                <CalendarClock size={13} />{p.cadence} 1:1{p.nextOneOnOne ? ` · next ${p.nextOneOnOne}` : ""}
              </div>
              <div className="mt-2 text-xs text-slate-500">{oneOnOnes.length} past 1:1s · {theirTasks.length} open tasks</div>
              <div className="mt-3 flex items-center gap-2">
                <Btn variant="ghost" onClick={() => setPersonView(p.id)}>Open<ChevronRight size={14} /></Btn>
                <IconAction onClick={() => openEdit("person", p)} title="Edit"><Pencil size={15} /></IconAction>
                <IconAction onClick={() => deleteRecord("person", p.id)} title="Delete"><Trash2 size={15} /></IconAction>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );

  const renderPrereads = () => <PrereadsTab />;
  function PrereadsTab() {
    const [scope, setScope] = useState("management"); // management | subteam | oneonone
    const [teamId, setTeamId] = useState("");
    const [personId, setPersonId] = useState("");
    const [busy, setBusy] = useState(false);
    const [out, setOut] = useState("");
    const [copied, setCopied] = useState(false);
    const [saved, setSaved] = useState(false);
    const sel = "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm";

    function gatherContext() {
      if (scope === "management") {
        const blocks = data.workstreams.filter((w) => w.status === "Blocked").map((w) => `${teamName(w.subTeam)}: ${w.title}${w.blocker ? ` (blocked: ${w.blocker})` : ""}`);
        const decs = data.decisions.filter((d) => d.status !== "Decided").map((d) => `${d.title} — ${d.decider} [${d.priority}]${d.whatsNeeded ? ` needs ${d.whatsNeeded}` : ""}`);
        const week = data.workstreams.filter((w) => w.thisWeek).map((w) => `${teamName(w.subTeam)}: ${w.title} [${w.status}]`);
        const dep = openTasks.filter((t) => t.dependsOnMe).map((t) => t.title);
        return `Scope: weekly management meeting across Growth and Product.\nBlockers:\n${blocks.join("\n") || "none"}\nOpen decisions:\n${decs.join("\n") || "none"}\nActive this week:\n${week.join("\n") || "none"}\nWaiting on me:\n${dep.join("\n") || "none"}`;
      }
      if (scope === "subteam") {
        const t = data.teams.find((x) => x.id === teamId);
        const ws = data.workstreams.filter((w) => w.subTeam === teamId).map((w) => `${w.title} [${w.status}]${w.blocker ? ` blocked: ${w.blocker}` : ""}${w.update ? ` — ${w.update}` : ""}`);
        const tks = openTasks.filter((x) => x.subTeam === teamId).map((x) => `${x.title} [${x.priority}]`);
        const decs = data.decisions.filter((d) => d.subTeam === teamId && d.status !== "Decided").map((d) => `${d.title} — ${d.decider}`);
        return `Scope: ${t ? t.name : "team"} sub-team meeting.\nWorkstreams:\n${ws.join("\n") || "none"}\nOpen tasks:\n${tks.join("\n") || "none"}\nOpen decisions:\n${decs.join("\n") || "none"}`;
      }
      const p = data.people.find((x) => x.id === personId);
      const last = data.meetings.filter((m) => m.personId === personId && (m.type === "1:1" || m.type === "CEO 1:1")).sort((a, b) => (b.date || "").localeCompare(a.date || ""))[0];
      const tks = openTasks.filter((x) => x.assignee === personId).map((x) => x.title);
      return `Scope: 1:1 with ${p ? p.name : "team member"} (${p ? p.role : ""}).\nLast 1:1 summary: ${last ? last.summary : "none on record"}\nTheir open tasks:\n${tks.join("\n") || "none"}\nCurrent status flag: ${p ? p.status : ""}`;
    }

    async function generate() {
      setBusy(true); setOut(""); setSaved(false);
      const ctx = gatherContext();
      const prompt = `You are a chief-of-staff assistant preparing a pre-read for a manager before a meeting. Using only the context below, write a concise pre-read as plain text with these sections and short bullets: "Since last time", "Blockers to raise", "Decisions pending", "Status", and "Suggested agenda" (a short numbered list). No preamble and no closing remarks.\n\nCONTEXT:\n${ctx}`;
      try {
        const res = await fetch(CLAUDE_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, messages: [{ role: "user", content: prompt }] }) });
        const d = await res.json();
        setOut((d.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n"));
      } catch (e) { setOut("Could not generate the pre-read right now. Try again."); }
      setBusy(false);
    }

    const copy = async () => { const ok = await doCopy(out); if (ok) { setCopied(true); setTimeout(() => setCopied(false), 1500); } };

    function save() {
      const title = scope === "management" ? "Management meeting pre-read"
        : scope === "subteam" ? `${teamName(teamId)} pre-read`
        : `1:1 pre-read — ${personName(personId)}`;
      const meeting = {
        id: uid(), title, date: today(), recording: "", rawNotes: "", summary: "", preRead: out,
        type: scope === "management" ? "Management" : scope === "subteam" ? "Sub-team" : "1:1",
        subTeam: scope === "subteam" ? teamId : "",
        personId: scope === "oneonone" ? personId : "",
      };
      persist({ ...data, meetings: [meeting, ...data.meetings] });
      setSaved(true); setTimeout(() => setSaved(false), 1500);
    }

    const canRun = scope === "management" || (scope === "subteam" && teamId) || (scope === "oneonone" && personId);
    const ScopeBtn = ({ id, children }) => (
      <button onClick={() => { setScope(id); setOut(""); }} className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${scope === id ? "border-teal-300 bg-teal-50 text-teal-700" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"}`}>{children}</button>
    );

    return (
      <div className="space-y-5">
        <PageHeader title="Pre-reads" subtitle="Generate a briefing from live data before any meeting" accent="indigo" icon={FileText} />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="p-4">
          <div className="mb-3 text-sm font-semibold text-slate-700">What meeting are you prepping for?</div>
          <div className="flex flex-wrap gap-2">
            <ScopeBtn id="management">Management meeting</ScopeBtn>
            <ScopeBtn id="subteam">A sub-team</ScopeBtn>
            <ScopeBtn id="oneonone">A 1:1</ScopeBtn>
          </div>
          {scope === "subteam" && (
            <select className={`${sel} mt-3 w-full`} value={teamId} onChange={(e) => { setTeamId(e.target.value); setOut(""); }}>
              <option value="">Choose a sub-team</option>
              {data.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}
          {scope === "oneonone" && (
            <select className={`${sel} mt-3 w-full`} value={personId} onChange={(e) => { setPersonId(e.target.value); setOut(""); }}>
              <option value="">Choose a person</option>
              {data.people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
          <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs text-slate-500">
            The pre-read is built from what's live in the app right now: open blockers, decisions, this-week workstreams, and for a 1:1, the person's last summary and open tasks.
          </div>
          <div className="mt-3">
            <Btn onClick={generate} className={!canRun || busy ? "opacity-60" : ""}>{busy ? <><Loader2 size={14} className="animate-spin" />Building</> : <><FileText size={14} />Generate pre-read</>}</Btn>
          </div>
        </Card>

        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700">Pre-read</span>
            {out && (
              <div className="flex gap-2">
                <Btn variant="ghost" onClick={copy}>{copied ? <><Check size={14} />Copied</> : <><Copy size={14} />Copy</>}</Btn>
                <Btn variant="ghost" onClick={save}>{saved ? <><Check size={14} />Saved</> : <><Save size={14} />Save</>}</Btn>
              </div>
            )}
          </div>
          {out ? <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-700">{out}</pre> : <Empty title="Your pre-read appears here" hint="Pick a meeting and generate" />}
        </Card>
        </div>
      </div>
    );
  }

  const renderProcess = () => <ProcessTab />;
  function ProcessTab() {
    const [form, setForm] = useState({ title: "", type: "Sub-team", subTeam: "", personId: "", date: today(), notes: "" });
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState("");
    const [result, setResult] = useState(null);
    const sel = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm";

    const matchPerson = (name) => {
      if (!name) return "";
      const hit = data.people.find((p) => p.name.toLowerCase().includes(String(name).toLowerCase()) || String(name).toLowerCase().includes(p.name.toLowerCase().split(" ")[0]));
      return hit ? hit.id : "";
    };

    function parseNextSteps(text) {
      const lines = text.split(/\r?\n/);
      const items = [];
      let inSection = false;
      for (const raw of lines) {
        const line = raw.trim();
        if (/^#{1,6}\s.*next steps/i.test(line) || /^\*{0,2}next steps\*{0,2}\s*$/i.test(line)) { inSection = true; continue; }
        if (inSection && /^#{1,6}\s/.test(line) && !/next steps/i.test(line)) break;
        if (!inSection) continue;
        const m = line.match(/^[-*]\s*\[[ xX]?\]\s*(.*)$/);
        if (!m) continue;
        let body = m[1].trim();
        let owner = "";
        const om = body.match(/^\\?\[([^\]]+?)\\?\]\s*(.*)$/);
        if (om) { owner = om[1].trim(); body = om[2].trim(); }
        let title = body;
        const ci = body.indexOf(":");
        if (ci > 0 && ci < 90) title = body.slice(0, ci).trim();
        if (title) items.push({ title, owner: owner.split(" ")[0] });
      }
      return items;
    }

    async function run() {
      if (!form.notes.trim()) { setErr("Paste some meeting notes first."); return; }
      setBusy(true); setErr(""); setResult(null);
      const steps = parseNextSteps(form.notes);
      const wantAIActions = steps.length === 0;
      const prompt = `You are a chief-of-staff assistant. Read the meeting notes and return ONLY valid JSON, no markdown fences and no commentary, with this shape:
{"summary":"3 to 4 sentence summary","decisions":[{"title":"decision to make","decider":"Me or Peer manager or CEO","priority":"P0 or P1 or P2"}],"blockers":["short blocker"]${wantAIActions ? ',"actionItems":[{"title":"short imperative task","assignee":"name or empty","priority":"P0 or P1 or P2","due":""}]' : ""}}
Capture every distinct decision and blocker you find, not just the top few. Keep every title short.${wantAIActions ? " Also capture every action item you find, up to 40." : ""}

MEETING NOTES:
${form.notes}`;
      try {
        const res = await fetch(CLAUDE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, messages: [{ role: "user", content: prompt }] }),
        });
        const d = await res.json();
        const txt = (d.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
        let parsed;
        try { parsed = JSON.parse(txt.replace(/```json/gi, "").replace(/```/g, "").trim()); }
        catch (e) {
          if (steps.length === 0) throw new Error("Could not read the AI response. Try shortening the notes and running again.");
          parsed = { summary: "", decisions: [], blockers: [] };
        }
        const stepActions = steps.map((s) => ({ title: s.title, assignee: s.owner, priority: "P1", due: "" }));
        const aiActions = wantAIActions ? (parsed.actionItems || []) : [];
        const allActions = [...stepActions, ...aiActions];
        setResult({
          summary: parsed.summary || "",
          actionItems: allActions.map((a) => ({ ...a, _id: uid(), _add: true, subTeam: form.subTeam || "" })),
          decisions: (parsed.decisions || []).map((x) => ({ ...x, _id: uid(), _add: true, subTeam: form.subTeam || "" })),
          blockers: parsed.blockers || [],
        });
      } catch (e) { setErr(e.message || "Something went wrong. Try again."); }
      setBusy(false);
    }

    function commit() {
      const meetingId = uid();
      const meeting = { id: meetingId, title: form.title || "Untitled meeting", type: form.type, subTeam: form.subTeam, personId: form.personId, date: form.date, recording: "", rawNotes: form.notes, summary: result.summary, preRead: "" };
      const newTasks = result.actionItems.filter((a) => a._add).map((a) => ({ id: uid(), title: a.title, type: "To-do", assignee: matchPerson(a.assignee), subTeam: a.subTeam, status: "To do", priority: PRIORITY.includes(a.priority) ? a.priority : "P1", due: a.due || "", dependsOnMe: false, mine: false, thisWeek: true, sourceMeetingId: meetingId, notes: "" }));
      const newDecs = result.decisions.filter((x) => x._add).map((x) => ({ id: uid(), title: x.title, decider: DECIDER.includes(x.decider) ? x.decider : "Me", priority: PRIORITY.includes(x.priority) ? x.priority : "P1", subTeam: x.subTeam, affects: "", whatsNeeded: "", status: "Open", due: "", sourceMeetingId: meetingId }));
      persist({ ...data, meetings: [meeting, ...data.meetings], tasks: [...newTasks, ...data.tasks], decisions: [...newDecs, ...data.decisions] });
      setResult(null); setForm({ title: "", type: "Sub-team", subTeam: "", personId: "", date: today(), notes: "" });
      setTab("tasks");
    }

    return (
      <div className="space-y-5">
        <PageHeader title="Process a meeting" subtitle="Paste notes and pull out a summary, action items, decisions, and blockers" accent="teal" icon={Sparkles} />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="p-4">
          <div className="mb-3 text-sm font-semibold text-slate-700">Meeting notes or transcript</div>
          <div className="grid grid-cols-2 gap-2">
            <input className={sel} placeholder="Meeting title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <select className={sel} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{MEETING_TYPE.map((t) => <option key={t}>{t}</option>)}</select>
            <select className={sel} value={form.subTeam} onChange={(e) => setForm({ ...form, subTeam: e.target.value })}>
              <option value="">No sub-team</option>
              {data.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <input type="date" className={sel} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <textarea className={`${sel} mt-2 h-56 resize-none`} placeholder="Paste the transcript or your raw notes here" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          {err && <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{err}</div>}
          <div className="mt-3">
            <Btn onClick={run} className={busy ? "opacity-70" : ""}>{busy ? <><Loader2 size={14} className="animate-spin" />Reading</> : <><Sparkles size={14} />Process with AI</>}</Btn>
          </div>
        </Card>

        <Card className="p-4">
          <div className="mb-3 text-sm font-semibold text-slate-700">What came out</div>
          {!result ? (
            <Empty title="Results show here" hint="Summary, action items, decisions and blockers, ready to add" />
          ) : (
            <div className="space-y-4">
              <div>
                <Eyebrow>Summary</Eyebrow>
                <p className="mt-1 text-sm text-slate-600">{result.summary}</p>
              </div>
              <div>
                <Eyebrow>Action items</Eyebrow>
                <div className="mt-1 space-y-1.5">
                  {result.actionItems.length === 0 && <div className="text-xs text-slate-400">None found</div>}
                  {result.actionItems.map((a, i) => (
                    <label key={a._id} className="flex items-start gap-2 rounded-lg border border-slate-200 px-3 py-2">
                      <input type="checkbox" checked={a._add} onChange={(e) => { const next = [...result.actionItems]; next[i] = { ...a, _add: e.target.checked }; setResult({ ...result, actionItems: next }); }} className="mt-1" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-slate-800">{a.title}</div>
                        <div className="mt-1 flex items-center gap-1.5">
                          <Pill tone={PRIO_TONE[a.priority] || "slate"}>{a.priority || "P1"}</Pill>
                          {a.assignee && <Pill tone="slate">{a.assignee}</Pill>}
                          <select className="rounded border border-slate-200 px-1 py-0.5 text-xs" value={a.subTeam} onChange={(e) => { const next = [...result.actionItems]; next[i] = { ...a, subTeam: e.target.value }; setResult({ ...result, actionItems: next }); }}>
                            <option value="">No team</option>
                            {data.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <Eyebrow>Decisions</Eyebrow>
                <div className="mt-1 space-y-1.5">
                  {result.decisions.length === 0 && <div className="text-xs text-slate-400">None found</div>}
                  {result.decisions.map((x, i) => (
                    <label key={x._id} className="flex items-start gap-2 rounded-lg border border-slate-200 px-3 py-2">
                      <input type="checkbox" checked={x._add} onChange={(e) => { const next = [...result.decisions]; next[i] = { ...x, _add: e.target.checked }; setResult({ ...result, decisions: next }); }} className="mt-1" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-slate-800">{x.title}</div>
                        <div className="mt-1 flex items-center gap-1.5">
                          <Pill tone={PRIO_TONE[x.priority] || "slate"}>{x.priority || "P1"}</Pill>
                          <Pill tone={DECIDER_TONE[x.decider] || "slate"}>{x.decider || "Me"}</Pill>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              {result.blockers.length > 0 && (
                <div>
                  <Eyebrow>Blockers</Eyebrow>
                  <ul className="mt-1 space-y-1">
                    {result.blockers.map((b, i) => <li key={i} className="text-xs text-rose-600">• {b}</li>)}
                  </ul>
                </div>
              )}
              <Btn onClick={commit}><Check size={14} />Add selected to system</Btn>
            </div>
          )}
        </Card>
        </div>
      </div>
    );
  }

  const renderMonday = () => <MondayTab />;
  const renderCalendar = () => <CalendarTab />;
  function CalendarTab() {
    const initMonth = (() => { const d = new Date(data.currentWeekStart + "T00:00:00"); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`; });
    const [month, setMonth] = useState(initMonth);
    const [sel, setSel] = useState(today());
    const [weekView, setWeekView] = useState(null);
    const monthNum = month.slice(0, 7);
    const days = [];
    { const start = mondayOf(month); for (let i = 0; i < 42; i++) days.push(addDays(start, i)); }
    const weeks = [0, 1, 2, 3, 4, 5].map((w) => days.slice(w * 7, w * 7 + 7));
    const dueByDay = (d) => data.tasks.filter((t) => t.due === d && t.status !== "Done");
    const meetByDay = (d) => data.meetings.filter((m) => m.date === d);
    const schedByDay = (d) => SCHEDULE.filter((s) => new Date(d + "T00:00:00").getDay() === s.weekday);
    const lastOfType = (type, before) => data.meetings.filter((m) => m.type === type && m.date < before).sort((a, b) => (b.date || "").localeCompare(a.date || ""))[0];
    const [pr, setPr] = useState(null); // { label, loading, text }
    const genPreread = async (s) => {
      setPr({ label: s.label, loading: true, text: "" });
      const text = await runPreread(buildScopeContext(s.scope));
      setPr({ label: s.label, loading: false, text });
    };
    const shiftMonth = (n) => { const d = new Date(month + "T00:00:00"); d.setMonth(d.getMonth() + n); setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`); };
    const monthLabel = new Date(month + "T00:00:00").toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const dow = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const selLabel = new Date(sel + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

    return (
      <div className="space-y-5">
        <PageHeader title="Calendar" subtitle="Pick any day to see its meetings and what's due; browse past weeks" accent="indigo" icon={Calendar} />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-800">{monthLabel}</div>
              <div className="flex gap-1">
                <IconAction onClick={() => shiftMonth(-1)} title="Previous month"><ChevronRight size={16} className="rotate-180" /></IconAction>
                <IconAction onClick={() => shiftMonth(1)} title="Next month"><ChevronRight size={16} /></IconAction>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-400">
              {dow.map((d) => <div key={d} className="py-1">{d}</div>)}
            </div>
            <div className="space-y-1">
              {weeks.map((wk, wi) => (
                <div key={wi} className="grid grid-cols-7 gap-1">
                  {wk.map((d) => {
                    const inMonth = d.slice(0, 7) === monthNum;
                    const isToday = d === today();
                    const isSel = d === sel;
                    const dues = dueByDay(d).length;
                    const meets = schedByDay(d).length;
                    return (
                      <button key={d} onClick={() => setSel(d)} className={`h-16 rounded-lg border p-1 text-left align-top transition ${isSel ? "border-teal-400 bg-teal-50" : "border-slate-100 hover:border-slate-200"} ${inMonth ? "" : "opacity-40"}`}>
                        <div className={`text-xs font-semibold ${isToday ? "text-teal-700" : "text-slate-500"}`}>{Number(d.slice(8, 10))}{isToday ? " ·" : ""}</div>
                        <div className="mt-1 flex flex-wrap gap-0.5">
                          {dues > 0 && <span className="rounded bg-rose-100 px-1 text-xs font-medium text-rose-700">{dues}</span>}
                          {meets > 0 && <span className="rounded bg-sky-100 px-1 text-xs font-medium text-sky-700">{meets}m</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1"><span className="rounded bg-rose-100 px-1 text-rose-700">n</span>tasks due</span>
              <span className="flex items-center gap-1"><span className="rounded bg-sky-100 px-1 text-sky-700">nm</span>meetings</span>
            </div>
          </Card>

          <div>
            <div className="mb-2"><Eyebrow>Weeks</Eyebrow></div>
            <div className="space-y-2">
              <Card className="flex items-center justify-between px-4 py-3">
                <div><div className="text-sm font-medium text-slate-800">{weekLabel(data.currentWeekStart)}</div><div className="text-xs text-slate-400">Current week</div></div>
                <Btn variant="ghost" onClick={() => setTab("monday")}>Open agenda<ChevronRight size={14} /></Btn>
              </Card>
              {data.weeks.map((wk) => (
                <Card key={wk.id} className="flex items-center justify-between px-4 py-3">
                  <div><div className="text-sm font-medium text-slate-800">{wk.label}</div><div className="text-xs text-slate-400">{wk.tasksDone}/{wk.tasksTotal} done · {wk.blockers} blockers</div></div>
                  <Btn variant="ghost" onClick={() => setWeekView(wk)}>View<ChevronRight size={14} /></Btn>
                </Card>
              ))}
            </div>
          </div>
        </div>

        <div>
          <Card className="p-4">
            <div className="text-sm font-semibold text-slate-800">{selLabel}</div>
            <div className="mt-3"><Eyebrow>Meetings this day</Eyebrow>
              {schedByDay(sel).length === 0 && meetByDay(sel).length === 0 && <div className="mt-1 text-xs text-slate-400">No meeting scheduled</div>}
              {schedByDay(sel).map((s, i) => {
                const last = lastOfType(s.type, sel);
                return (
                  <div key={i} className="mt-2 rounded-lg border border-slate-100 p-3">
                    <div className="text-sm font-medium text-slate-800">{s.label}</div>
                    {last ? (
                      <div className="mt-1 text-xs text-slate-500"><span className="font-medium text-slate-400">Last time ({last.date}):</span> {last.summary || "no summary"}</div>
                    ) : <div className="mt-1 text-xs text-slate-400">No earlier meeting on record yet</div>}
                    <div className="mt-2">
                      <Btn variant="ghost" onClick={() => genPreread(s)}><Sparkles size={13} />Generate pre-read</Btn>
                    </div>
                  </div>
                );
              })}
              {meetByDay(sel).map((m) => (
                <div key={m.id} className="mt-2 text-xs text-slate-500">Logged: {m.title}</div>
              ))}
            </div>
            <div className="mt-4"><Eyebrow>Tasks due</Eyebrow>
              {dueByDay(sel).length === 0 ? <div className="mt-1 text-xs text-slate-400">None</div> : dueByDay(sel).map((t) => (
                <div key={t.id} className="mt-1 flex items-center gap-1.5 text-sm text-slate-700"><Pill tone={PRIO_TONE[t.priority]}>{t.priority}</Pill>{t.title}</div>
              ))}
            </div>
          </Card>
        </div>

        {pr && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setPr(null)}>
            <div className="max-h-full w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
                <div className="text-sm font-semibold text-slate-800">Pre-read · {pr.label}</div>
                <div className="flex items-center gap-1">
                  {!pr.loading && pr.text && <Btn variant="ghost" onClick={() => doCopy(pr.text)}><Copy size={14} />Copy</Btn>}
                  <IconAction onClick={() => setPr(null)} title="Close"><X size={18} /></IconAction>
                </div>
              </div>
              <div className="p-5">
                {pr.loading ? <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 size={16} className="animate-spin" />Building the pre-read</div> : <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-700">{pr.text}</pre>}
              </div>
            </div>
          </div>
        )}

        {weekView && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setWeekView(null)}>
            <div className="max-h-full w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
                <div className="text-sm font-semibold text-slate-800">{weekView.label}</div>
                <IconAction onClick={() => setWeekView(null)} title="Close"><X size={18} /></IconAction>
              </div>
              <div className="p-5"><pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-slate-600">{weekView.agenda}</pre></div>
            </div>
          </div>
        )}
        </div>
      </div>
    );
  }

  function MondayTab() {
    const [copied, setCopied] = useState(false);
    const [openWeek, setOpenWeek] = useState(null);
    const copy = async () => { const ok = await doCopy(buildAgendaText()); if (ok) { setCopied(true); setTimeout(() => setCopied(false), 1500); } };

    return (
      <div className="space-y-4">
        <PageHeader
          title="Weekly agenda"
          subtitle={`Week of ${weekLabel(data.currentWeekStart)} · unfinished items roll into next week`}
          accent="teal"
          icon={CalendarClock}
          action={<div className="flex gap-2">
            <Btn variant="ghost" onClick={copy}>{copied ? <><Check size={14} />Copied</> : <><Copy size={14} />Copy</>}</Btn>
            <Btn onClick={startNewWeek}><CalendarClock size={14} />New week</Btn>
          </div>}
        />
        {["Product", "Growth"].map((org) => (
          <div key={org}>
            <div className="mb-2"><Eyebrow>{org}</Eyebrow></div>
            <div className="space-y-3">
              {data.teams.filter((t) => t.org === org).map((team) => {
                const ws = data.workstreams.filter((w) => w.subTeam === team.id && (w.thisWeek || w.status === "Blocked"));
                const tks = data.tasks.filter((t) => t.subTeam === team.id && t.thisWeek && t.status !== "Done");
                if (ws.length === 0 && tks.length === 0) return null;
                return (
                  <Card key={team.id} className="p-4">
                    <div className="text-sm font-semibold text-slate-800">{team.name}</div>
                    <div className="mt-2 space-y-1.5">
                      {ws.map((w) => (
                        <div key={w.id} className="flex items-center gap-2 text-sm">
                          <Pill tone={WS_TONE[w.status]}>{w.status}</Pill>
                          <span className="text-slate-700">{w.title}</span>
                          {w.due && <span className="text-xs text-slate-400">due {w.due}</span>}
                          {w.blocker && <span className="text-xs text-rose-600">{w.blocker}</span>}
                        </div>
                      ))}
                      {tks.map((t) => (
                        <div key={t.id} className="flex items-center gap-2 text-sm text-slate-600">
                          <Circle size={7} className="text-slate-300" />{t.title}<Pill tone={PRIO_TONE[t.priority]}>{t.priority}</Pill>
                          {t.due && <span className="text-xs text-slate-400">due {t.due}</span>}
                        </div>
                      ))}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
        <div>
          <div className="mb-2"><Eyebrow>Decisions for this meeting</Eyebrow></div>
          <Card className="p-4">
            {openDecisions.length === 0 ? <div className="text-sm text-slate-400">None open</div> : openDecisions.map((d) => (
              <div key={d.id} className="flex items-center gap-2 py-1 text-sm text-slate-700"><Scale size={13} className="text-amber-500" />{d.title}<Pill tone={DECIDER_TONE[d.decider]}>{d.decider}</Pill></div>
            ))}
          </Card>
        </div>

        <div>
          <div className="mb-2"><Eyebrow>Past weeks</Eyebrow></div>
          {data.weeks.length === 0 ? (
            <Empty title="No archived weeks yet" hint="When you start a new week, this week's snapshot lands here" />
          ) : (
            <div className="space-y-2">
              {data.weeks.map((wk) => (
                <Card key={wk.id}>
                  <button onClick={() => setOpenWeek(openWeek === wk.id ? null : wk.id)} className="flex w-full items-center justify-between px-4 py-3 text-left">
                    <div>
                      <div className="text-sm font-medium text-slate-800">{wk.label}</div>
                      <div className="text-xs text-slate-400">{wk.tasksDone}/{wk.tasksTotal} done · {wk.blockers} blockers · {wk.decisionsOpen} open decisions</div>
                    </div>
                    <ChevronRight size={16} className={`text-slate-400 transition-transform ${openWeek === wk.id ? "rotate-90" : ""}`} />
                  </button>
                  {openWeek === wk.id && (
                    <div className="border-t border-slate-100 p-4">
                      <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-slate-600">{wk.agenda}</pre>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ---------- person detail drawer ---------- */
  const PersonDrawer = () => {
    const p = data.people.find((x) => x.id === personView);
    const [prep, setPrep] = useState("");
    const [busy, setBusy] = useState(false);
    if (!p) return null;
    const oneOnOnes = data.meetings.filter((m) => m.personId === p.id && (m.type === "1:1" || m.type === "CEO 1:1")).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    const theirTasks = openTasks.filter((t) => t.assignee === p.id);

    async function prepOneOnOne() {
      setBusy(true); setPrep("");
      const last = oneOnOnes[0];
      const prompt = `Draft short 1:1 prep notes for a manager meeting with ${p.name} (${p.role || "team member"}). Use only what is given. Return 4 to 6 plain bullet points: things to follow up on, how they seemed, and what to raise. No preamble.
Last 1:1 summary: ${last ? last.summary : "none on record"}
Their open tasks: ${theirTasks.map((t) => t.title).join("; ") || "none"}
Current status flag: ${p.status}`;
      try {
        const res = await fetch(CLAUDE_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, messages: [{ role: "user", content: prompt }] }) });
        const d = await res.json();
        setPrep((d.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n"));
      } catch (e) { setPrep("Could not generate prep right now."); }
      setBusy(false);
    }

    return (
      <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/30" onClick={() => setPersonView(null)}>
        <div className="h-full w-full max-w-md overflow-y-auto bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-start justify-between border-b border-slate-100 p-4">
            <div>
              <div className="text-base font-semibold text-slate-800">{p.name}</div>
              <div className="text-xs text-slate-400">{p.role || "No role"} · {teamName(p.subTeam)}</div>
              <div className="mt-2"><Pill tone={PPL_TONE[p.status]}>{p.status}</Pill></div>
            </div>
            <IconAction onClick={() => setPersonView(null)} title="Close"><X size={18} /></IconAction>
          </div>
          <div className="space-y-4 p-4">
            <div className="flex gap-2">
              <Btn variant="ghost" onClick={() => openAdd("meeting", { type: "1:1", personId: p.id, subTeam: p.subTeam, title: `1:1 with ${p.name}` })}><Plus size={14} />Log 1:1</Btn>
              <Btn onClick={prepOneOnOne} className={busy ? "opacity-70" : ""}>{busy ? <><Loader2 size={14} className="animate-spin" />Drafting</> : <><Sparkles size={14} />Prep next 1:1</>}</Btn>
            </div>
            {prep && <Card className="p-3"><Eyebrow>Prep notes</Eyebrow><pre className="mt-1 whitespace-pre-wrap font-sans text-sm text-slate-700">{prep}</pre></Card>}
            <div>
              <Eyebrow>Open next-steps</Eyebrow>
              <div className="mt-1 space-y-1">
                {theirTasks.length === 0 ? <div className="text-xs text-slate-400">None</div> : theirTasks.map((t) => <div key={t.id} className="text-sm text-slate-700">• {t.title}</div>)}
              </div>
            </div>
            <div>
              <Eyebrow>1:1 history</Eyebrow>
              <div className="mt-1 space-y-2">
                {oneOnOnes.length === 0 ? <div className="text-xs text-slate-400">No 1:1s logged yet</div> : oneOnOnes.map((m) => (
                  <Card key={m.id} className="p-3">
                    <div className="text-xs font-medium text-slate-500">{m.date}</div>
                    <div className="mt-1 text-sm text-slate-700">{m.summary || m.rawNotes || "No summary"}</div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  /* ---------- record modal ---------- */
  const RecordModal = () => {
    if (!modal) return null;
    const cfg = CONFIGS[modal.entity];
    const [rec, setRec] = useState(modal.record);
    const setV = (k, v) => setRec({ ...rec, [k]: v });
    const base = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm";
    const label = { task: "task", workstream: "workstream", decision: "decision", person: "person", meeting: "meeting", team: "sub-team" }[modal.entity];
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setModal(null)}>
        <div className="max-h-full w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <div className="text-sm font-semibold capitalize text-slate-800">{rec.id ? "Edit" : "New"} {label}</div>
            <IconAction onClick={() => setModal(null)} title="Close"><X size={18} /></IconAction>
          </div>
          <div className="space-y-3 p-5">
            {cfg.map((f) => (
              <div key={f.key}>
                {f.type !== "checkbox" && <label className="mb-1 block text-xs font-medium text-slate-500">{f.label}</label>}
                {f.type === "text" && <input className={base} value={rec[f.key] || ""} onChange={(e) => setV(f.key, e.target.value)} />}
                {f.type === "textarea" && <textarea className={`${base} h-20 resize-none`} value={rec[f.key] || ""} onChange={(e) => setV(f.key, e.target.value)} />}
                {f.type === "date" && <input type="date" className={base} value={rec[f.key] || ""} onChange={(e) => setV(f.key, e.target.value)} />}
                {f.type === "select" && <select className={base} value={rec[f.key] || ""} onChange={(e) => setV(f.key, e.target.value)}>{f.options.map((o) => <option key={o} value={o}>{o}</option>)}</select>}
                {f.type === "team" && <select className={base} value={rec[f.key] || ""} onChange={(e) => setV(f.key, e.target.value)}><option value="">Unassigned</option>{data.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>}
                {f.type === "person" && <select className={base} value={rec[f.key] || ""} onChange={(e) => setV(f.key, e.target.value)}><option value="">None</option>{data.people.map((pp) => <option key={pp.id} value={pp.id}>{pp.name}</option>)}</select>}
                {f.type === "checkbox" && (
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={!!rec[f.key]} onChange={(e) => setV(f.key, e.target.checked)} />{f.label}
                  </label>
                )}
                {f.type === "subtasks" && (
                  <div className="space-y-2.5">
                    {(rec[f.key] || []).map((s, i) => (
                      <div key={s.id} className="rounded-lg border border-slate-100 p-2">
                        <div className="flex items-center gap-2">
                          <input type="checkbox" checked={!!s.done} onChange={(e) => { const next = [...rec[f.key]]; next[i] = { ...s, done: e.target.checked }; setV(f.key, next); }} />
                          <input className="flex-1 rounded border border-slate-200 px-2 py-1 text-sm" placeholder="Sub-task" value={s.title} onChange={(e) => { const next = [...rec[f.key]]; next[i] = { ...s, title: e.target.value }; setV(f.key, next); }} />
                          <IconAction onClick={() => setV(f.key, rec[f.key].filter((x) => x.id !== s.id))} title="Remove"><X size={14} /></IconAction>
                        </div>
                        <div className="mt-1.5 flex items-center gap-1.5 pl-6">
                          <Link2 size={13} className="text-slate-300" />
                          <input className="flex-1 rounded border border-slate-200 px-2 py-1 text-xs" placeholder="Link (optional): Figma, doc, article" value={s.url || ""} onChange={(e) => { const next = [...rec[f.key]]; next[i] = { ...s, url: e.target.value }; setV(f.key, next); }} />
                        </div>
                      </div>
                    ))}
                    <button onClick={() => setV(f.key, [...(rec[f.key] || []), { id: uid(), title: "", done: false, url: "" }])} className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-800">
                      <Plus size={13} />Add sub-task
                    </button>
                  </div>
                )}
                {f.type === "links" && (
                  <div className="space-y-1.5">
                    {(rec[f.key] || []).map((l, i) => (
                      <div key={l.id} className="flex items-center gap-2">
                        <input className="w-32 rounded border border-slate-200 px-2 py-1 text-sm" placeholder="Label" value={l.label} onChange={(e) => { const next = [...rec[f.key]]; next[i] = { ...l, label: e.target.value }; setV(f.key, next); }} />
                        <input className="flex-1 rounded border border-slate-200 px-2 py-1 text-sm" placeholder="https://" value={l.url} onChange={(e) => { const next = [...rec[f.key]]; next[i] = { ...l, url: e.target.value }; setV(f.key, next); }} />
                        <IconAction onClick={() => setV(f.key, rec[f.key].filter((x) => x.id !== l.id))} title="Remove"><X size={14} /></IconAction>
                      </div>
                    ))}
                    <button onClick={() => setV(f.key, [...(rec[f.key] || []), { id: uid(), label: "", url: "" }])} className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-800">
                      <Plus size={13} />Add link
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
            <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn onClick={() => { if (!rec.title && !rec.name) return; saveRecord(modal.entity, rec); }}>Save</Btn>
          </div>
        </div>
      </div>
    );
  };

  function GlobalSearch() {
    const [q, setQ] = useState("");
    const query = q.trim().toLowerCase();
    const has = (s) => (s || "").toLowerCase().includes(query);
    const results = query.length < 2 ? null : {
      tasks: data.tasks.filter((t) => has(t.title) || has(t.notes)),
      workstreams: data.workstreams.filter((w) => has(w.title) || has(w.blocker) || has(w.update)),
      decisions: data.decisions.filter((d) => has(d.title) || has(d.affects) || has(d.whatsNeeded)),
      people: data.people.filter((p) => has(p.name) || has(p.role)),
      meetings: data.meetings.filter((m) => has(m.title) || has(m.summary) || has(m.rawNotes)),
    };
    const count = results ? Object.values(results).reduce((n, a) => n + a.length, 0) : 0;
    const go = (fn) => { setQ(""); fn(); };
    const Row = ({ onClick, title, sub }) => (
      <button onClick={onClick} className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-slate-50">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm text-slate-700">{title}</div>
          {sub && <div className="truncate text-xs text-slate-400">{sub}</div>}
        </div>
      </button>
    );
    const Group = ({ label, children }) => (
      <div className="border-b border-slate-100 py-1 last:border-0">
        <div className="px-3 pb-1 pt-1"><Eyebrow>{label}</Eyebrow></div>
        {children}
      </div>
    );
    return (
      <div className="relative w-56 md:w-72">
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white shadow-sm px-3 py-2">
          <Search size={15} className="shrink-0 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search everything" className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400" />
          {q && <button onClick={() => setQ("")}><X size={14} className="text-slate-400" /></button>}
        </div>
        {results && (
          <div className="absolute right-0 z-30 mt-2 max-h-96 w-80 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg md:w-96">
            {count === 0 && <div className="p-4 text-sm text-slate-400">No matches for "{q}"</div>}
            {results.tasks.length > 0 && <Group label="Tasks">{results.tasks.map((t) => <Row key={t.id} onClick={() => go(() => openEdit("task", t))} title={t.title} sub={teamName(t.subTeam)} />)}</Group>}
            {results.workstreams.length > 0 && <Group label="Workstreams">{results.workstreams.map((w) => <Row key={w.id} onClick={() => go(() => openEdit("workstream", w))} title={w.title} sub={teamName(w.subTeam)} />)}</Group>}
            {results.decisions.length > 0 && <Group label="Decisions">{results.decisions.map((d) => <Row key={d.id} onClick={() => go(() => openEdit("decision", d))} title={d.title} sub={d.decider} />)}</Group>}
            {results.people.length > 0 && <Group label="People">{results.people.map((p) => <Row key={p.id} onClick={() => go(() => { setTab("people"); setPersonView(p.id); })} title={p.name} sub={p.role || teamName(p.subTeam)} />)}</Group>}
            {results.meetings.length > 0 && <Group label="Meetings">{results.meetings.map((m) => <Row key={m.id} onClick={() => go(() => openEdit("meeting", m))} title={m.title} sub={m.date} />)}</Group>}
          </div>
        )}
      </div>
    );
  }

  const pageTitle = NAV.find((n) => n.id === tab)?.label || "";

  return (
    <div className="cos-root flex min-h-screen w-full bg-slate-100 text-slate-900">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;450;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap');
        .cos-root{font-family:'Inter',ui-sans-serif,system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased;}
        .cos-display{font-family:'Plus Jakarta Sans','Inter',sans-serif;letter-spacing:-0.01em;}
        .cos-scroll::-webkit-scrollbar{width:9px;height:9px;}
        .cos-scroll::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:9999px;border:2px solid transparent;background-clip:content-box;}
        .cos-scroll::-webkit-scrollbar-thumb:hover{background:#94a3b8;background-clip:content-box;}
      `}</style>
      {/* rail (desktop) */}
      <aside className={`hidden shrink-0 flex-col border-r border-slate-800/60 bg-slate-900 transition-all duration-200 md:flex ${railOpen ? "w-64" : "w-16"}`}>
        <div className={`flex items-center py-5 ${railOpen ? "gap-2.5 px-5" : "justify-center px-0"}`}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 text-white shadow-sm"><ClipboardList size={18} /></div>
          {railOpen && (
            <div className="min-w-0">
              <div className="cos-display truncate text-sm font-bold text-white">Chief of Staff</div>
              <div className="truncate text-xs text-slate-400">Growth + Product</div>
            </div>
          )}
        </div>
        <nav className={`cos-scroll mt-1 flex-1 space-y-4 overflow-y-auto overflow-x-hidden pb-4 ${railOpen ? "px-3" : "px-2"}`}>
          {NAV_GROUPS.map((g, gi) => (
            <div key={gi} className="space-y-0.5">
              {g.heading && railOpen && <div className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">{g.heading}</div>}
              {g.heading && !railOpen && gi > 0 && <div className="mx-auto my-2 h-px w-6 bg-slate-800" />}
              {g.items.map(({ id, label, Icon }) => {
                const active = tab === id;
                return (
                  <button key={id} onClick={() => setTab(id)} title={!railOpen ? label : undefined} className={`relative flex w-full items-center rounded-xl py-2.5 text-sm font-medium transition ${railOpen ? "gap-3 px-3" : "justify-center px-0"} ${active ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"}`}>
                    {active && <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-teal-400" />}
                    <Icon size={18} className={`shrink-0 ${active ? "text-teal-300" : ""}`} />
                    {railOpen && <span className="truncate">{label}</span>}
                  </button>
                );
              })}
            </div>
          ))}
          <div className={`pt-1 ${railOpen ? "px-3" : "px-2"}`}>
            <button onClick={() => setRailOpen((o) => !o)} title={railOpen ? "Collapse" : "Expand"} className={`flex w-full items-center rounded-xl py-2 text-xs font-medium text-slate-400 transition hover:bg-white/5 hover:text-slate-200 ${railOpen ? "gap-3 px-3" : "justify-center px-0"}`}>
              {railOpen ? <><ChevronLeft size={16} className="shrink-0" /><span>Collapse</span></> : <ChevronRight size={18} className="shrink-0" />}
            </button>
          </div>
        </nav>
        <div className="space-y-0.5 border-t border-slate-800/60 p-2">
          <button onClick={resetAll} title={!railOpen ? "Reset data" : undefined} className={`flex w-full items-center rounded-xl py-2 text-xs font-medium text-slate-500 transition hover:bg-white/5 hover:text-slate-300 ${railOpen ? "gap-3 px-3" : "justify-center px-0"}`}>
            <RotateCcw size={16} className="shrink-0" />{railOpen && <span>Reset data</span>}
          </button>
          {railOpen && <div className="px-3 py-1 text-xs text-slate-600">Saved on your device</div>}
        </div>
      </aside>

      {/* main */}
      <main className="cos-scroll flex-1 overflow-x-hidden">
        <header className="relative h-32 w-full bg-slate-900 md:h-48">
          <HeroSlider />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/15 to-slate-900/35" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 px-5 pb-4 md:px-6 md:pb-5">
            <h1 className="cos-display truncate text-xl font-bold text-white drop-shadow-sm md:text-2xl">{pageTitle}</h1>
            <div className="mt-0.5 text-xs font-medium text-slate-200">Week of {weekLabel(data.currentWeekStart)}</div>
          </div>
          <div className="absolute right-3 top-3 z-30 md:right-4 md:top-4">
            <GlobalSearch />
          </div>
        </header>
        {/* mobile nav */}
        <div className="cos-scroll sticky top-0 z-20 flex gap-2 overflow-x-auto border-b border-slate-200 bg-white/95 px-4 py-2 backdrop-blur md:hidden">
          {NAV.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => setTab(id)} className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${tab === id ? "border-teal-300 bg-teal-50 text-teal-700" : "border-slate-200 bg-white text-slate-600"}`}>
              <Icon size={14} />{label}
            </button>
          ))}
        </div>
        <div className="mx-auto max-w-6xl p-4 md:p-6">
          {tab === "dashboard" && renderDashboard()}
          {tab === "product" && renderOrg("Product")}
          {tab === "growth" && renderOrg("Growth")}
          {tab === "leadership" && renderLeadership()}
          {tab === "tasks" && renderTasks()}
          {tab === "decisions" && renderDecisions()}
          {tab === "people" && renderPeople()}
          {tab === "prereads" && renderPrereads()}
          {tab === "process" && renderProcess()}
          {tab === "monday" && renderMonday()}
          {tab === "calendar" && renderCalendar()}
        </div>
      </main>

      {modal && <RecordModal />}
      {personView && <PersonDrawer />}

      {confirmDlg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setConfirmDlg(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-sm text-slate-700">{confirmDlg.message}</div>
            <div className="mt-4 flex justify-end gap-2">
              <Btn variant="ghost" onClick={() => setConfirmDlg(null)}>Cancel</Btn>
              <Btn onClick={() => { const fn = confirmDlg.onConfirm; setConfirmDlg(null); fn && fn(); }}>Confirm</Btn>
            </div>
          </div>
        </div>
      )}

      {copyModal != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setCopyModal(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 text-sm font-semibold text-slate-800">Copy this</div>
            <div className="mb-2 text-xs text-slate-400">Select all and press Ctrl or Cmd + C.</div>
            <textarea readOnly value={copyModal} onFocus={(e) => e.target.select()} className="h-64 w-full rounded-lg border border-slate-200 p-3 text-xs" />
            <div className="mt-3 flex justify-end"><Btn onClick={() => setCopyModal(null)}>Done</Btn></div>
          </div>
        </div>
      )}
    </div>
  );
}