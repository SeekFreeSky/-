// ==UserScript==
// @name         好看视频标题搜索
// @namespace    https://github.com/SeekFreeSky/HaoKanSearch
// @version      0.0.8
// @description  [交互重构] 拆分抖音和B站搜索按钮，独立跳转；优化光标体验；保留防丢失、跨标签同步等高级功能。
// @author       SeekFreeSky
// @downloadURL  https://github.com/SeekFreeSky/HaoKanSearch/blob/main/HaoKanSearch.user.js
// @updateURL    https://github.com/SeekFreeSky/HaoKanSearch/blob/main/HaoKanSearch.user.js
// @match        *://haokan.baidu.com/*
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
        theme: {
            bg: 'rgba(0, 0, 0, 0.75)', // 半透明黑底，更显高级
            text: '#fff',
            hover: 'rgba(0, 0, 0, 0.9)',
            douyinColor: '#fe2c55', // 抖音红
            biliColor: '#23ade5',   // B站蓝
            shadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
        }
    };
 
    // ================= 样式区 =================
    const css = `
        /* 主容器：胶囊形状 */
        #hk-search-wrapper {
            position: fixed;
            z-index: 2147483647;
            display: flex;
            align-items: center;
            background: ${CONFIG.theme.bg};
            backdrop-filter: blur(5px);
            border-radius: 50px;
            box-shadow: ${CONFIG.theme.shadow};
            padding: 4px;
            user-select: none;
            transition: transform 0.1s, background 0.2s;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            /* 关键：默认光标改为“默认”，只有拖拽时逻辑处理，不再强制显示十字架 */
            cursor: default; 
        }
        
        /* 内部按钮样式 */
        .hk-btn-item {
            padding: 6px 12px;
            font-size: 13px;
            color: white;
            cursor: pointer; /* 鼠标放上去变小手 */
            border-radius: 20px;
            transition: background 0.2s;
            display: flex;
            align-items: center;
            font-weight: 500;
        }
        
        .hk-btn-item:hover {
            background: rgba(255,255,255,0.15);
        }
 
        /* 分割线 */
        .hk-divider {
            width: 1px;
            height: 14px;
            background: rgba(255,255,255,0.3);
            margin: 0 2px;
        }
 
        /* 抖音专属色点缀 */
        .hk-icon-dy {
            display: inline-block; width: 8px; height: 8px; 
            background: ${CONFIG.theme.douyinColor}; 
            border-radius: 50%; margin-right: 6px;
        }
        /* B站专属色点缀 */
        .hk-icon-bi {
            display: inline-block; width: 8px; height: 8px; 
            background: ${CONFIG.theme.biliColor}; 
            border-radius: 50%; margin-right: 6px;
        }
 
        /* 拖拽中样式 */
        #hk-search-wrapper.dragging {
            opacity: 0.9;
            transform: scale(1.02);
            cursor: move; /* 只有真正拖动时才变成移动图标 */
        }
 
        :fullscreen #hk-search-wrapper { display: none !important; }
        
        /* 提示框 */
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
 
    // 执行搜索
    function performSearch(site) {
        let keyword = getTitle();
        if (!keyword) {
            showToast("⏳ 页面加载中，请稍后...");
            return;
        }
        
        showToast(`🚀 ${site}搜索: ${keyword.substring(0,8)}...`);
        const encoded = encodeURIComponent(keyword);
        
        let url = "";
        if (site === '抖音') {
            url = `https://www.douyin.com/search/${encoded}`;
        } else if (site === 'B站') {
            url = `https://www.bilibili.com/search?keyword=${encoded}`;
        }
        
        if(url) GM_openInTab(url, { active: true, insert: true });
    }
 
    function createUI() {
        if (document.getElementById('hk-search-wrapper')) return;
 
        // 创建主容器
        const wrapper = document.createElement("div");
        wrapper.id = "hk-search-wrapper";
        wrapper.title = "按住空白处可拖拽 | 右键复制标题";
        
        // 创建内部结构：[抖音搜] | [B站搜]
        wrapper.innerHTML = `
            <div class="hk-btn-item" id="hk-btn-douyin">
                <span class="hk-icon-dy"></span>抖音
            </div>
            <div class="hk-divider"></div>
            <div class="hk-btn-item" id="hk-btn-bili">
                <span class="hk-icon-bi"></span>B站
            </div>
        `;
 
        // --- 坐标与同步逻辑 (保留原版精华) ---
        const setPos = (left, top) => {
            const maxL = window.innerWidth - wrapper.offsetWidth - 10;
            const maxT = window.innerHeight - wrapper.offsetHeight - 10;
            // 确保不溢出，且有默认位置
            const finalL = Math.max(0, Math.min(left, isNaN(maxL) ? window.innerWidth - 160 : maxL));
            const finalT = Math.max(50, Math.min(top, isNaN(maxT) ? 120 : maxT));
            
            wrapper.style.left = finalL + 'px';
            wrapper.style.top = finalT + 'px';
        };
 
        const restorePosition = () => {
            const l = parseInt(GM_getValue('pos_left', window.innerWidth - 180));
            const t = parseInt(GM_getValue('pos_top', 120));
            setPos(l, t);
        };
        
        // 挂载到页面
        document.body.appendChild(wrapper);
        // 挂载后再计算一次位置（因为有了宽度）
        setTimeout(restorePosition, 0);
 
        // 跨标签监听
        try {
            GM_addValueChangeListener('pos_top', (name, oldVal, newVal, remote) => {
                if (remote) restorePosition();
            });
        } catch(e) {}
 
        // --- 拖拽与点击逻辑 (区分精细) ---
        let isDragging = false;
        let startX, startY, startL, startT;
 
        const onStart = (cx, cy) => {
            isDragging = false;
            startX = cx; startY = cy;
            const rect = wrapper.getBoundingClientRect();
            startL = rect.left; startT = rect.top;
        };
 
        const onMove = (cx, cy) => {
            // 移动超过 3px 才算拖拽，防止点击时的微颤
            if (Math.abs(cx - startX) > 3 || Math.abs(cy - startY) > 3) {
                isDragging = true;
                wrapper.classList.add('dragging');
                const newL = startL + (cx - startX);
                const newT = startT + (cy - startY);
                wrapper.style.left = newL + 'px';
                wrapper.style.top = newT + 'px';
            }
        };
 
        const onEnd = () => {
            wrapper.classList.remove('dragging');
            if (isDragging) {
                const rect = wrapper.getBoundingClientRect();
                GM_setValue('pos_left', rect.left);
                GM_setValue('pos_top', rect.top);
            }
        };
 
        // 绑定拖拽事件到主容器
        wrapper.addEventListener('mousedown', e => {
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
 
        // 触摸支持
        wrapper.addEventListener('touchstart', e => {
            if (e.touches.length > 1) return;
            // 不阻止默认，否则没法点击内部按钮？需要测试
            // e.preventDefault(); 
            onStart(e.touches[0].clientX, e.touches[0].clientY);
        }, {passive:true});
        
        wrapper.addEventListener('touchmove', e => {
            if(isDragging) e.preventDefault(); // 只有拖拽时阻止滚动
            onMove(e.touches[0].clientX, e.touches[0].clientY);
        }, {passive:false});
        
        wrapper.addEventListener('touchend', onEnd);
 
        // --- 按钮点击事件 ---
        // 注意：这里需要阻止事件冒泡吗？不需要，因为拖拽逻辑有 isDragging 保护
        
        document.getElementById('hk-btn-douyin').addEventListener('click', (e) => {
            e.stopPropagation(); // 防止触发其他逻辑
            if (!isDragging) performSearch('抖音');
        });
 
        document.getElementById('hk-btn-bili').addEventListener('click', (e) => {
            e.stopPropagation();
            if (!isDragging) performSearch('B站');
        });
 
        // 右键复制
        wrapper.addEventListener('contextmenu', e => {
            e.preventDefault();
            if (isDragging) return;
            const k = getTitle();
            if (k) {
                GM_setClipboard(k);
                showToast("✅ 标题已复制");
            }
        });
        
        // 窗口大小改变
        window.addEventListener('resize', () => setTimeout(restorePosition, 300));
    }
 
    // --- 守卫 ---
    let lastUrl = location.href;
    setInterval(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            check();
        }
        if (!document.getElementById('hk-search-wrapper')) {
            createUI();
            check();
        }
    }, 1000);
 
    function check() {
        const wrapper = document.getElementById('hk-search-wrapper');
        if (!wrapper) return;
        const isVideo = location.href.includes('/v') || !!document.querySelector('video');
        wrapper.style.display = isVideo ? 'flex' : 'none';
    }
 
    createUI();
    check();
})();
