const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const moment = require('moment');

const app = express();
const PORT = process.env.PORT || 3000;

// Redis 配置
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// 辅助函数：与 Redis 交互
async function getDB() {
    try {
        const res = await fetch(`${REDIS_URL}/get/votes`, {
            headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
        });
        const data = await res.json();
        if (!data.result) return {};
        
        let parsed = JSON.parse(data.result);
        // 关键修复：如果解析出来还是字符串（双重序列化），再解析一次
        if (typeof parsed === 'string') {
            parsed = JSON.parse(parsed);
        }
        return (parsed && typeof parsed === 'object') ? parsed : {};
    } catch (e) {
        console.error('Redis 读取失败', e);
        return {};
    }
}

async function setDB(data) {
    try {
        await fetch(`${REDIS_URL}/set/votes`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
            body: JSON.stringify(data) // 关键修复：只进行一次序列化
        });
    } catch (e) {
        console.error('Redis 写入失败', e);
    }
}

app.use(cors({
    origin: ['https://www.bilibili.com', 'chrome-extension://*'],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());

// 安全中间件：检查请求头，增加简单的防刷逻辑
const securityCheck = (req, res, next) => {
    const origin = req.headers.origin;
    const userAgent = req.headers['user-agent'];
    
    // 简单的防爬虫逻辑
    if (!userAgent || userAgent.includes('axios') || userAgent.includes('node-fetch')) {
        return res.status(403).json({ success: false, error: 'Access Denied' });
    }
    next();
};

// 禁用所有 API 的缓存
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
});

// 根路径欢迎页
app.get('/', (req, res) => {
    res.send('<h1>B站问号榜服务器已启动 ❓</h1><p>已连接至云数据库。</p>');
});

// 处理浏览器自动请求 favicon 的问题，防止 404 报错
app.get('/favicon.ico', (req, res) => res.status(204).end());

// 处理 robots.txt，告诉爬虫哪些可以爬
app.get('/robots.txt', (req, res) => {
    res.type('text/plain');
    res.send("User-agent: *\nDisallow: /api/\nDisallow: /vote\nAllow: /");
});

// 处理常见的恶意扫描路径，直接返回 404，防止产生大量警告日志
const scannerPaths = [
    '/wp-admin',
    '/wordpress',
    '/.env',
    '/.git',
    '/phpmyadmin',
    '/xmlrpc.php',
    '/setup-config.php'
];

app.use((req, res, next) => {
    if (scannerPaths.some(p => req.path.toLowerCase().includes(p.toLowerCase()))) {
        return res.status(404).end();
    }
    next();
});

// 处理投票
app.post(['/api/vote', '/vote'], async (req, res) => {
    try {
        const { bvid, title, userId } = req.body;
        if (!bvid || !userId) return res.status(400).json({ success: false });

        let data = await getDB();
        
        // 确保 data 是对象且包含 bvid 路径
        if (!data || typeof data !== 'object') data = {};
        if (!data[bvid] || typeof data[bvid] !== 'object') {
            data[bvid] = { title: title || '未知视频', votes: {} };
        }
        if (!data[bvid].votes) {
            data[bvid].votes = {};
        }

        let active = false;
        if (data[bvid].votes[userId]) {
            delete data[bvid].votes[userId];
            active = false;
        } else {
            data[bvid].votes[userId] = Date.now();
            active = true;
        }

        await setDB(data);
        res.json({ success: true, active });
    } catch (error) {
        console.error('Vote Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 获取状态
app.get(['/api/status', '/status'], async (req, res) => {
    const { bvid, userId } = req.query;
    const data = await getDB();
    const videoData = data[bvid] || { votes: {} };
    const isVoted = videoData.votes[userId];
    const totalCount = Object.keys(videoData.votes).length;
    res.json({ success: true, active: !!isVoted, count: totalCount });
});

// 获取排行榜
app.get(['/api/leaderboard', '/leaderboard'], async (req, res) => {
    const range = req.query.range || 'realtime';
    const data = await getDB();
    
    let startTime = 0;
    let endTime = Date.now();

    if (range === 'realtime') {
        // 实时榜：今天零点至今
        startTime = moment().startOf('day').valueOf();
    } else if (range === 'daily') {
        // 日榜：昨天零点到昨天 23:59:59
        startTime = moment().subtract(1, 'days').startOf('day').valueOf();
        endTime = moment().subtract(1, 'days').endOf('day').valueOf();
    } else if (range === 'weekly') {
        // 周榜：本周一零点至今
        startTime = moment().startOf('isoWeek').valueOf(); // 使用 isoWeek 确保从周一开始
    } else if (range === 'monthly') {
        // 月榜：本月1号零点至今
        startTime = moment().startOf('month').valueOf();
    }

    const list = [];
    for (const bvid in data) {
        const video = data[bvid];
        // 过滤在指定时间范围内的投票
        const validVotesCount = Object.values(video.votes).filter(ts => ts >= startTime && ts <= endTime).length;
        if (validVotesCount > 0) {
            list.push({ bvid, title: video.title, count: validVotesCount });
        }
    }

    const sortedList = list.sort((a, b) => b.count - a.count).slice(0, 5);
    res.json({ success: true, list: sortedList });
});

module.exports = app;
