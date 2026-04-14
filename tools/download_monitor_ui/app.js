const state = {
  timer: null,
  running: false,
  selectedPreset: "auto",
  detectedPreset: null,
  detectedLabel: null,
  discoveredCandidates: [],
  pinnedTaskId: null,
  language: "zh",
  lastPayload: null,
  lastError: null,
};

const presets = {
  auto: {
    match: "",
    path: "",
    pid: "",
    label: "Auto Detect",
  },
  hermes: {
    match: "camoufox-js fetch",
    path: "",
    pid: "",
    label: "Hermes Browser",
  },
  playwright: {
    match: "playwright|chromium|chrome.*arm64|browser install|cdn.playwright.dev",
    path: "",
    pid: "",
    label: "Playwright",
  },
  node: {
    match: "node .*fetch|npm install|npm exec",
    path: "",
    pid: "",
    label: "Generic Node Download",
  },
};

const translations = {
  zh: {
    pageTitle: "Download Monitor",
    eyebrow: "Local Dashboard",
    lede: "盯住安装下载进度，不用再对着终端里一行重复日志发呆。",
    help: "使用说明",
    langToggle: "EN",
    modeKicker: "监控模式",
    controlsTitle: "先选模式，再开始轮询",
    modeNote: "默认就是自动识别。大多数情况下不用切模式，直接开始监控就行。",
    refreshLabel: "刷新",
    start: "开始监控",
    pause: "暂停",
    advancedSummary: "高级设置",
    matchLabel: "命令匹配",
    pidLabel: "PID",
    pidPlaceholder: "可选",
    pathLabel: "文件路径",
    pathPlaceholder: "可选，直接指定下载文件",
    targetSizeLabel: "目标大小 (MB)",
    targetSizePlaceholder: "用于 ETA 估算",
    advancedNote: "默认不需要填写。只有自动识别抓不到，或者你想手动锁定某个任务时，再展开这里。",
    candidateTitle: "自动识别候选",
    candidateCaptionDefault: "自动模式会把当前最像“真实下载任务”的进程排在这里。",
    candidateCaptionEmpty: "自动识别暂时没有发现活跃的下载任务。",
    candidateCaptionRanked: "候选任务按文件增长、网络活跃度和进程存活情况排序。",
    candidateEmpty: "当前还没有候选任务。",
    sizeLabel: "文件大小",
    rateLabel: "传输速度",
    stallLabel: "停滞次数",
    elapsedLabel: "已耗时",
    etaLabel: "ETA",
    growthTitle: "增长曲线",
    speedTitle: "速度曲线",
    chartWaiting: "等待采样中。",
    speedWaiting: "等待采样中。",
    commandLabel: "命令",
    fileLabel: "文件",
    networkLabel: "网络连接",
    processLabel: "进程",
    stateLabel: "状态",
    resourceLabel: "CPU / MEM",
    messageLabel: "消息",
    noSamplesYet: "还没有采样",
    lastSample: "最近采样 {time}",
    statusActive: "进行中",
    statusStalled: "停滞",
    statusWarming: "准备中",
    statusCompleted: "已完成",
    statusError: "错误",
    etaNeedTarget: "需要目标大小",
    etaReached: "已到达",
    etaUnknown: "未知",
    chartNeedMore: "至少需要两次采样后才会出现趋势线。",
    chartObserved: "已观察到增长 {growth}，共 {count} 个样本。",
    speedNeedMore: "{minutes} 分钟窗口还需要更多采样。",
    speedSummary: "{minutes} 分钟窗口，峰值 {peak}/s，平均 {avg}",
    messageSampling: "采样中。",
    messageReady: "准备就绪。点开始监控后会自动轮询。",
    messageSwitchedAuto: "已切换到自动识别模式。",
    messageSwitchedPreset: "已切换到 {label} 模式。",
    messageDetected: " 当前识别: {label}.",
    messageTarget: " 目标包: {label}.",
    messageNoCandidate: "当前没有检测到活跃下载任务。",
    candidateTrack: "跟踪",
    candidateTracking: "正在跟踪",
    candidateSize: "大小 {value}",
    candidateGrowth: "增长 {value}",
    candidateScore: "分数 {value}",
    growthWarming: "准备中",
  },
  en: {
    pageTitle: "Download Monitor",
    eyebrow: "Local Dashboard",
    lede: "Track installer downloads without staring at a terminal that looks frozen.",
    help: "Help",
    langToggle: "中文",
    modeKicker: "Monitor Mode",
    controlsTitle: "Start polling in one step",
    modeNote: "Auto detect is the default. In most cases you can just hit start and let it find the active download.",
    refreshLabel: "Refresh",
    start: "Start Monitoring",
    pause: "Pause",
    advancedSummary: "Advanced Settings",
    matchLabel: "Command Match",
    pidLabel: "PID",
    pidPlaceholder: "Optional",
    pathLabel: "File Path",
    pathPlaceholder: "Optional explicit download file path",
    targetSizeLabel: "Target Size (MB)",
    targetSizePlaceholder: "Used for ETA",
    advancedNote: "You usually do not need this section. Open it only when auto detect misses the task or you want to lock to a specific process.",
    candidateTitle: "Auto Detect Candidates",
    candidateCaptionDefault: "Auto mode ranks the processes that look most like real download tasks.",
    candidateCaptionEmpty: "Auto detection cannot currently see an active download task.",
    candidateCaptionRanked: "Candidates are ranked by file growth, network activity, and process liveness.",
    candidateEmpty: "No candidates yet.",
    sizeLabel: "File Size",
    rateLabel: "Transfer Rate",
    stallLabel: "Stall Count",
    elapsedLabel: "Elapsed",
    etaLabel: "ETA",
    growthTitle: "Growth",
    speedTitle: "Transfer Rate",
    chartWaiting: "Waiting for samples.",
    speedWaiting: "Waiting for samples.",
    commandLabel: "Command",
    fileLabel: "File",
    networkLabel: "Network",
    processLabel: "Process",
    stateLabel: "State",
    resourceLabel: "CPU / MEM",
    messageLabel: "Message",
    noSamplesYet: "No samples yet",
    lastSample: "Last sample {time}",
    statusActive: "Active",
    statusStalled: "Stalled",
    statusWarming: "Warming",
    statusCompleted: "Completed",
    statusError: "Error",
    etaNeedTarget: "Need target",
    etaReached: "Reached",
    etaUnknown: "Unknown",
    chartNeedMore: "Need at least two samples before a trend line appears.",
    chartObserved: "Observed growth: {growth} across {count} samples.",
    speedNeedMore: "Need more samples for the {minutes}-minute window.",
    speedSummary: "{minutes}-minute window, peak {peak}/s, average {avg}",
    messageSampling: "Sampling.",
    messageReady: "Ready. Press Start to begin polling.",
    messageSwitchedAuto: "Switched to auto detect mode.",
    messageSwitchedPreset: "Switched to {label} mode.",
    messageDetected: " Detected: {label}.",
    messageTarget: " Target package: {label}.",
    messageNoCandidate: "No active download candidate detected.",
    candidateTrack: "Track",
    candidateTracking: "Tracking",
    candidateSize: "size {value}",
    candidateGrowth: "growth {value}",
    candidateScore: "score {value}",
    growthWarming: "warming",
  },
};

const knownLabels = {
  "Auto Detect": { zh: "自动识别", en: "Auto Detect" },
  "Hermes Browser": { zh: "Hermes 浏览器", en: "Hermes Browser" },
  "Playwright": { zh: "Playwright", en: "Playwright" },
  "Generic Node Download": { zh: "通用 Node 下载", en: "Generic Node Download" },
  "Curl / Wget Download": { zh: "Curl / Wget 下载", en: "Curl / Wget Download" },
  "Python Package Download": { zh: "Python 包下载", en: "Python Package Download" },
  "Poetry / uv Download": { zh: "Poetry / uv 下载", en: "Poetry / uv Download" },
  "Homebrew / Build Tool Download": { zh: "Homebrew / 构建工具下载", en: "Homebrew / Build Tool Download" },
  "Cargo Download": { zh: "Cargo 下载", en: "Cargo Download" },
  "Go Module Download": { zh: "Go Module 下载", en: "Go Module Download" },
  "Git / Git LFS Download": { zh: "Git / Git LFS 下载", en: "Git / Git LFS Download" },
  Download: { zh: "下载", en: "Download" },
};

const knownKinds = {
  fetch: { zh: "下载", en: "fetch" },
  hermes: { zh: "Hermes", en: "hermes" },
  playwright: { zh: "Playwright", en: "playwright" },
  node: { zh: "Node", en: "node" },
  python: { zh: "Python", en: "python" },
  brew: { zh: "Homebrew", en: "brew" },
  cargo: { zh: "Cargo", en: "cargo" },
  go: { zh: "Go", en: "go" },
  git: { zh: "Git", en: "git" },
};

const els = {
  langToggleButton: document.querySelector("#langToggleButton"),
  helpLink: document.querySelector("#helpLink"),
  eyebrowText: document.querySelector("#eyebrowText"),
  heroTitle: document.querySelector("#heroTitle"),
  heroLede: document.querySelector("#heroLede"),
  statusBadge: document.querySelector("#statusBadge"),
  lastSeen: document.querySelector("#lastSeen"),
  modeKicker: document.querySelector("#modeKicker"),
  controlsTitle: document.querySelector("#controlsTitle"),
  modeNote: document.querySelector("#modeNote"),
  refreshLabel: document.querySelector("#refreshLabel"),
  matchInput: document.querySelector("#matchInput"),
  pidInput: document.querySelector("#pidInput"),
  pathInput: document.querySelector("#pathInput"),
  intervalInput: document.querySelector("#intervalInput"),
  targetSizeInput: document.querySelector("#targetSizeInput"),
  speedWindowSelect: document.querySelector("#speedWindowSelect"),
  toggleButton: document.querySelector("#toggleButton"),
  advancedSummary: document.querySelector("#advancedSummary"),
  matchLabel: document.querySelector("#matchLabel"),
  pidLabel: document.querySelector("#pidLabel"),
  pathLabel: document.querySelector("#pathLabel"),
  targetSizeLabel: document.querySelector("#targetSizeLabel"),
  advancedNote: document.querySelector("#advancedNote"),
  presetButtons: Array.from(document.querySelectorAll("[data-preset]")),
  candidatePanel: document.querySelector(".candidate-panel"),
  candidateTitle: document.querySelector("#candidateTitle"),
  candidateCaption: document.querySelector("#candidateCaption"),
  candidateList: document.querySelector("#candidateList"),
  sizeLabel: document.querySelector("#sizeLabel"),
  sizeValue: document.querySelector("#sizeValue"),
  rateLabel: document.querySelector("#rateLabel"),
  rateValue: document.querySelector("#rateValue"),
  stallLabel: document.querySelector("#stallLabel"),
  stallValue: document.querySelector("#stallValue"),
  elapsedLabel: document.querySelector("#elapsedLabel"),
  elapsedValue: document.querySelector("#elapsedValue"),
  etaLabel: document.querySelector("#etaLabel"),
  etaValue: document.querySelector("#etaValue"),
  growthTitle: document.querySelector("#growthTitle"),
  chartCaption: document.querySelector("#chartCaption"),
  speedTitle: document.querySelector("#speedTitle"),
  speedCaption: document.querySelector("#speedCaption"),
  chart: document.querySelector("#chart"),
  speedChart: document.querySelector("#speedChart"),
  commandLabel: document.querySelector("#commandLabel"),
  commandValue: document.querySelector("#commandValue"),
  fileLabel: document.querySelector("#fileLabel"),
  fileValue: document.querySelector("#fileValue"),
  networkLabel: document.querySelector("#networkLabel"),
  networkList: document.querySelector("#networkList"),
  processLabel: document.querySelector("#processLabel"),
  processValue: document.querySelector("#processValue"),
  stateLabel: document.querySelector("#stateLabel"),
  stateValue: document.querySelector("#stateValue"),
  resourceLabel: document.querySelector("#resourceLabel"),
  resourceValue: document.querySelector("#resourceValue"),
  messageLabel: document.querySelector("#messageLabel"),
  messageValue: document.querySelector("#messageValue"),
};

function t(key, vars = {}) {
  const pack = translations[state.language] || translations.zh;
  let value = pack[key] ?? translations.zh[key] ?? key;
  for (const [name, replacement] of Object.entries(vars)) {
    value = value.replaceAll(`{${name}}`, String(replacement));
  }
  return value;
}

function localizeLabel(label) {
  if (!label) return "";
  return knownLabels[label]?.[state.language] || label;
}

function localizeKind(kind) {
  if (!kind) return "";
  return knownKinds[kind]?.[state.language] || kind;
}

function setLanguage(language) {
  state.language = language === "en" ? "en" : "zh";
  document.documentElement.lang = state.language === "en" ? "en" : "zh-CN";
  window.localStorage.setItem("download-monitor-lang", state.language);
  applyLanguage();
}

function applyLanguage() {
  document.title = t("pageTitle");
  els.eyebrowText.textContent = t("eyebrow");
  els.heroTitle.textContent = t("pageTitle");
  els.heroLede.textContent = t("lede");
  els.helpLink.textContent = t("help");
  els.langToggleButton.textContent = t("langToggle");
  els.modeKicker.textContent = t("modeKicker");
  els.controlsTitle.textContent = t("controlsTitle");
  els.modeNote.textContent = t("modeNote");
  els.refreshLabel.textContent = t("refreshLabel");
  els.advancedSummary.textContent = t("advancedSummary");
  els.matchLabel.textContent = t("matchLabel");
  els.pidLabel.textContent = t("pidLabel");
  els.pathLabel.textContent = t("pathLabel");
  els.targetSizeLabel.textContent = t("targetSizeLabel");
  els.advancedNote.textContent = t("advancedNote");
  els.pidInput.placeholder = t("pidPlaceholder");
  els.pathInput.placeholder = t("pathPlaceholder");
  els.targetSizeInput.placeholder = t("targetSizePlaceholder");
  els.candidateTitle.textContent = t("candidateTitle");
  els.candidateCaption.textContent = t("candidateCaptionDefault");
  if (!state.discoveredCandidates.length) {
    els.candidateList.innerHTML = `<div class="candidate-empty">${escapeHtml(t("candidateEmpty"))}</div>`;
  }
  els.sizeLabel.textContent = t("sizeLabel");
  els.rateLabel.textContent = t("rateLabel");
  els.stallLabel.textContent = t("stallLabel");
  els.elapsedLabel.textContent = t("elapsedLabel");
  els.etaLabel.textContent = t("etaLabel");
  els.growthTitle.textContent = t("growthTitle");
  els.speedTitle.textContent = t("speedTitle");
  els.commandLabel.textContent = t("commandLabel");
  els.fileLabel.textContent = t("fileLabel");
  els.networkLabel.textContent = t("networkLabel");
  els.processLabel.textContent = t("processLabel");
  els.stateLabel.textContent = t("stateLabel");
  els.resourceLabel.textContent = t("resourceLabel");
  els.messageLabel.textContent = t("messageLabel");
  els.chart.setAttribute("aria-label", state.language === "en" ? "Download growth chart" : "下载增长曲线");
  els.speedChart.setAttribute("aria-label", state.language === "en" ? "Transfer rate chart" : "传输速度曲线");
  els.speedWindowSelect.setAttribute("aria-label", state.language === "en" ? "Speed window" : "速度窗口");

  if (state.lastPayload) {
    render(state.lastPayload);
  } else if (state.lastError) {
    renderError(state.lastError);
  } else {
    setStatus("warming", t("statusWarming"));
    els.lastSeen.textContent = t("noSamplesYet");
    els.chartCaption.textContent = t("chartWaiting");
    els.speedCaption.textContent = t("speedWaiting");
    els.toggleButton.textContent = state.running ? t("pause") : t("start");
    setMessage(t("messageReady"));
  }
}

function readIntervalSeconds() {
  return Math.max(1, Number.parseInt(els.intervalInput.value, 10) || 3);
}

function readSpeedWindowMinutes() {
  return Math.max(1, Number.parseInt(els.speedWindowSelect.value, 10) || 5);
}

function buildQuery() {
  return buildQueryWithOverrides({});
}

function buildQueryWithOverrides(overrides) {
  const query = new URLSearchParams();
  const match = overrides.match ?? els.matchInput.value.trim();
  const pid = overrides.pid ?? els.pidInput.value.trim();
  const path = overrides.path ?? els.pathInput.value.trim();
  const history = Math.max(24, Math.ceil((readSpeedWindowMinutes() * 60) / readIntervalSeconds()) + 12);

  if (match) query.set("match", match);
  if (pid) query.set("pid", pid);
  if (path) query.set("path", path);
  query.set("history", String(history));
  return query.toString();
}

function setStatus(kind, text) {
  els.statusBadge.className = `badge ${kind}`;
  els.statusBadge.textContent = text;
}

function setMessage(text) {
  els.messageValue.textContent = text;
}

function humanBytes(size) {
  if (size === null || size === undefined || Number.isNaN(size)) return "-";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = size;
  let unit = units[0];
  for (const next of units) {
    unit = next;
    if (value < 1024 || unit === units[units.length - 1]) break;
    value /= 1024;
  }
  return `${value.toFixed(1)}${unit}`;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "-";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

function computeAverageRateBytes(samples) {
  const valid = samples.filter((sample) => typeof sample.sizeBytes === "number");
  if (valid.length < 2) return null;
  const first = valid[0];
  const last = valid[valid.length - 1];
  const dt = last.timestamp - first.timestamp;
  if (dt <= 0) return null;
  const delta = Math.max(0, last.sizeBytes - first.sizeBytes);
  return delta / dt;
}

function average(values) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildSpeedSeries(samples, windowMinutes) {
  const cutoff = Date.now() / 1000 - windowMinutes * 60;
  const series = [];

  for (let index = 1; index < samples.length; index += 1) {
    const previous = samples[index - 1];
    const current = samples[index];
    if (typeof previous.sizeBytes !== "number" || typeof current.sizeBytes !== "number") continue;
    const dt = current.timestamp - previous.timestamp;
    if (dt <= 0) continue;
    if (current.timestamp < cutoff) continue;
    const delta = Math.max(0, current.sizeBytes - previous.sizeBytes);
    series.push({
      timestamp: current.timestamp,
      rate: delta / dt,
    });
  }

  return series;
}

function estimateEta(samples, targetMB, inferredTargetBytes) {
  const targetBytes = targetMB ? Number(targetMB) * 1024 * 1024 : inferredTargetBytes;
  if (!targetBytes) return t("etaNeedTarget");
  const current = samples.filter((sample) => typeof sample.sizeBytes === "number").at(-1);
  if (!current) return "-";
  if (current.sizeBytes >= targetBytes) return t("etaReached");
  const rate = computeAverageRateBytes(samples);
  if (!rate || rate <= 0) return t("etaUnknown");
  return formatDuration((targetBytes - current.sizeBytes) / rate);
}

function renderNetwork(items) {
  if (!items.length) {
    els.networkList.textContent = "-";
    return;
  }

  els.networkList.innerHTML = items
    .slice(0, 4)
    .map((item) => `<div class="network-item">${escapeHtml(item)}</div>`)
    .join("");
}

function renderAreaChart(svg, points, lineColor, areaColor, width, height, padding) {
  const line = points.map(([x, y]) => `${x},${y}`).join(" ");
  const area = [
    `${points[0][0]},${height - padding}`,
    ...points.map(([x, y]) => `${x},${y}`),
    `${points[points.length - 1][0]},${height - padding}`,
  ].join(" ");

  svg.innerHTML = `
    <defs>
      <linearGradient id="${svg.id}Gradient" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="${areaColor}"></stop>
        <stop offset="100%" stop-color="rgba(255,255,255,0.02)"></stop>
      </linearGradient>
    </defs>
    <polyline points="${area}" fill="url(#${svg.id}Gradient)" stroke="none"></polyline>
    <polyline points="${line}" fill="none" stroke="${lineColor}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></polyline>
    ${points.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4.5" fill="#fff7eb" stroke="${lineColor}" stroke-width="2"></circle>`).join("")}
  `;
}

function renderGrowthChart(samples) {
  const width = 600;
  const height = 240;
  const padding = 22;
  const filtered = samples.filter((sample) => typeof sample.sizeBytes === "number");

  if (filtered.length < 2) {
    els.chart.innerHTML = "";
    els.chartCaption.textContent = t("chartNeedMore");
    return;
  }

  const sizes = filtered.map((sample) => sample.sizeBytes);
  const min = Math.min(...sizes);
  const max = Math.max(...sizes);
  const span = Math.max(max - min, 1);
  const xStep = (width - padding * 2) / Math.max(filtered.length - 1, 1);
  const points = filtered.map((sample, index) => {
    const x = padding + index * xStep;
    const y = height - padding - ((sample.sizeBytes - min) / span) * (height - padding * 2);
    return [x, y];
  });

  renderAreaChart(els.chart, points, "#147d64", "rgba(20,125,100,0.38)", width, height, padding);
  els.chartCaption.textContent = t("chartObserved", {
    growth: humanBytes(max - min),
    count: filtered.length,
  });
}

function renderSpeedChart(samples) {
  const width = 600;
  const height = 220;
  const padding = 22;
  const windowMinutes = readSpeedWindowMinutes();
  const series = buildSpeedSeries(samples, windowMinutes);

  if (series.length < 2) {
    els.speedChart.innerHTML = "";
    els.speedCaption.textContent = t("speedNeedMore", { minutes: windowMinutes });
    return;
  }

  const rates = series.map((point) => point.rate);
  const min = 0;
  const max = Math.max(...rates, 1);
  const span = Math.max(max - min, 1);
  const xStep = (width - padding * 2) / Math.max(series.length - 1, 1);
  const points = series.map((point, index) => {
    const x = padding + index * xStep;
    const y = height - padding - ((point.rate - min) / span) * (height - padding * 2);
    return [x, y];
  });

  renderAreaChart(els.speedChart, points, "#c36a1a", "rgba(195,106,26,0.32)", width, height, padding);
  const avgRate = average(rates);
  els.speedCaption.textContent = t("speedSummary", {
    minutes: windowMinutes,
    peak: humanBytes(max),
    avg: avgRate ? `${humanBytes(avgRate)}/s` : "-",
  });
}

function render(payload) {
  state.lastPayload = payload;
  state.lastError = null;
  const statusMap = {
    active: t("statusActive"),
    stalled: t("statusStalled"),
    warming: t("statusWarming"),
    completed: t("statusCompleted"),
  };
  const statusText = statusMap[payload.status] || t("statusWarming");
  setStatus(payload.status, statusText);
  els.lastSeen.textContent = t("lastSample", {
    time: new Date(payload.timestamp * 1000).toLocaleTimeString(),
  });
  els.sizeValue.textContent = payload.file.sizeHuman || "-";
  els.rateValue.textContent = payload.rateHuman || "-";
  els.stallValue.textContent = String(payload.stallCount ?? 0);
  els.elapsedValue.textContent = payload.process.elapsed || "-";
  els.etaValue.textContent = estimateEta(
    payload.samples || [],
    els.targetSizeInput.value.trim(),
    payload.target?.sizeBytes || null
  );
  els.commandValue.textContent = payload.process.command || "-";
  els.fileValue.textContent = payload.file.path || "-";
  els.processValue.textContent = payload.process.pid ? `PID ${payload.process.pid}` : "-";
  els.stateValue.textContent = payload.process.state || "-";
  els.resourceValue.textContent = `${payload.process.cpu}% / ${payload.process.mem}%`;
  renderNetwork(payload.network || []);
  renderGrowthChart(payload.samples || []);
  renderSpeedChart(payload.samples || []);
  const detectedLabel = state.detectedPreset && presets[state.detectedPreset]
    ? t("messageDetected", { label: localizeLabel(presets[state.detectedPreset].label) })
    : "";
  const targetLabel = payload.target?.label ? t("messageTarget", { label: payload.target.label }) : "";
  const detectedKindLabel = state.detectedLabel
    ? t("messageDetected", { label: localizeLabel(state.detectedLabel) })
    : detectedLabel;
  setMessage(`${payload.message || t("messageSampling")}${detectedKindLabel}${targetLabel}`);
}

function renderError(message) {
  state.lastError = message;
  state.lastPayload = null;
  setStatus("error", t("statusError"));
  setMessage(message);
}

function renderIdleAutoState() {
  state.lastPayload = null;
  state.lastError = null;
  setStatus("warming", t("statusWarming"));
  els.lastSeen.textContent = t("noSamplesYet");
  els.chart.innerHTML = "";
  els.speedChart.innerHTML = "";
  els.chartCaption.textContent = t("chartWaiting");
  els.speedCaption.textContent = t("speedWaiting");
  els.sizeValue.textContent = "-";
  els.rateValue.textContent = "-";
  els.stallValue.textContent = "0";
  els.elapsedValue.textContent = "-";
  els.etaValue.textContent = "-";
  els.commandValue.textContent = "-";
  els.fileValue.textContent = "-";
  els.processValue.textContent = "-";
  els.stateValue.textContent = "-";
  els.resourceValue.textContent = "-";
  renderNetwork([]);
  setMessage(t("messageNoCandidate"));
}

function renderCandidates(candidates) {
  state.discoveredCandidates = candidates;
  if (!candidates.length) {
    els.candidateCaption.textContent = t("candidateCaptionEmpty");
    els.candidateList.innerHTML = `<div class="candidate-empty">${escapeHtml(t("candidateEmpty"))}</div>`;
    return;
  }

  els.candidateCaption.textContent = t("candidateCaptionRanked");
  els.candidateList.innerHTML = candidates.map((candidate, index) => {
    const isActive = candidate.taskId === state.pinnedTaskId || (!state.pinnedTaskId && index === 0);
    const growth = candidate.growthRateHuman && candidate.growthRateHuman !== "-" ? candidate.growthRateHuman : t("growthWarming");
    const size = candidate.file?.sizeHuman || "-";
    return `
      <article class="candidate-item${isActive ? " is-active" : ""}">
        <div class="candidate-main">
          <div class="candidate-header">
            <span class="candidate-title">${escapeHtml(localizeLabel(candidate.label || candidate.kind || "Download"))}</span>
            <span class="candidate-tag">${escapeHtml(localizeKind(candidate.kind || "task"))}</span>
          </div>
          <div class="candidate-meta">
            <span>PID ${candidate.process.pid}</span>
            <span>${escapeHtml(t("candidateSize", { value: size }))}</span>
            <span>${escapeHtml(t("candidateGrowth", { value: growth }))}</span>
            <span>${escapeHtml(t("candidateScore", { value: String(candidate.score) }))}</span>
          </div>
          <div class="candidate-command">${escapeHtml(candidate.process.command || "")}</div>
        </div>
        <div class="candidate-actions">
          <button class="candidate-button" type="button" data-task-id="${escapeHtml(candidate.taskId)}">
            ${isActive ? t("candidateTracking") : t("candidateTrack")}
          </button>
        </div>
      </article>
    `;
  }).join("");
}

function syncViewState() {
  const showCandidates = state.selectedPreset === "auto";
  els.candidatePanel.classList.toggle("is-hidden", !showCandidates);
}

function applyPreset(name) {
  const preset = presets[name];
  if (!preset) return;
  state.selectedPreset = name;
  state.detectedPreset = name === "auto" ? null : name;
  state.detectedLabel = name !== "auto" && preset ? preset.label : null;
  state.pinnedTaskId = null;
  if (name === "auto") {
    els.matchInput.value = "";
    els.pathInput.value = "";
    els.pidInput.value = "";
  } else {
    els.matchInput.value = preset.match;
    els.pathInput.value = preset.path;
    els.pidInput.value = preset.pid;
  }
  syncPresetButtons();
  syncViewState();
  setMessage(name === "auto" ? t("messageSwitchedAuto") : t("messageSwitchedPreset", { label: localizeLabel(preset.label) }));
}

function syncPresetButtons() {
  els.presetButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.preset === state.selectedPreset);
  });
}

async function fetchProbe(queryString) {
  const response = await fetch(`/api/probe?${queryString}`, { cache: "no-store" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.ok) {
    const error = new Error(payload.error || "Probe failed");
    error.status = response.status;
    throw error;
  }
  return payload;
}

async function discoverCandidates(limit = 6) {
  const response = await fetch(`/api/discover?limit=${limit}`, { cache: "no-store" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.ok) {
    const error = new Error(payload.error || "Discovery failed");
    error.status = response.status;
    throw error;
  }
  return payload.candidates || [];
}

async function sampleAuto() {
  const candidates = await discoverCandidates();
  renderCandidates(candidates);
  if (!candidates.length) {
    state.detectedPreset = null;
    state.detectedLabel = null;
    renderIdleAutoState();
    return null;
  }

  const best = candidates.find((candidate) => candidate.taskId === state.pinnedTaskId) || candidates[0];
  state.pinnedTaskId = best.taskId;
  state.detectedPreset = best.kind;
  state.detectedLabel = best.label;
  return fetchProbe(buildQueryWithOverrides({ pid: String(best.pid), match: "", path: best.file?.path || "" }));
}

async function sample() {
  const hasManualOverride = Boolean(els.pidInput.value.trim() || els.pathInput.value.trim());
  const payload = state.selectedPreset === "auto" && !hasManualOverride
    ? await sampleAuto()
    : await fetchProbe(buildQuery());
  if (!payload) return;
  if (state.selectedPreset !== "auto") {
    state.detectedPreset = state.selectedPreset;
    state.detectedLabel = presets[state.selectedPreset]?.label || null;
  }
  render(payload);
}

function start() {
  if (state.running) return;
  state.running = true;
  els.toggleButton.textContent = t("pause");
  const intervalMs = readIntervalSeconds() * 1000;

  const tick = async () => {
    try {
      await sample();
    } catch (error) {
      renderError(error.message);
    }
  };

  tick();
  state.timer = window.setInterval(tick, intervalMs);
}

function stop() {
  state.running = false;
  els.toggleButton.textContent = t("start");
  if (state.timer) {
    window.clearInterval(state.timer);
    state.timer = null;
  }
}

els.toggleButton.addEventListener("click", () => {
  if (state.running) stop();
  else start();
});

els.langToggleButton.addEventListener("click", () => {
  setLanguage(state.language === "zh" ? "en" : "zh");
});

els.candidateList.addEventListener("click", async (event) => {
  if (!(event.target instanceof Element)) return;
  const button = event.target.closest("[data-task-id]");
  if (!button) return;
  state.pinnedTaskId = button.dataset.taskId || null;
  state.selectedPreset = "auto";
  syncPresetButtons();
  try {
    await sample();
  } catch (error) {
    renderError(error.message);
  }
});

els.presetButtons.forEach((button) => {
  button.addEventListener("click", () => {
    applyPreset(button.dataset.preset);
  });
});

els.speedWindowSelect.addEventListener("change", async () => {
  if (!state.running) return;
  try {
    await sample();
  } catch (error) {
    renderError(error.message);
  }
});

const urlParams = new URLSearchParams(window.location.search);
const storedLanguage = window.localStorage.getItem("download-monitor-lang");
if (urlParams.get("lang")) {
  state.language = urlParams.get("lang") === "en" ? "en" : "zh";
} else if (storedLanguage === "en" || storedLanguage === "zh") {
  state.language = storedLanguage;
}
if (urlParams.get("preset")) {
  applyPreset(urlParams.get("preset"));
} else {
  applyPreset("auto");
}
if (urlParams.get("match")) {
  els.matchInput.value = urlParams.get("match");
}
if (urlParams.get("pid")) {
  els.pidInput.value = urlParams.get("pid");
}
if (urlParams.get("path")) {
  els.pathInput.value = urlParams.get("path");
}
if (urlParams.get("interval")) {
  els.intervalInput.value = urlParams.get("interval");
}
if (urlParams.get("targetMB")) {
  els.targetSizeInput.value = urlParams.get("targetMB");
}
if (urlParams.get("speedWindow")) {
  els.speedWindowSelect.value = urlParams.get("speedWindow");
}
if (urlParams.get("taskId")) {
  state.pinnedTaskId = urlParams.get("taskId");
}
if (urlParams.get("autostart") === "1") {
  start();
}

applyLanguage();
syncViewState();
if (!state.running && !state.lastPayload && !state.lastError) {
  setMessage(t("messageReady"));
}
