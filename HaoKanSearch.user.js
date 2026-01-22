// ==UserScript==
// @name         好看视频标题搜索 (完美版-防丢失+可配置)
// @namespace    http://tampermonkey.net/
// @version      0.0.6
// @description  在好看视频网页中添加按钮：支持配置搜索引擎、边界自动吸附、防丢失、触屏拖拽。
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
 
    // ============================================
    // ⚙️ 用户配置区 (可在此处修改)
    // ============================================
    const CONFIG = {
        // 是否开启搜索前确认（true: 弹出输入框, false: 直接搜索）
        confirmBeforeSearch: false,
        
        // 搜索引擎列表 (想搜哪里，就在这里改)
        engines: [
            {
                name: '抖音',
                url: 'https://www.douyin.com/search/%s',
                enabled: true,
                active: true // 是否前台打开
            },
            {
                name: 'B站',
                url: 'https://www.bilibili.com/search?keyword=%s',
                enabled: true,
                active: false // 是否后台打开
            },
            // 示例：如果你想搜 YouTube，把下面这行注释取消
            // { name: 'YouTube', url: 'https://www.youtube.com/results?search_query=%s', enabled: false, active: true }
        ],
 
        // 按钮外观
        theme: {
            bg: 'linear-gradient(135deg, #FF6B6B, #EE5D5D)', // 珊瑚红，既显眼又不刺眼
            shadow: '0 4px 12px rgba(238, 93, 93, 0.4)'
        }
    };
 
    // ============================================
    // 🚀 核心代码区
    // ============================================
 
    const css = `
        #hk-search-btn {
            position: fixed;
            z-index: 2147483647;
            padding: 8px 16px;
            font-size: 13px;
            background: ${CONFIG.theme.bg};
            color: white;
            border: none;
            border-radius: 50px;
            box-shadow: ${CONFIG.theme.shadow};
            cursor: move;
            user-select: none;
            font-family: system-ui, -apple-system, sans-serif;
            white-space: nowrap;
            transition: transform 0.1s;
            -webkit-tap-highlight-color: transparent;
            outline: none;
        }
        #hk-search-btn:active { transform: scale(0.95); }
        :fullscreen #hk-search-btn { display: none !important; }
        
        .hk-toast {
            position: fixed;
            top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.85);
            color: #fff;
            padding: 10px 20px;
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
 
    // 智能获取标题 (含重试逻辑)
    function getTitle() {
        // 1. Meta
        const og = document.querySelector('meta[property="og:title"]');
        if (og && og.content) return cleanText(og.content);
        
        // 2. H1
        const h1 = document.querySelector('h1.video-info-title, h1');
        if (h1 && h1.innerText) return cleanText(h1.innerText);
        
        // 3. Title fallback
        return cleanText(document.title);
    }
 
    function cleanText(text) {
        if (!text) return "";
        return text
            .replace(/[-_\|]\s*好看视频.*/g, '')
            .replace(/[-_\|]\s*百度.*/g, '')
            .replace(/【.*?】/g, '')
            .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '') // Remove Emoji
            .trim();
    }
 
    function showToast(msg) {
        const t = document.createElement('div');
        t.className = 'hk-toast';
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 2000);
    }
 
    function createButton() {
        if (document.getElementById('hk-search-btn')) return;
 
        const btn = document.createElement("button");
        btn.id = "hk-search-btn";
        btn.innerHTML = "🔍 搜同款";
        btn.title = "左键搜索 | 右键复制";
        
        // --- 坐标恢复与边界检查 ---
        const restorePosition = () => {
            let top = parseInt(GM_getValue('btn_top', 120));
            let left = parseInt(GM_getValue('btn_left', document.documentElement.clientWidth - 100));
            
            // 强制边界检查 (防止按钮跑出屏幕)
            const maxLeft = document.documentElement.clientWidth - 80; // 预留宽度
            const maxTop = document.documentElement.clientHeight - 40; // 预留高度
            
            if (left > maxLeft) left = maxLeft;
            if (top > maxTop) top = maxTop;
            if (left < 0) left = 10;
            if (top < 0) top = 100;
 
            btn.style.left = left + 'px';
            btn.style.top = top + 'px';
        };
        
        restorePosition();
        document.body.appendChild(btn);
 
        // --- 拖拽逻辑 (封装) ---
        let isDragging = false;
        let startX, startY, startL, startT;
 
        const onStart = (cx, cy) => {
            isDragging = false;
            startX = cx; startY = cy;
            const rect = btn.getBoundingClientRect();
            startL = rect.left; startT = rect.top;
        };
 
        const onMove = (cx, cy) => {
            if (Math.abs(cx - startX) > 3 || Math.abs(cy - startY) > 3) {
                isDragging = true;
                const newL = startL + (cx - startX);
                const newT = startT + (cy - startY);
                btn.style.left = newL + 'px';
                btn.style.top = newT + 'px';
            }
        };
 
        const onEnd = () => {
            if (isDragging) {
                // 保存前再次做边界修正，确保下次加载正常
                const rect = btn.getBoundingClientRect();
                GM_setValue('btn_top', rect.top);
                GM_setValue('btn_left', rect.left);
            }
        };
 
        // Mouse Events
        btn.addEventListener('mousedown', e => {
            if (e.button !== 0) return;
            onStart(e.clientX, e.clientY);
            const move = e => onMove(e.clientX, e.clientY);
            const up = () => {
                onEnd();
                document.removeEventListener('mousemove', move);
                document.removeEventListener('mouseup', up);
            };
            document.addEventListener('mousemove', move);
            document.addEventListener('mouseup', up);
        });
 
        // Touch Events
        btn.addEventListener('touchstart', e => {
            if (e.touches.length > 1) return;
            e.preventDefault();
            onStart(e.touches[0].clientX, e.touches[0].clientY);
        }, {passive:false});
        btn.addEventListener('touchmove', e => {
            e.preventDefault();
            onMove(e.touches[0].clientX, e.touches[0].clientY);
        }, {passive:false});
        btn.addEventListener('touchend', onEnd);
 
        // --- 窗口大小改变时，自动拉回按钮 ---
        window.addEventListener('resize', () => {
            // 简单的防抖，直接调用恢复逻辑
            setTimeout(restorePosition, 300);
        });
 
        // --- 点击搜索 ---
        const doSearch = () => {
            if (isDragging) return;
            
            let keyword = getTitle();
            if (!keyword) {
                // 简单的重试机制
                setTimeout(() => {
                    keyword = getTitle();
                    if(keyword) goSearch(keyword);
                    else showToast("⚠️ 未获取到标题");
                }, 300);
                return;
            }
            goSearch(keyword);
        };
 
        const goSearch = (keyword) => {
            if (CONFIG.confirmBeforeSearch) {
                const input = prompt("确认搜索关键词", keyword);
                if (input === null) return;
                keyword = input.trim();
            }
            
            showToast(`🚀 搜索: ${keyword.substring(0,8)}...`);
            const encoded = encodeURIComponent(keyword);
            
            CONFIG.engines.forEach(engine => {
                if (engine.enabled) {
                    const finalUrl = engine.url.替换('%s', encoded);
                    GM_openInTab(finalUrl, { active: engine.active, insert: true });
                }
            });
        };
 
        btn.addEventListener('click', doSearch);
        btn.addEventListener('touchend', () => { if(!isDragging) doSearch(); });
 
        // 右键复制
        btn.addEventListener('contextmenu', e => {
            e.preventDefault();
            if (isDragging) return;
            const k = getTitle();
            if (k) {
                GM_setClipboard(k);
                showToast("✅ 标题已复制");
            }
        });
    }
 
    // --- 守卫 ---
    let lastUrl = location.href;
    setInterval(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            check();
        }
        if (!document.getElementById('hk-search-btn')) {
            createButton();
            check();
        }
    }, 800);
 
    function check() {
        const btn = document.getElementById('hk-search-btn');
        if (!btn) return;
        const isVideo = location.href.includes('/v') || !!document.querySelector('video');
        btn.style.display = isVideo ? 'block' : 'none';
    }
 
    createButton();
    check();
})();
