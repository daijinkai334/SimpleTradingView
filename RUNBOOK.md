# SimpleTradingView Project Runbook

This document provides a step-by-step guide to setting up the frontend development environment for the `trading-visualizer` project.
本文档为 `trading-visualizer` 项目提供了前端开发环境设置的分步指南。

---

## 1. Environment Setup (环境设置)

These steps will guide you through installing the necessary tools: nvm, Node.js, pnpm, and Vue CLI.
这些步骤将指导您安装必要的工具：nvm、Node.js、pnpm 和 Vue CLI。

### 1.1. Install nvm (Node Version Manager)

`nvm` allows you to manage multiple Node.js versions.
`nvm` 允许您管理多个 Node.js 版本。

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
```

**Note:** If you encounter connection issues, you may need to use a proxy. Replace `http://127.0.0.1:8118` with your actual proxy address.
**注意：** 如果遇到连接问题，您可能需要使用代理。请将 `http://127.0.0.1:8118` 替换为您的实际代理地址。

```bash
curl --proxy http://127.0.0.1:8118 -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
```

### 1.2. Configure Shell Environment (配置 Shell 环境)

The installer might fail to update your shell configuration file (`.zshrc`, `.bashrc`, etc.) due to permissions. Run the following commands to configure it manually.
由于权限问题，安装程序可能无法自动更新您的 shell 配置文件（`.zshrc`、`.bashrc` 等）。请运行以下命令进行手动配置。

First, grant write permissions to the file:
首先，为文件授予写入权限：
```bash
chmod u+w ~/.zshrc
```

Then, append the necessary configurations for `nvm` and `pnpm`:
然后，为 `nvm` 和 `pnpm` 追加必要的配置：
```bash
# NVM Configuration
echo '\n# NVM Configuration\nexport NVM_DIR="$HOME/.nvm"\n[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"\n[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"' >> ~/.zshrc

# PNPM Configuration
echo '\n# PNPM Configuration\nexport PNPM_HOME="$HOME/pnpm"\nexport PATH="$PNPM_HOME:$PATH"' >> ~/.zshrc
```

Finally, reload the configuration for the current terminal session:
最后，为当前终端会话重新加载配置：
```bash
source ~/.zshrc
```

### 1.3. Install Node.js & pnpm

Use `nvm` to install the Long-Term Support (LTS) version of Node.js, and then use `npm` to install `pnpm`.
使用 `nvm` 安装 Node.js 的长期支持（LTS）版本，然后使用 `npm` 安装 `pnpm`。

```bash
nvm install --lts
npm install -g pnpm
```

### 1.4. Install Vue CLI (安装 Vue CLI)

Use `pnpm` to globally install the Vue CLI.
使用 `pnpm` 全局安装 Vue CLI。

```bash
pnpm install -g @vue/cli
```

---

## 2. Project Initialization (项目初始化)

### 2.1. Create the Vue Project (创建 Vue 项目)

This command will create a new project named `trading-visualizer` and will prompt you with several configuration questions.
此命令将创建一个名为 `trading-visualizer` 的新项目，并会提示您回答几个配置问题。

```bash
vue create trading-visualizer
```
Follow the interactive guide with these selections (请按照交互式指南进行以下选择):
1.  **Preset**: `Manually select features`
2.  **Features**: `Babel`, `Linter`
3.  **Vue Version**: `3.x`
4.  **Linter / Formatter**: `ESLint + Prettier`
5.  **Lint Features**: `Lint on save`
6.  **Config Files**: `In dedicated config files`
7.  **Save Preset**: `No`
8.  **Package Manager**: `PNPM`

---

## 3. Running the Project (运行项目)

### 3.1. Start the Development Server (启动开发服务器)

Navigate into the project directory and start the local server.
进入项目目录并启动本地服务器。

```bash
cd trading-visualizer
pnpm run serve
```

The application will typically be available at `http://localhost:8080/`.
应用程序通常可在 `http://localhost:8080/` 访问。
