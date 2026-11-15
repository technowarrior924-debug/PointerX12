const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

const players = {};
let matchTimeLeft = 600; // 10 minutes in seconds

// 🌍 W.W.P — PERMANENT players list (naam, #ID, PFP, profile).
// Jis ne bhi ek dafa Google se login kiya, wo hamesha list me rahega —
// log out kare ya offline ho, naam nahi jayega. List servers.js ke
// saath wali players.json file me save hoti hai, taake server restart
// par bhi wapis aa jaye. (Render par redeploy se file reset ho jati hai —
// us ke liye database chahiye hota, file sirf localhost ke liye permanent hai.)
const PLAYERS_FILE = path.join(__dirname, 'players.json');
let registeredPlayers = {}; // key -> { key, name, playerId, pfp, email, isGoogle, uid, lastSeen }
function loadRegisteredPlayers() {
    try {
        if (fs.existsSync(PLAYERS_FILE)) {
            const raw = fs.readFileSync(PLAYERS_FILE, 'utf8');
            const parsed = JSON.parse(raw || '{}');
            if (parsed && typeof parsed === 'object') registeredPlayers = parsed;
        }
    } catch (e) { registeredPlayers = {}; }
    console.log(`W.W.P: ${Object.keys(registeredPlayers).length} registered players loaded`);
}
function saveRegisteredPlayers() {
    try { fs.writeFileSync(PLAYERS_FILE, JSON.stringify(registeredPlayers, null, 2), 'utf8'); } catch (e) {}
}
loadRegisteredPlayers();
// Har player ki stable key — Google player ki uid se (naam/ID badle to bhi
// wahi entry), guest ki playerId se (guest ki koi uid nahi hoti).
function playerRegKey(profile, pid) {
    const uid = String((profile && profile.uid) || '').trim();
    if (profile && profile.isGoogle && uid) return 'g_' + uid.replace(/[^A-Za-z0-9_-]/g, '_').substring(0, 64);
    return 'id_' + pid;
}
function isPlayerOnline(regKey) {
    return Object.keys(players).some((id) => players[id] && players[id].regKey === regKey);
}
function publicPlayerList() {
    return Object.keys(registeredPlayers).map((k) => {
        const p = registeredPlayers[k] || {};
        return {
            key: k,
            socketId: '',
            name: p.name || 'Player',
            playerId: p.playerId || '?????',
            pfp: p.pfp || '',
            email: p.email || '',
            isGoogle: !!p.isGoogle,
            online: isPlayerOnline(k),
            lastSeen: p.lastSeen || 0,
            status: p.status || 'active' // 👑 Admin: active | banned | disabled
        };
    });
}
function broadcastPlayersList() {
    io.emit('playersList', publicPlayerList());
}

// 👑 ADMIN (sirf technowarrior924@gmail.com) — W.W.P se Ban/Disable/Gift.
// Admin ki pehchan uske Google email se (client setPlayerProfile me bhejta hai).
const ADMIN_EMAIL = 'technowarrior924@gmail.com';
function isAdminSocket(socket) {
    const p = players[socket.id];
    return !!(p && p.email && String(p.email).trim().toLowerCase() === ADMIN_EMAIL);
}
function findSocketIdByRegKey(regKey) {
    return Object.keys(players).find((id) => players[id] && players[id].regKey === regKey) || null;
}
function kickPlayerSocket(regKey, eventName) {
    const sid = findSocketIdByRegKey(regKey);
    if (!sid) return false;
    try { io.to(sid).emit(eventName, {}); } catch (e) {}
    try {
        const s = io.sockets && io.sockets.sockets ? io.sockets.sockets.get(sid) : null;
        if (s && typeof s.disconnect === 'function') s.disconnect(true);
    } catch (e) {}
    return true;
}
function deliverGiftToPlayer(regKey, gift) {
    // Online ho to foran bhejo, offline ho to pending me save karo
    // (agli login par mil jayega).
    const sid = findSocketIdByRegKey(regKey);
    if (sid) {
        try { io.to(sid).emit('giftReceived', gift); } catch (e) {}
        return 'online';
    }
    const entry = registeredPlayers[regKey];
    if (!entry) return 'notfound';
    if (!Array.isArray(entry.pendingGifts)) entry.pendingGifts = [];
    entry.pendingGifts.push(gift);
    saveRegisteredPlayers();
    return 'pending';
}

// 🏁 MATCH END — timer 0 hote hi 'matchEnded' (clients rewards save
// karen + apne stats bhejen), 1.5s baad leaderboard ('matchResults')
// broadcast + match stats reset (agle match ke liye).
let matchEnding = false;
function buildMatchLeaderboard() {
    return Object.keys(players)
        .filter((id) => {
            const p = players[id];
            if (!p) return false;
            // Sirf wohi jo match me the: kill/death ki, ya stats bheje.
            // (Lobby me baithe players 0/0 ke saath board me nahi aane chahiye.)
            return (p.matchKills || 0) > 0 || (p.matchDeaths || 0) > 0 || !!p.matchStatsReported;
        })
        .map((id) => {
            const p = players[id];
            const shots = p.matchShots || 0, hits = p.matchHits || 0;
            const reported = !!p.matchStatsReported;
            const coins = (p.matchCoins != null && p.matchCoins > 0)
                ? p.matchCoins
                : ((p.matchKills || 0) * 100 + (p.matchDeaths || 0) * 10);
            return {
                socketId: id,
                name: p.name || 'Player',
                playerId: p.playerId || '?????',
                pfp: p.pfp || '',
                kills: p.matchKills || 0,
                deaths: p.matchDeaths || 0,
                coins: coins,
                shots: shots,
                hits: hits,
                // Accuracy: sirf tab jab client ne stats bheje (warna '—').
                accuracy: reported ? (shots > 0 ? Math.round((hits / shots) * 100) : 0) : null
            };
        })
        .sort((a, b) => (b.kills - a.kills) || (a.deaths - b.deaths) || String(a.name).localeCompare(String(b.name)));
}
function startMatchEnd() {
    if (matchEnding) return;
    matchEnding = true;
    io.emit('matchEnded');
    setTimeout(() => {
        try { io.emit('matchResults', buildMatchLeaderboard()); } catch (e) {}
        Object.keys(players).forEach((id) => {
            if (players[id]) {
                players[id].matchKills = 0; players[id].matchDeaths = 0;
                players[id].matchShots = 0; players[id].matchHits = 0;
                players[id].matchCoins = 0; players[id].matchStatsReported = false;
            }
        });
        matchTimeLeft = 600;
        matchEnding = false;
        io.emit('timerUpdate', matchTimeLeft);
    }, 1500);
}

// Match Timer Interval
setInterval(() => {
    if (matchEnding) return; // match end ho raha hai — timer ruka hai.
    matchTimeLeft--;
    if (matchTimeLeft <= 0) {
        matchTimeLeft = 0;
        io.emit('timerUpdate', matchTimeLeft);
        startMatchEnd();
        return;
    }
    io.emit('timerUpdate', matchTimeLeft);
}, 1000);

io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    players[socket.id] = {
        name: 'Player',
        x: 0,
        y: 1.62,
        z: 0,
        yaw: 0,
        pitch: 0,
        skin: '',
        isMoving: false,
        isCrouching: false,
        isDoingPushups: false, // 💪 Pushups (P) — client se aata hai, baaki players ko dikhta hai.
        gun1: 'ar9', // 🎒 Slot 1 gun — 'ar9' ya 'vita' (sniper). Client se aata hai, baaki players ko dikhta hai.
        // 🆔 Player ID (# + 5 chars, letters + numbers) + 🌍 W.W.P profile.
        playerId: '', // setPlayerProfile se aata hai (client ki per-account ID).
        pfp: '', // profile picture (data URL ya Google photoURL).
        email: '', // Google email (Google login par), guest par ''.
        isGoogle: false,
        regKey: '', // 🌍 W.W.P permanent registry ki key (setPlayerProfile se).
        health: 100,
        isDead: false,
        kills: 0,
        deaths: 0,
        // 🏁 Is match ke stats (results panel ke liye) — match end par reset.
        matchKills: 0,
        matchDeaths: 0,
        matchShots: 0, // client bhejta hai (accuracy ke liye)
        matchHits: 0, // client bhejta hai (accuracy ke liye)
        matchCoins: 0, // client bhejta hai (is match ke coins)
        matchStatsReported: false // client ne match end par stats bheje?
    };

    socket.emit('currentPlayers', players);
    socket.emit('playersList', publicPlayerList());
    socket.emit('timerUpdate', matchTimeLeft);

    socket.on('setPlayerName', (playerName) => {
        if (players[socket.id]) {
            players[socket.id].name = playerName || 'Player';
            socket.broadcast.emit('newPlayer', { id: socket.id, player: players[socket.id] });
            
            // 🌟 Screenshot ke mutabiq join notification (Green color text ke liye identifier)
            io.emit('playerJoinedNotif', players[socket.id].name);
            // 🌍 W.W.P — naam badla to permanent entry me bhi update karo.
            const rk = players[socket.id].regKey;
            if (rk && registeredPlayers[rk]) {
                registeredPlayers[rk].name = players[socket.id].name;
                registeredPlayers[rk].lastSeen = Date.now();
                saveRegisteredPlayers();
            }
            broadcastPlayersList();
        }
    });

    // 🆔 + 🌍 W.W.P — client apni profile bhejta hai (login par, PLAY par,
    // reconnect par): { id, name, pfp, email, isGoogle, uid }. Server use
    // PERMANENT registry (players.json) me save karta hai aur list sab ko
    // broadcast karta hai (admin ka W.W.P panel usi se bharta hai).
    socket.on('setPlayerProfile', (profile) => {
        if (!players[socket.id] || !profile || typeof profile !== 'object') return;
        const pid = String(profile.id || '').toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 5);
        if (!/^[A-Z0-9]{5}$/.test(pid)) return; // galat ID — ignore karo.
        const key = playerRegKey(profile, pid);
        // ID pehle se kisi AUR registered player ki to nahi? (takrao — client nayi ID banaye.)
        const taken = Object.keys(registeredPlayers).some((k) => k !== key && registeredPlayers[k] && registeredPlayers[k].playerId === pid);
        if (taken) { socket.emit('playerIdTaken'); return; }
        // 👑 BAN / DISABLE — admin ne block kiya ho to login hi nahi hone do.
        const prev = registeredPlayers[key] || {};
        const prevStatus = prev.status || 'active';
        if (prevStatus === 'banned') { try { socket.emit('youAreBanned', {}); } catch (e) {} try { socket.disconnect(true); } catch (e) {} return; }
        if (prevStatus === 'disabled') { try { socket.emit('youAreDisabled', {}); } catch (e) {} try { socket.disconnect(true); } catch (e) {} return; }
        // Permanent entry — ek dafa login to hamesha list me.
        // (status + pendingGifts bachao — ye admin actions se bante hain.)
        registeredPlayers[key] = {
            key: key,
            name: String(profile.name || players[socket.id].name || 'Player').substring(0, 30),
            playerId: pid,
            pfp: String(profile.pfp || '').substring(0, 40000),
            email: String(profile.email || '').substring(0, 100),
            isGoogle: !!profile.isGoogle,
            uid: String(profile.uid || '').substring(0, 100),
            lastSeen: Date.now(),
            status: prevStatus,
            pendingGifts: Array.isArray(prev.pendingGifts) ? prev.pendingGifts : []
        };
        players[socket.id].regKey = key;
        players[socket.id].playerId = pid;
        players[socket.id].name = registeredPlayers[key].name;
        players[socket.id].pfp = registeredPlayers[key].pfp;
        players[socket.id].email = registeredPlayers[key].email;
        players[socket.id].isGoogle = registeredPlayers[key].isGoogle;
        saveRegisteredPlayers();
        broadcastPlayersList();
        // ✅ Profile accept ho gayi (ban/disable nahi hai) — client apna
        // purana banned/disabled flag saaf kar le (PLAY wapas enable ho).
        try { socket.emit('profileAccepted', { status: 'active' }); } catch (e) {}
        // 🎁 Pending gifts (offline me admin ne bheje the) — ab de do.
        const pending = registeredPlayers[key].pendingGifts || [];
        if (pending.length > 0) {
            registeredPlayers[key].pendingGifts = [];
            saveRegisteredPlayers();
            pending.forEach((g, i) => {
                setTimeout(() => { try { socket.emit('giftReceived', g); } catch (e) {} }, 400 * (i + 1));
            });
        }
    });

    // 👑 ADMIN ACTIONS — Ban / Disable / Enable / Unban (sirf admin).
    socket.on('adminSetStatus', (data) => {
        if (!isAdminSocket(socket)) { try { socket.emit('adminActionFailed', { reason: 'not-admin' }); } catch (e) {} return; }
        if (!data || typeof data !== 'object') return;
        const key = String(data.key || '').trim();
        const status = String(data.status || '').trim();
        if (!key || !registeredPlayers[key]) { try { socket.emit('adminActionFailed', { reason: 'no-player' }); } catch (e) {} return; }
        if (status !== 'active' && status !== 'banned' && status !== 'disabled') return;
        // Admin khud ko ban/disable nahi kar sakta.
        if (players[socket.id] && players[socket.id].regKey === key) { try { socket.emit('adminActionFailed', { reason: 'self' }); } catch (e) {} return; }
        registeredPlayers[key].status = status;
        saveRegisteredPlayers();
        // Online ho to foran kick karo (banned/disabled).
        if (status === 'banned') kickPlayerSocket(key, 'youAreBanned');
        else if (status === 'disabled') kickPlayerSocket(key, 'youAreDisabled');
        broadcastPlayersList();
        try { socket.emit('adminActionDone', { key, status }); } catch (e) {}
    });

    // 👑 ADMIN GIFTS — Send Diamonds / Coins / Skins / Characters (sirf admin).
    // Currency admin ke apne balance se jati hai (client giftSent par kat-ta hai).
    socket.on('adminGift', (data) => {
        if (!isAdminSocket(socket)) { try { socket.emit('giftFailed', { reason: 'not-admin' }); } catch (e) {} return; }
        if (!data || typeof data !== 'object') return;
        const key = String(data.key || '').trim();
        const gift = (data.gift && typeof data.gift === 'object') ? data.gift : null;
        if (!key || !registeredPlayers[key] || !gift) { try { socket.emit('giftFailed', { reason: 'no-player' }); } catch (e) {} return; }
        const type = String(gift.type || '').trim();
        const fromName = (players[socket.id] && players[socket.id].name) || 'Admin';
        let clean = null;
        if (type === 'diamonds' || type === 'coins') {
            const amount = Math.floor(Number(gift.amount) || 0);
            if (amount <= 0 || amount > 100000) { try { socket.emit('giftFailed', { reason: 'bad-amount' }); } catch (e) {} return; }
            clean = { type, amount, from: fromName, at: Date.now() };
        } else if (type === 'skin' || type === 'character') {
            const code = (gift.skinCode === null) ? null : String(gift.skinCode || '').trim();
            if (code !== null && (!code.startsWith('PX1|') || code.length > 5000)) { try { socket.emit('giftFailed', { reason: 'bad-skin' }); } catch (e) {} return; }
            clean = { type, skinId: String(gift.skinId || 'custom').substring(0, 40), skinName: String(gift.skinName || 'Skin').substring(0, 40), skinCode: code, from: fromName, at: Date.now() };
        } else { try { socket.emit('giftFailed', { reason: 'bad-type' }); } catch (e) {} return; }
        const where = deliverGiftToPlayer(key, clean);
        if (where === 'notfound') { try { socket.emit('giftFailed', { reason: 'no-player' }); } catch (e) {} return; }
        try { socket.emit('giftSent', { key, gift: clean, where }); } catch (e) {}
    });

    // 🌟 Chat Message Handler - SIRF EK BAAR (doosra duplicate wala block DELETE karo)
    socket.on('sendChatMessage', (data) => {
        // Naya client object bhejta hai {id, message}, purana client sirf string
        const text = (typeof data === 'string' ? data : (data && data.message)) || '';
        const msgId = (data && data.id) ? data.id : (socket.id + '-' + Date.now());
        if (players[socket.id] && typeof text === 'string' && text.trim() !== '') {
            // broadcast, io.emit nahi. Sender apna message khud dikha deta hai.
            socket.broadcast.emit('chatMessage', {
                id: msgId,
                name: players[socket.id].name,
                message: text.trim()
            });
        }
    });

    socket.on('playerMovement', (movementData) => {
        if (players[socket.id] && !players[socket.id].isDead) {
            players[socket.id].x = movementData.x;
            players[socket.id].y = movementData.y;
            players[socket.id].z = movementData.z;
            players[socket.id].yaw = movementData.yaw;
            players[socket.id].pitch = movementData.pitch;
            players[socket.id].isMoving = movementData.isMoving;
            players[socket.id].isCrouching = movementData.isCrouching;
            // 💪 Pushups — server terminal me dikhega (naye server ki pehchan).
            if (movementData.isDoingPushups && !players[socket.id].isDoingPushups) {
                console.log(`💪 ${players[socket.id].name} started pushups`);
            }
            if (!movementData.isDoingPushups && players[socket.id].isDoingPushups) {
                console.log(`💪 ${players[socket.id].name} stopped pushups`);
            }
            players[socket.id].isDoingPushups = !!movementData.isDoingPushups; // 💪 Pushups.
            // 🎒 Slot 1 gun (AR-9/VITA) — client se aata hai, baaki players ko dikhta hai.
            if (movementData.gun1 === 'vita' || movementData.gun1 === 'ar9') {
                players[socket.id].gun1 = movementData.gun1;
            }

            socket.broadcast.emit('playerMoved', { id: socket.id, player: players[socket.id] });
        }
    });

    // 🎨 Har player ki apni skin — client apni skin ka code bhejta hai
    // (join par aur jab bhi skin badle), server use save karke baaki
    // players ko bhejta hai, taake har player ko uski apni skin dikhe.
    socket.on('setPlayerSkin', (code) => {
        if (players[socket.id]) {
            players[socket.id].skin = (typeof code === 'string' ? code : '') || '';
            console.log(`Skin set for ${players[socket.id].name} (${socket.id}): ${players[socket.id].skin ? players[socket.id].skin.substring(0, 30) + '...' : '(no skin)'}`);
            socket.broadcast.emit('playerSkinChanged', { id: socket.id, skin: players[socket.id].skin });
        }
    });

    socket.on('playerHit', (data) => {
        const attackerId = socket.id;
        const target = players[data.targetId];

        if (target && !target.isDead) {
            target.health -= data.damage;
            io.emit('spawnBlood', { x: data.x, y: data.y, z: data.z });

            if (target.health <= 0) {
                target.health = 0;
                target.isDead = true;
                target.deaths++;
                target.matchDeaths++; // 🏁 Is match ki death (results panel).

                if (players[attackerId] && attackerId !== data.targetId) {
                    players[attackerId].kills++;
                    players[attackerId].matchKills++; // 🏁 Is match ka kill (results panel).
                }

                io.emit('playerStatsUpdate', { 
                    targetId: data.targetId, 
                    targetDeaths: target.deaths, 
                    attackerId: attackerId, 
                    attackerKills: players[attackerId] ? players[attackerId].kills : 0,
                    // 🎯 Headshot (100 damage) aur 🌙 Mid-air kill (target hawa me).
                    isHeadshot: (data.damage || 0) >= 100,
                    isMidAir: (target.y || 0) > 1.7
                });

                io.emit('playerDied', { id: data.targetId });

                setTimeout(() => {
                    if (players[data.targetId]) {
                        target.health = 100;
                        target.isDead = false;
                        target.x = (Math.random() - 0.5) * 20;
                        target.z = (Math.random() - 0.5) * 20;
                        target.y = 1.62;
                        io.emit('playerRespawned', { id: data.targetId, player: target });
                    }
                }, 3000);
            } else {
                io.emit('playerHealthUpdate', { id: data.targetId, health: target.health });
            }
        }
    });

    // 🔍 Matchmaking — client PLAY dabake match dhoondta hai; server
    // online players + match ka time bhejta hai (MATCH FOUND ke liye).
    socket.on('requestMatchInfo', () => {
        if (!players[socket.id]) return;
        try {
            socket.emit('matchInfo', {
                online: Object.keys(players).length,
                timeLeft: matchTimeLeft,
                ending: !!matchEnding
            });
        } catch (e) {}
    });

    // 🏁 Match end par client apne stats bhejta hai (shots/hits = accuracy,
    // coins = is match ke coins). Server leaderboard me mila deta hai.
    socket.on('matchStats', (stats) => {
        if (!players[socket.id] || !stats || typeof stats !== 'object') return;
        const s = Math.max(0, parseInt(stats.shots, 10) || 0);
        const h = Math.max(0, parseInt(stats.hits, 10) || 0);
        players[socket.id].matchShots = s;
        players[socket.id].matchHits = Math.min(h, s);
        players[socket.id].matchCoins = Math.max(0, parseInt(stats.coins, 10) || 0);
        players[socket.id].matchStatsReported = true;
    });

    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        const playerName = players[socket.id] ? players[socket.id].name : 'Player';
        delete players[socket.id];
        
        // 🌟 Screenshot ke mutabiq left notification (Red color text ke liye)
        io.emit('playerLeftNotif', playerName);
        io.emit('playerDisconnect', socket.id);
        // 🌍 W.W.P — PERMANENT: gaya hua player registry se NAHI hat-ta,
        // sirf offline ho jata hai (list broadcast se online dot update hota hai).
        broadcastPlayersList();
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});