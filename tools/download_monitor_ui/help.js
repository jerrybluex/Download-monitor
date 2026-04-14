const STORAGE_KEY = "download-monitor-lang";

const docs = {
  zh: {
    pageTitle: "Download Monitor 使用说明",
    eyebrow: "使用说明",
    title: "Download Monitor 中文指南",
    lede: "这页专门讲怎么把本地监控页跑起来、怎么理解自动识别、ETA 为什么有时不显示，以及遇到卡住时该看哪几个指标。",
    homeLink: "打开监控页",
    langToggle: "EN",
    badge: "中文",
    stamp: "本地页面，无需额外前端依赖",
    navTitle: "目录",
    sections: [
      {
        id: "five-steps",
        title: "5步上手",
        html: `
          <ol>
            <li>先进入项目根目录，再运行本地服务：<code>python3 tools/download_monitor_web.py</code></li>
            <li>浏览器打开：<code>http://127.0.0.1:8765/</code></li>
            <li>首页默认就是自动识别，直接点击 <code>开始监控</code></li>
            <li>先看 <code>文件大小</code> 和 <code>传输速度</code> 有没有持续变化</li>
            <li>如果自动识别抓不到，展开 <code>高级设置</code> 手动填命令、PID 或文件路径</li>
          </ol>
          <div class="docs-callout">
            <p>第一次判断“有没有真的卡死”，优先看文件大小是否继续增长，不要只看安装器界面里的文字。</p>
          </div>
        `,
      },
      {
        id: "quick-start",
        title: "启动方式",
        html: `
          <p>在项目根目录执行下面这条命令启动本地 Web 服务：</p>
          <code class="docs-code">python3 tools/download_monitor_web.py</code>
          <p>如果你不在项目根目录，也可以手动替换成你当前机器上的实际路径。</p>
          <p>默认地址：</p>
          <code class="docs-code">http://127.0.0.1:8765/</code>
          <p>如果你想直接用英文界面，可以打开：</p>
          <code class="docs-code">http://127.0.0.1:8765/?lang=en</code>
        `,
      },
      {
        id: "auto-detect",
        title: "自动识别",
        html: `
          <p>如果你不想手动判断当前到底是 Hermes 下载、Playwright 下载，还是别的构建工具下载，直接使用默认的自动识别。</p>
          <p>自动模式不会只靠固定关键字，而是会扫描哪些进程正在联网并写下载文件，再按活跃度排序。</p>
          <p>当前重点覆盖这些类型：</p>
          <ul>
            <li>Hermes / Camoufox</li>
            <li>Playwright / Chromium</li>
            <li>通用 Node 下载链</li>
            <li>Curl / Wget</li>
            <li>Python 包下载链</li>
            <li>Poetry / uv</li>
            <li>Homebrew / 构建工具下载链</li>
            <li>Cargo / Go Module</li>
            <li>Git / Git LFS</li>
          </ul>
          <p>首页里的 <strong>自动识别候选</strong> 会列出候选任务，你可以点 <strong>跟踪</strong> 锁定第二候选或第三候选。</p>
        `,
      },
      {
        id: "manual-targeting",
        title: "手动锁定",
        html: `
          <p>如果自动识别没有抓到目标任务，可以展开首页的 <code>高级设置</code>，手动指定目标。</p>
          <ul>
            <li><strong>命令匹配</strong>：按命令行字符串找进程，适合不知道 PID 的时候。</li>
            <li><strong>PID</strong>：直接锁定具体进程，最准确。</li>
            <li><strong>文件路径</strong>：直接指定下载文件，适合临时文件路径你已经知道的情况。</li>
            <li><strong>目标大小 (MB)</strong>：给 ETA 提供总大小，自动识别失败时很有用。</li>
          </ul>
        `,
      },
      {
        id: "metrics",
        title: "指标说明",
        html: `
          <ul>
            <li><strong>文件大小</strong>：当前下载文件大小。最直观。</li>
            <li><strong>传输速度</strong>：最近样本估算出的下载速度。</li>
            <li><strong>停滞次数</strong>：连续多少次采样文件没有增长。</li>
            <li><strong>已耗时</strong>：进程已经运行多久。</li>
            <li><strong>ETA</strong>：按总大小和最近速度估算的剩余时间。</li>
          </ul>
          <p>图表含义：</p>
          <ul>
            <li>第一张图是累计文件增长曲线</li>
            <li>第二张图是最近速度变化曲线，可以切换 1 / 5 / 15 分钟窗口</li>
          </ul>
        `,
      },
      {
        id: "eta",
        title: "ETA 规则",
        html: `
          <div class="docs-callout">
            <p>ETA 只有在“知道总大小”并且“至少采到两次有效样本”时才有意义。</p>
          </div>
          <ul class="docs-notes">
            <li>有些下载任务后端能自动识别总包大小，ETA 会自己出现。</li>
            <li>如果页面显示类似 <code>需要目标大小</code>，就在首页的 <code>目标大小 (MB)</code> 里手动补上。</li>
            <li>如果最近速度大幅波动，ETA 会跟着变化，这是正常现象。</li>
            <li>ETA 是估算，不是固定完成时间。</li>
          </ul>
        `,
      },
      {
        id: "troubleshooting",
        title: "常见问题",
        html: `
          <h3>页面打不开</h3>
          <p>一般是本地服务没有启动，重新执行启动命令即可。</p>

          <h3>ETA 不显示</h3>
          <p>先等两次有效采样；如果还是没有，说明总大小还没拿到，手动填写 <code>目标大小 (MB)</code>。</p>

          <h3>看到进程了，但文件路径是空的</h3>
          <p>说明下载文件还没真正打开，或者走的是工具暂时识别不到的路径。这时手动填 <code>文件路径</code> 最直接。</p>

          <h3>状态变成停滞</h3>
          <p>表示进程还活着，但最近连续几次采样文件都没增长。通常是远端下载太慢、网络被拦，或者安装流程正在等待别的步骤。</p>

          <h3>状态变成已完成</h3>
          <p>表示被监控的进程已经退出。页面会保留最后一次成功样本，方便你回看收尾状态。</p>
        `,
      },
    ],
  },
  en: {
    pageTitle: "Download Monitor Help",
    eyebrow: "Help",
    title: "Download Monitor Guide",
    lede: "This page explains how to start the local dashboard, how auto detect works, why ETA may be missing, and which signals matter most when a download looks stuck.",
    homeLink: "Open Monitor",
    langToggle: "中文",
    badge: "EN",
    stamp: "Local page, no extra frontend dependencies required",
    navTitle: "Contents",
    sections: [
      {
        id: "five-steps",
        title: "5-Step Quick Start",
        html: `
          <ol>
            <li>From the project root, start the local web service with <code>python3 tools/download_monitor_web.py</code></li>
            <li>Open <code>http://127.0.0.1:8765/</code> in your browser</li>
            <li>The homepage defaults to auto detect, so just click <code>Start Monitoring</code></li>
            <li>Watch <code>File Size</code> and <code>Transfer Rate</code> first</li>
            <li>If auto detect misses the task, open <code>Advanced Settings</code> and enter a command, PID, or file path manually</li>
          </ol>
          <div class="docs-callout">
            <p>When you need to tell whether something is truly stuck, check whether file size is still growing. Do not rely on repeated installer log lines alone.</p>
          </div>
        `,
      },
      {
        id: "quick-start",
        title: "How to Start",
        html: `
          <p>From the project root, run this command to start the local web service:</p>
          <code class="docs-code">python3 tools/download_monitor_web.py</code>
          <p>If you are not in the project root, replace it with the real path on that machine.</p>
          <p>Default URL:</p>
          <code class="docs-code">http://127.0.0.1:8765/</code>
          <p>If you want to open the English UI directly:</p>
          <code class="docs-code">http://127.0.0.1:8765/?lang=en</code>
        `,
      },
      {
        id: "auto-detect",
        title: "Auto Detect",
        html: `
          <p>If you do not want to guess whether the current task is Hermes, Playwright, or another toolchain download, just use the default auto detect mode.</p>
          <p>Auto detect does not rely on one fixed keyword. It scans for processes that are both connected to the network and actively writing a download file, then ranks them.</p>
          <p>Current coverage is strongest for:</p>
          <ul>
            <li>Hermes / Camoufox</li>
            <li>Playwright / Chromium</li>
            <li>Generic Node download chains</li>
            <li>Curl / Wget</li>
            <li>Python package downloads</li>
            <li>Poetry / uv</li>
            <li>Homebrew / build tool downloads</li>
            <li>Cargo / Go module downloads</li>
            <li>Git / Git LFS</li>
          </ul>
          <p>The <strong>Auto Detect Candidates</strong> panel on the homepage lists likely tasks. You can click <strong>Track</strong> to lock onto the second or third candidate.</p>
        `,
      },
      {
        id: "manual-targeting",
        title: "Manual Targeting",
        html: `
          <p>If auto detect misses the correct task, open <code>Advanced Settings</code> on the homepage and target it manually.</p>
          <ul>
            <li><strong>Command Match</strong>: search by command line text when you do not know the PID</li>
            <li><strong>PID</strong>: lock onto one exact process</li>
            <li><strong>File Path</strong>: monitor a specific file directly when you already know the download path</li>
            <li><strong>Target Size (MB)</strong>: provide total size so ETA can be estimated</li>
          </ul>
        `,
      },
      {
        id: "metrics",
        title: "Metrics",
        html: `
          <ul>
            <li><strong>File Size</strong>: current download file size. This is the most direct signal.</li>
            <li><strong>Transfer Rate</strong>: recent speed estimated from sampled growth.</li>
            <li><strong>Stall Count</strong>: how many consecutive samples showed no growth.</li>
            <li><strong>Elapsed</strong>: how long the process has been running.</li>
            <li><strong>ETA</strong>: estimated time remaining based on size and recent speed.</li>
          </ul>
          <p>Chart meanings:</p>
          <ul>
            <li>The first chart shows cumulative growth over time</li>
            <li>The second chart shows recent speed and supports 1 / 5 / 15 minute windows</li>
          </ul>
        `,
      },
      {
        id: "eta",
        title: "ETA Rules",
        html: `
          <div class="docs-callout">
            <p>ETA is only meaningful when the total size is known and at least two valid samples exist.</p>
          </div>
          <ul class="docs-notes">
            <li>For some downloads the backend can infer the total package size automatically, so ETA appears by itself.</li>
            <li>If the page shows <code>Need target</code>, fill in <code>Target Size (MB)</code> on the homepage.</li>
            <li>If recent speed changes sharply, ETA will move around with it. That is expected.</li>
            <li>ETA is an estimate, not a guaranteed finish time.</li>
          </ul>
        `,
      },
      {
        id: "troubleshooting",
        title: "Troubleshooting",
        html: `
          <h3>The page will not open</h3>
          <p>The local service is usually not running. Start it again from Terminal.</p>

          <h3>ETA does not appear</h3>
          <p>Wait for at least two valid samples. If it is still missing, the total size is unknown, so fill in <code>Target Size (MB)</code> manually.</p>

          <h3>The process is visible but the file path is empty</h3>
          <p>This usually means the file has not been opened yet, or the current toolchain uses a path the monitor cannot infer yet. Manually entering <code>File Path</code> is the fastest fix.</p>

          <h3>Status becomes Stalled</h3>
          <p>The process is still alive, but the file has not grown for several samples. This is usually a slow remote download, a blocked network path, or an installer step waiting on something else.</p>

          <h3>Status becomes Completed</h3>
          <p>The monitored process has exited. The page keeps the last successful sample so you can inspect the final state.</p>
        `,
      },
    ],
  },
};

const els = {
  helpEyebrow: document.querySelector("#helpEyebrow"),
  helpTitle: document.querySelector("#helpTitle"),
  helpLede: document.querySelector("#helpLede"),
  helpHomeLink: document.querySelector("#helpHomeLink"),
  helpLangToggle: document.querySelector("#helpLangToggle"),
  helpBadge: document.querySelector("#helpBadge"),
  helpStamp: document.querySelector("#helpStamp"),
  docsNavTitle: document.querySelector("#docsNavTitle"),
  docsNavList: document.querySelector("#docsNavList"),
  docsContent: document.querySelector("#docsContent"),
};

let language = "zh";

function currentPack() {
  return docs[language] || docs.zh;
}

function render() {
  const pack = currentPack();
  document.documentElement.lang = language === "en" ? "en" : "zh-CN";
  document.title = pack.pageTitle;
  els.helpEyebrow.textContent = pack.eyebrow;
  els.helpTitle.textContent = pack.title;
  els.helpLede.textContent = pack.lede;
  els.helpHomeLink.textContent = pack.homeLink;
  els.helpLangToggle.textContent = pack.langToggle;
  els.helpBadge.textContent = pack.badge;
  els.helpStamp.textContent = pack.stamp;
  els.docsNavTitle.textContent = pack.navTitle;

  els.docsNavList.innerHTML = pack.sections
    .map((section) => `<a href="#${section.id}">${section.title}</a>`)
    .join("");

  els.docsContent.innerHTML = pack.sections
    .map((section) => `
      <article id="${section.id}" class="docs-section">
        <h2>${section.title}</h2>
        ${section.html}
      </article>
    `)
    .join("");
}

function setLanguage(next) {
  language = next === "en" ? "en" : "zh";
  window.localStorage.setItem(STORAGE_KEY, language);
  render();
}

const params = new URLSearchParams(window.location.search);
const stored = window.localStorage.getItem(STORAGE_KEY);
if (params.get("lang") === "en" || params.get("lang") === "zh") {
  language = params.get("lang");
} else if (stored === "en" || stored === "zh") {
  language = stored;
}

els.helpLangToggle.addEventListener("click", () => {
  setLanguage(language === "zh" ? "en" : "zh");
});

render();
