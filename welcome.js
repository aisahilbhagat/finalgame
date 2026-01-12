// Check if character.js is the correct version
setTimeout(() => {
    if (!window.state || !window.FRAMES) {
        document.getElementById('error-msg').style.display = 'block';
    }
}, 500);

// --- LEVEL SETUP ---
let FLOOR_Y = 0;

const buildLevel = () => {
    FLOOR_Y = window.innerHeight - 80;
    return [
        { x: -5000, y: FLOOR_Y, w: 10000, h: 500, type: 'solid', color: '#0d1b2a' } 
    ];
};

let LEVEL = buildLevel();

// --- PARTICLE SYSTEMS ---
let globalTime = 0;
const windParticles = [];
const debrisParticles = []; 
const stars = []; // Array for stars

const initWind = () => {
    // 1. Wind Streaks
    windParticles.length = 0;
    for(let i=0; i<8; i++) { 
        windParticles.push({
            x: Math.random() * window.innerWidth,
            y: Math.random() * (window.innerHeight - 150),
            speed: 6 + Math.random() * 8,
            length: 100 + Math.random() * 150, 
            amplitude: 5 + Math.random() * 15, 
            period: 0.01 + Math.random() * 0.02, 
            offset: Math.random() * Math.PI * 2 
        });
    }

    // 2. Tiny Debris
    debrisParticles.length = 0;
    for(let i=0; i<6; i++) { 
        debrisParticles.push({
            x: Math.random() * window.innerWidth,
            y: Math.random() * (window.innerHeight - 50),
            speed: 4 + Math.random() * 4,
            size: 1 + Math.random() * 2,
            oscillation: Math.random() * 0.1
        });
    }

    // 3. Stars
    stars.length = 0;
    for(let i=0; i<150; i++) {
        stars.push({
            x: Math.random() * window.innerWidth,
            y: Math.random() * (window.innerHeight - 200), // Keep in sky area
            size: Math.random() * 1.5 + 0.5,
            baseAlpha: Math.random() * 0.5 + 0.2, // Random brightness
            twinkleOffset: Math.random() * Math.PI * 2, // Random start cycle
            twinkleSpeed: 0.02 + Math.random() * 0.05 // Random pulse speed
        });
    }
};

// --- ADVANCED AUDIO MANAGER (OVERLAP LOOP) ---
const AudioManager = {
    t1: new Audio('wind.mp3'),
    t2: new Audio('wind.mp3'),
    clickSound: new Audio('mouse-click.wav'), // NEW: Click sound
    current: null, // The track currently being monitored
    volume: 0.5, // Default volume 50%
    
    init() {
        this.t1.loop = false;
        this.t2.loop = false;
        this.clickSound.loop = false; // One-shot
        this.current = this.t1;
        
        // Set initial volume
        this.setVolume(this.volume);

        // Try to play immediately
        this.play();

        // Fallback for browser autoplay policies
        const unlock = () => {
            this.play();
            window.removeEventListener('click', unlock);
            window.removeEventListener('keydown', unlock);
            window.removeEventListener('touchstart', unlock);
        };
        window.addEventListener('click', unlock);
        window.addEventListener('keydown', unlock);
        window.addEventListener('touchstart', unlock);
    },

    play() {
        this.current.play().catch(e => { /* Ignore auto-play errors */ });
        const other = this.current === this.t1 ? this.t2 : this.t1;
        if (!other.paused && !other.ended) {
            other.play().catch(e => {});
        }
    },
    
    // NEW: Play Click Sound
    playClick() {
        // Reset time to 0 to allow rapid clicking
        this.clickSound.currentTime = 0;
        this.clickSound.play().catch(e => {});
    },

    pause() {
        this.t1.pause();
        this.t2.pause();
    },

    setVolume(val) {
        this.volume = Math.max(0, Math.min(1, val));
        this.t1.volume = this.volume;
        this.t2.volume = this.volume;
        this.clickSound.volume = this.volume; // Update click volume too
    },

    update() {
        if (this.current.duration && this.current.currentTime >= this.current.duration - 1) {
            const next = this.current === this.t1 ? this.t2 : this.t1;
            if (next.paused || next.ended) {
                next.currentTime = 0;
                next.play().catch(e => {});
                this.current = next;
            }
        }
    }
};

// Initialize Audio Logic
AudioManager.init();

// ** CRITICAL FIX: EXPOSE AUDIO MANAGER TO WINDOW FOR MENU.JS **
window.AudioManager = AudioManager;

// --- CANVAS BUTTONS & MENU SYSTEM ---
let canvasButtons = [];
window.canvasMenuVisible = true; // Use window to make it globally accessible
let activeModal = null; // 'about' | 'settings' | null
let isDraggingVolume = false; // State to track slider dragging

// --- NEW: Restore Main Menu (Called by menu.js) ---
window.resetWelcomeScreen = function() {
    window.canvasMenuVisible = true;
    activeModal = null;
}

// ======================================================
// UPDATED: startGame handles toggle or load
// ======================================================
function startGame() {
    console.log('PLAY triggered');
    
    // 1. Hide the Welcome Page buttons
    window.canvasMenuVisible = false; 
    activeModal = null;

    // 2. Check if GameMenu is already loaded
    if (window.GameMenu) {
        console.log('Activating existing GameMenu...');
        window.GameMenu.active = true;
        // Manually trigger init to ensure sound pauses
        if(window.GameMenu.init) window.GameMenu.init();
        return;
    }

    // 3. Load if not exists
    console.log('Loading menu.js...');
    const script = document.createElement('script');
    script.src = 'menu.js';
    script.onload = () => {
        console.log('menu.js loaded successfully.');
    };
    script.onerror = () => {
        console.error('Failed to load menu.js');
        window.canvasMenuVisible = true;
    };
    document.body.appendChild(script);
}

function openSettings() {
    console.log('SETTINGS triggered');
    activeModal = 'settings';
    AudioManager.pause(); // Pause audio when modal opens
}

function openAbout() {
    console.log('ABOUT triggered');
    activeModal = 'about';
    AudioManager.pause(); // Pause audio when modal opens
}

function createCanvasButtons() {
    // Base Configuration
    const baseW = 220;
    const baseH = 64;
    const baseGap = 30; // space between buttons

    // --- RESPONSIVE SCALING ---
    const totalBaseWidth = (3 * baseW) + (2 * baseGap);
    let scale = 1;
    const margin = 40;
    if (canvas.width < totalBaseWidth + margin) {
        scale = (canvas.width - margin) / totalBaseWidth;
    }

    const btnW = baseW * scale;
    const btnH = baseH * scale; 
    const gap = baseGap * scale;

    // --- POSITIONING ---
    const totalWidth = (3 * btnW) + (2 * gap);
    const startX = (canvas.width - totalWidth) / 2;
    const rowY = (canvas.height / 2) + 60;

    // --- LAYOUT ---
    canvasButtons = [
        { id: 'about',    label: 'ABOUT US',  x: startX,                    y: rowY, w: btnW, h: btnH, hot: false, mouseIsOver: false, pressed: false, pressTimer: 0, triggerOnUp: false, action: openAbout },
        { id: 'play',     label: 'PLAY',      x: startX + btnW + gap,       y: rowY, w: btnW, h: btnH, hot: false, mouseIsOver: false, pressed: false, pressTimer: 0, triggerOnUp: false, action: startGame },
        { id: 'settings', label: 'SETTINGS',  x: startX + (btnW + gap) * 2, y: rowY, w: btnW, h: btnH, hot: false, mouseIsOver: false, pressed: false, pressTimer: 0, triggerOnUp: false, action: openSettings }
    ];
}

function drawDirtButton(ctx, btn) {
    ctx.save();
    const depth = 8;
    const isPressed = btn.pressed || btn.pressTimer > 0;
    const colorSide = '#4a3121'; 
    const colorTop = btn.hot ? '#b37c45' : '#8b5a2b'; // Highlight color used when hot is true
    const colorBorder = '#3c2a1e'; 
    const colorHighlight = '#d49b60'; 

    const faceY = isPressed ? btn.y + depth : btn.y;
    const faceH = btn.h - depth;

    if (!isPressed) {
        ctx.fillStyle = colorSide;
        ctx.fillRect(btn.x, btn.y + depth, btn.w, btn.h - depth);
        ctx.strokeStyle = colorBorder;
        ctx.lineWidth = 2;
        ctx.strokeRect(btn.x, btn.y + depth, btn.w, btn.h - depth);
    }

    ctx.fillStyle = colorTop;
    ctx.fillRect(btn.x, faceY, btn.w, faceH);
    ctx.strokeStyle = colorBorder;
    ctx.lineWidth = 3;
    ctx.strokeRect(btn.x, faceY, btn.w, faceH);
    ctx.fillStyle = colorHighlight;
    ctx.fillRect(btn.x + 3, faceY + 3, btn.w - 6, 4);

    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    for(let i=0; i<4; i++) {
        ctx.fillRect(btn.x + 10 + (i*40), faceY + 15 + (i%2)*10, 6, 6);
        ctx.fillRect(btn.x + 30 + (i*40), faceY + 30 - (i%2)*10, 4, 4);
    }

    ctx.font = 'bold ' + Math.floor(btn.h * 0.35) + 'px monospace'; 
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillText(btn.label, btn.x + btn.w / 2 + 2, faceY + faceH / 2 + 2);
    ctx.fillStyle = '#ffeedd';
    ctx.fillText(btn.label, btn.x + btn.w / 2, faceY + faceH / 2);

    ctx.restore();
}

// --- INFO BOX / MODAL SYSTEM ---

function drawModal(ctx) {
    if (!activeModal) return;

    ctx.save();
    // 1. Dim Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Modal Dimensions (Increased height to fit new member)
    const w = Math.min(600, canvas.width - 40);
    const h = 520; 
    const x = (canvas.width - w) / 2;
    const y = (canvas.height - h) / 2;

    // 3. Draw Panel (Dirt/Wood Style)
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(x, y, w, h);
    
    // Border
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#3c2a1e';
    ctx.strokeRect(x, y, w, h);

    // Inner Highlight
    ctx.strokeStyle = '#a06e3d';
    ctx.lineWidth = 2;
    ctx.strokeRect(x+6, y+6, w-12, h-12);

    // 4. Content
    ctx.textAlign = 'center';

    if (activeModal === 'about') {
        ctx.fillStyle = '#ffeedd';
        ctx.font = 'bold 36px monospace';
        ctx.fillText("CREDITS", x + w/2, y + 60);

        // Team Members
        const startY = y + 120;
        const gap = 80;

        // 1
        ctx.font = '24px monospace';
        ctx.fillStyle = '#fff';
        ctx.fillText("Sahil Bhagat", x + w/2, startY);
        ctx.font = 'italic 18px monospace';
        ctx.fillStyle = '#ffd700';
        ctx.fillText("(DEVELOPER)", x + w/2, startY + 25);

        // 2
        ctx.font = '24px monospace';
        ctx.fillStyle = '#fff';
        ctx.fillText("Ayush Tirkey", x + w/2, startY + gap);
        ctx.font = 'italic 18px monospace';
        ctx.fillStyle = '#ffd700';
        ctx.fillText("(IDEA & GAME DESIGNER)", x + w/2, startY + gap + 25);

        // 3
        ctx.font = '24px monospace';
        ctx.fillStyle = '#fff';
        ctx.fillText("Aditya Raj", x + w/2, startY + gap * 2);
        ctx.font = 'italic 18px monospace';
        ctx.fillStyle = '#ffd700';
        ctx.fillText("(LEVEL DESIGNER)", x + w/2, startY + gap * 2 + 25);

        // 4 (New)
        ctx.font = '24px monospace';
        ctx.fillStyle = '#fff';
        ctx.fillText("Mayank", x + w/2, startY + gap * 3);
        ctx.font = 'italic 18px monospace';
        ctx.fillStyle = '#ffd700';
        ctx.fillText("(VIDEO ART & CUT SCENE DESIGNER)", x + w/2, startY + gap * 3 + 25);

    } else if (activeModal === 'settings') {
        ctx.fillStyle = '#ffeedd';
        ctx.font = 'bold 36px monospace';
        ctx.fillText("SETTINGS", x + w/2, y + 60);
        
        // Volume Section
        const volY = y + 150;
        ctx.font = '24px monospace';
        ctx.fillStyle = '#fff';
        ctx.fillText("Sound Volume", x + w/2, volY);

        // --- DRAGGABLE SLIDER ---
        const barW = 300;
        const barH = 16;
        const knobSize = 32;
        
        const barX = x + w/2 - barW/2;
        const barY = volY + 40;

        // Draw Track (Dark groove)
        ctx.fillStyle = '#3c2a1e';
        ctx.fillRect(barX, barY, barW, barH);
        ctx.strokeStyle = '#2a1d15';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barW, barH);

        // Draw Fill (Green/Lit part)
        const fillW = barW * AudioManager.volume;
        if(fillW > 0) {
            ctx.fillStyle = '#76ff03';
            ctx.fillRect(barX, barY, fillW, barH);
        }

        // Draw Knob (Draggable block)
        const knobX = barX + fillW - (knobSize/2);
        const knobY = barY + barH/2 - (knobSize/2);
        
        // Knob Body
        ctx.fillStyle = '#b37c45'; 
        ctx.fillRect(knobX, knobY, knobSize, knobSize);
        
        // Knob Bevel/Border
        ctx.strokeStyle = '#fff'; 
        ctx.lineWidth = 2;
        ctx.strokeRect(knobX, knobY, knobSize, knobSize);
        
        // Knob detail
        ctx.fillStyle = '#8b5a2b';
        ctx.fillRect(knobX + 8, knobY + 8, knobSize - 16, knobSize - 16);

        // Percentage Text
        ctx.fillStyle = '#ccc';
        ctx.font = '16px monospace';
        ctx.fillText(Math.round(AudioManager.volume * 100) + "%", x + w/2, volY + 85);
    }

    // 5. Close Instruction
    ctx.font = '16px monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillText("[ Click Outside to Close ]", x + w/2, y + h - 20);

    ctx.restore();
}

// Helper to check clicks inside the modal elements
function getModalMetrics() {
    const w = Math.min(600, canvas.width - 40);
    const h = 520; // Matched height
    const x = (canvas.width - w) / 2;
    const y = (canvas.height - h) / 2;
    return { x, y, w, h };
}

// Checks if mouse is in the slider hit area (generous padding)
function checkSliderHit(mx, my) {
    if (activeModal !== 'settings') return false;
    
    const m = getModalMetrics();
    const volY = m.y + 150;
    const barW = 300;
    const barH = 16;
    const barX = m.x + m.w/2 - barW/2;
    const barY = volY + 40;
    
    // Hit box with padding for easier grabbing
    const padding = 20;
    if (mx >= barX - padding && mx <= barX + barW + padding &&
        my >= barY - padding && my <= barY + barH + padding) {
        return true;
    }
    return false;
}

// Updates volume based on mouse X position relative to slider
function updateVolumeFromMouse(mx) {
    const m = getModalMetrics();
    const barW = 300;
    const barX = m.x + m.w/2 - barW/2;
    
    let pct = (mx - barX) / barW;
    pct = Math.max(0, Math.min(1, pct));
    AudioManager.setVolume(pct);
}

function pointInButton(px, py, btn) {
    return px >= btn.x && py >= btn.y && px <= btn.x + btn.w && py <= btn.y + btn.h;
}

function playerOverlapsButton(btn) {
    if (!window.state || !window.state.hitbox) return false;
    const hb = window.state.hitbox;
    const px1 = window.state.x + hb.offsetX;
    const py1 = window.state.y + hb.offsetY;
    const px2 = px1 + hb.width;
    const py2 = py1 + hb.height;
    const bx1 = btn.x, by1 = btn.y, bx2 = btn.x + btn.w, by2 = btn.y + btn.h;
    return !(px2 < bx1 || px1 > bx2 || py2 < by1 || py1 > by2);
}

// --- OVERRIDE INITIALIZATION ---
const initGame = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    LEVEL = buildLevel();
    initWind();
    
    if (window.state) {
        window.state.groundY = FLOOR_Y;
        window.state.x = (window.innerWidth / 2) - 18;
        window.state.y = FLOOR_Y - 60;
        window.state.vx = 0;
        window.state.vy = 0;
    }
    createCanvasButtons();
};

window.addEventListener('resize', initGame);
setTimeout(initGame, 100); 

// --- RENDER FUNCTIONS ---
function renderStars(ctx, time) {
    ctx.save();
    ctx.fillStyle = 'white';
    ctx.shadowBlur = 4;
    ctx.shadowColor = 'white';
    for (const star of stars) {
        const alpha = star.baseAlpha + Math.sin(time * 2 + star.twinkleOffset) * 0.2;
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

// --- NEW: RENDER CASTLE & KINGDOM BACKGROUND ---
function renderKingdom(ctx, time) {
    ctx.save();
    const horizon = FLOOR_Y + 15; // Base of the castle
    const cx = canvas.width * 0.7; // Offset to the right
    
    // 1. BACKGROUND MOUNTAINS (New Layer for Scale & Density)
    // Slightly faded color to push it back
    ctx.fillStyle = '#162830'; 
    ctx.beginPath();
    ctx.moveTo(0, horizon);
    // Jagged peaks loop
    const mountStart = cx - 1000;
    const mountEnd = cx + 800;
    
    // Left large mountain
    ctx.lineTo(cx - 700, horizon - 200); 
    ctx.lineTo(cx - 500, horizon - 150);
    ctx.lineTo(cx - 300, horizon - 350); // Big Peak Left
    ctx.lineTo(cx - 100, horizon - 100); 
    
    // Behind Castle Mountain
    ctx.lineTo(cx + 100, horizon - 400); // Massive Peak behind
    ctx.lineTo(cx + 400, horizon - 150);
    ctx.lineTo(cx + 600, horizon - 250);
    
    ctx.lineTo(canvas.width, horizon);
    ctx.lineTo(canvas.width, canvas.height);
    ctx.lineTo(0, canvas.height);
    ctx.fill();

    // 2. FOREGROUND KINGDOM (Silhouette Color)
    ctx.fillStyle = '#1c3440'; 
    
    ctx.beginPath();
    ctx.moveTo(0, horizon);
    
    // --- Extended Left Village (More dense houses) ---
    ctx.lineTo(cx - 600, horizon - 30);
    ctx.lineTo(cx - 580, horizon - 50); // House 1
    ctx.lineTo(cx - 560, horizon - 30);
    ctx.lineTo(cx - 540, horizon - 60); // Tower 1
    ctx.lineTo(cx - 520, horizon - 60);
    ctx.lineTo(cx - 520, horizon - 30);
    ctx.lineTo(cx - 500, horizon - 80); // Tall House
    ctx.lineTo(cx - 460, horizon - 40); 
    
    // Original Far Left Hills connection
    ctx.lineTo(cx - 400, horizon - 40);
    
    // Village Left (Original + Extras)
    ctx.lineTo(cx - 380, horizon - 65); // Added house
    ctx.lineTo(cx - 360, horizon - 40);
    
    ctx.lineTo(cx - 350, horizon - 40);
    ctx.lineTo(cx - 325, horizon - 70); // House roof
    ctx.lineTo(cx - 300, horizon - 40);
    
    ctx.lineTo(cx - 290, horizon - 55); // Added house
    ctx.lineTo(cx - 280, horizon - 40);
    
    ctx.lineTo(cx - 260, horizon - 60); // Small tower
    ctx.lineTo(cx - 240, horizon - 40);
    
    // Castle Base Left
    ctx.lineTo(cx - 200, horizon - 50);
    
    // Left Watchtower
    ctx.lineTo(cx - 180, horizon - 50);
    ctx.lineTo(cx - 180, horizon - 160); // Up
    ctx.lineTo(cx - 200, horizon - 160); // Overhang
    ctx.lineTo(cx - 190, horizon - 180); // Roof peak
    ctx.lineTo(cx - 160, horizon - 180);
    ctx.lineTo(cx - 150, horizon - 160);
    ctx.lineTo(cx - 150, horizon - 80); // Down to wall
    
    // Connecting Wall
    ctx.lineTo(cx - 100, horizon - 80);
    
    // Main Keep (Center)
    ctx.lineTo(cx - 100, horizon - 250); // Tall Up
    // Battlements
    ctx.lineTo(cx - 120, horizon - 250);
    ctx.lineTo(cx - 120, horizon - 270);
    ctx.lineTo(cx - 90, horizon - 270);
    ctx.lineTo(cx - 90, horizon - 260); // Gap
    ctx.lineTo(cx - 70, horizon - 260);
    ctx.lineTo(cx - 70, horizon - 270);
    ctx.lineTo(cx - 40, horizon - 270);
    ctx.lineTo(cx - 40, horizon - 250); // Down right side of top
    
    ctx.lineTo(cx, horizon - 250);
    ctx.lineTo(cx, horizon - 80); // Back to wall level
    
    // Right Tower
    ctx.lineTo(cx + 40, horizon - 80);
    ctx.lineTo(cx + 40, horizon - 150);
    ctx.lineTo(cx + 20, horizon - 150);
    ctx.lineTo(cx + 50, horizon - 190); // Pointy Roof
    ctx.lineTo(cx + 80, horizon - 150);
    ctx.lineTo(cx + 60, horizon - 150);
    ctx.lineTo(cx + 60, horizon - 50);
    
    // Village Right (Expanded)
    ctx.lineTo(cx + 100, horizon - 50);
    ctx.lineTo(cx + 120, horizon - 90); // Church/Hall
    ctx.lineTo(cx + 140, horizon - 50);
    
    ctx.lineTo(cx + 150, horizon - 70); // Added House
    ctx.lineTo(cx + 170, horizon - 50);
    
    ctx.lineTo(cx + 180, horizon - 60); // Added Tower
    ctx.lineTo(cx + 190, horizon - 60); 
    ctx.lineTo(cx + 190, horizon - 50);

    // Far Right Hills
    ctx.lineTo(cx + 300, horizon - 60);
    ctx.lineTo(canvas.width, horizon - 20);
    
    // Fill Bottom
    ctx.lineTo(canvas.width, canvas.height);
    ctx.lineTo(0, canvas.height);
    ctx.fill();

    // 3. Windows (Lights) - POPULATED
    ctx.fillStyle = '#fdd835'; // Warm yellow light
    
    // Calculate flicker
    const flicker = 0.5 + Math.sin(time * 4) * 0.1 + Math.sin(time * 10) * 0.05;
    ctx.globalAlpha = flicker;

    // Define window positions relative to cx
    const windows = [
        // Castle Core
        {x: -175, y: -140}, {x: -175, y: -110}, 
        {x: -90, y: -200}, {x: -70, y: -220}, {x: -50, y: -200}, 
        {x: -90, y: -150}, {x: -50, y: -150}, 
        {x: 50, y: -130}, {x: 50, y: -100}, 
        
        // Left Village (New Lights)
        {x: -560, y: -40}, {x: -530, y: -50}, {x: -480, y: -60},
        {x: -370, y: -50}, {x: -310, y: -55}, {x: -290, y: -45},
        
        // Right Village (New Lights)
        {x: 120, y: -65}, {x: 130, y: -75}, {x: 155, y: -60}, {x: 185, y: -55}
    ];

    for(let w of windows) {
        // simple bounds check to save render time if offscreen
        if(cx + w.x > -50 && cx + w.x < canvas.width + 50) {
                ctx.fillRect(cx + w.x, horizon + w.y, 6, 10);
        }
    }
    
    ctx.restore();
}

function renderWind(ctx, time) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.shadowBlur = 0;
    ctx.lineCap = 'round';
    for(let p of windParticles) {
        const wave1 = Math.sin(time * 5 + p.offset) * p.amplitude;
        const wave2 = Math.cos(time * 4 + p.offset) * p.amplitude; 
        const startX = p.x;
        const startY = p.y + wave1;
        const endX = p.x + p.length;
        const endY = p.y + wave2;
        const grad = ctx.createLinearGradient(startX, startY, endX, endY);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        grad.addColorStop(0.2, 'rgba(255, 255, 255, 0.05)');
        grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.15)'); 
        grad.addColorStop(0.8, 'rgba(255, 255, 255, 0.05)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2; 
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.bezierCurveTo(startX + p.length * 0.3, startY - p.amplitude, startX + p.length * 0.7, endY + p.amplitude, endX, endY);
        ctx.stroke();
    }
    ctx.fillStyle = 'rgba(200, 255, 220, 0.3)';
    for(let d of debrisParticles) {
        const yOffset = Math.sin(time * 2 + d.x * 0.01) * 10;
        ctx.beginPath();
        ctx.arc(d.x, d.y + yOffset, d.size, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

// --- MAIN RENDER LOOP ---
window.render = function() {
    const ctx = window.ctx;
    const state = window.state;
    
    if (!ctx || !state) return;

    // 1. Clear Screen
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 2. Render Stars (Background)
    renderStars(ctx, globalTime);

    // 2.5 Render Kingdom (Distant Background)
    renderKingdom(ctx, globalTime);

    // 3. Render Wind (Midground)
    renderWind(ctx, globalTime);

    // 3.5. Render Menu Buttons (In-Game World Overlay)
    if (window.canvasMenuVisible) { // UPDATED: Use window scope
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        for (const btn of canvasButtons) {
            drawDirtButton(ctx, btn);
        }
        ctx.restore();
    }

    // 4. Draw Grass Floor
    for (let block of LEVEL) {
        ctx.fillStyle = block.color; 
        ctx.fillRect(block.x, block.y, block.w, block.h);
        ctx.fillStyle = '#1b4332'; 
        ctx.fillRect(block.x, block.y, block.w, 15);
        ctx.strokeStyle = '#2d6a4f'; 
        ctx.lineWidth = 2;
        ctx.beginPath();
        const startX = Math.max(block.x, 0);
        const endX = Math.min(block.x + block.w, canvas.width);
        for (let i = startX; i < endX; i += 6) {
            const baseHeight = 15 + Math.cos(i * 0.2) * 5;
            const windForce = Math.sin(globalTime * 2 + i * 0.005) * 8; 
            const turbulence = Math.sin(globalTime * 8 + i * 0.1) * 2; 
            const lean = 5 + windForce + turbulence;
            ctx.moveTo(i, block.y);
            ctx.quadraticCurveTo(i + lean * 0.5, block.y - baseHeight * 0.5, i + lean, block.y - baseHeight);
        }
        ctx.stroke();
    }

    // 5. Draw Character
    if (window.drawPixelSprite && window.FRAMES) {
        const currentFrameSet = window.FRAMES[state.anim];
        if (currentFrameSet) {
            const safeIndex = state.frameIndex % currentFrameSet.length;
            const offY = (typeof window.SPRITE_OFFSET_Y !== 'undefined') ? window.SPRITE_OFFSET_Y : -6;
            window.drawPixelSprite(ctx, currentFrameSet[safeIndex], state.x, state.y + offY, 6, state.facingRight);
        }
    }

    // 6. Draw Active Modal (if any)
    drawModal(ctx);
};

// --- UPDATE LOOP ---
const originalUpdate = window.update;
let wasAttackingLastFrame = false; 

window.update = function() {
    // PAUSE GAME IF MODAL IS OPEN
    if (activeModal) return;

    if (originalUpdate) originalUpdate(); 

    // Update Audio Overlap Logic
    AudioManager.update();
    
    const state = window.state;
    if(!state) return;

    globalTime += 0.02; 

    for(let p of windParticles) {
        p.x += p.speed;
        if(p.x > canvas.width) {
            p.x = -p.length - (Math.random() * 200); 
            p.y = Math.random() * (window.innerHeight - 150);
        }
    }
    for(let d of debrisParticles) {
        d.x += d.speed;
        if(d.x > canvas.width) {
            d.x = -10;
            d.y = Math.random() * (window.innerHeight - 50);
        }
    }

    if (state.y + state.hitbox.offsetY + state.hitbox.height >= FLOOR_Y) {
        state.y = FLOOR_Y - (state.hitbox.offsetY + state.hitbox.height);
        state.vy = 0;
        state.isGrounded = true;
        if(!state.wasGrounded) state.justLanded = true;
    }
    state.wasGrounded = state.isGrounded;

    // --- MENU INTERACTION ---
    if (window.canvasMenuVisible) { // UPDATED: Use window scope
        const isAttackingNow = state.isAttacking;
        for (const btn of canvasButtons) {
            if (btn.pressTimer > 0) {
                btn.pressTimer--;
                if (btn.pressTimer === 0 && btn.triggerOnUp) {
                    btn.action();
                    btn.triggerOnUp = false;
                }
            }

            // Check PLAYER interaction
            const playerHit = playerOverlapsButton(btn);

            // Logic for Triggering Button Action with Player Attack
            if (playerHit) {
                if (isAttackingNow && !wasAttackingLastFrame && btn.pressTimer === 0) {
                    btn.pressTimer = 15; 
                    btn.triggerOnUp = true; 
                }
            }

            // VISUAL HOVER: True if Player is over OR Mouse is over
            btn.hot = playerHit || btn.mouseIsOver;
        }
        wasAttackingLastFrame = isAttackingNow;
    }
};

// --- EVENT LISTENERS FOR MENU ---

// Mouse Move (Track hover state & Dragging)
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    // Handle Volume Dragging
    if (activeModal === 'settings' && isDraggingVolume) {
        updateVolumeFromMouse(mx);
        canvas.style.cursor = 'grabbing';
        return;
    }

    if (activeModal) {
        // If hover over slider, show grab cursor
        if (checkSliderHit(mx, my)) {
            canvas.style.cursor = 'grab';
        } else {
            canvas.style.cursor = 'default';
        }
        return;
    }

    if (!window.canvasMenuVisible) {
        canvas.style.cursor = 'default';
        return;
    }
    
    let anyHover = false;
    for (const btn of canvasButtons) {
        const isOver = pointInButton(mx, my, btn);
        btn.mouseIsOver = isOver; // Update distinct mouse property
        if (isOver) anyHover = true;
    }
    
    // Set cursor to pointer if hovering any button
    canvas.style.cursor = anyHover ? 'pointer' : 'default';
});

// Mouse Down (Press)
canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    if (activeModal) {
        // Check if dragging slider
        if (activeModal === 'settings' && checkSliderHit(mx, my)) {
            isDraggingVolume = true;
            updateVolumeFromMouse(mx); // Snap to click pos immediately
            return;
        }

        // Close modal if click is outside modal area
        // Using a simple logic: if not inside the modal box
        const m = getModalMetrics();
        if (mx < m.x || mx > m.x + m.w || my < m.y || my > m.y + m.h) {
            activeModal = null;
            AudioManager.play(); // RESUME AUDIO when closing modal
        }
        return;
    }

    if (!window.canvasMenuVisible) return;
    
    for (const btn of canvasButtons) {
        if (pointInButton(mx, my, btn)) {
            btn.pressed = true; 
            return;
        }
    }
});

// Mouse Up (Release)
window.addEventListener('mouseup', () => {
    if (isDraggingVolume) {
        isDraggingVolume = false;
    }

    if (activeModal) return; 

    if (!window.canvasMenuVisible) return;
    for (const btn of canvasButtons) {
        if (btn.pressed) {
            btn.pressed = false; 
            AudioManager.playClick(); // NEW: Play click sound on release
            btn.action(); 
        }
    }
});

// Touch support
canvas.addEventListener('touchstart', (e) => {
    const rect = canvas.getBoundingClientRect();
    const t = e.touches[0];
    const mx = (t.clientX - rect.left) * (canvas.width / rect.width);
    const my = (t.clientY - rect.top) * (canvas.height / rect.height);

    if (activeModal) {
            if (activeModal === 'settings' && checkSliderHit(mx, my)) {
            isDraggingVolume = true;
            updateVolumeFromMouse(mx);
            e.preventDefault();
            return;
        }

        const m = getModalMetrics();
        if (mx < m.x || mx > m.x + m.w || my < m.y || my > m.y + m.h) {
            activeModal = null;
            AudioManager.play();
        }
        
        e.preventDefault();
        return;
    }

    if (!window.canvasMenuVisible) return;
    if (!t) return;
    
    for (const btn of canvasButtons) {
        if (pointInButton(mx, my, btn)) {
            btn.pressed = true;
            e.preventDefault();
            setTimeout(() => { 
                if(btn.pressed) {
                    btn.pressed = false; 
                    AudioManager.playClick(); // NEW: Play click sound on tap
                    btn.action(); 
                }
            }, 150);
            return;
        }
    }
}, {passive:false});

// Touch Move for Slider
canvas.addEventListener('touchmove', (e) => {
        if (activeModal === 'settings' && isDraggingVolume) {
        const t = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const mx = (t.clientX - rect.left) * (canvas.width / rect.width);
        updateVolumeFromMouse(mx);
        e.preventDefault();
        }
}, {passive:false});

// Touch End
    window.addEventListener('touchend', () => {
        isDraggingVolume = false;
    });
