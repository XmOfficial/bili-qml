<p align="center">
  <img src="src/extension/icons/button-icon.png" width="100" height="100" alt="Bilibili Q-Mark List Logo">
</p>

<h1 align="center">B站问号榜 (Bilibili Question-Mark Leaderboard) ❓</h1>

<p align="center">
  <a href="README.md">中文</a> | <a href="#english-version">English</a>
</p>

<p align="center">
  <strong>统计视频的问号值，自动同步弹幕，打造Bilibili的抽象视频排行榜。</strong>
</p>

---

## 🌟 功能特性

-   **问号点亮**：在 B 站视频工具栏增加专属“问号”按钮，如果你觉得这个视频值得你发一个“？”，那么就点亮它。
-   **弹幕联动**：点亮问号时，自动在当前视频发送一条内容为“？”的弹幕。
-   **实时榜单**：点击插件图标，即可查看今日、本周及本月最“抽象”的视频排行。

---

## 🚀 快速开始 （下面两个方法二选一）

### 方法1. 插件安装 

1.  **下载代码**：点击 GitHub 右上角的 `Code` -> `Download ZIP` 并解压，或使用 `git clone`。
2.  **打开浏览器扩展页面**：在 Chrome 或 Edge 浏览器地址栏输入 `chrome://extensions/`。
3.  **开启开发者模式**：打开页面右上角的“开发者模式”开关。
4.  **加载插件**：点击左上角的“加载已解压的扩展程序”，选择本项目中的 `src/extension` 文件夹。
5.  **开始使用**：打开任意 B 站视频页，你就能在转发按钮旁边看到问号键了

### 方法2. 自行部署后端 

本项目后端采用 Node.js + Redis，可部署至 Vercel

---

## TODO

- [ ] debug-1: 修改下滑时图标未合理隐藏的问题
- [ ] support-1: 上架Chrome应用商店
- [ ] support-2: 支持 Firefox
- [ ] support-3: 支持Bilibili桌面端

---

<a name="english-version"></a>

## 🌟 English Version

### Description
A browser extension that adds a "Question Mark" button to Bilibili video toolbars. It tracks "abstract" scores and syncs with live Danmaku.

### Features
-   **Interactive Button**: Light up the "?" to vote for a video.
-   **Auto Danmaku**: Automatically sends a "?" Danmaku when you vote.
-   **Leaderboard**: Check the most "abstract" videos of the day/week.
-   **Data Sync**: Bound to your Bilibili UID for permanent record tracking.

### How to Install
1.  Download and unzip this repository.
2.  Go to `chrome://extensions/` in your browser.
3.  Enable **Developer mode** (top right).
4.  Click **Load unpacked** and select the `src/extension` folder.

---


## 🛠 技术栈

-   **Frontend**: HTML, CSS (Bilibili Style), JavaScript (Chrome Extension API)
-   **Backend**: Node.js (Express)
-   **Database**: Redis (Upstash)
-   **Deployment**: Vercel

## 🤝 贡献与反馈

欢迎提交 Issue 或 Pull Request！

本人并非计算机专业出身，写点代码只是业余爱好，技术能力和投入时间都远远不够。欢迎所有大佬共建！

如果你喜欢这个项目，请给个 ⭐ **Star** 鼓励一下我！OwO~

---

**声明**：本插件仅供学习交流使用，不涉及任何账号密码收集，所有点亮记录均为公开统计。
