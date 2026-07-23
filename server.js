const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// تخزين آخر أمر (للإرسال الفوري)
let currentCommand = {
    time: 0,
    message: "",
    username: "",
    userId: 0
};

// تخزين اللاعبين النشطين (آخر ping خلال 30 ثانية)
let activePlayers = new Map();

// نقطة النهاية لاستقبال الأوامر من القادة فقط (يتم التحقق من القادة في روبلوكس)
app.post('/update', (req, res) => {
    const { username, userId, message, time } = req.body;
    if (!username || !userId || !message || !time) {
        return res.status(400).json({ error: 'Missing fields' });
    }

    // تحديث الأمر الحالي
    currentCommand = { time, message, username, userId };
    res.json({ success: true });
});

// نقطة النهاية لاستلام الأوامر (مع دعم lastTime لتقليل الحمل)
app.get('/data', (req, res) => {
    const lastTime = parseInt(req.query.lastTime) || 0;
    if (currentCommand.time > lastTime) {
        res.json(currentCommand);
    } else {
        res.json({}); // لا يوجد أمر جديد
    }
});

// نقطة النهاية لتسجيل ping اللاعبين
app.post('/ping', (req, res) => {
    const { username, userId, placeId, jobId } = req.body;
    if (!username || !userId) return res.status(400).json({ error: 'Missing fields' });

    activePlayers.set(username, {
        username,
        userId,
        placeId,
        jobId,
        lastSeen: Date.now()
    });

    res.json({ success: true });
});

// قائمة اللاعبين النشطين (داخل آخر 30 ثانية)
app.get('/players', (req, res) => {
    const now = Date.now();
    const players = [];

    for (const [name, data] of activePlayers) {
        if (now - data.lastSeen < 30000) {
            players.push(name);
        } else {
            activePlayers.delete(name); // تنظيف تلقائي
        }
    }

    res.json(players);
});

// معلومات لاعب محدد (لأمر jointotarget)
app.get('/player/:username', (req, res) => {
    const username = req.params.username;
    const data = activePlayers.get(username);
    if (data && Date.now() - data.lastSeen < 30000) {
        res.json({ placeId: data.placeId, jobId: data.jobId });
    } else {
        res.status(404).json({ error: 'Player not found' });
    }
});

app.listen(PORT, () => {
    console.log(`DEDSEC Server running on port ${PORT}`);
});
