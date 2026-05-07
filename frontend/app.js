const API_URL = "http://localhost:8000/api/chat";

const chatArea = document.getElementById("chatArea");
const messages = document.getElementById("messages");
const welcome = document.getElementById("welcome");
const input = document.getElementById("questionInput");
const sendBtn = document.getElementById("sendBtn");
const clearBtn = document.getElementById("clearBtn");
const themeToggle = document.getElementById("themeToggle");
const sidebarToggle = document.getElementById("sidebarToggle");
const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const sidebar = document.getElementById("sidebar");

// ── Theme ──
const savedTheme = localStorage.getItem("theme") || "light";
document.documentElement.setAttribute("data-theme", savedTheme);

themeToggle.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "light" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
});

// ── Sidebar ──
sidebarToggle.addEventListener("click", () => sidebar.classList.toggle("collapsed"));
mobileMenuBtn.addEventListener("click", () => sidebar.classList.toggle("mobile-open"));
document.addEventListener("click", (e) => {
  if (window.innerWidth <= 768 && !sidebar.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
    sidebar.classList.remove("mobile-open");
  }
});

// ── Input auto-resize ──
input.addEventListener("input", () => {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 120) + "px";
  sendBtn.disabled = !input.value.trim();
});

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    if (!sendBtn.disabled) sendMessage();
  }
});

// ── Chips ──
document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    input.value = chip.dataset.q;
    input.dispatchEvent(new Event("input"));
    sendMessage();
  });
});

// ── Doc list highlight ──
document.querySelectorAll(".doc-item").forEach((item) => {
  item.addEventListener("click", () => {
    document.querySelectorAll(".doc-item").forEach((d) => d.classList.remove("active"));
    item.classList.add("active");
  });
});

// ── Clear ──
clearBtn.addEventListener("click", () => {
  messages.innerHTML = "";
  welcome.style.display = "flex";
  welcome.style.flexDirection = "column";
  welcome.style.alignItems = "center";
});

// ── Send ──
sendBtn.addEventListener("click", sendMessage);

async function sendMessage() {
  const question = input.value.trim();
  if (!question) return;

  // Hide welcome
  welcome.style.display = "none";

  // Append user message
  appendMessage("user", question);

  // Reset input
  input.value = "";
  input.style.height = "auto";
  sendBtn.disabled = true;

  // Show typing
  const typingEl = appendTyping();

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });

    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    const data = await res.json();

    typingEl.remove();
    appendMessage("ai", data.answer, data.sources);
  } catch (err) {
    typingEl.remove();
    appendMessage("ai", "⚠️ Could not reach the server. Make sure the backend is running on port 8000.", []);
  }

  scrollToBottom();
}

// ── Append user / ai message ──
function appendMessage(role, text, sources = []) {
  const msg = document.createElement("div");
  msg.className = `message ${role}`;

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.innerHTML = role === "user"
    ? "You"
    : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  const wrap = document.createElement("div");
  wrap.className = "bubble-wrap";

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  if (role === "ai") {
    bubble.innerHTML = formatText(text);
  } else {
    bubble.textContent = text;
  }

  wrap.appendChild(bubble);

  // Sources
  if (role === "ai" && sources.length > 0) {
    const sourcesEl = document.createElement("div");
    sourcesEl.className = "sources";
    sources.forEach((src) => {
      const tag = document.createElement("div");
      tag.className = "source-tag";
      tag.innerHTML = `
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M14 2v6h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        ${formatSourceName(src)}`;
      sourcesEl.appendChild(tag);
    });
    wrap.appendChild(sourcesEl);
  }

  // Meta row (time + copy)
  const meta = document.createElement("div");
  meta.className = "msg-meta";

  const time = document.createElement("span");
  time.className = "msg-time";
  time.textContent = now();
  meta.appendChild(time);

  if (role === "ai") {
    const copyBtn = document.createElement("button");
    copyBtn.className = "copy-btn";
    copyBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" stroke-width="2"/></svg> Copy`;
    copyBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(text).then(() => {
        copyBtn.textContent = "✓ Copied";
        copyBtn.classList.add("copied");
        setTimeout(() => {
          copyBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" stroke-width="2"/></svg> Copy`;
          copyBtn.classList.remove("copied");
        }, 2000);
      });
    });
    meta.appendChild(copyBtn);
  }

  wrap.appendChild(meta);

  msg.appendChild(avatar);
  msg.appendChild(wrap);
  messages.appendChild(msg);

  // Typewriter for AI
  if (role === "ai") {
    typewriter(bubble, text);
  }

  scrollToBottom();
}

// ── Typing indicator ──
function appendTyping() {
  const msg = document.createElement("div");
  msg.className = "message ai";

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  const wrap = document.createElement("div");
  wrap.className = "bubble-wrap";

  const indicator = document.createElement("div");
  indicator.className = "typing-indicator";
  indicator.innerHTML = `<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>`;

  wrap.appendChild(indicator);
  msg.appendChild(avatar);
  msg.appendChild(wrap);
  messages.appendChild(msg);
  scrollToBottom();
  return msg;
}

// ── Typewriter effect ──
function typewriter(el, fullText) {
  const html = formatText(fullText);
  el.innerHTML = "";
  const temp = document.createElement("div");
  temp.innerHTML = html;
  const plainText = temp.textContent;

  let i = 0;
  el.innerHTML = "";

  const interval = setInterval(() => {
    i += 3;
    const partial = plainText.slice(0, i);
    el.innerHTML = formatText(partial);
    scrollToBottom();
    if (i >= plainText.length) {
      el.innerHTML = html;
      clearInterval(interval);
    }
  }, 12);
}

// ── Format markdown-like text ──
function formatText(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/^- (.+)/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>")
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/\n/g, "<br>")
    .replace(/^(?!<)(.+)/, "<p>$1</p>");
}

// ── Format source filename ──
function formatSourceName(filename) {
  return filename
    .replace("SWS-AI-", "")
    .replace(".pdf", "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Helpers ──
function now() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function scrollToBottom() {
  chatArea.scrollTop = chatArea.scrollHeight;
}
