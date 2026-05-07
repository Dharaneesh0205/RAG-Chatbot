const API = "http://localhost:8000";

// ── DOM ──
const chatArea    = document.getElementById("chatArea");
const messagesEl  = document.getElementById("messages");
const welcomeEl   = document.getElementById("welcome");
const welcomeTitle= document.getElementById("welcomeTitle");
const welcomeDesc = document.getElementById("welcomeDesc");
const chipsEl     = document.getElementById("chips");
const input       = document.getElementById("questionInput");
const sendBtn     = document.getElementById("sendBtn");
const clearBtn    = document.getElementById("clearBtn");
const themeToggle = document.getElementById("themeToggle");
const sidebarToggle = document.getElementById("sidebarToggle");
const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const sidebar     = document.getElementById("sidebar");
const newChatBtn  = document.getElementById("newChatBtn");
const chatListEl  = document.getElementById("chatList");
const docListEl   = document.getElementById("docList");
const sidebarMeta = document.getElementById("sidebarMeta");
const chatTitle   = document.getElementById("chatTitle");
const chatSubtitle= document.getElementById("chatSubtitle");
const attachBtn   = document.getElementById("attachBtn");
const fileInput   = document.getElementById("fileInput");
const inlineQueue = document.getElementById("inlineQueue");

// ── State ──
let chats = JSON.parse(localStorage.getItem("chats") || "[]");
let activeChatId = null;
let pendingFiles = [];
let newlyUploaded = new Set();

const DOC_ICONS = {
  "company-overview":"🏢","hr-policy":"👥","leave-policy":"🌴",
  "resignation-policy":"📋","code-of-conduct":"⚖️","wfh-policy":"🏠",
  "performance-review":"📈","benefits-compensation":"💰",
  "onboarding-guide":"🚀","it-security-policy":"🔒"
};

const DOC_SUGGESTIONS = {
  "leave-policy":[
    {icon:"🌴",label:"Annual leave",q:"What is the annual leave policy at SWS AI?"},
    {icon:"🤒",label:"Sick leave days",q:"How many days of sick leave do employees get?"},
    {icon:"🏖️",label:"Casual leave",q:"How many casual leaves are employees entitled to?"},
  ],
  "hr-policy":[
    {icon:"👥",label:"HR guidelines",q:"What are the HR policies at SWS AI?"},
    {icon:"📝",label:"Employee conduct",q:"What are the employee conduct guidelines?"},
  ],
  "resignation-policy":[
    {icon:"📋",label:"Notice period",q:"What is the notice period for resignation?"},
    {icon:"🚪",label:"Exit process",q:"What is the exit process at SWS AI?"},
  ],
  "it-security-policy":[
    {icon:"🔒",label:"Password policy",q:"What is the password policy for company systems?"},
    {icon:"💻",label:"Device usage",q:"What are the rules for using company devices?"},
  ],
  "wfh-policy":[
    {icon:"🏠",label:"WFH guidelines",q:"What are the WFH guidelines?"},
    {icon:"📅",label:"WFH days",q:"How many days can employees work from home?"},
  ],
  "performance-review":[
    {icon:"📈",label:"Performance reviews",q:"How are performance reviews conducted?"},
    {icon:"🎯",label:"Review frequency",q:"How often are performance reviews held?"},
  ],
  "benefits-compensation":[
    {icon:"💊",label:"Health insurance",q:"Does SWS AI offer health insurance?"},
    {icon:"💰",label:"Salary structure",q:"What is the compensation structure at SWS AI?"},
  ],
  "company-overview":[
    {icon:"🏢",label:"Company mission",q:"What is the mission of SWS AI?"},
    {icon:"💬",label:"Communication tools",q:"What tools does SWS AI use for communication?"},
  ],
  "code-of-conduct":[
    {icon:"⚖️",label:"Code of conduct",q:"What is the code of conduct at SWS AI?"},
    {icon:"🤝",label:"Workplace ethics",q:"What are the workplace ethics guidelines?"},
  ],
  "onboarding-guide":[
    {icon:"🚀",label:"Onboarding steps",q:"What are the onboarding steps for new employees?"},
    {icon:"📚",label:"First week guide",q:"What should a new employee do in their first week?"},
  ],
};

const DEFAULT_SUGGESTIONS = [
  {icon:"🌴",label:"Annual leave",q:"What is the annual leave policy at SWS AI?"},
  {icon:"🤒",label:"Sick leave days",q:"How many days of sick leave do employees get?"},
  {icon:"📋",label:"Notice period",q:"What is the notice period for resignation?"},
  {icon:"🔒",label:"Password policy",q:"What is the password policy for company systems?"},
  {icon:"🏠",label:"WFH guidelines",q:"What are the WFH guidelines?"},
  {icon:"📈",label:"Performance reviews",q:"How are performance reviews conducted?"},
  {icon:"💊",label:"Health insurance",q:"Does SWS AI offer health insurance?"},
  {icon:"💬",label:"Communication tools",q:"What tools does SWS AI use for communication?"},
];

// ── Theme ──
const savedTheme = localStorage.getItem("theme") || "light";
document.documentElement.setAttribute("data-theme", savedTheme);
themeToggle.addEventListener("click", () => {
  const next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
});

// ── Sidebar ──
sidebarToggle.addEventListener("click", () => sidebar.classList.toggle("collapsed"));
mobileMenuBtn.addEventListener("click", () => sidebar.classList.toggle("mobile-open"));
document.addEventListener("click", (e) => {
  if (window.innerWidth <= 768 && !sidebar.contains(e.target) && !mobileMenuBtn.contains(e.target))
    sidebar.classList.remove("mobile-open");
});

// ── Input ──
input.addEventListener("input", () => {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 120) + "px";
  sendBtn.disabled = !input.value.trim();
});
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (!sendBtn.disabled) sendMessage(); }
});

// ── Chat Sessions ──
function createChat(title = "New Chat", docKey = null) {
  const id = Date.now().toString();
  const chat = { id, title, docKey, messages: [], createdAt: new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}) };
  chats.unshift(chat);
  saveChats();
  return chat;
}

function saveChats() {
  localStorage.setItem("chats", JSON.stringify(chats));
}

function switchChat(id) {
  activeChatId = id;
  const chat = chats.find(c => c.id === id);
  if (!chat) return;

  // Update active in list
  document.querySelectorAll(".chat-item").forEach(el => el.classList.toggle("active", el.dataset.id === id));

  // Render messages
  messagesEl.innerHTML = "";
  if (chat.messages.length === 0) {
    welcomeEl.style.display = "";
    renderSuggestions(chat.docKey);
  } else {
    welcomeEl.style.display = "none";
    chat.messages.forEach(m => renderMessage(m.role, m.text, m.sources || [], false));
  }

  // Update topbar
  const suggestions = getSuggestions(chat.docKey);
  chatTitle.textContent = chat.title;
  chatSubtitle.textContent = chat.docKey
    ? `Asking about ${formatDocName(chat.docKey)}`
    : "Ask anything about SWS AI company policies";

  scrollToBottom();
}

function getSuggestions(docKey) {
  if (docKey && DOC_SUGGESTIONS[docKey]) return DOC_SUGGESTIONS[docKey];
  return DEFAULT_SUGGESTIONS;
}

function renderSuggestions(docKey) {
  const suggestions = getSuggestions(docKey);
  const title = docKey
    ? `Ask me about ${formatDocName(docKey)}`
    : "Welcome to the RAG Chatbot";
  const desc = docKey
    ? `This chat is scoped to the ${formatDocName(docKey)} document. Ask specific questions and get answers retrieved directly from it.`
    : "This is a Retrieval-Augmented Generation (RAG) chatbot. Upload company policy PDFs and ask natural language questions — answers are grounded in your documents, not hallucinated.";

  welcomeTitle.textContent = title;
  welcomeDesc.textContent = desc;
  chipsEl.innerHTML = "";
  suggestions.forEach(s => {
    const btn = document.createElement("button");
    btn.className = "chip";
    btn.textContent = `${s.icon} ${s.label}`;
    btn.addEventListener("click", () => {
      input.value = s.q;
      input.dispatchEvent(new Event("input"));
      sendMessage();
    });
    chipsEl.appendChild(btn);
  });
}

function renderChatList() {
  chatListEl.innerHTML = "";
  if (chats.length === 0) {
    chatListEl.innerHTML = `<li style="font-size:11px;color:var(--text-3);padding:6px 4px">No chats yet</li>`;
    return;
  }
  chats.forEach(chat => {
    const li = document.createElement("li");
    li.className = `chat-item${chat.id === activeChatId ? " active" : ""}`;
    li.dataset.id = chat.id;
    const icon = chat.docKey ? (DOC_ICONS[chat.docKey] || "💬") : "💬";
    li.innerHTML = `
      <span class="chat-item-icon">${icon}</span>
      <div class="chat-item-info">
        <div class="chat-item-name">${chat.title}</div>
        <div class="chat-item-time">${chat.createdAt}</div>
      </div>
      <button class="chat-item-del" title="Delete">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>`;
    li.addEventListener("click", (e) => {
      if (!e.target.closest(".chat-item-del")) switchChat(chat.id);
    });
    li.querySelector(".chat-item-del").addEventListener("click", (e) => {
      e.stopPropagation();
      chats = chats.filter(c => c.id !== chat.id);
      saveChats();
      if (activeChatId === chat.id) {
        if (chats.length > 0) switchChat(chats[0].id);
        else { activeChatId = null; messagesEl.innerHTML = ""; welcomeEl.style.display = ""; renderSuggestions(null); }
      }
      renderChatList();
    });
    chatListEl.appendChild(li);
  });
}

// ── New Chat ──
newChatBtn.addEventListener("click", () => {
  const chat = createChat("New Chat", null);
  renderChatList();
  switchChat(chat.id);
});

// ── Clear current chat ──
clearBtn.addEventListener("click", () => {
  const chat = chats.find(c => c.id === activeChatId);
  if (chat) { chat.messages = []; saveChats(); }
  messagesEl.innerHTML = "";
  welcomeEl.style.display = "";
  renderSuggestions(chat?.docKey || null);
});

// ── Send ──
sendBtn.addEventListener("click", sendMessage);

async function sendMessage() {
  const question = input.value.trim();
  if (!question) return;

  // If no active chat, create one
  if (!activeChatId) {
    const chat = createChat(question.slice(0, 30), null);
    renderChatList();
    switchChat(chat.id);
  }

  const chat = chats.find(c => c.id === activeChatId);

  // Auto-title from first message
  if (chat && chat.messages.length === 0) {
    chat.title = question.slice(0, 32) + (question.length > 32 ? "…" : "");
    saveChats();
    renderChatList();
  }

  welcomeEl.style.display = "none";
  renderMessage("user", question, [], true);
  input.value = "";
  input.style.height = "auto";
  sendBtn.disabled = true;

  const typingEl = appendTyping();

  try {
    const res = await fetch(`${API}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    if (!res.ok) throw new Error(`Server error ${res.status}`);
    const data = await res.json();
    typingEl.remove();
    renderMessage("ai", data.answer, data.sources || [], true);
  } catch (err) {
    typingEl.remove();
    const msg = err.message.includes("fetch")
      ? "Cannot connect to backend. Run: cd backend && python -m uvicorn app.main:app --reload --port 8000"
      : err.message;
    renderMessage("ai", `⚠️ ${msg}`, [], true);
  }
  scrollToBottom();
}

// ── Render Message ──
function renderMessage(role, text, sources, save = true) {
  if (save && activeChatId) {
    const chat = chats.find(c => c.id === activeChatId);
    if (chat) { chat.messages.push({ role, text, sources }); saveChats(); }
  }

  const msg = document.createElement("div");
  msg.className = `message ${role}`;

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.innerHTML = role === "user" ? "You"
    : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  const wrap = document.createElement("div");
  wrap.className = "bubble-wrap";

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  if (role === "user") bubble.textContent = text;
  else bubble.innerHTML = formatText(text);
  wrap.appendChild(bubble);

  if (role === "ai" && sources.length > 0) {
    const srcEl = document.createElement("div");
    srcEl.className = "sources";
    sources.forEach(src => {
      const tag = document.createElement("div");
      tag.className = "source-tag";
      tag.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 2v6h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>${formatSourceName(src)}`;
      srcEl.appendChild(tag);
    });
    wrap.appendChild(srcEl);
  }

  const meta = document.createElement("div");
  meta.className = "msg-meta";
  const time = document.createElement("span");
  time.className = "msg-time";
  time.textContent = new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
  meta.appendChild(time);

  if (role === "ai") {
    const copyBtn = document.createElement("button");
    copyBtn.className = "copy-btn";
    copyBtn.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" stroke-width="2"/></svg> Copy`;
    copyBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(text).then(() => {
        copyBtn.textContent = "✓ Copied"; copyBtn.classList.add("copied");
        setTimeout(() => { copyBtn.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" stroke-width="2"/></svg> Copy`; copyBtn.classList.remove("copied"); }, 2000);
      });
    });
    meta.appendChild(copyBtn);
  }

  wrap.appendChild(meta);
  msg.appendChild(avatar);
  msg.appendChild(wrap);
  messagesEl.appendChild(msg);

  if (role === "ai") typewriter(bubble, text);
  scrollToBottom();
}

// ── Typing ──
function appendTyping() {
  const msg = document.createElement("div");
  msg.className = "message ai";
  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const wrap = document.createElement("div");
  wrap.className = "bubble-wrap";
  const ind = document.createElement("div");
  ind.className = "typing-indicator";
  ind.innerHTML = `<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>`;
  wrap.appendChild(ind);
  msg.appendChild(avatar);
  msg.appendChild(wrap);
  messagesEl.appendChild(msg);
  scrollToBottom();
  return msg;
}

// ── Typewriter ──
function typewriter(el, fullText) {
  const html = formatText(fullText);
  const temp = document.createElement("div");
  temp.innerHTML = html;
  const plain = temp.textContent;
  let i = 0; el.innerHTML = "";
  const iv = setInterval(() => {
    i += 4; el.innerHTML = formatText(plain.slice(0, i)); scrollToBottom();
    if (i >= plain.length) { el.innerHTML = html; clearInterval(iv); }
  }, 10);
}

// ── Inline File Upload ──
attachBtn.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => {
  const pdfs = [...fileInput.files].filter(f => f.name.endsWith(".pdf"));
  fileInput.value = ""; // reset immediately to prevent re-trigger
  if (!pdfs.length) { showToast("Only PDF files supported", "error"); return; }
  // Only add truly new files not already pending
  const newFiles = pdfs.filter(f => !pendingFiles.find(p => p.name === f.name));
  if (!newFiles.length) { showToast("File already queued", "error"); return; }
  pendingFiles = [...pendingFiles, ...newFiles];
  renderInlineQueue();
  uploadFiles();
});

function renderInlineQueue() {
  inlineQueue.innerHTML = "";
  pendingFiles.forEach((file, idx) => {
    const el = document.createElement("div");
    el.className = "inline-file";
    el.id = `ifile-${idx}`;
    el.innerHTML = `📄 <span>${file.name}</span>
      <button class="inline-file-remove" data-idx="${idx}">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>`;
    inlineQueue.appendChild(el);
  });
  inlineQueue.querySelectorAll(".inline-file-remove").forEach(btn => {
    btn.addEventListener("click", () => {
      pendingFiles.splice(parseInt(btn.dataset.idx), 1);
      renderInlineQueue();
      attachBtn.classList.toggle("has-files", pendingFiles.length > 0);
    });
  });
  attachBtn.classList.toggle("has-files", pendingFiles.length > 0);
}

let isUploading = false;

async function uploadFiles() {
  if (isUploading || pendingFiles.length === 0) return;
  isUploading = true;

  // Snapshot files to upload right now
  const filesToUpload = [...pendingFiles];
  const formData = new FormData();
  filesToUpload.forEach(f => formData.append("files", f));

  // Mark uploading
  filesToUpload.forEach((_, idx) => {
    const el = document.getElementById(`ifile-${idx}`);
    if (el) el.classList.add("uploading");
  });

  try {
    const res = await fetch(`${API}/api/upload`, { method: "POST", body: formData });
    if (!res.ok) throw new Error("Upload failed");
    const data = await res.json();

    data.uploaded.forEach((r, idx) => {
      const el = document.getElementById(`ifile-${idx}`);
      if (el) {
        el.classList.remove("uploading");
        el.classList.add(r.status === "success" ? "done" : "failed");
        el.querySelector("span").textContent = r.status === "success"
          ? `✓ ${r.filename} (${r.chunks} chunks)`
          : `✗ ${r.filename}`;
        const rmBtn = el.querySelector(".inline-file-remove");
        if (rmBtn) rmBtn.remove();
      }
      if (r.status === "success") {
        newlyUploaded.add(r.filename);
        // Update active chat suggestions based on uploaded doc
        const key = r.filename.replace("SWS-AI-","").replace(".pdf","");
        if (DOC_SUGGESTIONS[key] && activeChatId) {
          const chat = chats.find(c => c.id === activeChatId);
          if (chat && chat.messages.length === 0) {
            chat.docKey = key;
            chat.title = `${formatDocName(key)} Chat`;
            saveChats();
            renderChatList();
            renderSuggestions(key);
            chatTitle.textContent = chat.title;
            chatSubtitle.textContent = `Asking about ${formatDocName(key)}`;
          }
        }
      }
    });

    const ok = data.uploaded.filter(r => r.status === "success").length;
    showToast(`✓ ${ok} file(s) ingested`, "success");

    setTimeout(() => {
      pendingFiles = [];
      inlineQueue.innerHTML = "";
      attachBtn.classList.remove("has-files");
      loadDocuments();
      isUploading = false;
    }, 2500);

  } catch {
    showToast("Upload failed. Is the backend running?", "error");
    filesToUpload.forEach((_, idx) => {
      const el = document.getElementById(`ifile-${idx}`);
      if (el) { el.classList.remove("uploading"); el.classList.add("failed"); }
    });
    isUploading = false;
  }
}

// ── Load Documents ──
async function loadDocuments() {
  try {
    const res = await fetch(`${API}/api/documents`);
    const data = await res.json();
    renderDocList(data.documents);
    sidebarMeta.textContent = `${data.documents.length} docs · ChromaDB · Gemini`;
  } catch {
    sidebarMeta.textContent = "Backend offline";
    docListEl.innerHTML = `<li style="font-size:11px;color:var(--text-3);padding:6px">Start backend first</li>`;
  }
}

function renderDocList(docs) {
  docListEl.innerHTML = "";
  if (!docs.length) {
    docListEl.innerHTML = `<li style="font-size:11px;color:var(--text-3);padding:6px">No documents yet</li>`;
    return;
  }
  const sorted = [...docs].sort((a, b) => newlyUploaded.has(b) - newlyUploaded.has(a));
  sorted.forEach(doc => {
    const key = doc.replace("SWS-AI-", "").replace(".pdf", "");
    const icon = DOC_ICONS[key] || "📄";
    const isNew = newlyUploaded.has(doc);
    const li = document.createElement("li");
    li.className = `doc-item${isNew ? " new-doc" : ""}`;
    li.innerHTML = `<span class="doc-icon">${icon}</span><span class="doc-name">${formatDocName(key)}</span>${isNew ? `<span class="doc-badge">NEW</span>` : ""}`;
    li.addEventListener("click", () => {
      // Create a new chat scoped to this document
      document.querySelectorAll(".doc-item").forEach(d => d.classList.remove("active"));
      li.classList.add("active");
      const chat = createChat(`${formatDocName(key)} Chat`, key);
      renderChatList();
      switchChat(chat.id);
    });
    docListEl.appendChild(li);
  });
}

// ── Helpers ──
function formatText(text) {
  if (!text) return "";
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/^- (.+)/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>")
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/\n/g, "<br>")
    .replace(/^(?!<)(.+)/, "<p>$1</p>");
}

function formatSourceName(filename) {
  return filename.replace("SWS-AI-","").replace(".pdf","").replace(/-/g," ").replace(/\b\w/g,c=>c.toUpperCase());
}

function formatDocName(key) {
  return key.replace(/-/g," ").replace(/\b\w/g,c=>c.toUpperCase());
}

function showToast(msg, type="") {
  const t = document.createElement("div");
  t.className = `toast ${type}`; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

function scrollToBottom() { chatArea.scrollTop = chatArea.scrollHeight; }

// ── Init ──
loadDocuments();
renderSuggestions(null);

// Restore chats from localStorage
if (chats.length > 0) {
  renderChatList();
  switchChat(chats[0].id);
} else {
  renderChatList();
}
