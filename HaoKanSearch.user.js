// ==UserScript==
// @name         好看视频标题搜索
// @namespace    http://tampermonkey.net/
// @version      0.0.5
// @description  在好看视频网页中添加按钮：支持位置记忆、触屏拖拽。左键搜索，右键复制。智能清洗Emoji。
// @author       SeekFreeSky
// @downloadURL  https://github.com/SeekFreeSky/HaoKanSearch/blob/main/HaoKanSearch.user.js
// @updateURL    https://github.com/SeekFreeSky/HaoKanSearch/blob/main/HaoKanSearch.user.js
// @match        *://haokan.baidu.com/*
// @grant        GM_openInTab
// @grant        GM_addStyle
// @grant        GM_setClipboard
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-idle
// @license      MIT
// ==/UserScript==
 
(function() {
    'use strict';
 
    // 1. 样式定义 (层级调至最高整数，防止被任何弹窗遮挡)
    const css = `
        #hk-search-btn {
            position: fixed;
            z-index: 2147483647; /* Max Z-Index */
            padding: 8px 16px;
            font-size: 13px;
            background: linear-gradient(135deg, #00C853, #64DD17); /* 鲜亮绿，护眼且醒目 */
            color: white;
            border: none;
            border-radius: 50px;
            box-shadow: 0 4px 12px rgba(0, 200, 83, 0.4);
            cursor: move;
            user-select: none;
            font-family: system-ui, -apple-system, sans-serif;
            white-space: nowrap;
            /* 防止点击时出现高亮框 */
            -webkit-tap-highlight-color: transparent;
            outline: none;
        }
        #hk-search-btn:active {
            transform: scale(0.95);
            box-shadow: 0 2px 8px rgba(0, 200, 83, 0.6);
        }
        /* 全屏隐藏 */
        :fullscreen #hk-search-btn { display: none !important; }
        
        /* 简单的提示框 */
        .hk-toast {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.8);
            color: #fff;
            padding: 12px 24px;
            border-radius: 8px;
            z-index: 2147483647;
            font-size: 14px;
            pointer-events: none;
            animation: hkFade 2s ease forwards;
        }
        @keyframes hkFade {
            0% { opacity: 0; transform: translate(-50%, -40%); }
            10% { opacity: 1; transform: translate(-50%, -50%); }
            80% { opacity: 1; }
            100% { opacity: 0; }
        }
    `;
    GM_addStyle(css);
 
    // --- 工具函数 ---
 
    function isVideoPage() {
        return location.href.includes('/v') || !!document.querySelector('video');
    }
 
    function getCleanTitle() {
        let title = "";
        
        // 1. 优先 Meta
        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle && ogTitle.content) title = ogTitle.content.trim();
        
        // 2. 其次 H1
        else {
            const h1 = document.querySelector('h1.video-info-title, h1');
            if (h1) title = h1.innerText.trim();
            else title = document.title;
        }
 
        // 3. 深度清洗 (新增：去除 Emoji 和 后缀)
        return title
            .replace(/[-_\|]\s*好看视频.*/g, '')
            .replace(/[-_\|]\s*百度.*/g, '')
            .replace(/【.*?】/g, '')
            // 去除 Emoji (Unicode Range)
            .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '') 
            // 去除常见符号
            .replace(/[🔥👍❤️]/g, '')
            .trim();
    }
 
    function showToast(msg) {
        const toast = document.createElement('div');
        toast.className = 'hk-toast';
        toast.textContent = msg;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
    }
 
    // --- 核心 UI 与交互 ---
 
    function createButton() {
        if (document.getElementById('hk-search-btn')) return;
 
        const btn = document.createElement("button");
        btn.id = "hk-search-btn";
        btn.innerHTML = "🔍 搜同款";
        btn.title = "拖拽移动 | 左键搜索 | 右键复制";
        
        // 读取记忆坐标 (如果没有记忆，默认 top:120, right:20)
        // 注意：我们存储的是具体的 top/left 数值
        const savedTop = GM_getValue('btn_top', '120px');
        const savedLeft = GM_getValue('btn_left', ''); // 默认 left 为空，使用 right
        
        btn.style.top = savedTop;
        if (savedLeft) {
            btn.style.left = savedLeft;
        } else {
            btn.style.right = '20px'; // 默认位置
        }
 
        document.body.appendChild(btn);
 
        // --- 统一拖拽逻辑 (兼容鼠标 & 触摸) ---
        let isDragging = false;
        let startX, startY, startLeft, startTop;
 
        // 处理开始
        const handleStart = (clientX, clientY) => {
            isDragging = false;
            startX = clientX;
            startY = clientY;
            const rect = btn.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;
        };
 
        // 处理移动
        const handleMove = (clientX, clientY) => {
            // 设置阈值，移动超过 3px 才算拖拽，防止点击抖动
            if (Math.abs(clientX - startX) > 3 || Math.abs(clientY - startY) > 3) {
                isDragging = true;
                const dx = clientX - startX;
                const dy = clientY - startY;
                
                // 拖拽时改为 left/top 定位
                btn.style.right = 'auto';
                btn.style.bottom = 'auto';
                btn.style.left = `${startLeft + dx}px`;
                btn.style.top = `${startTop + dy}px`;
            }
        };
 
        // 处理结束
        const handleEnd = () => {
            if (isDragging) {
                // 保存位置
                GM_setValue('btn_top', btn.style.top);
                GM_setValue('btn_left', btn.style.left);
            }
        };
 
        // 鼠标事件
        btn.addEventListener('mousedown', e => {
            if (e.button !== 0) return;
            handleStart(e.clientX, e.clientY);
            
            const onMouseMove = e => handleMove(e.clientX, e.clientY);
            const onMouseUp = () => {
                handleEnd();
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
 
        // 触摸事件 (手机/平板)
        btn.addEventListener('touchstart', e => {
            if (e.touches.length > 1) return; // 忽略多指
            e.preventDefault(); // 防止滚动屏幕
            handleStart(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: false });
 
        btn.addEventListener('touchmove', e => {
            e.preventDefault();
            handleMove(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: false });
 
        btn.addEventListener('touchend', () => handleEnd());
 
        // --- 点击与业务逻辑 ---
        
        const performSearch = () => {
            if (isDragging) return;
            
            const keyword = getCleanTitle();
            if (!keyword) {
                showToast("⚠️ 未获取到标题");
                return;
            }
            showToast(`🚀 搜索: ${keyword.substring(0, 10)}...`);
            const encoded = encodeURIComponent(keyword);
            GM_openInTab(`https://www.douyin.com/search/${encoded}`, { active: true, insert: true });
            GM_openInTab(`https://www.bilibili.com/search?keyword=${encoded}`, { active: false, insert: true });
        };
 
        // 绑定点击 (兼容触摸点击)
        btn.addEventListener('click', performSearch);
        btn.addEventListener('touchend', e => {
            // 如果没有发生拖拽，则触发点击逻辑
            if (!isDragging) performSearch();
        });
 
        // 右键复制
        btn.addEventListener('contextmenu', e => {
            e.preventDefault();
            if (isDragging) return;
            const keyword = getCleanTitle();
            if (keyword) {
                GM_setClipboard(keyword);
                showToast("✅ 标题已复制");
            }
        });
    }
 
    // --- 守卫与轮询 ---
    let lastUrl = location.href;
    setInterval(() => {
        // 路由检测
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            checkState();
        }
        // DOM检测
        if (!document.getElementById('hk-search-btn')) {
            createButton();
            checkState();
        }
    }, 800);
 
    function checkState() {
        const btn = document.getElementById('hk-search-btn');
        if (!btn) return;
        btn.style.display = isVideoPage() ? 'block' : 'none';
    }
 
    // 启动
    createButton();
    checkState();
})();
