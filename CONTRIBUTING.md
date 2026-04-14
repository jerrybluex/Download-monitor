# 贡献指南

感谢您考虑为 Download Monitor 项目做出贡献！本指南将帮助您了解如何有效地参与贡献。

## 🎯 如何贡献

### 报告问题

如果您发现了bug或者有功能建议，请先检查是否已经有相关issue。如果没有，请创建新issue并包含以下信息：

- **清晰的问题描述**
- **复现步骤**
- **期望行为 vs 实际行为**
- **环境信息**（操作系统、Python版本等）
- **相关日志或截图**

### 提交代码

1. **Fork 仓库**
2. **创建分支**：使用描述性的分支名，如 `feature/add-support-for-xyz` 或 `fix/issue-123`
3. **编写代码**：遵循项目的代码风格和约定
4. **添加测试**：如果适用，请添加测试用例
5. **提交更改**：使用清晰的提交信息
6. **创建 Pull Request**

### 代码审查

所有Pull Request都需要经过代码审查。请确保：

- 代码符合项目的编码规范
- 包含适当的测试
- 更新相关文档
- 通过所有现有测试

## 📝 开发规范

### 代码风格

本项目遵循 [PEP 8](https://www.python.org/dev/peps/pep-0008/) Python代码规范。

#### 关键要点：
- 使用4个空格缩进（不要用Tab）
- 行长度限制在88个字符（使用Black格式化）
- 导入顺序：标准库 → 第三方库 → 本地模块
- 使用有意义的变量名和函数名

### 提交信息规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<类型>[可选范围]: <描述>

[可选正文]

[可选脚注]
```

**类型**:
- `feat`: 新功能
- `fix`: bug修复
- `docs`: 文档更新
- `style`: 代码格式调整（不影响功能）
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建过程或辅助工具变动

**示例**:
```
feat: 添加对apt包管理器的支持
fix(web): 修复进度条显示错误
docs: 更新安装说明
```

### 测试要求

- 新功能应包含单元测试
- bug修复应包含重现问题的测试用例
- 确保所有测试通过后再提交
- 保持测试覆盖率不下降

## 🏗️ 项目结构

```
Download-monitor/
├── tools/                    # 主要工具代码
│   ├── download_monitor.py      # 命令行监控工具
│   ├── download_monitor_web.py  # Web服务器
│   └── download_monitor_ui/     # Web界面静态文件
├── tests/                    # 测试文件
│   ├── unit/                # 单元测试
│   └── integration/         # 集成测试
├── docs/                    # 文档
│   ├── api/                # API文档
│   └── screenshots/        # 截图
├── examples/               # 使用示例
├── README.md              # 项目说明
├── CONTRIBUTING.md        # 本文件
└── LICENSE                # 许可证
```

## 🔧 开发环境设置

### 1. 克隆仓库

```bash
git clone https://github.com/jerrybluex/Download-monitor.git
cd Download-monitor
```

### 2. 设置虚拟环境

```bash
python3 -m venv venv
source venv/bin/activate  # Linux/macOS
# 或
venv\Scripts\activate     # Windows
```

### 3. 安装开发依赖

```bash
pip install -e .[dev]
```

### 4. 安装预提交钩子

```bash
pre-commit install
```

### 5. 运行测试

```bash
pytest
```

## 🧪 测试

### 运行所有测试

```bash
pytest
```

### 运行特定测试

```bash
pytest tests/unit/test_download_monitor.py
pytest tests/unit/test_download_monitor.py::TestProcessDetection
```

### 生成测试覆盖率报告

```bash
pytest --cov=tools --cov-report=html
```

## 📚 文档

### 构建文档

```bash
cd docs
make html
```

### 编写文档规范

- 使用Markdown格式
- API文档应包含参数说明和示例
- 示例代码应可运行
- 保持文档与代码同步更新

## 🤝 行为准则

本项目遵循 [贡献者公约](https://www.contributor-covenant.org/version/2/0/code_of_conduct/)。请确保您的行为专业且尊重他人。

## 📞 联系方式

如有问题或需要帮助，可以通过以下方式联系：

- **Issues**: [GitHub Issues](https://github.com/jerrybluex/Download-monitor/issues)
- **Discussions**: [GitHub Discussions](https://github.com/jerrybluex/Download-monitor/discussions)

## 🙏 致谢

感谢所有为这个项目做出贡献的开发者！您的每一份贡献都让这个工具变得更好。

---

*本文档受 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) 许可证保护*