// Game Variables & Scene Setup
let scene, camera, renderer, clock;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let isCrouching = false;
let canJump = false;
let velocity = new THREE.Vector3();
// 💪 PUSHUPS (P dabaye rakho) — banda pushups lagata hai, gun gayab;
// P choro to gun wapis aur banda khada. Doosre players ko bhi dikhta hai
// (server se isDoingPushups sync hota hai).
let isDoingPushups = false;
let pushupPhase = 0; // Pushup up/down rhythm.
// 🌙 BHOP / MOON JUMP (Kirka-style) — pehle jump karo, zameen par land
// ho, phir foran Shift dabao + choro + jump dabao = moon jump.
// Land karne ke baad 300ms me Shift dabana hai, phir Shift chorne ke
// baad 250ms me jump dabana hai. Har landing par dobara kar sakte ho.
let bhopLandUntil = 0;       // Land karne ke baad Shift dabane ka window (ms).
let bhopTapArmed = false;    // Land ke foran baad Shift daba tha (tap armed).
let bhopJumpUntil = 0;       // Shift chorne ke baad jump dabane ka window (ms).
const MOON_JUMP_VELOCITY = 14; // Moon jump ki taqat (normal jump 8.5).
const BHOP_LAND_WINDOW_MS = 300; // Land ke baad Shift dabane ka time.
const BHOP_JUMP_WINDOW_MS = 250; // Shift chorne ke baad jump dabane ka time.

// Player Controls & Stats
let playerHeight = 1.62; 
let targetPlayerHeight = 1.62;
let isLocked = false;
let pitch = 0, yaw = 0;

let myHealth = 100;
let myKills = 0;
let myDeaths = 0;
let matchTimerString = "10:00";
// 🏁 MATCH STATS + REWARDS — is match ke kills/deaths/shots (accuracy),
// aur pending rewards (XP/coins). Rewards sirf match end par save hote
// hain; beech me match chhor diya (EXIT/disconnect) to pending zaya.
// (TDZ: ye lets file ke upar hain — init() jaldi chalta hai.)
let matchKills = 0, matchDeaths = 0; // is match ke kills/deaths (results panel)
let matchShots = 0, matchHits = 0; // accuracy: shots fired / hits
let matchPendingXP = 0, matchPendingCoins = 0; // match ke rewards — match end par save
let matchResultsOpen = false; // results panel khula hai?
let matchResultsData = null; // server se aaya leaderboard
let myMatchStats = null; // apne match ke stats (panel ke liye, server board aane se pehle)
// 🔍 MATCHMAKING — PLAY dabao to SEARCHING chale (internet ke hisab se),
// phir MATCH FOUND aaye, phir game start ho.
let matchmakingActive = false; // searching chal rahi hai?
let matchmakingCancelled = false; // cancel dabadiya?
let matchmakingName = ''; // kis naam se match dhoond rahe hain
const MATCHMAKING_MIN_MS = 2500; // kam se kam 2.5s searching dikhe
const MATCHMAKING_FOUND_MS = 1000; // MATCH FOUND 1s dikhe
let isDeadLocal = false;
let playerName = "Player";
let gameStarted = false;

// 🆔 PLAYER ID + 🌍 W.W.P — har player ki alag 5-char ID (# ke saath,
// letters + numbers mix, jaise #X7K2M), per-account save (skin ki tarah).
// W.W.P (World Wide Players) admin panel me online players dikhte hain.
// (TDZ: ye lets file ke upar hain — init() jaldi chalta hai.)
let myPlayerId = '';
let myPlayerIdAccount = ''; // kis account ki ID myPlayerId me hai (account badle to dobara load karo)
let wwpPlayers = []; // server se aayi online players ki list
let wwpSearchText = '';
let currentGooglePhotoURL = '';
// 👑 ADMIN — W.W.P player popup (Ban/Disable/Gift) + banned/disabled flags.
let wwpPopupKey = null; // kis player ka popup khula hai (regKey)
let amBanned = false; // admin ne mujhe ban kiya hai
let amDisabled = false; // admin ne mujhe disable kiya hai

// ⭐ LEVEL SYSTEM — Kill = 100 XP, Death = 10 XP. Level N se N+1 ke liye
// 100*N XP chahiye (L1->2: 100, L2->3: 200, L3->4: 300...). XP har
// account ke liye alag save hoti hai (skin wali key jaisi).
// 💰 COINS: Kill = 100, Death = 10, Level-up bonus = 500.
// 💎 DIAMONDS: Level-up par 5 milte hain. Dono bhi per-account save hote hain.
let totalXP = 0;
let totalLifetimeKills = 0;
let totalCoins = 0;
let totalDiamonds = 0;
function xpKey() { return (typeof skinAccountId !== 'undefined' && skinAccountId) ? ('pointerx_xp_' + skinAccountId) : 'pointerx_xp_v1'; }
function coinsKey() { return (typeof skinAccountId !== 'undefined' && skinAccountId) ? ('pointerx_coins_' + skinAccountId) : 'pointerx_coins_v1'; }
function diamondsKey() { return (typeof skinAccountId !== 'undefined' && skinAccountId) ? ('pointerx_diamonds_' + skinAccountId) : 'pointerx_diamonds_v1'; }
function xpForLevel(level) { return 100 * Math.max(1, level); }
function levelFromXP(xp) {
    let level = 1, remaining = Math.max(0, xp || 0);
    while (remaining >= xpForLevel(level)) { remaining -= xpForLevel(level); level++; }
    return { level, xpIntoLevel: remaining, xpNeeded: xpForLevel(level) };
}
function loadXP() {
    try {
        totalXP = parseInt(localStorage.getItem(xpKey()), 10);
        if (isNaN(totalXP) || totalXP < 0) totalXP = 0;
        totalLifetimeKills = parseInt(localStorage.getItem(xpKey() + '_kills'), 10);
        if (isNaN(totalLifetimeKills) || totalLifetimeKills < 0) totalLifetimeKills = 0;
        totalCoins = parseInt(localStorage.getItem(coinsKey()), 10);
        if (isNaN(totalCoins) || totalCoins < 0) totalCoins = 0;
        totalDiamonds = parseInt(localStorage.getItem(diamondsKey()), 10);
        if (isNaN(totalDiamonds) || totalDiamonds < 0) totalDiamonds = 0;
    } catch (e) { totalXP = 0; totalLifetimeKills = 0; totalCoins = 0; totalDiamonds = 0; }
}
function saveXP() {
    try { localStorage.setItem(xpKey(), String(totalXP)); localStorage.setItem(xpKey() + '_kills', String(totalLifetimeKills)); localStorage.setItem(coinsKey(), String(totalCoins)); localStorage.setItem(diamondsKey(), String(totalDiamonds)); } catch (e) {}
}
function awardCoins(amount) { totalCoins += amount; saveXP(); updateLevelDisplay(); }
function awardDiamonds(amount) { totalDiamonds += amount; saveXP(); updateLevelDisplay(); }
function awardXP(amount) {
    const before = levelFromXP(totalXP).level;
    totalXP += amount;
    saveXP();
    const after = levelFromXP(totalXP).level;
    if (after > before) onLevelUp(after);
    updateLevelDisplay();
}
function onLevelUp(newLevel) {
    // Level-up bonus: 500 coins + 5 diamonds (har level ke liye).
    totalCoins += 500;
    totalDiamonds += 5;
    saveXP();
    const msg = `LEVEL UP! Ab tum Level ${newLevel} par ho! (+500 coins, +5 diamonds)`;
    try { if (typeof lobbyToast === 'function') lobbyToast(msg); } catch (e) {}
    try { if (gameStarted && typeof showGameNotification === 'function') showGameNotification(msg); } catch (e) {}
}
function updateLevelDisplay() {
    if (typeof document === 'undefined') return;
    const info = levelFromXP(totalXP);
    const lvlEl = document.getElementById('lobby-level-num');
    if (lvlEl) lvlEl.textContent = info.level;
    const fillEl = document.getElementById('lobby-xp-fill');
    if (fillEl) fillEl.style.width = Math.min(100, Math.round((info.xpIntoLevel / info.xpNeeded) * 100)) + '%';
    const txtEl = document.getElementById('lobby-xp-text');
    if (txtEl) txtEl.textContent = `${info.xpIntoLevel} / ${info.xpNeeded}`;
    const killsEl = document.getElementById('lobby-total-kills');
    if (killsEl) killsEl.textContent = totalLifetimeKills;
    const coinsEl = document.getElementById('lobby-coins-num');
    if (coinsEl) coinsEl.textContent = totalCoins;
    const diaEl = document.getElementById('lobby-diamonds-num');
    if (diaEl) diaEl.textContent = totalDiamonds;
}

// ⚡ Dash Variables
let isDashing = false;
let dashCooldown = false;
const dashSpeed = 35.0;
const dashDuration = 0.15;
let dashTimer = 0;
let dashDirection = new THREE.Vector3();

let bhopBonus = 0;      
let bhopChain = 0;      
let lastLandTime = 0;   
let shiftReleaseTime = 0; 

let isAiming = false;
const normalFOV = 90;
const aimedFOV = 60;

let headBobTimer = 0;
const bobFrequency = 10; // Gun bob ki speed (steps/sec jaisi).
const bobAmplitude = 0.05; // Gun bob ki height (0.05 = halki si harkat).
let playerWalkTimer = 0;
// 🔫 Viewmodel bob — chalte waqt gun upar/neeche + halki side sway.
// Sirf apni screen par (first-person viewmodel = camera ki child);
// dusre players ki gun nahi hilti (wo inGameGunGroups me hain).
let viewBobPhase = 0; // Chalte waqt aage badhta hai.
let viewBobAmount = 0; // 0 = khara (no bob), 1 = pura bob (smooth lerp).
// 📷 CAMERA BOB — chalte waqt gun ke saath SCREEN bhi hile (head bob).
// Sirf apni screen par (camera rotation + render-time Y offset);
// dusre players ko hamari screen ka bob nahi dikhta.
let camBobAmount = 0; // 0 = khara, 1 = pura bob (smooth lerp).

let targets = [];
let bloodParticles = [];
let gun, muzzleFlash;
let firstPersonAR9 = null; // First-person rifle ki AR-9 (size lobbyGunScale se lagti hai)
let pistol, pistolMuzzleFlash;
let knife;
let currentWeapon = 1; // 1 = Rifle (default), 2 = Pistol, 3 = Knife
let knifeSwing = 0; // 0 = no swing, 1 = swinging (decays in animate)
// 🎒 INVENTORY GUNS — slot 1: 'ar9' ya 'vita' (sniper); slot 2:
// 'pistol' ya 'revolver'. VITA equip karo to AR-9 ki jagah VITA aati
// hai (slot 1). Per-account save (skinAccountId wali key), jaise skins.
let equippedGun1 = 'ar9';
let equippedGun2 = 'pistol';
let firstPersonVita = null; // First-person VITA (gun group ki child).
let firstPersonRevolver = null; // First-person revolver (pistol group ki child).
let firstPersonPistolParts = null; // Pistol ke parts (sub-group, revolver switch ke liye).
function gun1Key() { return (typeof skinAccountId !== 'undefined' && skinAccountId) ? ('pointerx_gun1_' + skinAccountId) : 'pointerx_gun1_v1'; }
function gun2Key() { return (typeof skinAccountId !== 'undefined' && skinAccountId) ? ('pointerx_gun2_' + skinAccountId) : 'pointerx_gun2_v1'; }
function loadEquippedGuns() {
    try {
        const g1 = localStorage.getItem(gun1Key());
        if (g1 === 'vita' || g1 === 'ar9') equippedGun1 = g1;
        const g2 = localStorage.getItem(gun2Key());
        if (g2 === 'revolver' || g2 === 'pistol') equippedGun2 = g2;
    } catch (e) {}
}
// 🎒 Equipped guns apply karo — first-person viewmodel me sahi gun dikhao
// (AR-9 ya VITA slot 1, pistol ya revolver slot 2) + muzzle flash ki
// position us gun ke muzzle par. Dusre players ki gun alag se sync hoti
// hai (server gun1). Weapon bar bhi yahan update hota hai.
function applyEquippedGuns() {
    if (firstPersonAR9) firstPersonAR9.visible = (equippedGun1 === 'ar9');
    if (firstPersonVita) firstPersonVita.visible = (equippedGun1 === 'vita');
    if (muzzleFlash) muzzleFlash.position.set(0.25, -0.22, equippedGun1 === 'vita' ? -1.18 : -1.05);
    if (firstPersonPistolParts) firstPersonPistolParts.visible = (equippedGun2 === 'pistol');
    if (firstPersonRevolver) firstPersonRevolver.visible = (equippedGun2 === 'revolver');
    if (pistolMuzzleFlash) pistolMuzzleFlash.position.set(0.22, -0.2, equippedGun2 === 'revolver' ? -0.78 : -0.72);
    // 🎒 Lobby gun bhi badlo (inventory lobby me hai — equip karte hi
    // character ki gun bhi VITA/AR-9 ho jaye).
    if (typeof lobbyGunGroup !== 'undefined' && lobbyGunGroup) {
        try {
            while (lobbyGunGroup.children.length) lobbyGunGroup.remove(lobbyGunGroup.children[0]);
            lobbyGunGroup.add(equippedGun1 === 'vita' ? buildVitaSniper() : buildAR9Gun());
        } catch (e) {}
    }
    try { if (typeof updateWeaponBar === 'function') updateWeaponBar(); } catch (e) {}
}
// 🔫 AR-9 FULL-AUTO — left click dabaye rakho to AR-9 (rifle) lagatar
// chalti hai (shotgun ki tarha ek-ek click nahi). Sirf rifle (weapon 1)
// auto hai; pistol semi-auto (ek click = ek goli), knife ek swing/click.
let isMouseHeld = false; // Left mouse button daba hua hai.
let lastAutoShotTime = 0; // Aakhri auto goli ka time (ms).
const AR9_FIRE_INTERVAL_MS = 100; // AR-9 fire rate (100ms = 600 RPM).
const KNIFE_BASE_ROT = { x: 0.12, z: -0.45 }; // Knife ki diagonal hold pose
let chatHideTimer = null;
let weaponBarBuilt = false;
let weaponBarStylesInjected = false;
let isShooting = false;
let recoilTimer = 0;
let localPlayerParts = null;

// 🌇 Day/night (Minecraft-style game cycle — NOT real 24h). Sun aur moon
// aasman me ghoomte hain; roshni/shadow ka mood badalta hai.
const DAY_NIGHT_CYCLE = 600; // poora din-raat = 10 min (600 sec)
let gameTime = 0; // cycle me guzra waqt (sec)
let gameSun = null, gameSunGlow = null;
let gameMoon = null, gameMoonGlow = null;
let gameStars = null;
let gameSkyCanvas = null, gameSkyCtx = null, gameSkyTexture = null;
let gameAmbientLight = null, gameDirLight = null;
let dayNightSkyTimer = 0; // sky redraw throttle (har frame nahi)
const _skyC1 = new THREE.Color(), _skyC2 = new THREE.Color(); // colour lerp temps
let localShadowBody = null; // Apne player ka shadow-only body (layer 1)
// Sky palettes — 6 gradient stops each (top → horizon → bottom).
const SKY_STOPS = [0, 0.35, 0.55, 0.63, 0.72, 1];
const SKY_PALETTES = {
    night: ['#050914', '#0a1830', '#12233d', '#1a2f4a', '#0d1526', '#05070f'],
    sunset: ['#16224d', '#2e4a7a', '#7a8fc0', '#ffab6e', '#e87a4a', '#3a2a4a'],
    // Din — smooth neela gradient (upar gehra, horizon par halka). Koi
    // near-white stop nahi — pehle '#cfe8ff' (0.72) se aasman me ek safed
    // line/band banta tha jo aankhon ke samne aata tha jab sky ki taraf dekho.
    day: ['#2f6fd0', '#4a90d9', '#6fa8dd', '#8fc0e8', '#a8d0f0', '#b8d8f0']
};

// Multiplayer Setup
const socket = (typeof io !== 'undefined') ? io() : { on: () => {}, emit: () => {}, id: 'local' };
const otherPlayers = {};
let lobbyCharacter = null;
let lobbySteveParts = null;
let lobbyScene = null;
let lobbyCamera = null;
let lobbyPlatform = null;

let lobbyPlayerSize = 0.65;
let lobbyPlayerRotate = 0;
let lobbyShadowScale = 0.5;

// Official Minecraft dimensions (screenshot): height 1.8m, hitbox 1.8 x 0.6m,
// eye level 1.62m. Character mesh is 2.0 tall and body 0.6 wide, so Y scale
// 0.9 (1.8/2.0) — width (0.6) and eye level (1.62) stay as-is.
const PLAYER_HEIGHT_RATIO = 0.9;
function setPlayerScale(obj, size) {
    obj.scale.set(size, size * PLAYER_HEIGHT_RATIO, size);
}

// Lobby gun editor state: x = left(-)/right(+), y = gun centre height,
// scale = gun size. Base pose ab Jimmy ki look hai (x -0.05, y 1.15,
// scale 1.30); z 0.62 hi hai taake gun haathon se aage rahe.
// Size lobby + game dono me lagti hai (lobbyGunScale shared hai);
// X position SIRF lobby ki hai — game ki gun ki X alag hai (inGameGunPosX).
let lobbyGunGroup = null;
let lobbyGunX = -0.05;
let lobbyGunY = 1.15;
let lobbyGunZ = 0.62;
let lobbyGunScale = 1.30;

// Crouch pose (bethne ki position): Jimmy khud banata hai — lobby me
// CROUCH POSE sliders + SIT PREVIEW se. Yehi values game me Shift wale
// crouch ki pose hain (hips aage, knees bend, body drop). Default ab
// Jimmy ki set ki hui pose hai (0.6 / 1.6 / 0.23).
let crouchHip = 0.6;
let crouchKnee = 1.6;
let crouchDrop = 0.23;
let lobbyCrouchPreview = false;

// In-game gun editor state (doosre players ki gun, lobby/first-person gun nahi).
// rot degrees me hai, pos character-local units me. Base ab Jimmy ki look
// hai: posX -0.1, posY 1.65, posZ 0.4, rotX 5. PosX character ke
// left/right hai, posZ aage/peeche hai jo side view me screen par
// left/right lagta hai.
let inGameGunGroups = [];
let inGameGunRotX = 5;
let inGameGunRotY = 5;
let inGameGunPosX = -0.25;
let inGameGunPosY = 1.65;
let inGameGunPosZ = 0.25;
let inGamePlayerSize = 1;
let inGamePlayerRotate = 0;
// 💪 Pushup body height (zameen se upar) — in-game editor (G) se set hoti
// hai, default 0.45. Kam ho to banda zameen me ghus jata hai (is liye 0.45).
let inGamePushupHeight = 0.45;
let isInGameGunEditing = false;

// 🌟 Full Advanced Custom Parts & Elbow State
const partNames = ['head', 'body', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg', 'leftElbow', 'rightElbow', 'leftKnee', 'rightKnee'];
let lobbyCustomParts = {};

partNames.forEach(p => {
    lobbyCustomParts[p] = {
        scale: 1,
        rotX: 0, rotY: 0, rotZ: 0,
        posX: 0, posY: 0, posZ: 0
    };
});

// 👤 Jimmy ki look, ab app.js me default hai (uske localhost localStorage
// se li gayi values). Kisi bhi Google account / browser / device par yahi
// look dikhegi, localStorage khali ho to bhi. Neeche localStorage load
// iske upar chadhta hai, to jo baad me badlo ge wo phir bhi save hoga.
// (2026-11-09, image-54/55/56: Jimmy ne ADVANCED PARTS editor ki values
// bheji — head/body/arms/legs/elbows/knees, sab isi bake me hain.
// image-57/58: head rotZ -0.04 aur leftArm rotX -0.94 dobara bake kiye.)
const DEFAULT_LOOK_CUSTOM_PARTS = {
    head: { rotX: -0.14, rotY: 0.16, rotZ: -0.04, posY: -0.05 },
    body: { rotX: -0.04, rotY: 0.26, rotZ: 0.06, posY: -0.05 },
    leftArm: { scale: 0.90, rotX: -1.24, rotY: 0.36, rotZ: 0.16 },
    rightArm: { scale: 0.90, rotX: -0.94, rotY: -0.74, rotZ: -0.04 },
    leftLeg: { scale: 1.05, rotX: -0.04, rotY: -1.54, rotZ: 0.36 },
    rightLeg: { scale: 1.10, rotX: 0.46, rotY: -1.34, rotZ: 0.46, posY: 0.10 },
    leftElbow: { rotX: 0.06, rotY: -0.54 },
    rightElbow: { rotX: -0.24, rotY: -1.24 },
    leftKnee: { rotX: 0.06, rotY: -1.54 },
    rightKnee: { rotX: -0.04, rotY: -0.14 }
};
Object.keys(DEFAULT_LOOK_CUSTOM_PARTS).forEach((part) => {
    const baked = DEFAULT_LOOK_CUSTOM_PARTS[part];
    Object.keys(baked).forEach((prop) => { lobbyCustomParts[part][prop] = baked[prop]; });
});

try {
    if (typeof localStorage !== 'undefined') {
        const savedSize = parseFloat(localStorage.getItem('pointerx_lobby_player_size'));
        if (!isNaN(savedSize) && savedSize >= 0.3 && savedSize <= 1) lobbyPlayerSize = savedSize;
        const savedRot = parseFloat(localStorage.getItem('pointerx_lobby_player_rotate'));
        if (!isNaN(savedRot) && savedRot >= -180 && savedRot <= 180) lobbyPlayerRotate = savedRot;
        const savedShadow = parseFloat(localStorage.getItem('pointerx_lobby_shadow_scale'));
        if (!isNaN(savedShadow) && savedShadow >= 0.3 && savedShadow <= 2) lobbyShadowScale = savedShadow;
        const savedGunX = parseFloat(localStorage.getItem('pointerx_lobby_gun_x'));
        if (!isNaN(savedGunX)) lobbyGunX = Math.min(0.6, Math.max(-0.6, savedGunX));
        const savedGunY = parseFloat(localStorage.getItem('pointerx_lobby_gun_y'));
        if (!isNaN(savedGunY)) lobbyGunY = Math.min(1.35, Math.max(0.6, savedGunY));
        const savedLobbyGunZ = parseFloat(localStorage.getItem('pointerx_lobby_gun_z'));
        if (!isNaN(savedLobbyGunZ)) lobbyGunZ = Math.min(1, Math.max(0.3, savedLobbyGunZ));
        const savedGunScale = parseFloat(localStorage.getItem('pointerx_lobby_gun_scale'));
        if (!isNaN(savedGunScale)) lobbyGunScale = Math.min(2, Math.max(0.5, savedGunScale));
        const savedCrouchHip = parseFloat(localStorage.getItem('pointerx_crouch_hip'));
        if (!isNaN(savedCrouchHip)) crouchHip = Math.min(1.2, Math.max(0, savedCrouchHip));
        const savedCrouchKnee = parseFloat(localStorage.getItem('pointerx_crouch_knee'));
        if (!isNaN(savedCrouchKnee)) crouchKnee = Math.min(2, Math.max(0, savedCrouchKnee));
        const savedCrouchDrop = parseFloat(localStorage.getItem('pointerx_crouch_drop'));
        if (!isNaN(savedCrouchDrop)) crouchDrop = Math.min(0.3, Math.max(0, savedCrouchDrop));
        const savedCrouchPreview = localStorage.getItem('pointerx_crouch_preview');
        if (savedCrouchPreview === '1') lobbyCrouchPreview = true;
        const savedIGRotX = parseFloat(localStorage.getItem('pointerx_ingame_gun_rotX'));
        if (!isNaN(savedIGRotX)) inGameGunRotX = Math.min(60, Math.max(-60, savedIGRotX));
        const savedIGRotY = parseFloat(localStorage.getItem('pointerx_ingame_gun_rotY'));
        if (!isNaN(savedIGRotY)) inGameGunRotY = Math.min(60, Math.max(-60, savedIGRotY));
        const savedIGPosX = parseFloat(localStorage.getItem('pointerx_ingame_gun_posX'));
        if (!isNaN(savedIGPosX)) inGameGunPosX = Math.min(1, Math.max(-1, savedIGPosX));
        const savedIGPosY = parseFloat(localStorage.getItem('pointerx_ingame_gun_posY'));
        if (!isNaN(savedIGPosY)) inGameGunPosY = Math.min(2, Math.max(0.6, savedIGPosY));
        const savedIGPosZ = parseFloat(localStorage.getItem('pointerx_ingame_gun_posZ'));
        if (!isNaN(savedIGPosZ)) inGameGunPosZ = Math.min(1, Math.max(-0.5, savedIGPosZ));
        const savedIGPlayerSize = parseFloat(localStorage.getItem('pointerx_ingame_player_size'));
        if (!isNaN(savedIGPlayerSize)) inGamePlayerSize = Math.min(2, Math.max(0.3, savedIGPlayerSize));
        const savedIGPlayerRotate = parseFloat(localStorage.getItem('pointerx_ingame_player_rotate'));
        if (!isNaN(savedIGPlayerRotate)) inGamePlayerRotate = Math.min(180, Math.max(-180, savedIGPlayerRotate));
        // 💪 Pushup height (zameen se upar) — default 0.45 (zameen me na ghuse).
        const savedIGPushupHeight = parseFloat(localStorage.getItem('pointerx_ingame_pushup_height'));
        if (!isNaN(savedIGPushupHeight)) inGamePushupHeight = Math.min(0.8, Math.max(0.3, savedIGPushupHeight));
        
        partNames.forEach(part => {
            ['scale', 'rotX', 'rotY', 'rotZ', 'posX', 'posY', 'posZ'].forEach(prop => {
                const val = parseFloat(localStorage.getItem(`pointerx_custom_${part}_${prop}`));
                if (!isNaN(val)) lobbyCustomParts[part][prop] = val;
            });
        });
    }
} catch (e) {}

let lastLocalChatText = '';
let lastLocalChatTime = 0;
let lastServerChatKey = '';
let lastServerChatTime = 0;
const shownChatIds = new Set();

let isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
let mobileJoystick = { active: false, x: 0, y: 0 };
let touchLook = { active: false, startX: 0, startY: 0 };
// 📱 Mobile multi-touch — har ungli (touch) ka apna identifier hota hai,
// is liye joystick + look + buttons EK SAATH chalte hain (bari bari nahi).
let joystickTouchId = null; // Joystick wali ungli ka touch id.
let joystickCenter = { x: 0, y: 0 }; // Joystick circle ka centre (screen px).
let lookTouchId = null; // Look (dekhne) wali ungli ka touch id.
let lookLast = { x: 0, y: 0 }; // Look ki aakhri position (delta ke liye).
let mobileMoveX = 0; // Joystick analog: -1 (left) se 1 (right).
let mobileMoveZ = 0; // Joystick analog: -1 (peeche) se 1 (aage).
let mobileChatOpen = false; // Mobile chat khula hai ya nahi.
// 📱 Landscape lock — mobile par game sirf landscape (aada) me chalega.
// Portrait me PLAY dabao to game start nahi hota, rotate ka intezar hota hai.
let waitingForLandscape = false; // PLAY daba diya, landscape ka intezar hai.
let waitingPlayerName = ''; // Landscape hote hi is naam se game start hoga.

let authInitialized = false;

const sounds = {
    shoot: new Audio('sounds/shoot.mp3'),
    jump: new Audio('sounds/jump.mp3'),
    dash: new Audio('sounds/jump.mp3'),
    hit: new Audio('sounds/hit.mp3'),
    death: new Audio('sounds/death.mp3')
};

sounds.shoot.volume = 0.5;
sounds.jump.volume = 0.4;
sounds.dash.volume = 0.6;
sounds.hit.volume = 0.6;
sounds.death.volume = 0.7;

function playSound(soundName) {
    if (sounds[soundName]) {
        try {
            const soundClone = sounds[soundName].cloneNode();
            soundClone.volume = sounds[soundName].volume;
            const playPromise = soundClone.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {});
            }
        } catch (e) {}
    }
}

function unlockAudio() {
    Object.keys(sounds).forEach(key => {
        sounds[key].play().then(() => {
            sounds[key].pause();
            sounds[key].currentTime = 0;
        }).catch(() => {});
    });
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
}
window.addEventListener('click', unlockAudio);
window.addEventListener('touchstart', unlockAudio);

// 🔫 AK-47 auto-fire sound — har goli ki awaz (shoot.mp3) alag clone
// me bajti hai; 100ms par goliyan overlap ho kar AK-47 jaisi lagatar
// awaz banti hain (ek loop me gap aa sakta tha). Clones track hote
// hain taake mouse chorte hi sab TURANT band ho jayein (warna aakhri
// goliyan bajti rehti). Sirf AR-9 (weapon 1) ye use karta hai.
let autoShotSounds = [];
function playAutoShotSound() {
    try {
        const s = sounds.shoot.cloneNode();
        s.volume = sounds.shoot.volume;
        autoShotSounds.push(s);
        s.onended = () => { const i = autoShotSounds.indexOf(s); if (i !== -1) autoShotSounds.splice(i, 1); };
        const p = s.play();
        if (p !== undefined) p.catch(() => {});
    } catch (e) {}
}
function stopAutoShotSounds() {
    try {
        autoShotSounds.forEach((s) => { try { s.pause(); s.currentTime = 0; } catch (e) {} });
        autoShotSounds = [];
    } catch (e) {}
}

init();
animate();

function setupAuthListener() {
    if (authInitialized) return;
    const auth = window.firebaseAuth;
    if (!auth || !window.onAuthStateChanged) return;

    authInitialized = true;

    if (window.getRedirectResult) {
        window.getRedirectResult(auth).then((result) => {
            if (result && result.user) {
                showGoogleNamePrompt(result.user);
            }
        }).catch((err) => {});
    }

    // Starting point hamesha lobby hai: URL khulte hi naam wala lobby
    // dikhega, PLAY dabane par hi game start hogi. Saved naam (Google ya
    // guest) lobby me pehle se bhara hua milega, lekin game khud start
    // nahi hogi — pehle aisa hota tha ke saved naam milte hi game seedha
    // shuru ho jati thi aur lobby dikhta hi nahi tha.
    window.onAuthStateChanged(auth, (user) => {
        if (user) {
            if (!gameStarted) {
                showGoogleNamePrompt(user);
            }
        } else {
            if (!gameStarted) {
                initNamePrompt();
            }
        }
    });
}

if (window.firebaseAuth) {
    setupAuthListener();
} else {
    window.addEventListener('firebase-ready', setupAuthListener);
    window.addEventListener('load', () => {
        setTimeout(() => {
            if (!authInitialized && !gameStarted) {
                initNamePrompt();
            }
        }, 1000);
    });
}

window.addEventListener('load', () => {
    setupExitButton();
    setupChatSystem();
});

function setupChatSystem() {
    const chatInput = document.getElementById('chat-input');
    const chatInputWrapper = document.getElementById('chat-input-wrapper');
    const sendBtn = document.getElementById('chat-send-btn');
    // Chat shuru me chhupa rahe — Enter/T dabane par hi khulega.
    const chatContainer = document.getElementById('chat-container');
    if (chatContainer) chatContainer.style.display = 'none';

    if (sendBtn) {
        sendBtn.addEventListener('click', () => {
            submitChatMessage();
        });
    }

    if (chatInput) {
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.code === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                submitChatMessage();
            }
        });
    }
}

function submitChatMessage() {
    const chatInput = document.getElementById('chat-input');
    const chatInputWrapper = document.getElementById('chat-input-wrapper');
    if (!chatInput) return;

    const text = chatInput.value.trim();
    if (text !== '') {
        const msgId = (socket.id || 'local') + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
        shownChatIds.add(msgId);
        appendChatMessage(playerName, text, 'white');
        lastLocalChatText = text;
        lastLocalChatTime = Date.now();
        socket.emit('sendChatMessage', { id: msgId, message: text });
    }
    chatInput.value = '';
    if (chatInputWrapper) chatInputWrapper.style.display = 'none';
    // Enter dabate hi fade shuru — 2 sec me halki ho kar gayab.
    const chatContainer = document.getElementById('chat-container');
    if (chatContainer) {
        if (chatHideTimer) { clearTimeout(chatHideTimer); chatHideTimer = null; }
        chatContainer.style.transition = 'opacity 2s ease';
        chatContainer.style.opacity = '0';
        chatHideTimer = setTimeout(() => {
            chatContainer.style.display = 'none';
            chatContainer.style.opacity = '1';
            chatHideTimer = null;
        }, 2000);
    }
    
    if (gameStarted && !isDeadLocal) {
        try { document.body.requestPointerLock(); } catch (e) {}
    }
}

function setupExitButton() {
    const oldBtn = document.getElementById('logout-btn');
    if (oldBtn) {
        const newBtn = oldBtn.cloneNode(true);
        newBtn.textContent = 'EXIT';
        newBtn.addEventListener('click', exitToLobby);
        oldBtn.replaceWith(newBtn);
        return;
    }
    if (document.getElementById('exit-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'exit-btn';
    btn.textContent = 'EXIT';
    btn.style.position = 'absolute';
    btn.style.top = '20px';
    btn.style.right = '20px';
    btn.style.background = '#ff3333';
    btn.style.color = 'white';
    btn.style.border = 'none';
    btn.style.padding = '8px 14px';
    btn.style.fontWeight = 'bold';
    btn.style.borderRadius = '5px';
    btn.style.cursor = 'pointer';
    btn.style.zIndex = '100';
    btn.style.fontFamily = 'monospace';
    btn.style.display = 'none';
    btn.style.boxShadow = '0 2px 5px rgba(0,0,0,0.5)';
    btn.addEventListener('click', exitToLobby);
    document.body.appendChild(btn);
}

function exitToLobby() {
    try { document.exitPointerLock(); } catch (e) {}
    gameStarted = false;
    isLocked = false;
    isDeadLocal = false;
    isMouseHeld = false;
    stopAutoShotSounds(); // 🔫 Lobby wapis to AR-9 ki awaz band.
    // 📱 Mobile controls chhupao (lobby me joystick/buttons nahi chahiye).
    try {
        const _mUI = document.getElementById('mobile-controls-ui');
        if (_mUI) _mUI.remove();
        joystickTouchId = null; lookTouchId = null;
        mobileMoveX = 0; mobileMoveZ = 0;
        if (mobileChatOpen) { mobileChatOpen = false; const _cc = document.getElementById('chat-container'); if (_cc) _cc.style.display = 'none'; }
    } catch (e) {}
    moveForward = false; moveBackward = false; moveLeft = false; moveRight = false;
    isCrouching = false;
    if (velocity) velocity.set(0, 0, 0);
    myHealth = 100; myKills = 0; myDeaths = 0; bhopBonus = 0; bhopChain = 0;
    // 🏁 Match beech me chhor diya (EXIT) — pending rewards zaya (save nahi honge).
    try { discardMatchRewards(); } catch (e) {}
    try { hideMatchResults(); } catch (e) {}
    if (typeof hideRespawnScreen === 'function') hideRespawnScreen();
    Object.keys(otherPlayers).forEach((id) => {
        if (scene) {
            if (otherPlayers[id].mesh) scene.remove(otherPlayers[id].mesh);
            if (otherPlayers[id].nameTag) scene.remove(otherPlayers[id].nameTag);
        }
        delete otherPlayers[id];
    });
    targets = [];
    inGameGunGroups = [];
    if (typeof closeInGameGunEditor === 'function') closeInGameGunEditor();
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) chatMessages.innerHTML = '';
    const blocker = document.getElementById('blocker');
    if (blocker) blocker.style.display = 'none';
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.style.display = 'none';
    const exitBtn = document.getElementById('exit-btn');
    if (exitBtn) exitBtn.style.display = 'none';
    if (camera) camera.position.set(0, playerHeight, 0);
    if (socket && typeof socket.disconnect === 'function') {
        try { socket.disconnect(); } catch (e) {}
    }
    const auth = window.firebaseAuth;
    const currentUser = auth ? auth.currentUser : null;
    if (currentUser) {
        showGoogleNamePrompt(currentUser);
    } else {
        initNamePrompt();
    }
    updateHUD();
}

function appendChatMessage(sender, text, color = 'white') {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;

    const msgDiv = document.createElement('div');
    msgDiv.style.color = color;
    msgDiv.style.wordBreak = 'break-word';
    
    if (sender) {
        msgDiv.innerHTML = `<span style="font-weight: bold; color: white;">${sender}:</span> ${text}`;
    } else {
        msgDiv.innerHTML = `<span style="font-weight: bold; color: ${color};">${text}</span>`;
    }

    chatMessages.appendChild(msgDiv);

    if (chatMessages.children.length > 8) {
        chatMessages.removeChild(chatMessages.children[0]);
    }

    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 🌄 Realistic lobby background — flat blue ki jagah sunset sky, zameen,
// fog, trees, rocks, mountains, clouds aur sun. Sab procedural (koi
// external image nahi), sirf lobbyScene me — game scene ko nahi chhoota.
// Camera fixed hai (0,1.4,3.4) aur character ko dekh raha hai, is liye
// scenery character ke peeche (-Z) aur sides par hai, camera ke saamne nahi.
// Sky gradient ko canvas par draw karo (palette = 6 colours).
function drawSkyGradient(ctx, palette) {
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    for (let i = 0; i < 6; i++) g.addColorStop(SKY_STOPS[i], palette[i]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4, 512);
}
// 🌇 Sunset sky gradient (lobby + game dono me SAME) — canvas texture.
// Deep blue upar, warm golden horizon. Lobby aur game ek hi helper use
// karte hain taake aasman bilkul ek jaisa dikhe.
function makeSunsetSkyTexture() {
    const c = document.createElement('canvas');
    c.width = 4; c.height = 512;
    drawSkyGradient(c.getContext('2d'), SKY_PALETTES.sunset);
    return new THREE.CanvasTexture(c);
}

function buildLobbyEnvironment() {
    if (!lobbyScene || (lobbyScene.userData && lobbyScene.userData._envBuilt)) return;
    try { lobbyScene.userData._envBuilt = true; } catch (e) {}
    // 1) Sky gradient (canvas) — sunset: deep blue upar, warm golden horizon.
    try {
        lobbyScene.background = makeSunsetSkyTexture();
    } catch (e) {
        lobbyScene.background = new THREE.Color(0x2e4a7a);
    }
    // 2) Fog — door ki zameen aur mountains warm horizon me ghul jayen.
    try { lobbyScene.fog = new THREE.Fog(0xe8956d, 10, 38); } catch (e) {}
    // 3) Ground — bara grass circle (character ka platform uske upar hai).
    try {
        const ground = new THREE.Mesh(
            new THREE.CircleGeometry(40, 48),
            new THREE.MeshStandardMaterial({ color: 0x4a7a3f, roughness: 1, metalness: 0 })
        );
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = 0;
        lobbyScene.add(ground);
    } catch (e) {}
    // 4) Trees — low-poly (trunk + 2 cones), character ke peeche aur sides par.
    try {
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 1 });
        const leafMat1 = new THREE.MeshStandardMaterial({ color: 0x2e5d33, roughness: 1 });
        const leafMat2 = new THREE.MeshStandardMaterial({ color: 0x3a7040, roughness: 1 });
        const treeSpots = [[-5, -4, 1.1], [5.5, -5, 1.3], [-7, -8, 1.0], [7, -9, 1.2], [-4, -10, 0.9], [4, -12, 1.1], [-9, -3, 1.0], [9, -2, 1.2]];
        treeSpots.forEach(([x, z, s]) => {
            const t = new THREE.Group();
            const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.9, 6), trunkMat);
            trunk.position.y = 0.45;
            t.add(trunk);
            const c1 = new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.6, 8), leafMat1);
            c1.position.y = 1.5;
            t.add(c1);
            const c2 = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.2, 8), leafMat2);
            c2.position.y = 2.3;
            t.add(c2);
            t.position.set(x, 0, z);
            t.scale.setScalar(s);
            lobbyScene.add(t);
        });
    } catch (e) {}
    // 5) Rocks — chhote grey pathar, zameen par bikhre hue.
    try {
        const rockMat = new THREE.MeshStandardMaterial({ color: 0x8a8a8a, roughness: 1 });
        const rockSpots = [[-2.5, -3, 0.5], [3, -2.5, 0.4], [-3.5, -6, 0.6], [2, -7, 0.5], [6, -3, 0.45]];
        rockSpots.forEach(([x, z, s]) => {
            const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5, 0), rockMat);
            r.position.set(x, 0.15, z);
            r.scale.set(s, s * 0.6, s);
            r.rotation.y = x * 1.3;
            lobbyScene.add(r);
        });
    } catch (e) {}
    // 6) Mountains — door bade cones, sky ke against silhouette.
    try {
        const mtnMat = new THREE.MeshStandardMaterial({ color: 0x2a3a5c, roughness: 1 });
        const mtnSpots = [[-18, -20, 12, 9], [15, -24, 14, 11], [-5, -28, 16, 13], [22, -18, 10, 8]];
        mtnSpots.forEach(([x, z, r, h]) => {
            const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 5), mtnMat);
            m.position.set(x, h / 2 - 0.5, z);
            lobbyScene.add(m);
        });
    } catch (e) {}
    // 7) Clouds — safed flattened spheres, upar aasman me.
    try {
        const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0.9 });
        const cloudSpots = [[-8, 8, -15], [6, 9, -18], [0, 10, -22], [-14, 7, -10], [12, 8, -12]];
        cloudSpots.forEach(([x, y, z]) => {
            const cl = new THREE.Group();
            [[0, 0, 0, 1.4], [1.3, 0.15, 0.3, 1.0], [-1.2, 0.1, -0.2, 0.9]].forEach(([ox, oy, oz, s]) => {
                const puff = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), cloudMat);
                puff.position.set(ox, oy, oz);
                puff.scale.set(s, s * 0.45, s);
                cl.add(puff);
            });
            cl.position.set(x, y, z);
            lobbyScene.add(cl);
        });
    } catch (e) {}
    // 8) Sun — warm disc + soft glow, horizon ke paas right side par.
    try {
        const sun = new THREE.Mesh(new THREE.CircleGeometry(1.2, 32), new THREE.MeshBasicMaterial({ color: 0xffd27a }));
        sun.position.set(9, 3.5, -20);
        sun.lookAt(0, 1.4, 3.4);
        lobbyScene.add(sun);
        const glow = new THREE.Mesh(new THREE.CircleGeometry(2.6, 32), new THREE.MeshBasicMaterial({ color: 0xff9e5e, transparent: true, opacity: 0.3 }));
        glow.position.set(9, 3.5, -20.1);
        glow.lookAt(0, 1.4, 3.4);
        lobbyScene.add(glow);
    } catch (e) {}
}

// 🌇 Game ka environment — lobby jaisa hi (sunset sky, trees, mountains,
// rocks, clouds, sun). Lobby wala buildLobbyEnvironment() chhote scene ke
// liye hai; ye game wale bade arena (500x500) ke scale par hai. Trees aur
// mountains deewaron (±250) ke BAHAR hain taake khelne me rukawat na bane;
// trees itne lambe hain ke unke upar wale hisse 10m deewaron ke upar se dikhte hain.
function buildGameEnvironment() {
    if (!scene || (scene.userData && scene.userData._envBuilt)) return;
    try { scene.userData._envBuilt = true; } catch (e) {}
    // 1) Sky — lobby wali sunset gradient (shared helper, bilkul same).
    // Game ka sky DYNAMIC hai: day/night cycle is canvas ko dobara draw
    // karta hai (updateGameSky), is liye canvas/ctx/texture globals me rakhe.
    try {
        gameSkyCanvas = document.createElement('canvas');
        gameSkyCanvas.width = 4; gameSkyCanvas.height = 512;
        gameSkyCtx = gameSkyCanvas.getContext('2d');
        gameSkyTexture = new THREE.CanvasTexture(gameSkyCanvas);
        scene.background = gameSkyTexture;
        updateGameSky(0); // shuruaat sunrise (dawn) par
    } catch (e) { scene.background = new THREE.Color(0x2e4a7a); }
    // 2) Fog — HATA DIYA (Jimmy: dekhne par ajeeb si light lagti thi).
    // Game me ab koi fog nahi — door tak sab saaf dikhega. Lobby ki fog
    // (lobbyScene, 10-38) waisi hi hai, usay haath nahi lagaya.
    // 3) Trees — deewaron ke bahar, arena ke chaaron taraf (ring).
    try {
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 1 });
        const leafMat1 = new THREE.MeshStandardMaterial({ color: 0x2e5d33, roughness: 1 });
        const leafMat2 = new THREE.MeshStandardMaterial({ color: 0x3a7040, roughness: 1 });
        const treeSpots = [
            // Bahar wale (16) — deewaron ke bahar, lambe (scale 4.5-5.5).
            [-265, -80, 5.0], [265, -120, 5.5], [-260, 100, 4.5], [262, 60, 5.0],
            [-120, -265, 5.5], [90, -262, 5.0], [-40, 265, 4.5], [150, 262, 5.0],
            [-265, -200, 4.5], [265, 200, 5.0], [-200, -262, 5.5], [200, -265, 4.5],
            [-180, 262, 5.0], [60, 265, 5.5], [265, -40, 4.5], [-262, 180, 5.0],
            // Andar wale (6) — boundary ke andar, deewaron/konon ke paas,
            // centre (spawn) se door. Chhote (scale 2.5-3.5) taake paas se
            // theek lagen — bahar walon jitne lambe andar ajeeb lagte.
            [-220, -200, 3.0], [210, -180, 2.5], [-190, 190, 3.5],
            [200, 210, 3.0], [-80, -220, 2.5], [100, 220, 3.0]
        ];
        treeSpots.forEach(([x, z, s]) => {
            const t = new THREE.Group();
            const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.9, 6), trunkMat);
            trunk.position.y = 0.45;
            trunk.castShadow = true; // 🌑 Tree ka shadow
            t.add(trunk);
            const c1 = new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.6, 8), leafMat1);
            c1.position.y = 1.5;
            c1.castShadow = true;
            t.add(c1);
            const c2 = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.2, 8), leafMat2);
            c2.position.y = 2.3;
            c2.castShadow = true;
            t.add(c2);
            t.position.set(x, 0, z);
            t.scale.setScalar(s);
            scene.add(t);
        });
    } catch (e) {}
    // 4) Rocks — bade boulders, arena ke kinaron par (deewaron ke paas).
    try {
        const rockMat = new THREE.MeshStandardMaterial({ color: 0x8a8a8a, roughness: 1 });
        const rockSpots = [[-235, -235, 4.0], [235, -235, 4.5], [-235, 235, 4.0], [235, 235, 5.0], [-100, -238, 3.5], [120, 238, 4.0]];
        rockSpots.forEach(([x, z, s]) => {
            const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5, 0), rockMat);
            r.position.set(x, 0.15, z);
            r.scale.set(s, s * 0.6, s);
            r.rotation.y = x * 1.3;
            r.castShadow = true; // 🌑 Pathar ka shadow
            scene.add(r);
        });
    } catch (e) {}
    // 5) Mountains — door bade cones, chaaron taraf horizon par.
    try {
        const mtnMat = new THREE.MeshStandardMaterial({ color: 0x2a3a5c, roughness: 1 });
        const mtnSpots = [[-320, -180, 90, 110], [300, -260, 100, 130], [-180, -330, 110, 140], [220, -320, 80, 100], [-330, 120, 95, 120], [330, 80, 85, 105], [60, 340, 110, 135], [-80, 330, 90, 115]];
        mtnSpots.forEach(([x, z, r, h]) => {
            const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 5), mtnMat);
            m.position.set(x, h / 2 - 0.5, z);
            m.castShadow = true; // 🌑 Pahad ka shadow (shadow camera ki range me ho to)
            scene.add(m);
        });
    } catch (e) {}
    // 6) Clouds — upar aasman me, bade aur chaaron taraf (fog se upar).
    try {
        const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0.9, fog: false });
        const cloudSpots = [[-180, 90, -220], [150, 100, -260], [0, 110, -300], [-260, 85, -60], [240, 95, -80], [200, 90, 220], [-200, 100, 200], [40, 105, 280]];
        cloudSpots.forEach(([x, y, z]) => {
            const cl = new THREE.Group();
            [[0, 0, 0, 1.4], [1.3, 0.15, 0.3, 1.0], [-1.2, 0.1, -0.2, 0.9]].forEach(([ox, oy, oz, s]) => {
                const puff = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), cloudMat);
                puff.position.set(ox, oy, oz);
                puff.scale.set(s, s * 0.45, s);
                cl.add(puff);
            });
            cl.position.set(x, y, z);
            cl.scale.setScalar(14);
            scene.add(cl);
        });
    } catch (e) {}
    // 7) Sun — warm disc + soft glow, horizon ke paas (fog se upar).
    // Pahadon ke beech wali khaali jagah par hai taake dikhe. Position
    // day/night cycle (updateDayNight) har frame set karta hai.
    try {
        gameSun = new THREE.Mesh(new THREE.CircleGeometry(20, 32), new THREE.MeshBasicMaterial({ color: 0xffd27a, fog: false }));
        gameSun.position.set(320, 0, -320);
        gameSun.lookAt(0, 10, 0);
        scene.add(gameSun);
        gameSunGlow = new THREE.Mesh(new THREE.CircleGeometry(45, 32), new THREE.MeshBasicMaterial({ color: 0xff9e5e, transparent: true, opacity: 0.3, fog: false }));
        gameSunGlow.position.set(320, 0, -321);
        gameSunGlow.lookAt(0, 10, 0);
        scene.add(gameSunGlow);
    } catch (e) {}
    // 8) Moon — raat me, sun ke bilkul opposite (Minecraft jaisi).
    try {
        gameMoon = new THREE.Mesh(new THREE.CircleGeometry(14, 32), new THREE.MeshBasicMaterial({ color: 0xe8ecf2, fog: false }));
        gameMoon.position.set(-320, -100, -320);
        gameMoon.visible = false;
        scene.add(gameMoon);
        gameMoonGlow = new THREE.Mesh(new THREE.CircleGeometry(30, 32), new THREE.MeshBasicMaterial({ color: 0x9fb4d8, transparent: true, opacity: 0.25, fog: false }));
        gameMoonGlow.position.set(-320, -100, -321);
        gameMoonGlow.visible = false;
        scene.add(gameMoonGlow);
    } catch (e) {}
    // 9) Stars — raat me nazar aate hain (Minecraft jaisi), din me gayab.
    try {
        const starGeo = new THREE.BufferGeometry();
        const starPos = [];
        for (let i = 0; i < 400; i++) {
            const a = Math.random() * Math.PI * 2;
            const el = Math.random() * Math.PI * 0.45 + 0.05;
            const r = 750;
            starPos.push(Math.cos(a) * Math.cos(el) * r, Math.sin(el) * r, Math.sin(a) * Math.cos(el) * r);
        }
        starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
        gameStars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false }));
        gameStars.visible = false;
        scene.add(gameStars);
    } catch (e) {}
}

// 🌇 Day/night helpers — do rangon ke beech smooth blend.
function lerpHexInto(hexA, hexB, t) {
    _skyC1.set(hexA); _skyC2.set(hexB);
    _skyC1.lerp(_skyC2, Math.max(0, Math.min(1, t)));
    return _skyC1;
}
// Sun ki unchai (e: -1 aadhi raat .. 0 horizon .. 1 dopahar) se sky palette.
function blendSkyPalette(e) {
    const night = SKY_PALETTES.night, sunset = SKY_PALETTES.sunset, day = SKY_PALETTES.day;
    let from, to, t;
    if (e < 0.05) { // raat -> sunset (e: -0.25 -> 0.05)
        from = night; to = sunset;
        t = (e + 0.25) / 0.3;
    } else { // sunset -> din (e: 0.05 -> 0.55)
        from = sunset; to = day;
        t = (e - 0.05) / 0.5;
    }
    t = Math.max(0, Math.min(1, t));
    const out = [];
    for (let i = 0; i < 6; i++) {
        _skyC1.set(from[i]); _skyC2.set(to[i]);
        _skyC1.lerp(_skyC2, t);
        out.push('#' + _skyC1.getHexString());
    }
    return out;
}
// Game ka sky dobara draw karo (sun ki unchai ke hisaab se).
function updateGameSky(e) {
    if (!gameSkyCtx || !gameSkyTexture) return;
    try {
        drawSkyGradient(gameSkyCtx, blendSkyPalette(e));
        gameSkyTexture.needsUpdate = true;
    } catch (err) {}
}

// 🌞🌙 Day/night cycle — Minecraft-style (10-min game cycle, NOT real 24h).
// Sun purab se nikalta hai, dopahar upar, maghrib me doobta hai; raat ko
// moon aata hai + taare. Roshni ka mood badalta hai: din bright, sunset
// orange, raat dim blue (moonlight). Har frame animate() se chalti hai.
function updateDayNight(dt) {
    if (!scene) return;
    gameTime += dt;
    const theta = (gameTime / DAY_NIGHT_CYCLE) * Math.PI * 2; // 0..2π
    const sunE = Math.sin(theta); // sun ki unchai: -1..1
    const R = 320;
    // ☀️ Sun hamesha player ko dekh raha hai — orbit player par centred hai
    // (player.x / player.y se), aur disc har frame player ki taraf murti hai.
    // Asli sun ki tarah: player jahan bhi jaye, sun usi relative direction me.
    const px = camera ? camera.position.x : 0;
    const pz = camera ? camera.position.z : 0;
    const sunX = px + Math.cos(theta) * R;
    const sunY = Math.sin(theta) * R;
    const moonTheta = theta + Math.PI; // moon sun ke opposite
    const moonX = px + Math.cos(moonTheta) * R;
    const moonY = Math.sin(moonTheta) * R;
    // Sun/moon ki position — horizon se neeche ho to chhupa do.
    if (gameSun) {
        gameSun.position.set(sunX, sunY, pz);
        if (camera) gameSun.lookAt(camera.position);
        gameSun.visible = sunY > -10;
    }
    if (gameSunGlow) {
        gameSunGlow.position.set(sunX, sunY, pz);
        if (camera) gameSunGlow.lookAt(camera.position);
        gameSunGlow.visible = sunY > -10;
    }
    if (gameMoon) {
        gameMoon.position.set(moonX, moonY, pz);
        if (camera) gameMoon.lookAt(camera.position);
        gameMoon.visible = moonY > -10;
    }
    if (gameMoonGlow) {
        gameMoonGlow.position.set(moonX, moonY, pz);
        if (camera) gameMoonGlow.lookAt(camera.position);
        gameMoonGlow.visible = moonY > -10;
    }
    // Taare raat me fade-in (din me gayab).
    if (gameStars) {
        const starAmt = Math.max(0, Math.min(1, (-sunE - 0.05) / 0.4));
        gameStars.material.opacity = starAmt;
        gameStars.visible = starAmt > 0.01;
    }
    // Roshni ka mood: din (1) <-> raat (0).
    const dayAmt = Math.max(0, Math.min(1, (sunE - 0.05) / 0.5));
    // Directional (sun/moon) — rang + intensity + position (shadow ka rukh).
    if (gameDirLight) {
        if (sunE >= 0.05) { // din: sunset orange -> warm white
            gameDirLight.color.copy(lerpHexInto(0xff9e5e, 0xfff2d9, dayAmt));
        } else { // raat: moon blue -> sunset orange
            gameDirLight.color.copy(lerpHexInto(0x8fa8d8, 0xff9e5e, Math.max(0, Math.min(1, (sunE + 0.25) / 0.3))));
        }
        gameDirLight.intensity = 0.25 + 0.45 * dayAmt; // raat 0.25, din 0.7
        // Light player ke peeche (sun/moon ki direction me) — shadow camera
        // player par centred rahe. Direction sun/moon wali hi hai.
        const ldx = sunY > 0 ? Math.cos(theta) : Math.cos(moonTheta);
        const ldy = sunY > 0 ? Math.sin(theta) : Math.sin(moonTheta);
        gameDirLight.position.set(px + ldx * 150, Math.max(ldy * 150, 12), pz);
        gameDirLight.target.position.set(px, 0, pz);
    }
    // Ambient — din bright, raat dim blue.
    if (gameAmbientLight) {
        if (sunE >= 0.05) gameAmbientLight.color.copy(lerpHexInto(0xffd9b0, 0xffffff, dayAmt));
        else gameAmbientLight.color.copy(lerpHexInto(0x334466, 0xffd9b0, Math.max(0, Math.min(1, (sunE + 0.25) / 0.3))));
        gameAmbientLight.intensity = 0.15 + 0.35 * dayAmt; // raat 0.15, din 0.5
    }
    // Fog ka rang — hata diya (game me fog hi nahi hai ab).
    // Sky dobara draw karo — har frame nahi, har 0.5 sec (canvas redraw mehenga hai).
    dayNightSkyTimer += dt;
    if (dayNightSkyTimer > 0.5) {
        dayNightSkyTimer = 0;
        updateGameSky(sunE);
    }
}

function createLobbyCharacter() {
    try {
        if (lobbyCharacter) return;
        if (typeof createSteveCharacter !== 'function') return;
        if (!lobbyScene) {
            lobbyScene = new THREE.Scene();
            buildLobbyEnvironment();
            // Roshni itni ke sab kuch saaf dikhe, lekin character white na glow kare.
            // Pehle ambient 0.9 + directional 1.2 tha (bohat zyada, rang dhul jate the).
            lobbyScene.add(new THREE.AmbientLight(0xffffff, 0.5));
            const dl = new THREE.DirectionalLight(0xffffff, 0.7);
            dl.position.set(2, 4, 3);
            lobbyScene.add(dl);
            const platform = new THREE.Mesh(new THREE.CircleGeometry(0.65, 32), new THREE.MeshBasicMaterial({ color: 0x050a20 }));
            lobbyPlatform = platform;
            platform.scale.set((lobbyPlayerSize / 0.5) * lobbyShadowScale, (lobbyPlayerSize / 0.5) * lobbyShadowScale, 1);
            platform.rotation.x = -Math.PI / 2;
            platform.position.y = 0.01;
            lobbyScene.add(platform);
            lobbyCamera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
            lobbyCamera.position.set(0, isMobile ? 1.5 : 1.4, isMobile ? 4.2 : 3.4); // 📱 Mobile: camera peeche (character chhota, poora dikhe).
            lobbyCamera.lookAt(0, lobbyPlayerSize * PLAYER_HEIGHT_RATIO, 0);
        }
        const steve = createSteveCharacter('lobby');
        lobbySteveParts = steve;
        
        const group = steve.group;
        group.position.set(0, 0, 0);
        group.rotation.set(0, lobbyPlayerRotate * Math.PI / 180, 0);
        setPlayerScale(group, lobbyPlayerSize);
        
        applyCustomTransformsToParts(lobbySteveParts);

        // Lobby gun, image jaisi pose: seene ke saamne, bilkul horizontal,
        // muzzle viewer ke right side par, aur haathon se aage (z 0.62)
        // taake gun haath ke peeche ghusi hui na lage. Gun group ka origin
        // gun ke centre par hai (y 0.95), taake GUN SIZE slider gun ko usi
        // jagah par bara/chota kare, neeche na khiskaye. Sirf lobby gun
        // badli hai — in-game gun, arms, legs, size/rotate/shadow waisi hi.
        const gunGroup = new THREE.Group();
        gunGroup.position.set(lobbyGunX, lobbyGunY, lobbyGunZ);
        gunGroup.rotation.set(0, Math.PI / 2, 0);
        gunGroup.scale.set(lobbyGunScale, lobbyGunScale, lobbyGunScale);
        lobbyGunGroup = gunGroup;
        // 🎒 Lobby gun equipped slot-1 gun se (AR-9 ya VITA sniper).
        try { loadEquippedGuns(); } catch (e) {}
        gunGroup.add(equippedGun1 === 'vita' ? buildVitaSniper() : buildAR9Gun());
        group.add(gunGroup);

        // ARMS: yahan koi overwrite NAHI — haath CUSTOM pose me rehte
        // hain (slider/baked values). Pehle yahan gun-hold pose (-0.9, 0,
        // ±0.3) force hota tha, to lobby khulte hi haath galat dikhte the,
        // aur jaisi hi Jimmy koi bhi slider hilata (head bhi), to
        // updatePartProperty → applyCustomTransformsToParts haathon ko
        // custom pose par le aata — is liye haath 'khud sahi ho jate' the.
        // Ab lobby khulte hi haath custom pose me honge, aur slider
        // hilane par bhi wahi rahenge. Gun apni editor position par rehti
        // hai (haath ab bhi aage uthe hain, rotX -0.94 ≈ -0.9).

        lobbyScene.add(group);
        lobbyCharacter = group;
        applyLobbyCrouchPose();
    } catch (e) {}
}

function removeLobbyCharacter() {
    try {
        if (lobbyCharacter && lobbyScene) lobbyScene.remove(lobbyCharacter);
        if (lobbyCharacter && scene) scene.remove(lobbyCharacter);
        lobbyCharacter = null;
        lobbySteveParts = null;
        lobbyGunGroup = null;
    } catch (e) {}
}

function applyCustomTransformsToParts(steveObj) {
    if (!steveObj) return;
    try {
        const mapping = {
            head: steveObj.head,
            body: steveObj.body,
            leftArm: steveObj.leftArmGroup,
            rightArm: steveObj.rightArmGroup,
            leftLeg: steveObj.leftLeg,
            rightLeg: steveObj.rightLeg,
            leftElbow: steveObj.leftElbowMesh,
            rightElbow: steveObj.rightElbowMesh,
            leftKnee: steveObj.leftKneeMesh,
            rightKnee: steveObj.rightKneeMesh
        };

        partNames.forEach(name => {
            const part = mapping[name];
            const cfg = lobbyCustomParts[name];
            if (part && cfg) {
                if (name !== 'leftElbow' && name !== 'rightElbow' && name !== 'leftKnee' && name !== 'rightKnee') {
                    // Head 0.5 x 0.5 x 0.5 cube hai (screenshot) — group ki Y scale
                    // (0.9) use dabati hai, is liye head ki Y scale ko 1/0.9 se
                    // compensate karo taake head cube hi rahe.
                    if (name === 'head') part.scale.set(cfg.scale, cfg.scale / PLAYER_HEIGHT_RATIO, cfg.scale);
                    else part.scale.set(cfg.scale, cfg.scale, cfg.scale);
                    part.rotation.set(cfg.rotX, cfg.rotY, cfg.rotZ);
                    if (name === 'head') part.position.set(0, 1.75 + cfg.posY, cfg.posZ);
                    else if (name === 'body') part.position.set(0, 1.125 + cfg.posY, cfg.posZ);
                    else if (name === 'leftArm') part.position.set(-0.375 + cfg.posX, 1.4 + cfg.posY, cfg.posZ);
                    else if (name === 'rightArm') part.position.set(0.375 + cfg.posX, 1.4 + cfg.posY, cfg.posZ);
                    else if (name === 'leftLeg') part.position.set(-0.125 + cfg.posX, 0.75 + cfg.posY, cfg.posZ);
                    else if (name === 'rightLeg') part.position.set(0.125 + cfg.posX, 0.75 + cfg.posY, cfg.posZ);
                } else {
                    // Elbow Bend Rotation
                    part.rotation.set(cfg.rotX, cfg.rotY, cfg.rotZ);
                }
            }
        });
    } catch (e) {}
}

// 🦵 Knee bend (walk + crouch) hamesha peeche ki taraf — taang ke twist
// (leg rotY) se azaad. Seedha rotation.x lagane se shin twist ki taraf
// mud jati hai aur crouch me taange side me bend ho jati hain (Jimmy ki
// screenshot: game me betha player ki taange side par). Quaternion se
// hisaab: total = hip-bend + user-knee, aur knee = hip^-1 * total.
const _kneeEHip = new THREE.Euler();
const _kneeETarget = new THREE.Euler();
const _kneeEUser = new THREE.Euler();
const _kneeQHip = new THREE.Quaternion();
const _kneeQTarget = new THREE.Quaternion();
const _kneeQUser = new THREE.Quaternion();
const _kneeQKnee = new THREE.Quaternion();
function applyKneeBend(kneeMesh, hipRot, baseKnee, bend) {
    if (!kneeMesh || !hipRot || !baseKnee) return;
    _kneeEHip.set(hipRot.x, hipRot.y, hipRot.z);
    _kneeETarget.set(hipRot.x + bend, hipRot.y, hipRot.z);
    _kneeEUser.set(baseKnee.rotX || 0, baseKnee.rotY || 0, baseKnee.rotZ || 0);
    _kneeQHip.setFromEuler(_kneeEHip);
    _kneeQTarget.setFromEuler(_kneeETarget);
    _kneeQUser.setFromEuler(_kneeEUser);
    _kneeQKnee.copy(_kneeQHip).invert().multiply(_kneeQTarget).multiply(_kneeQUser);
    kneeMesh.rotation.setFromQuaternion(_kneeQKnee);
}

// 🎨 SKIN EDITOR — pixel skin (har pixel par color kar sakte ho).
// Har part ka ek pixel grid hai: HEAD 8x8, BODY 8x10, arms/legs 4x10
// (thigh/upper = upar ki 5 rows, shin/forearm = neeche ki 5 rows).
// Skin sirf texture hai — parts ke scale/rot/pos se iska koi lena dena nahi.
const SKIN_PARTS = {
    head: { w: 8, h: 8, label: 'HEAD' },
    body: { w: 8, h: 10, label: 'BODY' },
    armL: { w: 4, h: 10, label: 'LEFT ARM' },
    armR: { w: 4, h: 10, label: 'RIGHT ARM' },
    legL: { w: 4, h: 10, label: 'LEFT LEG' },
    legR: { w: 4, h: 10, label: 'RIGHT LEG' },
    headB: { w: 8, h: 8, label: 'HEAD (BACK)' },
    bodyB: { w: 8, h: 10, label: 'BODY (BACK)' },
    armLB: { w: 4, h: 10, label: 'LEFT ARM (BACK)' },
    armRB: { w: 4, h: 10, label: 'RIGHT ARM (BACK)' },
    legLB: { w: 4, h: 10, label: 'LEFT LEG (BACK)' },
    legRB: { w: 4, h: 10, label: 'RIGHT LEG (BACK)' },
    headS: { w: 8, h: 8, label: 'HEAD (SIDE)' },
    bodyS: { w: 4, h: 10, label: 'BODY (SIDE)' },
    armLS: { w: 4, h: 10, label: 'LEFT ARM (SIDE)' },
    armRS: { w: 4, h: 10, label: 'RIGHT ARM (SIDE)' },
    legLS: { w: 4, h: 10, label: 'LEFT LEG (SIDE)' },
    legRS: { w: 4, h: 10, label: 'RIGHT LEG (SIDE)' },
};
const SKIN_FRONT_PARTS = ['head', 'body', 'armL', 'armR', 'legL', 'legR'];
const SKIN_PART_ORDER = [...SKIN_FRONT_PARTS, 'headB', 'bodyB', 'armLB', 'armRB', 'legLB', 'legRB', 'headS', 'bodyS', 'armLS', 'armRS', 'legLS', 'legRS'];
// 🎩 OUTER LAYER (Minecraft hat/jacket/sleeves/pants) — base skin ke upar
// wali doosri parat (hood, jacket). Har outer part ka size base jaisa hi
// hai (hat=head 8x8, jacket=body 8x10, sleeves=arms 4x10, pants=legs 4x10).
// Outer grid me null = transparent (wahan base dikhta hai). Code me null
// ko '~' se likhte hain (base62 me nahi hai, is liye palette se takrata nahi).
const SKIN_OUTER_TRANSPARENT = '~';
const SKIN_OUTER_FRONT_PARTS = ['hat', 'jacket', 'sleeveL', 'sleeveR', 'pantsL', 'pantsR'];
const SKIN_OUTER_PARTS = {
    hat: { w: 8, h: 8, label: 'HAT' },
    jacket: { w: 8, h: 10, label: 'JACKET' },
    sleeveL: { w: 4, h: 10, label: 'LEFT SLEEVE' },
    sleeveR: { w: 4, h: 10, label: 'RIGHT SLEEVE' },
    pantsL: { w: 4, h: 10, label: 'LEFT PANTS' },
    pantsR: { w: 4, h: 10, label: 'RIGHT PANTS' },
    hatB: { w: 8, h: 8, label: 'HAT (BACK)' },
    jacketB: { w: 8, h: 10, label: 'JACKET (BACK)' },
    sleeveLB: { w: 4, h: 10, label: 'LEFT SLEEVE (BACK)' },
    sleeveRB: { w: 4, h: 10, label: 'RIGHT SLEEVE (BACK)' },
    pantsLB: { w: 4, h: 10, label: 'LEFT PANTS (BACK)' },
    pantsRB: { w: 4, h: 10, label: 'RIGHT PANTS (BACK)' },
    hatS: { w: 8, h: 8, label: 'HAT (SIDE)' },
    jacketS: { w: 4, h: 10, label: 'JACKET (SIDE)' },
    sleeveLS: { w: 4, h: 10, label: 'LEFT SLEEVE (SIDE)' },
    sleeveRS: { w: 4, h: 10, label: 'RIGHT SLEEVE (SIDE)' },
    pantsLS: { w: 4, h: 10, label: 'LEFT PANTS (SIDE)' },
    pantsRS: { w: 4, h: 10, label: 'RIGHT PANTS (SIDE)' },
};
const SKIN_OUTER_PART_ORDER = [...SKIN_OUTER_FRONT_PARTS, 'hatB', 'jacketB', 'sleeveLB', 'sleeveRB', 'pantsLB', 'pantsRB', 'hatS', 'jacketS', 'sleeveLS', 'sleeveRS', 'pantsLS', 'pantsRS'];
// Outer parts ke dims bhi SKIN_PARTS me (taake decode/encode ek hi lookup use kare).
Object.assign(SKIN_PARTS, SKIN_OUTER_PARTS);
const SKIN_CODE_KEY = 'pointerx_skin_v1';
const SKIN_DRAFT_KEY = 'pointerx_skin_draft';
const SKIN_B64 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
// 👇 Jimmy ki published skin ka code yahan bake hoga (uske bheje hue code se).
let DEFAULT_SKIN_CODE = 'PX1|332419402d1f4d3625593f2c6648327351387f5a3e010100ebceb0fefefe4e33008c6345ffed02996c4ba67551b37e57b37e580000007a7a7a050500e2d201030300fcc6fe5a3f2b674831745137815a3d8e6343|012332101234432123455432345665433778877379a88a9729a88a9208888880|01288210123993212349943234599543456996546bc99cb6bdc99cdbdec99cedefc99cfegcc99ccg|cccccccchhhhcccchhhhhhhhcccccccccccchhhh|cccccccchhhhcccchhhhhhhhcccccccccccchhhh|hhhhhhihhhhi888888888hc8hchhhhchhchhhhch|hhhhhihhihhh888888888ch8hhchhchhhhchhchh|cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc|ccjjjjjccjkjjjjjjkkkkjjccjkkjjcccjjkkjjccjjjkkjcjjjkkjjjccjkjccccccccccccccccccc|ccccccccllllccccllllllllccccccccccccllll|ccccccccllllccccllllllllccccccccccccllll|jjjjjijjijjj888888888888jjjjjjjjjjjjjjjj|jjjjjjijjjji888888888888jjjjjjjjjjjjjjjj|ccccccccccccccccccccccccccccccccccccccccccccccccccccccc1cccccc10|028113922493359446956c9bbc9ddc9eec9fgc9c|cccccccchhhhcccchhhhhhhhcccccccccccchhhh|cccccccchhhhcccchhhhhhhhcccccccccccchhhh|hhhhhhihhhhi888888888hc8hchhhhchhchhhhch|hhhhhhhhihhi888888888888hhhhhhhhhhhhhhhh|hhcccchhhmc22cmhcc2nn2cccnnoon2c2nop~~~2noq~~~~~oq~~~~~~~r~~~~~~|~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~|~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~|~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~|~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~|~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~|~~~~~~~~~ccccccccccccccccccccccccccccccccccccccc~c~~~~c~~~~~~~~~|~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~|~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~|~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~|~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~|~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~|~~~~~~~h~~~~~~~h~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~|~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~|~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~|~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~|~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~|~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~';

// 🎒 INVENTORY SKINS — built-in skins jo player inventory se click karke
// equip kar sakta hai. AGENT (Jimmy ki nayi skin, black suit + red tie)
// inventory ki default/pehli skin hai. Equip HAR ACCOUNT ke liye alag hai
// (per-account key me save hoti hai), is liye ek account par equip karne
// se doosre Google account par nahi lagti — usko khud equip karna hota hai.
const INVENTORY_SKINS = [
    { id: 'agent', name: 'AGENT', desc: 'Black suit, red tie', code: 'PX1|0a0606171212000000f4dca8ffffffab070ec68642|0011111011101111111101101110111101011011222222222223322233333333|22433422224554222245542222455422224554222245542222455422224544222244442222444422|2222222222222222222222222222222222222222|2222222222222222222222222222222222222222|2222222222222222222222222222222222222222|2222222222222222222222222222222222222222|0100111000111001101111011010101100101011110000110000000000000000|22222222222222222222222222222222222222222222222222222222222222222222222222222222|2266226622662266226622662266226622662266|2266226622662266226622662266226622662266|2222222222222222222222222222222222222222|2222222222222222222222222222222222222222|0011111000111000111111111110111111111101101002220000031000000013|2222222222222222222222222222222222222222|2222222222222222222222222222222222222222|2222222222222222222222222222222222222222|2222222222222222222222222222222222222222|2222222222222222222222222222222222222222' },
    { id: 'alex', name: 'ALEX', desc: 'Classic Alex skin', code: 'PX1|e58d3ff3a858eb983fdfc4a2ebd0b0efdabfffffff236224efbbb186b98480825a94966b7bb2788cbe8a94c89271ab6e2b542818381664412c7c573e724e366c462e4f4f4f6565655858586f6f6f3f3f3fde812e5c3b27d4b78f|0121021021020021202033022204544046755764555555555558855445555543|9a4333339b5445559cb55555d9cbaaacededccc9eedcede9ecdfecedffcfdfdcgghhhhgg99d9d9d9|ddddddd9ddeeaaab344455555555555545553455|ddddd9d9eeedbbaa444355555555555555545543|ijklijjkkljjjjlikjjjmnooopnnmnnoqmmqopno|ikjiljjljjljiljkjjjkonoonpnnonnoqmmqopno|0222022012220210121201102110012r012r210r210r120r12r212r022r220r0|ddddddc9ddddc9ddcc9ddede9ededededeedeeeeedececeddcecdcedfcdcdcdfhhggggghdddcd9dd|ddddd9d9ededbaaa444355555445555555545543|dddd99d9ddedaabb344455555445555545553455|scddlsssjjkijjjlllllnnnoqmmqmoomoooommmm|9999ssiilkjjkjjjslllnnnnqmmqmoommoooqmmm|02201020011210202110202211202002000203302220344502r0445520rtt344|dddddccddcccdfcccfcddcfddccdhhhgfccfd9cc|dd9999dddeedaaaa333344344434344434444443|dddd99ddeddebbbb444455555555555555555555|iiiiiiiiiiillllklllknnnoonnnqmmqooommmoo|9ddciccikllkjjkiliilnnnoonnnqmmqooommmoo' },
    { id: 'steve', name: 'STEVE', desc: 'Classic Steve', code: 'PX1|3b2416c6864200a8b53b449b|0000000000000000000000001111111111111111111111111111111111111111|22222222222222222222222222222222222222222222222222222222222222222222222222222222|1111111111111111111111111111111111111111|1111111111111111111111111111111111111111|3333333333333333333333333333333333333333|3333333333333333333333333333333333333333|0000000000000000000000001111111111111111111111111111111111111111|22222222222222222222222222222222222222222222222222222222222222222222222222222222|1111111111111111111111111111111111111111|1111111111111111111111111111111111111111|3333333333333333333333333333333333333333|3333333333333333333333333333333333333333|0000000000000000000000001111111111111111111111111111111111111111|2222222222222222222222222222222222222222|1111111111111111111111111111111111111111|1111111111111111111111111111111111111111|3333333333333333333333333333333333333333|3333333333333333333333333333333333333333' },
    { id: 'pink', name: 'PINK', desc: 'Pink hair, pink outfit', code: 'PX1|1008032514073a200bf4b8cce8769c4f2c0f6438137a4417f8cedcdea778e3b48c2a1e14e8c1a02513074f290f60253b4e1e30280a241e201ecac9c9060606140512f0a2bc3d17262a101a18090f1604152c082a2d2d2d202020131313e6e6e6420c3fec8cacfce4ecedceb4|0122231014566341666673665656686525122152010990106abaaba626cccc62|00199aaad2333acc21888338e1888888288888881e8188888128888888888888fg8888fggfhfghfh|iccjkacjhhlj388j388jm33j388jm33jm33jhhhj|j883jlhhj883j883j883j33mj883j33mj33mjlhh|nonpnofgnfgaaaac83388338qrrq8st8stuttvvu|pnongfonagfncaaaccca8q8qr3r3mtswtutsuvvt|22m2222222m5622226m5526225m5525225x55d52d242202d0d4dd0d000400000|00x000000dxdd0d0d2m2202d2emeede22e3ee2e22e3ee2e22emeede2d2x2202d02x220200dxdd0d0|jccijcakjlhhj883j883j33mj883jmmmj33mjllh|388jhhlj388j388j388jm33j388jmmmjm33jhhlj|ononfgonafgncaaa83388338qrrq8338uutsuuut|nononogfngfaaaaccccc8q8qr3r3mwmwstuutuuu|2222222022256220262552622525525225d55d52d202202d0d0dd0d000000000|88888888888888888888888888888888ppllpppp|cccccccchhhh3mm33mm3mxxm3mm3mmmmmxxmhhhh|8338lhhl83y8833883383mm383y8m8833mm3lhhl|llllllllllllaaaa3mm33mm3qrrq3mm3ssssuuuu|oppoooooaaaaccccczcc8q8qr3r3mwmwtsstuttu' },
    { id: 'hood', name: 'HOOD', desc: 'Black hood, gold trim (outer layer)', code: 'PX1|3737371e1e1e3030302d2d2d2626262b2b2b2121213838383a3a3a3d3d3d3f3f3f323232494949c09e0d9d820d000000d2a105ce8f1378540d1a1a1a5d41092222229d6d0d2424242e2e2e292929272727a474141818181d1d1d1f1f1fe7bf14a88a11c2a1152c2c2c1515151c1c1c121212171717282828232323353535414141f4e91bcda90f444444424242333333464646|0123104156789a10bcdddd8b7effffeagffffffghffffffhhffffffhiffffffi|jikjjkilmnijoipmqprojrsjtuvppvjoptwuqwtttupvxpuqpulertloypxylxuttoxjnxzupqxslxnt|AnApA4Apn4jAAe66p6AuA6unA5nAjzBjuCun4uju|pAnApA4AAj4n66eAuA6pnu6AAn5AjBzjnuCuuju4|josqnusqnylluujnttllyqtnayjoalqjaylttbbt|qsojqsunllynnjuullttntqyojyajqlatlyatbbt|D34425b40bEbE0566EEED56306D0F420Dbbb4E4D4EE0E2350DE4D2533EF12DE5|4o4jztp26ssqzlqo4qjojo4A5jtpnn4upsjnpqu2syuAuuqoqlA62pnjAuuouop6pppA5425pujn8o92|55AjnCu4Cn4C46u55unAnu4664n6pACzACnnj46z|jA554uCnC4nC5u64Anu564un6n46zCApnnCAz64j|onnljotyppupunpqussluqjntutptnnopoujzpnj|lnnoytojpuppqpnulssunjquptutonntjuopjnpz|2b55065b1b43651143DFb0bEF00006D1266D0D5b4E3DF1bF0bF0340D45b052E2|snjzunsojqpssstopnqyzupnpqzjopuotplynypy|CpCBjzp6ACjuznAA55pp4nz6npzzu5unjCuz6CCz|uC4BnnjBpjz6jzpj6zCj5jpjjjjpCznn5npBjjA4|josqnusqnylluujnttllyqtnayjoalqjaylttbbt|llnjosopuuonszptsqyujqunysqpnsnpsqqolytp|~~b435~~~2bGcFF~2~dHHd~22~~~~~~be~~~~~~ee~~~~~~eg~~~~~~g~g~~~~g~|~~k~~k~~~~~~~~~~~~r~~r~~~~v~~v~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~v~~v~~~zv~~vl~|jsoaduFFI9zo~eJ9~~vH~~~~A66z5544~~~~AuA4|a8sjF5udoz9I22e~Hv~~~~~~z66A4455~~~~4AuA|~ezt~dup~vpl~vup~vjo~dui~rdq~~rd~~~~~~~~|tze~pud~lpv~puv~ojv~iud~qdr~dr~~~~~~~~~~|~~2F2D~~~222E0E~554b5066ED5D5533EFb252D22662D560~6b446E~~~nojE~~|zzpztzppylqlzqpJzzjjzpu2nzjtjlloqosjjslpplzsjzultztjzotoquoyqnuoonyyu5uJIKe58IoI|Laaoo2Lo9l8KqonlFLLo95ssM98lvcL5~I8npzeL|oaFFoL2oK8l9lnoqoLLFss59l89M5Lcvn8I~Lezp|uljsosszqnnjylnzoqoyjstyjqjzuuu~~~~~~~~~|sjluzssojnnqznlyyoqoytsjzjqj~uuu~~~~~~~~|~~F220~~~6Fb414~EE3DDD54D3421233E55503E22D0b4662~0222E0~~~t5Dj~~|~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~|78o8~~~~~~~~~~~~~~~~~C5~nnuu4~u6~~~~456u|5oFaFLLojL2atl9aty8H0Hn~vnnnj6uj~~~~54~4|~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~|toyupnzpqsyqysnojupqoyyuptjjjloi~~~~~~~~' },
    { id: 'girl', name: 'GIRL', desc: 'Girl skin with brown hair', code: 'PX1|92756e856a639f7f78ac8982b9938c000000fecea0f4f3f44aa9e0fccea0b9938bffffff2f6c8ffdd3aa92746effd4aa786059fed3aafcbcbdfcb8b9fee7d88a9ea8899ea894acb9a0b6c2a6bdc8a5bcc7ad7a55abc2cfb2c4cdfcc1c28b9ea8c7d2d8fedbb9fee3c9fee8d3fbb8b9fbc7c8f7999a85a0af879ea89fb8c6a6b6beb5c2c9889ea895acb9fdcea0fddbb995aab591aab892756d9f7f779f7f76ac89819d7d75f9c7c7f499996a564e7860576a564d856a605d4b44|010101012020202032323232434343434556655357899875abcddcbaeffddffe|g1gfff1g101hff01i20jji2i232kkkl302mnnllii10nopni1g1noomk01lpqoli20rpornl3mstosnl|jjiukkkkjjiukkkkjjiujjiukkkkjjiukkkkjjiu|uuijkkkkuuijkkkkuuijuuijkkkkuuijkkkkuuij|oonvnnvnwwwwhxxhxyyxzzzzyzzyxvnxvbbonoot|vnoonvnnwwwwhxxhxyyxzzzzyzzyxnvxobbvtoon|01010101202020203AB23BA24BCBACB34ABCCBA332C23C322020202001010101|iDjuijDikknkknkkiijnEjuikkkFnkkkijunFujiijuFGujikkEnGEkkiEEDGnninnFnHFnIDGnFnnFJ|uuijkkkkuuijkkkkuuijuuijkkkkuuijkkkkuuij|jjiikkkkjjiikkkkjjiijjiikkkkjjiukkkkjjii|EoJonoJnwwwwhxxhxyyxzzzzyzzyxyyxvnopnopt|oJoDnJonwwwwhxxhxyyxzzzzyzzyxyyxponvtpon|0101010120202020323232324343434343434343323232322020202001010101|KKdKKdLLjuijkkkkjuijjuijkkkkjuijlonloMvN|juijkkkkjuijkkkkjuijjuijkkkkjuijkkkkjuij|iiijkkkkiiiikkkkjiiiiiijkkkkiiijkkkkiiij|JJJJwwww6hh6hxxhxyyxzzzzyzzyxyyxponvtpon|ooJJnnnnwwwwhxxhxyyxzzzzyzzyxyyxvnopnopt|~~g11g~~~O1OO1O~OPOQPOQOPRPRRPRQRaRa~~~RRaR~~~~~PR~~~~~~~S~~~~~~|~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~|~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~|~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~|~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~|~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~|~~~~~~~~~~~~~~~~~AT~~TA~~TUTjUT~1ATUUTA101UV0U10~g1~~g1~~~~~~~~~|~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~|~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~|~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~|~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~|~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~|~~~~~~~~~~~~~~~~~~~~~g1g~~WXW1011WYZX0~00XO~~~~2~~~~~~~2~~~~~~~~|~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~|~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~|~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~|~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~|~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~' },
    { id: 'original', name: 'ORIGINAL', desc: 'Plain Steve (no skin)', code: null },
];
// 🎒 INVENTORY GUNS — AR-9, VITA (sniper), Pistol, Revolver, Knife.
// slot: 1 = rifle (AR-9/VITA), 2 = pistol (Pistol/Revolver), 3 = knife.
// Equip karo to wo gun us slot ki ho jati hai (VITA → AR-9 ki jagah).
const INVENTORY_GUNS = [
    { id: 'ar9', name: 'AR-9', desc: 'Assault rifle — full-auto', slot: 1, icon: '🔫', color: '#C9A06B' },
    { id: 'vita', name: 'VITA', desc: 'Sniper — long range, semi-auto', slot: 1, icon: '🔭', color: '#C8954A' },
    { id: 'pistol', name: 'PISTOL', desc: 'Sidearm — semi-auto', slot: 2, icon: '🔫', color: '#333333' },
    { id: 'revolver', name: 'REVOLVER', desc: '6-shot revolver — semi-auto', slot: 2, icon: '🔫', color: '#5C3A21' },
    { id: 'knife', name: 'KNIFE', desc: 'Bayonet — melee (2.2m)', slot: 3, icon: '🔪', color: '#b9c9de' },
];

function defaultSkin() {
    const fill = (part, color) => Array(SKIN_PARTS[part].w * SKIN_PARTS[part].h).fill(color);
    const head = fill('head', '#c68642');
    for (let y = 0; y < 3; y++) for (let x = 0; x < 8; x++) head[y * 8 + x] = '#3b2416';
    const skin = { head, body: fill('body', '#00a8b5'), armL: fill('armL', '#c68642'), armR: fill('armR', '#c68642'), legL: fill('legL', '#3b449b'), legR: fill('legR', '#3b449b') };
    // Back shuru me front jaisa hi hota hai (purani skin jaisi), phir alag se paint hota hai.
    SKIN_FRONT_PARTS.forEach((p) => { skin[p + 'B'] = skin[p].slice(); });
    // Side shuru me plain base colour (front ka design side par nahi jata).
    skin.headS = skin.head.slice();
    skin.bodyS = fill('bodyS', '#00a8b5');
    skin.armLS = fill('armLS', '#c68642');
    skin.armRS = fill('armRS', '#c68642');
    skin.legLS = fill('legLS', '#3b449b');
    skin.legRS = fill('legRS', '#3b449b');
    // Outer layer default me khaali (transparent) — koi overlay nahi.
    SKIN_OUTER_PART_ORDER.forEach((p) => { skin[p] = Array(SKIN_PARTS[p].w * SKIN_PARTS[p].h).fill(null); });
    return skin;
}
function cloneSkin(skin) { const o = {}; [...SKIN_PART_ORDER, ...SKIN_OUTER_PART_ORDER].forEach((p) => { o[p] = (skin[p] || []).slice(); }); return o; }
function skinHasOuter(skin) {
    if (!skin) return false;
    return SKIN_OUTER_PART_ORDER.some((p) => (skin[p] || []).some((c) => c !== null && c !== undefined && c !== ''));
}
function skinColorDist(a, b) {
    const pa = parseInt(String(a).slice(1), 16), pb = parseInt(String(b).slice(1), 16);
    const dr = ((pa >> 16) & 255) - ((pb >> 16) & 255), dg = ((pa >> 8) & 255) - ((pb >> 8) & 255), db = (pa & 255) - (pb & 255);
    return dr * dr + dg * dg + db * db;
}
function encodeSkinCode(skin) {
    const palette = [];
    const idx = {};
    const parts = [];
    // Outer layer hai to 36 parts (base + outer), warna 18 parts (base hi).
    const order = skinHasOuter(skin) ? [...SKIN_PART_ORDER, ...SKIN_OUTER_PART_ORDER] : SKIN_PART_ORDER;
    order.forEach((p) => {
        let s = '';
        (skin[p] || []).forEach((c) => {
            // null/transparent outer pixel ko '~' likho (palette me nahi aata).
            if (c === null || c === undefined || c === '') { s += SKIN_OUTER_TRANSPARENT; return; }
            const col = String(c).toLowerCase();
            if (idx[col] === undefined) {
                if (palette.length >= 62) {
                    let best = 0, bestD = Infinity;
                    palette.forEach((pc, i) => { const d = skinColorDist(col, pc); if (d < bestD) { bestD = d; best = i; } });
                    idx[col] = best;
                } else { idx[col] = palette.length; palette.push(col); }
            }
            s += SKIN_B64[idx[col]];
        });
        parts.push(s);
    });
    return 'PX1|' + palette.map((c) => c.slice(1)).join('') + '|' + parts.join('|');
}
function decodeSkinCode(code) {
    try {
        const seg = String(code || '').trim().split('|');
        const isOld6 = seg.length === 2 + SKIN_FRONT_PARTS.length;
        const isOld12 = seg.length === 2 + SKIN_FRONT_PARTS.length * 2;
        const isNew = seg.length === 2 + SKIN_PART_ORDER.length;
        const isNewOuter = seg.length === 2 + SKIN_PART_ORDER.length + SKIN_OUTER_PART_ORDER.length;
        if ((!isOld6 && !isOld12 && !isNew && !isNewOuter) || seg[0] !== 'PX1') return null;
        const palHex = seg[1];
        if (palHex.length === 0 || palHex.length % 6 !== 0 || palHex.length / 6 > 62) return null;
        const palette = [];
        for (let i = 0; i < palHex.length; i += 6) palette.push('#' + palHex.slice(i, i + 6));
        const skin = {};
        const order = isNewOuter ? [...SKIN_PART_ORDER, ...SKIN_OUTER_PART_ORDER] : (isNew ? SKIN_PART_ORDER : (isOld12 ? SKIN_PART_ORDER.slice(0, 12) : SKIN_FRONT_PARTS));
        for (let k = 0; k < order.length; k++) {
            const p = order[k];
            const s = seg[2 + k];
            const def = SKIN_PARTS[p];
            if (s.length !== def.w * def.h) return null;
            const arr = [];
            for (let i = 0; i < s.length; i++) {
                // '~' = transparent outer pixel.
                if (s[i] === SKIN_OUTER_TRANSPARENT) { arr.push(null); continue; }
                const j = SKIN_B64.indexOf(s[i]);
                if (j < 0 || j >= palette.length) return null;
                arr.push(palette[j]);
            }
            skin[p] = arr;
        }
        // Purane code me jo part nahi hai, use default se bharo (back/side plain, front ka design wahan nahi jata).
        const defSkin = defaultSkin();
        [...SKIN_PART_ORDER, ...SKIN_OUTER_PART_ORDER].forEach((p) => { if (!skin[p]) skin[p] = defSkin[p].slice(); });
        // 🩹 SIDE FIX: agar kisi part ki SIDE poori ek skin-tone (beige/tan)
        // hai aur front us se alag hai, to side ko front jaisa kar do.
        // Skin banane wale sides ko skin-tone paint kar dete hain, jo
        // ghoomne par badi tan patti lagti hai. Ye purani saved skins par
        // bhi lagta hai — dobara EQUIP karne ki zaroorat nahi.
        const SKIN_TONE_FIX = { '#ebceb0': 1, '#c68642': 1, '#f4dca8': 1, '#efdabf': 1 };
        const SIDE_FRONT = { bodyS: 'body', armLS: 'armL', armRS: 'armR', legLS: 'legL', legRS: 'legR', headS: 'head', jacketS: 'jacket', sleeveLS: 'sleeveL', sleeveRS: 'sleeveR', pantsLS: 'pantsL', pantsRS: 'pantsR', hatS: 'hat' };
        Object.keys(SIDE_FRONT).forEach((side) => {
            const front = SIDE_FRONT[side];
            const sg = skin[side], fg = skin[front];
            if (!sg || !fg || !sg.length || !fg.length) return;
            const first = sg[0];
            if (first === null || first === undefined) return;
            const col = String(first).toLowerCase();
            if (!SKIN_TONE_FIX[col]) return;
            if (!sg.every((c) => String(c).toLowerCase() === col)) return;
            // Front bhi wahi solid skin-tone hai to ye design hai, chhedo mat.
            if (fg.every((c) => String(c).toLowerCase() === col)) return;
            const sw = SKIN_PARTS[side].w, fw = SKIN_PARTS[front].w, sh = SKIN_PARTS[side].h;
            const fixed = [];
            for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) fixed.push(fg[y * fw + Math.floor(x * fw / sw)]);
            skin[side] = fixed;
        });
        return skin;
    } catch (e) { return null; }
}
let currentSkin = null;
let draftSkin = null;
let skinEditorOpen = false;
let skinEditorPart = 'head';
let skinEditorSide = 'front'; // 'front', 'back' ya 'side' — grid kis taraf ka dikha raha hai
function skinGridPart() { return skinEditorSide === 'back' ? skinEditorPart + 'B' : (skinEditorSide === 'side' ? skinEditorPart + 'S' : skinEditorPart); }
function skinFrontPart(p) { const s = String(p || ''); return (s.endsWith('B') || s.endsWith('S')) ? s.slice(0, -1) : s; }
let skinEditorColor = '#ff0000';
let skinEraser = false;
try {
    const baked = (typeof DEFAULT_SKIN_CODE === 'string' && DEFAULT_SKIN_CODE) ? decodeSkinCode(DEFAULT_SKIN_CODE) : null;
    const savedRaw = localStorage.getItem(SKIN_CODE_KEY);
    currentSkin = (savedRaw ? decodeSkinCode(savedRaw) : null) || baked;
} catch (e) { currentSkin = null; }

// 🎨 SKIN HAR ACCOUNT KE LIYE ALAG — har Google account / guest naam ki
// apni skin hoti hai, sab ke pas ek hi skin nahi. Pehle skin ek hi key
// (pointerx_skin_v1) me save hoti thi, is liye jo bhi login karta tha
// usko wahi skin milti thi. Ab har account ki apni key hai:
// Google -> 'pointerx_skin_g_<uid>', guest -> 'pointerx_skin_guest_<naam>'.
let skinAccountId = '';
function skinCodeKey() { return skinAccountId ? ('pointerx_skin_' + skinAccountId) : SKIN_CODE_KEY; }
function skinDraftKey() { return skinAccountId ? ('pointerx_skin_draft_' + skinAccountId) : SKIN_DRAFT_KEY; }
function setSkinAccount(id) {
    const nid = String(id || '').trim();
    if (!nid || nid === skinAccountId) return;
    skinAccountId = nid;
    // Is account ki player ID bhi load karo.
    try { loadMyPlayerId(); updateMyIdDisplay(); } catch (e) {}
    // Is account ki XP/level bhi load karo (skin ki tarah per-account).
    try { loadXP(); updateLevelDisplay(); } catch (e) {}
    // Is account ki PFP bhi load karo.
    try { loadPFP(); } catch (e) {}
    // Is account ki skin load karo. Agar is account ki koi skin nahi hai
    // to purani shared key (pointerx_skin_v1) se ek dafa migrate karo
    // (pehle wali skin bach jaye), warna baked default (Alex).
    try {
        const baked = (typeof DEFAULT_SKIN_CODE === 'string' && DEFAULT_SKIN_CODE) ? decodeSkinCode(DEFAULT_SKIN_CODE) : null;
        let raw = localStorage.getItem(skinCodeKey());
        if (!raw) {
            const legacy = localStorage.getItem(SKIN_CODE_KEY);
            if (legacy) { raw = legacy; try { localStorage.setItem(skinCodeKey(), legacy); } catch (e) {} }
        }
        currentSkin = (raw ? decodeSkinCode(raw) : null) || baked;
    } catch (e) { currentSkin = null; }
    draftSkin = null;
    try { applySkinToAll(); } catch (e) {}
}

// 🆔 PLAYER ID — 5 characters (A-Z + 0-9 mix), '#' ke saath dikhti hai
// (jaise #X7K2M). Har account ki apni ID (skin/XP ki tarah per-account
// key me save), ek baar bani to wahi rehti hai — dobara login par nayi nahi.
const PLAYER_ID_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
function playerIdKey() { return (typeof skinAccountId !== 'undefined' && skinAccountId) ? ('pointerx_playerid_' + skinAccountId) : 'pointerx_playerid_v1'; }
function generatePlayerId() {
    let id = '';
    for (let i = 0; i < 5; i++) id += PLAYER_ID_CHARS[Math.floor(Math.random() * PLAYER_ID_CHARS.length)];
    return id;
}
function loadMyPlayerId() {
    try {
        let saved = '';
        try { saved = localStorage.getItem(playerIdKey()) || ''; } catch (e) {}
        if (!/^[A-Z0-9]{5}$/.test(saved)) {
            saved = generatePlayerId();
            try { localStorage.setItem(playerIdKey(), saved); } catch (e) {}
        }
        myPlayerId = saved;
        myPlayerIdAccount = skinAccountId;
    } catch (e) { myPlayerId = generatePlayerId(); myPlayerIdAccount = skinAccountId; }
    return myPlayerId;
}
function getMyPlayerId() {
    if (!myPlayerId || !/^[A-Z0-9]{5}$/.test(myPlayerId) || myPlayerIdAccount !== skinAccountId) loadMyPlayerId();
    return myPlayerId;
}
// Lobby player card me apni #ID dikhao.
function updateMyIdDisplay() {
    if (typeof document === 'undefined') return;
    const el = document.getElementById('lobby-my-id');
    if (el) el.textContent = '#' + getMyPlayerId();
}

// Har skin pixel = 4x4 canvas pixel — taake editor me grid lines (boxes)
// ke liye jagah ho aur pixels crisp rahen.
const SKIN_TEX_SCALE = 4;
function skinGridCanvas(grid, w, h, sx, sy, sw, sh, withGrid) {
    const c = document.createElement('canvas');
    c.width = sw * SKIN_TEX_SCALE; c.height = sh * SKIN_TEX_SCALE;
    const ctx = c.getContext('2d');
    if (withGrid) { ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, c.width, c.height); }
    const cell = withGrid ? SKIN_TEX_SCALE - 1 : SKIN_TEX_SCALE;
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
        const col = grid[(sy + y) * w + (sx + x)];
        // null = transparent outer pixel — bharo hi nahi, taake neeche base dikhe.
        if (col === null || col === undefined || col === '') continue;
        ctx.fillStyle = col || '#ff00ff';
        ctx.fillRect(x * SKIN_TEX_SCALE, y * SKIN_TEX_SCALE, cell, cell);
    }
    return c;
}
function drawSkinFace(ctx) {
    // Aankhein + munh hamesha rehte hain (head ke front par, grid ke upar).
    const S = SKIN_TEX_SCALE;
    ctx.fillStyle = '#ffffff'; ctx.fillRect(1 * S, 4 * S, 2 * S, 1 * S); ctx.fillRect(5 * S, 4 * S, 2 * S, 1 * S);
    ctx.fillStyle = '#3b3b9b'; ctx.fillRect(2 * S, 4 * S, 1 * S, 1 * S); ctx.fillRect(5 * S, 4 * S, 1 * S, 1 * S);
    ctx.fillStyle = '#4a2511'; ctx.fillRect(3 * S, 5 * S, 2 * S, 2 * S);
}
function skinFaceCrops(w, h, dims) {
    // cw = side face ki chaudai (grid cells me), ch = top/bottom ki unchai.
    // Sides ka apna alag grid hai, isliye yahan koi centre/edge crop nahi hota.
    const cw = Math.max(1, Math.round(w * dims.d / dims.fw));
    const ch = Math.max(1, Math.round(h * dims.d / dims.fh));
    return { cw, ch };
}
function skinFaceMaterial(canvas) {
    const t = new THREE.CanvasTexture(canvas);
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    return new THREE.MeshStandardMaterial({ map: t, transparent: true });
}
// Canvas ko left-right flip karo (ek nayi canvas wapas).
// Minecraft skin ka side hissa net ki tarah bana hota hai: side wale hisse
// ka front kinara Three.js ki +x face ki UV se ulta padta hai, is liye +x
// (right) wali side ko flip karna padta hai. -x (left) wali side ki UV
// pehle se ulti hoti hai, is liye wo bina flip ke theek dikhti hai.
function flipCanvasH(canvas) {
    const c = document.createElement('canvas');
    c.width = canvas.width; c.height = canvas.height;
    const ctx = c.getContext('2d');
    ctx.translate(c.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(canvas, 0, 0);
    return c;
}
// Steve ka default face (aankhein/munh) sirf tab banao jab head ka front
// waqai default Steve ho. Alex jaisi skin ka apna face grid me hi hota hai,
// us par Steve ki aankhein lagana face bigaad deta hai.
function isDefaultSteveHead(sub) {
    if (!sub || sub.length !== 64) return false;
    const def = defaultSkin().head;
    for (let i = 0; i < 64; i++) {
        if (String(sub[i]).toLowerCase() !== String(def[i]).toLowerCase()) return false;
    }
    return true;
}
// Baalon ka puff (outer layer) — hata diya gaya (Jimmy: 'out layer hata do ab').
function skinMeshMaterials(sub, backSub, sideSub, w, h, dims, isHead, withGrid) {
    const { cw, ch } = skinFaceCrops(w, h, dims);
    const front = skinGridCanvas(sub, w, h, 0, 0, w, h, withGrid);
    if (isHead && isDefaultSteveHead(sub)) drawSkinFace(front.getContext('2d'));
    const back = skinGridCanvas(backSub || sub, w, h, 0, 0, w, h, withGrid);
    const sideC = skinGridCanvas(sideSub || sub, cw, h, 0, 0, cw, h, withGrid);
    const right = flipCanvasH(sideC);
    const left = sideC;
    // Head ke top/bottom par face nahi hona chahiye — front grid me face hai.
    // Top/bottom par backside wala orange (baal) lagao.
    const topGrid = isHead ? (backSub || sub) : sub;
    const top = skinGridCanvas(topGrid, w, h, 0, 0, w, ch, withGrid);
    const bottom = skinGridCanvas(topGrid, w, h, 0, h - ch, w, ch, withGrid);
    // BoxGeometry order: +x, -x, +y, -y, +z, -z
    return [skinFaceMaterial(right), skinFaceMaterial(left), skinFaceMaterial(top), skinFaceMaterial(bottom), skinFaceMaterial(front), skinFaceMaterial(back)];
}
function applySkinToCharacter(steveObj, skin, withGrid) {
    if (!steveObj || !skin) return;
    const list = [
        { mesh: steveObj.head, part: 'head', backPart: 'headB', sidePart: 'headS', grid: skin.head, w: 8, h: 8, dims: { fw: 0.5, fh: 0.5, d: 0.5 }, head: true },
        { mesh: steveObj.body, part: 'body', backPart: 'bodyB', sidePart: 'bodyS', grid: skin.body, w: 8, h: 10, dims: { fw: 0.5, fh: 0.75, d: 0.25 } },
        { mesh: steveObj.leftArmUpper, part: 'armL', backPart: 'armLB', sidePart: 'armLS', grid: skin.armL, w: 4, h: 10, y0: 0, y1: 5, dims: { fw: 0.25, fh: 0.375, d: 0.25 } },
        { mesh: steveObj.leftArmLower, part: 'armL', backPart: 'armLB', sidePart: 'armLS', grid: skin.armL, w: 4, h: 10, y0: 5, y1: 10, dims: { fw: 0.25, fh: 0.375, d: 0.25 } },
        { mesh: steveObj.rightArmUpper, part: 'armR', backPart: 'armRB', sidePart: 'armRS', grid: skin.armR, w: 4, h: 10, y0: 0, y1: 5, dims: { fw: 0.25, fh: 0.375, d: 0.25 } },
        { mesh: steveObj.rightArmLower, part: 'armR', backPart: 'armRB', sidePart: 'armRS', grid: skin.armR, w: 4, h: 10, y0: 5, y1: 10, dims: { fw: 0.25, fh: 0.375, d: 0.25 } },
        { mesh: steveObj.leftThigh, part: 'legL', backPart: 'legLB', sidePart: 'legLS', grid: skin.legL, w: 4, h: 10, y0: 0, y1: 5, dims: { fw: 0.25, fh: 0.375, d: 0.25 } },
        { mesh: steveObj.leftShin, part: 'legL', backPart: 'legLB', sidePart: 'legLS', grid: skin.legL, w: 4, h: 10, y0: 5, y1: 10, dims: { fw: 0.25, fh: 0.375, d: 0.25 } },
        { mesh: steveObj.rightThigh, part: 'legR', backPart: 'legRB', sidePart: 'legRS', grid: skin.legR, w: 4, h: 10, y0: 0, y1: 5, dims: { fw: 0.25, fh: 0.375, d: 0.25 } },
        { mesh: steveObj.rightShin, part: 'legR', backPart: 'legRB', sidePart: 'legRS', grid: skin.legR, w: 4, h: 10, y0: 5, y1: 10, dims: { fw: 0.25, fh: 0.375, d: 0.25 } },
    ];
    list.forEach((m) => {
        if (!m.mesh || !m.grid) return;
        if (!m.mesh.userData._origMat) m.mesh.userData._origMat = m.mesh.material;
        const sub = (m.y0 !== undefined) ? m.grid.slice(m.y0 * m.w, m.y1 * m.w) : m.grid;
        const sh = (m.y1 !== undefined) ? (m.y1 - m.y0) : m.h;
        const crops = skinFaceCrops(m.w, sh, m.dims);
        // BAAZU (arms): back face front jaisa hi (sleeve) — gun pakadte
        // waqt elbow twist (~160°) se back face saamne aa jata hai, aur
        // back grid skin-tone (tan) hai to haath par tan patti lagti hai.
        // Front jaisa back lagao taake baazu chaaron taraf uniform sleeve lage.
        const isArm = m.part === 'armL' || m.part === 'armR';
        const backGrid = isArm ? m.grid : (skin[m.backPart] || m.grid);
        const backSub = (m.y0 !== undefined) ? backGrid.slice(m.y0 * m.w, m.y1 * m.w) : backGrid;
        const sideGrid = skin[m.sidePart] || m.grid;
        const sideSub = (m.y0 !== undefined) ? sideGrid.slice(m.y0 * crops.cw, m.y1 * crops.cw) : sideGrid;
        m.mesh.userData._skinMap = { part: m.part, backPart: m.backPart, sidePart: m.sidePart, w: m.w, h: sh, y0: (m.y0 || 0), cw: crops.cw, ch: crops.ch };
        m.mesh.material = skinMeshMaterials(sub, backSub, sideSub, m.w, sh, m.dims, !!m.head, !!withGrid);
        if (Array.isArray(m.mesh.material)) m.mesh.material.forEach((mm) => { mm.needsUpdate = true; });
    });
    // 🎩 OUTER LAYER — har base part ke upar wala overlay box. Outer grid
    // me null (transparent) hai to wahan base dikhta hai. Poora part khaali
    // hai to outer mesh chhupao.
    const outerList = [
        { mesh: steveObj.headOuter, part: 'hat', backPart: 'hatB', sidePart: 'hatS', grid: skin.hat, w: 8, h: 8, dims: { fw: 0.5, fh: 0.5, d: 0.5 }, head: true },
        { mesh: steveObj.bodyOuter, part: 'jacket', backPart: 'jacketB', sidePart: 'jacketS', grid: skin.jacket, w: 8, h: 10, dims: { fw: 0.5, fh: 0.75, d: 0.25 } },
        { mesh: steveObj.leftArmUpperOuter, part: 'sleeveL', backPart: 'sleeveLB', sidePart: 'sleeveLS', grid: skin.sleeveL, w: 4, h: 10, y0: 0, y1: 5, dims: { fw: 0.25, fh: 0.375, d: 0.25 } },
        { mesh: steveObj.leftArmLowerOuter, part: 'sleeveL', backPart: 'sleeveLB', sidePart: 'sleeveLS', grid: skin.sleeveL, w: 4, h: 10, y0: 5, y1: 10, dims: { fw: 0.25, fh: 0.375, d: 0.25 } },
        { mesh: steveObj.rightArmUpperOuter, part: 'sleeveR', backPart: 'sleeveRB', sidePart: 'sleeveRS', grid: skin.sleeveR, w: 4, h: 10, y0: 0, y1: 5, dims: { fw: 0.25, fh: 0.375, d: 0.25 } },
        { mesh: steveObj.rightArmLowerOuter, part: 'sleeveR', backPart: 'sleeveRB', sidePart: 'sleeveRS', grid: skin.sleeveR, w: 4, h: 10, y0: 5, y1: 10, dims: { fw: 0.25, fh: 0.375, d: 0.25 } },
        { mesh: steveObj.leftThighOuter, part: 'pantsL', backPart: 'pantsLB', sidePart: 'pantsLS', grid: skin.pantsL, w: 4, h: 10, y0: 0, y1: 5, dims: { fw: 0.25, fh: 0.375, d: 0.25 } },
        { mesh: steveObj.leftShinOuter, part: 'pantsL', backPart: 'pantsLB', sidePart: 'pantsLS', grid: skin.pantsL, w: 4, h: 10, y0: 5, y1: 10, dims: { fw: 0.25, fh: 0.375, d: 0.25 } },
        { mesh: steveObj.rightThighOuter, part: 'pantsR', backPart: 'pantsRB', sidePart: 'pantsRS', grid: skin.pantsR, w: 4, h: 10, y0: 0, y1: 5, dims: { fw: 0.25, fh: 0.375, d: 0.25 } },
        { mesh: steveObj.rightShinOuter, part: 'pantsR', backPart: 'pantsRB', sidePart: 'pantsRS', grid: skin.pantsR, w: 4, h: 10, y0: 5, y1: 10, dims: { fw: 0.25, fh: 0.375, d: 0.25 } },
    ];
    outerList.forEach((m) => {
        if (!m.mesh) return;
        const hasOuter = (g) => Array.isArray(g) && g.some((c) => c !== null && c !== undefined && c !== '');
        // Is outer part (front/back/side) me kuch hai ya sab transparent?
        const anyOuter = hasOuter(m.grid) || hasOuter(skin[m.backPart]) || hasOuter(skin[m.sidePart]);
        if (!m.grid || !anyOuter) { m.mesh.visible = false; return; }
        const sub = (m.y0 !== undefined) ? m.grid.slice(m.y0 * m.w, m.y1 * m.w) : m.grid;
        const sh = (m.y1 !== undefined) ? (m.y1 - m.y0) : m.h;
        const crops = skinFaceCrops(m.w, sh, m.dims);
        // Sleeves bhi baazu hain — back front jaisa (elbow twist se tan na dikhe).
        const isSleeve = m.part === 'sleeveL' || m.part === 'sleeveR';
        const backGrid = isSleeve ? m.grid : (skin[m.backPart] || m.grid);
        const backSub = (m.y0 !== undefined) ? backGrid.slice(m.y0 * m.w, m.y1 * m.w) : backGrid;
        const sideGrid = skin[m.sidePart] || m.grid;
        const sideSub = (m.y0 !== undefined) ? sideGrid.slice(m.y0 * crops.cw, m.y1 * crops.cw) : sideGrid;
        m.mesh.material = skinMeshMaterials(sub, backSub, sideSub, m.w, sh, m.dims, !!m.head, false);
        if (Array.isArray(m.mesh.material)) m.mesh.material.forEach((mm) => { mm.needsUpdate = true; });
        m.mesh.visible = true;
    });
}
function restoreSkinToCharacter(steveObj) {
    if (!steveObj) return;
    [steveObj.head, steveObj.body, steveObj.leftArmUpper, steveObj.leftArmLower, steveObj.rightArmUpper, steveObj.rightArmLower, steveObj.leftThigh, steveObj.leftShin, steveObj.rightThigh, steveObj.rightShin].forEach((mesh) => {
        if (mesh && mesh.userData._origMat) {
            mesh.material = mesh.userData._origMat;
            delete mesh.userData._skinMap;
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            mats.forEach((mm) => { if (mm) mm.needsUpdate = true; });
        }
    });
    // Outer layer hatao (ORIGINAL / no skin).
    [steveObj.headOuter, steveObj.bodyOuter, steveObj.leftArmUpperOuter, steveObj.leftArmLowerOuter, steveObj.rightArmUpperOuter, steveObj.rightArmLowerOuter, steveObj.leftThighOuter, steveObj.leftShinOuter, steveObj.rightThighOuter, steveObj.rightShinOuter].forEach((mesh) => {
        if (mesh) mesh.visible = false;
    });
}
function applySkinToAll() {
    if (typeof lobbySteveParts !== 'undefined' && lobbySteveParts) {
        if (currentSkin) applySkinToCharacter(lobbySteveParts, currentSkin);
        else restoreSkinToCharacter(lobbySteveParts);
    }
    if (typeof otherPlayers !== 'undefined' && otherPlayers) {
        Object.values(otherPlayers).forEach((p) => {
            // Har player ki APNI skin — apni (currentSkin) nahi. p.skin
            // undefined hai to is player ki skin kabhi aayi nahi (purana
            // server/client), usko chhedo mat (purana behaviour).
            if (p && p.parts && p.skin !== undefined) {
                if (p.skin) applySkinToCharacter(p.parts, p.skin);
                else restoreSkinToCharacter(p.parts);
            }
        });
    }
}

// 🎨 Apni skin server ko bhejo, taake doosre players ko tumhari skin
// dikhe (aur tumko unki). Join par aur jab bhi skin badle, call karo.
// NOTE: socket.connected check HATA diya — socket.io disconnect par
// emit ko buffer karke connect hote hi bhej deta hai. Pehle ye check
// skin ko rok deta tha: EXIT ke baad socket disconnect hota hai, aur
// PLAY par connect() async hota hai, to equip/join par skin kabhi
// server tak pahunchti hi nahi thi (game me show nahi hoti thi).
function sendMySkinToServer() {
    try {
        if (!socket || typeof socket.emit !== 'function') return;
        const code = currentSkin ? encodeSkinCode(currentSkin) : '';
        socket.emit('setPlayerSkin', code);
    } catch (e) {}
}

// 🌍 W.W.P — apni profile (naam, #ID, PFP, Google email) server ko bhejo,
// taake admin ke W.W.P panel me tum dikho. Server list sab ko bhejta hai.
function myProfilePfp() {
    try { if (currentPFP) return currentPFP; } catch (e) {}
    try { if (currentGooglePhotoURL) return currentGooglePhotoURL; } catch (e) {}
    return '';
}
function myProfileName() {
    try { const n = currentLobbyName(); if (n) return n; } catch (e) {}
    try { if (typeof playerName !== 'undefined' && playerName) return playerName; } catch (e) {}
    return 'Player';
}
function sendMyProfileToServer() {
    if (!socket || typeof socket.emit !== 'function') return;
    try {
        socket.emit('setPlayerProfile', {
            id: getMyPlayerId(),
            name: myProfileName(),
            pfp: myProfilePfp(),
            email: (typeof currentGoogleEmail !== 'undefined' ? currentGoogleEmail : ''),
            isGoogle: !!(typeof currentGoogleEmail !== 'undefined' && currentGoogleEmail),
            uid: (typeof currentGoogleUid !== 'undefined' ? currentGoogleUid : '')
        });
    } catch (e) {}
}
// 🌍 W.W.P PERMANENT backup (admin ke browser me) — server ki players.json
// gum ho jaye (jaise Render redeploy) to bhi admin ko list dikhe. Server
// list aate hi merge hoti hai (key se: Google uid, warna #ID).
let wwpPermanent = {}; // key -> player
function loadWWPPermanent() {
    try {
        const raw = localStorage.getItem('pointerx_wwp_permanent');
        if (raw) { const parsed = JSON.parse(raw); if (parsed && typeof parsed === 'object') wwpPermanent = parsed; }
    } catch (e) { wwpPermanent = {}; }
}
function saveWWPPermanent() {
    try { localStorage.setItem('pointerx_wwp_permanent', JSON.stringify(wwpPermanent)); } catch (e) {}
}
function mergeWWPList(list) {
    try { loadWWPPermanent(); } catch (e) {}
    const seen = {};
    (Array.isArray(list) ? list : []).forEach((p) => {
        if (!p) return;
        const k = String(p.key || ('id_' + (p.playerId || '')));
        if (!k || k === 'id_') return;
        // 👑 Status (banned/disabled) bhi merge karo — warna popup ka button
        // kabhi UNBAN/ENABLE nahi banta. Purana server status na bheje to
        // backup wala status rehne do (active se overwrite mat karo).
        const prev = wwpPermanent[k] || {};
        wwpPermanent[k] = { key: k, name: p.name || 'Player', playerId: p.playerId || '?????', pfp: p.pfp || '', email: p.email || '', isGoogle: !!p.isGoogle, online: !!p.online, lastSeen: p.lastSeen || Date.now(), status: (p.status ? String(p.status) : (prev.status || 'active')) };
        seen[k] = true;
    });
    // Jo backup me hai lekin server list me nahi — offline dikhao.
    Object.keys(wwpPermanent).forEach((k) => { if (!seen[k]) wwpPermanent[k].online = false; });
    try { saveWWPPermanent(); } catch (e) {}
    wwpPlayers = Object.values(wwpPermanent);
}
function refreshWWPFromBackup() {
    try {
        loadWWPPermanent();
        if ((!wwpPlayers || !wwpPlayers.length) && wwpPermanent && Object.keys(wwpPermanent).length) {
            wwpPlayers = Object.values(wwpPermanent);
        }
    } catch (e) {}
}
// HTML me naam/ID likhte waqt < > & se bacho (kisi ka naam code na ban jaye).
function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
// 🌍 W.W.P list render karo — search se filter (naam ya #ID).
function renderWWPList() {
    if (typeof document === 'undefined') return;
    const listEl = document.getElementById('wwp-list');
    const countEl = document.getElementById('wwp-count');
    if (!listEl) return;
    // LIVE/OFFLINE — lobby me socket disconnect ho to list purani ho sakti hai.
    const stEl = document.getElementById('wwp-status');
    if (stEl) {
        const on = !!(typeof socket !== 'undefined' && socket && socket.connected);
        stEl.textContent = on ? '● LIVE' : '○ OFFLINE';
        stEl.style.color = on ? '#00ff88' : '#ff5555';
    }
    const q = String(wwpSearchText || '').trim().toLowerCase();
    const rows = (wwpPlayers || []).filter((p) => {
        if (!q) return true;
        const nm = String(p.name || '').toLowerCase();
        const pid = String(p.playerId || '').toLowerCase();
        return nm.indexOf(q) !== -1 || pid.indexOf(q) !== -1 || ('#' + pid).indexOf(q) !== -1;
    });
    // PERMANENT list — online pehle, phir naam se (offline neeche).
    rows.sort((a, b) => ((b.online ? 1 : 0) - (a.online ? 1 : 0)) || String(a.name || '').localeCompare(String(b.name || '')));
    if (countEl) countEl.textContent = String((wwpPlayers || []).length);
    if (!rows.length) {
        listEl.innerHTML = '<div style="color:#888;font-size:12px;text-align:center;padding:14px 6px;">' + (q ? 'Koi player nahi mila.' : 'Abhi koi player register nahi hai.') + '</div>';
        return;
    }
    listEl.innerHTML = rows.map((p) => {
        const nm = String(p.name || 'Player');
        const pid = String(p.playerId || '?????');
        // Gmail ID NAHI dikhani (Jimmy) — sirf Google ya Guest.
        const prof = p.isGoogle ? 'Google' : 'Guest';
        const pfp = String(p.pfp || '');
        // Online = hara dot, offline = grey dot (list se naam kabhi nahi jata).
        const dot = p.online
            ? '<span style="color:#00ff88;" title="Online">●</span> '
            : '<span style="color:#666;" title="Offline">○</span> ';
        // 👑 Status badge — admin ko dikhe kaun banned/disabled hai.
        const st = String(p.status || 'active');
        const badge = st === 'banned'
            ? ' <span style="color:#ff4444;font-size:10px;font-weight:900;background:#ff444422;border:1px solid #ff4444;border-radius:4px;padding:1px 5px;">🚫 BANNED</span>'
            : st === 'disabled'
            ? ' <span style="color:#ffaa00;font-size:10px;font-weight:900;background:#ffaa0022;border:1px solid #ffaa00;border-radius:4px;padding:1px 5px;">⛔ DISABLED</span>'
            : '';
        const img = pfp
            ? '<img src="' + escapeHtml(pfp) + '" style="width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0;' + (p.online ? '' : 'filter:grayscale(1);opacity:0.7;') + '" alt="">'
            : '<div style="width:36px;height:36px;border-radius:50%;background:#334155;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:16px;flex-shrink:0;' + (p.online ? '' : 'opacity:0.6;') + '">' + escapeHtml(nm.charAt(0).toUpperCase()) + '</div>';
        return '<div class="wwp-row" data-key="' + escapeHtml(String(p.key || '')) + '" style="display:flex;gap:8px;align-items:center;background:rgba(255,255,255,0.05);border-radius:8px;padding:7px 8px;margin-top:6px;cursor:pointer;">'
            + img
            + '<div style="min-width:0;flex:1;">'
            + '<div style="color:#fff;font-size:13px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + dot + escapeHtml(nm) + ' <span style="color:#ffd700;">#' + escapeHtml(pid) + '</span>' + badge + '</div>'
            + '<div style="color:#aaa;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + escapeHtml(prof) + '</div>'
            + '</div></div>';
    }).join('');
    // 👑 Row click — player ki profile + admin options (Ban/Disable/Gift).
    try {
        listEl.querySelectorAll('.wwp-row').forEach((row) => {
            row.addEventListener('click', () => {
                const key = row.dataset ? row.dataset.key : '';
                const p = (wwpPlayers || []).find((x) => String(x.key || '') === String(key || ''));
                if (p) openWWPPlayerPopup(p);
            });
        });
    } catch (e) {}
}

// 👑 W.W.P PLAYER POPUP — kisi player ki profile par click karo to
// admin options khulen: Ban / Disable-Enable / Send Diamonds / Send Coins
// / Send Skins / Send Characters. Sirf admin (technowarrior924@gmail.com).
function wwpSkinOptionsHtml() {
    let opts = INVENTORY_SKINS.map((s) => '<option value="' + escapeHtml(s.id) + '">' + escapeHtml(s.name) + ' — ' + escapeHtml(s.desc) + '</option>').join('');
    try {
        const myCode = localStorage.getItem(skinCodeKey());
        if (myCode) opts += '<option value="__myskin__">MY SKIN (custom — meri wali)</option>';
    } catch (e) {}
    return opts;
}
function openWWPPlayerPopup(p) {
    if (!isModEmail()) return; // sirf admin — dusre ko popup nahi.
    if (typeof document === 'undefined' || !p) return;
    wwpPopupKey = String(p.key || '');
    let modal = document.getElementById('wwp-player-popup');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'wwp-player-popup';
        modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.72);z-index:1000000;display:flex;align-items:center;justify-content:center;font-family:monospace;';
        modal.innerHTML = `
            <div style="width:min(420px,94vw);max-height:88vh;overflow-y:auto;background:#0a1a4a;border:2px solid #00d2ff;border-radius:12px;padding:16px;color:#fff;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <div style="font-size:15px;font-weight:900;color:#00d2ff;">👤 PLAYER OPTIONS</div>
                    <button id="wwp-popup-close" type="button" style="background:#222;color:#fff;border:1px solid #444;width:28px;height:28px;border-radius:4px;font-weight:bold;cursor:pointer;">✕</button>
                </div>
                <div id="wwp-popup-body" style="margin-top:12px;"></div>
            </div>`;
        document.body.appendChild(modal);
        // ❌ Close + saare buttons — event delegation (modal par ek hi listener).
        // Backdrop click ho, ✕ ho, Ban/Disable/Send ho — sab yahin se chalta hai.
        // Is liye render dobara ho (playersList par) aur buttons naye bane to
        // bhi kaam karega (seedha button par listener lagana re-render par chhoot jata hai).
        modal.addEventListener('click', (e) => {
            if (e.target === modal) { closeWWPPlayerPopup(); return; }
            const t = e.target;
            if (t && (t.id === 'wwp-popup-close' || (t.closest && t.closest('#wwp-popup-close')))) { closeWWPPlayerPopup(); return; }
            const btn = (t && t.closest) ? t.closest('button') : null;
            if (!btn || !btn.id) return;
            const p = (wwpPlayers || []).find((x) => String(x.key || '') === String(wwpPopupKey || ''));
            if (!p) return;
            const key = String(p.key || '');
            const st = String(p.status || 'active');
            if (btn.id === 'wwp-ban-btn') {
                const ns = st === 'banned' ? 'active' : 'banned';
                try { setLocalPlayerStatus(key, ns); } catch (e) {}
                adminSetPlayerStatus(key, ns);
            } else if (btn.id === 'wwp-disable-btn') {
                const ns = st === 'disabled' ? 'active' : 'disabled';
                try { setLocalPlayerStatus(key, ns); } catch (e) {}
                adminSetPlayerStatus(key, ns);
            } else if (btn.id === 'wwp-gift-diamonds-btn') {
                const amtEl = document.getElementById('wwp-gift-diamonds-amt');
                adminSendGift(key, { type: 'diamonds', amount: Math.floor(Number(amtEl ? amtEl.value : 0) || 0) });
            } else if (btn.id === 'wwp-gift-coins-btn') {
                const amtEl = document.getElementById('wwp-gift-coins-amt');
                adminSendGift(key, { type: 'coins', amount: Math.floor(Number(amtEl ? amtEl.value : 0) || 0) });
            } else if (btn.id === 'wwp-gift-skin-btn') {
                adminSendGift(key, wwpSkinGiftFromSelect(document.getElementById('wwp-gift-skin-sel'), 'skin'));
            } else if (btn.id === 'wwp-gift-char-btn') {
                adminSendGift(key, wwpSkinGiftFromSelect(document.getElementById('wwp-gift-char-sel'), 'character'));
            }
        });
        // Escape se bhi band ho.
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && wwpPopupKey) closeWWPPlayerPopup(); });
    }
    modal.style.display = 'flex';
    renderWWPPlayerPopup(p);
}
function closeWWPPlayerPopup() {
    wwpPopupKey = null;
    try { const m = document.getElementById('wwp-player-popup'); if (m) m.style.display = 'none'; } catch (e) {}
}
// 👑 Toggle foran dikhao — Ban dabate hi button UNBAN ban jaye (server ka
// jawab aane se pehle). Server ki playersList aate hi asal status se dobara
// render hoga (galat optimistic update ho to wahi theek kar dega).
function setLocalPlayerStatus(key, status) {
    try {
        const k = String(key || '');
        if (!k) return;
        const p = (wwpPlayers || []).find((x) => String(x.key || '') === k);
        if (p) p.status = status;
        if (wwpPermanent[k]) wwpPermanent[k].status = status;
        try { renderWWPList(); } catch (e) {}
        if (wwpPopupKey === k && p) { try { renderWWPPlayerPopup(p); } catch (e) {} }
    } catch (e) {}
}
// 👑 Banned/disabled player ko lobby me laal banner dikhao (persistent).
// "YOU ARE BANNED / YOU ARE DISABLED" saaf likha ho (Jimmy: u r disable).
function showAccountStatusBanner() {
    if (typeof document === 'undefined') return;
    if (!amBanned && !amDisabled) return;
    let b = document.getElementById('account-status-banner');
    if (!b) {
        b = document.createElement('div');
        b.id = 'account-status-banner';
        b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:1000001;text-align:center;padding:10px;font-family:monospace;font-size:14px;font-weight:900;color:#fff;';
        document.body.appendChild(b);
    }
    b.style.display = 'block';
    b.style.background = amBanned ? '#aa0000' : '#aa6600';
    b.textContent = amBanned ? '🚫 YOU ARE BANNED by the admin — game nahi khel sakte.' : '⛔ YOU ARE DISABLED by the admin — game nahi khel sakte.';
}
function hideAccountStatusBanner() {
    try { const b = document.getElementById('account-status-banner'); if (b) b.style.display = 'none'; } catch (e) {}
}
// 👑 Ban/disable status localStorage me bachao — page reload par bhi
// PLAY button pehle se disabled rahe. Server 'profileAccepted' bhejta hai
// (unban/enable ke baad), tab ye flag saaf hota hai.
function accountStatusKey() { return 'pointerx_account_status'; }
function loadAccountStatus() {
    try {
        const s = localStorage.getItem(accountStatusKey()) || '';
        amBanned = (s === 'banned');
        amDisabled = (s === 'disabled');
    } catch (e) { amBanned = false; amDisabled = false; }
}
function saveAccountStatus(s) {
    try {
        if (s) localStorage.setItem(accountStatusKey(), s);
        else localStorage.removeItem(accountStatusKey());
    } catch (e) {}
}
// 👑 PLAY button ko visibly disable karo (banned/disabled player ki screen par).
// Button me "PLAY" text + resize handle span hota hai — sirf text node badlo, span rehne do.
function setPlayButtonLabel(btn, label) {
    try {
        const nodes = btn.childNodes;
        for (let i = 0; i < nodes.length; i++) {
            if (nodes[i].nodeType === 3) { nodes[i].textContent = label; return; }
        }
        btn.insertBefore(document.createTextNode(label), btn.firstChild);
    } catch (e) {}
}
function updatePlayButtonsDisabled() {
    if (typeof document === 'undefined') return;
    const blocked = amBanned || amDisabled;
    const label = amBanned ? '🚫 BANNED' : amDisabled ? '⛔ DISABLED' : 'PLAY';
    ['join-btn', 'start-google-game'].forEach((id) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        try { btn.disabled = blocked; } catch (e) {}
        btn.style.opacity = blocked ? '0.45' : '';
        btn.style.cursor = blocked ? 'not-allowed' : '';
        setPlayButtonLabel(btn, label);
    });
}
function renderWWPPlayerPopup(p) {
    if (typeof document === 'undefined' || !p) return;
    const body = document.getElementById('wwp-popup-body');
    if (!body) return;
    const nm = String(p.name || 'Player');
    const pid = String(p.playerId || '?????');
    const pfp = String(p.pfp || '');
    const st = String(p.status || 'active');
    const isBanned = st === 'banned';
    const isDisabled = st === 'disabled';
    const statusHtml = isBanned
        ? '<span style="color:#ff4444;font-weight:900;">🚫 BANNED</span>'
        : isDisabled
        ? '<span style="color:#ffaa00;font-weight:900;">⛔ DISABLED</span>'
        : '<span style="color:#00ff88;font-weight:900;">✅ ACTIVE</span>';
    const img = pfp
        ? '<img src="' + escapeHtml(pfp) + '" style="width:56px;height:56px;border-radius:50%;object-fit:cover;flex-shrink:0;" alt="">'
        : '<div style="width:56px;height:56px;border-radius:50%;background:#334155;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:24px;flex-shrink:0;">' + escapeHtml(nm.charAt(0).toUpperCase()) + '</div>';
    body.innerHTML = `
        <div style="display:flex;gap:12px;align-items:center;background:rgba(255,255,255,0.06);border-radius:8px;padding:10px;">
            ${img}
            <div style="flex:1;min-width:0;">
                <div style="font-size:16px;font-weight:900;">${escapeHtml(nm)} <span style="color:#ffd700;">#${escapeHtml(pid)}</span></div>
                <div style="font-size:12px;color:#aaa;">${p.isGoogle ? 'Google' : 'Guest'} • ${p.online ? '<span style="color:#00ff88;">● Online</span>' : '<span style="color:#888;">○ Offline</span>'}</div>
                <div style="font-size:12px;margin-top:2px;">Status: ${statusHtml}</div>
            </div>
        </div>
        <div style="font-size:12px;font-weight:900;color:#ff8888;margin-top:14px;">🛡️ MODERATION</div>
        <div style="display:flex;gap:8px;margin-top:6px;">
            <button id="wwp-ban-btn" style="flex:1;padding:10px;font-size:13px;font-weight:900;background:${isBanned ? '#00ff88' : '#ff4444'};color:${isBanned ? '#111' : '#fff'};border:none;border-radius:6px;cursor:pointer;">${isBanned ? '✅ UNBAN' : '🚫 BAN'}</button>
            <button id="wwp-disable-btn" style="flex:1;padding:10px;font-size:13px;font-weight:900;background:${isDisabled ? '#00ff88' : '#ffaa00'};color:#111;border:none;border-radius:6px;cursor:pointer;">${isDisabled ? '✅ ENABLE' : '⛔ DISABLE'}</button>
        </div>
        <div style="font-size:12px;font-weight:900;color:#ffd700;margin-top:14px;">🎁 SEND GIFTS (admin — FREE, tumhare balance se nahi kat-te)</div>
        <div style="display:flex;gap:8px;align-items:center;margin-top:8px;">
            <input id="wwp-gift-diamonds-amt" type="number" min="1" value="10" style="flex:1;padding:8px;font-size:13px;background:#111;color:#fff;border:1px solid #444;border-radius:6px;outline:none;">
            <button id="wwp-gift-diamonds-btn" style="padding:8px 12px;font-size:12px;font-weight:900;background:#b388ff;color:#111;border:none;border-radius:6px;cursor:pointer;">SEND 💎</button>
        </div>
        <div style="display:flex;gap:8px;align-items:center;margin-top:8px;">
            <input id="wwp-gift-coins-amt" type="number" min="1" value="100" style="flex:1;padding:8px;font-size:13px;background:#111;color:#fff;border:1px solid #444;border-radius:6px;outline:none;">
            <button id="wwp-gift-coins-btn" style="padding:8px 12px;font-size:12px;font-weight:900;background:#ffd700;color:#111;border:none;border-radius:6px;cursor:pointer;">SEND 🪙</button>
        </div>
        <div style="display:flex;gap:8px;align-items:center;margin-top:8px;">
            <select id="wwp-gift-skin-sel" style="flex:1;padding:8px;font-size:12px;background:#111;color:#fff;border:1px solid #444;border-radius:6px;outline:none;">${wwpSkinOptionsHtml()}</select>
            <button id="wwp-gift-skin-btn" style="padding:8px 12px;font-size:12px;font-weight:900;background:#00ffcc;color:#111;border:none;border-radius:6px;cursor:pointer;">SEND 🎨 SKIN</button>
        </div>
        <div style="display:flex;gap:8px;align-items:center;margin-top:8px;">
            <select id="wwp-gift-char-sel" style="flex:1;padding:8px;font-size:12px;background:#111;color:#fff;border:1px solid #444;border-radius:6px;outline:none;">${wwpSkinOptionsHtml()}</select>
            <button id="wwp-gift-char-btn" style="padding:8px 12px;font-size:12px;font-weight:900;background:#2a6cff;color:#fff;border:none;border-radius:6px;cursor:pointer;">SEND 👤 CHARACTER</button>
        </div>
        <div style="font-size:11px;color:#888;margin-top:10px;">Skin = player ki inventory gifts me jayegi (wo khud equip karega). Character = foran equip ho jayega + gifts me bhi aa jayega.</div>`;
    // Buttons modal ki delegation se chalte hain (openWWPPlayerPopup me) —
    // yahan seedha listener nahi lagate, warna re-render par chhoot jata hai.
}
function wwpSkinGiftFromSelect(sel, type) {
    const id = sel ? String(sel.value || '') : '';
    if (id === '__myskin__') {
        let code = null;
        try { code = localStorage.getItem(skinCodeKey()); } catch (e) {}
        return { type, skinId: 'custom', skinName: 'MY SKIN', skinCode: code };
    }
    const item = INVENTORY_SKINS.find((s) => s.id === id) || INVENTORY_SKINS[0];
    return { type, skinId: item.id, skinName: item.name, skinCode: item.code || null };
}
function adminSetPlayerStatus(key, status) {
    if (!isModEmail()) return;
    try { socket.emit('adminSetStatus', { key, status }); } catch (e) {}
    try {
        const label = status === 'banned' ? 'banned' : status === 'disabled' ? 'disabled' : 'active (unbanned/enabled)';
        if (typeof lobbyToast === 'function') lobbyToast('Player ' + label + ' kar diya ✅');
    } catch (e) {}
}
function adminSendGift(key, gift) {
    if (!isModEmail() || !gift) return;
    // 🎁 Admin gifts FREE hain — admin ke apne balance se nahi kat-te
    // (game master ki tarah de raha hai). Is liye balance check nahi.
    if (gift.type === 'diamonds' || gift.type === 'coins') {
        const amt = Math.floor(Number(gift.amount) || 0);
        if (amt <= 0) { try { if (typeof lobbyToast === 'function') lobbyToast('Amount 1 ya zyada likho.'); } catch (e) {} return; }
    }
    if ((gift.type === 'skin' || gift.type === 'character') && gift.skinCode !== null && typeof gift.skinCode === 'string' && !gift.skinCode.startsWith('PX1|')) {
        try { if (typeof lobbyToast === 'function') lobbyToast('Skin code kharab hai.'); } catch (e) {} return;
    }
    try { socket.emit('adminGift', { key, gift }); } catch (e) {}
}
// 🎁 GIFTED SKINS — admin ne bheji hui skins (per-account save).
// INVENTORY me "GIFTS" section me dikhti hain, wahan se EQUIP hoti hain.
function giftedSkinsKey() { return (typeof skinAccountId !== 'undefined' && skinAccountId) ? ('pointerx_gifted_skins_' + skinAccountId) : 'pointerx_gifted_skins_v1'; }
function loadGiftedSkins() {
    try {
        const raw = localStorage.getItem(giftedSkinsKey());
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
}
function saveGiftedSkins(list) {
    try { localStorage.setItem(giftedSkinsKey(), JSON.stringify(list || [])); } catch (e) {}
}
function addGiftedSkin(gift) {
    const list = loadGiftedSkins();
    const code = (gift && gift.skinCode !== undefined) ? gift.skinCode : null;
    const id = String((gift && gift.skinId) || 'custom');
    // Duplicate na ho (wahi code dobara na aaye).
    if (list.some((g) => String(g.code || '') === String(code || '') && String(g.id || '') === id)) return list;
    list.push({ id, name: String((gift && gift.skinName) || 'Gifted Skin'), code, from: String((gift && gift.from) || 'Admin'), at: (gift && gift.at) || Date.now() });
    saveGiftedSkins(list);
    return list;
}
function equipGiftedSkin(idx) {
    const list = loadGiftedSkins();
    const item = list[idx];
    if (!item) return;
    if (item.code) {
        const skin = decodeSkinCode(item.code);
        if (!skin) { try { lobbyToast('Gifted skin equip nahi hui — code kharab hai.'); } catch (e) {} return; }
        currentSkin = cloneSkin(skin);
        try { localStorage.setItem(skinCodeKey(), encodeSkinCode(currentSkin)); } catch (e) {}
    } else {
        // ORIGINAL — plain Steve.
        currentSkin = null;
        try { localStorage.removeItem(skinCodeKey()); } catch (e) {}
        try { localStorage.removeItem(SKIN_CODE_KEY); } catch (e) {}
    }
    draftSkin = null;
    try { applySkinToAll(); } catch (e) {}
    try { renderInventoryPanel(); } catch (e) {}
    try { sendMySkinToServer(); } catch (e) {}
    try { lobbyToast('Gifted skin equip ho gayi: ' + item.name); } catch (e) {}
}

// Ek doosre player par uski apni skin lagao (server se aaya hua code).
// code khaali ('') hai to original Steve (koi skin nahi). code undefined
// hai to purana server/client hai — apni skin hi rehne do.
function applyPlayerSkin(p, code) {
    if (!p || !p.parts) return;
    if (typeof code === 'string' && code) {
        const skin = decodeSkinCode(code);
        if (skin) { p.skin = skin; p.skinCode = code; applySkinToCharacter(p.parts, skin); return; }
    }
    if (code === '') {
        p.skin = null; p.skinCode = '';
        restoreSkinToCharacter(p.parts);
        return;
    }
}

function updatePartProperty(partName, prop, valStr) {
    let v = parseFloat(valStr);
    if (isNaN(v)) return;
    lobbyCustomParts[partName][prop] = v;
    try {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(`pointerx_custom_${partName}_${prop}`, String(v));
        }
    } catch (e) {}
    applyCustomTransformsToParts(lobbySteveParts);
    applyLobbyCrouchPose();
    // LEG-ROTATE-FIX-v2: taang ki rotation seedha lobby character par bhi
    // lagao — applyLobbyCrouchPose ke BAAD, taake koi bhi beech ka step
    // use wapas na le ja sake. Taang ab slider drag karte hi hilegi.
    // (Version check: served app.js me 'LEG-ROTATE-FIX-v2' search karo.)
    try {
        if (lobbySteveParts && (partName === 'leftLeg' || partName === 'rightLeg')) {
            const leg = partName === 'leftLeg' ? lobbySteveParts.leftLeg : lobbySteveParts.rightLeg;
            const cfg = lobbyCustomParts[partName];
            if (leg && cfg) leg.rotation.set(cfg.rotX, cfg.rotY, cfg.rotZ);
        }
    } catch (e) {}
    const valEl = document.getElementById(`val-${partName}-${prop}`);
    if (valEl) valEl.textContent = v.toFixed(2);
}

function setLobbyPlayerSize(size) {
    let v = parseFloat(size);
    if (isNaN(v)) return;
    v = Math.min(1, Math.max(0.3, v));
    lobbyPlayerSize = v;
    try { if (typeof localStorage !== 'undefined') localStorage.setItem('pointerx_lobby_player_size', String(v)); } catch (e) {}
    if (lobbyCharacter) setPlayerScale(lobbyCharacter, v);
    if (lobbyPlatform) lobbyPlatform.scale.set((v / 0.5) * lobbyShadowScale, (v / 0.5) * lobbyShadowScale, 1);
    const val = document.getElementById('lobby-size-value');
    if (val) val.textContent = v.toFixed(2);
}

function setLobbyPlayerRotate(deg) {
    let v = parseFloat(deg);
    if (isNaN(v)) return;
    v = Math.min(180, Math.max(-180, v));
    lobbyPlayerRotate = v;
    try { if (typeof localStorage !== 'undefined') localStorage.setItem('pointerx_lobby_player_rotate', String(v)); } catch (e) {}
    if (lobbyCharacter) lobbyCharacter.rotation.y = v * Math.PI / 180;
    const val = document.getElementById('lobby-rotate-value');
    if (val) val.textContent = v.toFixed(0) + '°';
    const sl = document.getElementById('lobby-rotate-slider');
    if (sl) sl.value = String(v);
}

function setLobbyShadowScale(vIn) {
    let v = parseFloat(vIn);
    if (isNaN(v)) return;
    v = Math.min(2, Math.max(0.3, v));
    lobbyShadowScale = v;
    try { if (typeof localStorage !== 'undefined') localStorage.setItem('pointerx_lobby_shadow_scale', String(v)); } catch (e) {}
    if (lobbyPlatform) lobbyPlatform.scale.set((lobbyPlayerSize / 0.5) * v, (lobbyPlayerSize / 0.5) * v, 1);
    const val = document.getElementById('lobby-shadow-value');
    if (val) val.textContent = v.toFixed(2);
    const sl = document.getElementById('lobby-shadow-slider');
    if (sl) sl.value = String(v);
}

function applyLobbyGunTransform() {
    if (!lobbyGunGroup) return;
    lobbyGunGroup.position.set(lobbyGunX, lobbyGunY, lobbyGunZ);
    lobbyGunGroup.scale.set(lobbyGunScale, lobbyGunScale, lobbyGunScale);
}

function setLobbyGunX(vIn) {
    let v = parseFloat(vIn);
    if (isNaN(v)) return;
    v = Math.min(0.6, Math.max(-0.6, v));
    lobbyGunX = v;
    try { if (typeof localStorage !== 'undefined') localStorage.setItem('pointerx_lobby_gun_x', String(v)); } catch (e) {}
    applyLobbyGunTransform();
    const val = document.getElementById('lobby-gun-x-value');
    if (val) val.textContent = v.toFixed(2);
    const sl = document.getElementById('lobby-gun-x-slider');
    if (sl) sl.value = String(v);
}

function setLobbyGunY(vIn) {
    let v = parseFloat(vIn);
    if (isNaN(v)) return;
    v = Math.min(1.35, Math.max(0.6, v));
    lobbyGunY = v;
    try { if (typeof localStorage !== 'undefined') localStorage.setItem('pointerx_lobby_gun_y', String(v)); } catch (e) {}
    applyLobbyGunTransform();
    const val = document.getElementById('lobby-gun-y-value');
    if (val) val.textContent = v.toFixed(2);
    const sl = document.getElementById('lobby-gun-y-slider');
    if (sl) sl.value = String(v);
}

function setLobbyGunScale(vIn) {
    let v = parseFloat(vIn);
    if (isNaN(v)) return;
    v = Math.min(2, Math.max(0.5, v));
    lobbyGunScale = v;
    try { if (typeof localStorage !== 'undefined') localStorage.setItem('pointerx_lobby_gun_scale', String(v)); } catch (e) {}
    applyLobbyGunTransform();
    const val = document.getElementById('lobby-gun-size-value');
    if (val) val.textContent = v.toFixed(2);
    const sl = document.getElementById('lobby-gun-size-slider');
    if (sl) sl.value = String(v);
}

function setLobbyGunZ(vIn) {
    let v = parseFloat(vIn);
    if (isNaN(v)) return;
    v = Math.min(1, Math.max(0.3, v));
    lobbyGunZ = v;
    try { if (typeof localStorage !== 'undefined') localStorage.setItem('pointerx_lobby_gun_z', String(v)); } catch (e) {}
    applyLobbyGunTransform();
    const val = document.getElementById('lobby-gun-z-value');
    if (val) val.textContent = v.toFixed(2);
    const sl = document.getElementById('lobby-gun-z-slider');
    if (sl) sl.value = String(v);
}

function resetLobbyGun() {
    // RESET ab Jimmy ki baked look par le jata hai, purane factory pose par nahi.
    setLobbyGunX(0);
    setLobbyGunY(1.15);
    setLobbyGunZ(0.62);
    setLobbyGunScale(0.95);
}

// ---- Crouch pose (bethne ki position): Jimmy khud banata hai ----
// Sliders lobby me hain, SIT PREVIEW se lobby character beth kar dikhata
// hai, aur yehi values game me Shift wale crouch ki pose banti hain.
function setCrouchHip(vIn) {
    let v = parseFloat(vIn); if (isNaN(v)) return;
    v = Math.min(1.2, Math.max(0, v)); crouchHip = v;
    try { if (typeof localStorage !== 'undefined') localStorage.setItem('pointerx_crouch_hip', String(v)); } catch (e) {}
    applyLobbyCrouchPose();
    const val = document.getElementById('lobby-crouch-hip-value'); if (val) val.textContent = v.toFixed(2);
    const sl = document.getElementById('lobby-crouch-hip-slider'); if (sl) sl.value = String(v);
}
function setCrouchKnee(vIn) {
    let v = parseFloat(vIn); if (isNaN(v)) return;
    v = Math.min(2, Math.max(0, v)); crouchKnee = v;
    try { if (typeof localStorage !== 'undefined') localStorage.setItem('pointerx_crouch_knee', String(v)); } catch (e) {}
    applyLobbyCrouchPose();
    const val = document.getElementById('lobby-crouch-knee-value'); if (val) val.textContent = v.toFixed(2);
    const sl = document.getElementById('lobby-crouch-knee-slider'); if (sl) sl.value = String(v);
}
function setCrouchDrop(vIn) {
    let v = parseFloat(vIn); if (isNaN(v)) return;
    v = Math.min(0.3, Math.max(0, v)); crouchDrop = v;
    try { if (typeof localStorage !== 'undefined') localStorage.setItem('pointerx_crouch_drop', String(v)); } catch (e) {}
    applyLobbyCrouchPose();
    const val = document.getElementById('lobby-crouch-drop-value'); if (val) val.textContent = v.toFixed(2);
    const sl = document.getElementById('lobby-crouch-drop-slider'); if (sl) sl.value = String(v);
}
function resetCrouchPose() {
    setCrouchHip(0.6);
    setCrouchKnee(1.6);
    setCrouchDrop(0.23);
}
function setLobbyCrouchPreview(on) {
    lobbyCrouchPreview = !!on;
    try { if (typeof localStorage !== 'undefined') localStorage.setItem('pointerx_crouch_preview', lobbyCrouchPreview ? '1' : '0'); } catch (e) {}
    applyLobbyCrouchPose();
    const btn = document.getElementById('lobby-crouch-preview-btn');
    if (btn) btn.textContent = lobbyCrouchPreview ? 'STAND UP (PREVIEW BAND KARO)' : 'SIT PREVIEW (BETH KE DEKHO)';
}
function applyLobbyCrouchPose() {
    if (!lobbyCharacter || !lobbySteveParts) return;
    const baseLegL = (lobbyCustomParts.leftLeg) ? lobbyCustomParts.leftLeg.rotX : 0;
    const baseLegR = (lobbyCustomParts.rightLeg) ? lobbyCustomParts.rightLeg.rotX : 0;
    const baseKneeL = (lobbyCustomParts.leftKnee) ? lobbyCustomParts.leftKnee.rotX : 0;
    const baseKneeR = (lobbyCustomParts.rightKnee) ? lobbyCustomParts.rightKnee.rotX : 0;
    if (lobbyCrouchPreview) {
        // Betha hua: thigh aage, knee bend, poora group neeche — pair
        // zameen par rehte hain kyunki drop bend ke barabar hai. Knee
        // bend quaternion se lagta hai taake shin peeche jaye, side me nahi.
        // Taang ki rotY/rotZ CUSTOM wali rehti hai (baked/saved pose) —
        // pehle yahan -0.08/0.08 hardcode tha, is liye lobby me taang
        // slider se hilti hi nahi thi (game me custom dikhti thi).
        lobbySteveParts.leftLeg.rotation.set(baseLegL - crouchHip, lobbyCustomParts.leftLeg.rotY, lobbyCustomParts.leftLeg.rotZ);
        lobbySteveParts.rightLeg.rotation.set(baseLegR - crouchHip, lobbyCustomParts.rightLeg.rotY, lobbyCustomParts.rightLeg.rotZ);
        applyKneeBend(lobbySteveParts.leftKneeMesh, lobbySteveParts.leftLeg.rotation, lobbyCustomParts.leftKnee, crouchKnee);
        applyKneeBend(lobbySteveParts.rightKneeMesh, lobbySteveParts.rightLeg.rotation, lobbyCustomParts.rightKnee, crouchKnee);
        lobbyCharacter.position.y = -crouchDrop * lobbyPlayerSize * PLAYER_HEIGHT_RATIO;
    } else {
        // Khara hua: lobby ki normal pose wapas — CUSTOM taang pose,
        // (0,0,±0.08) hardcode nahi. Warna slider drag karne par bhi
        // taang hilti nahi thi (updatePartProperty ke baad ye function
        // use wapas 0 par le aata tha), aur game me custom dikhta tha.
        lobbySteveParts.leftLeg.rotation.set(baseLegL, lobbyCustomParts.leftLeg.rotY, lobbyCustomParts.leftLeg.rotZ);
        lobbySteveParts.rightLeg.rotation.set(baseLegR, lobbyCustomParts.rightLeg.rotY, lobbyCustomParts.rightLeg.rotZ);
        lobbySteveParts.leftKneeMesh.rotation.set(baseKneeL, lobbyCustomParts.leftKnee.rotY, lobbyCustomParts.leftKnee.rotZ);
        lobbySteveParts.rightKneeMesh.rotation.set(baseKneeR, lobbyCustomParts.rightKnee.rotY, lobbyCustomParts.rightKnee.rotZ);
        lobbyCharacter.position.y = 0;
    }
}

// ---- In-game gun editor: doosre player ki gun par click (crosshair) ya G ----
function applyInGameGunTransform() {
    inGameGunGroups.forEach((g) => {
        if (!g) return;
        const arm = g.userData.armGroup;
        const pm = g.userData.playerMesh;
        if (arm && pm) {
            // Gun haath se pinned hai — editor values character space me
            // hain, is liye pehle playerMesh par wapas lao, values lagao,
            // phir haath se dobara jodo (world pose wahi rehti hai).
            pm.attach(g);
            g.position.set(inGameGunPosX, inGameGunPosY, inGameGunPosZ);
            g.rotation.set(inGameGunRotX * Math.PI / 180, inGameGunRotY * Math.PI / 180, 0);
            arm.attach(g);
        } else {
            g.position.set(inGameGunPosX, inGameGunPosY, inGameGunPosZ);
            g.rotation.set(inGameGunRotX * Math.PI / 180, inGameGunRotY * Math.PI / 180, 0);
        }
    });
}

function syncInGameGunEditor() {
    const setVal = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
    const setSlider = (id, v) => { const el = document.getElementById(id); if (el) el.value = String(v); };
    setVal('ig-gun-rotX-value', inGameGunRotX.toFixed(0) + '°'); setSlider('ig-gun-rotX-slider', inGameGunRotX);
    setVal('ig-gun-rotY-value', inGameGunRotY.toFixed(0) + '°'); setSlider('ig-gun-rotY-slider', inGameGunRotY);
    setVal('ig-gun-posX-value', inGameGunPosX.toFixed(2)); setSlider('ig-gun-posX-slider', inGameGunPosX);
    setVal('ig-gun-posY-value', inGameGunPosY.toFixed(2)); setSlider('ig-gun-posY-slider', inGameGunPosY);
    setVal('ig-gun-posZ-value', inGameGunPosZ.toFixed(2)); setSlider('ig-gun-posZ-slider', inGameGunPosZ);
}

function setInGameGunRotX(vIn) {
    let v = parseFloat(vIn); if (isNaN(v)) return;
    v = Math.min(60, Math.max(-60, v)); inGameGunRotX = v;
    try { if (typeof localStorage !== 'undefined') localStorage.setItem('pointerx_ingame_gun_rotX', String(v)); } catch (e) {}
    applyInGameGunTransform(); syncInGameGunEditor();
}

function setInGameGunRotY(vIn) {
    let v = parseFloat(vIn); if (isNaN(v)) return;
    v = Math.min(60, Math.max(-60, v)); inGameGunRotY = v;
    try { if (typeof localStorage !== 'undefined') localStorage.setItem('pointerx_ingame_gun_rotY', String(v)); } catch (e) {}
    applyInGameGunTransform(); syncInGameGunEditor();
}

function setInGameGunPosX(vIn) {
    let v = parseFloat(vIn); if (isNaN(v)) return;
    v = Math.min(1, Math.max(-1, v)); inGameGunPosX = v;
    try { if (typeof localStorage !== 'undefined') localStorage.setItem('pointerx_ingame_gun_posX', String(v)); } catch (e) {}
    applyInGameGunTransform(); syncInGameGunEditor();
}

function setInGameGunPosY(vIn) {
    let v = parseFloat(vIn); if (isNaN(v)) return;
    v = Math.min(2, Math.max(0.6, v)); inGameGunPosY = v;
    try { if (typeof localStorage !== 'undefined') localStorage.setItem('pointerx_ingame_gun_posY', String(v)); } catch (e) {}
    applyInGameGunTransform(); syncInGameGunEditor();
}

function setInGameGunPosZ(vIn) {
    let v = parseFloat(vIn); if (isNaN(v)) return;
    v = Math.min(1, Math.max(-0.5, v)); inGameGunPosZ = v;
    try { if (typeof localStorage !== 'undefined') localStorage.setItem('pointerx_ingame_gun_posZ', String(v)); } catch (e) {}
    applyInGameGunTransform(); syncInGameGunEditor();
}

function resetInGameGun() {
    setInGameGunRotX(5); setInGameGunRotY(0); setInGameGunPosX(-0.1); setInGameGunPosY(1.65); setInGameGunPosZ(0.4);
}

function applyInGamePlayerTransform() {
    Object.values(otherPlayers).forEach((pl) => {
        if (!pl.mesh) return;
        setPlayerScale(pl.mesh, inGamePlayerSize);
        pl.mesh.rotation.y = (pl.lastYaw || 0) + Math.PI + inGamePlayerRotate * Math.PI / 180;
    });
}

function syncInGamePlayerEditor() {
    const setVal = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
    const setSlider = (id, v) => { const el = document.getElementById(id); if (el) el.value = String(v); };
    setVal('ig-player-size-value', inGamePlayerSize.toFixed(2)); setSlider('ig-player-size-slider', inGamePlayerSize);
    setVal('ig-player-rotate-value', inGamePlayerRotate.toFixed(0) + '°'); setSlider('ig-player-rotate-slider', inGamePlayerRotate);
    setVal('ig-pushup-height-value', inGamePushupHeight.toFixed(2)); setSlider('ig-pushup-height-slider', inGamePushupHeight);
}

function setInGamePlayerSize(vIn) {
    let v = parseFloat(vIn); if (isNaN(v)) return;
    v = Math.min(2, Math.max(0.3, v)); inGamePlayerSize = v;
    try { if (typeof localStorage !== 'undefined') localStorage.setItem('pointerx_ingame_player_size', String(v)); } catch (e) {}
    applyInGamePlayerTransform(); syncInGamePlayerEditor();
}

function setInGamePlayerRotate(vIn) {
    let v = parseFloat(vIn); if (isNaN(v)) return;
    v = Math.min(180, Math.max(-180, v)); inGamePlayerRotate = v;
    try { if (typeof localStorage !== 'undefined') localStorage.setItem('pointerx_ingame_player_rotate', String(v)); } catch (e) {}
    applyInGamePlayerTransform(); syncInGamePlayerEditor();
}

function resetInGamePlayer() {
    setInGamePlayerSize(1); setInGamePlayerRotate(0);
}

// 💪 Pushup height — in-game editor (G) se set hoti hai, save rehti hai.
// Kam value = body zameen ke zyada paas (ghus sakta hai), zyada = upar.
function setInGamePushupHeight(vIn) {
    let v = parseFloat(vIn); if (isNaN(v)) return;
    v = Math.min(0.8, Math.max(0.3, v)); inGamePushupHeight = v;
    try { if (typeof localStorage !== 'undefined') localStorage.setItem('pointerx_ingame_pushup_height', String(v)); } catch (e) {}
    const slider = document.getElementById('ig-pushup-height-slider');
    if (slider) slider.value = String(v);
    const label = document.getElementById('ig-pushup-height-value');
    if (label) label.textContent = v.toFixed(2);
}

function updateInGamePartProperty(partName, prop, valStr) {
    let v = parseFloat(valStr); if (isNaN(v)) return;
    lobbyCustomParts[partName][prop] = v;
    try { if (typeof localStorage !== 'undefined') localStorage.setItem(`pointerx_custom_${partName}_${prop}`, String(v)); } catch (e) {}
    applyCustomTransformsToParts(lobbySteveParts);
    Object.values(otherPlayers).forEach((pl) => { if (pl.parts) applyCustomTransformsToParts(pl.parts); });
    const valEl = document.getElementById(`ig-val-${partName}-${prop}`);
    if (valEl) valEl.textContent = v.toFixed(2);
}

function resetInGameParts() {
    partNames.forEach((partName) => {
        ['scale', 'rotX', 'rotY', 'rotZ', 'posX', 'posY', 'posZ'].forEach((prop) => {
            const baked = DEFAULT_LOOK_CUSTOM_PARTS[partName] && DEFAULT_LOOK_CUSTOM_PARTS[partName][prop] !== undefined
                ? DEFAULT_LOOK_CUSTOM_PARTS[partName][prop]
                : (prop === 'scale' ? 1 : 0);
            const def = baked;
            lobbyCustomParts[partName][prop] = def;
            try { if (typeof localStorage !== 'undefined') localStorage.setItem(`pointerx_custom_${partName}_${prop}`, String(def)); } catch (e) {}
        });
    });
    applyCustomTransformsToParts(lobbySteveParts);
    Object.values(otherPlayers).forEach((pl) => { if (pl.parts) applyCustomTransformsToParts(pl.parts); });
    syncInGamePartsEditor();
}

function syncInGamePartsEditor() {
    document.querySelectorAll('.ig-custom-part-input').forEach((input) => {
        const partName = input.dataset.part;
        const prop = input.dataset.prop;
        if (lobbyCustomParts[partName] && lobbyCustomParts[partName][prop] !== undefined) {
            input.value = String(lobbyCustomParts[partName][prop]);
            const valEl = document.getElementById(`ig-val-${partName}-${prop}`);
            if (valEl) valEl.textContent = lobbyCustomParts[partName][prop].toFixed(2);
        }
    });
}

function buildInGamePartsHtml() {
    const partLabels = { head: 'HEAD', body: 'BODY', leftArm: 'LEFT ARM', rightArm: 'RIGHT ARM', leftLeg: 'LEFT LEG', rightLeg: 'RIGHT LEG', leftElbow: 'LEFT ELBOW (BEND)', rightElbow: 'RIGHT ELBOW (BEND)', leftKnee: 'LEFT KNEE (BEND)', rightKnee: 'RIGHT KNEE (BEND)' };
    let html = '';
    partNames.forEach((pKey) => {
        const cfg = lobbyCustomParts[pKey];
        const isElbow = pKey === 'leftElbow' || pKey === 'rightElbow' || pKey === 'leftKnee' || pKey === 'rightKnee'; // joint: elbow ya knee, sirf RotX/RotY
        html += '<div style="background:rgba(255,255,255,0.04); padding:8px; border-radius:6px; margin-top:8px;">';
        html += '<div style="font-size:12px; font-weight:bold; color:' + (isElbow ? '#ffaa00' : '#00ffcc') + '; margin-bottom:4px;">' + partLabels[pKey] + '</div>';
        if (!isElbow) {
            html += '<div style="font-size:10px; color:#aaa;">Scale: <span id="ig-val-' + pKey + '-scale">' + cfg.scale.toFixed(2) + '</span></div>';
            html += '<input type="range" class="ig-custom-part-input" data-part="' + pKey + '" data-prop="scale" min="0.3" max="2.0" step="0.05" value="' + cfg.scale + '" style="width:100%; accent-color:#00ffcc;">';
        }
        html += '<div style="display:flex; gap:4px; margin-top:4px;">';
        html += '<div style="flex:1;"><div style="font-size:9px; color:#aaa;">Rot X: <span id="ig-val-' + pKey + '-rotX">' + cfg.rotX.toFixed(2) + '</span></div><input type="range" class="ig-custom-part-input" data-part="' + pKey + '" data-prop="rotX" min="-3.14" max="3.14" step="0.1" value="' + cfg.rotX + '" style="width:100%; accent-color:#ffaa00;"></div>';
        html += '<div style="flex:1;"><div style="font-size:9px; color:#aaa;">Rot Y: <span id="ig-val-' + pKey + '-rotY">' + cfg.rotY.toFixed(2) + '</span></div><input type="range" class="ig-custom-part-input" data-part="' + pKey + '" data-prop="rotY" min="-3.14" max="3.14" step="0.1" value="' + cfg.rotY + '" style="width:100%; accent-color:#ffaa00;"></div>';
        html += '</div>';
        if (!isElbow) {
            html += '<div style="display:flex; gap:4px; margin-top:4px;">';
            html += '<div style="flex:1;"><div style="font-size:9px; color:#aaa;">Rot Z: <span id="ig-val-' + pKey + '-rotZ">' + cfg.rotZ.toFixed(2) + '</span></div><input type="range" class="ig-custom-part-input" data-part="' + pKey + '" data-prop="rotZ" min="-3.14" max="3.14" step="0.1" value="' + cfg.rotZ + '" style="width:100%; accent-color:#ffaa00;"></div>';
            html += '<div style="flex:1;"><div style="font-size:9px; color:#aaa;">Pos Y: <span id="ig-val-' + pKey + '-posY">' + cfg.posY.toFixed(2) + '</span></div><input type="range" class="ig-custom-part-input" data-part="' + pKey + '" data-prop="posY" min="-1.0" max="1.0" step="0.05" value="' + cfg.posY + '" style="width:100%; accent-color:#ff3333;"></div>';
            html += '</div>';
        }
        html += '</div>';
    });
    return html;
}

function closeInGameGunEditor() {
    isInGameGunEditing = false;
    const panel = document.getElementById('ingame-gun-editor');
    if (panel) panel.style.display = 'none';
}

function openInGameGunEditor() {
    // 🔒 Game me editor (G) sirf tab khule jab mod Gmail
    // (technowarrior924@gmail.com) se Google login ho.
    // Warna G dabane par kuch nahi hoga, goli normal chalegi.
    if (!isModEmail()) return;
    isInGameGunEditing = true;
    let panel = document.getElementById('ingame-gun-editor');
    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'ingame-gun-editor';
        panel.style.cssText = 'position:fixed;top:70px;right:20px;width:300px;max-width:92vw;max-height:80vh;overflow-y:auto;background:rgba(0,0,0,0.92);border:2px solid #00d2ff;border-radius:12px;padding:14px;z-index:99999;color:white;font-family:monospace;';
        panel.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                <div style="font-weight:900;font-size:14px;color:#00d2ff;">IN-GAME PLAYER + GUN EDITOR</div>
                <button id="ig-gun-close" style="background:#222;color:#fff;border:1px solid #444;width:28px;height:28px;border-radius:4px;font-weight:bold;cursor:pointer;">✕</button>
            </div>
            <div style="font-size:11px;color:#aaa;line-height:1.5;margin-bottom:10px;">Doosre players (jo game me dikhte hain) ke liye hai — gun bhi, player size/rotate aur parts bhi, bilkul lobby jaisa. Har change foran dikhega aur refresh ke baad bhi save rahega. YE PANEL SIRF G SE KHULTA HAI — bande par fire karne se ye nahi khulega, fire hamesha goli hi chalegi. Aur ye sirf technowarrior924@gmail.com se Google login hone par khulta hai. Band karne ke baad Click to Start se wapas khelo.</div>
            <hr style="border:0; border-top:1px solid #333; margin:12px 0;">
            <div style="font-size:12px; font-weight:bold; color:#00d2ff; text-align:left; margin-bottom:4px;">PLAYER SIZE / ROTATE (LOBBY JAISA)</div>
            <div style="text-align:left;margin-top:8px;">
                <div style="font-size:11px;color:#00ffcc;">PLAYER SIZE: <span id="ig-player-size-value">1.00</span></div>
                <div style="display:flex;gap:6px;margin-top:4px;">
                    <button id="ig-player-size-minus" style="flex:1;padding:6px;font-weight:bold;background:#2a6cff;color:white;border:none;border-radius:4px;cursor:pointer;">◀ SMALLER</button>
                    <button id="ig-player-size-plus" style="flex:1;padding:6px;font-weight:bold;background:#2a6cff;color:white;border:none;border-radius:4px;cursor:pointer;">BIGGER ▶</button>
                </div>
                <input type="range" id="ig-player-size-slider" min="0.3" max="2" step="0.05" value="1" style="width:100%;accent-color:#00ffcc;cursor:pointer;margin-top:4px;">
            </div>
            <div style="text-align:left;margin-top:8px;">
                <div style="font-size:11px;color:#00ffcc;">PLAYER ROTATE: <span id="ig-player-rotate-value">0°</span></div>
                <div style="display:flex;gap:6px;margin-top:4px;">
                    <button id="ig-player-rotate-left" style="flex:1;padding:6px;font-weight:bold;background:#2a6cff;color:white;border:none;border-radius:4px;cursor:pointer;font-size:11px;">◀ LEFT</button>
                    <button id="ig-player-rotate-right" style="flex:1;padding:6px;font-weight:bold;background:#2a6cff;color:white;border:none;border-radius:4px;cursor:pointer;font-size:11px;">RIGHT ▶</button>
                    <button id="ig-player-flip" style="flex:1;padding:6px;font-weight:bold;background:#ffaa00;color:#111;border:none;border-radius:4px;cursor:pointer;font-size:11px;">FLIP</button>
                </div>
                <input type="range" id="ig-player-rotate-slider" min="-180" max="180" step="5" value="0" style="width:100%;accent-color:#00ffcc;cursor:pointer;margin-top:4px;">
            </div>
            <div style="text-align:left;margin-top:8px;">
                <div style="font-size:11px;color:#00ffcc;">💪 PUSHUP HEIGHT: <span id="ig-pushup-height-value">0.45</span> <span style="color:#aaa;">(body zameen se kitna upar — kam ho to zameen me ghus jata hai)</span></div>
                <div style="display:flex;gap:6px;margin-top:4px;">
                    <button id="ig-pushup-height-minus" style="flex:1;padding:6px;font-weight:bold;background:#2a6cff;color:white;border:none;border-radius:4px;cursor:pointer;">◀ LOWER</button>
                    <button id="ig-pushup-height-plus" style="flex:1;padding:6px;font-weight:bold;background:#2a6cff;color:white;border:none;border-radius:4px;cursor:pointer;">HIGHER ▶</button>
                </div>
                <input type="range" id="ig-pushup-height-slider" min="0.3" max="0.8" step="0.05" value="0.45" style="width:100%;accent-color:#00ffcc;cursor:pointer;margin-top:4px;">
            </div>
            <hr style="border:0; border-top:1px solid #333; margin:12px 0;">
            <div style="font-size:12px; font-weight:bold; color:#ffc400; text-align:left; margin-bottom:4px;">ADVANCED PARTS (LOBBY JAISA)</div>
            ${buildInGamePartsHtml()}
            <div style="text-align:left;margin-top:8px;">
                <div style="font-size:11px;color:#00ffcc;">ROTATE X: <span id="ig-gun-rotX-value">0°</span></div>
                <div style="display:flex;gap:6px;margin-top:4px;">
                    <button id="ig-gun-rotX-minus" style="flex:1;padding:6px;font-weight:bold;background:#2a6cff;color:white;border:none;border-radius:4px;cursor:pointer;">◀ -5°</button>
                    <button id="ig-gun-rotX-plus" style="flex:1;padding:6px;font-weight:bold;background:#2a6cff;color:white;border:none;border-radius:4px;cursor:pointer;">+5° ▶</button>
                </div>
                <input type="range" id="ig-gun-rotX-slider" min="-60" max="60" step="5" value="0" style="width:100%;accent-color:#00ffcc;cursor:pointer;margin-top:4px;">
            </div>
            <div style="text-align:left;margin-top:8px;">
                <div style="font-size:11px;color:#00ffcc;">ROTATE Y: <span id="ig-gun-rotY-value">0°</span></div>
                <div style="display:flex;gap:6px;margin-top:4px;">
                    <button id="ig-gun-rotY-minus" style="flex:1;padding:6px;font-weight:bold;background:#2a6cff;color:white;border:none;border-radius:4px;cursor:pointer;">◀ -5°</button>
                    <button id="ig-gun-rotY-plus" style="flex:1;padding:6px;font-weight:bold;background:#2a6cff;color:white;border:none;border-radius:4px;cursor:pointer;">+5° ▶</button>
                </div>
                <input type="range" id="ig-gun-rotY-slider" min="-60" max="60" step="5" value="0" style="width:100%;accent-color:#00ffcc;cursor:pointer;margin-top:4px;">
            </div>
            <div style="text-align:left;margin-top:8px;">
                <div style="font-size:11px;color:#00ffcc;">POSITION X: <span id="ig-gun-posX-value">-0.44</span> <span style="color:#aaa;">(- = left, + = right)</span></div>
                <div style="display:flex;gap:6px;margin-top:4px;">
                    <button id="ig-gun-posX-minus" style="flex:1;padding:6px;font-weight:bold;background:#2a6cff;color:white;border:none;border-radius:4px;cursor:pointer;">◀ LEFT</button>
                    <button id="ig-gun-posX-plus" style="flex:1;padding:6px;font-weight:bold;background:#2a6cff;color:white;border:none;border-radius:4px;cursor:pointer;">RIGHT ▶</button>
                </div>
                <input type="range" id="ig-gun-posX-slider" min="-1" max="1" step="0.05" value="-0.44" style="width:100%;accent-color:#00ffcc;cursor:pointer;margin-top:4px;">
            </div>
            <div style="text-align:left;margin-top:8px;">
                <div style="font-size:11px;color:#00ffcc;">POSITION Z: <span id="ig-gun-posZ-value">0.15</span> <span style="color:#aaa;">(aage / peeche — side view me left / right)</span></div>
                <div style="display:flex;gap:6px;margin-top:4px;">
                    <button id="ig-gun-posZ-minus" style="flex:1;padding:6px;font-weight:bold;background:#2a6cff;color:white;border:none;border-radius:4px;cursor:pointer;">◀ BACK</button>
                    <button id="ig-gun-posZ-plus" style="flex:1;padding:6px;font-weight:bold;background:#2a6cff;color:white;border:none;border-radius:4px;cursor:pointer;">FORWARD ▶</button>
                </div>
                <input type="range" id="ig-gun-posZ-slider" min="-0.5" max="1" step="0.05" value="0.15" style="width:100%;accent-color:#00ffcc;cursor:pointer;margin-top:4px;">
            </div>
            <div style="text-align:left;margin-top:8px;">
                <div style="font-size:11px;color:#00ffcc;">POSITION Y: <span id="ig-gun-posY-value">1.55</span> <span style="color:#aaa;">(up / down)</span></div>
                <div style="display:flex;gap:6px;margin-top:4px;">
                    <button id="ig-gun-posY-up" style="flex:1;padding:6px;font-weight:bold;background:#2a6cff;color:white;border:none;border-radius:4px;cursor:pointer;">▲ UP</button>
                    <button id="ig-gun-posY-down" style="flex:1;padding:6px;font-weight:bold;background:#2a6cff;color:white;border:none;border-radius:4px;cursor:pointer;">▼ DOWN</button>
                </div>
                <input type="range" id="ig-gun-posY-slider" min="0.6" max="2" step="0.05" value="1.55" style="width:100%;accent-color:#00ffcc;cursor:pointer;margin-top:4px;">
            </div>
            <button id="ig-gun-reset" style="width:100%;padding:8px;margin-top:10px;font-weight:bold;background:#334155;color:white;border:none;border-radius:6px;cursor:pointer;font-size:12px;">RESET GUN</button>
            <button id="ig-player-reset" style="width:100%;padding:8px;margin-top:6px;font-weight:bold;background:#334155;color:white;border:none;border-radius:6px;cursor:pointer;font-size:12px;">RESET PLAYER (SIZE + ROTATE)</button>
            <button id="ig-parts-reset" style="width:100%;padding:8px;margin-top:6px;font-weight:bold;background:#334155;color:white;border:none;border-radius:6px;cursor:pointer;font-size:12px;">RESET PARTS</button>
            <button id="ig-gun-done" style="width:100%;padding:10px;margin-top:6px;font-weight:bold;background:#ffc400;color:#111;border:none;border-radius:6px;cursor:pointer;font-size:14px;">DONE</button>
        `;
        document.body.appendChild(panel);
        const bind = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };
        const bindSlider = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('input', () => fn(el.value)); };
        bind('ig-gun-rotX-minus', () => setInGameGunRotX(inGameGunRotX - 5));
        bind('ig-gun-rotX-plus', () => setInGameGunRotX(inGameGunRotX + 5));
        bind('ig-gun-rotY-minus', () => setInGameGunRotY(inGameGunRotY - 5));
        bind('ig-gun-rotY-plus', () => setInGameGunRotY(inGameGunRotY + 5));
        bind('ig-gun-posX-minus', () => setInGameGunPosX(inGameGunPosX - 0.05));
        bind('ig-gun-posX-plus', () => setInGameGunPosX(inGameGunPosX + 0.05));
        bind('ig-gun-posZ-minus', () => setInGameGunPosZ(inGameGunPosZ - 0.05));
        bind('ig-gun-posZ-plus', () => setInGameGunPosZ(inGameGunPosZ + 0.05));
        bindSlider('ig-gun-posZ-slider', (v) => setInGameGunPosZ(v));
        bind('ig-gun-posY-up', () => setInGameGunPosY(inGameGunPosY + 0.05));
        bind('ig-gun-posY-down', () => setInGameGunPosY(inGameGunPosY - 0.05));
        bindSlider('ig-gun-rotX-slider', (v) => setInGameGunRotX(v));
        bindSlider('ig-gun-rotY-slider', (v) => setInGameGunRotY(v));
        bindSlider('ig-gun-posX-slider', (v) => setInGameGunPosX(v));
        bindSlider('ig-gun-posY-slider', (v) => setInGameGunPosY(v));
        bind('ig-gun-reset', () => resetInGameGun());
        bind('ig-player-reset', () => resetInGamePlayer());
        bind('ig-parts-reset', () => resetInGameParts());
        bind('ig-player-size-minus', () => setInGamePlayerSize(inGamePlayerSize - 0.05));
        bind('ig-player-size-plus', () => setInGamePlayerSize(inGamePlayerSize + 0.05));
        bindSlider('ig-player-size-slider', (v) => setInGamePlayerSize(v));
        bind('ig-player-rotate-left', () => setInGamePlayerRotate(inGamePlayerRotate - 15));
        bind('ig-player-rotate-right', () => setInGamePlayerRotate(inGamePlayerRotate + 15));
        bind('ig-player-flip', () => setInGamePlayerRotate(inGamePlayerRotate === 180 ? 0 : 180));
        bindSlider('ig-player-rotate-slider', (v) => setInGamePlayerRotate(v));
        // 💪 Pushup height — slider + LOWER/HIGHER buttons.
        bind('ig-pushup-height-minus', () => setInGamePushupHeight(inGamePushupHeight - 0.05));
        bind('ig-pushup-height-plus', () => setInGamePushupHeight(inGamePushupHeight + 0.05));
        bindSlider('ig-pushup-height-slider', (v) => setInGamePushupHeight(v));
        document.querySelectorAll('.ig-custom-part-input').forEach((input) => {
            input.addEventListener('input', (e) => { updateInGamePartProperty(e.target.dataset.part, e.target.dataset.prop, e.target.value); });
        });
        bind('ig-gun-close', () => closeInGameGunEditor());
        bind('ig-gun-done', () => closeInGameGunEditor());
    }
    syncInGameGunEditor();
    syncInGamePlayerEditor();
    syncInGamePartsEditor();
    panel.style.display = 'block';
    try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) {}
}

function lobbyToast(msg) {
    const t = document.getElementById('lobby-toast');
    if (t) t.textContent = msg;
}

// 🔒 Modification options sirf is Gmail se Google login par:
// technowarrior924@gmail.com — FPS-3D(123) naam wala system hata diya.
// Guest naam se ab mod nahi milta; sirf is Google account se login par
// customize options, drag/resize aur in-game G editor khulte hain.
const MOD_ONLY_EMAIL = 'technowarrior924@gmail.com';
let currentGoogleEmail = '';
let currentGoogleUid = '';
function isModEmail() {
    try { return String(currentGoogleEmail || '').trim().toLowerCase() === MOD_ONLY_EMAIL; } catch (e) { return false; }
}
// 🏠 ANYMAYS panel (lobby card) — G se hide/show, SIRF mod Gmail ke liye.
// - Guest: panel hamesha dikhe (Google login + naam ke liye).
// - Mod Gmail: panel default chhupa, G dabao to dikhe, dobara G to chhupe.
// - Dusri Gmail: panel hamesha chhupa (hata do).
let lobbyCardVisible = false; // mod ke liye default: chhupa hua
function restoreLobbyCard() {
    const card = document.getElementById('lobby-card');
    if (!card) return;
    if (currentGoogleEmail) {
        // Google login (koi bhi Gmail) — mod ko G toggle, dusri ko hamesha chhupa.
        card.style.display = isModEmail() ? (lobbyCardVisible ? '' : 'none') : 'none';
    } else {
        // Guest — panel normal dikhe.
        card.style.display = '';
    }
}
function toggleLobbyCard() {
    if (!isModEmail()) return; // sirf mod Gmail — dusri Gmail/guest par G kuch nahi karega
    if (skinEditorOpen || inventoryOpen || storeOpen) return; // skin/inventory/store khula ho to G na chale
    lobbyCardVisible = !lobbyCardVisible;
    restoreLobbyCard();
}
function currentLobbyName() {
    const guestInput = document.getElementById('player-name-input');
    if (guestInput) return guestInput.value;
    const googleInput = document.getElementById('google-custom-name');
    if (googleInput) return googleInput.value;
    return (typeof playerName !== 'undefined') ? playerName : '';
}
function applyLobbyModVisibility() {
    const show = isModEmail();
    const wrap = document.getElementById('lobby-mod-sections');
    if (wrap) wrap.style.display = show ? 'block' : 'none';
    // SKINS har player ke liye hai (sirf mod ke liye nahi) — button
    // hamesha dikhega, aur editor naam badalne par band nahi hoga.
    const skinsBtn = document.querySelector('.lobby-menu-btn[data-menu="SKINS"]');
    if (skinsBtn) skinsBtn.style.display = '';
    // 🖱️ Drag & drop / sizing sirf mod ke liye — baaki players
    // ko drag handles, resize grips aur COPY/RESET buttons na dikhen.
    document.querySelectorAll('.lobby-drag-handle').forEach((el) => { el.style.display = show ? '' : 'none'; });
    document.querySelectorAll('.lobby-resize-handle').forEach((el) => { el.style.display = show ? '' : 'none'; });
    const copyBtn = document.getElementById('lobby-copy-layout-btn');
    if (copyBtn) copyBtn.style.display = show ? '' : 'none';
    const resetBtn = document.getElementById('lobby-reset-layout-btn');
    if (resetBtn) resetBtn.style.display = show ? '' : 'none';
    // 🌍 W.W.P — sirf admin ko dikhe.
    const wwpPanel = document.getElementById('wwp-panel');
    if (wwpPanel) wwpPanel.style.display = show ? '' : 'none';
    // Drag/resize grips chhupne par title ka cursor bhi normal karo.
    const titleEl = document.getElementById('lobby-title');
    if (titleEl) titleEl.style.cursor = show ? 'move' : 'default';
    const cardHeader = document.getElementById('lobby-header');
    if (cardHeader) cardHeader.style.cursor = show ? 'move' : 'default';
    // PFP ke saath player ka naam bhi update karo — naam type karte hi live.
    try { updatePFPName(); } catch (e) {}
    // Character ke upar wala naam bhi live update karo.
    try { updateLobbyCharName(); } catch (e) {}
    // 🏠 ANYMAYS panel: guest ko dikhe, mod ko G se, dusri Gmail ko kabhi nahi.
    try { restoreLobbyCard(); } catch (e) {}
}
// Lobby layout (drag/resize) sirf mod Gmail par — baaki players
// ke liye lobby fixed rehti hai (baked default layout dikhta hai).
function isLobbyLayoutMod() {
    try { return isModEmail(); } catch (e) { return false; }
}

// 🖼️ PFP (profile picture) — LOG OUT ke upar wala square. Har player
// (sirf mod nahi) apni PFP laga sakta hai. Click karo to image
// chuno; 128x128 par chhoti karke per-account save hoti hai.
let currentPFP = '';
function pfpKey() { return (typeof skinAccountId !== 'undefined' && skinAccountId) ? ('pointerx_pfp_' + skinAccountId) : 'pointerx_pfp_v1'; }
function applyPFP(dataUrl) {
    currentPFP = dataUrl || '';
    if (typeof document === 'undefined') return;
    const box = document.getElementById('lobby-pfp-box');
    if (!box) return;
    const img = box.querySelector('.lobby-pfp-img');
    const ph = box.querySelector('.lobby-pfp-placeholder');
    if (img) { img.src = dataUrl || ''; img.style.display = dataUrl ? 'block' : 'none'; }
    if (ph) ph.style.display = dataUrl ? 'none' : 'flex';
}
function loadPFP() {
    try {
        const raw = localStorage.getItem(pfpKey());
        applyPFP(raw || '');
    } catch (e) { applyPFP(''); }
}
// PFP ke saath player ka naam — jo naam wo khud likhe (guest input ya
// Google custom name). Naam type karte hi live badalta hai.
function updatePFPName() {
    if (typeof document === 'undefined') return;
    const el = document.querySelector('#lobby-pfp-box .lobby-pfp-name');
    if (!el) return;
    let n = '';
    try { n = currentLobbyName(); } catch (e) { n = (typeof playerName !== 'undefined') ? playerName : ''; }
    el.textContent = n || '';
}
// ✏️ Lobby character ke upar naam — pencil se naam badlo.
// Har player apna naam badal sakta hai: guest naam ya Google custom naam.
// Naam badalne se mod gate nahi badalta (gate sirf Gmail se hai).
function updateLobbyCharName() {
    if (typeof document === 'undefined') return;
    const el = document.getElementById('lobby-char-name-text');
    if (!el) return;
    let n = '';
    try { n = currentLobbyName(); } catch (e) { n = (typeof playerName !== 'undefined') ? playerName : ''; }
    el.textContent = n || 'Player';
}
function startLobbyCharNameEdit() {
    const wrap = document.getElementById('lobby-char-name');
    const textEl = document.getElementById('lobby-char-name-text');
    const pencil = document.getElementById('lobby-char-name-edit');
    if (!wrap || !textEl) return;
    // Pehle se edit ho raha ho to dobara na kholo.
    if (wrap.querySelector('.lobby-char-name-input')) return;
    // 💎 Name Change — Google account par pehli dafa FREE, phir Store se 14 💎.
    // Credit nahi hai to edit na kholo, Store kholo.
    if (isGoogleAccount() && !canChangeName()) {
        try { if (typeof lobbyToast === 'function') lobbyToast('Name change khatam! Store se 14 💎 me Name Change kharido, phir pencil se naam badlo.'); } catch (e) {}
        try { openStore(); } catch (e) {}
        return;
    }
    const cur = currentLobbyName() || '';
    const inp = document.createElement('input');
    inp.className = 'lobby-char-name-input';
    inp.type = 'text';
    inp.value = cur;
    inp.maxLength = 24;
    inp.style.cssText = 'width:120px;background:#111;color:#fff;border:1px solid #00ffcc;border-radius:6px;padding:3px 6px;font-size:14px;font-weight:bold;text-align:center;outline:none;';
    textEl.style.display = 'none';
    if (pencil) pencil.style.display = 'none';
    wrap.insertBefore(inp, textEl);
    inp.focus();
    try { inp.select(); } catch (e) {}
    let done = false;
    const finish = (saveIt) => {
        if (done) return; done = true;
        const v = saveIt ? (inp.value.trim() || cur || 'Player') : cur;
        if (saveIt && v !== cur) {
            // 💎 Naam tabhi badle jab credit ho (Google par). Credit nahi to
            // naam mat badlo — Store kholo. Guest par credit nahi lagta.
            if (isGoogleAccount() && !consumeNameChangeCredit()) {
                try { if (typeof lobbyToast === 'function') lobbyToast('Name change khatam! Store se 14 💎 me Name Change kharido.'); } catch (e) {}
                inp.remove();
                textEl.style.display = '';
                if (pencil) pencil.style.display = '';
                try { openStore(); } catch (e) {}
                return;
            }
            // Guest input ya Google custom name update karo + save karo.
            const guestInput = document.getElementById('player-name-input');
            const googleInput = document.getElementById('google-custom-name');
            if (guestInput) {
                guestInput.value = v;
                try { localStorage.setItem('pointerx_guest_name', v); } catch (e) {}
            } else if (googleInput) {
                googleInput.value = v;
                try { if (currentGoogleUid) localStorage.setItem('pointerx_user_' + currentGoogleUid, v); } catch (e) {}
            }
            // 🌍 W.W.P — naya naam server ko bhi bhejo (list me update ho).
            try { sendMyProfileToServer(); } catch (e) {}
            // Bache hue name changes batao (Google par).
            if (isGoogleAccount()) {
                const left = nameChangeCredits();
                try { if (typeof lobbyToast === 'function') lobbyToast(left > 0 ? `Naam badal gaya! ✅ (${left} name change bacha hai)` : 'Naam badal gaya! ✅ (Agli dafa Store se 14 💎 me Name Change kharido)'); } catch (e) {}
            }
        }
        inp.remove();
        textEl.style.display = '';
        if (pencil) pencil.style.display = '';
        try { updateLobbyCharName(); } catch (e) {}
        try { updatePFPName(); } catch (e) {}
        try { applyLobbyModVisibility(); } catch (e) {}
    };
    inp.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') finish(true);
        else if (e.key === 'Escape') finish(false);
    });
    inp.addEventListener('blur', () => finish(true));
    // Input par mousedown se label drag na ho (mod ke liye).
    inp.addEventListener('mousedown', (e) => { e.stopPropagation(); });
    inp.addEventListener('touchstart', (e) => { e.stopPropagation(); });
}
// 💎 NAME CHANGE — Google account par pehli dafa FREE (ek bar), uske baad
// Store se 14 diamonds me kharidna hota hai (1 khareed = 1 name change).
// Per-account save (skinAccountId) — har Google account ki apni FREE + tokens.
// Guest par credit system nahi hai (guest naam free badal sakta hai).
const NAME_CHANGE_PRICE_DIAMONDS = 14;
function nameChangeFreeKey() { return (typeof skinAccountId !== 'undefined' && skinAccountId) ? ('pointerx_namechange_free_' + skinAccountId) : 'pointerx_namechange_free_v1'; }
function nameChangeTokensKey() { return (typeof skinAccountId !== 'undefined' && skinAccountId) ? ('pointerx_namechange_tokens_' + skinAccountId) : 'pointerx_namechange_tokens_v1'; }
function isGoogleAccount() {
    try { return !!(typeof currentGoogleEmail !== 'undefined' && currentGoogleEmail); } catch (e) { return false; }
}
function nameChangeFreeUsed() {
    try { return localStorage.getItem(nameChangeFreeKey()) === '1'; } catch (e) { return false; }
}
function nameChangeTokens() {
    try { const n = parseInt(localStorage.getItem(nameChangeTokensKey()), 10); return (isNaN(n) || n < 0) ? 0 : n; } catch (e) { return 0; }
}
function nameChangeCredits() {
    if (!isGoogleAccount()) return 0; // guest par credit system nahi hai.
    return (nameChangeFreeUsed() ? 0 : 1) + nameChangeTokens();
}
function canChangeName() {
    if (!isGoogleAccount()) return true; // guest — hamesha badal sakta hai.
    return nameChangeCredits() > 0;
}
function consumeNameChangeCredit() {
    if (!isGoogleAccount()) return true; // guest — credit nahi lagta.
    try {
        if (!nameChangeFreeUsed()) { localStorage.setItem(nameChangeFreeKey(), '1'); return true; }
        const t = nameChangeTokens();
        if (t > 0) { localStorage.setItem(nameChangeTokensKey(), String(t - 1)); return true; }
    } catch (e) {}
    return false;
}
function buyNameChange() {
    if (!isGoogleAccount()) {
        try { if (typeof lobbyToast === 'function') lobbyToast('Name Change sirf Google account ke liye hai. Google se login karo.'); } catch (e) {}
        return false;
    }
    if (totalDiamonds < NAME_CHANGE_PRICE_DIAMONDS) {
        try { if (typeof lobbyToast === 'function') lobbyToast(`Diamonds kam hain! Name Change ke liye 14 💎 chahiye (tumhare paas ${totalDiamonds}). Level up karke diamonds kamao.`); } catch (e) {}
        return false;
    }
    totalDiamonds -= NAME_CHANGE_PRICE_DIAMONDS;
    try { localStorage.setItem(nameChangeTokensKey(), String(nameChangeTokens() + 1)); } catch (e) {}
    saveXP();
    updateLevelDisplay();
    try { if (typeof lobbyToast === 'function') lobbyToast(`✅ Name Change kharid liya! (14 💎) Ab pencil ✏️ se naam badlo.`); } catch (e) {}
    try { renderStorePanel(); } catch (e) {}
    return true;
}
function handlePFPUpload(file) {
    if (!file || !file.type || file.type.indexOf('image/') !== 0) {
        try { if (typeof lobbyToast === 'function') lobbyToast('Sirf image file chuno (JPG/PNG).'); } catch (e) {}
        return;
    }
    try {
        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                try {
                    // Square crop (cover) + 128x128 — taake localStorage me jagah kam le.
                    const size = 128;
                    const canvas = document.createElement('canvas');
                    canvas.width = size; canvas.height = size;
                    const ctx = canvas.getContext('2d');
                    const side = Math.min(img.width, img.height);
                    const sx = (img.width - side) / 2;
                    const sy = (img.height - side) / 2;
                    ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                    try { localStorage.setItem(pfpKey(), dataUrl); } catch (e) {}
                    applyPFP(dataUrl);
                    // 🌍 W.W.P — nayi PFP server ko bhi bhejo (list update ho).
                    try { sendMyProfileToServer(); } catch (e) {}
                    try { if (typeof lobbyToast === 'function') lobbyToast('PFP lag gayi!'); } catch (e) {}
                } catch (e) {}
            };
            img.onerror = () => { try { if (typeof lobbyToast === 'function') lobbyToast('Image samajh nahi aayi — dobara try karo.'); } catch (e) {} };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    } catch (e) {}
}

// 🖱️ LOBBY DRAG & DROP — Jimmy khud lobby ke panels ki position set kar sake.
// Har panel ki position localStorage me save hoti hai (pointerx_lobby_pos_<key>).
// COPY LAYOUT se positions copy karke bhej do — main unhe file me default kar dunga.
const LOBBY_PANEL_KEYS = ['card', 'title'];
// Left panel ka container hata diya — uski har cheez ab alag item hai.
// Right panel bhi hata diya — HOW TO PLAY + PRIVATE/JOIN/PLAY SETTINGS
// ab alag items hain (neeche LOBBY_ITEM_KEYS me).
const LOBBY_ITEM_KEYS = ['playercard','menu_HUB','menu_STORE','menu_SERVERS','menu_QUESTS','menu_FRIENDS','menu_INVENTORY','menu_EDITOR','menu_SKINS','copy_layout','reset_layout','logout','pfp','play','private','join','play_settings','charname','wwp'];
// 🎨 Jimmy ki layout — COPY LAYOUT se bheji hui positions, file me default.
// Agar browser me koi saved position nahi hai, to ye use hoti hai.
// (Jimmy ne 2026-11-09 ko bheji — 4th layout: card (459,264, 564 wide),
// COPY LAYOUT + LOG OUT top-right, PFP (282,11, 66 tall), baaki waisa hi.)
const DEFAULT_LOBBY_LAYOUT = {
    card: { left: 459, top: 264, width: 564 },
    title: { left: 646, top: 20 },
    item_playercard: { left: 5, top: 12, height: 146, width: 369 },
    item_menu_HUB: { left: 14, top: 232, height: 46, width: 221 },
    item_menu_STORE: { left: 12, top: 286, height: 42, width: 225 },
    item_menu_SERVERS: { left: 12, top: 332, height: 35, width: 170 },
    item_menu_QUESTS: { left: 14, top: 371, height: 35, width: 170 },
    item_menu_FRIENDS: { left: 15, top: 412, height: 35, width: 170 },
    item_menu_INVENTORY: { left: 17, top: 452, height: 35, width: 170 },
    item_menu_EDITOR: { left: 18, top: 488, height: 120, width: 120 },
    item_menu_SKINS: { left: 16, top: 492, height: 35, width: 170 },
    item_copy_layout: { left: 1486, top: 40, height: 53, width: 114 },
    item_reset_layout: { left: 22, top: 564, height: 28, width: 170 },
    item_logout: { left: 1490, top: 2, height: 35, width: 110 },
    item_pfp: { left: 282, top: 11, height: 66, width: 80 },
    item_play: { left: 12, top: 603, height: 70, width: 269 },
    item_private: { left: 96, top: 678, height: 43, width: 80 },
    item_join: { left: 14, top: 677, height: 44, width: 80 },
    item_play_settings: { left: 175, top: 677, height: 46, width: 102 },
    item_charname: { left: 700, top: 150, height: 36, width: 200 },
    item_wwp: { left: 1000, top: 120, height: 400, width: 340 }
};
function getLobbyPanelPos(key) {
    try {
        const raw = localStorage.getItem('pointerx_lobby_pos_' + key);
        if (raw) {
            const p = JSON.parse(raw);
            if (typeof p.left === 'number' && typeof p.top === 'number') return p;
        }
    } catch (e) {}
    // Koi saved position nahi — baked default use karo (agar hai).
    const d = DEFAULT_LOBBY_LAYOUT[key];
    if (d && typeof d.left === 'number' && typeof d.top === 'number') return { ...d };
    return null;
}
function saveLobbyPanelPos(key, left, top, height, width, fontSize) {
    try {
        const obj = { left: Math.round(left), top: Math.round(top) };
        if (height) obj.height = Math.round(height);
        if (width) obj.width = Math.round(width);
        if (fontSize) obj.fontSize = Math.round(fontSize);
        localStorage.setItem('pointerx_lobby_pos_' + key, JSON.stringify(obj));
    } catch (e) {}
}
function clearLobbyPanelPos() {
    LOBBY_PANEL_KEYS.forEach((k) => { try { localStorage.removeItem('pointerx_lobby_pos_' + k); } catch (e) {} });
    LOBBY_ITEM_KEYS.forEach((k) => { try { localStorage.removeItem('pointerx_lobby_pos_item_' + k); } catch (e) {} });
    try { localStorage.removeItem('pointerx_lobby_pos_left'); } catch (e) {}
}
function lobbyLayoutJSON() {
    const out = {};
    LOBBY_PANEL_KEYS.forEach((k) => { const p = getLobbyPanelPos(k); if (p) out[k] = p; });
    LOBBY_ITEM_KEYS.forEach((k) => { const p = getLobbyPanelPos('item_' + k); if (p) out['item_' + k] = p; });
    return JSON.stringify(out);
}
function makeLobbyPanelDraggable(el, key, handle) {
    if (!el || !handle) return;
    let dragging = false, offX = 0, offY = 0;
    const start = (cx, cy) => {
        // Sirf mod drag kar sakta hai.
        if (!isLobbyLayoutMod()) return;
        dragging = true;
        const r = el.getBoundingClientRect();
        offX = cx - r.left;
        offY = cy - r.top;
        // Floating panel banao: bottom/right hatao, height fix karo.
        el.style.bottom = 'auto';
        el.style.right = 'auto';
        if (key !== 'title') el.style.height = r.height + 'px';
        el.style.transform = 'none';
    };
    const move = (cx, cy) => {
        if (!dragging) return;
        let nx = cx - offX, ny = cy - offY;
        nx = Math.max(0, Math.min(window.innerWidth - el.offsetWidth, nx));
        ny = Math.max(0, Math.min(window.innerHeight - 30, ny));
        el.style.left = nx + 'px';
        el.style.top = ny + 'px';
    };
    const end = () => {
        if (!dragging) return;
        dragging = false;
        saveLobbyPanelPos(key, el.offsetLeft, el.offsetTop, key === 'title' ? 0 : el.offsetHeight, key === 'title' ? 0 : el.offsetWidth, 0);
    };
    handle.addEventListener('mousedown', (e) => { start(e.clientX, e.clientY); e.preventDefault(); });
    window.addEventListener('mousemove', (e) => move(e.clientX, e.clientY));
    window.addEventListener('mouseup', end);
    handle.addEventListener('touchstart', (e) => { const t = e.touches[0]; start(t.clientX, t.clientY); }, { passive: true });
    window.addEventListener('touchmove', (e) => { const t = e.touches[0]; move(t.clientX, t.clientY); }, { passive: true });
    window.addEventListener('touchend', end);
}

// 📏 LOBBY RESIZE — ↘ grip se panel ki size badlo (width/height).
// Title ki size = font size. Size bhi position ke saath save hoti hai.
function makeLobbyPanelResizable(el, key, handle) {
    if (!el || !handle) return;
    const isTitle = key === 'title';
    let resizing = false, startX = 0, startY = 0, startW = 0, startH = 0, startFS = 42;
    const start = (cx, cy) => {
        // Sirf mod resize kar sakta hai.
        if (!isLobbyLayoutMod()) return;
        resizing = true;
        startX = cx; startY = cy;
        const r = el.getBoundingClientRect();
        startW = r.width; startH = r.height;
        try { startFS = parseFloat(window.getComputedStyle(el).fontSize) || 42; } catch (e) { startFS = 42; }
        // Floating banao taake width/height set ho sake.
        el.style.bottom = 'auto';
        el.style.right = 'auto';
        if (!isTitle) { el.style.height = r.height + 'px'; el.style.width = r.width + 'px'; }
        el.style.transform = 'none';
    };
    const move = (cx, cy) => {
        if (!resizing) return;
        const dx = cx - startX, dy = cy - startY;
        if (isTitle) {
            const fs = Math.max(20, Math.min(90, startFS + (dx + dy) * 0.15));
            el.style.fontSize = fs + 'px';
        } else {
            // ⚠️ FIX: min height 120px thi — menu button sirf ~40px ka hota
            // hai, is liye resize shuru karte hi wo ek dum 120px ho jata
            // tha (bada), aur chhota kabhi nahi hota tha. Ab min size
            // chhoti hai taake halka sa drag = halka sa change.
            const w = Math.max(80, Math.min(window.innerWidth - el.offsetLeft - 10, startW + dx));
            const h = Math.max(24, Math.min(window.innerHeight - el.offsetTop - 10, startH + dy));
            el.style.width = w + 'px';
            el.style.height = h + 'px';
        }
    };
    const end = () => {
        if (!resizing) return;
        resizing = false;
        if (isTitle) {
            saveLobbyPanelPos('title', el.offsetLeft, el.offsetTop, 0, 0, parseFloat(el.style.fontSize) || 42);
        } else {
            saveLobbyPanelPos(key, el.offsetLeft, el.offsetTop, el.offsetHeight, el.offsetWidth, 0);
        }
    };
    handle.addEventListener('mousedown', (e) => { start(e.clientX, e.clientY); e.preventDefault(); e.stopPropagation(); });
    window.addEventListener('mousemove', (e) => move(e.clientX, e.clientY));
    window.addEventListener('mouseup', end);
    handle.addEventListener('touchstart', (e) => { const t = e.touches[0]; start(t.clientX, t.clientY); e.stopPropagation(); }, { passive: true });
    window.addEventListener('touchmove', (e) => { const t = e.touches[0]; move(t.clientX, t.clientY); }, { passive: true });
    window.addEventListener('touchend', end);
}

// 🖱️ LOBBY ITEM DRAG — left panel ki har cheez (player card, har menu
// button, COPY/RESET/LOG OUT) alag se draggable hai. Button par click
// aur drag ka farq: 6px se kam move = click (button kaam karega),
// zyada move = drag (button ka click dab jayega).
function makeLobbyItemDraggable(el, key) {
    if (!el) return;
    let down = false, dragging = false, startX = 0, startY = 0, offX = 0, offY = 0;
    // Click suppressor — drag ke baad wala click roko. Ye listener
    // button ke click handler se PEHLE register hota hai, is liye
    // stopImmediatePropagation se menu action nahi chalta.
    el.addEventListener('click', (e) => {
        if (el._lobbyDragged) {
            el._lobbyDragged = false;
            e.preventDefault();
            e.stopImmediatePropagation();
        }
    });
    const isResizeGrip = (e) => e.target && e.target.closest && e.target.closest('.lobby-resize-handle');
    // 🌍 W.W.P search bar jaisi input par click karo to drag NAHI —
    // input me type karna hai (focus + typing chahiye).
    const isFormField = (e) => e.target && e.target.closest && e.target.closest('input, textarea, select');
    el.addEventListener('mousedown', (e) => {
        if (isResizeGrip(e)) return;
        if (isFormField(e)) return;
        // Sirf mod drag kar sakta hai.
        if (!isLobbyLayoutMod()) return;
        down = true; dragging = false;
        startX = e.clientX; startY = e.clientY;
        const r = el.getBoundingClientRect();
        offX = e.clientX - r.left; offY = e.clientY - r.top;
        e.preventDefault();
    });
    window.addEventListener('mousemove', (e) => {
        if (!down) return;
        if (!dragging && Math.hypot(e.clientX - startX, e.clientY - startY) > 6) dragging = true;
        if (!dragging) return;
        let nx = e.clientX - offX, ny = e.clientY - offY;
        nx = Math.max(0, Math.min(window.innerWidth - el.offsetWidth, nx));
        ny = Math.max(0, Math.min(window.innerHeight - 30, ny));
        el.style.left = nx + 'px';
        el.style.top = ny + 'px';
    });
    window.addEventListener('mouseup', () => {
        if (!down) return;
        down = false;
        if (dragging) {
            dragging = false;
            el._lobbyDragged = true;
            saveLobbyPanelPos('item_' + key, el.offsetLeft, el.offsetTop, el.offsetHeight, el.offsetWidth, 0);
        }
    });
    el.addEventListener('touchstart', (e) => {
        if (isResizeGrip(e)) return;
        if (isFormField(e)) return;
        // Sirf mod drag kar sakta hai.
        if (!isLobbyLayoutMod()) return;
        const t = e.touches[0];
        down = true; dragging = false;
        startX = t.clientX; startY = t.clientY;
        const r = el.getBoundingClientRect();
        offX = t.clientX - r.left; offY = t.clientY - r.top;
    }, { passive: true });
    window.addEventListener('touchmove', (e) => {
        if (!down) return;
        const t = e.touches[0];
        if (!dragging && Math.hypot(t.clientX - startX, t.clientY - startY) > 6) dragging = true;
        if (!dragging) return;
        let nx = t.clientX - offX, ny = t.clientY - offY;
        nx = Math.max(0, Math.min(window.innerWidth - el.offsetWidth, nx));
        ny = Math.max(0, Math.min(window.innerHeight - 30, ny));
        el.style.left = nx + 'px';
        el.style.top = ny + 'px';
    }, { passive: true });
    window.addEventListener('touchend', () => {
        if (!down) return;
        down = false;
        if (dragging) {
            dragging = false;
            el._lobbyDragged = true;
            saveLobbyPanelPos('item_' + key, el.offsetLeft, el.offsetTop, el.offsetHeight, el.offsetWidth, 0);
        }
    });
}

// Left items ki default layout — jin items ki koi saved position nahi,
// unhe pehle jaisi column me stack karo (16px se shuru, 8px gap).
// Saved position wale items apni jagah par lagte hain.
function layoutLobbyLeftItems() {
    let y = 16;
    const gap = 8;
    document.querySelectorAll('[data-lobby-item]').forEach((el) => {
        const key = el.dataset.lobbyItem;
        if (!key) return;
        const saved = getLobbyPanelPos('item_' + key);
        if (saved) {
            el.style.left = saved.left + 'px';
            el.style.top = saved.top + 'px';
            if (saved.width) el.style.width = saved.width + 'px';
            if (saved.height) el.style.height = saved.height + 'px';
            if (saved.fontSize) el.style.fontSize = saved.fontSize + 'px';
        } else {
            el.style.left = '16px';
            el.style.top = y + 'px';
            y += (el.offsetHeight || 40) + gap;
        }
    });
}

function buildLobbyHTML(opts) {
    // Lobby khulte hi XP fresh load karo (account ke hisaab se).
    try { loadXP(); } catch (e) {}
    const name = opts.defaultName || 'ANYMAYS';
    const emailLine = opts.email ? `<div style="font-size:12px;color:#aaa;margin-bottom:10px;">Logged in as: ${opts.email}</div>` : '';
    const googleTop = opts.mode === 'guest'
        ? `<button id="google-login-btn" style="width:100%;padding:10px;font-size:14px;font-weight:bold;background:#4285F4;color:white;border:none;border-radius:6px;cursor:pointer;margin-bottom:10px;">Continue with Google</button>`
        : `<button id="prompt-logout-btn" style="width:100%;padding:8px;font-size:12px;background:#ff3333;color:white;border:none;border-radius:6px;cursor:pointer;margin-top:8px;">LOG OUT</button>`;
    const nameInput = opts.mode === 'guest'
        ? `<input type="text" id="player-name-input" placeholder="Enter your name..." value="${name}" style="width:100%;box-sizing:border-box;padding:10px;font-size:14px;text-align:center;background:#111;color:white;border:1px solid #444;border-radius:6px;outline:none;">`
        : `<input type="text" id="google-custom-name" value="${name}" style="width:100%;box-sizing:border-box;padding:10px;font-size:14px;text-align:center;background:#111;color:white;border:1px solid #444;border-radius:6px;outline:none;">`;
    // PLAY button panel se bahar — alag lobby item (drag + resize).
    // Position saved/default se (layoutLobbyLeftItems bhi apply karta hai).
    const playPos = getLobbyPanelPos('item_play');
    const playStyle = playPos
        ? `left:${playPos.left}px;top:${playPos.top}px;width:${playPos.width || 200}px;height:${playPos.height || 56}px;`
        : 'left:700px;top:700px;width:200px;height:56px;';
    const playBtn = opts.mode === 'guest'
        ? `<button id="join-btn" class="lobby-item" data-lobby-item="play" style="position:absolute;${playStyle}padding:14px;font-size:24px;font-weight:900;background:#ffc400;color:#111;border:none;border-radius:8px;cursor:move;box-shadow:0 4px 0 #b88600;z-index:3;user-select:none;">PLAY<span class="lobby-resize-handle" data-panel="play" style="position:absolute;right:4px;bottom:2px;font-size:11px;color:rgba(0,0,0,0.5);cursor:nwse-resize;">↘</span></button>`
        : `<button id="start-google-game" class="lobby-item" data-lobby-item="play" style="position:absolute;${playStyle}padding:14px;font-size:24px;font-weight:900;background:#ffc400;color:#111;border:none;border-radius:8px;cursor:move;box-shadow:0 4px 0 #b88600;z-index:3;user-select:none;">PLAY<span class="lobby-resize-handle" data-panel="play" style="position:absolute;right:4px;bottom:2px;font-size:11px;color:rgba(0,0,0,0.5);cursor:nwse-resize;">↘</span></button>`;
    
    const lvlInfo = levelFromXP(totalXP);
    const lvlPct = Math.min(100, Math.round((lvlInfo.xpIntoLevel / lvlInfo.xpNeeded) * 100));
    // 🖱️ Drag & drop: saved positions (agar Jimmy ne panels move kiye hon).
    const titlePos = getLobbyPanelPos('title');
    const cardPos = getLobbyPanelPos('card');
    // Screenshot jaisa level panel: dark blue card, level badge (dark box
    // me number + sunehra "lvl"), XP numbers, sunehra progress bar,
    // neeche coins + diamonds (do panels).
    const levelHtml = `
        <div style="margin-top:10px;background:#1e2a5e;border-radius:8px;padding:10px;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="background:#0a1230;border-radius:6px;padding:3px 8px;font-weight:900;"><span id="lobby-level-num" style="color:#fff;font-size:18px;">${lvlInfo.level}</span> <span style="color:#ffc400;font-size:15px;font-style:italic;">lvl</span></span>
            <span id="lobby-xp-text" style="color:#fff;font-size:14px;font-weight:bold;">${lvlInfo.xpIntoLevel} / ${lvlInfo.xpNeeded}</span>
          </div>
          <div style="margin-top:8px;height:14px;background:#0a1230;border-radius:7px;overflow:hidden;">
            <div id="lobby-xp-fill" style="height:100%;width:${lvlPct}%;background:linear-gradient(90deg,#ffc400,#ff9900);border-radius:7px;transition:width 0.5s;"></div>
          </div>
        </div>
        <div style="display:flex;gap:8px;margin-top:8px;">
          <div style="flex:1;background:#1e2a5e;border-radius:8px;padding:8px;display:flex;align-items:center;justify-content:center;gap:6px;">
            <span style="width:22px;height:22px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#ffe066,#f5a623 60%,#b88600);border:2px solid #ffcc00;display:inline-flex;align-items:center;justify-content:center;color:#7a5200;font-size:13px;font-weight:900;">$</span>
            <span id="lobby-coins-num" style="color:#fff;font-size:16px;font-weight:bold;">${totalCoins}</span>
          </div>
          <div style="flex:1;background:#1e2a5e;border-radius:8px;padding:8px;display:flex;align-items:center;justify-content:center;gap:6px;">
            <span style="width:18px;height:18px;background:linear-gradient(135deg,#7dd3fc,#0284c7);transform:rotate(45deg);border-radius:3px;display:inline-block;box-shadow:0 0 6px rgba(56,189,248,0.7);"></span>
            <span id="lobby-diamonds-num" style="color:#fff;font-size:16px;font-weight:bold;">${totalDiamonds}</span>
          </div>
        </div>
        <div style="font-size:10px;color:#888;margin-top:6px;">🏆 <span id="lobby-total-kills">${totalLifetimeKills}</span> KILLS • Kill = 100 XP • Death = 10 XP</div>`;
    // Left panel ka container hata diya — har menu button ab alag item hai
    // (drag + resize, click-vs-drag threshold se button bhi kaam karta hai).
    const menu = ['HUB','STORE','SERVERS','QUESTS','FRIENDS','INVENTORY','EDITOR','SKINS'].map((m) => {
        const active = m === 'HUB' ? 'background:#2a6cff;color:white;' : 'background:transparent;color:#cdd6ff;';
        return `<button class="lobby-menu-btn lobby-item" data-lobby-item="menu_${m}" data-menu="${m}" style="position:absolute;left:16px;top:16px;width:170px;padding:10px;text-align:left;font-weight:bold;border:none;border-radius:6px;cursor:move;${active}">${m}<span class="lobby-resize-handle" data-panel="menu_${m}" style="position:absolute;right:4px;bottom:2px;font-size:11px;color:rgba(255,255,255,0.5);cursor:nwse-resize;">↘</span></button>`;
    }).join('');

    const logoutItem = opts.mode === 'google'
        ? `<button id="prompt-logout-btn" class="lobby-item" data-lobby-item="logout" style="position:absolute;left:16px;top:16px;width:170px;padding:8px;font-size:12px;background:#ff3333;color:white;border:none;border-radius:6px;cursor:move;">LOG OUT<span class="lobby-resize-handle" data-panel="logout" style="position:absolute;right:4px;bottom:2px;font-size:11px;color:rgba(255,255,255,0.6);cursor:nwse-resize;">↘</span></button>`
        : '';

    const partLabels = { 
        head: 'HEAD', 
        body: 'BODY', 
        leftArm: 'LEFT ARM', 
        rightArm: 'RIGHT ARM', 
        leftLeg: 'LEFT LEG', 
        rightLeg: 'RIGHT LEG',
        leftElbow: 'LEFT ELBOW (BEND)',
        rightElbow: 'RIGHT ELBOW (BEND)',
        leftKnee: 'LEFT KNEE (BEND)',
        rightKnee: 'RIGHT KNEE (BEND)'
    };
    
    let advancedPartsHtml = '';
    partNames.forEach(pKey => {
        const cfg = lobbyCustomParts[pKey];
        const isElbow = pKey === 'leftElbow' || pKey === 'rightElbow' || pKey === 'leftKnee' || pKey === 'rightKnee'; // joint: elbow ya knee, sirf RotX/RotY
        
        advancedPartsHtml += `
            <div style="background:rgba(255,255,255,0.04); padding:8px; border-radius:6px; margin-top:8px;">
                <div style="font-size:12px; font-weight:bold; color:${isElbow ? '#ffaa00' : '#00ffcc'}; margin-bottom:4px;">${partLabels[pKey]}</div>
                
                ${!isElbow ? `
                <div style="font-size:10px; color:#aaa;">Scale: <span id="val-${pKey}-scale">${cfg.scale.toFixed(2)}</span></div>
                <input type="range" class="custom-part-input" data-part="${pKey}" data-prop="scale" min="0.3" max="2.0" step="0.05" value="${cfg.scale}" style="width:100%; accent-color:#00ffcc;">
                ` : ''}

                <div style="display:flex; gap:4px; margin-top:4px;">
                    <div style="flex:1;">
                        <div style="font-size:9px; color:#aaa;">Rot X: <span id="val-${pKey}-rotX">${cfg.rotX.toFixed(2)}</span></div>
                        <input type="range" class="custom-part-input" data-part="${pKey}" data-prop="rotX" min="-3.14" max="3.14" step="0.1" value="${cfg.rotX}" style="width:100%; accent-color:#ffaa00;">
                    </div>
                    <div style="flex:1;">
                        <div style="font-size:9px; color:#aaa;">Rot Y: <span id="val-${pKey}-rotY">${cfg.rotY.toFixed(2)}</span></div>
                        <input type="range" class="custom-part-input" data-part="${pKey}" data-prop="rotY" min="-3.14" max="3.14" step="0.1" value="${cfg.rotY}" style="width:100%; accent-color:#ffaa00;">
                    </div>
                </div>

                ${!isElbow ? `
                <div style="display:flex; gap:4px; margin-top:4px;">
                    <div style="flex:1;">
                        <div style="font-size:9px; color:#aaa;">Rot Z: <span id="val-${pKey}-rotZ">${cfg.rotZ.toFixed(2)}</span></div>
                        <input type="range" class="custom-part-input" data-part="${pKey}" data-prop="rotZ" min="-3.14" max="3.14" step="0.1" value="${cfg.rotZ}" style="width:100%; accent-color:#ffaa00;">
                    </div>
                    <div style="flex:1;">
                        <div style="font-size:9px; color:#aaa;">Pos Y: <span id="val-${pKey}-posY">${cfg.posY.toFixed(2)}</span></div>
                        <input type="range" class="custom-part-input" data-part="${pKey}" data-prop="posY" min="-1.0" max="1.0" step="0.05" value="${cfg.posY}" style="width:100%; accent-color:#ff3333;">
                    </div>
                </div>
                ` : ''}
            </div>
        `;
    });

    return `
    <div id="lobby-title" style="position:absolute;${titlePos ? `left:${titlePos.left}px;top:${titlePos.top}px;` : 'top:18px;left:50%;transform:translateX(-50%);'}font-size:${titlePos && titlePos.fontSize ? titlePos.fontSize : 42}px;font-weight:900;letter-spacing:2px;color:white;text-shadow:3px 3px #000;z-index:2;cursor:move;user-select:none;" title="Drag karo — title ki position badlo">POINTER <span style="color:#00ffcc;">X</span><span class="lobby-resize-handle" data-panel="title" style="font-size:16px;color:#888;cursor:nwse-resize;margin-left:8px;vertical-align:middle;" title="Is se pakad ke title ki size badlo">↘</span></div>
    
    <!-- Left panel HATA diya — uski har cheez ab alag item hai (drag + resize). -->
    <div class="lobby-item" data-lobby-item="playercard" id="lobby-player-card" style="position:absolute;left:16px;top:16px;width:170px;background:rgba(255,255,255,0.08);padding:12px;border-radius:8px;cursor:move;user-select:none;z-index:3;">
        <div style="font-size:18px;font-weight:bold;word-break:break-word;">${name}</div>
        <div style="font-size:12px;color:#00ffcc;">POINTER X PLAYER</div>
        <div style="font-size:12px;color:#ffd700;font-weight:bold;">ID: <span id="lobby-my-id">#-----</span></div>
        ${emailLine}
        ${levelHtml}
        <span class="lobby-resize-handle" data-panel="playercard" style="position:absolute;right:4px;bottom:2px;font-size:11px;color:rgba(255,255,255,0.5);cursor:nwse-resize;">↘</span>
    </div>
    ${menu}
    <button id="lobby-copy-layout-btn" class="lobby-item" data-lobby-item="copy_layout" style="position:absolute;left:16px;top:16px;width:170px;padding:8px;font-weight:bold;background:#2a6cff;color:white;border:none;border-radius:6px;cursor:move;font-size:11px;">📋 COPY LAYOUT<span class="lobby-resize-handle" data-panel="copy_layout" style="position:absolute;right:4px;bottom:2px;font-size:11px;color:rgba(255,255,255,0.6);cursor:nwse-resize;">↘</span></button>
    <button id="lobby-reset-layout-btn" class="lobby-item" data-lobby-item="reset_layout" style="position:absolute;left:16px;top:16px;width:170px;padding:8px;font-weight:bold;background:#334155;color:white;border:none;border-radius:6px;cursor:move;font-size:11px;">↺ RESET LAYOUT<span class="lobby-resize-handle" data-panel="reset_layout" style="position:absolute;right:4px;bottom:2px;font-size:11px;color:rgba(255,255,255,0.6);cursor:nwse-resize;">↘</span></button>
    ${logoutItem}
    <!-- 🖼️ PFP square — LOG OUT ke upar. Har player apni PFP laga sakta hai (FPS-only nahi). -->
    <div class="lobby-item" data-lobby-item="pfp" id="lobby-pfp-box" style="position:absolute;left:1430px;top:0px;width:80px;height:80px;background:rgba(255,255,255,0.08);border:2px dashed rgba(255,255,255,0.35);border-radius:10px;cursor:pointer;user-select:none;z-index:3;overflow:hidden;" title="PFP lagao — click karo">
        <img class="lobby-pfp-img" style="display:none;width:100%;height:100%;object-fit:cover;border-radius:8px;" alt="">
        <div class="lobby-pfp-placeholder" style="display:flex;width:100%;height:100%;flex-direction:column;align-items:center;justify-content:center;color:rgba(255,255,255,0.6);">
            <span style="font-size:26px;line-height:1;">+</span>
            <span style="font-size:10px;font-weight:bold;">PFP</span>
        </div>
        <!-- Player ka naam — PFP ke neeche caption (LOG OUT upar se bilkul neeche hai, is liye naam box ke andar hi hai). -->
        <div class="lobby-pfp-name" style="position:absolute;left:0;right:0;bottom:0;background:rgba(0,0,0,0.65);color:#fff;font-size:10px;font-weight:bold;text-align:center;padding:2px 3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;z-index:1;"></div>
        <span class="lobby-resize-handle" data-panel="pfp" style="position:absolute;right:3px;bottom:1px;font-size:11px;color:rgba(255,255,255,0.6);cursor:nwse-resize;z-index:2;">↘</span>
        <input type="file" id="lobby-pfp-input" accept="image/*" style="display:none;">
    </div>

    <!-- ✏️ Lobby character ke upar naam + pencil — har player apna naam yahan se badal sakta hai (guest ya Google custom name). Drag sirf mod kar sakta hai. -->
    <div class="lobby-item" data-lobby-item="charname" id="lobby-char-name" style="position:absolute;left:700px;top:150px;width:200px;height:36px;display:flex;align-items:center;justify-content:center;gap:6px;background:rgba(0,0,0,0.55);border:1px solid rgba(255,255,255,0.25);border-radius:18px;cursor:move;user-select:none;z-index:3;padding:2px 10px;box-sizing:border-box;">
        <span id="lobby-char-name-text" style="color:#fff;font-size:15px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:150px;">${name}</span>
        <button id="lobby-char-name-edit" title="Naam badlo" style="background:transparent;border:none;color:#00ffcc;font-size:15px;cursor:pointer;padding:0;line-height:1;flex-shrink:0;">✏️</button>
    </div>

    <!-- 🌍 W.W.P — WORLD WIDE PLAYERS (sirf admin: technowarrior924@gmail.com).
         Drag + resize (lobby item), search bar, online players ki list
         (naam, #ID, profile, PFP). Mobile par chhupa (neeche mobile CSS). -->
    <div class="lobby-item" data-lobby-item="wwp" id="wwp-panel" style="position:absolute;left:1000px;top:120px;width:340px;height:400px;background:rgba(0,0,0,0.88);border:2px solid #00d2ff;border-radius:12px;cursor:move;user-select:none;z-index:3;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;">
        <div style="padding:10px 12px;background:#062a33;border-bottom:1px solid #00d2ff;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;gap:6px;">
            <div style="font-size:15px;font-weight:900;color:#00d2ff;letter-spacing:1px;">🌍 W.W.P</div>
            <div style="font-size:10px;color:#aaa;">WORLD WIDE PLAYERS</div>
            <span id="wwp-status" style="font-size:10px;font-weight:bold;color:#00ff88;">● LIVE</span>
            <span id="wwp-count" style="background:#00d2ff;color:#062a33;font-size:12px;font-weight:900;border-radius:10px;padding:2px 8px;">0</span>
        </div>
        <div style="padding:8px 10px 0;flex-shrink:0;">
            <input id="wwp-search" type="text" placeholder="🔍 Search name ya #ID..." style="width:100%;box-sizing:border-box;padding:8px;font-size:13px;background:#111;color:white;border:1px solid #444;border-radius:6px;outline:none;">
        </div>
        <div id="wwp-list" style="flex:1;overflow-y:auto;padding:0 10px 10px;"></div>
        <span class="lobby-resize-handle" data-panel="wwp" style="position:absolute;right:4px;bottom:2px;font-size:11px;color:rgba(255,255,255,0.6);cursor:nwse-resize;">↘</span>
    </div>

    <!-- ▶️ PLAY button — panel se bahar, alag lobby item (drag + resize). -->
    ${playBtn}

    <!-- 🌟 Draggable & Minimizable Anyways Panel -->
    <div id="lobby-card" style="position:absolute; ${cardPos ? `left:${cardPos.left}px;top:${cardPos.top}px;${cardPos.height ? `height:${cardPos.height}px;` : ''}` : 'left: calc(50% - 170px); bottom: 20px;'} background:rgba(0,0,0,0.92); border: 2px solid #222; border-radius:12px; width:${cardPos && cardPos.width ? cardPos.width : 340}px; max-width:92vw; z-index:10; box-shadow: 0 10px 25px rgba(0,0,0,0.7);">
        
        <div id="lobby-header" style="padding: 12px 16px; background: #111; border-top-left-radius: 10px; border-top-right-radius: 10px; display: flex; justify-content: space-between; align-items: center; cursor: move; user-select: none;">
            <div style="font-size: 18px; font-weight: 900; color: #fff; letter-spacing: 1px;">ANYMAYS</div>
            <div style="display:flex;gap:6px;align-items:center;">
              <button class="lobby-resize-handle" data-panel="card" style="background: #222; color: #fff; border: 1px solid #444; width: 28px; height: 28px; border-radius: 4px; font-weight: bold; cursor: nwse-resize; display: flex; align-items: center; justify-content: center;" title="Size badlo">↘</button>
              <button id="lobby-minimize-btn" style="background: #222; color: #fff; border: 1px solid #444; width: 28px; height: 28px; border-radius: 4px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center;" title="Minimize / Expand">-</button>
            </div>
        </div>

        <div id="lobby-body" style="padding: 16px; max-height: calc(85vh - 55px); overflow-y: auto; text-align: center;">
            <div style="font-size: 18px; font-weight: bold; margin-bottom: 8px; color: #00ffcc;">${name}</div>
            ${opts.mode === 'guest' ? googleTop : ''}
            ${nameInput}

            <div id="lobby-mod-sections">
            <hr style="border:0; border-top:1px solid #333; margin:12px 0;">
            <div style="font-size:12px; font-weight:bold; color:#00d2ff; text-align:left; margin-bottom:4px;">GUN EDITOR (LEFT / RIGHT / UP / DOWN / SIZE)</div>
            <div style="text-align:left;">
              <div style="font-size:11px;color:#00ffcc; margin-bottom: 2px;">GUN LEFT / RIGHT: <span id="lobby-gun-x-value">${lobbyGunX.toFixed(2)}</span> &nbsp;<span style="color:#aaa;">(- = left, + = right)</span></div>
              <input type="range" id="lobby-gun-x-slider" min="-0.6" max="0.6" step="0.05" value="${lobbyGunX}" style="width:100%;accent-color:#00ffcc;cursor:pointer;">
            </div>
            <div style="margin-top:8px; text-align:left;">
              <div style="font-size:11px;color:#00ffcc; margin-bottom: 2px;">GUN UP / DOWN: <span id="lobby-gun-y-value">${lobbyGunY.toFixed(2)}</span> &nbsp;<span style="color:#aaa;">(kam = neeche, zyada = upar)</span></div>
              <input type="range" id="lobby-gun-y-slider" min="0.6" max="1.35" step="0.05" value="${lobbyGunY}" style="width:100%;accent-color:#00ffcc;cursor:pointer;">
            </div>
            <div style="margin-top:8px; text-align:left;">
              <div style="font-size:11px;color:#00ffcc; margin-bottom: 2px;">GUN Z POS: <span id="lobby-gun-z-value">${lobbyGunZ.toFixed(2)}</span> &nbsp;<span style="color:#aaa;">(kam = peeche, zyada = camera ki taraf)</span></div>
              <input type="range" id="lobby-gun-z-slider" min="0.3" max="1" step="0.05" value="${lobbyGunZ}" style="width:100%;accent-color:#00ffcc;cursor:pointer;">
            </div>
            <div style="margin-top:8px; text-align:left;">
              <div style="font-size:11px;color:#00ffcc; margin-bottom: 2px;">GUN SIZE: <span id="lobby-gun-size-value">${lobbyGunScale.toFixed(2)}</span></div>
              <input type="range" id="lobby-gun-size-slider" min="0.5" max="2" step="0.05" value="${lobbyGunScale}" style="width:100%;accent-color:#00ffcc;cursor:pointer;">
            </div>
            <button id="lobby-gun-reset" style="width:100%;padding:8px;margin-top:8px;font-weight:bold;background:#334155;color:white;border:none;border-radius:6px;cursor:pointer;font-size:12px;">RESET GUN</button>

            <hr style="border:0; border-top:1px solid #333; margin:12px 0;">
            <div style="font-size:12px; font-weight:bold; color:#00ffcc; text-align:left; margin-bottom:4px;">CROUCH POSE (BETHNE KI POSITION)</div>
            <div style="font-size:11px;color:#aaa;text-align:left;margin-bottom:6px;">SIT PREVIEW dabao, phir sliders se bethne ki pose banao. Yehi pose game me Shift par lagegi.</div>
            <button id="lobby-crouch-preview-btn" style="width:100%;padding:8px;font-weight:bold;background:#2a6cff;color:white;border:none;border-radius:6px;cursor:pointer;font-size:12px;">${lobbyCrouchPreview ? 'STAND UP (PREVIEW BAND KARO)' : 'SIT PREVIEW (BETH KE DEKHO)'}</button>
            <div style="margin-top:8px; text-align:left;">
              <div style="font-size:11px;color:#00ffcc; margin-bottom: 2px;">HIP BEND: <span id="lobby-crouch-hip-value">${crouchHip.toFixed(2)}</span> &nbsp;<span style="color:#aaa;">(thigh aage)</span></div>
              <input type="range" id="lobby-crouch-hip-slider" min="0" max="1.2" step="0.05" value="${crouchHip}" style="width:100%;accent-color:#00ffcc;cursor:pointer;">
            </div>
            <div style="margin-top:8px; text-align:left;">
              <div style="font-size:11px;color:#00ffcc; margin-bottom: 2px;">KNEE BEND: <span id="lobby-crouch-knee-value">${crouchKnee.toFixed(2)}</span> &nbsp;<span style="color:#aaa;">(knee se neeche)</span></div>
              <input type="range" id="lobby-crouch-knee-slider" min="0" max="2" step="0.05" value="${crouchKnee}" style="width:100%;accent-color:#00ffcc;cursor:pointer;">
            </div>
            <div style="margin-top:8px; text-align:left;">
              <div style="font-size:11px;color:#00ffcc; margin-bottom: 2px;">BODY DROP: <span id="lobby-crouch-drop-value">${crouchDrop.toFixed(2)}</span> &nbsp;<span style="color:#aaa;">(neeche kitna — zyada = pair andar, kam = pair hawa me)</span></div>
              <input type="range" id="lobby-crouch-drop-slider" min="0" max="0.3" step="0.01" value="${crouchDrop}" style="width:100%;accent-color:#00ffcc;cursor:pointer;">
            </div>
            <button id="lobby-crouch-reset" style="width:100%;padding:8px;margin-top:8px;font-weight:bold;background:#334155;color:white;border:none;border-radius:6px;cursor:pointer;font-size:12px;">RESET CROUCH POSE</button>
            
            <div style="margin-top:10px; text-align: left;">
              <div style="font-size:11px;color:#00ffcc; margin-bottom: 2px;">PLAYER SIZE: <span id="lobby-size-value">${lobbyPlayerSize.toFixed(2)}</span></div>
              <input type="range" id="lobby-size-slider" min="0.3" max="1" step="0.05" value="${lobbyPlayerSize}" style="width:100%;accent-color:#00ffcc;cursor:pointer;">
            </div>

            <div style="margin-top:8px; text-align: left;">
              <div style="font-size:11px;color:#00ffcc; margin-bottom: 2px;">PLAYER ROTATE: <span id="lobby-rotate-value">${lobbyPlayerRotate.toFixed(0)}°</span></div>
              <input type="range" id="lobby-rotate-slider" min="-180" max="180" step="5" value="${lobbyPlayerRotate}" style="width:100%;accent-color:#00ffcc;cursor:pointer;">
              <div style="display:flex;gap:6px;margin-top:6px;">
                <button id="lobby-rotate-left" style="flex:1;padding:6px;font-weight:bold;background:#2a6cff;color:white;border:none;border-radius:4px;cursor:pointer;font-size:11px;">◀ LEFT</button>
                <button id="lobby-rotate-right" style="flex:1;padding:6px;font-weight:bold;background:#2a6cff;color:white;border:none;border-radius:4px;cursor:pointer;font-size:11px;">RIGHT ▶</button>
                <button id="lobby-flip" style="flex:1;padding:6px;font-weight:bold;background:#ffaa00;color:#111;border:none;border-radius:4px;cursor:pointer;font-size:11px;">FLIP</button>
              </div>
            </div>


            <hr style="border:0; border-top:1px solid #333; margin:12px 0;">
            <div style="font-size:12px; font-weight:bold; color:#ffc400; text-align:left; margin-bottom:4px;">ADVANCED PARTS EDITOR (SCALE / ROT / POS & ELBOWS)</div>
            ${advancedPartsHtml}
            </div>

            <div id="lobby-toast" style="min-height:16px;font-size:12px;color:#00ffcc;margin-top:6px;"></div>
        </div>
    </div>

    <!-- Right panel HATA diya — HOW TO PLAY instructions bhi hata di. -->
    <!-- PRIVATE / JOIN / PLAY SETTINGS ab alag items hain (drag + resize, -->
    <!-- mod ke liye). Inka click abhi bhi kuch nahi karta (pehle -->
    <!-- bhi nahi karta tha) — sirf drag/resize + position save hoti hai. -->
    <button id="lobby-private-btn" class="lobby-item" data-lobby-item="private" style="position:absolute;left:1375px;top:212px;width:209px;padding:12px;font-weight:bold;background:#2a6cff;color:white;border:none;border-radius:6px;cursor:move;z-index:3;">PRIVATE<span class="lobby-resize-handle" data-panel="private" style="position:absolute;right:4px;bottom:2px;font-size:11px;color:rgba(255,255,255,0.6);cursor:nwse-resize;">↘</span></button>
    <button id="lobby-join-btn" class="lobby-item" data-lobby-item="join" style="position:absolute;left:1375px;top:270px;width:209px;padding:12px;font-weight:bold;background:#2a6cff;color:white;border:none;border-radius:6px;cursor:move;z-index:3;">JOIN<span class="lobby-resize-handle" data-panel="join" style="position:absolute;right:4px;bottom:2px;font-size:11px;color:rgba(255,255,255,0.6);cursor:nwse-resize;">↘</span></button>
    <button id="lobby-play-settings-btn" class="lobby-item" data-lobby-item="play_settings" style="position:absolute;left:1375px;top:328px;width:209px;padding:12px;font-weight:bold;background:#334155;color:white;border:none;border-radius:6px;cursor:move;z-index:3;">PLAY SETTINGS<span class="lobby-resize-handle" data-panel="play_settings" style="position:absolute;right:4px;bottom:2px;font-size:11px;color:rgba(255,255,255,0.6);cursor:nwse-resize;">↘</span></button>`;
}

function setupLobbyMenus() {
    const card = document.getElementById('lobby-card');
    const header = document.getElementById('lobby-header');
    const minimizeBtn = document.getElementById('lobby-minimize-btn');
    const bodyContent = document.getElementById('lobby-body');

    // 🔒 Mod sections sirf mod Gmail par dikhen — naam type karte
    // hi live update, aur lobby khulte hi pehli baar bhi apply ho.
    // 🏠 Lobby har baar khule to mod ka panel chhupa start ho (G se khole).
    lobbyCardVisible = false;
    const _guestNameInput = document.getElementById('player-name-input');
    if (_guestNameInput) _guestNameInput.addEventListener('input', applyLobbyModVisibility);
    const _googleNameInput = document.getElementById('google-custom-name');
    if (_googleNameInput) _googleNameInput.addEventListener('input', applyLobbyModVisibility);
    applyLobbyModVisibility();

    // Left items ki layout — pehle ye chalao (click suppressor menu
    // handler se pehle register hona chahiye, warna drag ke baad bhi
    // button ka click chal jayega).
    try { layoutLobbyLeftItems(); } catch (e) {}
    try {
        document.querySelectorAll('[data-lobby-item]').forEach((el) => {
            const k = el.dataset.lobbyItem;
            if (!k) return;
            makeLobbyItemDraggable(el, k);
            const rz = el.querySelector('.lobby-resize-handle');
            if (rz) makeLobbyPanelResizable(el, 'item_' + k, rz);
        });
    } catch (e) {}

    // 🖼️ PFP upload — box par click (drag nahi) to file picker khule.
    // Ye har player ke liye hai (FPS-only nahi). Click suppressor pehle
    // register ho chuka hai, is liye drag ke baad picker nahi khulta.
    try {
        const pfpBox = document.getElementById('lobby-pfp-box');
        const pfpInput = document.getElementById('lobby-pfp-input');
        if (pfpBox && pfpInput) {
            pfpBox.addEventListener('click', () => { pfpInput.click(); });
            pfpInput.addEventListener('change', () => {
                if (pfpInput.files && pfpInput.files[0]) handlePFPUpload(pfpInput.files[0]);
                pfpInput.value = '';
            });
        }
        loadPFP();
    } catch (e) {}

    // 🌍 W.W.P — search bar + list render + apni profile server ko bhejo.
    // Lobby me socket connected rakho (EXIT ke baad disconnect hota hai) —
    // taake online players ki list live rahe. (Pehli load par socket waise
    // bhi connected hota hai — ye sirf EXIT ke baad wali state wapas lata hai.)
    try {
        const wwpSearch = document.getElementById('wwp-search');
        if (wwpSearch) wwpSearch.addEventListener('input', () => { wwpSearchText = wwpSearch.value || ''; renderWWPList(); });
        updateMyIdDisplay();
        // 🌍 W.W.P — pehle local backup se list dikhao (server list aate hi merge hogi).
        refreshWWPFromBackup();
        renderWWPList();
        // 👑 Ban/Disable ka status reload par bhi yaad rakho — PLAY pehle se disabled rahe.
        try { loadAccountStatus(); } catch (e) {}
        try { updatePlayButtonsDisabled(); } catch (e) {}
        // 👑 Ban/Disable ho to socket dobara connect mat karo (server phir kick karega).
        if (socket && typeof socket.connect === 'function' && socket.disconnected && !amBanned && !amDisabled) socket.connect();
        if (!amBanned && !amDisabled) sendMyProfileToServer();
        // 👑 Ban/Disable ka banner lobby me dikhao (agar pehle se set hai).
        try { if (amBanned || amDisabled) showAccountStatusBanner(); } catch (e) {}
    } catch (e) {}

    // ✏️ Character ke upar naam — pencil se naam badlo (har player ke liye).
    // Click handler label par hai (pencil par nahi) taake drag ke baad
    // wala click suppressor (jo pehle register hua) ise rok sake.
    try {
        const charNameEl = document.getElementById('lobby-char-name');
        if (charNameEl) {
            charNameEl.addEventListener('click', (e) => {
                if (e.target && e.target.closest && e.target.closest('#lobby-char-name-edit')) {
                    startLobbyCharNameEdit();
                }
            });
        }
        updateLobbyCharName();
    } catch (e) {}

    document.querySelectorAll('.lobby-menu-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const m = btn.dataset.menu;
            if (m === 'SKINS') { openSkinEditor(); return; }
            if (m === 'INVENTORY') { openInventory(); return; }
            if (m === 'STORE') { openStore(); return; }
            if (skinEditorOpen) closeSkinEditor();
            if (inventoryOpen) closeInventory();
            if (storeOpen) closeStore();
            lobbyToast(m + ' — Coming soon');
        });
    });

    // 🖱️ Lobby drag & drop — title aur ANYMAYS card draggable hain.
    // (Right panel hata diya — uske buttons ab alag items hain, unki
    // drag/resize layoutLobbyLeftItems wale loop me hoti hai.)
    // Position save hoti hai.
    try {
        const titleEl = document.getElementById('lobby-title');
        makeLobbyPanelDraggable(titleEl, 'title', titleEl);
    } catch (e) {}

    // 📏 Lobby resize — ↘ grip se title aur card ki size badlo.
    try {
        const titleEl = document.getElementById('lobby-title');
        const titleResize = titleEl ? titleEl.querySelector('.lobby-resize-handle') : null;
        makeLobbyPanelResizable(titleEl, 'title', titleResize);
        const cardEl = document.getElementById('lobby-card');
        const cardResize = cardEl ? cardEl.querySelector('.lobby-resize-handle') : null;
        makeLobbyPanelResizable(cardEl, 'card', cardResize);
    } catch (e) {}

    // 📋 COPY LAYOUT — saari panel positions copy karo, mujhe bhej do,
    // main unhe file me default kar dunga.
    const copyLayoutBtn = document.getElementById('lobby-copy-layout-btn');
    if (copyLayoutBtn) copyLayoutBtn.addEventListener('click', () => {
        const json = lobbyLayoutJSON();
        const done = () => lobbyToast('Layout copy ho gaya — mujhe bhej do, main default kar dunga!');
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(json).then(done, () => { lobbyToast('Layout: ' + json); });
            } else { lobbyToast('Layout: ' + json); }
        } catch (e) { lobbyToast('Layout: ' + json); }
    });
    const resetLayoutBtn = document.getElementById('lobby-reset-layout-btn');
    if (resetLayoutBtn) resetLayoutBtn.addEventListener('click', () => {
        clearLobbyPanelPos();
        location.reload();
    });

    if (card && header) {
        let isDragging = false;
        let startX = 0, startY = 0;

        header.addEventListener('mousedown', (e) => {
            // Card drag bhi sirf mod ke liye.
            if (!isLobbyLayoutMod()) return;
            isDragging = true;
            startX = e.clientX - card.offsetLeft;
            startY = e.clientY - card.offsetTop;
            e.preventDefault();
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            let newX = e.clientX - startX;
            let newY = e.clientY - startY;

            newX = Math.max(0, Math.min(window.innerWidth - card.offsetWidth, newX));
            newY = Math.max(0, Math.min(window.innerHeight - header.offsetHeight, newY));

            card.style.left = newX + 'px';
            card.style.top = newY + 'px';
            card.style.bottom = 'auto';
            card.style.transform = 'none';
        });

        window.addEventListener('mouseup', () => {
            if (!isDragging) return;
            isDragging = false;
            // ANYMAYS card ki position bhi save karo.
            try { saveLobbyPanelPos('card', card.offsetLeft, card.offsetTop, 0, card.offsetWidth, 0); } catch (e) {}
        });

        header.addEventListener('touchstart', (e) => {
            // Card drag bhi sirf mod ke liye.
            if (!isLobbyLayoutMod()) return;
            isDragging = true;
            const touch = e.touches[0];
            startX = touch.clientX - card.offsetLeft;
            startY = touch.clientY - card.offsetTop;
        }, { passive: true });

        window.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            const touch = e.touches[0];
            let newX = touch.clientX - startX;
            let newY = touch.clientY - startY;
            card.style.left = newX + 'px';
            card.style.top = newY + 'px';
            card.style.bottom = 'auto';
            card.style.transform = 'none';
        }, { passive: true });

        window.addEventListener('touchend', () => {
            if (!isDragging) return;
            isDragging = false;
            try { saveLobbyPanelPos('card', card.offsetLeft, card.offsetTop, 0, card.offsetWidth, 0); } catch (e) {}
        });
    }

    if (minimizeBtn && bodyContent) {
        let isMinimized = false;
        minimizeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            isMinimized = !isMinimized;
            if (isMinimized) {
                bodyContent.style.display = 'none';
                minimizeBtn.textContent = '+';
            } else {
                bodyContent.style.display = 'block';
                minimizeBtn.textContent = '-';
            }
        });
    }

    document.querySelectorAll('.custom-part-input').forEach(input => {
        input.addEventListener('input', (e) => {
            const partName = e.target.dataset.part;
            const prop = e.target.dataset.prop;
            updatePartProperty(partName, prop, e.target.value);
        });
    });

    const slider = document.getElementById('lobby-size-slider');
    if (slider) {
        slider.value = String(lobbyPlayerSize);
        slider.addEventListener('input', () => { setLobbyPlayerSize(slider.value); });
    }
    const rotSlider = document.getElementById('lobby-rotate-slider');
    if (rotSlider) {
        rotSlider.value = String(lobbyPlayerRotate);
        rotSlider.addEventListener('input', () => { setLobbyPlayerRotate(rotSlider.value); });
    }
    const rotLeft = document.getElementById('lobby-rotate-left');
    if (rotLeft) rotLeft.addEventListener('click', () => { setLobbyPlayerRotate(lobbyPlayerRotate - 15); });
    const rotRight = document.getElementById('lobby-rotate-right');
    if (rotRight) rotRight.addEventListener('click', () => { setLobbyPlayerRotate(lobbyPlayerRotate + 15); });
    const flipBtn = document.getElementById('lobby-flip');
    if (flipBtn) flipBtn.addEventListener('click', () => { setLobbyPlayerRotate(lobbyPlayerRotate === 180 ? 0 : 180); });
    const gunXSlider = document.getElementById('lobby-gun-x-slider');
    if (gunXSlider) {
        gunXSlider.value = String(lobbyGunX);
        gunXSlider.addEventListener('input', () => { setLobbyGunX(gunXSlider.value); });
    }
    const gunYSlider = document.getElementById('lobby-gun-y-slider');
    if (gunYSlider) {
        gunYSlider.value = String(lobbyGunY);
        gunYSlider.addEventListener('input', () => { setLobbyGunY(gunYSlider.value); });
    }
    const gunZSlider = document.getElementById('lobby-gun-z-slider');
    if (gunZSlider) {
        gunZSlider.value = String(lobbyGunZ);
        gunZSlider.addEventListener('input', () => { setLobbyGunZ(gunZSlider.value); });
    }
    const gunSizeSlider = document.getElementById('lobby-gun-size-slider');
    if (gunSizeSlider) {
        gunSizeSlider.value = String(lobbyGunScale);
        gunSizeSlider.addEventListener('input', () => { setLobbyGunScale(gunSizeSlider.value); });
    }
    const gunResetBtn = document.getElementById('lobby-gun-reset');
    if (gunResetBtn) gunResetBtn.addEventListener('click', () => { resetLobbyGun(); });
    const crouchHipSlider = document.getElementById('lobby-crouch-hip-slider');
    if (crouchHipSlider) {
        crouchHipSlider.value = String(crouchHip);
        crouchHipSlider.addEventListener('input', () => { setCrouchHip(crouchHipSlider.value); });
    }
    const crouchKneeSlider = document.getElementById('lobby-crouch-knee-slider');
    if (crouchKneeSlider) {
        crouchKneeSlider.value = String(crouchKnee);
        crouchKneeSlider.addEventListener('input', () => { setCrouchKnee(crouchKneeSlider.value); });
    }
    const crouchDropSlider = document.getElementById('lobby-crouch-drop-slider');
    if (crouchDropSlider) {
        crouchDropSlider.value = String(crouchDrop);
        crouchDropSlider.addEventListener('input', () => { setCrouchDrop(crouchDropSlider.value); });
    }
    const crouchResetBtn = document.getElementById('lobby-crouch-reset');
    if (crouchResetBtn) crouchResetBtn.addEventListener('click', () => { resetCrouchPose(); });
    const crouchPreviewBtn = document.getElementById('lobby-crouch-preview-btn');
    if (crouchPreviewBtn) {
        crouchPreviewBtn.textContent = lobbyCrouchPreview ? 'STAND UP (PREVIEW BAND KARO)' : 'SIT PREVIEW (BETH KE DEKHO)';
        crouchPreviewBtn.addEventListener('click', () => { setLobbyCrouchPreview(!lobbyCrouchPreview); });
    }
    applyLobbyCrouchPose();
}

// 🎨 SKIN EDITOR UI — T-pose preview + direct paint + palette + publish/code.
const SKIN_PALETTE = ['#c68642', '#e8b88a', '#8d5524', '#3b2416', '#6b4423', '#00a8b5', '#1a9e8f', '#3b449b', '#222222', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ff8800', '#8800ff', '#00ffcc', '#ffc400', '#888888', '#4a2511'];

function restoreLobbyPose() {
    if (!lobbySteveParts) return;
    try {
        applyCustomTransformsToParts(lobbySteveParts);
        // Haath CUSTOM pose me rehte hain (gun-hold overwrite hata diya —
        // warna skin editor band karte hi haath phir galat ho jate).
        if (lobbyGunGroup) lobbyGunGroup.visible = true;
        applyLobbyGunTransform();
        applyLobbyCrouchPose();
    } catch (e) {}
}

function setSkinTPose(on) {
    if (!lobbySteveParts || !lobbyCharacter) return;
    try {
        if (on) {
            // T-pose: dono haath seedhe side par, taange seedhi, gun chhupa do.
            lobbySteveParts.leftArmGroup.rotation.set(0, 0, -Math.PI / 2);
            lobbySteveParts.rightArmGroup.rotation.set(0, 0, Math.PI / 2);
            lobbySteveParts.leftElbowMesh.rotation.set(0, 0, 0);
            lobbySteveParts.rightElbowMesh.rotation.set(0, 0, 0);
            lobbySteveParts.leftLeg.rotation.set(0, 0, -0.08);
            lobbySteveParts.rightLeg.rotation.set(0, 0, 0.08);
            lobbySteveParts.leftKneeMesh.rotation.set(0, 0, 0);
            lobbySteveParts.rightKneeMesh.rotation.set(0, 0, 0);
            lobbyCharacter.position.y = 0;
            if (lobbyGunGroup) lobbyGunGroup.visible = false;
        } else {
            restoreLobbyPose();
        }
    } catch (e) {}
}

function updateSkinColorPreview() {
    const pv = document.getElementById('skin-color-preview');
    if (pv) {
        pv.style.background = skinEraser ? '#111' : skinEditorColor;
        pv.textContent = skinEraser ? 'E' : '';
        pv.style.color = '#fff'; pv.style.textAlign = 'center'; pv.style.fontSize = '12px'; pv.style.lineHeight = '22px';
    }
    const eb = document.getElementById('skin-eraser-btn');
    if (eb) eb.style.background = skinEraser ? '#ff8800' : '#334155';
}

// 2D grid hata diya — sirf 3D character par paint hota hai. Ye sirf batata hai
// ke aakhri dafa kis part/face par paint hua (panel me "Last painted" line).
function updateSkinPartLabel() {
    const nameEl = document.getElementById('skin-part-name');
    if (!nameEl || !draftSkin) return;
    const def = SKIN_PARTS[skinGridPart()];
    if (def) nameEl.textContent = def.label + '  (' + def.w + ' x ' + def.h + ')';
}

function skinPaintPixel(part, x, y) {
    if (!draftSkin) return false;
    const def = SKIN_PARTS[part];
    if (!def || x < 0 || x >= def.w || y < 0 || y >= def.h) return false;
    const idx = y * def.w + x;
    const col = skinEraser ? defaultSkin()[part][idx] : skinEditorColor;
    if (draftSkin[part][idx] === col) return false;
    draftSkin[part][idx] = col;
    return true;
}
function skinSaveDraft() {
    if (!draftSkin) return;
    try { localStorage.setItem(skinDraftKey(), encodeSkinCode(draftSkin)); } catch (err) {}
}
// 🖱️ Direct paint — 3D character par click/drag se pixel rang do.
// Raycast se pata chalta hai kis mesh, kis face aur kis UV par click hua,
// phir UV se grid ka pixel nikalta hai (face ke crop ke hisaab se).
let skinRaycaster = null;
let skinPainting3D = false;
let skinDragStartX = 0, skinDragStartY = 0, skinDragLastX = 0, skinDragMoved = false;
function skinEditorMeshes() {
    if (!lobbySteveParts) return [];
    return [lobbySteveParts.head, lobbySteveParts.body, lobbySteveParts.leftArmUpper, lobbySteveParts.leftArmLower, lobbySteveParts.rightArmUpper, lobbySteveParts.rightArmLower, lobbySteveParts.leftThigh, lobbySteveParts.leftShin, lobbySteveParts.rightThigh, lobbySteveParts.rightShin].filter(Boolean);
}
function skinCellFromHit(hit) {
    const mesh = hit.object;
    const map = mesh.userData._skinMap;
    if (!map || !hit.uv || hit.faceIndex === undefined || hit.faceIndex === null) return null;
    const face = Math.floor(hit.faceIndex / 2); // 0:+x 1:-x 2:+y 3:-y 4:+z 5:-z
    const u = hit.uv.x, v = hit.uv.y;
    let part = map.part, fw, fh, ox, oy;
    if (face === 4) { fw = map.w; fh = map.h; ox = 0; oy = 0; } // front (+z)
    else if (face === 5) { part = map.backPart || map.part; fw = map.w; fh = map.h; ox = 0; oy = 0; } // back (-z) — alag grid
    else if (face === 0 || face === 1) { part = map.sidePart || map.part; fw = map.cw; fh = map.h; ox = 0; oy = 0; } // side (+x/-x) — alag grid
    else if (face === 2) { fw = map.w; fh = map.ch; ox = 0; oy = 0; }
    else { fw = map.w; fh = map.ch; ox = 0; oy = map.h - map.ch; }
    let cx = Math.floor(u * fw);
    let cy = Math.floor((1 - v) * fh);
    cx = Math.max(0, Math.min(fw - 1, cx));
    cy = Math.max(0, Math.min(fh - 1, cy));
    return { part, x: ox + cx, y: map.y0 + oy + cy };
}
function skinRaycastPaint(e) {
    if (!skinEditorOpen || !draftSkin || !lobbySteveParts || !lobbyCamera) return false;
    if (!skinRaycaster) skinRaycaster = new THREE.Raycaster();
    const nx = (e.clientX / window.innerWidth) * 2 - 1;
    const ny = -(e.clientY / window.innerHeight) * 2 + 1;
    skinRaycaster.setFromCamera({ x: nx, y: ny }, lobbyCamera);
    const hits = skinRaycaster.intersectObjects(skinEditorMeshes(), false);
    if (!hits.length) return false;
    const cell = skinCellFromHit(hits[0]);
    if (!cell) return false;
    const changed = skinPaintPixel(cell.part, cell.x, cell.y);
    // Last painted part/face yaad rakho taake panel me dikh sake.
    skinEditorPart = skinFrontPart(cell.part);
    skinEditorSide = cell.part.endsWith('B') ? 'back' : (cell.part.endsWith('S') ? 'side' : 'front');
    updateSkinPartLabel();
    if (changed) {
        if (lobbySteveParts) applySkinToCharacter(lobbySteveParts, draftSkin, true);
        skinSaveDraft();
    }
    return true;
}
function skinOverlayMouseDown(e) {
    const overlay = document.getElementById('name-overlay');
    if (!skinEditorOpen || e.target !== overlay) return;
    skinPainting3D = true;
    skinDragStartX = e.clientX; skinDragStartY = e.clientY; skinDragLastX = e.clientX;
    skinDragMoved = false;
    // Abhi paint nahi karte — pehle pata chale click hai ya drag.
}
function skinOverlayMouseMove(e) {
    if (!skinPainting3D) return;
    if (e.buttons === 0) { skinPainting3D = false; skinDragMoved = false; return; }
    const totalDx = e.clientX - skinDragStartX;
    const totalDy = e.clientY - skinDragStartY;
    if (!skinDragMoved && Math.abs(totalDx) < 6 && Math.abs(totalDy) < 6) return; // abhi click jaisa hai
    skinDragMoved = true;
    const dx = e.clientX - skinDragLastX;
    skinDragLastX = e.clientX;
    // Drag right = player ka front right ki taraf ghume, peeche dikhne lage (0.5° per pixel).
    let v = lobbyPlayerRotate + dx * 0.5;
    v = ((v + 180) % 360 + 360) % 360 - 180; // wrap -180..180 taake poora ghoom sake
    setLobbyPlayerRotate(v);
}
function skinOverlayMouseUp(e) {
    // Click tha — paint usi jagah karo jahan click kiya tha (mousedown point), mouseup wali jagah nahi.
    if (skinPainting3D && !skinDragMoved) skinRaycastPaint({ clientX: skinDragStartX, clientY: skinDragStartY });
    skinPainting3D = false;
    skinDragMoved = false;
}

function publishSkin() {
    if (!draftSkin) return;
    currentSkin = cloneSkin(draftSkin);
    try { localStorage.setItem(skinCodeKey(), encodeSkinCode(currentSkin)); } catch (e) {}
    applySkinToAll();
    // Apni nayi skin server ko bhejo taake doosre players ko dikhe.
    try { sendMySkinToServer(); } catch (e) {}
    // Editor khula hai to preview par boxes wapas lagao (publish ke baad bhi).
    if (skinEditorOpen && lobbySteveParts) applySkinToCharacter(lobbySteveParts, draftSkin, true);
    const code = encodeSkinCode(currentSkin);
    const wrap = document.getElementById('skin-code-wrap');
    const ta = document.getElementById('skin-code-text');
    if (wrap) wrap.style.display = 'block';
    if (ta) ta.value = code;
    const st = document.getElementById('skin-status');
    if (st) st.textContent = 'Published! Skin player par lag gayi. Code neeche hai — mujhe bhejo.';
}

function resetSkinEditor() {
    draftSkin = defaultSkin();
    if (lobbySteveParts) applySkinToCharacter(lobbySteveParts, draftSkin, true);
    try { localStorage.setItem(skinDraftKey(), encodeSkinCode(draftSkin)); } catch (e) {}
    const st = document.getElementById('skin-status');
    if (st) st.textContent = 'Skin reset — wapas original look par hai.';
}

function removePublishedSkin() {
    currentSkin = null;
    // Apni account ki key + purani shared key dono hatao, taake dobara
    // login par purani skin wapas migrate na ho.
    try { localStorage.removeItem(skinCodeKey()); } catch (e) {}
    try { localStorage.removeItem(SKIN_CODE_KEY); } catch (e) {}
    draftSkin = defaultSkin();
    applySkinToAll();
    // Skin hat gayi — server ko bhi batao taake doosre players ko dikhe.
    try { sendMySkinToServer(); } catch (e) {}
    if (lobbySteveParts) applySkinToCharacter(lobbySteveParts, draftSkin, true);
    const st = document.getElementById('skin-status');
    if (st) st.textContent = 'Skin hata di — player wapas original look par hai.';
}

function copySkinCode() {
    const ta = document.getElementById('skin-code-text');
    if (!ta || !ta.value) return;
    const st = document.getElementById('skin-status');
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value).then(() => { if (st) st.textContent = 'Code copy ho gaya!'; }).catch(() => { ta.select(); document.execCommand('copy'); if (st) st.textContent = 'Code copy ho gaya!'; });
        else { ta.select(); document.execCommand('copy'); if (st) st.textContent = 'Code copy ho gaya!'; }
    } catch (e) {}
}

function loadSkinCode() {
    const inp = document.getElementById('skin-load-code');
    const code = inp ? inp.value.trim() : '';
    const skin = decodeSkinCode(code);
    const st = document.getElementById('skin-status');
    if (!skin) { if (st) st.textContent = 'Code ghalat hai — dobara check karo.'; return; }
    draftSkin = cloneSkin(skin);
    if (lobbySteveParts) applySkinToCharacter(lobbySteveParts, draftSkin, true);
    try { localStorage.setItem(skinDraftKey(), encodeSkinCode(draftSkin)); } catch (e) {}
    if (st) st.textContent = 'Skin load ho gayi! PUBLISH dabao taake lag jaye.';
}

// 📤 Texture upload — 64x64 Minecraft skin PNG se skin banao (Alex jaisi).
// Image ko 64x64 canvas par draw karke pixels parho, phir wahi layout
// (head/body/arms/legs, front/back/side, overlay, 12->10 resample) lagao.
// Slim (Alex, 3px arms) bhi auto-detect: Slim me baazu ke face ki boundary
// par do padosi pixel milte hain (front/back 3px), Classic me alag face.
// Slim ke front/back 3px hain (side 4px hi rehta hai), is liye unko 4-wide
// grid par stretch karke parha jata hai — warna Slim skin ki arm par tan
// patti dikhti hai.
let lastTextureWasSlim = false;
function skinFromTextureImage(img) {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, 64, 64);
    const data = ctx.getImageData(0, 0, 64, 64).data;
    function px(x, y) { const i = (y * 64 + x) * 4; return [data[i], data[i + 1], data[i + 2], data[i + 3]]; }
    function hex(rgb) { return '#' + ((1 << 24) + (rgb[0] << 16) + (rgb[1] << 8) + rgb[2]).toString(16).slice(1); }
    // Slim detect: baazu ke face ki boundary par do padosi pixel milte
    // hain ya nahi. Slim (3px arms) me front/back ke kinare par dono taraf
    // wahi face hota hai, Classic (4px) me alag face. Alex (Slim) 26/36,
    // HOOD/Jimmy (Classic) 4/36 aur 14/36 — threshold 18 se upar Slim.
    let _slimScore = 0;
    for (let y = 20; y < 32; y++) {
        if (px(43, y).join() === px(44, y).join()) _slimScore++;
        if (px(47, y).join() === px(48, y).join()) _slimScore++;
    }
    for (let y = 52; y < 64; y++) {
        if (px(35, y).join() === px(36, y).join()) _slimScore++;
    }
    const isSlim = _slimScore >= 18;
    lastTextureWasSlim = isSlim;
    // Base sirf base layer (overlay composite NAHI — outer layer alag se
    // aata hai). Transparent base pixel ko us part ki FRONT grid se bharo
    // (skin tone nahi, warna leg par tan patti lagti hai — HOOD wali).
    function extractBase(x0, y0, w, h, tw, th, fallback) {
        const out = [];
        for (let ty = 0; ty < th; ty++) {
            const sy = Math.floor(ty * h / th);
            for (let tx = 0; tx < tw; tx++) {
                const sx = Math.floor(tx * w / tw);
                const p = px(x0 + sx, y0 + sy);
                if (p[3] === 0) {
                    if (fallback) out.push(fallback[ty * tw + tx]);
                    else out.push('#c68642');
                } else out.push(hex(p));
            }
        }
        return out;
    }
    // Outer layer — transparent jahan overlay khaali hai (null = base dikhe).
    function extractOuter(x0, y0, w, h, tw, th) {
        const out = [];
        for (let ty = 0; ty < th; ty++) {
            const sy = Math.floor(ty * h / th);
            for (let tx = 0; tx < tw; tx++) {
                const sx = Math.floor(tx * w / tw);
                const p = px(x0 + sx, y0 + sy);
                out.push(p[3] > 0 ? hex(p) : null);
            }
        }
        return out;
    }
    // [x0, y0, w, h, tw, th] — Classic: arm front/back 4px. Slim: arm
    // front/back 3px (side 4px), back 1px pehle shuru hota hai.
    const REGIONS = isSlim ? {
        head: [8, 8, 8, 8, 8, 8],
        headB: [24, 8, 8, 8, 8, 8],
        headS: [0, 8, 8, 8, 8, 8],
        body: [20, 20, 8, 12, 8, 10],
        bodyB: [32, 20, 8, 12, 8, 10],
        bodyS: [16, 20, 4, 12, 4, 10],
        armR: [44, 20, 3, 12, 4, 10],
        armRB: [51, 20, 3, 12, 4, 10],
        armRS: [40, 20, 4, 12, 4, 10],
        armL: [36, 52, 3, 12, 4, 10],
        armLB: [43, 52, 3, 12, 4, 10],
        armLS: [32, 52, 4, 12, 4, 10],
        legR: [4, 20, 4, 12, 4, 10],
        legRB: [12, 20, 4, 12, 4, 10],
        legRS: [0, 20, 4, 12, 4, 10],
        legL: [20, 52, 4, 12, 4, 10],
        legLB: [28, 52, 4, 12, 4, 10],
        legLS: [16, 52, 4, 12, 4, 10],
    } : {
        head: [8, 8, 8, 8, 8, 8],
        headB: [24, 8, 8, 8, 8, 8],
        headS: [0, 8, 8, 8, 8, 8],
        body: [20, 20, 8, 12, 8, 10],
        bodyB: [32, 20, 8, 12, 8, 10],
        bodyS: [16, 20, 4, 12, 4, 10],
        armR: [44, 20, 4, 12, 4, 10],
        armRB: [52, 20, 4, 12, 4, 10],
        armRS: [40, 20, 4, 12, 4, 10],
        armL: [36, 52, 4, 12, 4, 10],
        armLB: [44, 52, 4, 12, 4, 10],
        armLS: [32, 52, 4, 12, 4, 10],
        legR: [4, 20, 4, 12, 4, 10],
        legRB: [12, 20, 4, 12, 4, 10],
        legRS: [0, 20, 4, 12, 4, 10],
        legL: [20, 52, 4, 12, 4, 10],
        legLB: [28, 52, 4, 12, 4, 10],
        legLS: [16, 52, 4, 12, 4, 10],
    };
    const OUTER_REGIONS = isSlim ? {
        hat: [40, 8, 8, 8, 8, 8],
        hatB: [56, 8, 8, 8, 8, 8],
        hatS: [32, 8, 8, 8, 8, 8],
        jacket: [20, 36, 8, 12, 8, 10],
        jacketB: [32, 36, 8, 12, 8, 10],
        jacketS: [16, 36, 4, 12, 4, 10],
        sleeveR: [44, 36, 3, 12, 4, 10],
        sleeveRB: [51, 36, 3, 12, 4, 10],
        sleeveRS: [40, 36, 4, 12, 4, 10],
        sleeveL: [52, 52, 3, 12, 4, 10],
        sleeveLB: [59, 52, 3, 12, 4, 10],
        sleeveLS: [48, 52, 4, 12, 4, 10],
        pantsR: [4, 36, 4, 12, 4, 10],
        pantsRB: [12, 36, 4, 12, 4, 10],
        pantsRS: [0, 36, 4, 12, 4, 10],
        pantsL: [4, 52, 4, 12, 4, 10],
        pantsLB: [12, 52, 4, 12, 4, 10],
        pantsLS: [0, 52, 4, 12, 4, 10],
    } : {
        hat: [40, 8, 8, 8, 8, 8],
        hatB: [56, 8, 8, 8, 8, 8],
        hatS: [32, 8, 8, 8, 8, 8],
        jacket: [20, 36, 8, 12, 8, 10],
        jacketB: [32, 36, 8, 12, 8, 10],
        jacketS: [16, 36, 4, 12, 4, 10],
        sleeveR: [44, 36, 4, 12, 4, 10],
        sleeveRB: [52, 36, 4, 12, 4, 10],
        sleeveRS: [40, 36, 4, 12, 4, 10],
        sleeveL: [52, 52, 4, 12, 4, 10],
        sleeveLB: [60, 52, 4, 12, 4, 10],
        sleeveLS: [48, 52, 4, 12, 4, 10],
        pantsR: [4, 36, 4, 12, 4, 10],
        pantsRB: [12, 36, 4, 12, 4, 10],
        pantsRS: [0, 36, 4, 12, 4, 10],
        pantsL: [4, 52, 4, 12, 4, 10],
        pantsLB: [12, 52, 4, 12, 4, 10],
        pantsLS: [0, 52, 4, 12, 4, 10],
    };
    const skin = {};
    const FRONT_OF = { headB: 'head', headS: 'head', bodyB: 'body', bodyS: 'body', armLB: 'armL', armLS: 'armL', armRB: 'armR', armRS: 'armR', legLB: 'legL', legLS: 'legL', legRB: 'legR', legRS: 'legR' };
    ['head', 'body', 'armL', 'armR', 'legL', 'legR'].forEach((part) => {
        const r = REGIONS[part];
        skin[part] = extractBase(r[0], r[1], r[2], r[3], r[4], r[5], null);
    });
    Object.keys(REGIONS).forEach((part) => {
        if (skin[part]) return;
        const r = REGIONS[part];
        skin[part] = extractBase(r[0], r[1], r[2], r[3], r[4], r[5], skin[FRONT_OF[part]]);
    });
    Object.keys(OUTER_REGIONS).forEach((part) => {
        const r = OUTER_REGIONS[part];
        skin[part] = extractOuter(r[0], r[1], r[2], r[3], r[4], r[5]);
    });
    // Safai: baalon ka orange sirf head par — arms/legs/body se hatao.
    const HAIR = { '#e58d3f': 1, '#f3a858': 1, '#eb983f': 1, '#de812e': 1 };
    Object.keys(skin).forEach((part) => {
        if (part === 'head' || part === 'headB' || part === 'headS') return;
        if (part in OUTER_REGIONS) return;
        const def = SKIN_PARTS[part];
        const w = def.w, h = def.h;
        const grid = skin[part];
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            const i = y * w + x;
            if (HAIR[grid[i]]) {
                let repl = x > 0 ? grid[i - 1] : grid[i + 1];
                if (HAIR[repl]) repl = y < 5 ? '#8cbe8a' : '#efdabf';
                grid[i] = repl;
            }
        }
    });
    const ok = [...SKIN_PART_ORDER, ...SKIN_OUTER_PART_ORDER].every((p) => skin[p] && skin[p].length === SKIN_PARTS[p].w * SKIN_PARTS[p].h);
    return ok ? skin : null;
}

function handleSkinTextureUpload(e) {
    const file = e.target && e.target.files && e.target.files[0];
    const st = document.getElementById('skin-status');
    if (!file) return;
    if (!file.type || file.type.indexOf('image/') !== 0) {
        if (st) st.textContent = 'Sirf image file (PNG) upload karo.';
        e.target.value = '';
        return;
    }
    const reader = new FileReader();
    reader.onload = function () {
        const img = new Image();
        img.onload = function () {
            try {
                const skin = skinFromTextureImage(img);
                if (!skin) { if (st) st.textContent = 'Texture samajh nahi aayi — 64x64 Minecraft skin PNG use karo.'; return; }
                draftSkin = skin;
                if (lobbySteveParts) applySkinToCharacter(lobbySteveParts, draftSkin, true);
                skinSaveDraft();
                updateSkinPartLabel();
                if (st) st.textContent = lastTextureWasSlim ? 'Texture load ho gayi! (Slim arms — 3px) PUBLISH dabao taake lag jaye.' : 'Texture load ho gayi! PUBLISH dabao taake lag jaye.';
            } catch (err) {
                if (st) st.textContent = 'Texture load nahi hui — dobara try karo.';
            }
        };
        img.onerror = function () { if (st) st.textContent = 'Image khul nahi rahi — PNG file use karo.'; };
        img.src = reader.result;
    };
    reader.onerror = function () { if (st) st.textContent = 'File parhi nahi gayi.'; };
    reader.readAsDataURL(file);
    e.target.value = '';
}

function openSkinEditor() {
    const overlay = document.getElementById('name-overlay');
    if (!overlay || document.getElementById('skin-editor-panel')) return;
    if (inventoryOpen) closeInventory();
    if (storeOpen) closeStore();
    if (!lobbySteveParts) { try { createLobbyCharacter(); } catch (e) {} }
    if (!lobbySteveParts) return;
    try {
        const dRaw = localStorage.getItem(skinDraftKey());
        draftSkin = (dRaw ? decodeSkinCode(dRaw) : null) || (currentSkin ? cloneSkin(currentSkin) : defaultSkin());
    } catch (e) { draftSkin = currentSkin ? cloneSkin(currentSkin) : defaultSkin(); }
    skinEditorPart = 'head';
    skinEditorSide = 'front';
    skinEraser = false;

    const palette = SKIN_PALETTE.map((c) => `<button class="skin-color-btn" data-color="${c}" style="width:22px;height:22px;background:${c};border:2px solid #555;border-radius:4px;cursor:pointer;padding:0;" title="${c}"></button>`).join('');

    const panel = document.createElement('div');
    panel.id = 'skin-editor-panel';
    panel.style.cssText = 'position:absolute;right:0;top:0;bottom:0;width:300px;background:rgba(8,16,60,0.98);padding:14px;overflow-y:auto;z-index:20;color:white;font-family:monospace;';
    panel.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;">
            <div style="font-size:16px;font-weight:900;color:#00ffcc;">SKIN EDITOR</div>
            <button id="skin-close-btn" style="background:#222;color:#fff;border:1px solid #444;width:28px;height:28px;border-radius:4px;font-weight:bold;cursor:pointer;">✕</button>
        </div>
        <div style="font-size:11px;color:#aaa;margin-top:6px;line-height:1.5;">Player T-pose me khada hai aur us par chhote chhote pixel boxes bane hain. Seedha character par click karke paint karo — jis pixel par click karo ge, rang sirf usi pixel me ayega. Drag karke player ko ghumao (peeche aur side se paint karne ke liye). Front, back aur side alag hain, front ka rang peeche nahi jayega.</div>
        <div style="font-size:11px;color:#aaa;margin-top:6px;">Last painted: <span id="skin-part-name" style="color:#00ffcc;"></span></div>
        <div style="font-size:12px;font-weight:bold;color:#00ffcc;margin-top:10px;">COLOR</div>
        <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;">${palette}</div>
        <div style="display:flex;gap:6px;margin-top:8px;align-items:center;">
            <input type="color" id="skin-custom-color" value="${skinEditorColor}" style="width:36px;height:28px;padding:0;border:1px solid #444;background:#111;cursor:pointer;">
            <button id="skin-eraser-btn" style="padding:6px 10px;font-size:11px;font-weight:bold;background:#334155;color:white;border:none;border-radius:4px;cursor:pointer;">ERASER</button>
            <span id="skin-color-preview" style="display:inline-block;width:22px;height:22px;border:2px solid #555;border-radius:4px;background:${skinEditorColor};vertical-align:middle;"></span>
        </div>
        <button id="skin-publish-btn" style="width:100%;padding:12px;margin-top:12px;font-size:14px;font-weight:900;background:#ffc400;color:#111;border:none;border-radius:8px;cursor:pointer;">PUBLISH SKIN</button>
        <div style="display:flex;gap:6px;margin-top:8px;">
            <button id="skin-reset-btn" style="flex:1;padding:8px;font-size:12px;font-weight:bold;background:#334155;color:white;border:none;border-radius:6px;cursor:pointer;">RESET SKIN</button>
            <button id="skin-remove-btn" style="flex:1;padding:8px;font-size:12px;font-weight:bold;background:#7f1d1d;color:white;border:none;border-radius:6px;cursor:pointer;">REMOVE SKIN</button>
        </div>
        <div id="skin-status" style="min-height:16px;font-size:12px;color:#00ffcc;margin-top:8px;"></div>
        <div id="skin-code-wrap" style="display:none;margin-top:10px;">
            <div style="font-size:12px;font-weight:bold;color:#00ffcc;">SKIN CODE — mujhe bhejo, main default kar dunga</div>
            <textarea id="skin-code-text" readonly style="width:100%;height:64px;box-sizing:border-box;margin-top:4px;background:#111;color:#00ffcc;border:1px solid #444;border-radius:6px;font-size:11px;padding:6px;"></textarea>
            <button id="skin-copy-code-btn" style="width:100%;padding:8px;margin-top:6px;font-weight:bold;background:#2a6cff;color:white;border:none;border-radius:6px;cursor:pointer;font-size:12px;">COPY CODE</button>
        </div>
        <div style="margin-top:12px;">
            <div style="font-size:12px;font-weight:bold;color:#00ffcc;">LOAD CODE</div>
            <input id="skin-load-code" placeholder="Code yahan paste karo" style="width:100%;box-sizing:border-box;margin-top:4px;padding:8px;background:#111;color:white;border:1px solid #444;border-radius:6px;font-size:11px;">
            <button id="skin-load-btn" style="width:100%;padding:8px;margin-top:6px;font-weight:bold;background:#2a6cff;color:white;border:none;border-radius:6px;cursor:pointer;font-size:12px;">LOAD SKIN</button>
        </div>
        <div style="margin-top:12px;">
            <div style="font-size:12px;font-weight:bold;color:#00ffcc;">UPLOAD TEXTURE</div>
            <div style="font-size:11px;color:#aaa;margin-top:4px;">Minecraft skin wali 64x64 texture (PNG) upload karo — skin khud hi load ho jayegi.</div>
            <input type="file" id="skin-upload-input" accept="image/*" style="display:none;">
            <button id="skin-upload-btn" style="width:100%;padding:8px;margin-top:6px;font-weight:bold;background:#2a6cff;color:white;border:none;border-radius:6px;cursor:pointer;font-size:12px;">UPLOAD TEXTURE</button>
        </div>`;
    overlay.appendChild(panel);

    const right = document.getElementById('lobby-right-panel');
    if (right) right.style.display = 'none';
    const card = document.getElementById('lobby-card');
    if (card) card.style.display = 'none';

    setSkinTPose(true);
    if (lobbySteveParts) applySkinToCharacter(lobbySteveParts, draftSkin, true);
    skinEditorOpen = true;
    updateSkinColorPreview();

    document.getElementById('skin-close-btn').addEventListener('click', closeSkinEditor);
    panel.querySelectorAll('.skin-color-btn').forEach((b) => {
        b.addEventListener('click', () => { skinEditorColor = b.dataset.color; skinEraser = false; updateSkinColorPreview(); });
    });
    const customColor = document.getElementById('skin-custom-color');
    if (customColor) customColor.addEventListener('input', () => { skinEditorColor = customColor.value; skinEraser = false; updateSkinColorPreview(); });
    const eraserBtn = document.getElementById('skin-eraser-btn');
    if (eraserBtn) eraserBtn.addEventListener('click', () => { skinEraser = !skinEraser; updateSkinColorPreview(); });
    document.getElementById('skin-publish-btn').addEventListener('click', publishSkin);
    document.getElementById('skin-reset-btn').addEventListener('click', resetSkinEditor);
    document.getElementById('skin-remove-btn').addEventListener('click', removePublishedSkin);
    document.getElementById('skin-copy-code-btn').addEventListener('click', copySkinCode);
    document.getElementById('skin-load-btn').addEventListener('click', loadSkinCode);
    document.getElementById('skin-upload-btn').addEventListener('click', () => { const inp = document.getElementById('skin-upload-input'); if (inp) inp.click(); });
    document.getElementById('skin-upload-input').addEventListener('change', handleSkinTextureUpload);
    // Direct paint: character par click/drag (overlay ki khaali jagah par).
    if (overlay) overlay.addEventListener('mousedown', skinOverlayMouseDown);
    window.addEventListener('mousemove', skinOverlayMouseMove);
    window.addEventListener('mouseup', skinOverlayMouseUp);
}

function closeSkinEditor() {
    const panel = document.getElementById('skin-editor-panel');
    if (!skinEditorOpen && !panel) return;
    if (panel) panel.remove();
    const _ov = document.getElementById('name-overlay');
    if (_ov) _ov.removeEventListener('mousedown', skinOverlayMouseDown);
    window.removeEventListener('mousemove', skinOverlayMouseMove);
    window.removeEventListener('mouseup', skinOverlayMouseUp);
    skinPainting3D = false;
    const right = document.getElementById('lobby-right-panel');
    if (right) right.style.display = '';
    // 🏠 Panel wapas usi haal me lao (mod ko G se, dusri Gmail ko chhupa, guest ko khula).
    restoreLobbyCard();
    skinEditorOpen = false;
    draftSkin = null;
    setSkinTPose(false);
    applySkinToAll();
}

// 🎒 INVENTORY — built-in skins ki list, click karke equip karo.
// Equip per-account hai (skinCodeKey wali key me save hota hai), is liye
// ek account par equip karne se doosre account par nahi lagta.
let inventoryOpen = false;
function skinPreviewDataURL(skin) {
    // Front view ka chhota preview: head, body, arms, legs.
    try {
        const c = document.createElement('canvas');
        const S = 8;
        c.width = 16 * S; c.height = 28 * S;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#0a1a4a'; ctx.fillRect(0, 0, c.width, c.height);
        const draw = (part, ox, oy) => {
            const g = skin && skin[part];
            if (!g) return;
            const w = (SKIN_PARTS[part] || {}).w || 0;
            const h = (SKIN_PARTS[part] || {}).h || 0;
            for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
                ctx.fillStyle = g[y * w + x] || '#000000';
                ctx.fillRect((ox + x) * S, (oy + y) * S, S, S);
            }
        };
        draw('head', 4, 0);
        draw('armL', 0, 8); draw('body', 4, 8); draw('armR', 12, 8);
        draw('legL', 4, 18); draw('legR', 8, 18);
        return c.toDataURL();
    } catch (e) { return ''; }
}
function inventoryEquippedId() {
    if (!currentSkin) return 'original';
    try {
        const cur = encodeSkinCode(currentSkin);
        const hit = INVENTORY_SKINS.find((s) => s.code && s.code === cur);
        return hit ? hit.id : '';
    } catch (e) { return ''; }
}
function equipInventorySkin(id) {
    const item = INVENTORY_SKINS.find((s) => s.id === id);
    if (!item) return;
    if (item.code) {
        const skin = decodeSkinCode(item.code);
        if (!skin) { try { lobbyToast('Skin equip nahi hui — code kharab hai.'); } catch (e) {} return; }
        currentSkin = cloneSkin(skin);
        try { localStorage.setItem(skinCodeKey(), encodeSkinCode(currentSkin)); } catch (e) {}
    } else {
        // ORIGINAL — koi skin nahi, wapas plain Steve.
        currentSkin = null;
        try { localStorage.removeItem(skinCodeKey()); } catch (e) {}
        try { localStorage.removeItem(SKIN_CODE_KEY); } catch (e) {}
    }
    draftSkin = null;
    // Apply fail ho bhi jaye to equip rukni nahi chahiye — panel refresh
    // aur server ko skin bhejna phir bhi hona chahiye.
    try { applySkinToAll(); } catch (e) {}
    try { renderInventoryPanel(); } catch (e) {}
    // Apni nayi skin server ko bhejo taake doosre players ko dikhe.
    try { sendMySkinToServer(); } catch (e) {}
    try { lobbyToast('Skin equip ho gayi: ' + item.name + (item.code ? '' : ' (Original)')); } catch (e) {}
}
// 🎒 INVENTORY GUN EQUIP — gun equip karo to wo us slot ki ho jati hai.
// VITA (slot 1) → AR-9 ki jagah; Revolver (slot 2) → Pistol ki jagah;
// Knife (slot 3) → knife select ho jata hai. Per-account save.
function inventoryGunEquippedId(gun) {
    if (gun.slot === 1) return equippedGun1;
    if (gun.slot === 2) return equippedGun2;
    return 'knife'; // Slot 3 hamesha knife hai.
}
function equipInventoryGun(id) {
    const item = INVENTORY_GUNS.find((s) => s.id === id);
    if (!item) return;
    if (item.slot === 1) {
        equippedGun1 = item.id;
        try { localStorage.setItem(gun1Key(), equippedGun1); } catch (e) {}
        try { stopAutoShotSounds(); } catch (e) {} // AR-9 ki awaz band (VITA semi-auto hai).
    } else if (item.slot === 2) {
        equippedGun2 = item.id;
        try { localStorage.setItem(gun2Key(), equippedGun2); } catch (e) {}
    } else if (item.slot === 3) {
        try { if (typeof switchWeapon === 'function') switchWeapon(3); } catch (e) {}
    }
    try { applyEquippedGuns(); } catch (e) {}
    try { renderInventoryPanel(); } catch (e) {}
    try { lobbyToast('Gun equip ho gayi: ' + item.name); } catch (e) {}
}
function openInventory() {
    const overlay = document.getElementById('name-overlay');
    if (!overlay || document.getElementById('inventory-panel')) return;
    if (skinEditorOpen) closeSkinEditor();
    if (storeOpen) closeStore();
    if (!lobbySteveParts) { try { createLobbyCharacter(); } catch (e) {} }
    const panel = document.createElement('div');
    panel.id = 'inventory-panel';
    panel.style.cssText = 'position:absolute;right:0;top:0;bottom:0;width:300px;background:rgba(8,16,60,0.98);padding:14px;overflow-y:auto;z-index:20;color:white;font-family:monospace;';
    panel.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;">
            <div style="font-size:16px;font-weight:900;color:#00ffcc;">INVENTORY</div>
            <button id="inventory-close-btn" style="background:#222;color:#fff;border:1px solid #444;width:28px;height:28px;border-radius:4px;font-weight:bold;cursor:pointer;">✕</button>
        </div>
        <div style="font-size:11px;color:#aaa;margin-top:6px;line-height:1.5;">Skin par click karke equip karo. Equip sirf tumhare account par lagta hai — doosre Google account par nahi.</div>
        <div id="inventory-list" style="display:flex;flex-direction:column;gap:10px;margin-top:12px;"></div>
    `;
    overlay.appendChild(panel);
    const right = document.getElementById('lobby-right-panel');
    if (right) right.style.display = 'none';
    const card = document.getElementById('lobby-card');
    if (card) card.style.display = 'none';
    inventoryOpen = true;
    renderInventoryPanel();
    document.getElementById('inventory-close-btn').addEventListener('click', closeInventory);
}
function renderInventoryPanel() {
    const list = document.getElementById('inventory-list');
    if (!list) return;
    const eq = inventoryEquippedId();
    const skinsHtml = INVENTORY_SKINS.map((item) => {
        const skin = item.code ? decodeSkinCode(item.code) : defaultSkin();
        const img = skinPreviewDataURL(skin);
        const isEq = eq === item.id;
        return `<div style="display:flex;align-items:center;gap:10px;background:rgba(255,255,255,0.06);padding:10px;border-radius:8px;border:1px solid ${isEq ? '#00ffcc' : '#333'};">
            <img src="${img}" alt="${item.name}" style="width:48px;height:84px;image-rendering:pixelated;background:#0a1a4a;border-radius:4px;">
            <div style="flex:1;">
                <div style="font-size:14px;font-weight:900;">${item.name}</div>
                <div style="font-size:11px;color:#aaa;">${item.desc}</div>
            </div>
            <button class="inventory-equip-btn" data-id="${item.id}" ${isEq ? 'disabled' : ''} style="padding:8px 12px;font-size:11px;font-weight:bold;background:${isEq ? '#00ffcc' : '#2a6cff'};color:${isEq ? '#111' : 'white'};border:none;border-radius:4px;cursor:${isEq ? 'default' : 'pointer'};">${isEq ? 'EQUIPPED' : 'EQUIP'}</button>
        </div>`;
    }).join('');
    // 🎒 GUNS — AR-9 / VITA (slot 1), Pistol / Revolver (slot 2), Knife (slot 3).
    const gunsHtml = INVENTORY_GUNS.map((item) => {
        const isEq = inventoryGunEquippedId(item) === item.id;
        return `<div style="display:flex;align-items:center;gap:10px;background:rgba(255,255,255,0.06);padding:10px;border-radius:8px;border:1px solid ${isEq ? '#ffd700' : '#333'};">
            <div style="width:48px;height:48px;display:flex;align-items:center;justify-content:center;font-size:28px;background:${item.color}22;border-radius:4px;border:1px solid ${item.color}55;">${item.icon}</div>
            <div style="flex:1;">
                <div style="font-size:14px;font-weight:900;">${item.name}</div>
                <div style="font-size:11px;color:#aaa;">${item.desc} (Slot ${item.slot})</div>
            </div>
            <button class="inventory-gun-equip-btn" data-id="${item.id}" ${isEq ? 'disabled' : ''} style="padding:8px 12px;font-size:11px;font-weight:bold;background:${isEq ? '#ffd700' : '#2a6cff'};color:${isEq ? '#111' : 'white'};border:none;border-radius:4px;cursor:${isEq ? 'default' : 'pointer'};">${isEq ? 'EQUIPPED' : 'EQUIP'}</button>
        </div>`;
    }).join('');
    // 🎁 GIFTS — admin ne bheji hui skins (INVENTORY me yahan se EQUIP hoti hain).
    const gifted = loadGiftedSkins();
    const giftsHtml = gifted.length ? gifted.map((g, i) => {
        let img = '';
        try {
            const sk = g.code ? decodeSkinCode(g.code) : defaultSkin();
            img = skinPreviewDataURL(sk);
        } catch (e) { img = ''; }
        const cur = (() => { try { return localStorage.getItem(skinCodeKey()) || ''; } catch (e) { return ''; } })();
        // Equipped: code wali skin ka code match kare; ORIGINAL (code null) tab jab koi skin save nahi.
        const isEq = (g.code === null) ? (cur === '') : (String(g.code) === String(cur));
        return `<div style="display:flex;align-items:center;gap:10px;background:rgba(255,215,0,0.08);padding:10px;border-radius:8px;border:1px solid ${isEq ? '#00ffcc' : '#ffd70055'};">
            ${img ? `<img src="${img}" alt="${escapeHtml(g.name)}" style="width:48px;height:84px;image-rendering:pixelated;background:#0a1a4a;border-radius:4px;">` : `<div style="width:48px;height:84px;display:flex;align-items:center;justify-content:center;font-size:24px;background:#0a1a4a;border-radius:4px;">🎁</div>`}
            <div style="flex:1;">
                <div style="font-size:14px;font-weight:900;">${escapeHtml(g.name)}</div>
                <div style="font-size:11px;color:#aaa;">🎁 ${escapeHtml(g.from || 'Admin')} ne bheji</div>
            </div>
            <button class="inventory-gift-equip-btn" data-idx="${i}" ${isEq ? 'disabled' : ''} style="padding:8px 12px;font-size:11px;font-weight:bold;background:${isEq ? '#00ffcc' : '#ffd700'};color:#111;border:none;border-radius:4px;cursor:${isEq ? 'default' : 'pointer'};">${isEq ? 'EQUIPPED' : 'EQUIP'}</button>
        </div>`;
    }).join('') : '<div style="font-size:12px;color:#888;padding:6px 0;">Abhi koi gift nahi — admin tumhe skin bhejega to yahan aayegi.</div>';
    list.innerHTML = `<div style="font-size:13px;font-weight:900;color:#00ffcc;margin-top:4px;">SKINS</div>` + skinsHtml +
        `<div style="font-size:13px;font-weight:900;color:#ffd700;margin-top:14px;">🎁 GIFTS (admin ne bheji)</div>` + giftsHtml +
        `<div style="font-size:13px;font-weight:900;color:#ffd700;margin-top:14px;">GUNS</div>` + gunsHtml;
    list.querySelectorAll('.inventory-equip-btn').forEach((b) => {
        b.addEventListener('click', () => equipInventorySkin(b.dataset.id));
    });
    list.querySelectorAll('.inventory-gift-equip-btn').forEach((b) => {
        b.addEventListener('click', () => equipGiftedSkin(parseInt(b.dataset.idx, 10) || 0));
    });
    list.querySelectorAll('.inventory-gun-equip-btn').forEach((b) => {
        b.addEventListener('click', () => equipInventoryGun(b.dataset.id));
    });
}
function closeInventory() {
    const panel = document.getElementById('inventory-panel');
    if (!inventoryOpen && !panel) return;
    if (panel) panel.remove();
    const right = document.getElementById('lobby-right-panel');
    if (right) right.style.display = '';
    // 🏠 Panel wapas usi haal me lao (mod ko G se, dusri Gmail ko chhupa, guest ko khula).
    restoreLobbyCard();
    inventoryOpen = false;
}

// 🛒 STORE — yahan se Name Change kharido (14 💎 = 1 name change).
// Google account par pehli name change FREE hoti hai, uske baad har dafa
// Store se kharidna hota hai. Diamonds level-up par milte hain (+5/level).
let storeOpen = false;
const STORE_ITEMS = [
    { id: 'namechange', name: 'Name Change', desc: 'Apna naam ek dafa badlo (Google account). Pehli dafa FREE, phir har dafa 14 💎.', icon: '✏️', price: NAME_CHANGE_PRICE_DIAMONDS }
];
function openStore() {
    const overlay = document.getElementById('name-overlay');
    if (!overlay || document.getElementById('store-panel')) return;
    if (skinEditorOpen) closeSkinEditor();
    if (inventoryOpen) closeInventory();
    const panel = document.createElement('div');
    panel.id = 'store-panel';
    panel.style.cssText = 'position:absolute;right:0;top:0;bottom:0;width:300px;background:rgba(8,16,60,0.98);padding:14px;overflow-y:auto;z-index:20;color:white;font-family:monospace;';
    panel.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;">
            <div style="font-size:16px;font-weight:900;color:#ffd700;">🛒 STORE</div>
            <button id="store-close-btn" style="background:#222;color:#fff;border:1px solid #444;width:28px;height:28px;border-radius:4px;font-weight:bold;cursor:pointer;">✕</button>
        </div>
        <div id="store-balance" style="font-size:12px;color:#aaa;margin-top:6px;line-height:1.6;"></div>
        <div id="store-list" style="display:flex;flex-direction:column;gap:10px;margin-top:12px;"></div>
    `;
    overlay.appendChild(panel);
    const right = document.getElementById('lobby-right-panel');
    if (right) right.style.display = 'none';
    const card = document.getElementById('lobby-card');
    if (card) card.style.display = 'none';
    storeOpen = true;
    renderStorePanel();
    document.getElementById('store-close-btn').addEventListener('click', closeStore);
}
function renderStorePanel() {
    const list = document.getElementById('store-list');
    const bal = document.getElementById('store-balance');
    if (!list) return;
    const isG = isGoogleAccount();
    if (bal) {
        bal.innerHTML = isG
            ? `💎 Diamonds: <b style="color:#fff;">${totalDiamonds}</b> &nbsp;•&nbsp; ✏️ Name changes bache: <b style="color:#fff;">${nameChangeCredits()}</b>${nameChangeFreeUsed() ? '' : ' <span style="color:#00ff88;">(pehli FREE)</span>'}`
            : `💎 Diamonds: <b style="color:#fff;">${totalDiamonds}</b> &nbsp;•&nbsp; Guest: naam free badal sakte ho`;
    }
    list.innerHTML = STORE_ITEMS.map((item) => {
        const afford = isG && totalDiamonds >= item.price;
        const btnLabel = !isG ? 'Google login chahiye' : (afford ? `BUY (${item.price} 💎)` : `${item.price} 💎 chahiye`);
        return `<div style="display:flex;align-items:center;gap:10px;background:rgba(255,255,255,0.06);padding:10px;border-radius:8px;border:1px solid #333;">
            <div style="width:48px;height:48px;display:flex;align-items:center;justify-content:center;font-size:28px;background:#ffd70022;border-radius:4px;border:1px solid #ffd70055;">${item.icon}</div>
            <div style="flex:1;">
                <div style="font-size:14px;font-weight:900;">${item.name}</div>
                <div style="font-size:11px;color:#aaa;">${item.desc}</div>
                <div style="font-size:12px;color:#ffd700;font-weight:bold;margin-top:2px;">Price: ${item.price} 💎</div>
            </div>
            <button class="store-buy-btn" data-id="${item.id}" ${afford ? '' : 'disabled'} style="padding:8px 12px;font-size:11px;font-weight:bold;background:${afford ? '#ffd700' : '#333'};color:${afford ? '#111' : '#888'};border:none;border-radius:4px;cursor:${afford ? 'pointer' : 'default'};">${btnLabel}</button>
        </div>`;
    }).join('');
    list.querySelectorAll('.store-buy-btn').forEach((b) => {
        b.addEventListener('click', () => buyStoreItem(b.dataset.id));
    });
}
function buyStoreItem(id) {
    if (id === 'namechange') { buyNameChange(); return; }
}
function closeStore() {
    const panel = document.getElementById('store-panel');
    if (!storeOpen && !panel) return;
    if (panel) panel.remove();
    const right = document.getElementById('lobby-right-panel');
    if (right) right.style.display = '';
    restoreLobbyCard();
    storeOpen = false;
}

function hideLobbyExtras() {
    ['crosshair','hud','score-dots','match-timer','chat-container','weapon-bar'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
}
function showGameExtras() {
    // index.html me HUD default hidden hai (lobby me timer na dikhe),
    // is liye game start par sahi display value set karni parti hai
    // ('' se CSS wala display:none wapas aa jata).
    // match-timer 'flex' hai (TIME upar, time neeche) — 'block' se label
    // aur value ek hi line me aa jate.
    const gameDisplay = { 'crosshair': 'block', 'hud': 'block', 'score-dots': 'flex', 'match-timer': 'flex' };
    Object.keys(gameDisplay).forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.style.display = gameDisplay[id];
    });
    // weapon-bar: sirf game me dikhe, lobby me nahi.
    const wb = document.getElementById('weapon-bar');
    if (wb) wb.style.display = 'flex';
    // chat-container yahan nahi — chat sirf Enter/T se khulta hai, game
    // start par nahi (warna messages screen par rehte hain).
}

function showGoogleNamePrompt(user) {
    // 🔒 Mod gate ke liye Google email + uid yaad rakho (sirf
    // technowarrior924@gmail.com ko customize options milte hain).
    try { currentGoogleEmail = String(user && user.email ? user.email : '').trim().toLowerCase(); } catch (e) { currentGoogleEmail = ''; }
    try { currentGoogleUid = String(user && user.uid ? user.uid : ''); } catch (e) { currentGoogleUid = ''; }
    // 🌍 W.W.P ke liye Google profile picture bhi yaad rakho.
    try { currentGooglePhotoURL = String(user && user.photoURL ? user.photoURL : ''); } catch (e) { currentGooglePhotoURL = ''; }
    const oldOverlay = document.getElementById('name-overlay');
    if (oldOverlay) oldOverlay.remove();
    const overlay = document.createElement('div');
    overlay.id = 'name-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.display = 'flex';
    overlay.style.zIndex = '999999';
    overlay.style.fontFamily = 'monospace';
    overlay.style.color = 'white';
    const defaultName = localStorage.getItem(`pointerx_user_${user.uid}`) || user.displayName || "GoogleUser";
    overlay.innerHTML = buildLobbyHTML({ mode: 'google', defaultName, email: user.email });
    document.body.appendChild(overlay);
    hideLobbyExtras();
    // Is Google account ki skin load karo (har account ki apni skin).
    try { setSkinAccount('g_' + user.uid); } catch (e) {}
    try { createLobbyCharacter(); } catch (e) {}
    setupLobbyMenus();
    const startBtn = document.getElementById('start-google-game');
    if (startBtn) startBtn.addEventListener('click', () => {
        const input = document.getElementById('google-custom-name');
        let finalName = input ? input.value.trim() : "GoogleUser";
        if (finalName === "") finalName = "GoogleUser";
        localStorage.setItem(`pointerx_user_${user.uid}`, finalName);
        startMatchmaking(finalName); // 🔍 Pehle SEARCHING, phir MATCH FOUND, phir game.
    });
    const logoutBtn = document.getElementById('prompt-logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', () => {
        if (window.firebaseAuth && window.signOut) {
            window.signOut(window.firebaseAuth).then(() => { location.reload(); });
        }
    });
}

function initNamePrompt() {
    // Guest mode — koi Google email nahi, is liye mod gate band.
    currentGoogleEmail = '';
    currentGoogleUid = '';
    currentGooglePhotoURL = '';
    const oldOverlay = document.getElementById('name-overlay');
    if (oldOverlay) oldOverlay.remove();
    const overlay = document.createElement('div');
    overlay.id = 'name-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.display = 'flex';
    overlay.style.zIndex = '999999';
    overlay.style.fontFamily = 'monospace';
    overlay.style.color = 'white';
    const defaultGuestName = localStorage.getItem('pointerx_guest_name') || `Player_${Math.floor(Math.random()*1000)}`;
    overlay.innerHTML = buildLobbyHTML({ mode: 'guest', defaultName: defaultGuestName });
    document.body.appendChild(overlay);
    hideLobbyExtras();
    // Is guest naam ki skin load karo (har naam ki apni skin).
    try { setSkinAccount('guest_' + String(defaultGuestName).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_')); } catch (e) {}
    try { createLobbyCharacter(); } catch (e) {}
    setupLobbyMenus();
    const googleBtn = document.getElementById('google-login-btn');
    if (googleBtn) {
        googleBtn.addEventListener('click', () => {
            const auth = window.firebaseAuth;
            const provider = window.googleProvider;
            if (auth && provider) {
                if (window.signInWithPopup) {
                    window.signInWithPopup(auth, provider)
                        .then((result) => { showGoogleNamePrompt(result.user); })
                        .catch((error) => {
                            if (error.code === 'auth/popup-blocked' && window.signInWithRedirect) {
                                window.signInWithRedirect(auth, provider);
                            } else {
                                alert("Google Login Failed: " + (error.message || "Try again."));
                            }
                        });
                } else if (window.signInWithRedirect) {
                    window.signInWithRedirect(auth, provider);
                }
            } else {
                alert("Firebase Auth is still initializing. Please wait a second!");
            }
        });
    }
    const joinBtn = document.getElementById('join-btn');
    if (joinBtn) {
        joinBtn.addEventListener('click', () => {
            const input = document.getElementById('player-name-input');
            let pName = input ? input.value.trim() : "Player";
            if (pName === "") pName = "Player";
            localStorage.setItem('pointerx_guest_name', pName);
            startMatchmaking(pName); // 🔍 Pehle SEARCHING, phir MATCH FOUND, phir game.
        });
    }
}

// 🌑 Apne player ka shadow — first-person me apna body dikhta nahi, is liye
// ek shadow-only body banate hain: Steve character jo sirf shadow daalta hai.
// Body layer 0 par hai (shadow camera use zaroor dekhta hai) lekin uska
// material color/depth kuch nahi likhta — main camera me bilkul invisible,
// phir bhi shadow map me uski depth banti hai, is liye shadow aata hai.
// (Pehle layer 1 try kiya tha — shadow camera layer 1 ko ignore karta hai,
// is liye sirf gun ka shadow aa raha tha, player ka nahi.)
function createLocalShadowBody() {
    if (localShadowBody) return;
    try {
        if (typeof createSteveCharacter !== 'function' || !scene) return;
        const steveChar = createSteveCharacter('local', true);
        const body = steveChar.group;
        // 💪 Pushup — shadow body bhi let-ta hai (rotation.x + yaw).
        // 'YXZ' order: yaw pehle (vertical), phir pitch (face-down) —
        // warna body right ki taraf roll ho jati hai (jaise doosre players).
        body.rotation.order = 'YXZ';
        body.traverse((child) => {
            if (child.isMesh && child.visible) {
                child.castShadow = true;
                // Invisible body — na rang, na depth (kuch block nahi karta).
                // Skin wale parts ki material ARRAY hoti hai (har face ki
                // alag material) — array par colorWrite lagane se kuch nahi
                // hota, is liye har material par alag se lagao.
                const mats = Array.isArray(child.material) ? child.material : [child.material];
                mats.forEach((mm) => {
                    if (!mm) return;
                    try { mm.colorWrite = false; } catch (e) {}
                    try { mm.depthWrite = false; } catch (e) {}
                });
            }
        });
        scene.add(body);
        localShadowBody = body;
    } catch (e) {}
}
// Shadow body ko player ke peeche lagao (position + yaw).
function updateLocalShadowBody() {
    if (!localShadowBody || !camera) return;
    try {
        // Jump ke saath body bhi upar jaye — pairon ki height
        // (camera.y - playerHeight). Khade ho to 0, jump me upar.
        // Is se shadow bhi jump karta hai (gun ki tarah).
        const feetY = Math.max(0, camera.position.y - playerHeight);
        // 💪 Pushup — shadow body bhi let jaye (zameen par, bob ke saath).
        // Height in-game editor (G) se set hoti hai (default 0.45).
        const pushY = isDoingPushups ? inGamePushupHeight + Math.sin(pushupPhase) * 0.12 : 0;
        localShadowBody.position.set(camera.position.x, feetY + pushY, camera.position.z);
        localShadowBody.rotation.y = yaw + Math.PI;
        localShadowBody.rotation.x = isDoingPushups ? Math.PI / 2 : 0; // MUNH KE BALL.
    } catch (e) {}
}

// 🔍 MATCHMAKING — PLAY dabao to pehle SEARCHING FOR MATCH chale.
// Time internet ke hisab se: fast ho to kam se kam 2.5s, slow ho to
// server ka jawab aane tak (zyada). Phir MATCH FOUND aaye, phir game start.
// Server na mile to error + RETRY.
function showMatchmaking() {
    if (typeof document === 'undefined') return;
    let overlay = document.getElementById('matchmaking-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'matchmaking-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.82);z-index:1000000;display:flex;align-items:center;justify-content:center;font-family:monospace;';
        overlay.innerHTML = `
            <style>@keyframes mm-spin { to { transform: rotate(360deg); } }</style>
            <div style="text-align:center;color:#fff;padding:24px;">
                <div id="mm-spinner" style="width:56px;height:56px;margin:0 auto 18px;border:5px solid rgba(255,255,255,0.2);border-top-color:#ffd700;border-radius:50%;animation:mm-spin 1s linear infinite;"></div>
                <div id="mm-title" style="font-size:22px;font-weight:900;color:#ffd700;letter-spacing:1px;">SEARCHING FOR MATCH...</div>
                <div id="mm-sub" style="font-size:13px;color:#aaa;margin-top:8px;">Players dhoond rahe hain...</div>
                <div id="mm-online" style="font-size:14px;color:#00ff88;margin-top:10px;"></div>
                <button id="mm-cancel" style="margin-top:20px;padding:10px 22px;font-size:14px;font-weight:900;background:#333;color:#fff;border:1px solid #666;border-radius:8px;cursor:pointer;">✕ CANCEL</button>
            </div>`;
        document.body.appendChild(overlay);
        const cancel = document.getElementById('mm-cancel');
        if (cancel) cancel.addEventListener('click', () => { cancelMatchmaking(); });
    }
    overlay.style.display = 'flex';
    const spin = document.getElementById('mm-spinner');
    if (spin) spin.style.display = 'block';
    const title = document.getElementById('mm-title');
    if (title) { title.textContent = 'SEARCHING FOR MATCH...'; title.style.color = '#ffd700'; }
    const sub = document.getElementById('mm-sub');
    if (sub) sub.textContent = 'Players dhoond rahe hain...';
    const cancel = document.getElementById('mm-cancel');
    if (cancel) cancel.style.display = 'inline-block';
    updateMatchmakingOnline(null);
}
function updateMatchmakingOnline(count) {
    if (typeof document === 'undefined') return;
    const el = document.getElementById('mm-online');
    if (!el) return;
    let n = (typeof count === 'number') ? count : null;
    if (n === null) {
        try { n = (typeof wwpPlayers !== 'undefined' && Array.isArray(wwpPlayers)) ? wwpPlayers.filter((p) => p.online).length : 0; } catch (e) { n = 0; }
    }
    el.textContent = n > 0 ? `🟢 ${n} player${n === 1 ? '' : 's'} online` : '';
}
function showMatchFound(info) {
    if (typeof document === 'undefined') return;
    const spin = document.getElementById('mm-spinner');
    if (spin) spin.style.display = 'none';
    const title = document.getElementById('mm-title');
    if (title) { title.textContent = '✅ MATCH FOUND!'; title.style.color = '#00ff88'; }
    const sub = document.getElementById('mm-sub');
    if (sub) sub.textContent = 'Match shuru ho raha hai...';
    const cancel = document.getElementById('mm-cancel');
    if (cancel) cancel.style.display = 'none';
    const n = (info && typeof info.online === 'number') ? info.online : null;
    updateMatchmakingOnline(n);
}
function showMatchmakingError() {
    if (typeof document === 'undefined') return;
    const spin = document.getElementById('mm-spinner');
    if (spin) spin.style.display = 'none';
    const title = document.getElementById('mm-title');
    if (title) { title.textContent = '❌ SERVER NAHI MILA'; title.style.color = '#ff4444'; }
    const sub = document.getElementById('mm-sub');
    if (sub) sub.textContent = 'Internet check karo aur dobara try karo.';
    const cancel = document.getElementById('mm-cancel');
    if (cancel) cancel.textContent = '↩ LOBBY';
    // RETRY button (pehli dafa banao).
    let overlay = document.getElementById('matchmaking-overlay');
    if (overlay && !document.getElementById('mm-retry')) {
        const retry = document.createElement('button');
        retry.id = 'mm-retry';
        retry.textContent = '🔄 RETRY';
        retry.style.cssText = 'margin-top:20px;margin-right:10px;padding:10px 22px;font-size:14px;font-weight:900;background:#00ff88;color:#111;border:none;border-radius:8px;cursor:pointer;';
        retry.addEventListener('click', () => {
            const name = matchmakingName || 'Player';
            hideMatchmaking();
            matchmakingActive = false;
            startMatchmaking(name);
        });
        const cancelBtn = document.getElementById('mm-cancel');
        if (cancelBtn && cancelBtn.parentNode) cancelBtn.parentNode.insertBefore(retry, cancelBtn);
    }
}
function hideMatchmaking() {
    try { const o = document.getElementById('matchmaking-overlay'); if (o) o.style.display = 'none'; } catch (e) {}
    try { const r = document.getElementById('mm-retry'); if (r) r.remove(); } catch (e) {}
}
function cancelMatchmaking() {
    matchmakingCancelled = true;
    matchmakingActive = false;
    hideMatchmaking();
}
function startMatchmaking(playerName) {
    // 👑 Ban / Disable ho to PLAY nahi — pehle hi bata do.
    if (amBanned) { try { showAccountStatusBanner(); } catch (e) {} try { if (typeof lobbyToast === 'function') lobbyToast('🚫 You are BANNED by the admin!'); } catch (e) {} return; }
    if (amDisabled) { try { showAccountStatusBanner(); } catch (e) {} try { if (typeof lobbyToast === 'function') lobbyToast('⛔ Your account is DISABLED by the admin!'); } catch (e) {} return; }
    // 📱 Portrait me matchmaking nahi — pehle phone ghumao (rotate overlay).
    if (typeof isMobile !== 'undefined' && isMobile && typeof isLandscape === 'function' && !isLandscape()) {
        startGameWithPlayer(playerName);
        return;
    }
    if (matchmakingActive) return; // pehle se searching chal rahi hai
    matchmakingActive = true;
    matchmakingCancelled = false;
    matchmakingName = playerName || 'Player';
    const t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    showMatchmaking();
    const waitMs = (ms) => new Promise((r) => setTimeout(r, ms));
    const ensureConnected = () => new Promise((resolve) => {
        try {
            if (socket && socket.connected) return resolve(true);
            if (!socket || typeof socket.once !== 'function') return resolve(false);
            let done = false;
            const to = setTimeout(() => { if (!done) { done = true; try { socket.off('connect', onC); } catch (e) {} resolve(false); } }, 6000);
            const onC = () => { if (!done) { done = true; clearTimeout(to); resolve(true); } };
            try { socket.once('connect', onC); } catch (e) { clearTimeout(to); resolve(false); return; }
            try { if (socket.disconnected && typeof socket.connect === 'function') socket.connect(); } catch (e) {}
        } catch (e) { resolve(false); }
    });
    const requestInfo = () => new Promise((resolve) => {
        try {
            if (!socket || !socket.connected || typeof socket.once !== 'function') return resolve(null);
            let done = false;
            const to = setTimeout(() => { if (!done) { done = true; try { socket.off('matchInfo', onI); } catch (e) {} resolve(null); } }, 3000);
            const onI = (d) => { if (!done) { done = true; clearTimeout(to); resolve(d || null); } };
            try { socket.once('matchInfo', onI); } catch (e) { clearTimeout(to); resolve(null); return; }
            try { socket.emit('requestMatchInfo'); } catch (e) {}
        } catch (e) { resolve(null); }
    });
    (async () => {
        const connected = await ensureConnected();
        let info = null;
        if (connected && !matchmakingCancelled) {
            info = await requestInfo();
            // Purana server (requestMatchInfo nahi janta) ho to bhi chalao —
            // socket connected hai to server mil gaya, online count cached se.
            if (!info && socket && socket.connected) info = { online: null, fallback: true };
        }
        if (matchmakingCancelled) return;
        // Kam se kam MATCHMAKING_MIN_MS tak searching dikhao (fast internet par bhi).
        const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        const elapsed = now - t0;
        if (elapsed < MATCHMAKING_MIN_MS) await waitMs(MATCHMAKING_MIN_MS - elapsed);
        if (matchmakingCancelled) return;
        if (!connected) {
            showMatchmakingError();
            matchmakingActive = false;
            return;
        }
        showMatchFound(info);
        await waitMs(MATCHMAKING_FOUND_MS);
        if (matchmakingCancelled) return;
        hideMatchmaking();
        matchmakingActive = false;
        startGameWithPlayer(matchmakingName);
    })().catch(() => { try { hideMatchmaking(); } catch (e) {} matchmakingActive = false; });
}

function startGameWithPlayer(name) {
    // 📱 Mobile: portrait (khada phone) me game start NAHI hoga — pehle
    // phone ko landscape (aada) ghumao, phir game khud start ho jayega.
    if (isMobile && !isLandscape()) {
        waitingForLandscape = true;
        waitingPlayerName = name;
        showRotateOverlay();
        return;
    }
    matchmakingActive = false; // 🔍 Matchmaking khatam — game shuru.
    playerName = name;
    try { closeSkinEditor(); } catch (e) {}
    try { removeLobbyCharacter(); } catch (e) {}
    // 🌑 Apne player ka shadow body (pehli baar PLAY par banta hai).
    try { createLocalShadowBody(); } catch (e) {}
    // 🔫 First-person gun ki size lobby wali (lobbyGunScale) — lobby me
    // slider badla ho to game start par nayi size lag jaye.
    if (firstPersonAR9) firstPersonAR9.scale.set(lobbyGunScale, lobbyGunScale, lobbyGunScale);
    if (gun) gun.visible = (currentWeapon === 1);
    if (pistol) pistol.visible = (currentWeapon === 2);
    if (knife) knife.visible = (currentWeapon === 3);
    try { createWeaponBar(); updateWeaponBar(); } catch (e) {}
    try { showGameExtras(); } catch (e) {}
    const overlay = document.getElementById('name-overlay');
    if (overlay) overlay.remove();

    setupExitButton();
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.style.display = 'block';
    const exitBtn = document.getElementById('exit-btn');
    if (exitBtn) exitBtn.style.display = 'block';

    if (socket && typeof socket.connect === 'function' && socket.disconnected) {
        try { socket.connect(); } catch (e) {}
    }

    gameStarted = true;
    // 🏁 Naye match ke stats fresh (pichle match ke pending nahi aane chahiye).
    matchKills = 0; matchDeaths = 0; matchShots = 0; matchHits = 0;
    matchPendingXP = 0; matchPendingCoins = 0; myMatchStats = null; matchResultsData = null;
    // Pehle apni skin bhejo, phir naam — taake newPlayer broadcast me
    // skin pehle se aa jaye aur doosre players ko sahi skin dikhe.
    try { sendMySkinToServer(); } catch (e) {}
    socket.emit('setPlayerName', playerName);
    // 🌍 W.W.P — PLAY wale naam se profile bhi bhejo.
    try { sendMyProfileToServer(); } catch (e) {}
    updateHUD();

    if (isMobile) {
        setupMobileControls();
        isLocked = true;
    } else {
        const blocker = document.getElementById('blocker');
        if (blocker) { blocker.style.display = 'none'; }
        document.body.requestPointerLock();
    }
}

function triggerHitMarker(isHeadshot = false) {
    let crosshair = document.getElementById('crosshair');
    if (!crosshair) return;

    crosshair.style.backgroundColor = '#ff0000';
    crosshair.style.transform = 'translate(-50%, -50%) rotate(45deg) scale(1.6)';
    crosshair.style.boxShadow = isHeadshot ? '0 0 10px #ff0000, 0 0 20px #ff0000' : '0 0 8px #ff3300';

    setTimeout(() => {
        crosshair.style.backgroundColor = '#00ff00';
        crosshair.style.transform = 'translate(-50%, -50%) rotate(0deg) scale(1)';
        crosshair.style.boxShadow = 'none';
    }, 100);

    const popup = document.createElement('div');
    popup.innerText = isHeadshot ? "🎯 HEADSHOT!" : "💥 HIT";
    popup.style.position = 'fixed';
    popup.style.top = '46%';
    popup.style.left = '52%';
    popup.style.transform = 'translate(-50%, -50%)';
    popup.style.color = isHeadshot ? '#ff0000' : '#ffcc00';
    popup.style.fontSize = isHeadshot ? '20px' : '14px';
    popup.style.fontWeight = 'bold';
    popup.style.fontFamily = 'monospace';
    popup.style.pointerEvents = 'none';
    popup.style.zIndex = '999';
    popup.style.textShadow = '1px 1px 2px #000';
    document.body.appendChild(popup);

    setTimeout(() => { popup.remove(); }, 350);
}

// ⭐ Kill points popup — HIT/HEADSHOT wali jagah (crosshair ke paas) par
// points dikhte hain: KILL +15, HEADSHOT +5, MID-AIR +5 (jo bhi laga ho).
function showKillPointsPopup(isHeadshot, isMidAir) {
    const popup = document.createElement('div');
    let html = '<div style="color:#ffd700;">KILL +15</div>';
    if (isHeadshot) html += '<div style="color:#ff4444;">HEADSHOT +5</div>';
    if (isMidAir) html += '<div style="color:#00d2ff;">MID-AIR +5</div>';
    popup.innerHTML = html;
    popup.style.position = 'fixed';
    popup.style.top = '46%';
    popup.style.left = '52%';
    popup.style.transform = 'translate(-50%, -50%)';
    popup.style.fontSize = '16px';
    popup.style.fontWeight = 'bold';
    popup.style.fontFamily = 'monospace';
    popup.style.textAlign = 'center';
    popup.style.lineHeight = '1.4';
    popup.style.pointerEvents = 'none';
    popup.style.zIndex = '999';
    popup.style.textShadow = '1px 1px 2px #000';
    document.body.appendChild(popup);
    setTimeout(() => { popup.remove(); }, 1200);
}

function init() {
    clock = new THREE.Clock();

    scene = new THREE.Scene();
    // 🌇 Background lobby jaisa hai — sunset sky + trees/mountains, ye sab
    // buildGameEnvironment() lagata hai (neeche, createMap ke baad).
    // Raat wala dark background (0x0a0a1a) aur night-sky.png hata diye.

    camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, playerHeight, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    // 💡 Brightness lobby jitni (Ambient 0.5 + Directional 0.7) — pehle
    // raat wali thi (0.4 / 0.5), is liye game andhera lagta tha.
    // Refs day/night cycle (updateDayNight) ke liye save karo.
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    gameAmbientLight = ambientLight;
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
    gameDirLight = dirLight;
    dirLight.position.set(50, 100, 50);
    dirLight.castShadow = true;
    // 🌑 Shadow camera — player ke aas-paas 160m (crisp shadows), 2048 map.
    // updateDayNight is light ko player ke peeche (sun/moon ki direction me)
    // rakhta hai aur target player ki zameen par, taake shadows hamesha
    // player ke aas-paas hon (poora arena cover karna blurry hota).
    dirLight.shadow.mapSize.set(2048, 2048);
    dirLight.shadow.camera.left = -80;
    dirLight.shadow.camera.right = 80;
    dirLight.shadow.camera.top = 80;
    dirLight.shadow.camera.bottom = -80;
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 500;
    dirLight.shadow.camera.updateProjectionMatrix();
    scene.add(dirLight);
    scene.add(dirLight.target);

    createMap();
    buildGameEnvironment();
    createGun();
    createPistol();
    createKnife();
    loadEquippedGuns();
    applyEquippedGuns();
    injectWeaponBarStyles();
    createWeaponBar();
    switchWeapon(1);

    if (!isMobile) { setupPointerLock(); }
    // 📱 Mobile: landscape lock overlay (portrait me "rotate karo" dikhe)
    // + mobile lobby layout (desktop lobby chhoti screen par fit ho).
    // Viewport meta: pinch-zoom band (game screen hilna nahi chahiye).
    // Real viewport height (--vh) naapo taake bottom cut na ho.
    if (isMobile) {
        try { setMobileVh(); } catch (e) {}
        try {
            let _vp = document.querySelector('meta[name="viewport"]');
            if (_vp) _vp.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
        } catch (e) {}
        try { setupRotateOverlay(); } catch (e) {} try { injectMobileLobbyStyles(); } catch (e) {}
    }

    window.addEventListener('resize', onWindowResize);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    
    window.addEventListener('mousedown', (e) => {
        if (!isLocked || isDeadLocal || !gameStarted) return;
        if (e.button === 0) {
            isMouseHeld = true; lastAutoShotTime = performance.now();
            shoot(e); // 🔫 AR-9 ki awaz shoot() me bajti hai (pehli goli).
        } 
        else if (e.button === 2) { 
            isAiming = true; 
            camera.fov = aimedFOV;
            camera.updateProjectionMatrix();
        }
    });

    window.addEventListener('mouseup', (e) => {
        if (e.button === 0) { isMouseHeld = false; stopAutoShotSounds(); } // 🔫 AR-9: chorte hi awaz TURANT band.
        if (e.button === 2) { 
            isAiming = false; 
            camera.fov = normalFOV;
            camera.updateProjectionMatrix();
        }
    });

    window.addEventListener('contextmenu', (e) => e.preventDefault());

    socket.on('currentPlayers', (serverPlayers) => {
        Object.keys(serverPlayers).forEach((id) => {
            if (id === socket.id) return;
            createOtherPlayerMesh(id, serverPlayers[id]);
        });
    });

    socket.on('newPlayer', (data) => {
        createOtherPlayerMesh(data.id, data.player);
    });

    // 🎨 Kisi doosre player ne skin badli — uski apni skin us par lagao.
    socket.on('playerSkinChanged', (data) => {
        const p = otherPlayers[data.id];
        if (p) applyPlayerSkin(p, data.skin);
    });

    // 🎨 Socket connect/reconnect hote hi apni skin dobara bhejo.
    // EXIT ke baad socket disconnect hota hai; PLAY par connect async
    // hota hai, is liye join par bheji hui skin kabhi kabhi nahi
    // pahunchti. Connect handler se skin hamesha server tak jati hai.
    socket.on('connect', () => {
        try { sendMySkinToServer(); } catch (e) {}
        // 🌍 W.W.P — profile bhi dobara bhejo (naam, #ID, PFP).
        try { sendMyProfileToServer(); } catch (e) {}
    });

    // 🌍 W.W.P — server se PERMANENT players ki list aayi (naam, #ID, PFP,
    // profile, online). Local backup se merge karo (ek dafa login = hamesha list me).
    socket.on('playersList', (list) => {
        try { mergeWWPList(list); } catch (e) { try { wwpPlayers = Array.isArray(list) ? list : []; } catch (e2) { wwpPlayers = []; } }
        try { renderWWPList(); } catch (e) {}
        // 👑 Player popup khula ho to uska status bhi refresh karo (Ban/Disable ke baad).
        try {
            if (wwpPopupKey) {
                const p = (wwpPlayers || []).find((x) => String(x.key || '') === String(wwpPopupKey));
                if (p) renderWWPPlayerPopup(p);
            }
        } catch (e) {}
    });
    // 🆔 Meri #ID kisi aur player ki ID se takra gayi — nayi ID banao, dobara bhejo.
    socket.on('playerIdTaken', () => {
        try {
            const nid = generatePlayerId();
            myPlayerId = nid;
            myPlayerIdAccount = skinAccountId;
            try { localStorage.setItem(playerIdKey(), nid); } catch (e) {}
            try { updateMyIdDisplay(); } catch (e) {}
            try { sendMyProfileToServer(); } catch (e) {}
        } catch (e) {}
    });

    socket.on('chatMessage', (data) => {
        if (data.id) {
            if (shownChatIds.has(data.id)) return;
            shownChatIds.add(data.id);
            if (shownChatIds.size > 200) shownChatIds.clear();
        }
        const _now = Date.now();
        if (data.name === playerName && data.message === lastLocalChatText && _now - lastLocalChatTime < 5000) return;
        const _key = data.name + '\0' + data.message;
        if (_key === lastServerChatKey && _now - lastServerChatTime < 2000) return;
        lastServerChatKey = _key;
        lastServerChatTime = _now;
        appendChatMessage(data.name, data.message, 'white');
    });

    socket.on('playerJoinedNotif', (name) => {
        appendChatMessage('', `${name} Joined the game`, '#00ff00');
    });

    socket.on('playerLeftNotif', (name) => {
        appendChatMessage('', `${name} Left the game`, '#ff3333');
    });

    socket.on('gameNotification', (msg) => { showGameNotification(msg); });

    socket.on('timerUpdate', (totalSeconds) => {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        matchTimerString = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
        updateHUD();
    });

    socket.on('playerStatsUpdate', (data) => {
        // ⭐ Kill = 15 XP + 100 coins, Headshot kill = +5 XP,
        // Mid-air kill (target hawa me) = +5 XP. Death = 10 XP + 10 coins.
        // (sirf tab jab count barhe — double-award nahi hota).
        // 🏁 MATCH REWARDS PENDING — ye sab match end par save honge.
        // Beech me match chhor diya (EXIT/disconnect) to pending zaya
        // ho jata hai (save nahi hota). Is liye yahan sirf pending me
        // jama karo, totalCoins/totalXP abhi mat badhao.
        if (data.attackerId === socket.id && typeof data.attackerKills === 'number' && data.attackerKills > myKills) {
            const newKills = data.attackerKills - myKills;
            matchKills += newKills;
            matchPendingCoins += 100 * newKills;
            let xpGain = 15 * newKills;
            if (data.isHeadshot) { xpGain += 5; }
            if (data.isMidAir) { xpGain += 5; }
            matchPendingXP += xpGain;
            // Points HIT/HEADSHOT wali jagah (crosshair ke paas) par dikhao.
            try {
                if (typeof showKillPointsPopup === 'function') showKillPointsPopup(!!data.isHeadshot, !!data.isMidAir);
            } catch (e) {}
        }
        if (data.targetId === socket.id && typeof data.targetDeaths === 'number' && data.targetDeaths > myDeaths) {
            const newDeaths = data.targetDeaths - myDeaths;
            matchDeaths += newDeaths;
            matchPendingCoins += 10 * newDeaths;
            matchPendingXP += 10 * newDeaths;
        }
        if (data.targetId === socket.id) { myDeaths = data.targetDeaths; }
        if (data.attackerId === socket.id) { myKills = data.attackerKills; }
        updateHUD();
    });

    // 🏁 MATCH KHATAM (server timer 0 hua) — rewards save karo, stats
    // server ko bhejo (accuracy ke liye), results panel dikhao.
    // Lobby me ho to ignore karo (tum match me nahi the).
    socket.on('matchEnded', () => {
        if (!gameStarted) return;
        try {
            const stats = { kills: matchKills, deaths: matchDeaths, coins: matchPendingCoins, shots: matchShots, hits: matchHits };
            myMatchStats = stats;
            commitMatchRewards();
            try { socket.emit('matchStats', stats); } catch (e) {}
            // Agle match ke liye counters reset (panel ke liye stats capture kar liye).
            matchKills = 0; matchDeaths = 0; matchShots = 0; matchHits = 0;
            matchPendingXP = 0; matchPendingCoins = 0;
            matchResultsData = null;
            showMatchResults(null);
        } catch (e) {}
    });
    // 🏆 Server se leaderboard aaya (rank, naam, #ID, K/D, KDR, coins, accuracy).
    socket.on('matchResults', (board) => {
        try {
            matchResultsData = Array.isArray(board) ? board : [];
            if (matchResultsOpen) renderMatchResults(matchResultsData);
        } catch (e) {}
    });
    // 🏁 Disconnect (network ya EXIT) — beech me chhor diya, pending rewards zaya.
    socket.on('disconnect', () => {
        try { discardMatchRewards(); } catch (e) {}
    });
    // 👑 ADMIN — Ban / Disable (server ne kick kiya).
    socket.on('youAreBanned', () => {
        try {
            amBanned = true; amDisabled = false;
            try { saveAccountStatus('banned'); } catch (e) {}
            try { socket.disconnect(); } catch (e) {}
            try { if (gameStarted) exitToLobby(); } catch (e) {}
            try { showAccountStatusBanner(); } catch (e) {}
            try { updatePlayButtonsDisabled(); } catch (e) {}
            try { if (typeof lobbyToast === 'function') lobbyToast('🚫 YOU ARE BANNED by the admin!'); } catch (e) {}
        } catch (e) {}
    });
    socket.on('youAreDisabled', () => {
        try {
            amDisabled = true; amBanned = false;
            try { saveAccountStatus('disabled'); } catch (e) {}
            try { socket.disconnect(); } catch (e) {}
            try { if (gameStarted) exitToLobby(); } catch (e) {}
            try { showAccountStatusBanner(); } catch (e) {}
            try { updatePlayButtonsDisabled(); } catch (e) {}
            try { if (typeof lobbyToast === 'function') lobbyToast('⛔ YOU ARE DISABLED by the admin!'); } catch (e) {}
        } catch (e) {}
    });
    // ✅ Profile accept ho gayi (ban/disable nahi hai) — purana flag saaf
    // karo, PLAY wapas enable karo (unban/enable ke baad).
    socket.on('profileAccepted', () => {
        try {
            amBanned = false; amDisabled = false;
            try { saveAccountStatus(''); } catch (e) {}
            try { hideAccountStatusBanner(); } catch (e) {}
            try { updatePlayButtonsDisabled(); } catch (e) {}
        } catch (e) {}
    });
    // 🎁 GIFT RECEIVED — admin ne diamonds/coins/skin/character bheja.
    socket.on('giftReceived', (gift) => {
        try {
            if (!gift || typeof gift !== 'object') return;
            const from = String(gift.from || 'Admin');
            if (gift.type === 'diamonds') {
                const amt = Math.floor(Number(gift.amount) || 0);
                if (amt > 0) { try { awardDiamonds(amt); } catch (e) {} }
                try { showGameNotification('🎁 ' + from + ' ne tumhe ' + amt + ' 💎 bheje!'); } catch (e) {}
                try { if (typeof lobbyToast === 'function') lobbyToast('🎁 ' + from + ' ne tumhe ' + amt + ' 💎 bheje!'); } catch (e) {}
            } else if (gift.type === 'coins') {
                const amt = Math.floor(Number(gift.amount) || 0);
                if (amt > 0) { try { awardCoins(amt); } catch (e) {} }
                try { showGameNotification('🎁 ' + from + ' ne tumhe ' + amt + ' 🪙 bheje!'); } catch (e) {}
                try { if (typeof lobbyToast === 'function') lobbyToast('🎁 ' + from + ' ne tumhe ' + amt + ' 🪙 bheje!'); } catch (e) {}
            } else if (gift.type === 'skin' || gift.type === 'character') {
                addGiftedSkin(gift);
                if (gift.type === 'character') {
                    // Character = foran equip ho jaye (skin bhi gifts me aa gayi).
                    const list = loadGiftedSkins();
                    const idx = list.findIndex((g) => String(g.code || '') === String(gift.skinCode || '') && String(g.id || '') === String(gift.skinId || ''));
                    if (idx >= 0) { try { equipGiftedSkin(idx); } catch (e) {} }
                }
                try { showGameNotification('🎁 ' + from + ' ne tumhe ' + String(gift.skinName || 'Skin') + (gift.type === 'character' ? ' character' : ' skin') + ' bheji!'); } catch (e) {}
                try { if (typeof lobbyToast === 'function') lobbyToast('🎁 ' + from + ' ne tumhe ' + String(gift.skinName || 'Skin') + (gift.type === 'character' ? ' character' : ' skin') + ' bheji! INVENTORY → GIFTS dekho.'); } catch (e) {}
                try { if (inventoryOpen) renderInventoryPanel(); } catch (e) {}
            }
        } catch (e) {}
    });
    // 👑 ADMIN — gift bheja gaya (FREE hai — admin ke balance se nahi kat-ta).
    socket.on('giftSent', (data) => {
        try {
            if (!data || !data.gift) return;
            const g = data.gift;
            const who = data.where === 'pending' ? ' (offline tha, login par milega)' : '';
            if (g.type === 'diamonds') {
                const amt = Math.floor(Number(g.amount) || 0);
                try { if (typeof lobbyToast === 'function') lobbyToast('✅ ' + amt + ' 💎 bhej diye!' + who); } catch (e) {}
            } else if (g.type === 'coins') {
                const amt = Math.floor(Number(g.amount) || 0);
                try { if (typeof lobbyToast === 'function') lobbyToast('✅ ' + amt + ' 🪙 bhej diye!' + who); } catch (e) {}
            } else {
                try { if (typeof lobbyToast === 'function') lobbyToast('✅ ' + String(g.skinName || 'Skin') + (g.type === 'character' ? ' character' : ' skin') + ' bhej di!' + who); } catch (e) {}
            }
        } catch (e) {}
    });
    socket.on('giftFailed', (data) => {
        try {
            const r = (data && data.reason) || 'unknown';
            const msg = r === 'not-admin' ? 'Sirf admin gift bhej sakta hai.' : r === 'no-player' ? 'Player nahi mila.' : r === 'bad-amount' ? 'Amount galat hai.' : r === 'bad-skin' ? 'Skin code galat hai.' : 'Gift nahi bheja gaya.';
            if (typeof lobbyToast === 'function') lobbyToast('❌ ' + msg);
        } catch (e) {}
    });
    socket.on('adminActionDone', (data) => {
        try {
            // W.W.P list server se update hogi (playersList broadcast) — popup bhi refresh hoga.
            if (typeof lobbyToast === 'function') lobbyToast('✅ Action ho gaya.');
        } catch (e) {}
    });
    socket.on('adminActionFailed', (data) => {
        try {
            const r = (data && data.reason) || 'unknown';
            const msg = r === 'not-admin' ? 'Sirf admin ye kar sakta hai.' : r === 'no-player' ? 'Player nahi mila.' : r === 'self' ? 'Khud ko ban/disable nahi kar sakte.' : 'Action nahi hua.';
            if (typeof lobbyToast === 'function') lobbyToast('❌ ' + msg);
        } catch (e) {}
    });

    socket.on('playerMoved', (data) => {
        if (otherPlayers[data.id]) {
            const p = otherPlayers[data.id];
            if (p.isDead) return;
            // 🎨 Skin bhi yahin se sync karo — server har playerMoved me
            // poora player object (skin samet) bhejta hai. Agar skin
            // join par miss ho gayi ho (ya badal gayi ho) to yahan se
            // theek ho jati hai; is se skin kabhi purani nahi rehti.
            try {
                if (typeof data.player.skin === 'string' && data.player.skin && data.player.skin !== p.skinCode) {
                    applyPlayerSkin(p, data.player.skin);
                } else if (data.player.skin === '' && p.skinCode !== '') {
                    applyPlayerSkin(p, '');
                }
            } catch (e) {}
            // 🎒 Slot 1 gun (AR-9/VITA) bhi yahin se sync karo — agar
            // player ne inventory se gun badli to uski gun bhi badal jaye.
            try {
                const ng = data.player.gun1;
                if ((ng === 'vita' || ng === 'ar9') && ng !== p.gun1) {
                    setOtherPlayerGun(data.id, ng);
                }
            } catch (e) {}
            
            // ZAMEEN PAR PAIR — asal bug ye tha: crouch me camera 1.0 tak
            // girti hai aur server wahi camera Y bhejta hai, to
            // eyeY - 1.62 seedha use karne se banda 0.62 zameen me ghus
            // jata tha. Is liye mesh ki floor hai: mesh kabhi is se
            // neeche nahi jati — bent legs pair ko upar uthate hain, utna
            // hi drop, bas. Drop/hip/knee ab lobby CROUCH POSE se aate
            // hain (Jimmy khud banata hai), hardcode nahi. Jump/crouch
            // hawa me bhi sahi rehta hai kyunki max() upar wali value
            // (hawa me) ko chhoone nahi deta.
            const crouchDropNow = crouchDrop * inGamePlayerSize * PLAYER_HEIGHT_RATIO * (p.crouchAmount || 0);
            let targetY = Math.max(data.player.y - 1.62, -crouchDropNow);
            // 💪 Pushup — zameen par leta (body zameen se thoda upar + bob).
            // pushupAmount animate me lerp hota hai, is liye smooth aata hai.
            // Height in-game editor (G) se set hoti hai (default 0.45) —
            // kam ho to banda zameen me ghus jata hai.
            const puNow = p.pushupAmount || 0;
            if (puNow > 0.01) {
                targetY = (inGamePushupHeight + (p.pushupBob || 0)) * puNow + targetY * (1 - puNow);
            }
            // Body ka yaw = look yaw (poora banda ghoomta hai, head alag nahi).
            const bodyYaw = data.player.yaw;
            p.mesh.position.set(data.player.x, targetY, data.player.z);
            p.lastYaw = bodyYaw;
            p.mesh.rotation.y = bodyYaw + Math.PI + inGamePlayerRotate * Math.PI / 180;
            p.isMoving = !!data.player.isMoving;
            p.isCrouching = !!data.player.isCrouching;
            p.isDoingPushups = !!data.player.isDoingPushups; // 💪 Pushups.
            p.lastPitch = data.player.pitch || 0;

            if (p.nameTag) {
                p.nameTag.position.set(data.player.x, targetY + 2.2, data.player.z);
            }

            if (data.player.isDashing) {
                spawnGhostShade(data.player.x, targetY, data.player.z, bodyYaw);
            }
        }
    });

    socket.on('spawnBlood', (pos) => { spawnBloodSplatter(pos); });

    socket.on('playerDied', (data) => {
        if (data.id === socket.id) {
            isDeadLocal = true;
            stopAutoShotSounds(); // 🔫 Mar gaye to AR-9 ki awaz band.
            myHealth = 0;
            camera.position.y = 0.4;
            playSound('death');
            showRespawnScreen(3);
        }
        if (otherPlayers[data.id]) {
            const p = otherPlayers[data.id];
            p.isDead = true;
        }
    });

    socket.on('playerRespawned', (data) => {
        if (data.id === socket.id) {
            isDeadLocal = false;
            myHealth = 100;
            bhopBonus = 0;
            bhopChain = 0;
            hideRespawnScreen();
            camera.position.set(data.player.x, playerHeight, data.player.z);
        }
        if (otherPlayers[data.id]) {
            const p = otherPlayers[data.id];
            p.isDead = false;
            p.lastYaw = (data.player.yaw || 0);
            p.mesh.rotation.set(0, (data.player.yaw || 0) + Math.PI + inGamePlayerRotate * Math.PI / 180, 0);
            setPlayerScale(p.mesh, inGamePlayerSize);
            p.mesh.position.set(data.player.x, data.player.y - 1.62, data.player.z);
            if (p.lastPos) p.lastPos.copy(p.mesh.position); else p.lastPos = p.mesh.position.clone();
            p.walkPhase = 0; p.walkAmount = 0;
            
            p.mesh.traverse((child) => {
                if (child.userData && child.userData.isGunHitBox) return;
                if (child.isMesh && child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.opacity = 1.0);
                    } else {
                        child.material.opacity = 1.0;
                    }
                }
            });
            if (p.nameTag && p.nameTag.material) {
                p.nameTag.material.opacity = 1.0;
                p.nameTag.visible = true;
                // Tag respawn point par wapas aaye — warna wo marne wali
                // jagah par hi reh jata hai jab tak player hile na.
                p.nameTag.position.set(data.player.x, (data.player.y - 1.62) + 2.2, data.player.z);
            }
        }
    });

    socket.on('playerHealthUpdate', (data) => {
        if (data.id === socket.id) {
            myHealth = data.health;
            updateHUD();
        }
    });

    socket.on('playerDisconnect', (id) => {
        if (otherPlayers[id]) {
            if (otherPlayers[id].gunGroup) inGameGunGroups = inGameGunGroups.filter((g) => g !== otherPlayers[id].gunGroup);
            const mesh = otherPlayers[id].mesh;
            scene.remove(mesh);
            if (otherPlayers[id].nameTag) { scene.remove(otherPlayers[id].nameTag); }
            const meshParts = [];
            mesh.traverse(child => { if (child.isMesh) meshParts.push(child); });
            targets = targets.filter(t => !meshParts.includes(t));
            delete otherPlayers[id];
        }
    });
}

// 🎯 Realistic HUD — timer aur K/D panel ko FPS jaisa look do.
// CSS ko JS se inject karte hain taake index.html badle bina style lag jaye.
let hudStylesInjected = false;
function injectHudStyles() {
    if (hudStylesInjected) return;
    if (typeof document === 'undefined') return;
    if (document.getElementById('pointerx-hud-style')) { hudStylesInjected = true; return; }
    const st = document.createElement('style');
    st.id = 'pointerx-hud-style';
    st.textContent = `
#match-timer{background:linear-gradient(180deg,rgba(8,12,26,0.94),rgba(8,12,26,0.80))!important;border:1px solid rgba(255,255,255,0.22)!important;border-bottom:3px solid #ffcc00!important;border-radius:10px!important;padding:6px 22px 8px!important;display:flex;flex-direction:column!important;align-items:center!important;line-height:1.05!important;box-shadow:0 4px 18px rgba(0,0,0,0.55)!important;min-width:110px!important;}
#match-timer .timer-label{font-size:10px!important;letter-spacing:4px!important;color:rgba(255,255,255,0.65)!important;font-weight:bold!important;margin-bottom:3px!important;}
#match-timer .timer-value{font-size:28px!important;font-weight:bold!important;color:#fff!important;font-variant-numeric:tabular-nums!important;}
#score-dots{background:linear-gradient(180deg,rgba(8,12,26,0.94),rgba(8,12,26,0.80))!important;border:1px solid rgba(255,255,255,0.18)!important;border-radius:10px!important;padding:10px 14px!important;gap:6px!important;box-shadow:0 4px 18px rgba(0,0,0,0.55)!important;min-width:160px!important;}
#score-dots .score-row{display:flex!important;justify-content:space-between!important;align-items:center!important;gap:18px!important;}
#score-dots .score-label{font-size:11px!important;letter-spacing:2px!important;color:rgba(255,255,255,0.72)!important;font-weight:bold!important;}
#score-dots .score-value{font-size:18px!important;font-weight:bold!important;font-variant-numeric:tabular-nums!important;}
#score-dots .score-dot{width:8px!important;height:8px!important;border-radius:50%!important;margin-right:7px!important;vertical-align:middle!important;display:inline-block!important;}
`;
    document.head.appendChild(st);
    hudStylesInjected = true;
}

function updateHUD() {
    // Timer lobby me kyu show ho raha tha: server har second timerUpdate
    // bhejta hai (match chal raha ho ya na ho), aur updateHUD us se
    // timer ka text update karta tha — ab lobby me (gameStarted false)
    // HUD ke saare elements chhupa do aur wapas mat dikhao.
    if (!gameStarted) {
        ['crosshair','hud','score-dots','match-timer','weapon-bar'].forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
        return;
    }
    injectHudStyles();
    let hud = document.getElementById('hud');
    const kdRatio = myDeaths === 0 ? myKills.toFixed(2) : (myKills / myDeaths).toFixed(2);

    if (hud) {
        const ammoText = currentWeapon === 3 ? '—' : '30 / 30';
        hud.innerHTML = `PLAYER: ${playerName}<br>` +
                        `HEALTH: ${myHealth} | AMMO: ${ammoText}`;
    }

    let dots = document.getElementById('score-dots');
    if (!dots) {
        dots = document.createElement('div');
        dots.id = 'score-dots';
        dots.style.position = 'absolute';
        dots.style.top = '20px';
        dots.style.left = '20px';
        dots.style.display = 'flex';
        dots.style.flexDirection = 'column';
        dots.style.gap = '4px';
        dots.style.fontFamily = 'monospace';
        dots.style.fontSize = '16px';
        dots.style.fontWeight = 'bold';
        dots.style.textShadow = '2px 2px black';
        dots.style.zIndex = '100';
        dots.style.pointerEvents = 'none';
        document.body.appendChild(dots);
    }
    
    let timerEl = document.getElementById('match-timer');
    if (!timerEl) {
        timerEl = document.createElement('div');
        timerEl.id = 'match-timer';
        timerEl.style.position = 'absolute';
        timerEl.style.top = '20px';
        timerEl.style.left = '50%';
        timerEl.style.transform = 'translateX(-50%)';
        timerEl.style.background = '#000';
        timerEl.style.color = '#fff';
        timerEl.style.padding = '8px 28px';
        timerEl.style.fontFamily = 'monospace';
        timerEl.style.fontSize = '28px';
        timerEl.style.fontWeight = 'bold';
        timerEl.style.zIndex = '100';
        timerEl.style.pointerEvents = 'none';
        document.body.appendChild(timerEl);
    }
    timerEl.innerHTML = `<span class="timer-label">TIME</span><span class="timer-value">${matchTimerString}</span>`;

    dots.innerHTML =
        `<div class="score-row"><span class="score-label"><span class="score-dot" style="background:#00ff66;"></span>KILLS</span><span class="score-value" style="color:#00ff66;">${myKills}</span></div>` +
        `<div class="score-row"><span class="score-label"><span class="score-dot" style="background:#ff4444;"></span>DEATHS</span><span class="score-value" style="color:#ff4444;">${myDeaths}</span></div>` +
        `<div class="score-row"><span class="score-label"><span class="score-dot" style="background:#ffcc00;"></span>K / D</span><span class="score-value" style="color:#ffcc00;">${kdRatio}</span></div>`;
}

function showGameNotification(message) {
    let notif = document.getElementById('game-notif');
    if (!notif) {
        notif = document.createElement('div');
        notif.id = 'game-notif';
        notif.style.position = 'absolute';
        notif.style.top = '80px';
        notif.style.left = '50%';
        notif.style.transform = 'translateX(-50%)';
        notif.style.background = 'rgba(0, 0, 0, 0.6)';
        notif.style.color = '#00ffcc';
        notif.style.padding = '8px 16px';
        notif.style.borderRadius = '5px';
        notif.style.fontFamily = 'monospace';
        notif.style.fontSize = '14px';
        notif.style.fontWeight = 'bold';
        notif.style.zIndex = '100';
        document.body.appendChild(notif);
    }
    notif.innerText = message;
    notif.style.opacity = '1';
    setTimeout(() => { notif.style.opacity = '0'; }, 3500);
}

// 🏁 MATCH END — rewards + results panel.
// Rewards (XP/coins/kills) match ke dauran sirf PENDING me jama hote hain.
// Match end par commit hote hain (save). Beech me match chhor diya
// (EXIT / disconnect / tab band) to pending zaya — kuch save nahi hota.
function commitMatchRewards() {
    const xp = matchPendingXP, coins = matchPendingCoins, kills = matchKills;
    if (xp > 0) { try { awardXP(xp); } catch (e) {} }
    if (coins > 0) { try { awardCoins(coins); } catch (e) {} }
    if (kills > 0) { totalLifetimeKills += kills; try { saveXP(); } catch (e) {} }
    try { updateLevelDisplay(); } catch (e) {}
}
function discardMatchRewards() {
    // Beech me chhor diya — pending rewards + is match ke stats zaya.
    matchPendingXP = 0; matchPendingCoins = 0;
    matchKills = 0; matchDeaths = 0; matchShots = 0; matchHits = 0;
    myMatchStats = null;
}
function matchAccuracy() {
    if (!matchShots || matchShots <= 0) return 0;
    return Math.round((matchHits / matchShots) * 100);
}
function ordinal(n) {
    n = Math.max(1, Math.round(n || 1));
    if (n === 1) return '1st';
    if (n === 2) return '2nd';
    if (n === 3) return '3rd';
    return n + 'th';
}
function matchKDR(kills, deaths) {
    kills = kills || 0; deaths = deaths || 0;
    return deaths === 0 ? Number(kills).toFixed(2) : (kills / deaths).toFixed(2);
}
function showMatchResults(board) {
    if (typeof document === 'undefined') return;
    matchResultsOpen = true;
    try { document.exitPointerLock(); } catch (e) {}
    // Blocker (Click to Start) results panel ke peeche na aaye.
    try { const b = document.getElementById('blocker'); if (b) b.style.display = 'none'; } catch (e) {}
    let overlay = document.getElementById('match-results-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'match-results-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.78);z-index:500;display:flex;align-items:center;justify-content:center;font-family:monospace;';
        overlay.innerHTML = `
            <div style="width:min(660px,94vw);max-height:88vh;overflow-y:auto;background:#0a1a4a;border:2px solid #ffd700;border-radius:12px;padding:18px;color:#fff;">
                <div style="text-align:center;font-size:22px;font-weight:900;color:#ffd700;">🏁 MATCH KHATAM!</div>
                <div id="match-results-rank" style="text-align:center;font-size:16px;color:#00ff88;margin-top:4px;"></div>
                <div id="match-results-list" style="margin-top:12px;"></div>
                <div style="display:flex;gap:10px;margin-top:16px;">
                    <button id="match-results-continue" style="flex:1;padding:12px;font-size:15px;font-weight:900;background:#00ff88;color:#111;border:none;border-radius:8px;cursor:pointer;">▶ CONTINUE</button>
                    <button id="match-results-lobby" style="flex:1;padding:12px;font-size:15px;font-weight:900;background:#2a6cff;color:#fff;border:none;border-radius:8px;cursor:pointer;">🏠 LOBBY</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);
        const cont = document.getElementById('match-results-continue');
        if (cont) cont.addEventListener('click', () => {
            hideMatchResults();
            try { document.body.requestPointerLock(); } catch (e) {}
        });
        const lob = document.getElementById('match-results-lobby');
        if (lob) lob.addEventListener('click', () => { hideMatchResults(); try { exitToLobby(); } catch (e) {} });
    }
    overlay.style.display = 'flex';
    renderMatchResults(board);
}
function hideMatchResults() {
    matchResultsOpen = false;
    try { const o = document.getElementById('match-results-overlay'); if (o) o.style.display = 'none'; } catch (e) {}
}
function renderMatchResults(board) {
    if (typeof document === 'undefined') return;
    const listEl = document.getElementById('match-results-list');
    const rankEl = document.getElementById('match-results-rank');
    if (!listEl) return;
    const rows = Array.isArray(board) ? board : [];
    // Apni row dhoondo (socket id se; na mile to apne #ID se).
    const myId = (typeof socket !== 'undefined' && socket && socket.id) ? socket.id : '';
    let myRank = 0;
    rows.forEach((p, i) => { if ((p.socketId && p.socketId === myId) || (p.playerId && p.playerId === getMyPlayerId())) myRank = i + 1; });
    if (!myRank && myMatchStats) {
        // Server board abhi nahi aaya — apne stats se rank nahi pata, bas apni row dikhao.
    }
    if (rankEl) {
        rankEl.textContent = myRank > 0 ? `Tum ${ordinal(myRank)} ho! ${myRank === 1 ? '🎉' : ''}` : (myMatchStats ? 'Results aa rahe hain...' : '');
    }
    if (!rows.length) {
        // Board abhi nahi aaya — sirf apne stats dikhao.
        if (myMatchStats) {
            const s = myMatchStats;
            const acc = (s.shots > 0) ? Math.round((s.hits / s.shots) * 100) : 0;
            listEl.innerHTML = matchResultsRowHtml({ name: myProfileName(), playerId: getMyPlayerId(), kills: s.kills, deaths: s.deaths, coins: s.coins, accuracy: acc, pfp: myProfilePfp() }, 0, true);
        } else {
            listEl.innerHTML = '<div style="color:#aaa;text-align:center;padding:14px;">Results aa rahe hain...</div>';
        }
        return;
    }
    listEl.innerHTML = rows.map((p, i) => matchResultsRowHtml(p, i + 1, (p.socketId && p.socketId === myId) || (p.playerId && p.playerId === getMyPlayerId()))).join('');
}
function matchResultsRowHtml(p, rank, isMe) {
    const nm = String(p.name || 'Player');
    const pid = String(p.playerId || '?????');
    const kills = p.kills || 0, deaths = p.deaths || 0;
    const coins = (typeof p.coins === 'number') ? p.coins : (kills * 100 + deaths * 10);
    const acc = (p.accuracy === null || typeof p.accuracy === 'undefined') ? '—' : (p.accuracy + '%');
    const pfp = String(p.pfp || '');
    const img = pfp
        ? '<img src="' + escapeHtml(pfp) + '" style="width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0;" alt="">'
        : '<div style="width:36px;height:36px;border-radius:50%;background:#334155;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:16px;flex-shrink:0;">' + escapeHtml(nm.charAt(0).toUpperCase()) + '</div>';
    const border = isMe ? '#ffd700' : '#333';
    const bg = isMe ? 'rgba(255,215,0,0.12)' : 'rgba(255,255,255,0.06)';
    return '<div style="display:flex;align-items:center;gap:8px;background:' + bg + ';border:1px solid ' + border + ';border-radius:8px;padding:8px;margin-top:6px;">'
        + '<div style="width:44px;text-align:center;font-size:15px;font-weight:900;color:' + (rank === 1 ? '#ffd700' : rank === 2 ? '#c0c0c0' : rank === 3 ? '#cd7f32' : '#fff') + ';">' + ordinal(rank) + '</div>'
        + img
        + '<div style="flex:1;min-width:0;">'
        + '<div style="font-size:13px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + escapeHtml(nm) + ' <span style="color:#ffd700;">#' + escapeHtml(pid) + '</span>' + (isMe ? ' <span style="color:#00ff88;">(YOU)</span>' : '') + '</div>'
        + '<div style="font-size:11px;color:#aaa;">KDR ' + matchKDR(kills, deaths) + ' • 💰 ' + coins + ' coins • 🎯 ' + acc + '</div>'
        + '</div>'
        + '<div style="text-align:right;font-size:12px;line-height:1.5;"><div><span style="color:#00ff66;">K ' + kills + '</span></div><div><span style="color:#ff4444;">D ' + deaths + '</span></div></div>'
        + '</div>';
}

function createNameTag(name) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMaterial);
    // Canvas 256x64 hai (4:1), is liye sprite ka scale bhi 4:1 rakha hai.
    // Bina scale ke sprite 1x1 square hota hai aur naam khinch kar
    // stretched dikhta hai — ye scale purane working version wala hai.
    sprite.scale.set(1.2, 0.3, 1);
    return sprite;
}

function showRespawnScreen(secondsLeft) {
    let respawnDiv = document.getElementById('respawn-screen');
    if (!respawnDiv) {
        respawnDiv = document.createElement('div');
        respawnDiv.id = 'respawn-screen';
        respawnDiv.style.position = 'absolute';
        respawnDiv.style.top = '50%';
        respawnDiv.style.left = '50%';
        respawnDiv.style.transform = 'translate(-50%, -50%)';
        respawnDiv.style.color = 'red';
        respawnDiv.style.fontFamily = 'monospace';
        respawnDiv.style.fontSize = '36px';
        respawnDiv.style.fontWeight = 'bold';
        respawnDiv.style.textShadow = '2px 2px black';
        respawnDiv.style.zIndex = '1000';
        respawnDiv.style.transition = 'opacity 0.5s ease';
        respawnDiv.style.opacity = '1';
        document.body.appendChild(respawnDiv);
    }

    if (secondsLeft <= 0) {
        hideRespawnScreen();
        return;
    }

    respawnDiv.innerText = `YOU DIED! Respawning in ${secondsLeft}s...`;
    setTimeout(() => { showRespawnScreen(secondsLeft - 1); }, 1000);
}

function hideRespawnScreen() {
    const respawnDiv = document.getElementById('respawn-screen');
    if (respawnDiv) {
        respawnDiv.style.opacity = '0';
        setTimeout(() => { respawnDiv.remove(); }, 500);
    }
    updateHUD();
}

function spawnBloodSplatter(pos) {
    if (!pos) return;
    const particleCount = 14;
    const geometry = new THREE.BoxGeometry(0.08, 0.08, 0.08);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });

    for (let i = 0; i < particleCount; i++) {
        const particle = new THREE.Mesh(geometry, material);
        particle.position.set(pos.x, pos.y, pos.z);
        const vel = new THREE.Vector3(
            (Math.random() - 0.5) * 5, 
            Math.random() * 4 + 1.5, 
            (Math.random() - 0.5) * 5
        );
        scene.add(particle);
        bloodParticles.push({ mesh: particle, velocity: vel, life: 0.5 });
    }
}

function spawnGhostShade(x, y, z, rotY) {
    const ghostGroup = new THREE.Group();
    const ghostMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.5 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.75, 0.25), ghostMat);
    body.position.y = 1.125;
    ghostGroup.add(body);
    ghostGroup.position.set(x, y, z);
    ghostGroup.rotation.y = rotY;
    scene.add(ghostGroup);

    let fadeLife = 0.3;
    const fadeInterval = setInterval(() => {
        fadeLife -= 0.05;
        ghostMat.opacity = fadeLife;
        if (fadeLife <= 0) {
            clearInterval(fadeInterval);
            scene.remove(ghostGroup);
        }
    }, 30);
}

function createMap() {
    const arenaSize = 500;
    const floorGeo = new THREE.PlaneGeometry(arenaSize, arenaSize);
    const textureLoader = new THREE.TextureLoader();
    const groundTexture = textureLoader.load('ground-texture.png', (texture) => {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(50, 50);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
    });

    // 🌿 Floor lobby ki grass jaisa — green tint (pehle grey 0x555555 tha).
    const floorMat = new THREE.MeshStandardMaterial({ map: groundTexture, color: 0x5a8a4a });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true; // 🌑 Zameen shadows leti hai (player/trees/crates).
    scene.add(floor);

    const wallHeight = 10;
    const wallThickness = 2;
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b });

    const wallN = new THREE.Mesh(new THREE.BoxGeometry(arenaSize, wallHeight, wallThickness), wallMat);
    wallN.position.set(0, wallHeight / 2, -arenaSize / 2);
    wallN.castShadow = true; wallN.receiveShadow = true;
    scene.add(wallN);
    const wallS = new THREE.Mesh(new THREE.BoxGeometry(arenaSize, wallHeight, wallThickness), wallMat);
    wallS.position.set(0, wallHeight / 2, arenaSize / 2);
    wallS.castShadow = true; wallS.receiveShadow = true;
    scene.add(wallS);
    const wallE = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallHeight, arenaSize), wallMat);
    wallE.position.set(arenaSize / 2, wallHeight / 2, 0);
    wallE.castShadow = true; wallE.receiveShadow = true;
    scene.add(wallE);
    const wallW = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallHeight, arenaSize), wallMat);
    wallW.position.set(-arenaSize / 2, wallHeight / 2, 0);
    wallW.castShadow = true; wallW.receiveShadow = true;
    scene.add(wallW);

    const boxGeo = new THREE.BoxGeometry(2, 2, 2);
    const boxMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b });
    for (let i = 0; i < 40; i++) {
        const crate = new THREE.Mesh(boxGeo, boxMat);
        crate.position.set((Math.random() - 0.5) * (arenaSize - 40), 1, (Math.random() - 0.5) * (arenaSize - 40));
        crate.castShadow = true; crate.receiveShadow = true;
        scene.add(crate);
    }
}

// 🔫 AR-9 — asli jaisi gun (texture wali tan + black). Boxes/cylinders
// se bani hai (koi 3D model file nahi), taake har jagah ek jaisi dikhe:
// first-person rifle, lobby gun, aur doosre players ki gun.
// Local space: forward = +Z (muzzle +Z par), origin gun ke centre par.
// Rang texture se liye hain: tan (FDE) + black + dark grey.
function buildAR9Gun() {
    const g = new THREE.Group();
    const tan = new THREE.MeshStandardMaterial({ color: 0xC9A06B, roughness: 0.6, metalness: 0.2 });
    const black = new THREE.MeshStandardMaterial({ color: 0x1C1C1C, roughness: 0.45, metalness: 0.4 });
    const darkGrey = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5, metalness: 0.3 });
    const metal = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.35, metalness: 0.7 });
    const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => {
        const m = new THREE.Mesh(geo, mat);
        m.position.set(x, y, z);
        if (rx) m.rotation.x = rx;
        if (ry) m.rotation.y = ry;
        if (rz) m.rotation.z = rz;
        g.add(m);
        return m;
    };
    // Upper receiver (tan) + lower receiver (black)
    add(new THREE.BoxGeometry(0.09, 0.09, 0.26), tan, 0, 0.03, -0.05);
    add(new THREE.BoxGeometry(0.09, 0.07, 0.22), black, 0, -0.045, -0.05);
    // Handguard (tan) + top/side rails (black)
    add(new THREE.BoxGeometry(0.10, 0.08, 0.26), tan, 0, 0.03, 0.21);
    add(new THREE.BoxGeometry(0.10, 0.015, 0.26), black, 0, 0.077, 0.21);
    add(new THREE.BoxGeometry(0.006, 0.03, 0.20), black, 0.052, 0.03, 0.21);
    add(new THREE.BoxGeometry(0.006, 0.03, 0.20), black, -0.052, 0.03, 0.21);
    // Barrel (metal) + muzzle brake (black) — muzzle tip z +0.53
    add(new THREE.CylinderGeometry(0.018, 0.018, 0.14, 12), metal, 0, 0.03, 0.41, Math.PI / 2);
    add(new THREE.CylinderGeometry(0.028, 0.028, 0.06, 12), black, 0, 0.03, 0.50, Math.PI / 2);
    // Magazine (black, halki tilt) + stock + buttplate (black)
    add(new THREE.BoxGeometry(0.06, 0.18, 0.08), black, 0, -0.15, 0.02, 0.12);
    add(new THREE.BoxGeometry(0.08, 0.11, 0.18), black, 0, 0.01, -0.28);
    add(new THREE.BoxGeometry(0.085, 0.13, 0.025), darkGrey, 0, 0.01, -0.38);
    // Pistol grip (angled) + trigger + trigger guard (black)
    add(new THREE.BoxGeometry(0.06, 0.12, 0.07), black, 0, -0.12, -0.12, 0.35);
    add(new THREE.BoxGeometry(0.015, 0.04, 0.015), black, 0, -0.09, 0.0);
    add(new THREE.BoxGeometry(0.015, 0.015, 0.09), black, 0, -0.11, 0.0);
    // Front sight + rear sight + charging handle (black)
    add(new THREE.BoxGeometry(0.025, 0.045, 0.02), black, 0, 0.10, 0.30);
    add(new THREE.BoxGeometry(0.035, 0.035, 0.025), black, 0, 0.10, -0.12);
    add(new THREE.BoxGeometry(0.09, 0.015, 0.03), black, 0, 0.075, -0.14);
    // Ejection port (right side, dark inset)
    add(new THREE.BoxGeometry(0.004, 0.035, 0.07), darkGrey, 0.047, 0.03, 0.02);
    // Foregrip (black, handguard ke neeche)
    add(new THREE.BoxGeometry(0.05, 0.10, 0.06), black, 0, -0.07, 0.28, 0.15);
    return g;
}

// 🔭 VITA SNIPER (VITA-texture.webp) — texture khud ek UV atlas hai, kisi
// 3D model ke liye; model file ke baghair apply nahi hoti. Is liye VITA
// texture ke rangon + shape se primitives se banayi hai: desert tan/gold
// camo body + stock, grey-blue camo barrel + scope, kaale details, neeli
// scope lens. Lambi sniper — barrel + scope, bipod, bolt handle.
// Forward +Z (AR-9 jaisi), muzzle tip z +0.75.
function buildVitaSniper() {
    const g = new THREE.Group();
    const tan = new THREE.MeshStandardMaterial({ color: 0xC8954A, roughness: 0.6, metalness: 0.15 });
    const tanDark = new THREE.MeshStandardMaterial({ color: 0xA67A35, roughness: 0.65, metalness: 0.15 });
    const greyBlue = new THREE.MeshStandardMaterial({ color: 0x8A9BAE, roughness: 0.5, metalness: 0.4 });
    const greyBlueDark = new THREE.MeshStandardMaterial({ color: 0x6B7D90, roughness: 0.55, metalness: 0.4 });
    const black = new THREE.MeshStandardMaterial({ color: 0x1C1C1C, roughness: 0.45, metalness: 0.4 });
    const metal = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.35, metalness: 0.7 });
    const lensBlue = new THREE.MeshStandardMaterial({ color: 0x1A3A5C, roughness: 0.1, metalness: 0.9 });
    const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => {
        const m = new THREE.Mesh(geo, mat);
        m.position.set(x, y, z);
        if (rx) m.rotation.x = rx;
        if (ry) m.rotation.y = ry;
        if (rz) m.rotation.z = rz;
        g.add(m);
        return m;
    };
    // Receiver (tan) + stock (tan, cheek rest ke saath)
    add(new THREE.BoxGeometry(0.09, 0.10, 0.30), tan, 0, 0.02, -0.08);
    add(new THREE.BoxGeometry(0.08, 0.12, 0.22), tan, 0, 0.0, -0.32);
    add(new THREE.BoxGeometry(0.085, 0.05, 0.20), tanDark, 0, 0.08, -0.30); // cheek rest
    add(new THREE.BoxGeometry(0.085, 0.13, 0.03), black, 0, 0.0, -0.44); // buttplate
    // Long barrel (grey-blue) + muzzle brake (black) — muzzle tip z +0.75
    add(new THREE.CylinderGeometry(0.022, 0.022, 0.42, 12), greyBlue, 0, 0.03, 0.35, Math.PI / 2);
    add(new THREE.CylinderGeometry(0.032, 0.032, 0.07, 12), black, 0, 0.03, 0.58, Math.PI / 2);
    add(new THREE.CylinderGeometry(0.026, 0.026, 0.05, 12), greyBlueDark, 0, 0.03, 0.63, Math.PI / 2);
    // Handguard (grey-blue) + top rail (black)
    add(new THREE.BoxGeometry(0.09, 0.08, 0.24), greyBlue, 0, 0.03, 0.18);
    add(new THREE.BoxGeometry(0.09, 0.015, 0.24), black, 0, 0.077, 0.18);
    // Scope (grey-blue tube) + mounts (black) + blue lens (front)
    add(new THREE.CylinderGeometry(0.035, 0.035, 0.22, 12), greyBlue, 0, 0.13, -0.02, Math.PI / 2);
    add(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 12), black, 0, 0.13, 0.10, Math.PI / 2);
    add(new THREE.CylinderGeometry(0.028, 0.028, 0.01, 12), lensBlue, 0, 0.13, 0.115, Math.PI / 2);
    add(new THREE.BoxGeometry(0.03, 0.05, 0.03), black, 0, 0.10, -0.08);
    add(new THREE.BoxGeometry(0.03, 0.05, 0.03), black, 0, 0.10, 0.04);
    // Magazine (tan, extended) + pistol grip (black, angled)
    add(new THREE.BoxGeometry(0.06, 0.20, 0.09), tanDark, 0, -0.16, -0.02, 0.08);
    add(new THREE.BoxGeometry(0.06, 0.12, 0.07), black, 0, -0.12, -0.16, 0.35);
    // Trigger + trigger guard (black)
    add(new THREE.BoxGeometry(0.015, 0.04, 0.015), black, 0, -0.09, -0.06);
    add(new THREE.BoxGeometry(0.015, 0.015, 0.09), black, 0, -0.11, -0.06);
    // Bolt handle (metal, right side) + bolt (metal)
    add(new THREE.CylinderGeometry(0.012, 0.012, 0.08, 8), metal, 0.055, 0.03, -0.10, 0, 0, Math.PI / 2);
    add(new THREE.SphereGeometry(0.018, 10, 8), black, 0.095, 0.03, -0.10);
    // Bipod (grey-blue, front neeche — folded legs)
    add(new THREE.BoxGeometry(0.02, 0.16, 0.02), greyBlueDark, 0.05, -0.10, 0.30, 0.25);
    add(new THREE.BoxGeometry(0.02, 0.16, 0.02), greyBlueDark, -0.05, -0.10, 0.30, -0.25);
    add(new THREE.BoxGeometry(0.12, 0.02, 0.03), black, 0, -0.03, 0.30);
    return g;
}

// 🔫 REVOLVER — classic 6-shot revolver, gunmetal + kaala grip.
// Cylinder (chambers ke saath), lambi barrel, hammer, trigger.
// Forward +Z (AR-9 jaisi), muzzle tip z +0.45.
function buildRevolver() {
    const g = new THREE.Group();
    const gunmetal = new THREE.MeshStandardMaterial({ color: 0x3A3A3A, roughness: 0.35, metalness: 0.75 });
    const darkSteel = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.4, metalness: 0.6 });
    const metal = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.3, metalness: 0.8 });
    const gripWood = new THREE.MeshStandardMaterial({ color: 0x5C3A21, roughness: 0.7, metalness: 0.1 });
    const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => {
        const m = new THREE.Mesh(geo, mat);
        m.position.set(x, y, z);
        if (rx) m.rotation.x = rx;
        if (ry) m.rotation.y = ry;
        if (rz) m.rotation.z = rz;
        g.add(m);
        return m;
    };
    // Frame (gunmetal) + top strap
    add(new THREE.BoxGeometry(0.07, 0.08, 0.22), gunmetal, 0, 0.02, 0.02);
    add(new THREE.BoxGeometry(0.05, 0.015, 0.20), darkSteel, 0, 0.065, 0.02);
    // Cylinder (6 chambers — dark holes front par)
    add(new THREE.CylinderGeometry(0.045, 0.045, 0.12, 16), gunmetal, 0, 0.02, 0.06, Math.PI / 2);
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        add(new THREE.CylinderGeometry(0.008, 0.008, 0.125, 6), darkSteel, Math.cos(a) * 0.028, 0.02 + Math.sin(a) * 0.028, 0.06, Math.PI / 2);
    }
    // Barrel (gunmetal) + front sight (metal)
    add(new THREE.CylinderGeometry(0.02, 0.02, 0.20, 12), gunmetal, 0, 0.03, 0.22, Math.PI / 2);
    add(new THREE.BoxGeometry(0.01, 0.03, 0.015), metal, 0, 0.06, 0.30);
    // Grip (wood, angled) + hammer (metal) + trigger (metal)
    add(new THREE.BoxGeometry(0.06, 0.14, 0.07), gripWood, 0, -0.10, -0.10, 0.35);
    add(new THREE.BoxGeometry(0.015, 0.05, 0.02), metal, 0, 0.08, -0.08, -0.5);
    add(new THREE.BoxGeometry(0.012, 0.035, 0.012), metal, 0, -0.06, -0.05);
    add(new THREE.BoxGeometry(0.012, 0.012, 0.07), metal, 0, -0.08, -0.05);
    return g;
}

function createGun() {
    const gunGroup = new THREE.Group();
    // 🔫 AR-9 (tan + black) — first-person rifle. AR-9 forward +Z par
    // banti hai, is liye Y 180° ghumao taake muzzle camera se aage (-Z) jaye.
    const ar9 = buildAR9Gun();
    ar9.position.set(0.25, -0.25, -0.5);
    ar9.rotation.y = Math.PI;
    // 🔫 Size lobby gun wali (lobbyGunScale) — game me bhi wahi size.
    ar9.scale.set(lobbyGunScale, lobbyGunScale, lobbyGunScale);
    firstPersonAR9 = ar9;
    gunGroup.add(ar9);
    // 🔭 VITA SNIPER — slot 1 ki doosri gun. AR-9 jaisi position/rotation
    // (muzzle -Z). Sirf tab dikhti hai jab equippedGun1 === 'vita'.
    const vita = buildVitaSniper();
    vita.position.set(0.25, -0.25, -0.5);
    vita.rotation.y = Math.PI;
    vita.scale.set(lobbyGunScale, lobbyGunScale, lobbyGunScale);
    firstPersonVita = vita;
    gunGroup.add(vita);

    // Muzzle flash — naye muzzle (z ≈ -1.03) par. Neon hata diya,
    // flash ab orange hai (asli muzzle flash jaisa). VITA lambi hai,
    // is liye uska flash z -1.18 par (applyEquippedGuns set karta hai).
    muzzleFlash = new THREE.Mesh(new THREE.SphereGeometry(0.06), new THREE.MeshBasicMaterial({ color: 0xffaa00 }));
    muzzleFlash.position.set(0.25, -0.22, -1.05);
    muzzleFlash.visible = false;
    gunGroup.add(muzzleFlash);

    // 🌑 Gun ka shadow (haath wali gun zameen par shadow daalti hai).
    gunGroup.traverse((child) => { if (child.isMesh && child.visible) child.castShadow = true; });

    gun = gunGroup;
    camera.add(gun);
    scene.add(camera);
}

// 🔫 Pistol (Glock type) — slot 2. Chhoti gun, camera ke saath.
function createPistol() {
    const g = new THREE.Group();
    // Pistol ke parts ek sub-group me (taake revolver se switch kar saken).
    const pistolParts = new THREE.Group();
    const dark = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.35 });
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.34), dark);
    slide.position.set(0.22, -0.22, -0.45);
    pistolParts.add(slide);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.1), new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5 }));
    grip.position.set(0.22, -0.34, -0.32);
    grip.rotation.x = 0.25;
    pistolParts.add(grip);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.12), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0.22, -0.2, -0.65);
    pistolParts.add(barrel);
    g.add(pistolParts);
    firstPersonPistolParts = pistolParts;
    // 🔫 REVOLVER — slot 2 ki doosri gun. Pistol jaisi position (muzzle
    // -Z). Sirf tab dikhti hai jab equippedGun2 === 'revolver'.
    const revolver = buildRevolver();
    revolver.position.set(0.22, -0.22, -0.45);
    revolver.rotation.y = Math.PI;
    firstPersonRevolver = revolver;
    g.add(revolver);
    pistolMuzzleFlash = new THREE.Mesh(new THREE.SphereGeometry(0.05), new THREE.MeshBasicMaterial({ color: 0x00d2ff }));
    pistolMuzzleFlash.position.set(0.22, -0.2, -0.72);
    pistolMuzzleFlash.visible = false;
    g.add(pistolMuzzleFlash);
    // 🌑 Pistol ka shadow.
    g.traverse((child) => { if (child.isMesh && child.visible) child.castShadow = true; });
    pistol = g;
    pistol.visible = false;
    camera.add(pistol);
    scene.add(camera);
}

// 🔪 Knife — slot 3. Screenshot wali combat knife style: kaala handle,
// guard, chaandi (silver) blade jis ki peeth par serration (daant) hain,
// aur blade tirchha (diagonal) pakda hua — jaise photo me hai.
function createKnife() {
    const g = new THREE.Group();
    // 🔪 BAYONET (Bayonet-texture.webp) — texture khud ek UV atlas hai, kisi
    // 3D model ke liye; model file ke baghair apply nahi hoti. Is liye
    // bayonet texture ke rangon + shape se primitives se banayi hai:
    // halki steel-blue lambi blade, clip-point nok, peeth par serrations,
    // fuller groove, kaala segmented grip, guard + muzzle ring, gol pommel.
    const bladeSteel = new THREE.MeshStandardMaterial({ color: 0xb9c9de, roughness: 0.15, metalness: 0.8 });
    const edgeSteel = new THREE.MeshStandardMaterial({ color: 0xe8eef5, roughness: 0.1, metalness: 0.85 });
    const darkSteel = new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.25, metalness: 0.7 });
    const fullerMat = new THREE.MeshStandardMaterial({ color: 0x6a7480, roughness: 0.3, metalness: 0.7 });
    const gripMat = new THREE.MeshStandardMaterial({ color: 0x161616, roughness: 0.75 });
    const gripPanelMat = new THREE.MeshStandardMaterial({ color: 0x2e2e2e, roughness: 0.6 });
    const pommelMat = new THREE.MeshStandardMaterial({ color: 0x0d0d0d, roughness: 0.5 });
    // Handle (kaala grip)
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.06, 0.22), gripMat);
    handle.position.set(0, 0, 0);
    g.add(handle);
    // Grip segments — texture wale square panels (har side 3).
    for (let s = 0; s < 3; s++) {
        for (const sx of [-1, 1]) {
            const seg = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.05, 0.05), gripPanelMat);
            seg.position.set(sx * 0.0295, 0, -0.07 + s * 0.07);
            g.add(seg);
        }
    }
    // Pommel (gol cap — texture ke round pommel jaisa)
    const pommel = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.03, 20), pommelMat);
    pommel.rotation.x = Math.PI / 2;
    pommel.position.set(0, 0, 0.125);
    g.add(pommel);
    // Guard (crossguard — handle aur blade ke beech)
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.025, 0.04), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4 }));
    guard.position.set(0, 0, -0.12);
    g.add(guard);
    // Muzzle ring (bayonet ki pehchan — guard ke aage gol ring)
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.008, 8, 24), darkSteel);
    ring.position.set(0, 0.01, -0.145);
    g.add(ring);
    // Blade (lambi, chaudi — bayonet combat knife se lambi hoti hai)
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.014, 0.5), bladeSteel);
    blade.position.set(0, 0.01, -0.39);
    g.add(blade);
    // Fuller (blade ke beech wali groove line)
    const fuller = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.004, 0.4), fullerMat);
    fuller.position.set(0, 0.018, -0.39);
    g.add(fuller);
    // Cutting edge (chamkeeli dhaar, neeche wali edge)
    const edge = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.006, 0.5), edgeSteel);
    edge.position.set(0, 0.004, -0.39);
    g.add(edge);
    // Serration — blade ki peeth (upar wali edge) par 7 daant (blade lambi
    // hai, is liye purani 5 ki jagah 7).
    for (let i = 0; i < 7; i++) {
        const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.02, 0.024), darkSteel);
        tooth.position.set(0, 0.024, -0.2 - i * 0.04);
        g.add(tooth);
    }
    // Clip-point tip (nok — peeth jhuk kar dhaar se milti hai)
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.014, 0.16), bladeSteel);
    tip.position.set(0, 0.016, -0.69);
    tip.rotation.x = -0.38;
    g.add(tip);
    // Diagonal hold — jaise pehle tha (blade upar-right ki taraf).
    g.position.set(0.18, -0.3, -0.55);
    g.rotation.set(KNIFE_BASE_ROT.x, 0, KNIFE_BASE_ROT.z);
    // 🌑 Knife ka shadow.
    g.traverse((child) => { if (child.isMesh && child.visible) child.castShadow = true; });
    knife = g;
    knife.visible = false;
    camera.add(knife);
    scene.add(camera);
}

// 🔫 Weapon switch — 1 = Rifle, 2 = Pistol, 3 = Knife.
function switchWeapon(n) {
    if (!gameStarted || isDeadLocal) return;
    if (n === currentWeapon) return;
    if (n < 1 || n > 3) return;
    stopAutoShotSounds(); // 🔫 Weapon badla to AR-9 ki awaz band (daba hua button bhi).
    currentWeapon = n;
    // 💪 Pushups me gun nahi dikhti (chahe weapon switch karo).
    if (gun) gun.visible = (n === 1) && !isDoingPushups;
    if (pistol) pistol.visible = (n === 2) && !isDoingPushups;
    if (knife) { knife.visible = (n === 3) && !isDoingPushups; knife.rotation.set(KNIFE_BASE_ROT.x, 0, KNIFE_BASE_ROT.z); }
    knifeSwing = 0;
    updateWeaponBar();
    updateHUD();
}

// 🎒 Weapon slot bar — bottom center, 3 boxes (1/2/3), active highlight.
function createWeaponBar() {
    if (weaponBarBuilt) return;
    if (typeof document === 'undefined') return;
    if (document.getElementById('weapon-bar')) { weaponBarBuilt = true; return; }
    const bar = document.createElement('div');
    bar.id = 'weapon-bar';
    bar.innerHTML =
        `<div class="weapon-slot" data-slot="1"><span class="weapon-num">1</span><span class="weapon-name">RIFLE</span></div>` +
        `<div class="weapon-slot" data-slot="2"><span class="weapon-num">2</span><span class="weapon-name">PISTOL</span></div>` +
        `<div class="weapon-slot" data-slot="3"><span class="weapon-num">3</span><span class="weapon-name">KNIFE</span></div>`;
    document.body.appendChild(bar);
    weaponBarBuilt = true;
    updateWeaponBar();
}
function updateWeaponBar() {
    const bar = document.getElementById('weapon-bar');
    if (!bar) return;
    // 🎒 Slot names equipped guns se — VITA equip ho to slot 1 'VITA'
    // dikhaye (AR-9 ki jagah), revolver ho to slot 2 'REVOLVER'.
    const names = { 1: (equippedGun1 === 'vita' ? 'VITA' : 'AR-9'), 2: (equippedGun2 === 'revolver' ? 'REVOLVER' : 'PISTOL'), 3: 'KNIFE' };
    bar.querySelectorAll('.weapon-slot').forEach((slot) => {
        const n = parseInt(slot.getAttribute('data-slot'), 10);
        if (n === currentWeapon) slot.classList.add('active');
        else slot.classList.remove('active');
        const nameEl = slot.querySelector('.weapon-name');
        if (nameEl && names[n]) nameEl.textContent = names[n];
    });
}
function injectWeaponBarStyles() {
    if (weaponBarStylesInjected) return;
    if (typeof document === 'undefined') return;
    if (document.getElementById('pointerx-weapon-style')) { weaponBarStylesInjected = true; return; }
    const st = document.createElement('style');
    st.id = 'pointerx-weapon-style';
    st.textContent = `
#weapon-bar{position:absolute;bottom:18px;left:50%;transform:translateX(-50%);display:flex;gap:8px;z-index:100;pointer-events:none;font-family:monospace;}
#weapon-bar .weapon-slot{position:relative;width:86px;height:52px;background:linear-gradient(180deg,rgba(8,12,26,0.88),rgba(8,12,26,0.72));border:2px solid rgba(255,255,255,0.25);border-radius:8px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(0,0,0,0.5);}
#weapon-bar .weapon-slot.active{border-color:#ffcc00;background:linear-gradient(180deg,rgba(60,48,8,0.92),rgba(30,24,4,0.85));box-shadow:0 0 14px rgba(255,204,0,0.45);}
#weapon-bar .weapon-num{position:absolute;top:3px;left:6px;font-size:11px;font-weight:bold;color:rgba(255,255,255,0.75);}
#weapon-bar .weapon-slot.active .weapon-num{color:#ffcc00;}
#weapon-bar .weapon-name{font-size:13px;font-weight:bold;letter-spacing:1px;color:#fff;text-shadow:1px 1px 2px #000;}
`;
    document.head.appendChild(st);
    weaponBarStylesInjected = true;
}

function createSteveHeadMaterials() {
    const hairColor = '#3b2416';
    const skinColor = '#c68642';
    const eyeWhite = '#ffffff';
    const eyeBlue = '#3b3b9b';
    const mouthColor = '#4a2511';

    function makeFaceCanvas(drawFn) {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = hairColor;
        ctx.fillRect(0, 0, 64, 64);
        drawFn(ctx);
        const texture = new THREE.CanvasTexture(canvas);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        return new THREE.MeshStandardMaterial({ map: texture, transparent: true });
    }

    const matRight = makeFaceCanvas((ctx) => {
        ctx.fillStyle = skinColor; ctx.fillRect(0, 24, 64, 40);
        ctx.fillStyle = hairColor; ctx.fillRect(0, 0, 64, 24);
    });
    const matLeft = makeFaceCanvas((ctx) => {
        ctx.fillStyle = skinColor; ctx.fillRect(0, 24, 64, 40);
        ctx.fillStyle = hairColor; ctx.fillRect(0, 0, 64, 24);
    });
    const matTop = makeFaceCanvas((ctx) => { ctx.fillStyle = hairColor; ctx.fillRect(0, 0, 64, 64); });
    const matBottom = makeFaceCanvas((ctx) => { ctx.fillStyle = '#ad6f32'; ctx.fillRect(0, 0, 64, 64); });
    const matFront = makeFaceCanvas((ctx) => {
        ctx.fillStyle = skinColor; ctx.fillRect(0, 24, 64, 40);
        ctx.fillStyle = hairColor; ctx.fillRect(0, 0, 64, 24);
        ctx.fillStyle = eyeWhite; ctx.fillRect(8, 32, 16, 8); ctx.fillRect(40, 32, 16, 8);
        ctx.fillStyle = eyeBlue; ctx.fillRect(16, 32, 8, 8); ctx.fillRect(40, 32, 8, 8);
        ctx.fillStyle = mouthColor; ctx.fillRect(24, 44, 16, 12);
    });
    const matBack = makeFaceCanvas((ctx) => {
        ctx.fillStyle = hairColor; ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = skinColor; ctx.fillRect(16, 48, 32, 16);
    });

    return [matRight, matLeft, matTop, matBottom, matFront, matBack];
}

function createSteveCharacter(playerId, applyCustoms = true) {
    const steveGroup = new THREE.Group();
    const shirtMat = new THREE.MeshStandardMaterial({ color: 0x00a8b5, transparent: true });
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x3b449b, transparent: true });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xc68642, transparent: true });

    // 🌟 Legs with Knee Joints, bilkul elbow wali structure:
    // hip group (y 0.75) -> thigh (0.375) -> knee group (thigh ke neeche)
    // -> shin (0.375, knee se neeche wala hissa). Total height pehle
    // jaisi 0.75 hi hai, pair zameen par hi rehte hain.
    const leftLeg = new THREE.Group();
    leftLeg.position.set(-0.125, 0.75, 0);
    const leftThigh = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.375, 0.25), pantsMat);
    leftThigh.position.set(0, -0.187, 0);
    leftThigh.userData = { id: playerId, bodyPart: 'leg' };
    leftLeg.add(leftThigh);
    const leftKneeMesh = new THREE.Group();
    leftKneeMesh.position.set(0, -0.375, 0);
    const leftShin = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.375, 0.25), pantsMat);
    leftShin.position.set(0, -0.187, 0);
    leftShin.userData = { id: playerId, bodyPart: 'leg' };
    leftKneeMesh.add(leftShin);
    leftLeg.add(leftKneeMesh);
    steveGroup.add(leftLeg);

    const rightLeg = new THREE.Group();
    rightLeg.position.set(0.125, 0.75, 0);
    const rightThigh = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.375, 0.25), pantsMat);
    rightThigh.position.set(0, -0.187, 0);
    rightThigh.userData = { id: playerId, bodyPart: 'leg' };
    rightLeg.add(rightThigh);
    const rightKneeMesh = new THREE.Group();
    rightKneeMesh.position.set(0, -0.375, 0);
    const rightShin = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.375, 0.25), pantsMat);
    rightShin.position.set(0, -0.187, 0);
    rightShin.userData = { id: playerId, bodyPart: 'leg' };
    rightKneeMesh.add(rightShin);
    rightLeg.add(rightKneeMesh);
    steveGroup.add(rightLeg);

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.75, 0.25), shirtMat);
    body.position.y = 1.125;
    body.userData = { id: playerId, bodyPart: 'body' };
    steveGroup.add(body);

    // 🌟 Arms with Elbow Sub-groups/Meshes
    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-0.375, 1.4, 0);
    const leftArmUpper = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.375, 0.25), skinMat);
    leftArmUpper.position.set(0, -0.187, 0);
    leftArmGroup.add(leftArmUpper);
    
    const leftElbowMesh = new THREE.Group();
    leftElbowMesh.position.set(0, -0.375, 0);
    const leftArmLower = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.375, 0.25), skinMat);
    leftArmLower.position.set(0, -0.187, 0);
    leftArmLower.userData = { id: playerId, bodyPart: 'hand' };
    leftElbowMesh.add(leftArmLower);
    leftArmGroup.add(leftElbowMesh);
    steveGroup.add(leftArmGroup);

    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(0.375, 1.4, 0);
    const rightArmUpper = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.375, 0.25), skinMat);
    rightArmUpper.position.set(0, -0.187, 0);
    rightArmGroup.add(rightArmUpper);

    const rightElbowMesh = new THREE.Group();
    rightElbowMesh.position.set(0, -0.375, 0);
    const rightArmLower = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.375, 0.25), skinMat);
    rightArmLower.position.set(0, -0.187, 0);
    rightArmLower.userData = { id: playerId, bodyPart: 'hand' };
    rightElbowMesh.add(rightArmLower);
    rightArmGroup.add(rightElbowMesh);
    steveGroup.add(rightArmGroup);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), createSteveHeadMaterials());
    head.position.y = 1.75;
    head.userData = { id: playerId, bodyPart: 'head' };
    steveGroup.add(head);

    if (applyCustoms && typeof lobbyCustomParts !== 'undefined') {
        const mapping = { head, body, leftArm: leftArmGroup, rightArm: rightArmGroup, leftLeg, rightLeg, leftElbow: leftElbowMesh, rightElbow: rightElbowMesh, leftKnee: leftKneeMesh, rightKnee: rightKneeMesh };
        partNames.forEach(name => {
            const part = mapping[name];
            const cfg = lobbyCustomParts[name];
            if (part && cfg) {
                if (name !== 'leftElbow' && name !== 'rightElbow' && name !== 'leftKnee' && name !== 'rightKnee') {
                    // Head 0.5 cube — group ki Y scale (0.9) se compensate karo.
                    if (name === 'head') part.scale.set(cfg.scale, cfg.scale / PLAYER_HEIGHT_RATIO, cfg.scale);
                    else part.scale.set(cfg.scale, cfg.scale, cfg.scale);
                    part.rotation.set(cfg.rotX, cfg.rotY, cfg.rotZ);
                    if (name === 'head') part.position.set(0, 1.75 + cfg.posY, cfg.posZ);
                    else if (name === 'body') part.position.set(0, 1.125 + cfg.posY, cfg.posZ);
                    else if (name === 'leftArm') part.position.set(-0.375 + cfg.posX, 1.4 + cfg.posY, cfg.posZ);
                    else if (name === 'rightArm') part.position.set(0.375 + cfg.posX, 1.4 + cfg.posY, cfg.posZ);
                    else if (name === 'leftLeg') part.position.set(-0.125 + cfg.posX, 0.75 + cfg.posY, cfg.posZ);
                    else if (name === 'rightLeg') part.position.set(0.125 + cfg.posX, 0.75 + cfg.posY, cfg.posZ);
                } else {
                    part.rotation.set(cfg.rotX, cfg.rotY, cfg.rotZ);
                }
            }
        });
    }

    const out = { group: steveGroup, leftLeg, rightLeg, leftArmGroup, rightArmGroup, leftElbowMesh, rightElbowMesh, leftKneeMesh, rightKneeMesh, body, head, leftThigh, rightThigh, leftShin, rightShin, leftArmUpper, rightArmUpper, leftArmLower, rightArmLower };
    // 🎩 OUTER LAYER — base mesh ke child ke tor par thoda bara box, taake
    // overlay base ke upar dikhe aur saare transforms (scale/rot/pos) inherit
    // kare. Raycast band hai (click/shot base mesh par lage, outer par nahi).
    const outerMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
    function makeOuter(parent, w, h, d) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), outerMat.clone());
        m.visible = false;
        m.raycast = function () {};
        parent.add(m);
        return m;
    }
    out.headOuter = makeOuter(head, 0.56, 0.56, 0.56);
    out.bodyOuter = makeOuter(body, 0.56, 0.81, 0.31);
    out.leftArmUpperOuter = makeOuter(leftArmUpper, 0.31, 0.435, 0.31);
    out.leftArmLowerOuter = makeOuter(leftArmLower, 0.31, 0.435, 0.31);
    out.rightArmUpperOuter = makeOuter(rightArmUpper, 0.31, 0.435, 0.31);
    out.rightArmLowerOuter = makeOuter(rightArmLower, 0.31, 0.435, 0.31);
    out.leftThighOuter = makeOuter(leftThigh, 0.31, 0.435, 0.31);
    out.leftShinOuter = makeOuter(leftShin, 0.31, 0.435, 0.31);
    out.rightThighOuter = makeOuter(rightThigh, 0.31, 0.435, 0.31);
    out.rightShinOuter = makeOuter(rightShin, 0.31, 0.435, 0.31);
    if (currentSkin) { try { applySkinToCharacter(out, currentSkin); } catch (e) {} }
    return out;
}

function createOtherPlayerMesh(id, playerData) {
    if (otherPlayers[id]) return;

    const steveChar = createSteveCharacter(id, true);
    // 🎨 Har player ki APNI skin — server se aayi hui skin lagao, apni
    // (currentSkin) nahi. createSteveCharacter ne currentSkin laga di hai,
    // is liye yahan uski apni skin se override karo.
    let _pSkin, _pSkinCode;
    if (typeof playerData.skin === 'string' && playerData.skin) {
        const _s = decodeSkinCode(playerData.skin);
        if (_s) { _pSkin = _s; _pSkinCode = playerData.skin; applySkinToCharacter(steveChar, _s); }
    } else if (playerData.skin === '') {
        _pSkin = null; _pSkinCode = '';
        restoreSkinToCharacter(steveChar);
    } else {
        // playerData.skin undefined hai (purana server, skin nahi aayi).
        // Apni skin mat lagao — warna doosre player par TUMHARI skin
        // dikhegi (Flash ki skin Tech par, Tech ki Flash par — cross).
        // Baked default (Alex) lagao taake cross na ho.
        const _baked = (typeof DEFAULT_SKIN_CODE === 'string' && DEFAULT_SKIN_CODE) ? decodeSkinCode(DEFAULT_SKIN_CODE) : null;
        if (_baked) { _pSkin = _baked; _pSkinCode = DEFAULT_SKIN_CODE; applySkinToCharacter(steveChar, _baked); }
        // (agar baked bhi nahi hai to currentSkin hi rehne do.)
    }
    const playerMesh = steveChar.group;
    // 💪 Pushup (P) — mesh aage let-ta hai (rotation.x) aur yaw bhi lagta
    // hai (rotation.y). Default order 'XYZ' me yaw pitch ke BAAD lagta
    // hai — pitch ke baad Y axis horizontal ho jata hai, to yaw body ko
    // side (right) ki taraf roll kar deta hai. 'YXZ' me yaw PEHLE lagta
    // hai (khade ho kar, vertical axis par), phir pitch local X par —
    // banda munh ke ball (face-down) let-ta hai, jis taraf dekh raha ho.
    playerMesh.rotation.order = 'YXZ';

    const playerGunGroup = new THREE.Group();
    // Game ke ander doosre player ki gun: saved in-game editor pose lagti hai
    // (default: pichla shift -0.44, 1.55, 0.15). Lobby/first-person gun alag hain.
    playerGunGroup.position.set(inGameGunPosX, inGameGunPosY, inGameGunPosZ);
    playerGunGroup.rotation.set(inGameGunRotX * Math.PI / 180, inGameGunRotY * Math.PI / 180, 0);
    // 🎒 Doosre player ki gun uske equipped slot-1 gun se (AR-9 ya VITA).
    // Purani position (0, -0.3, 0.3) par, taake editor ki baked position
    // na badle. Size lobby gun wali (lobbyGunScale) — game me bhi wahi.
    const _pg1 = (playerData && playerData.gun1 === 'vita') ? 'vita' : 'ar9';
    const _pGun = _pg1 === 'vita' ? buildVitaSniper() : buildAR9Gun();
    _pGun.position.set(0, -0.3, 0.3);
    _pGun.scale.set(lobbyGunScale, lobbyGunScale, lobbyGunScale);
    playerGunGroup.add(_pGun);
    playerGunGroup.userData.gunMesh = _pGun;
    playerGunGroup.userData.gun1 = _pg1;

    // Registry sirf is liye hai taake panel se gun ki live position/
    // rotation badli ja sake. Click se editor khulna band hai, isliye
    // koi click/hit box nahi hai — fire hamesha goli hi chalegi.
    inGameGunGroups.push(playerGunGroup);

    playerMesh.add(playerGunGroup);
    // Body ka yaw = look yaw (poora banda ghoomta hai, head alag nahi).
    const bodyYaw0 = playerData.yaw || 0;
    playerMesh.rotation.y = bodyYaw0 + Math.PI + inGamePlayerRotate * Math.PI / 180;
    setPlayerScale(playerMesh, inGamePlayerSize);
    playerMesh.position.set(playerData.x, playerData.y - 1.62, playerData.z);
    scene.add(playerMesh);

    // 🔫 Gun ko right hand (arm) se PIN karo — haath ke saath upar/neeche
    // jayegi. attach() world pose barkarar rakhte hue parent badalta hai,
    // is liye gun wahi rehti hai jahan editor ne rakhi thi, bas ab woh
    // haath ki child hai.
    playerGunGroup.userData.armGroup = steveChar.rightArmGroup;
    playerGunGroup.userData.playerMesh = playerMesh;
    steveChar.rightArmGroup.attach(playerGunGroup);

    const nameTag = createNameTag(playerData.name || "Player");
    nameTag.position.set(playerData.x, playerData.y + 0.58, playerData.z);
    scene.add(nameTag);

    playerMesh.traverse((child) => {
        if (child.isMesh && child.userData && child.userData.bodyPart) { targets.push(child); }
        // 🌑 Shadow — poora player (body + gun) shadow daalta hai.
        if (child.isMesh && child.visible) child.castShadow = true;
    });

    otherPlayers[id] = { mesh: playerMesh, nameTag: nameTag, isDead: false, gunGroup: playerGunGroup, gun1: _pg1, parts: steveChar, skin: _pSkin, skinCode: _pSkinCode, lastYaw: (playerData.yaw || 0), lastPos: null, walkPhase: 0, walkAmount: 0, isMoving: false, isCrouching: false, isDoingPushups: false, pushupAmount: 0, pushupPhase: 0 };
}

// 🎒 Doosre player ki slot-1 gun badlo (AR-9 ↔ VITA) — jab wo inventory
// se gun badle to uski gun bhi badal jaye. Purani gun hatao, nayi lagao.
function setOtherPlayerGun(id, gun1) {
    const p = otherPlayers[id];
    if (!p || !p.gunGroup) return;
    if (p.gun1 === gun1) return;
    const g = p.gunGroup;
    if (g.userData.gunMesh) { try { g.remove(g.userData.gunMesh); } catch (e) {} }
    const ng = gun1 === 'vita' ? buildVitaSniper() : buildAR9Gun();
    ng.position.set(0, -0.3, 0.3);
    ng.scale.set(lobbyGunScale, lobbyGunScale, lobbyGunScale);
    g.add(ng);
    g.userData.gunMesh = ng;
    g.userData.gun1 = gun1;
    p.gun1 = gun1;
    try {
        g.traverse((child) => { if (child.isMesh && child.visible) child.castShadow = true; });
    } catch (e) {}
}

function setupPointerLock() {
    const blocker = document.getElementById('blocker');
    renderer.domElement.addEventListener('click', () => {
        if (gameStarted && !isLocked && !isDeadLocal) { document.body.requestPointerLock(); }
    });
    if (blocker) {
        blocker.addEventListener('click', () => {
            if (gameStarted && !isDeadLocal) { document.body.requestPointerLock(); }
        });
    }
    document.addEventListener('pointerlockchange', () => {
        if (document.pointerLockElement === document.body) {
            isLocked = true;
            if (typeof closeInGameGunEditor === 'function') closeInGameGunEditor();
            if (blocker) blocker.style.display = 'none';
        } else {
            isLocked = false;
            // 🏁 Results panel khula ho to blocker (Click to Start) na dikhao.
            if (gameStarted && !isDeadLocal && !matchResultsOpen && blocker) { blocker.style.display = 'flex'; }
        }
    });
    document.addEventListener('mousemove', (e) => {
        if (!isLocked || !gameStarted) return;
        const mouseSensitivity = 0.002;
        pitch -= e.movementY * mouseSensitivity;
        pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, pitch));
        // Mouse left/right: poora banda (body) ghoomta hai — head alag se
        // nahi ghoomta (90° head yaw hata diya gaya).
        yaw -= e.movementX * mouseSensitivity;
    });
}

function setupMobileControls() {
    if (!isMobile) return;
    const oldUI = document.getElementById('mobile-controls-ui');
    if (oldUI) oldUI.remove();
    const ui = document.createElement('div');
    ui.id = 'mobile-controls-ui';
    ui.style.position = 'fixed';
    ui.style.top = '0'; ui.style.left = '0'; ui.style.width = '100vw'; ui.style.height = '100vh';
    ui.style.pointerEvents = 'none'; ui.style.zIndex = '99999';
    // 📱 Mobile controls — joystick (left) + look (right drag) + buttons.
    // MULTI-TOUCH: har ungli ka apna touch id hai, is liye joystick,
    // look, fire, jump sab EK SAATH chalte hain (bari bari nahi).
    ui.innerHTML = `
        <div id="joystick-zone" style="position: absolute; bottom: 24px; left: 20px; width: 140px; height: 140px; background: rgba(255,255,255,0.08); border: 2px solid rgba(255,255,255,0.3); border-radius: 50%; pointer-events: auto; touch-action: none;">
            <div id="joystick-thumb" style="position: absolute; top: 45px; left: 45px; width: 50px; height: 50px; background: rgba(0,255,204,0.7); border-radius: 50%; pointer-events: none;"></div>
        </div>
        <button data-mbtn="fire" style="position: absolute; bottom: 30px; right: 24px; width: 78px; height: 78px; border-radius: 50%; background: rgba(255,60,40,0.75); border: 2px solid rgba(255,255,255,0.5); color: #fff; font-size: 15px; font-weight: 900; font-family: monospace; pointer-events: auto; touch-action: none;">FIRE</button>
        <button data-mbtn="jump" style="position: absolute; bottom: 122px; right: 30px; width: 60px; height: 60px; border-radius: 50%; background: rgba(0,180,255,0.6); border: 2px solid rgba(255,255,255,0.5); color: #fff; font-size: 12px; font-weight: 900; font-family: monospace; pointer-events: auto; touch-action: none;">JUMP</button>
        <button data-mbtn="crouch" style="position: absolute; bottom: 122px; right: 102px; width: 60px; height: 60px; border-radius: 50%; background: rgba(255,200,0,0.6); border: 2px solid rgba(255,255,255,0.5); color: #fff; font-size: 11px; font-weight: 900; font-family: monospace; pointer-events: auto; touch-action: none;">CROUCH</button>
        <button data-mbtn="w1" style="position: absolute; bottom: 196px; right: 30px; width: 44px; height: 44px; border-radius: 10px; background: rgba(255,255,255,0.2); border: 2px solid rgba(255,255,255,0.4); color: #fff; font-size: 15px; font-weight: 900; font-family: monospace; pointer-events: auto; touch-action: none;">1</button>
        <button data-mbtn="w2" style="position: absolute; bottom: 196px; right: 82px; width: 44px; height: 44px; border-radius: 10px; background: rgba(255,255,255,0.2); border: 2px solid rgba(255,255,255,0.4); color: #fff; font-size: 15px; font-weight: 900; font-family: monospace; pointer-events: auto; touch-action: none;">2</button>
        <button data-mbtn="w3" style="position: absolute; bottom: 196px; right: 134px; width: 44px; height: 44px; border-radius: 10px; background: rgba(255,255,255,0.2); border: 2px solid rgba(255,255,255,0.4); color: #fff; font-size: 15px; font-weight: 900; font-family: monospace; pointer-events: auto; touch-action: none;">3</button>
        <button id="mobile-chat-btn" style="position: absolute; top: 16px; right: 16px; width: 48px; height: 48px; border-radius: 50%; background: rgba(0,255,204,0.25); border: 2px solid rgba(0,255,204,0.6); color: #fff; font-size: 22px; font-family: monospace; pointer-events: auto; touch-action: none;">💬</button>
    `;
    document.body.appendChild(ui);

    const zone = document.getElementById('joystick-zone');
    const thumb = document.getElementById('joystick-thumb');
    const JOY_R = 45; // Thumb centre se max offset (px).
    const setThumb = (dx, dy) => {
        if (!thumb) return;
        thumb.style.left = (45 + dx) + 'px';
        thumb.style.top = (45 + dy) + 'px';
    };
    const updateJoystick = (t) => {
        let dx = t.clientX - joystickCenter.x;
        let dy = t.clientY - joystickCenter.y;
        const len = Math.hypot(dx, dy);
        if (len > JOY_R) { dx = dx / len * JOY_R; dy = dy / len * JOY_R; }
        setThumb(dx, dy);
        // Upar dabao = aage (mobileMoveZ +), dayein = right (mobileMoveX +).
        mobileMoveX = dx / JOY_R;
        mobileMoveZ = -dy / JOY_R;
    };
    const resetJoystick = () => {
        joystickTouchId = null;
        mobileMoveX = 0; mobileMoveZ = 0;
        setThumb(0, 0);
    };
    // Joystick — sirf is ungli (touch id) ko track karo, baaki ungliyan
    // (look/fire) alag se chalti rehti hain.
    if (zone) {
        zone.addEventListener('touchstart', (e) => {
            if (joystickTouchId !== null) return;
            const t = e.changedTouches[0];
            const r = zone.getBoundingClientRect();
            joystickCenter = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
            joystickTouchId = t.identifier;
            updateJoystick(t);
            e.preventDefault();
        }, { passive: false });
        zone.addEventListener('touchmove', (e) => {
            for (const t of e.changedTouches) {
                if (t.identifier === joystickTouchId) { updateJoystick(t); e.preventDefault(); }
            }
        }, { passive: false });
        const joyEnd = (e) => {
            for (const t of e.changedTouches) {
                if (t.identifier === joystickTouchId) resetJoystick();
            }
        };
        zone.addEventListener('touchend', joyEnd);
        zone.addEventListener('touchcancel', joyEnd);
    }
    // Look — screen par kahin bhi drag karo (joystick/buttons ke ilawa).
    // Har touch ka apna id hai, is liye joystick dabaye hue bhi look chalta hai.
    // Document listeners sirf ek baar lagte hain (dobara game start par duplicate na hon).
    if (!window._mobileTouchBound) {
        window._mobileTouchBound = true;
        const onTouchStart = (e) => {
            if (!gameStarted || isDeadLocal) return;
            for (const t of e.changedTouches) {
                const el = (t.target && t.target.closest) ? t.target.closest('#joystick-zone, [data-mbtn], #mobile-chat-btn, #chat-container, #chat-input, button, input') : null;
                if (el) continue; // Joystick/button/chat par touch — look nahi.
                if (lookTouchId !== null) continue; // Ek look touch hi kaafi hai.
                lookTouchId = t.identifier;
                lookLast = { x: t.clientX, y: t.clientY };
            }
        };
        const onTouchMove = (e) => {
            if (!gameStarted || isDeadLocal) return;
            for (const t of e.changedTouches) {
                if (t.identifier !== lookTouchId) continue;
                const dx = t.clientX - lookLast.x;
                const dy = t.clientY - lookLast.y;
                lookLast = { x: t.clientX, y: t.clientY };
                // Mouse jaisi sensitivity (touch par thori zyada).
                pitch -= dy * 0.004;
                pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, pitch));
                yaw -= dx * 0.004;
                e.preventDefault();
            }
        };
        const onTouchEnd = (e) => {
            for (const t of e.changedTouches) {
                if (t.identifier === lookTouchId) lookTouchId = null;
            }
        };
        document.addEventListener('touchstart', onTouchStart, { passive: true });
        document.addEventListener('touchmove', onTouchMove, { passive: false });
        document.addEventListener('touchend', onTouchEnd);
        document.addEventListener('touchcancel', onTouchEnd);
    }

    // Buttons — har button apni ungli se chalta hai (multi-touch).
    const bindBtn = (name, down, up) => {
        const b = ui.querySelector(`[data-mbtn="${name}"]`);
        if (!b) return;
        b.addEventListener('touchstart', (e) => { e.preventDefault(); down(b); }, { passive: false });
        if (up) {
            b.addEventListener('touchend', (e) => { e.preventDefault(); up(b); }, { passive: false });
            b.addEventListener('touchcancel', (e) => { up(b); });
        }
    };
    // FIRE — dabaye rakho to AR-9 auto-fire (isMouseHeld), choro to band.
    bindBtn('fire',
        () => { if (!gameStarted || isDeadLocal) return; isMouseHeld = true; lastAutoShotTime = performance.now(); shoot({ button: 0 }); },
        () => { isMouseHeld = false; try { stopAutoShotSounds(); } catch (e) {} });
    // JUMP — tap karo to jump.
    bindBtn('jump', () => { if (gameStarted && !isDeadLocal) performJump(); });
    // CROUCH — tap karo to crouch on/off (toggle).
    bindBtn('crouch', (b) => {
        if (!gameStarted || isDeadLocal) return;
        isCrouching = !isCrouching;
        b.style.background = isCrouching ? 'rgba(255,200,0,0.9)' : 'rgba(255,200,0,0.6)';
    });
    // Weapons 1/2/3.
    bindBtn('w1', () => { if (gameStarted && !isDeadLocal) switchWeapon(1); });
    bindBtn('w2', () => { if (gameStarted && !isDeadLocal) switchWeapon(2); });
    bindBtn('w3', () => { if (gameStarted && !isDeadLocal) switchWeapon(3); });

    // 💬 Chat icon — dabao to chat khule, dobara dabao to band.
    const chatBtn = document.getElementById('mobile-chat-btn');
    if (chatBtn) {
        chatBtn.addEventListener('touchstart', (e) => { e.preventDefault(); toggleMobileChat(); }, { passive: false });
        chatBtn.addEventListener('click', (e) => { e.preventDefault(); toggleMobileChat(); });
    }
    injectMobileStyles();
}

// 💬 Mobile chat — icon dabao to chat kholo (input focus = keyboard),
// dobara dabao to band. Desktop par Enter/T wala rasta waisa hi hai.
function toggleMobileChat() {
    const chatContainer = document.getElementById('chat-container');
    const chatInputWrapper = document.getElementById('chat-input-wrapper');
    const chatInput = document.getElementById('chat-input');
    if (!chatContainer) return;
    if (mobileChatOpen) {
        if (chatHideTimer) { clearTimeout(chatHideTimer); chatHideTimer = null; }
        chatContainer.style.opacity = '0';
        setTimeout(() => { if (!mobileChatOpen) chatContainer.style.display = 'none'; }, 200);
        if (chatInput) chatInput.blur();
        mobileChatOpen = false;
        return;
    }
    if (chatHideTimer) { clearTimeout(chatHideTimer); chatHideTimer = null; }
    chatContainer.style.opacity = '1';
    chatContainer.style.display = 'flex';
    if (chatInputWrapper) chatInputWrapper.style.display = 'flex';
    if (chatInput) chatInput.focus();
    mobileChatOpen = true;
}

// 📱 Mobile layout — chhoti screen ke hisab se HUD chhota + upar,
// weapon bar buttons ke upar, chat container screen ke hisab se.
let mobileStylesInjected = false;
function injectMobileStyles() {
    if (mobileStylesInjected) return;
    mobileStylesInjected = true;
    const s = document.createElement('style');
    s.id = 'mobile-styles';
    s.textContent = `
        #weapon-bar { bottom: 180px !important; transform: scale(0.85); transform-origin: bottom center; }
        #match-timer { font-size: 20px !important; padding: 5px 16px !important; top: 10px !important; }
        #score-dots { top: 10px !important; left: 10px !important; font-size: 13px !important; }
        #hud { bottom: auto !important; top: 56px !important; left: 10px !important; font-size: 13px !important; }
        #chat-container { width: 92vw !important; max-width: 420px !important; left: 4vw !important; bottom: 190px !important; }
        #chat-messages { max-height: 130px !important; }
        #crosshair { width: 10px !important; height: 10px !important; }
    `;
    document.head.appendChild(s);
}

// 📱 MOBILE LOBBY — desktop layout (1600x900) chhoti landscape screen
// par fit nahi hota (character cut, menu buttons nazar nahi aate). Is liye
// mobile par lobby items ko compact layout me dobara lagao (CSS !important
// se inline desktop positions override). Desktop layout bilkul waisa hi hai.
// Viewport units (vw/vh) se layout khud screen ke hisaab se fit hota hai —
// koi bhi phone ho, poori lobby dikhegi (transform scale hata diya — wo
// layout ko corner me chhota kar deta tha). Overlay scrollable bhi hai,
// taake chhoti screen par bhi sab kuch dekh sako.
// 📱 MOBILE VIEWPORT HEIGHT FIX — mobile browsers me 100vh asal visible
// screen se BARA hota hai (browser toolbar neeche chhup jata hai), is liye
// bottom wali cheezein (PLAY, ANYMAYS card, neeche wale menu buttons)
// toolbar ke peeche cut ho jati thin. Asal visible height JS se naap ke
// --vh variable me rakho, aur saari vh positioning usi se karo.
function setMobileVh() {
    if (!isMobile) return;
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', vh + 'px');
}
let mobileLobbyStylesInjected = false;
function injectMobileLobbyStyles() {
    if (mobileLobbyStylesInjected) return;
    mobileLobbyStylesInjected = true;
    const s = document.createElement('style');
    s.id = 'mobile-lobby-styles';
    s.textContent = `
        #name-overlay { overflow-y: auto !important; overflow-x: hidden !important; height: calc(var(--vh, 1vh) * 100) !important; }
        canvas { height: calc(var(--vh, 1vh) * 100) !important; }
        body { height: calc(var(--vh, 1vh) * 100) !important; overflow: hidden !important; }
        #lobby-title { left: 50% !important; top: calc(var(--vh, 1vh) * 1) !important; transform: translateX(-50%) !important; font-size: clamp(16px, 2.6vw, 26px) !important; letter-spacing: 1px !important; }
        [data-lobby-item="playercard"] { left: 1vw !important; top: calc(var(--vh, 1vh) * 2) !important; width: 24vw !important; min-width: 170px !important; padding: calc(var(--vh, 1vh) * 1.5) 1vw !important; font-size: clamp(11px, 1.5vw, 14px) !important; }
        [data-lobby-item="pfp"] { left: 26vw !important; top: calc(var(--vh, 1vh) * 2) !important; width: 6.5vw !important; height: 6.5vw !important; min-width: 44px !important; min-height: 44px !important; }
        [data-lobby-item="menu_HUB"] { left: 1vw !important; top: calc(var(--vh, 1vh) * 34) !important; width: 13.5vw !important; min-width: 100px !important; padding: calc(var(--vh, 1vh) * 1.2) 1vw !important; font-size: clamp(11px, 1.5vw, 14px) !important; }
        [data-lobby-item="menu_STORE"] { left: 1vw !important; top: calc(var(--vh, 1vh) * 44) !important; width: 13.5vw !important; min-width: 100px !important; padding: calc(var(--vh, 1vh) * 1.2) 1vw !important; font-size: clamp(11px, 1.5vw, 14px) !important; }
        [data-lobby-item="menu_SERVERS"] { left: 1vw !important; top: calc(var(--vh, 1vh) * 54) !important; width: 13.5vw !important; min-width: 100px !important; padding: calc(var(--vh, 1vh) * 1.2) 1vw !important; font-size: clamp(11px, 1.5vw, 14px) !important; }
        [data-lobby-item="menu_QUESTS"] { left: 1vw !important; top: calc(var(--vh, 1vh) * 64) !important; width: 13.5vw !important; min-width: 100px !important; padding: calc(var(--vh, 1vh) * 1.2) 1vw !important; font-size: clamp(11px, 1.5vw, 14px) !important; }
        [data-lobby-item="menu_FRIENDS"] { left: 15.5vw !important; top: calc(var(--vh, 1vh) * 34) !important; width: 13.5vw !important; min-width: 100px !important; padding: calc(var(--vh, 1vh) * 1.2) 1vw !important; font-size: clamp(11px, 1.5vw, 14px) !important; }
        [data-lobby-item="menu_INVENTORY"] { left: 15.5vw !important; top: calc(var(--vh, 1vh) * 44) !important; width: 13.5vw !important; min-width: 100px !important; padding: calc(var(--vh, 1vh) * 1.2) 1vw !important; font-size: clamp(11px, 1.5vw, 14px) !important; }
        [data-lobby-item="menu_EDITOR"] { left: 15.5vw !important; top: calc(var(--vh, 1vh) * 54) !important; width: 13.5vw !important; min-width: 100px !important; padding: calc(var(--vh, 1vh) * 1.2) 1vw !important; font-size: clamp(11px, 1.5vw, 14px) !important; }
        [data-lobby-item="menu_SKINS"] { left: 15.5vw !important; top: calc(var(--vh, 1vh) * 64) !important; width: 13.5vw !important; min-width: 100px !important; padding: calc(var(--vh, 1vh) * 1.2) 1vw !important; font-size: clamp(11px, 1.5vw, 14px) !important; }
        [data-lobby-item="play"] { left: auto !important; right: 1.5vw !important; top: auto !important; bottom: calc(var(--vh, 1vh) * 3) !important; width: 16vw !important; min-width: 110px !important; padding: calc(var(--vh, 1vh) * 1.8) 1vw !important; font-size: clamp(16px, 2.4vw, 22px) !important; }
        [data-lobby-item="charname"] { left: 50% !important; top: calc(var(--vh, 1vh) * 46) !important; transform: translateX(-50%) !important; width: 20vw !important; min-width: 150px !important; height: calc(var(--vh, 1vh) * 7) !important; min-height: 26px !important; font-size: clamp(11px, 1.5vw, 14px) !important; }
        [data-lobby-item="logout"] { left: auto !important; right: 1vw !important; top: calc(var(--vh, 1vh) * 2) !important; width: 10vw !important; min-width: 74px !important; padding: calc(var(--vh, 1vh) * 1) 1vw !important; font-size: clamp(10px, 1.3vw, 12px) !important; }
        [data-lobby-item="private"], [data-lobby-item="join"], [data-lobby-item="play_settings"], [data-lobby-item="copy_layout"], [data-lobby-item="reset_layout"], [data-lobby-item="wwp"] { display: none !important; }
        #lobby-card { left: 50% !important; top: auto !important; bottom: calc(var(--vh, 1vh) * 2) !important; transform: translateX(-50%) !important; width: 38vw !important; min-width: 280px !important; max-width: 46vw !important; max-height: calc(var(--vh, 1vh) * 34) !important; overflow-y: auto !important; font-size: clamp(11px, 1.4vw, 13px) !important; }
    `;
    document.head.appendChild(s);
}
// chalega. Portrait me ye overlay dikhega aur game start nahi hoga;
// landscape ghumate hi overlay gayab + game start (ya wapis chalu).
function isLandscape() {
    return window.innerWidth > window.innerHeight;
}
function setupRotateOverlay() {
    if (!isMobile) return;
    if (document.getElementById('rotate-overlay')) return;
    const ov = document.createElement('div');
    ov.id = 'rotate-overlay';
    ov.style.position = 'fixed';
    ov.style.top = '0'; ov.style.left = '0'; ov.style.width = '100vw'; ov.style.height = 'calc(var(--vh, 1vh) * 100)';
    ov.style.background = 'rgba(5,10,25,0.97)';
    ov.style.zIndex = '1000000';
    ov.style.display = 'none';
    ov.style.flexDirection = 'column';
    ov.style.alignItems = 'center';
    ov.style.justifyContent = 'center';
    ov.style.color = '#fff';
    ov.style.fontFamily = 'monospace';
    ov.style.textAlign = 'center';
    ov.style.pointerEvents = 'auto';
    ov.innerHTML = `
        <div style="font-size: 64px; margin-bottom: 16px;">🔄</div>
        <div style="font-size: 22px; font-weight: 900; margin-bottom: 8px;">PHONE ROTATE KARO</div>
        <div style="font-size: 15px; color: #00ffcc;">Game sirf landscape (aada) mode me chalega.<br>Phone ko side par ghumao 📱↻</div>
    `;
    document.body.appendChild(ov);
    // Rotate/resize par overlay update karo (ek hi listener, duplicate nahi).
    if (!window._rotateOverlayBound) {
        window._rotateOverlayBound = true;
        window.addEventListener('resize', () => { try { setMobileVh(); } catch (e) {} updateRotateOverlay(); });
        window.addEventListener('orientationchange', () => { setTimeout(() => { try { setMobileVh(); } catch (e) {} updateRotateOverlay(); }, 150); });
    }
    updateRotateOverlay();
}
function showRotateOverlay() {
    const ov = document.getElementById('rotate-overlay');
    if (ov) { ov.style.display = 'flex'; }
}
function updateRotateOverlay() {
    // 📱 Rotate/resize par lobby scale bhi update karo (screen fit rahe).
    const ov = document.getElementById('rotate-overlay');
    if (!ov || !isMobile) return;
    if (isLandscape()) {
        ov.style.display = 'none';
        // PLAY dabake landscape ka intezar kar raha tha — ab game start karo.
        if (waitingForLandscape && !gameStarted) {
            waitingForLandscape = false;
            const n = waitingPlayerName;
            waitingPlayerName = '';
            startGameWithPlayer(n);
            return;
        }
        // Mid-game portrait se wapis — movement reset (player ruk jaye).
        if (gameStarted) { mobileMoveX = 0; mobileMoveZ = 0; joystickTouchId = null; lookTouchId = null; }
    } else {
        ov.style.display = 'flex';
        // Portrait me movement + firing roko (player aage na badhe, goli na chale).
        mobileMoveX = 0; mobileMoveZ = 0; joystickTouchId = null; lookTouchId = null;
        isMouseHeld = false;
        try { stopAutoShotSounds(); } catch (e) {}
    }
}

function performJump() {
    if (isDeadLocal || !gameStarted) return false;
    if (isDoingPushups) return false; // Pushups me jump nahi (zameen par lete ho).
    // 🌙 MOON JUMP (bhop) — land ke baad Shift tap (daba + chora) phir jump.
    // Normal jump se zyada uncha (14 vs 8.5). Zameen par hota hai.
    if (canJump && !isCrouching && bhopTapArmed && performance.now() <= bhopJumpUntil) {
        velocity.y = MOON_JUMP_VELOCITY;
        bhopTapArmed = false;
        bhopJumpUntil = 0;
        canJump = false;
        playSound('jump');
        try { showGameNotification('🌙 MOON JUMP!'); } catch (e) {}
        return true;
    }
    if (!canJump || isCrouching) return false;
    // Normal jump — Minecraft ke one block (1.0) jaisa. Height = v²/2g,
    // gravity 32 hai, is liye v = 8.0 se height exactly 1 block banti hai.
    bhopTapArmed = false;
    bhopJumpUntil = 0;
    velocity.y = 8.0;
    canJump = false;
    playSound('jump');
    return true;
}

// 💪 PUSHUPS — P dabaye rakho to pushups + gun gayab; P choro to gun
// wapis + banda khada. Gun ki visibility currentWeapon se wapis aati hai.
function setPushups(on) {
    if (!gameStarted || isDeadLocal) on = false;
    if (on === isDoingPushups) return;
    isDoingPushups = on;
    if (gun) gun.visible = !on && currentWeapon === 1;
    if (pistol) pistol.visible = !on && currentWeapon === 2;
    if (knife) knife.visible = !on && currentWeapon === 3;
}

function onKeyDown(e) {
    // 🏠 Lobby me G = ANYMAYS panel hide/show (sirf mod Gmail ke liye).
    // Input me type karte hue G dabao to 'g' type ho, panel na khule.
    if (!gameStarted && e.code === 'KeyG') {
        const ae = document.activeElement;
        if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable)) return;
        toggleLobbyCard();
        return;
    }
    if (!gameStarted) return;
    const _chatInput = document.getElementById('chat-input');
    if (_chatInput && document.activeElement === _chatInput) return;

    if (e.code === 'KeyT' || e.code === 'Enter') {
        const chatContainer = document.getElementById('chat-container');
        const chatInputWrapper = document.getElementById('chat-input-wrapper');
        const chatInput = document.getElementById('chat-input');
        if (chatInputWrapper && chatInput && document.activeElement !== chatInput) {
            e.preventDefault();
            // Agar fade chal raha ho to roko — chat poori tarah dikhao.
            if (chatHideTimer) { clearTimeout(chatHideTimer); chatHideTimer = null; }
            if (chatContainer) { chatContainer.style.opacity = '1'; chatContainer.style.display = 'flex'; }
            chatInputWrapper.style.display = 'flex';
            chatInput.focus();
            document.exitPointerLock();
            return;
        }
    }

    if (e.code === 'KeyG' && gameStarted && !isDeadLocal) {
        if (isInGameGunEditing) closeInGameGunEditor(); else openInGameGunEditor();
        return;
    }

    // 🔫 Weapon switch — 1 = Rifle, 2 = Pistol, 3 = Knife.
    if (!isInGameGunEditing) {
        if (e.code === 'Digit1' || e.code === 'Numpad1') { switchWeapon(1); return; }
        if (e.code === 'Digit2' || e.code === 'Numpad2') { switchWeapon(2); return; }
        if (e.code === 'Digit3' || e.code === 'Numpad3') { switchWeapon(3); return; }
    }

    switch (e.code) {
        case 'KeyW': moveForward = true; break;
        case 'KeyS': moveBackward = true; break;
        case 'KeyA': moveLeft = true; break;
        case 'KeyD': moveRight = true; break;
        case 'KeyP': setPushups(true); break; // 💪 Pushups (dabaye rakho).
        case 'ShiftLeft': case 'ShiftRight':
            isCrouching = true;
            // 🌙 Bhop tap arm — land karne ke foran baad (300ms) Shift
            // dabao to moon jump ke liye ready. Der se dabao to sirf crouch.
            if (canJump && performance.now() <= bhopLandUntil && gameStarted && !isDeadLocal) bhopTapArmed = true;
            break;
        case 'Space': performJump(); break;
    }
}

function onKeyUp(e) {
    if (!gameStarted) return;
    const _chatInput = document.getElementById('chat-input');
    if (_chatInput && document.activeElement === _chatInput) return;
    switch (e.code) {
        case 'KeyW': moveForward = false; break;
        case 'KeyS': moveBackward = false; break;
        case 'KeyA': moveLeft = false; break;
        case 'KeyD': moveRight = false; break;
        case 'KeyP': setPushups(false); break; // 💪 Pushups choro — gun wapis.
        case 'ShiftLeft': case 'ShiftRight':
            isCrouching = false;
            // 🌙 Shift chora (tap complete) — ab 250ms me jump dabao
            // to moon jump hoga. Isi liye "dabate hi chor ke jump".
            if (bhopTapArmed && canJump && gameStarted) bhopJumpUntil = performance.now() + BHOP_JUMP_WINDOW_MS;
            break;
    }
}

function shoot(e) {
    if (!isLocked || e.button !== 0 || isDeadLocal || !gameStarted) return;
    if (isInGameGunEditing) return;
    if (isDoingPushups) return; // 💪 Pushups me fire nahi (gun gayab hai).
    if (matchResultsOpen) return; // 🏁 Results panel khula ho to fire nahi.
    // 🎯 ACCURACY — har goli/swing ek shot, har lagne wala hit ek hit.
    // (Match end par accuracy = hits / shots. Knife swing bhi ek shot hai.)
    matchShots++;
    // EDITOR SIRF G SE: bande par fire karne se editor KABHI nahi khulega.
    // Click hamesha goli hi hai — gun click wala rasta poora hata diya
    // hai, kyunki wo fire karte waqt panel khol deta tha aur banda
    // marta hi nahi tha. Panel kholne ke liye sirf G dabao.

    // 🔪 Knife — melee: chhuri ghumao, paas wala banda mare (2.2m range).
    // Knife par KOI bullet sound nahi aata (sirf swing, khamosh).
    if (currentWeapon === 3) {
        knifeSwing = 1;
        scene.updateMatrixWorld(true);
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
        raycaster.far = 2.2;
        const intersects = raycaster.intersectObjects(targets, true);
        if (intersects.length > 0) {
            const hitMesh = intersects[0].object;
            if (hitMesh.userData && hitMesh.userData.id) {
                const targetId = hitMesh.userData.id;
                const part = hitMesh.userData.bodyPart;
                let damage = part === 'head' ? 100 : 50;
                matchHits++; // 🎯 Accuracy — chhuri lagi.
                triggerHitMarker(part === 'head');
                playSound('hit');
                spawnBloodSplatter(intersects[0].point);
                socket.emit('playerHit', { targetId, damage, x: intersects[0].point.x, y: intersects[0].point.y, z: intersects[0].point.z });
            }
        }
        return;
    }

    // 🔫 AR-9 (weapon 1 + ar9) — har goli ki awaz track hoti hai (100ms
    // par goliyan overlap ho kar AK-47 jaisi lagatar awaz; mouse chorte
    // hi sab band). VITA / pistol / revolver — ek click = ek goli ki
    // awaz. Knife (weapon 3) — upar return ho gaya, yahan awaz nahi aati.
    if (currentWeapon === 1 && equippedGun1 === 'ar9') { playAutoShotSound(); }
    else if (currentWeapon === 1 || currentWeapon === 2) { playSound('shoot'); }
    const flash = currentWeapon === 2 ? pistolMuzzleFlash : muzzleFlash;
    if (flash) { flash.visible = true; setTimeout(() => { flash.visible = false; }, 60); }

    scene.updateMatrixWorld(true);
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(targets, true);

    if (intersects.length > 0) {
        const hitMesh = intersects[0].object;
        if (hitMesh.userData && hitMesh.userData.id) {
            const targetId = hitMesh.userData.id;
            const part = hitMesh.userData.bodyPart;
            let damage = part === 'head' ? 100 : 50;
            matchHits++; // 🎯 Accuracy — goli lagi.
            triggerHitMarker(part === 'head');
            playSound('hit');
            spawnBloodSplatter(intersects[0].point);
            socket.emit('playerHit', { targetId, damage, x: intersects[0].point.x, y: intersects[0].point.y, z: intersects[0].point.z });
        }
    }
}

// 🔫 VIEWMODEL BOB — chalte waqt gun upar/neeche + halki side sway.
// Sirf apni screen par (first-person viewmodel = camera ki child);
// dusre players ki gun nahi hilti (wo inGameGunGroups me hain, wahan
// bob nahi lagta). Khade ho to bob smooth 0 ho jata hai (snap nahi).
function updateViewmodelBob(delta, isMoving, isCrouching) {
    const bobTarget = (isMoving && !isDoingPushups) ? 1 : 0;
    viewBobAmount = THREE.MathUtils.lerp(viewBobAmount, bobTarget, delta * 8);
    if (isMoving && !isDoingPushups) {
        viewBobPhase += delta * bobFrequency * (isCrouching ? 0.6 : 1);
    }
    const viewBobY = Math.sin(viewBobPhase * 2) * bobAmplitude * viewBobAmount;
    const viewBobX = Math.cos(viewBobPhase) * bobAmplitude * 0.6 * viewBobAmount;
    if (gun) { gun.position.y = viewBobY; gun.position.x = viewBobX; }
    if (pistol) { pistol.position.y = viewBobY; pistol.position.x = viewBobX; }
    if (knife) { knife.position.y = viewBobY; knife.position.x = viewBobX; }
    // 📷 CAMERA BOB — screen bhi gun ke saath hile (head bob). Sirf zameen
    // par chalte waqt (canJump = grounded); hawa me / pushups me nahi.
    // viewBobPhase hi use hota hai taake gun aur screen sync me hilen.
    const camTarget = (isMoving && !isDoingPushups && canJump) ? 1 : 0;
    camBobAmount = THREE.MathUtils.lerp(camBobAmount, camTarget, delta * 8);
}

function animate() {
    requestAnimationFrame(animate);

    if (!gameStarted) {
        try {
            if (clock) clock.getDelta();
            if (gun) gun.visible = false;
            if (pistol) pistol.visible = false;
            if (knife) knife.visible = false;
            if (!lobbyCharacter) { try { createLobbyCharacter(); } catch (e) {} }
            if (lobbyScene && lobbyCamera && renderer) {
                lobbyCamera.aspect = window.innerWidth / window.innerHeight;
                lobbyCamera.updateProjectionMatrix();
                lobbyCamera.position.set(0, isMobile ? 1.5 : 1.4, isMobile ? 4.2 : 3.4); // 📱 Mobile: camera peeche (character chhota, poora dikhe).
                lobbyCamera.lookAt(0, lobbyPlayerSize * PLAYER_HEIGHT_RATIO, 0);
                renderer.render(lobbyScene, lobbyCamera);
            }
        } catch (e) {}
        return;
    }

    const delta = clock.getDelta();
    // 🌞🌙 Day/night cycle (Minecraft-style) — sun/moon/roshni har frame.
    try { updateDayNight(delta); } catch (e) {}
    // 🌑 Apne player ka shadow body player ke peeche lagao.
    try { updateLocalShadowBody(); } catch (e) {}
    camera.rotation.order = 'YXZ';
    camera.rotation.y = yaw;
    // 📷 CAMERA BOB — chalte waqt screen bhi gun ke saath hile (head bob):
    // halki pitch (up/down) + roll (side tilt), gun ke bob se sync.
    // Mara hua / results panel khula ho to bob band.
    const camBob = camBobAmount * ((isDeadLocal || matchResultsOpen) ? 0 : 1);
    camera.rotation.x = pitch + Math.sin(viewBobPhase * 2) * 0.012 * camBob;
    camera.rotation.z = Math.sin(viewBobPhase) * 0.008 * camBob;

    // 🔪 Knife swing animation — chhuri tezi se ghumao, phir wapas.
    // Swing base (diagonal) pose ke upar hota hai, usko khatam nahi karta.
    if (knife && knife.visible && knifeSwing > 0) {
        knifeSwing = Math.max(0, knifeSwing - delta * 3.2);
        const s = Math.sin((1 - knifeSwing) * Math.PI);
        knife.rotation.z = KNIFE_BASE_ROT.z - 0.9 * s;
        knife.rotation.x = KNIFE_BASE_ROT.x - 0.4 * s;
        if (knifeSwing === 0) knife.rotation.set(KNIFE_BASE_ROT.x, 0, KNIFE_BASE_ROT.z);
    }

    for (let i = bloodParticles.length - 1; i >= 0; i--) {
        const p = bloodParticles[i];
        p.life -= delta;
        p.velocity.y -= 15 * delta;
        p.mesh.position.addScaledVector(p.velocity, delta);
        if (p.life <= 0) {
            scene.remove(p.mesh);
            bloodParticles.splice(i, 1);
        }
    }

    Object.keys(otherPlayers).forEach(id => {
        const p = otherPlayers[id];
        if (p.isDead) {
            p.mesh.rotation.order = 'YXZ';
            p.mesh.rotation.x = THREE.MathUtils.lerp(p.mesh.rotation.x, -Math.PI / 2, delta * 8);
            p.mesh.rotation.z = THREE.MathUtils.lerp(p.mesh.rotation.z, -0.5, delta * 8);
            p.mesh.position.y = THREE.MathUtils.lerp(p.mesh.position.y, 0.2, delta * 8);

            p.mesh.traverse(child => {
                if (child.isMesh && child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => {
                            m.transparent = true;
                            m.opacity = Math.max(0, m.opacity - delta * 0.35);
                        });
                    } else {
                        child.material.transparent = true;
                        child.material.opacity = Math.max(0, child.material.opacity - delta * 0.35);
                    }
                }
            });

            if (p.nameTag && p.nameTag.material) {
                p.nameTag.material.opacity = Math.max(0, p.nameTag.material.opacity - delta * 0.35);
                if (p.nameTag.material.opacity <= 0.05) {
                    p.nameTag.visible = false;
                }
            }
        } else if (p.parts && p.parts.leftLeg && p.parts.leftKneeMesh && p.parts.rightLeg && p.parts.rightKneeMesh) {
            // 🚶 WALK ANIMATION (knee joint se neeche wala hissa):
            // Server isMoving bhejta hai, aur position change bhi check
            // hoti hai, taake packet miss bhi ho to walk na ruke.
            // Local +Z = chalne ki direction (mesh +PI rotate ke baad):
            // thigh aage jhule to rotation.x negative, aur us waqt knee
            // bend positive hota hai taake shin (knee se neeche) peeche
            // ki taraf mude — bilkul insan ke ghutne ki tarah. Rukne par
            // walkAmount dheere dheere 0 ho jata hai, taake pair jhatke
            // se seedhe na hon, smoothly apni base pose par aa jayen.
            let speed = 0;
            if (p.lastPos) {
                const dx = p.mesh.position.x - p.lastPos.x;
                const dz = p.mesh.position.z - p.lastPos.z;
                speed = Math.hypot(dx, dz) / Math.max(delta, 0.001);
            }
            p.lastPos = p.mesh.position.clone();
            const moving = p.isMoving || speed > 0.8;
            p.walkAmount = THREE.MathUtils.lerp(p.walkAmount || 0, moving ? 1 : 0, delta * 8);
            if (moving) p.walkPhase = (p.walkPhase || 0) + delta * (6 + Math.min(speed, 14) * 0.55);
            const ph = p.walkPhase || 0;
            const amt = p.walkAmount || 0;
            const baseLegL = (typeof lobbyCustomParts !== 'undefined' && lobbyCustomParts.leftLeg) ? lobbyCustomParts.leftLeg.rotX : 0;
            const baseLegR = (typeof lobbyCustomParts !== 'undefined' && lobbyCustomParts.rightLeg) ? lobbyCustomParts.rightLeg.rotX : 0;
            const baseKneeL = (typeof lobbyCustomParts !== 'undefined' && lobbyCustomParts.leftKnee) ? lobbyCustomParts.leftKnee.rotX : 0;
            const baseKneeR = (typeof lobbyCustomParts !== 'undefined' && lobbyCustomParts.rightKnee) ? lobbyCustomParts.rightKnee.rotX : 0;
            const swingL = Math.sin(ph) * 0.55;
            const swingR = Math.sin(ph + Math.PI) * 0.55;
            const kneeL = Math.max(0, Math.sin(ph - 0.5)) * 0.95;
            const kneeR = Math.max(0, Math.sin(ph + Math.PI - 0.5)) * 0.95;
            // CROUCH POSE (Shift): halki bend — thigh aage -0.6, knee
            // +1.1, taake pair zameen par rahen aur banda zameen me na
            // ghuse. crouchAmount smooth in/out hota hai, aur walk ke
            // saath bhi chalta hai (crouch-walk).
            p.crouchAmount = THREE.MathUtils.lerp(p.crouchAmount || 0, p.isCrouching ? 1 : 0, delta * 8);
            const cr = p.crouchAmount || 0;
            p.parts.leftLeg.rotation.x = baseLegL - swingL * amt - crouchHip * cr;
            p.parts.rightLeg.rotation.x = baseLegR - swingR * amt - crouchHip * cr;
            applyKneeBend(p.parts.leftKneeMesh, p.parts.leftLeg.rotation, lobbyCustomParts.leftKnee, kneeL * amt + crouchKnee * cr);
            applyKneeBend(p.parts.rightKneeMesh, p.parts.rightLeg.rotation, lobbyCustomParts.rightKnee, kneeR * amt + crouchKnee * cr);
            // HEAD + HANDS PITCH (mouse up/down): jab player upar/neeche
            // dekhe to head aur haath (arms) halka sa jhukein, taake doosre
            // players ko pata chale. Torso nahi jhukta. Pitch server se
            // aata hai (playerMovement -> playerMoved). Upar dekhne par
            // pitch positive hota hai, to head/haath peeche (upar) jhukte hain.
            p.smoothPitch = THREE.MathUtils.lerp(p.smoothPitch || 0, p.lastPitch || 0, delta * 8);
            const baseHeadRotX = (typeof lobbyCustomParts !== 'undefined' && lobbyCustomParts.head) ? lobbyCustomParts.head.rotX : 0;
            const baseHeadRotY = (typeof lobbyCustomParts !== 'undefined' && lobbyCustomParts.head) ? lobbyCustomParts.head.rotY : 0;
            const baseArmLRotX = (typeof lobbyCustomParts !== 'undefined' && lobbyCustomParts.leftArm) ? lobbyCustomParts.leftArm.rotX : 0;
            const baseArmRRotX = (typeof lobbyCustomParts !== 'undefined' && lobbyCustomParts.rightArm) ? lobbyCustomParts.rightArm.rotX : 0;
            if (p.parts.head) p.parts.head.rotation.x = baseHeadRotX - (p.smoothPitch || 0) * 0.4;
            // Head yaw hata diya gaya — head body ke saath hi ghoomta hai.
            if (p.parts.head) p.parts.head.rotation.y = baseHeadRotY;
            if (p.parts.leftArmGroup) p.parts.leftArmGroup.rotation.x = baseArmLRotX - (p.smoothPitch || 0) * 0.4;
            if (p.parts.rightArmGroup) p.parts.rightArmGroup.rotation.x = baseArmRRotX - (p.smoothPitch || 0) * 0.4;
            // Gun haath se pinned hai (rightArmGroup ki child), is liye woh
            // khud hi haath ke saath upar/neeche jati hai — yahan alag se
            // pitch lagane ki zaroorat nahi.
            // 💪 PUSHUP (P): banda zameen par leta hua pushups lagata hai.
            // Mesh aage ki taraf let jata hai (face-down, sir aage), body
            // upar/neeche bob karti hai, gun gayab ho jati hai. (Mesh ki Y
            // playerMoved me set hoti hai — pushupBob wahan use hota hai.)
            p.pushupAmount = THREE.MathUtils.lerp(p.pushupAmount || 0, p.isDoingPushups ? 1 : 0, delta * 8);
            const pu = p.pushupAmount || 0;
            if (pu > 0.01) {
                p.pushupPhase = (p.pushupPhase || 0) + delta * Math.PI * 2 * 0.9; // ~0.9 pushup/sec
                const ps = Math.sin(p.pushupPhase); // -1 (neeche) .. +1 (upar)
                // 💪 PUSHUP ANIMATION — body upar/neeche (bob) + baazu
                // bend/straight (neeche jao to kohniyan muro, upar aao to seedhi).
                p.pushupBob = ps * 0.16; // up/down 0.16 (pehle 0.10 — zyada visible)
                p.mesh.rotation.x = (Math.PI / 2) * pu; // MUNH KE BALL (face-down).
                // Gun gayab (pushups me haath me gun nahi hoti).
                if (p.gunGroup) p.gunGroup.visible = false;
                // Baazu pushup pose — body neeche ho to zyada bend (-1.5),
                // upar ho to seedhe (-0.9). Kohniyan bhi bend hoti hain.
                const armAnim = ps * 0.3;
                if (p.parts.leftArmGroup) p.parts.leftArmGroup.rotation.x = (-1.2 + armAnim) * pu + baseArmLRotX * (1 - pu);
                if (p.parts.rightArmGroup) p.parts.rightArmGroup.rotation.x = (-1.2 + armAnim) * pu + baseArmRRotX * (1 - pu);
                const baseElbL = (typeof lobbyCustomParts !== 'undefined' && lobbyCustomParts.leftElbow) ? lobbyCustomParts.leftElbow.rotX : 0;
                const baseElbR = (typeof lobbyCustomParts !== 'undefined' && lobbyCustomParts.rightElbow) ? lobbyCustomParts.rightElbow.rotX : 0;
                if (p.parts.leftElbow) p.parts.leftElbow.rotation.x = (baseElbL + (1 - ps) * 0.5) * pu + baseElbL * (1 - pu);
                if (p.parts.rightElbow) p.parts.rightElbow.rotation.x = (baseElbR + (1 - ps) * 0.5) * pu + baseElbR * (1 - pu);
                if (p.parts.leftLeg) p.parts.leftLeg.rotation.x = baseLegL * (1 - pu);
                if (p.parts.rightLeg) p.parts.rightLeg.rotation.x = baseLegR * (1 - pu);
            } else {
                p.pushupBob = 0;
                if (p.gunGroup) p.gunGroup.visible = true;
                p.mesh.rotation.x = 0;
            }
        }
    });

    if ((isLocked || isMobile) && !isDeadLocal && !matchResultsOpen) {
        // 💪 Pushup — camera zameen ke paas (0.45) + up/down bob (animation).
        if (isDoingPushups) pushupPhase += delta * Math.PI * 2 * 0.9; // ~0.9 pushup/sec
        const pushupBobLocal = isDoingPushups ? Math.sin(pushupPhase) * 0.12 : 0;
        targetPlayerHeight = isDoingPushups ? (0.45 + pushupBobLocal) : (isCrouching ? 1.0 : 1.62);
        playerHeight += (targetPlayerHeight - playerHeight) * 15.0 * delta;
        let moveSpeed = isDoingPushups ? 0 : (isCrouching ? 4.0 : 8.0); // Pushups me chal nahi sakte.

        let inputX = (moveRight ? 1 : 0) - (moveLeft ? 1 : 0);
        let inputZ = (moveForward ? 1 : 0) - (moveBackward ? 1 : 0);
        // 📱 Mobile joystick (analog) — keyboard flags ke saath milao,
        // taake joystick se 360° (kisi bhi angle) chal sako.
        if (isMobile) {
            inputX += mobileMoveX;
            inputZ += mobileMoveZ;
            inputX = Math.max(-1, Math.min(1, inputX));
            inputZ = Math.max(-1, Math.min(1, inputZ));
        }
        const isMoving = (inputX !== 0 || inputZ !== 0);

        const moveVector = new THREE.Vector3();
        if (isMoving) {
            const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
            const side = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
            moveVector.addScaledVector(forward, inputZ);
            moveVector.addScaledVector(side, inputX);
            moveVector.normalize();
        }

        camera.position.addScaledVector(moveVector, moveSpeed * delta);
        velocity.y -= 32.0 * delta; 
        camera.position.y += velocity.y * delta;

        if (camera.position.y <= playerHeight) {
            velocity.y = 0;
            canJump = true;
            camera.position.y = playerHeight;
            // 🌙 Land ho gaye — ab 300ms me Shift dabao to bhop tap armed.
            // (Har landing par naya window; tap/jump windows reset.)
            bhopLandUntil = performance.now() + BHOP_LAND_WINDOW_MS;
            bhopTapArmed = false;
            bhopJumpUntil = 0;
        }

        // 🔫 AR-9 FULL-AUTO — left click dabaye rakho to rifle lagatar
        // chalti hai (har 100ms = 600 RPM). Sirf AR-9 (weapon 1 + ar9)
        // auto hai; VITA (sniper) semi-auto hai (ek click = ek goli),
        // pistol/revolver ek click = ek goli, knife ek swing/click.
        // shoot() khud hi isInGameGunEditing / isDoingPushups / dead
        // check karta hai.
        if (isMouseHeld && currentWeapon === 1 && equippedGun1 === 'ar9' && performance.now() - lastAutoShotTime >= AR9_FIRE_INTERVAL_MS) {
            lastAutoShotTime = performance.now();
            shoot({ button: 0 });
        }

        // 🔫 VIEWMODEL BOB — chalte waqt gun upar/neeche + halki side
        // sway (jaise chalte hue haath me gun hilti hai). Sirf apni
        // screen par: ye first-person viewmodel (gun/pistol/knife =
        // camera ki child) par lagta hai, is liye dusra player hamari
        // gun ko hilta hua NAHI dekhta (uski gun inGameGunGroups me hai,
        // wahan bob nahi lagta). Khade ho to bob smooth 0 ho jata hai.
        updateViewmodelBob(delta, isMoving, isCrouching);

        socket.emit('playerMovement', {
            x: camera.position.x, y: camera.position.y, z: camera.position.z,
            // yaw = look direction (poora banda ghoomta hai, head alag nahi).
            yaw: yaw, pitch: pitch, isMoving: isMoving, isCrouching: isCrouching, isDoingPushups: isDoingPushups,
            gun1: equippedGun1 // 🎒 Slot 1 gun (AR-9/VITA) — baaki players ko dikhe.
        });
    }

    // 📷 CAMERA BOB (Y) — screen upar/neeche hile. Sirf render ke liye
    // offset lagao, phir wapas hata do — taake physics / shadow /
    // playerMovement ko bob ka asar na pade (sirf screen hile).
    const camBobY = Math.sin(viewBobPhase * 2) * 0.04 * camBob * (isCrouching ? 0.6 : 1);
    camera.position.y += camBobY;
    renderer.render(scene, camera);
    camera.position.y -= camBobY;
}

function onWindowResize() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}