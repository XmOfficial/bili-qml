// content.js
const API_BASE = 'https://bili-qml.vercel.app/api';

// 获取或生成模拟用户 ID
async function getUserId() {
    return new Promise((resolve) => {
        try {
            chrome.storage.local.get(['userId'], (result) => {
                let userId = result.userId;
                if (!userId) {
                    userId = 'user_' + Math.random().toString(36).substr(2, 9);
                    chrome.storage.local.set({ userId }, () => {
                        console.log('[B站问号榜] 已生成新用户ID:', userId);
                        resolve(userId);
                    });
                } else {
                    resolve(userId);
                }
            });
        } catch (e) {
            console.error('[B站问号榜] 存储访问失败，使用临时ID', e);
            resolve('temp_' + Date.now());
        }
    });
}

// 获取当前视频的 BVID
function getBvid() {
    // 1. 从 URL 路径获取
    const pathParts = window.location.pathname.split('/');
    const bvidFromPath = pathParts.find(p => p.startsWith('BV'));
    if (bvidFromPath) return bvidFromPath;

    // 2. 从 URL 参数获取 (有些特殊页面)
    const urlParams = new URLSearchParams(window.location.search);
    const bvidFromParam = urlParams.get('bvid');
    if (bvidFromParam) return bvidFromParam;

    // 3. 从 B站原生变量获取 (最准确)
    const bvidFromWindow = window.__INITIAL_STATE__?.bvid || window.p_bvid;
    if (bvidFromWindow) return bvidFromWindow;
    
    return null;
}

let isInjecting = false;
let isSyncing = false; // 新增：正在同步状态的锁
let currentBvid = ''; // 记录当前页面正在处理的 BVID

// 同步按钮状态（亮或灭）及计数
async function syncButtonState() {
    const qBtn = document.getElementById('bili-qmr-btn');
    if (!qBtn) return;

    const bvid = getBvid();
    if (!bvid) return;

    if (isSyncing) return;
    
    try {
        isSyncing = true;
        const userId = await getUserId();
        // 增加 _t 参数防止浏览器缓存 GET 请求
        const statusRes = await fetch(`${API_BASE}/status?bvid=${bvid}&userId=${userId}&_t=${Date.now()}`);
        const statusData = await statusRes.json();
        
        console.log(`[B站问号榜] 状态同步 | BVID: ${bvid} | UserID: ${userId} | 已点亮: ${statusData.active}`);
        
        if (statusData.active) {
            qBtn.classList.add('active');
        } else {
            qBtn.classList.remove('active');
        }
        
        // 更新显示的数量
        const countText = qBtn.querySelector('.qmr-text');
        if (countText) {
            const newText = statusData.count > 0 ? formatCount(statusData.count) : '问号';
            if (countText.innerText !== newText) {
                countText.innerText = newText;
            }
        }

        currentBvid = bvid;
    } catch (e) {
        console.error('[B站问号榜] 同步状态失败:', e);
    } finally {
        isSyncing = false;
    }
}

// 格式化数字显示（参考B站风格，如 1.2w）
function formatCount(num) {
    if (num >= 10000) {
        return (num / 10000).toFixed(1) + '万';
    }
    return num.toString();
}

async function injectQuestionButton() {
    try {
        const bvid = getBvid();
        if (!bvid) return;

        // 1. 寻找精准参考位置：分享按钮或包含“复制链接”的区域
        let anchor = document.querySelector('.video-share') || 
                     document.querySelector('.share-info') ||
                     document.querySelector('.video-toolbar-share') ||
                     document.querySelector('.video-toolbar-left-item.share');

        // 如果没找到具体的分享按钮，再退而求其次找左侧工具栏
        if (!anchor) {
            anchor = document.querySelector('.video-toolbar-left') || 
                     document.querySelector('.toolbar-left') ||
                     document.querySelector('.video-toolbar-container .left-operations');
        }

        if (!anchor) return;

        let qBtn = document.getElementById('bili-qmr-btn');
        
        // 2. 如果按钮不存在，创建并挂载
        if (!qBtn) {
            if (isInjecting) return;
            isInjecting = true;
            
            qBtn = document.createElement('div');
            qBtn.id = 'bili-qmr-btn';
            qBtn.style.cssText = `
                position: absolute;
                z-index: 10000;
                cursor: pointer;
                display: flex;
                align-items: center;
                transition: opacity 0.3s;
                pointer-events: auto;
                white-space: nowrap;
            `;
            qBtn.innerHTML = `
                <div class="qmr-icon-wrap" style="display: flex; align-items: center; color: #61666d;">
                    <span class="qmr-icon" style="font-size: 18px; margin-right: 4px;">?</span>
                    <span class="qmr-text" style="font-size: 13px;">...</span>
                </div>
            `;
            document.body.appendChild(qBtn);
            
            const userId = await getUserId();
            qBtn.onclick = async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const activeBvid = getBvid(); 
                const title = document.querySelector('.video-title')?.innerText || document.title;
                if (!activeBvid) return;
                try {
                    qBtn.style.pointerEvents = 'none';
                    qBtn.style.opacity = '0.5';
                    const response = await fetch(`${API_BASE}/vote`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ bvid: activeBvid, title, userId })
                    });
                    if ((await response.json()).success) syncButtonState();
                } catch (err) {} finally { 
                    qBtn.style.pointerEvents = 'auto'; 
                    qBtn.style.opacity = '1';
                }
            };
            isInjecting = false;
        }

        // 3. 实时计算位置：放在锚点的右侧 15px 处
        const rect = anchor.getBoundingClientRect();
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // 定位在锚点元素的右边
        qBtn.style.left = `${rect.right + scrollLeft + 15}px`; 
        qBtn.style.top = `${rect.top + scrollTop}px`;
        qBtn.style.height = `${rect.height}px`;
        
        if (bvid !== currentBvid) syncButtonState();
    } catch (e) {
        isInjecting = false;
    }
}

// 增加滚动和缩放监听以保持位置同步
window.addEventListener('scroll', injectQuestionButton, { passive: true });
window.addEventListener('resize', injectQuestionButton, { passive: true });

// 防抖函数
function debounce(fn, delay) {
    let timer = null;
    return function() {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, arguments), delay);
    }
}

let userIdCache = null;
async function getCachedUserId() {
    if (userIdCache) return userIdCache;
    userIdCache = await getUserId();
    return userIdCache;
}

const debouncedInject = debounce(injectQuestionButton, 500);

// 降低监听频率和范围，保护 B 站顶栏
const observer = new MutationObserver(debounce(() => {
    injectQuestionButton();
}, 1000)); // 进一步放慢频率

let lastUrl = location.href;

// 初始尝试 - 增加延迟，等 B 站顶栏加载完再动
setTimeout(() => {
    const mainApp = document.getElementById('app') || document.body;
    observer.observe(mainApp, { childList: true, subtree: true });
    injectQuestionButton();
    
    // 合并后的心跳检测
    setInterval(() => {
        const urlChanged = location.href !== lastUrl;
        if (urlChanged) {
            lastUrl = location.href;
            injectQuestionButton();
        } else {
            // 心跳检测：强制检查
            const btn = document.getElementById('bili-qmr-btn');
            const toolbar = document.querySelector('.video-toolbar-left') || 
                            document.querySelector('.toolbar-left') ||
                            document.querySelector('.video-toolbar-container .left-operations');
            
            if (toolbar && (!btn || !toolbar.contains(btn))) {
                injectQuestionButton();
            }
        }
        
        // 检查视频事件绑定
        const video = document.querySelector('video');
        if (video && !video.dataset.qmrListen) {
            video.dataset.qmrListen = 'true';
            video.addEventListener('play', () => setTimeout(injectQuestionButton, 500));
            video.addEventListener('pause', () => setTimeout(injectQuestionButton, 500));
        }
    }, 2000); // 心跳频率也降低
}, 2500); // 延迟 2.5 秒启动，避开顶栏渲染高峰期
