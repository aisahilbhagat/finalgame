// menu.js
console.log("%c MENU.JS LOADED ", "background: #222; color: #bada55; font-size: 20px");

window.GameMenu = {
    // --- STATE ---
    _active: true, // Internal variable
    
    // ✅ MAGIC SETTER: Stops music automatically when Engine sets active = false
    get active() { 
        return this._active; 
    },
    set active(value) {
        this._active = value;
        if (value === false) {
            this.stopMusic();
        }
    },

    currentScreen: null, 
    buttons: [],
    stars: [], 
    lightParticles: [], 
    mountainLights: [], 
    comets: [], 
    cometTimer: 0,
    nextCometTime: 100,

    // --- AUDIO ---
    menuMusic: new Audio('menu-bg-sound.ogg'),
    clickSound: new Audio('mouse-click.wav'), 

    // --- LIGHTNING (BOLT) VARIABLES ---
    lightningBolts: [],
    lightningTimer: 0,
    nextLightningTime: 300, 
    
    init: function() {
        console.log("Initializing Menu System...");
        
        // 1. Pause Main Game Ambience
        if (window.AudioManager) {
            window.AudioManager.pause();
        }

        // 2. Start Menu Music
        this.menuMusic.loop = true;

        // --- LOAD SAVED VOLUME ---
        const savedVolume = localStorage.getItem('adventureGame_musicVolume');
        if (savedVolume !== null) {
            this.menuMusic.volume = parseFloat(savedVolume);
        } else {
            this.menuMusic.volume = 0.5; 
        }
        
        const playPromise = this.menuMusic.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.log("Menu music blocked (interaction needed).");
            });
        }

        this.setupLayout();
        this.createStars();

        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);

        window.addEventListener('mousemove', this.handleMouseMove);
        window.addEventListener('mousedown', this.handleMouseDown);
        window.addEventListener('mouseup', this.handleMouseUp);
        
        window.addEventListener('resize', () => {
            this.setupLayout();
            this.createStars(); 
            this.mountainLights = []; 
        });

        window.addEventListener('touchstart', (e) => {
             const t = e.touches[0];
             this.handleMouseDown({ clientX: t.clientX, clientY: t.clientY });
        }, {passive: false});
        
        window.addEventListener('touchend', (e) => {
             this.handleMouseUp({});
        }, {passive: false});
    },

    // ✅ Helper to cleanly stop music
    stopMusic: function() {
        if (this.menuMusic) {
            this.menuMusic.pause();
            this.menuMusic.currentTime = 0;
            console.log("Menu Music Stopped.");
        }
    },

    // --- VOLUME CONTROL ---
    setMusicVolume: function(val) {
        if (this.menuMusic) {
            val = Math.max(0, Math.min(1, val));
            this.menuMusic.volume = val;
            localStorage.setItem('adventureGame_musicVolume', val);
        }
    },

    // --- SCRIPT LOADER & ROUTER ---
    loadScreen: function(scriptName, globalObjectName) {
        if (window[globalObjectName]) {
            this.openSubScreen(window[globalObjectName]);
            return;
        }

        console.log(`Loading ${scriptName}...`);
        const script = document.createElement('script');
        script.src = scriptName;
        script.onload = () => {
            if (window[globalObjectName]) {
                this.openSubScreen(window[globalObjectName]);
            }
        };
        document.body.appendChild(script);
    },

    openSubScreen: function(screenObj) {
        this.currentScreen = screenObj;
        if (screenObj.init) screenObj.init();
        this.buttons.forEach(b => { b.isPressed = false; b.isHovered = false; });
    },

    closeSubScreen: function() {
        this.currentScreen = null;
        document.body.style.cursor = 'default';
    },

    createStars: function() {
        this.stars = [];
        const count = 150;
        for(let i=0; i<count; i++) {
            this.stars.push({
                x: Math.random(), 
                y: Math.random() * 0.7, 
                size: Math.random() * 2 + 1,
                baseAlpha: Math.random() * 0.5 + 0.3, 
                twinkleOffset: Math.random() * Math.PI * 2
            });
        }
    },

    setupLayout: function() {
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        const btnW = 240;
        const btnH = 50;
        const gap = 20;
        const totalH = (btnH * 3) + (gap * 2);
        const startY = cy - (totalH / 2) + 40; 

        const createBtn = (id, label, x, y, w, h) => ({
            id: id, label: label, x: x, y: y, w: w, h: h, 
            color: '#727272', baseColor: '#727272', hoverColor: '#8b8b8b', 
            scale: 1, targetScale: 1, isHovered: false, isPressed: false
        });

        this.buttons = [
            createBtn('back', 'BACK', 40, 40, 120, 50),
            createBtn('load_game', 'LOAD GAME', cx - btnW/2, startY, btnW, btnH),
            createBtn('new_game', 'NEW GAME', cx - btnW/2, startY + (btnH + gap), btnW, btnH),
            createBtn('settings', 'SETTINGS', cx - btnW/2, startY + (btnH + gap) * 2, btnW, btnH)
        ];
    },

    // --- INPUT HANDLERS ---
    getMousePos: function(e, canvas) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) * (canvas.width / rect.width),
            y: (e.clientY - rect.top) * (canvas.height / rect.height)
        };
    },

    handleMouseMove: function(e) {
        if (!this.active) return;
        const canvas = document.querySelector('canvas');
        if (!canvas) return;
        
        if (this.currentScreen && this.currentScreen.handleMouseMove) {
            this.currentScreen.handleMouseMove(e, canvas);
            return;
        }

        const pos = this.getMousePos(e, canvas);

        for (const btn of this.buttons) {
            if (pos.x >= btn.x && pos.x <= btn.x + btn.w && pos.y >= btn.y && pos.y <= btn.y + btn.h) {
                btn.isHovered = true;
                btn.targetScale = btn.isPressed ? 0.95 : 1.1; 
                document.body.style.cursor = 'pointer';
            } else {
                btn.isHovered = false;
                btn.targetScale = 1.0;
                btn.isPressed = false; 
            }
        }
        if (!this.buttons.some(b => b.isHovered)) document.body.style.cursor = 'default';
    },

    handleMouseDown: function(e) {
        if (!this.active) return;
        const canvas = document.querySelector('canvas');
        if (!canvas) return;

        if (this.currentScreen && this.currentScreen.handleMouseDown) {
            this.currentScreen.handleMouseDown(e, canvas);
            return;
        }

        const pos = this.getMousePos(e, canvas);

        for (const btn of this.buttons) {
            if (pos.x >= btn.x && pos.x <= btn.x + btn.w && pos.y >= btn.y && pos.y <= btn.y + btn.h) {
                btn.isPressed = true;
                btn.targetScale = 0.95; 

                this.clickSound.currentTime = 0;
                this.clickSound.play().catch(err => {});
            }
        }
    },

    handleMouseUp: function(e) {
        if (!this.active) return;
        
        if (this.currentScreen && this.currentScreen.handleMouseUp) {
            this.currentScreen.handleMouseUp(e);
            return;
        }

        for (const btn of this.buttons) {
            if (btn.isPressed) {
                btn.isPressed = false;
                btn.targetScale = btn.isHovered ? 1.1 : 1.0; 
                
                if (btn.isHovered) {
                    if (btn.id === 'back') {
                        this.resumeGame();
                    } else if (btn.id === 'load_game') {
                        this.loadScreen('loadgame.js', 'LoadGameScreen');
                    } else if (btn.id === 'new_game') {
                        this.loadScreen('newgame.js', 'NewGameScreen');
                    } else if (btn.id === 'settings') {
                        this.loadScreen('settings.js', 'SettingsScreen');
                    }
                }
            }
        }
    },

    resumeGame: function() {
        this.active = false; // Triggers setter -> Triggers stopMusic()
        
        document.body.style.cursor = 'default';
        if (window.AudioManager) window.AudioManager.play();
        if (window.resetWelcomeScreen) window.resetWelcomeScreen();
        
        window.removeEventListener('mousemove', this.handleMouseMove);
        window.removeEventListener('mousedown', this.handleMouseDown);
        window.removeEventListener('mouseup', this.handleMouseUp);
        window.removeEventListener('resize', this.setupLayout);
    },

    // --- PARTICLES & VISUALS ---
    updateLights: function(w, h) {
        const cx = w / 2;
        const groundY = h - 60;
        const scale = 0.6; 

        if (this.lightParticles.length < 25 && Math.random() < 0.05) {
            const offset = (Math.random() - 0.5) * 800 * scale; 
            const yOffset = Math.random() * 150 * scale;
            const horrorColors = ['#ff0000', '#8a0303', '#cc0000', '#5c0000'];
            
            this.lightParticles.push({
                x: cx + offset,
                y: groundY - yOffset,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.1,
                life: 0,
                maxLife: 200 + Math.random() * 200,
                size: Math.random() * 2 + 1,
                color: horrorColors[Math.floor(Math.random() * horrorColors.length)]
            });
        }

        for (let i = this.lightParticles.length - 1; i >= 0; i--) {
            const p = this.lightParticles[i];
            p.x += p.vx;
            p.y += p.vy + Math.sin(p.life * 0.05) * 0.05; 
            p.life++;
            if (p.life > p.maxLife) this.lightParticles.splice(i, 1);
        }
    },

    drawLights: function(ctx) {
        ctx.save();
        for (const p of this.lightParticles) {
            let alpha = 0;
            const fadeIn = 50, fadeOut = 50;
            if (p.life < fadeIn) alpha = p.life / fadeIn;
            else if (p.life > p.maxLife - fadeOut) alpha = (p.maxLife - p.life) / fadeOut;
            else alpha = 1;
            
            if (Math.random() > 0.9) alpha = 0.5; // Flicker
            alpha *= 0.8;

            ctx.globalAlpha = Math.max(0, alpha);
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, p.size, p.size);
        }
        ctx.restore();
    },

    updateMountainLights: function(w, h) {
        const cx = w / 2;
        const groundY = h - 60;
        const scale = 0.6;
        const maxMountainLights = 12;

        if (this.mountainLights.length < maxMountainLights && Math.random() < 0.02) {
            const leftSlope = { x1: -600, y1: -100, x2: -300, y2: -50 };
            const rightSlope = { x1: 300, y1: -60, x2: 600, y2: -120 };
            const side = Math.random() > 0.5 ? leftSlope : rightSlope;
            const t = Math.random(); 
            const mx = side.x1 + (side.x2 - side.x1) * t;
            const my = side.y1 + (side.y2 - side.y1) * t;

            this.mountainLights.push({
                x: cx + mx * scale,
                y: groundY + my * scale, 
                size: Math.random() * 2 + 1.5,
                state: 0, timer: 0, maxTimer: 100 + Math.random() * 200, flickerVal: 1,
                color: Math.random() > 0.5 ? '#ff0000' : '#800000' 
            });
        }

        for (let i = this.mountainLights.length - 1; i >= 0; i--) {
            const p = this.mountainLights[i];
            p.timer++;
            if (p.state === 0) { 
                if (p.timer > 50) p.state = 1;
            } else if (p.state === 1) { 
                if (Math.random() < 0.05) p.flickerVal = 0; else p.flickerVal = 1;
                if (p.timer > p.maxTimer) p.state = 2;
            } else if (p.state === 2) { 
                if (p.timer > p.maxTimer + 50) this.mountainLights.splice(i, 1);
            }
        }
    },

    drawMountainLights: function(ctx) {
        ctx.save();
        for (const p of this.mountainLights) {
            let alpha = 0;
            if (p.state === 0) alpha = p.timer / 50; 
            else if (p.state === 1) alpha = 1 * p.flickerVal - (Math.random() * 0.2);
            else if (p.state === 2) alpha = 1 - ((p.timer - p.maxTimer) / 50);

            ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, p.size, p.size);
            if (alpha > 0.8 && Math.random() > 0.5) {
                ctx.globalAlpha = 0.1; ctx.fillStyle = '#ff0000';
                ctx.fillRect(p.x - 2, p.y - 2, p.size + 4, p.size + 4);
            }
        }
        ctx.restore();
    },

    updateComets: function(w, h) {
        this.cometTimer++;
        if (this.cometTimer > this.nextCometTime) {
            this.cometTimer = 0;
            this.nextCometTime = 480 + Math.random() * 240; 
            const startX = Math.random() * w;
            const startY = -50; 
            const vx = (startX < w/2) ? (2 + Math.random() * 3) : -(2 + Math.random() * 3);
            const vy = 2 + Math.random() * 2;
            const colors = ['#ff0000', '#b22222', '#8b0000', '#e34234'];
            const color = colors[Math.floor(Math.random() * colors.length)];

            this.comets.push({
                x: startX, y: startY, vx: vx, vy: vy,
                size: 1 + Math.random() * 1.5,
                color: color, trail: [],
                limitY: h * (0.3 + Math.random() * 0.3),
                opacity: 1
            });
        }

        for (let i = this.comets.length - 1; i >= 0; i--) {
            let c = this.comets[i];
            c.x += c.vx; c.y += c.vy;
            c.trail.unshift({x: c.x, y: c.y});
            if (c.trail.length > 20) c.trail.pop(); 
            if (c.y > c.limitY) c.opacity -= 0.02; 
            if (c.opacity <= 0 || c.x < -100 || c.x > w + 100) this.comets.splice(i, 1);
        }
    },

    drawComets: function(ctx) {
        ctx.save();
        for (const c of this.comets) {
            ctx.globalAlpha = Math.max(0, c.opacity);
            ctx.shadowBlur = 5; ctx.shadowColor = c.color;
            ctx.fillStyle = c.color; ctx.beginPath(); ctx.arc(c.x, c.y, c.size, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0; ctx.lineWidth = c.size;
            for (let i = 0; i < c.trail.length - 1; i++) {
                const pt = c.trail[i]; const nextPt = c.trail[i+1];
                const alpha = (1 - (i / c.trail.length)) * c.opacity; 
                ctx.globalAlpha = Math.max(0, alpha); ctx.strokeStyle = c.color;
                ctx.beginPath(); ctx.moveTo(pt.x, pt.y); ctx.lineTo(nextPt.x, nextPt.y); ctx.stroke();
            }
        }
        ctx.restore();
    },

    updateLightning: function(w, h) {
        this.lightningTimer++;
        if (this.lightningTimer > this.nextLightningTime) {
            this.lightningTimer = 0;
            this.nextLightningTime = 180 + Math.random() * 400; 
            this.createBolt(w, h);
        }

        for (let i = this.lightningBolts.length - 1; i >= 0; i--) {
            const bolt = this.lightningBolts[i];
            bolt.life++;
            if (bolt.life > bolt.maxLife) {
                this.lightningBolts.splice(i, 1);
            }
        }
    },

    createBolt: function(w, h) {
        const startX = Math.random() * w;
        const startY = -50;
        let currentX = startX;
        let currentY = startY;
        const segments = [{x: currentX, y: currentY}];
        const groundY = h - 60;

        while (currentY < groundY) {
            const len = 20 + Math.random() * 40;
            currentY += len;
            currentX += (Math.random() - 0.5) * 80; 
            segments.push({x: currentX, y: currentY});
            if (Math.random() > 0.95) break;
        }

        this.lightningBolts.push({
            segments: segments,
            life: 0,
            maxLife: 15, 
            color: '#e0e0ff',
            width: 2 + Math.random() * 2
        });
    },

    drawLightning: function(ctx) {
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'rgba(200, 220, 255, 0.9)';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (const bolt of this.lightningBolts) {
            let alpha = 1;
            if (bolt.life % 4 === 0 || bolt.life % 4 === 1) alpha = 1;
            else alpha = 0.3;

            if (bolt.life > bolt.maxLife - 5) {
                alpha *= (bolt.maxLife - bolt.life) / 5;
            }

            ctx.globalAlpha = Math.max(0, alpha);
            ctx.strokeStyle = bolt.color;
            ctx.lineWidth = bolt.width;

            ctx.beginPath();
            if (bolt.segments.length > 0) {
                ctx.moveTo(bolt.segments[0].x, bolt.segments[0].y);
                for (let i = 1; i < bolt.segments.length; i++) {
                    ctx.lineTo(bolt.segments[i].x, bolt.segments[i].y);
                }
            }
            ctx.stroke();

            ctx.lineWidth = 1;
            ctx.strokeStyle = '#ffffff';
            ctx.stroke();
        }
        ctx.restore();
    },

    drawCastlePixelArt: function(ctx, cx, groundY, scale) {
        ctx.save();
        const darkBrick = '#110b0b'; const midBrick = '#1a1010'; 
        const lightHighlight = '#2d1f1f'; const windowColor = '#000000'; 
        
        const drawBlock = (x, y, w, h, color) => {
            ctx.fillStyle = color;
            ctx.fillRect(cx + x * scale, groundY - y * scale, w * scale, h * scale);
        };

        const drawWindow = (x, y, w, h) => {
            const seed = Math.abs(x * 100 + y); 
            const isLit = (seed % 10 > 1); 
            
            if (isLit) {
                ctx.save();
                const isFlickering = (seed % 10 > 2); 
                let alpha = 0.9;
                if (isFlickering) {
                    const time = Date.now() * 0.01;
                    alpha = 0.6 + Math.sin(time + seed) * 0.2 + (Math.random() * 0.15);
                }
                ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
                drawBlock(x, y, w, h, '#fdd835'); // Yellow Light
                ctx.restore();
            } else {
                drawBlock(x, y, w, h, windowColor);
            }
        };

        ctx.fillStyle = '#0a0505';
        ctx.beginPath();
        ctx.moveTo(0, groundY);
        ctx.lineTo(cx - 600 * scale, groundY - 100 * scale);
        ctx.lineTo(cx - 300 * scale, groundY - 50 * scale);
        ctx.lineTo(cx, groundY - 80 * scale);
        ctx.lineTo(cx + 300 * scale, groundY - 60 * scale);
        ctx.lineTo(cx + 600 * scale, groundY - 120 * scale);
        ctx.lineTo(canvas.width, groundY);
        ctx.fill();

        // --- THE KINGDOM (SIDES) ---
        const drawHouse = (x, w, h, roofH) => {
             drawBlock(x, h, w, h, midBrick); 
             for(let r=0; r < roofH; r+=5) drawBlock(x + r/2, h + r + 5, w - r, 5, darkBrick);
             drawWindow(x + w/2 - 2, h/2 + 5, 4, 8);
        };

        // LEFT SIDE VILLAGE
        drawHouse(-180, 40, 40, 20); drawHouse(-230, 30, 30, 15);
        drawBlock(-270, 70, 25, 70, darkBrick); drawBlock(-275, 75, 35, 5, midBrick); 
        drawHouse(-310, 35, 25, 10); drawHouse(-360, 50, 45, 25); drawHouse(-420, 30, 20, 10);

        // RIGHT SIDE VILLAGE
        drawHouse(150, 45, 35, 20); drawHouse(210, 35, 45, 20);
        drawBlock(260, 60, 20, 60, darkBrick); drawHouse(290, 50, 30, 15);
        drawHouse(350, 40, 50, 25); drawHouse(410, 30, 25, 10);

        // --- CENTRAL CASTLE ---
        drawBlock(-60, 100, 120, 100, darkBrick); drawBlock(-50, 180, 100, 80, darkBrick);  
        drawBlock(-140, 90, 50, 90, darkBrick); drawBlock(-130, 130, 30, 40, darkBrick); 
        drawBlock(90, 90, 50, 90, darkBrick); drawBlock(100, 130, 30, 40, darkBrick); 
        drawBlock(-90, 60, 30, 60, midBrick); drawBlock(60, 60, 30, 60, midBrick);

        const drawTeeth = (startX, y, width, toothW) => {
            const gap = toothW;
            const teethCount = Math.floor(width / (toothW + gap));
            for(let i=0; i<=teethCount; i++) drawBlock(startX + (i * (toothW + gap)), y + 10, toothW, 10, darkBrick);
        };
        drawTeeth(-50, 180, 100, 10); drawTeeth(-130, 130, 30, 8);
        drawTeeth(100, 130, 30, 8); drawTeeth(-90, 60, 30, 6); drawTeeth(60, 60, 30, 6);

        drawBlock(-25, 40, 50, 40, '#050000'); drawBlock(-25, 45, 5, 5, midBrick); drawBlock(20, 45, 5, 5, midBrick); 
        drawBlock(-10, 220, 20, 40, midBrick); drawBlock(-5, 260, 10, 20, midBrick); 
        drawBlock(-125, 140, 20, 30, midBrick); drawBlock(105, 140, 20, 30, midBrick);
        
        const winW = 4, winH = 15;
        drawWindow(-15, 120, winW, winH); 
        drawWindow(11, 120, winW, winH);
        drawWindow(-115, 100, winW, winH); 
        drawWindow(115, 100, winW, winH);

        drawBlock(50, 180, 2, 80, lightHighlight); drawBlock(140, 90, 2, 90, lightHighlight);
        drawBlock(-600, 20, 1200, 20, '#0d0808');
        ctx.restore();
    },

    drawBackground: function(ctx, w, h) {
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#050505'); grad.addColorStop(0.5, '#1a0b1a'); grad.addColorStop(1, '#2d1420');    
        ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);

        ctx.save();
        ctx.fillStyle = 'white';
        const time = Date.now() * 0.002;
        for (const star of this.stars) {
            const alpha = star.baseAlpha + Math.sin(time + star.twinkleOffset) * 0.3;
            ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
            ctx.fillRect(star.x * w, star.y * h, star.size, star.size);
        }
        ctx.restore();

        const groundY = h - 60;
        ctx.fillStyle = '#080505'; ctx.fillRect(0, groundY, w, 100);

        // Render Layers
        this.drawComets(ctx); 
        this.drawCastlePixelArt(ctx, w/2, groundY, 0.6);
        this.drawLights(ctx); 
        this.drawMountainLights(ctx);
        this.drawLightning(ctx);

        const vGrad = ctx.createRadialGradient(w/2, h/2, h/3, w/2, h/2, w);
        vGrad.addColorStop(0, 'rgba(0,0,0,0)'); vGrad.addColorStop(1, 'rgba(0,0,0,0.85)');
        ctx.fillStyle = vGrad; ctx.fillRect(0, 0, w, h);
    },

    render: function(ctx, canvas) {
        if (!this.active) return;

        // 1. IF SUB-SCREEN IS ACTIVE, RENDER IT AND STOP
        if (this.currentScreen && this.currentScreen.render) {
            this.currentScreen.render(ctx, canvas);
            return;
        }

        // 2. OTHERWISE RENDER MAIN MENU
        const w = canvas.width;
        const h = canvas.height;

        this.updateLights(w, h);
        this.updateMountainLights(w, h);
        this.updateComets(w, h);
        this.updateLightning(w, h);

        ctx.save();
        this.drawBackground(ctx, w, h);

        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 48px monospace';
        ctx.shadowColor = '#4a0000'; ctx.shadowBlur = 15;
        ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
        ctx.fillText("MAIN MENU", w / 2, 80);

        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        for (const btn of this.buttons) {
            btn.scale += (btn.targetScale - btn.scale) * 0.2;
            ctx.save();
            const cx = btn.x + btn.w / 2, cy = btn.y + btn.h / 2;
            ctx.translate(cx, cy); ctx.scale(btn.scale, btn.scale);
            const drawX = -btn.w / 2, drawY = -btn.h / 2;

            ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(drawX + 6, drawY + 6, btn.w, btn.h);
            ctx.fillStyle = btn.isHovered ? btn.hoverColor : btn.baseColor; ctx.fillRect(drawX, drawY, btn.w, btn.h);
            
            ctx.lineWidth = 2; ctx.strokeStyle = '#aaaaaa'; ctx.beginPath();
            ctx.moveTo(drawX + btn.w, drawY); ctx.lineTo(drawX, drawY); ctx.lineTo(drawX, drawY + btn.h); ctx.stroke();
            ctx.strokeStyle = '#333333'; ctx.beginPath();
            ctx.moveTo(drawX + btn.w, drawY); ctx.lineTo(drawX + btn.w, drawY + btn.h); ctx.lineTo(drawX, drawY + btn.h); ctx.stroke();

            ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#000'; ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 2;
            ctx.font = 'bold 20px monospace'; ctx.fillText(btn.label, 0, 0); 
            ctx.restore();
        }
        ctx.restore();
    }
};

if (!window.originalRenderRef) window.originalRenderRef = window.render;

window.render = function() {
    if (window.GameMenu && window.GameMenu.active) {
        const ctx = window.ctx || (document.querySelector('canvas') ? document.querySelector('canvas').getContext('2d') : null);
        if (ctx) window.GameMenu.render(ctx, ctx.canvas);
    } else {
        if (window.originalRenderRef) window.originalRenderRef();
    }
};

window.GameMenu.init();