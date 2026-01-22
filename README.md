# 📺 好看视频标题搜索 (HaoKanSearch)
> **全网搜同款，从未如此简单。**  
> 一个功能强大、交互优雅的油猴脚本，专为百度好看视频用户打造。自动提取纯净标题，一键跳转抖音或 Bilibili 搜索原版视频。

![Version](https://img.shields.io/badge/Version-0.0.8-blue) ![License](https://img.shields.io/badge/License-MIT-green) ![Manager](https://img.shields.io/badge/Manager-Tampermonkey-orange)


## 📖 简介

在浏览 [好看视频](https://haokan.baidu.com/) 时，经常会发现一些有趣的搬运视频。如果您想去源平台（如抖音、B站）看高清原版、看弹幕或评论，复制标题再切换 APP 非常繁琐。

**HaoKanSearch** 在页面悬浮一个**现代化的胶囊式工具栏**，自动提取当前视频的纯净标题，让您一键跳转到目标平台搜索同款。

## ✨ 核心特性

### 1. 🎯 精准分流搜索
*   **独立入口**：采用 `[ 抖音 | B站 ]` 分体式设计，拒绝“点击一次弹两个窗”的干扰。想搜哪个平台，就点哪个平台。
*   **智能清洗**：自动去除标题中的 `🔥`、`😂` 等 Emoji 表情、`#话题`、`【高清】` 及平台后缀，确保搜索关键词干净、精准。

### 2. 🖐️ 极致交互体验
*   **胶囊设计**：半透明磨砂黑底 + 品牌色点缀（抖音红/B站蓝），UI 现代且不遮挡视线。
*   **随意拖拽**：按住胶囊空白处即可将其拖动到屏幕任意位置。
*   **位置记忆**：刷新页面或下次打开，按钮依然会停留在您熟悉的地方。
*   **边界吸附**：自动防止按钮被拖出屏幕外，窗口大小改变时自动复位。

### 3. ⚡ 高级功能
*   **跨标签页同步**：多开党福音！在 A 标签页移动了按钮，B 标签页的按钮会自动同步移动，位置始终统一。
*   **触屏支持**：完美支持 iPad、安卓平板及手机浏览器，手指也能流畅拖拽。
*   **全屏隐身**：看视频全屏时自动隐藏，退出全屏自动出现，零视觉干扰。
*   **右键复制**：在按钮上点击**鼠标右键**，即可将清洗后的纯净标题复制到剪贴板。

## 📦 安装指南
[![安装脚本](https://img.shields.io/badge/安装-油猴脚本-green?style=for-the-badge&logo=tampermonkey)](https://github.com/SeekFreeSky/HaoKanSearch/raw/refs/heads/main/HaoKanSearch.user.js)

1.  请先安装油猴脚本管理器：
    *   [Tampermonkey (Chrome/Edge/Firefox)](https://www.tampermonkey.net/)
    *   [Violentmonkey](https://violentmonkey.github.io/)
2.  **[点击此处安装脚本](https://github.com/SeekFreeSky/HaoKanSearch/blob/main/HaoKanSearch.user.js)**
    *(注：如果链接未生效，请直接点击仓库中的 `HaoKanSearch.user.js` 文件进行安装)*
3.  打开任意 [好看视频播放页](https://haokan.baidu.com/)，即可在页面右侧看到悬浮胶囊。

## 🎮 使用说明

| 区域 | 操作 | 效果 |
| :--- | :--- | :--- |
| **抖音图标** | 左键点击 | 新标签页打开 **抖音** 搜索结果 |
| **B站图标** | 左键点击 | 新标签页打开 **Bilibili** 搜索结果 |
| **空白处** | 按住拖动 | 移动悬浮窗位置 (自动保存) |
| **任意处** | 右键点击 | 复制清洗后的**视频标题**到剪贴板 |

## 🛠️ 更新日志

### v0.0.8 (2023-10-xx)
*   🎨 **UI 重构**：改为胶囊式分体按钮，提供独立的抖音/B站搜索入口。
*   🖱️ **交互优化**：优化光标逻辑，平时为“小手(Pointer)”，仅在拖拽时显示“移动(Move)”图标。
*   🔧 **修复**：解决了旧版本点击一次弹出两个页面的问题。

### v0.0.7
*   🔄 **同步**：新增 `GM_addValueChangeListener` 实现跨标签页位置实时同步。
*   🧹 **清洗**：增强标题清洗正则，过滤特殊空白符和 Emoji。
*   🛡️ **安全**：优化跳转逻辑，防止被浏览器拦截弹窗。

### v0.0.5 - v0.0.6
*   💾 **记忆**：增加位置记忆与边界检测功能。
*   📱 **兼容**：增加移动端 Touch 事件支持。

## 🤝 贡献与反馈

如果您在使用过程中发现任何问题，或有新的功能建议（例如支持更多搜索引擎），欢迎提交 [Issue](https://github.com/SeekFreeSky/HaoKanSearch/issues)。

---
*Created by SeekFreeSky*
