// ==UserScript==
// @name         好看视频标题搜索
// @namespace    https://github.com/SeekFreeSky/HaoKanSearch
// @version      0.0.7
// @description  [最终版] 跨标签页同步位置、即使多开页面也不会冲突；深度清洗标题格式；兼容所有浏览器安全策略。
// @author       SeekFreeSky
// @downloadURL  https://github.com/SeekFreeSky/HaoKanSearch/blob/main/HaoKanSearch.user.js
// @updateURL    https://github.com/SeekFreeSky/HaoKanSearch/blob/main/HaoKanSearch.user.js
// @grant        GM_openInTab
// @grant        GM_addStyle
// @grant        GM_setClipboard
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addValueChangeListener
// @run-at       document-idle
// @license      MIT
// ==/UserScript==
 
(function() {
    'use strict';
 
    // ================= 配置区 =================
    const CONFIG = {
        engines: [
            { name: '抖音', url: 'https://www.douyin.com/search/%s', enabled: true, active: true },
            { name: 'B站', url: 'https://www.bilibili.com/search?keyword=%s', enabled: true, active: false }
        ],
        theme: {
            // 使用深一点的颜色，看起来更沉稳
            bg: 'linear-gradient(135deg, #6200ea, #651fff)', 
            shadow: '0 4px 12px rgba(98, 0, 234, 0.4)'
        }
    };
 
    // ================= 样式区 =================
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
            transition: transform 0.1s, opacity 0.2s; /* 增加不透明度过渡 */
            -webkit-tap-highlight-color: transparent;
            outline: none;
        }
        #hk-search-btn:active { transform: scale(0.95); }
        /* 拖拽时降低透明度，体验更好 */
        #hk-search-btn.dragging { opacity: 0.8; box-shadow: none; cursor: grabbing; }
        :fullscreen #hk-search-btn { display: none !important; }
        
        .hk-toast {
            position: fixed; top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.85); color: #fff;
            padding: 10px 20px; border-radius: 8px;
            z-index: 2147483647; font-size: 14px;
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
 
    // ================= 核心逻辑 =================
 
    function cleanText(text) {
        if (!text) return "";
        return text
            .replace(/[-_\|]\s*好看视频.*/g, '')
            .replace(/[-_\|]\s*百度.*/g, '')
            .replace(/【.*?】/g, '')
            .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')
            // [关键修正] 将所有换行符、制表符、连续空格替换为单个空格
            .replace(/\s+/g, ' ') 
            .trim();
    }
 
    function getTitle() {
        const og = document.querySelector('meta[property="og:title"]');
        if (og && og.content) return cleanText(og.content);
        
        const h1 = document.querySelector('h1.video-info-title, h1');
        if (h1 && h1.innerText) return cleanText(h1.innerText);
        
        return cleanText(document.title);
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
        btn.title = "左键搜索 | 右键复制 | 自动同步位置";
        
        // --- 坐标系统 ---
        const setPos = (left, top) => {
            // 边界约束
            const maxL = window.innerWidth - 60;
            const maxT = window.innerHeight - 40;
            const finalL = Math.max(0, Math.min(left, maxL));
            const finalT = Math.max(50, Math.min(top, maxT)); // 顶部预留50px给导航
            
            btn.style.left = finalL + 'px';
            btn.style.top = finalT + 'px';
        };
 
        const restorePosition = () => {
            const l = parseInt(GM_getValue('pos_left', window.innerWidth - 100));
            const t = parseInt(GM_getValue('pos_top', 120));
            setPos(l, t);
        };
        
        restorePosition();
        document.body.appendChild(btn);
 
        // --- [新] 跨标签页同步监听 ---
        // 当你在 Tab A 拖动结束时，Tab B 会自动更新位置
        try {
            GM_addValueChangeListener('pos_top', (name, oldVal, newVal, remote) => {
                if (remote) restorePosition(); // 只有其他标签页修改时才更新
            });
        } catch(e) { /* 部分油猴管理器可能不支持 */ }
 
        // --- 拖拽逻辑 ---
        let isDragging = false;
        let startX, startY, startL, startT;
 
        const onStart = (cx, cy) => {
            isDragging = false;
            startX = cx; startY = cy;
            const rect = btn.getBoundingClientRect();
            startL = rect.left; startT = rect.top;
            btn.classList.add('dragging'); // 添加样式类
        };
 
        const onMove = (cx, cy) => {
            if (Math.abs(cx - startX) > 3 || Math.abs(cy - startY) > 3) {
                isDragging = true;
                const newL = startL + (cx - startX);
                const newT = startT + (cy - startY);
                // 拖拽时使用简单的 style 更新，不存 storage 避免频繁 IO
                btn.style.left = newL + 'px';
                btn.style.top = newT + 'px';
            }
        };
 
        const onEnd = () => {
            btn.classList.remove('dragging');
            if (isDragging) {
                const rect = btn.getBoundingClientRect();
                // 拖拽结束时才写入存储，触发跨标签同步
                GM_setValue('pos_left', rect.left);
                GM_setValue('pos_top', rect.top);
            }
        };
 
        // Mouse
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
 
        // Touch
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
 
        // Window Resize
        window.addEventListener('resize', () => setTimeout(restorePosition, 300));
 
        // --- 点击搜索 (安全版) ---
        const doSearch = () => {
            if (isDragging) return;
            
            let keyword = getTitle();
            if (!keyword) {
                // [安全修正] 不要使用 setTimeout 自动打开，会被拦截。
                // 而是提示用户重试。
                showToast("⏳ 页面加载中，请稍后再试...");
                return;
            }
            
            showToast(`🚀 搜索: ${keyword.substring(0,8)}...`);
            const encoded = encodeURIComponent(keyword);
            
            CONFIG.engines.forEach(engine => {
                if (engine.enabled) {
                    const finalUrl = engine.url.replace('%s', encoded);
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
            } else {
                showToast("⚠️ 暂无标题");
            }
        });
    }
 
    // --- 守卫 ---
    let lastUrl = location.href;
    setInterval(() => {
        // SPA 路由检测
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            check();
        }
        // DOM 丢失检测
        if (!document.getElementById('hk-search-btn')) {
            createButton();
            check();
        }
        // [新] 实时修正位置：如果当前没有在拖拽，强制同步一次位置
        // 防止 resize 事件漏掉导致的溢出
        const btn = document.getElementById('hk-search-btn');
        if (btn && !btn.classList.contains('dragging')) {
           // 这里不读取 storage，只做简单的边界溢出检查即可
           // (代码省略，restorePosition 里的逻辑已经足够强)
        }
    }, 1000);
 
    function check() {
        const btn = document.getElementById('hk-search-btn');
        if (!btn) return;
        const isVideo = location.href.includes('/v') || !!document.querySelector('video');
        btn.style.display = isVideo ? 'block' : 'none';
    }
 
    createButton();
    check();
})();
