# Download Monitor

[![Python Version](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

一个智能的命令行下载监控工具，可以实时监控各种下载进程的进度、速度和状态，提供直观的Web界面仪表板。

## ✨ 功能特性

- **多工具支持**: 自动检测和监控 `curl`、`wget`、浏览器下载、包管理器（`npm`、`pip`、`brew`、`cargo`等）的下载进程
- **智能文件检测**: 通过分析进程打开的文件句柄和网络连接，自动识别下载目标文件
- **实时进度监控**: 显示下载大小、进度百分比、下载速度、剩余时间等关键指标
- **Web仪表板**: 提供美观的本地Web界面，可视化展示下载进度和历史趋势
- **跨平台支持**: 支持 macOS、Linux 等 Unix-like 系统
- **低侵入性**: 无需修改下载命令，无需特殊权限，透明监控现有进程

## 📦 安装

### 前提条件
- Python 3.8 或更高版本
- `lsof` 工具（通常预装在 macOS 和 Linux 系统中）

### 安装步骤

1. **克隆仓库**:
```bash
git clone https://github.com/jerrybluex/Download-monitor.git
cd Download-monitor
```

2. **（可选）创建虚拟环境**:
```bash
python3 -m venv venv
source venv/bin/activate  # Linux/macOS
# 或
venv\Scripts\activate  # Windows
```

3. **安装依赖**:
```bash
pip install -r requirements.txt
```

> **注意**: 本项目目前没有额外的Python依赖，主要依赖系统工具 `lsof` 和 `ps`。

## 🚀 使用方法

### 命令行监控

#### 基本用法

监控指定PID的下载进程:
```bash
python tools/download_monitor.py --pid <PID>
```

通过进程名匹配监控:
```bash
python tools/download_monitor.py --match "curl.*ubuntu.iso"
```

#### 常用选项

| 选项 | 描述 | 默认值 |
|------|------|--------|
| `--pid PID` | 指定要监控的进程ID | - |
| `--match PATTERN` | 使用正则表达式匹配进程命令行 | - |
| `--path PATH` | 手动指定要监控的文件路径 | 自动检测 |
| `--interval SECONDS` | 采样间隔（秒） | 5 |
| `--history COUNT` | 用于计算速度的历史样本数 | 6 |
| `--once` | 只输出一次快照并退出 | false |
| `--stop-after-stall N` | 连续N次无增长后自动停止 | 禁用 |

#### 示例

1. **监控一个正在运行的curl下载**:
```bash
python tools/download_monitor.py --match "curl.*https://example.com/file.zip"
```

2. **监控浏览器下载**:
```bash
python tools/download_monitor.py --match "chrome.*arm64"
```

3. **监控包管理器安装**:
```bash
python tools/download_monitor.py --match "brew install"
```

### Web界面

启动本地Web服务器提供可视化监控界面:
```bash
python tools/download_monitor_web.py
```

访问 `http://localhost:8888` 查看Web仪表板。

#### Web界面功能

- **实时进度条**: 可视化显示下载进度
- **速度图表**: 显示下载速度随时间变化
- **详细统计**: 显示文件大小、已下载量、剩余时间等
- **多会话支持**: 同时监控多个下载任务
- **响应式设计**: 适配桌面和移动设备

## 🔧 支持的工具

Download Monitor 可以自动识别和监控以下类型的下载工具:

| 类别 | 工具示例 |
|------|----------|
| **HTTP客户端** | `curl`、`wget` |
| **浏览器** | Chrome、Firefox、Safari、Chromium |
| **包管理器** | `npm`、`yarn`、`pnpm`、`pip`、`uv`、`poetry` |
| **系统包管理器** | `brew`、`port`、`apt`、`yum` |
| **语言包管理器** | `cargo`、`go mod`、`composer` |
| **版本控制** | `git`、`git-lfs` |
| **自动化工具** | Playwright、Camoufox |

## ⚙️ 配置选项

### 环境变量

| 变量名 | 描述 | 默认值 |
|--------|------|--------|
| `DOWNLOAD_MONITOR_HOST` | Web服务器监听主机 | `localhost` |
| `DOWNLOAD_MONITOR_PORT` | Web服务器端口 | `8888` |
| `DOWNLOAD_MONITOR_INTERVAL` | 默认采样间隔 | `5` |

### 配置文件

创建 `~/.config/download-monitor/config.yaml`:

```yaml
defaults:
  interval: 5
  history: 6
  
web:
  host: localhost
  port: 8888
  auto_open: true

detection:
  file_tokens:
    - ".zip"
    - ".tar"
    - ".dmg"
    - ".pkg"
    - ".whl"
    - ".crate"
    - ".part"
    - ".download"
```

## 📊 示例输出

### 命令行输出示例

```
[2024-04-14 21:15:30] PID 12345 (curl) - downloading: /tmp/ubuntu-22.04.iso
  Size: 3.5GB | Downloaded: 1.2GB (34%) | Speed: 45.2MB/s | ETA: 00:51
  Connections: 93.184.216.34:443 → 192.168.1.100:54321
```

### Web界面截图

![Web Dashboard](docs/screenshots/dashboard.png)

## 🛠️ 开发与贡献

### 项目结构

```
Download-monitor/
├── tools/
│   ├── download_monitor.py      # 主监控脚本
│   ├── download_monitor_web.py  # Web服务器
│   └── download_monitor_ui/     # Web界面前端文件
├── architecture.md              # 架构文档
├── README.md                    # 本文档
└── .gitignore
```

### 开发环境设置

1. 克隆仓库并安装开发依赖:
```bash
git clone https://github.com/jerrybluex/Download-monitor.git
cd Download-monitor
pip install -e .
```

2. 运行测试:
```bash
# 待实现
python -m pytest tests/
```

### 贡献指南

我们欢迎各种形式的贡献！请参阅 [CONTRIBUTING.md](CONTRIBUTING.md) 了解详细指南。

1.  Fork 本仓库
2.  创建功能分支 (`git checkout -b feature/amazing-feature`)
3.  提交更改 (`git commit -m 'Add some amazing feature'`)
4.  推送到分支 (`git push origin feature/amazing-feature`)
5.  开启一个 Pull Request

## 📝 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- 感谢所有开源项目的贡献者
- 特别感谢 `lsof` 和 `ps` 工具的开发者
- 图标由 [Shields.io](https://shields.io) 提供

## 📞 支持与反馈

- **问题报告**: 请使用 [GitHub Issues](https://github.com/jerrybluex/Download-monitor/issues)
- **功能请求**: 欢迎提交 Issue 或 Pull Request
- **讨论**: 可在 Issues 中发起技术讨论

---

**提示**: 本项目处于活跃开发阶段，API和功能可能会发生变化。建议查看最新版本的文档。