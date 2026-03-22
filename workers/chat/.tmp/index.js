var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// node_modules/unenv/dist/runtime/_internal/utils.mjs
// @__NO_SIDE_EFFECTS__
function createNotImplementedError(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
__name(createNotImplementedError, "createNotImplementedError");

// node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs
var _timeOrigin = globalThis.performance?.timeOrigin ?? Date.now();
var _performanceNow = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin;
var nodeTiming = {
  name: "node",
  entryType: "node",
  startTime: 0,
  duration: 0,
  nodeStart: 0,
  v8Start: 0,
  bootstrapComplete: 0,
  environment: 0,
  loopStart: 0,
  loopExit: 0,
  idleTime: 0,
  uvMetricsInfo: {
    loopCount: 0,
    events: 0,
    eventsWaiting: 0
  },
  detail: void 0,
  toJSON() {
    return this;
  }
};
var PerformanceEntry = class {
  static {
    __name(this, "PerformanceEntry");
  }
  __unenv__ = true;
  detail;
  entryType = "event";
  name;
  startTime;
  constructor(name, options) {
    this.name = name;
    this.startTime = options?.startTime || _performanceNow();
    this.detail = options?.detail;
  }
  get duration() {
    return _performanceNow() - this.startTime;
  }
  toJSON() {
    return {
      name: this.name,
      entryType: this.entryType,
      startTime: this.startTime,
      duration: this.duration,
      detail: this.detail
    };
  }
};
var PerformanceMark = class PerformanceMark2 extends PerformanceEntry {
  static {
    __name(this, "PerformanceMark");
  }
  entryType = "mark";
  constructor() {
    super(...arguments);
  }
  get duration() {
    return 0;
  }
};
var PerformanceMeasure = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceMeasure");
  }
  entryType = "measure";
};
var PerformanceResourceTiming = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceResourceTiming");
  }
  entryType = "resource";
  serverTiming = [];
  connectEnd = 0;
  connectStart = 0;
  decodedBodySize = 0;
  domainLookupEnd = 0;
  domainLookupStart = 0;
  encodedBodySize = 0;
  fetchStart = 0;
  initiatorType = "";
  name = "";
  nextHopProtocol = "";
  redirectEnd = 0;
  redirectStart = 0;
  requestStart = 0;
  responseEnd = 0;
  responseStart = 0;
  secureConnectionStart = 0;
  startTime = 0;
  transferSize = 0;
  workerStart = 0;
  responseStatus = 0;
};
var PerformanceObserverEntryList = class {
  static {
    __name(this, "PerformanceObserverEntryList");
  }
  __unenv__ = true;
  getEntries() {
    return [];
  }
  getEntriesByName(_name, _type) {
    return [];
  }
  getEntriesByType(type) {
    return [];
  }
};
var Performance = class {
  static {
    __name(this, "Performance");
  }
  __unenv__ = true;
  timeOrigin = _timeOrigin;
  eventCounts = /* @__PURE__ */ new Map();
  _entries = [];
  _resourceTimingBufferSize = 0;
  navigation = void 0;
  timing = void 0;
  timerify(_fn, _options) {
    throw createNotImplementedError("Performance.timerify");
  }
  get nodeTiming() {
    return nodeTiming;
  }
  eventLoopUtilization() {
    return {};
  }
  markResourceTiming() {
    return new PerformanceResourceTiming("");
  }
  onresourcetimingbufferfull = null;
  now() {
    if (this.timeOrigin === _timeOrigin) {
      return _performanceNow();
    }
    return Date.now() - this.timeOrigin;
  }
  clearMarks(markName) {
    this._entries = markName ? this._entries.filter((e) => e.name !== markName) : this._entries.filter((e) => e.entryType !== "mark");
  }
  clearMeasures(measureName) {
    this._entries = measureName ? this._entries.filter((e) => e.name !== measureName) : this._entries.filter((e) => e.entryType !== "measure");
  }
  clearResourceTimings() {
    this._entries = this._entries.filter((e) => e.entryType !== "resource" || e.entryType !== "navigation");
  }
  getEntries() {
    return this._entries;
  }
  getEntriesByName(name, type) {
    return this._entries.filter((e) => e.name === name && (!type || e.entryType === type));
  }
  getEntriesByType(type) {
    return this._entries.filter((e) => e.entryType === type);
  }
  mark(name, options) {
    const entry = new PerformanceMark(name, options);
    this._entries.push(entry);
    return entry;
  }
  measure(measureName, startOrMeasureOptions, endMark) {
    let start;
    let end;
    if (typeof startOrMeasureOptions === "string") {
      start = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
      end = this.getEntriesByName(endMark, "mark")[0]?.startTime;
    } else {
      start = Number.parseFloat(startOrMeasureOptions?.start) || this.now();
      end = Number.parseFloat(startOrMeasureOptions?.end) || this.now();
    }
    const entry = new PerformanceMeasure(measureName, {
      startTime: start,
      detail: {
        start,
        end
      }
    });
    this._entries.push(entry);
    return entry;
  }
  setResourceTimingBufferSize(maxSize) {
    this._resourceTimingBufferSize = maxSize;
  }
  addEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.addEventListener");
  }
  removeEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.removeEventListener");
  }
  dispatchEvent(event) {
    throw createNotImplementedError("Performance.dispatchEvent");
  }
  toJSON() {
    return this;
  }
};
var PerformanceObserver = class {
  static {
    __name(this, "PerformanceObserver");
  }
  __unenv__ = true;
  static supportedEntryTypes = [];
  _callback = null;
  constructor(callback) {
    this._callback = callback;
  }
  takeRecords() {
    return [];
  }
  disconnect() {
    throw createNotImplementedError("PerformanceObserver.disconnect");
  }
  observe(options) {
    throw createNotImplementedError("PerformanceObserver.observe");
  }
  bind(fn) {
    return fn;
  }
  runInAsyncScope(fn, thisArg, ...args) {
    return fn.call(thisArg, ...args);
  }
  asyncId() {
    return 0;
  }
  triggerAsyncId() {
    return 0;
  }
  emitDestroy() {
    return this;
  }
};
var performance = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance();

// node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs
globalThis.performance = performance;
globalThis.Performance = Performance;
globalThis.PerformanceEntry = PerformanceEntry;
globalThis.PerformanceMark = PerformanceMark;
globalThis.PerformanceMeasure = PerformanceMeasure;
globalThis.PerformanceObserver = PerformanceObserver;
globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList;
globalThis.PerformanceResourceTiming = PerformanceResourceTiming;

// src/index.js
var ALLOWED_ORIGINS = [
  "https://amfibido.com",
  "https://www.amfibido.com",
  "http://localhost:8080",
  "http://localhost:3000"
];
var RULES_URL = "https://amfibido.com/context/rules.md";
var CARDS_URL = "https://amfibido.com/context/cards.md";
var REMINDERS_URL = "https://amfibido.com/context/reminders.md";
var cachedRules = null;
var cachedCards = null;
var cachedReminders = null;
var cacheTime = 0;
var CACHE_DURATION = 60 * 60 * 1e3;
async function fetchWithCache(url, cached) {
  try {
    const response = await fetch(url);
    if (response.ok) {
      return await response.text();
    }
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error);
  }
  return cached || "";
}
__name(fetchWithCache, "fetchWithCache");
async function getContext() {
  const now = Date.now();
  if (cachedRules && cachedCards && cachedReminders && now - cacheTime < CACHE_DURATION) {
    return { rules: cachedRules, cards: cachedCards, reminders: cachedReminders };
  }
  const [rules, cards, reminders] = await Promise.all([
    fetchWithCache(RULES_URL, cachedRules),
    fetchWithCache(CARDS_URL, cachedCards),
    fetchWithCache(REMINDERS_URL, cachedReminders)
  ]);
  cachedRules = rules;
  cachedCards = cards;
  cachedReminders = reminders;
  cacheTime = now;
  return { rules, cards, reminders };
}
__name(getContext, "getContext");
function buildSystemPrompt(rules, cards, reminders) {
  return `You are a friendly and helpful assistant for the Amfibido board game.
Your role is to answer questions about the game rules and cards clearly and concisely.
Do not answer questions that are not related to the game.
Also do not give strategy advice, focus on correct rulings only.
Your name is Mr. Minami, a frog karate Sensei.

## Important Reminders (prioritize these over other context)
${reminders}

## Game Rules
${rules}

## Card Reference
${cards}

Guidelines:
- Answer based on the rules, cards, and reminders above
- Prioritize information from the Reminders section when there might be confusion
- If something isn't covered, say you don't have that information
- Keep responses brief but complete, maximum 4 sentences
- Be friendly and helpful`;
}
__name(buildSystemPrompt, "buildSystemPrompt");
function getCorsHeaders(request) {
  const origin = request.headers.get("Origin");
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}
__name(getCorsHeaders, "getCorsHeaders");
async function logConversation(db, conversationId, origin, userMessage, assistantReply) {
  try {
    await db.batch([
      db.prepare(`
				INSERT INTO conversations (id, origin)
				VALUES (?, ?)
				ON CONFLICT(id) DO UPDATE SET updated_at = datetime('now')
			`).bind(conversationId, origin),
      db.prepare(`
				INSERT INTO messages (conversation_id, role, content) VALUES (?, 'user', ?)
			`).bind(conversationId, userMessage),
      db.prepare(`
				INSERT INTO messages (conversation_id, role, content) VALUES (?, 'assistant', ?)
			`).bind(conversationId, assistantReply)
    ]);
  } catch (error) {
    console.error("Failed to log conversation:", error);
  }
}
__name(logConversation, "logConversation");
async function sendConversationEmail(env, conversation, messages) {
  const formattedMessages = messages.map((m) => {
    const role = m.role === "user" ? "\u{1F464} User" : "\u{1F438} Mr. Minami";
    return `${role}:
${m.content}`;
  }).join("\n\n---\n\n");
  const emailBody = `
New conversation from ${conversation.origin}
Started: ${conversation.created_at}
Conversation ID: ${conversation.id}

${"=".repeat(50)}

${formattedMessages}
`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: "Mr. Minami <onboarding@resend.dev>",
      to: "ron@amfibido.com",
      subject: `Amfibido Chat: ${messages[0]?.content?.slice(0, 50) || "New conversation"}...`,
      text: emailBody
    })
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Resend error: ${error}`);
  }
  return response.json();
}
__name(sendConversationEmail, "sendConversationEmail");
async function processUnsentConversations(env) {
  const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1e3).toISOString().replace("T", " ").slice(0, 19);
  const { results: conversations } = await env.DB.prepare(`
		SELECT * FROM conversations 
		WHERE emailed_at IS NULL 
		AND created_at <= ?
	`).bind(fifteenMinsAgo).all();
  console.log(`Found ${conversations.length} conversations to email`);
  for (const conversation of conversations) {
    try {
      const { results: messages } = await env.DB.prepare(`
				SELECT role, content, created_at 
				FROM messages 
				WHERE conversation_id = ? 
				ORDER BY created_at ASC
			`).bind(conversation.id).all();
      if (messages.length === 0) continue;
      await sendConversationEmail(env, conversation, messages);
      await env.DB.prepare(`
				UPDATE conversations SET emailed_at = datetime('now') WHERE id = ?
			`).bind(conversation.id).run();
      console.log(`Emailed conversation ${conversation.id}`);
    } catch (error) {
      console.error(`Failed to email conversation ${conversation.id}:`, error);
    }
  }
}
__name(processUnsentConversations, "processUnsentConversations");
var index_default = {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(processUnsentConversations(env));
  },
  async fetch(request, env, ctx) {
    const corsHeaders = getCorsHeaders(request);
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    try {
      const body = await request.json();
      const message = body.message;
      const history = body.history || [];
      const conversationId = body.conversationId || crypto.randomUUID();
      if (!message || typeof message !== "string") {
        return new Response(JSON.stringify({ error: "Message is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      const { rules, cards, reminders } = await getContext();
      const systemPrompt = buildSystemPrompt(rules, cards, reminders);
      const messages = [
        { role: "system", content: systemPrompt },
        ...history.slice(-10),
        { role: "user", content: message }
      ];
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://amfibido.com",
          "X-Title": "Amfibido Rules Chat"
        },
        body: JSON.stringify({
          model: "openrouter/free",
          messages,
          max_tokens: 1e3
        })
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error("OpenRouter error:", response.status, errorText);
        return new Response(JSON.stringify({ error: "Failed to get response from AI" }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.";
      const origin = request.headers.get("Origin") || "unknown";
      ctx.waitUntil(logConversation(env.DB, conversationId, origin, message, reply));
      return new Response(JSON.stringify({ reply, conversationId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Worker error:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }
};
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
