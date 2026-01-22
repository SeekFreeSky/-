// ==UserScript==
// @name         好看视频标题搜索
// @namespace    http://tampermonkey.net/
// @version      0.0.4
// @description  在好看视频网页中添加可拖拽按钮：左键点击在抖音/B站搜索，右键点击复制标题。支持自动隐藏、智能提取。
// @author       SeekFreeSky
// @downloadURL  https://github.com/SeekFreeSky/HaoKanSearch/blob/main/HaoKanSearch.user.js
// @updateURL    https://github.com/SeekFreeSky/HaoKanSearch/blob/main/HaoKanSearch.user.js
// @match        *://haokan.baidu.com/*
// @grant        GM_openInTab
// @grant        GM_addStyle
// @grant        GM_setClipboard
// @run-at       document-idle
// @license      MIT
// ==/UserScript==
 
(function() {
    'use strict';
 
    // 配置：初始位置
    const INITIAL_TOP = "120px";
    const INITIAL_RIGHT = "20px";
 
    // 1. 样式定义 (增加抓手光标，增加不可选属性防止拖拽时选中文字)
    const css = `
        #hk-search-btn {
            position: fixed;
            top: ${INITIAL_TOP};
            right: ${INITIAL_RIGHT};
            z-index: 99999;
            padding: 8px 16px;
            font-size: 13px;
            background: linear-gradient(135deg, #2196F3, #21CBF3); /* 蓝色系，更专业 */
            color: white;
            border: none;
            border-radius: 30px;
            box-shadow: 0 4px 10px rgba(33, 150, 243, 0.4);
            cursor: move; /* 提示可拖拽 */
            user-select: none; /* 防止拖拽时文字被选中 */
            transition: opacity 0.3s, box-shadow 0.3s, transform 0.1s;
            font-family: sans-serif;
            white-space: nowrap;
        }
        #hk-search-btn:hover {
            opacity: 1;
            box-shadow: 0 6px 15px rgba(33, 150, 243, 0.6);
        }
        #hk-search-btn:active {
            transform: scale(0.95);
        }
        /* 全屏隐藏 */
        :fullscreen #hk-search-btn { display: none !important; }
        
        /* 简单的提示框样式 */
        .hk-toast {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.7);
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            z-index: 100000;
            font-size: 14px;
            animation: fadeInOut 2s ease forwards;
        }
        @keyframes fadeInOut {
            0% { opacity: 0; }
            10% { opacity: 1; }
            80% { opacity: 1; }
            100% { opacity: 0; }
        }
    `;
    GM_addStyle(css);
 
    // --- 核心逻辑区 ---
 
    // 判断是否在视频页
    function isVideoPage() {
        return location.href.includes('/v') || !!document.querySelector('video');
    }
 
    // 获取最纯净的标题 (优先级：Meta标签 > H1 > Title清洗)
    function getSmartTitle() {
        // 1. 尝试读取 Open Graph Title (通常最准)
        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle && ogTitle.content) {
            return ogTitle.content.trim();
        }
 
        // 2. 尝试读取 H1
        const h1 = document.querySelector('h1.video-info-title, h1');
        if (h1 && h1.innerText.trim()) {
            return h1.innerText.trim();
        }
 
        // 3. 保底：Title 清洗
        return document.title
            .replace(/[-_\|]\s*好看视频.*/g, '')
            .replace(/[-_\|]\s*百度.*/g, '')
            .replace(/【.*?】/g, '')
            .trim();
    }
 
    // 提示框函数
    function showToast(msg) {
        const toast = document.createElement('div');
        toast.className = 'hk-toast';
        toast.textContent = msg;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
    }
 
    // --- UI 创建与拖拽逻辑 ---
 
    function createDraggableButton() {
        if (document.getElementById('hk-search-btn')) return;
 
        const btn = document.createElement("button");
        btn.id = "hk-search-btn";
        btn.innerHTML = "🔍 搜同款 <span style='font-size:10px; opacity:0.8'>(右键复制)</span>";
        btn.title = "拖拽可移动 | 左键搜索 | 右键复制标题";
        document.body.appendChild(btn);
 
        // 1. 拖拽逻辑 (原生 JS 实现，不依赖库)
        let isDragging = false;
        let startX, startY, initialLeft, initialTop;
 
        btn.addEventListener('mousedown', (e) => {
            // 只有左键才能拖拽
            if (e.button !== 0) return;
            isDragging = false; // 初始状态
            startX = e.clientX;
            startY = e.clientY;
            
            // 获取当前位置
            const rect = btn.getBoundingClientRect();
            initialLeft = rect.left;
            initialTop = rect.top;
 
            const onMouseMove = (moveEvent) => {
                isDragging = true; // 只要移动了就算拖拽
                const dx = moveEvent.clientX - startX;
                const dy = moveEvent.clientY - startY;
                
                // 更新位置 (移除 right/bottom 定位，改为 top/left)
                btn.style.right = 'auto';
                btn.style.bottom = 'auto';
                btn.style.left = `${initialLeft + dx}px`;
                btn.style.top = `${initialTop + dy}px`;
            };
 
            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };
 
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
 
        // 2. 点击事件 (区分点击和拖拽)
        btn.addEventListener('click', (e) => {
            if (isDragging) return; // 如果是拖拽结束的点击，忽略之
            
            const keyword = getSmartTitle();
            if (!keyword) {
                showToast("未找到标题，请检查页面");
                return;
            }
            showToast(`正在搜索: ${keyword.substring(0, 10)}...`);
            const encoded = encodeURIComponent(keyword);
            GM_openInTab(`https://www.douyin.com/search/${encoded}`, { active: true, insert: true });
            GM_openInTab(`https://www.bilibili.com/search?keyword=${encoded}`, { active: false, insert: true });
        });
 
        // 3. 右键复制事件
        btn.addEventListener('contextmenu', (e) => {
            e.preventDefault(); // 阻止默认右键菜单
            if (isDragging) return;
 
            const keyword = getSmartTitle();
            if (keyword) {
                GM_setClipboard(keyword);
                showToast("✅ 标题已复制到剪贴板");
            } else {
                showToast("❌ 复制失败：未找到标题");
            }
        });
    }
 
    // --- 守卫逻辑 (代替 MutationObserver 和 History Hack) ---
 
    let lastUrl = location.href;
    
    // 每 500ms 检查一次 URL 变化和按钮状态
    // 这是最安全、最不干扰网页原生代码的方式
    setInterval(() => {
        // 1. 检查 URL 变化 (SPA 路由检测)
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            // URL 变了，说明可能切视频了，重新检查按钮状态
            checkVisibility();
        }
 
        // 2. 确保按钮存在 (防止被 React/Vue 重新渲染刷掉)
        if (!document.getElementById('hk-search-btn')) {
            createDraggableButton();
            checkVisibility();
        }
    }, 500);
 
    function checkVisibility() {
        const btn = document.getElementById('hk-search-btn');
        if (!btn) return;
 
        if (isVideoPage()) {
            btn.style.display = 'block';
        } else {
            btn.style.display = 'none';
        }
    }
 
    // 启动
    createDraggableButton();
    checkVisibility();
 
})();
