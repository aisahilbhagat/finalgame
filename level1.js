window.Level1 = {
    engine: null,
    targetX: 4200,
    player: null,
    cameraX: 0,
    time: 0,
    platforms: [], 
    obstacles: [], 
    checkpoints: [], // Checkpoint storage
    activeCheckpoint: null, // Current spawn point
    
    // Background parallax & Atmosphere
    clouds: [],
    stars: [],
    
    // State for jump scare / freeze effects
    inputBlocked: false,
    flashIntensity: 0,
    phantomX: -1000,

    init: function(engine) {
        this.engine = engine;
        console.log("Level 2 Initialized: The Windy Peaks (Haunted Update - Balanced)");
        this.generateClouds();
        this.generateStars();
    },

    load: function() {
        this.loadCharacterScript(() => {
            if (window.LevelCharacter) {
                this.player = new window.LevelCharacter(100, 600);
                this.setupLevel();
            } else {
                console.error("Critical: LevelCharacter failed to load.");
            }
        });
    },

    loadCharacterScript: function(callback) {
        if (window.LevelCharacter) { callback(); return; }
        const script = document.createElement('script');
        script.src = 'levelcharacter.js';
        script.onload = () => {
            if (window.LevelCharacter) callback();
            else console.error("LevelCharacter missing.");
        };
        document.body.appendChild(script);
    },

    setupLevel: function() {
        // --- 1. STATIC PLATFORMS & SAFE ZONES ---
        this.platforms = [
            { x: 0, y: 700, w: 400, h: 200, type: 'ground' },
            { x: 400, y: 650, w: 100, h: 250, type: 'stone' },
            { x: 600, y: 600, w: 200, h: 300, type: 'stone' },
            
            // Ascent
            { x: 900, y: 550, w: 100, h: 400, type: 'pillar' },
            { x: 1100, y: 450, w: 100, h: 500, type: 'pillar' },
            { x: 1300, y: 350, w: 300, h: 600, type: 'ground' }, // Safe Zone 1

            // Gap Pillars
            { x: 1700, y: 350, w: 80, h: 600, type: 'pillar' },
            { x: 1950, y: 350, w: 80, h: 600, type: 'pillar' },
            { x: 2200, y: 300, w: 80, h: 600, type: 'pillar' },
            
            // NEW: Safe Breath Zone (Mid-Level)
            { x: 2350, y: 300, w: 150, h: 600, type: 'stone' }, // Safe Zone 2

            { x: 2900, y: 500, w: 300, h: 50, type: 'floating' }, 
            
            // NEW: Safe Breath Zone (Pre-Climax)
            { x: 3150, y: 400, w: 120, h: 50, type: 'floating' }, // Safe Zone 3
            
            // Final Stretch
            { x: 3300, y: 450, w: 80, h: 50, type: 'floating' },
            { x: 3500, y: 400, w: 80, h: 50, type: 'floating' },
            { x: 3700, y: 350, w: 80, h: 50, type: 'floating' },
            
            // Goal
            { x: 3900, y: 300, w: 500, h: 600, type: 'ground' }
        ];

        // --- CHECKPOINTS ---
        this.checkpoints = [
            // CP 1: After initial climb (25%)
            { x: 1350, y: 350, active: false, id: 1 },
            // CP 2: Mid-level safety (55%)
            { x: 2400, y: 300, active: false, id: 2 },
            // CP 3: Before final swings (75%)
            { x: 3200, y: 400, active: false, id: 3 }
        ];

        // --- 2. OBSTACLES & TRAPS (TUNED DIFFICULTY) ---
        this.obstacles = [
            // A. Moving Spike Trap (Gap Runner) - SLOWED DOWN
            { 
                type: 'movingSpike', x: 1700, y: 340, w: 40, h: 40, 
                amplitude: 120, speed: 1.6, delay: 45, // Reduced speed (2->1.6), increased delay
                startX: 1700, timer: 0 
            },

            // B. Sludge Patches
            { type: 'sludge', x: 700, y: 595, w: 100, h: 10, frictionMultiplier: 0.6 },
            { type: 'sludge', x: 1300, y: 345, w: 300, h: 10, frictionMultiplier: 0.6 },

            // C. Ghosts (Spectral Patrol) - REDUCED AGGRO
            { 
                type: 'ghost', x: 1950, y: 300, range: 200, baseSpeed: 1, 
                aggroRadius: 130, aggroSpeed: 2.8, cooldown: 0, // Reduced radius/speed
                startX: 1950, dir: 1, opacity: 0.8, state: 'patrol' 
            },
            { 
                type: 'ghost', x: 3600, y: 350, range: 150, baseSpeed: 1.2, 
                aggroRadius: 130, aggroSpeed: 3.0, cooldown: 0, // Reduced radius/speed
                startX: 3600, dir: -1, opacity: 0.8, state: 'patrol' 
            },

            // D. Bone Statues
            { 
                type: 'statue', x: 2100, y: 250, w: 40, h: 80, 
                fireInterval: 120, projectileSpeed: 4, pattern: 'horizontal',
                timer: 0, projectiles: []
            },
            { 
                type: 'statue', x: 3400, y: 400, w: 40, h: 80, 
                fireInterval: 150, projectileSpeed: 4, pattern: 'diagonal',
                timer: 60, projectiles: []
            },

            // E. Collapsing Platform - INCREASED DELAY
            { 
                type: 'collapse', x: 2550, y: 250, w: 300, h: 50, // Moved slightly to fit new layout
                delayAfterLanding: 50, // Increased delay (24->50) ~0.8s reaction time
                respawnTime: 180, 
                state: 'idle', timer: 0, platformRef: null 
            },

            // F. Dark Zone
            { 
                type: 'darkZone', x: 2750, y: 400, radius: 280, 
                flickerTimer: 0, currentAlpha: 0.6 
            },

            // G. Stalactites
            { 
                type: 'stalactite', x: 2900, y: 100, w: 40, h: 80, 
                triggerRadius: 100, fallDelay: 20, // Increased delay
                state: 'idle', vy: 0, timer: 0 
            },
            { 
                type: 'stalactite', x: 2980, y: 80, w: 50, h: 100, 
                triggerRadius: 100, fallDelay: 25, 
                state: 'idle', vy: 0, timer: 0 
            },

            // H. Swinging Candelabras - REDUCED ARC
            { 
                type: 'swing', cx: 3340, cy: 100, length: 180, 
                angleRange: 0.6, // Reduced arc (0.785 -> 0.6)
                speed: 0.025, radius: 24, angle: 0
            },
            { 
                type: 'swing', cx: 3540, cy: 100, length: 180, 
                angleRange: 0.6, speed: 0.03, radius: 24, angle: 1
            },
            { 
                type: 'swing', cx: 3740, cy: 100, length: 180, 
                angleRange: 0.6, speed: 0.025, radius: 24, angle: 2
            },

            // I. Audio Zones
            { type: 'audioZone', x: 1700, y: 350, radius: 200, volumeMax: 0.8 },
            { type: 'audioZone', x: 3500, y: 400, radius: 200, volumeMax: 1.0 },

            // J. Jump Scare
            { type: 'jumpscare', x: this.targetX - 80, y: 400, triggerRadius: 100, triggered: false }
        ];

        // Initialize Collapsing Platform: Create a real platform for it
        const collapser = this.obstacles.find(o => o.type === 'collapse');
        if (collapser) {
            const p = { x: collapser.x, y: collapser.y, w: collapser.w, h: collapser.h, type: 'floating' };
            this.platforms.push(p);
            collapser.platformRef = p;
        }
    },

    generateStars: function() {
        this.stars = [];
        for(let i=0; i<150; i++) {
            this.stars.push({
                x: Math.random(), 
                y: Math.random() * 0.75, 
                size: Math.random() * 1.5 + 0.5,
                alpha: Math.random() * 0.8 + 0.2,
                twinkleOffset: Math.random() * 10
            });
        }
    },

    generateClouds: function() {
        for(let i=0; i<20; i++) {
            this.clouds.push({
                x: Math.random() * 5000,
                y: Math.random() * 400,
                w: 100 + Math.random() * 200,
                speed: 0.1 + Math.random() * 0.2, 
                opacity: 0.1 + Math.random() * 0.2 
            });
        }
    },

    update: function() {
        this.time += 0.05;
        if (this.flashIntensity > 0) this.flashIntensity -= 0.05;

        // Animate clouds
        this.clouds.forEach(c => {
            c.x -= c.speed;
            if (c.x + c.w < this.cameraX) c.x = this.cameraX + 1000 + Math.random() * 500;
        });

        if (!this.player) return;

        // Player Update
        this.player.update();

        // CHECKPOINT LOGIC
        for (let cp of this.checkpoints) {
            if (!cp.active && this.player.x > cp.x) {
                cp.active = true;
                this.activeCheckpoint = cp;
                // Visual feedback managed in render
            }
        }

        // Control Suppression (Stun/Freeze)
        if (this.inputBlocked || (this.player.isStunned && this.player.stunTimer > 0)) {
            this.player.vx = 0; 
            if (this.player.isStunned) {
                this.player.stunTimer -= 16; 
                if (this.player.stunTimer <= 0) this.player.isStunned = false;
            }
        }

        // --- PHYSICS ENGINE (Platform Collision) ---
        const hitbox = this.player.hitbox || { offsetX: 0, offsetY: 0, width: 36, height: 60 };
        let pLeft = this.player.x + hitbox.offsetX;
        let pRight = pLeft + hitbox.width;
        let pTop = this.player.y + hitbox.offsetY;
        let pBottom = pTop + hitbox.height;
        let pVelY = this.player.vy || 0;

        // 1. Horizontal (Wall) Collision
        for (let plat of this.platforms) {
            if (pRight > plat.x && pLeft < plat.x + plat.w &&
                pBottom > plat.y && pTop < plat.y + plat.h) {
                
                const floorThreshold = plat.y + Math.max(15, pVelY + 5);
                if (pBottom > floorThreshold) {
                    const overlapL = pRight - plat.x;
                    const overlapR = (plat.x + plat.w) - pLeft;
                    if (overlapL < overlapR) this.player.x -= overlapL;
                    else this.player.x += overlapR;
                    this.player.vx = 0;
                    pLeft = this.player.x + hitbox.offsetX;
                    pRight = pLeft + hitbox.width;
                }
            }
        }

        // 2. Vertical (Ground) Snap
        let groundLevel = 1000;
        for (let plat of this.platforms) {
            if (pRight > plat.x && pLeft < plat.x + plat.w) {
                if (pBottom <= plat.y + 35) {
                    if (plat.y < groundLevel) groundLevel = plat.y;
                }
            }
        }
        this.player.groundY = groundLevel;

        this.updateObstacles(hitbox, pLeft, pRight, pTop, pBottom);

        this.cameraX = Math.max(0, this.player.x - 300);

        if (this.player.y > 900) this.resetPlayer();
        if (this.player.x >= this.targetX) {
            console.log("Level 2 Complete!");
            if (this.engine && this.engine.handleContentComplete) {
                this.engine.handleContentComplete();
            }
        }
    },

    updateObstacles: function(hitbox, pL, pR, pT, pB) {
        const cx = pL + (pR - pL)/2; 
        const cy = pT + (pB - pT)/2; 

        for (let obs of this.obstacles) {
            // A. MOVING SPIKE
            if (obs.type === 'movingSpike') {
                if (obs.delay > 0) obs.delay--;
                else {
                    obs.timer += 0.05; 
                    obs.x = obs.startX + Math.sin(obs.timer) * obs.amplitude;
                }
                if (pR > obs.x && pL < obs.x + obs.w && pB > obs.y && pT < obs.y + obs.h) {
                    this.resetPlayer(); 
                }
            }
            // B. SLUDGE
            else if (obs.type === 'sludge') {
                if (pR > obs.x && pL < obs.x + obs.w && pB > obs.y && pB < obs.y + 20) {
                    if (this.player.isGrounded) {
                        this.player.vx *= obs.frictionMultiplier;
                        if (Math.abs(this.player.vx) < 0.5 && Math.abs(this.player.vx) > 0.01) {
                             this.player.x += (this.player.facingRight ? 1 : -1) * 0.5;
                        }
                    }
                }
            }
            // C. GHOST
            else if (obs.type === 'ghost') {
                const dist = Math.hypot(cx - obs.x, cy - obs.y);
                if (obs.state === 'fading') {
                    obs.opacity -= 0.05;
                    if (obs.opacity <= 0) {
                        obs.state = 'cooldown';
                        obs.opacity = 0;
                        obs.cooldown = 120; 
                    }
                } else if (obs.state === 'cooldown') {
                    obs.cooldown--;
                    if (obs.cooldown <= 0) {
                        obs.state = 'patrol';
                        obs.opacity = 0.8;
                    }
                } else {
                    if (dist < obs.aggroRadius) {
                        const dir = (cx > obs.x) ? 1 : -1;
                        obs.x += dir * obs.aggroSpeed;
                        obs.cooldown++; 
                        if (obs.cooldown > 60) obs.state = 'fading'; 
                    } else {
                        obs.x += obs.dir * obs.baseSpeed;
                        if (obs.x > obs.startX + obs.range) obs.dir = -1;
                        if (obs.x < obs.startX - obs.range) obs.dir = 1;
                        obs.cooldown = 0;
                    }
                    if (Math.abs(cx - obs.x) < 20 && Math.abs(cy - obs.y) < 30) {
                        this.applyStun(200);
                        this.player.vx = (cx > obs.x) ? 10 : -10; 
                        this.player.vy = -5;
                        obs.state = 'fading'; 
                    }
                }
            }
            // D. BONE STATUES
            else if (obs.type === 'statue') {
                obs.timer++;
                if (obs.timer > obs.fireInterval) {
                    obs.timer = 0;
                    let vx = (obs.pattern === 'horizontal') ? -obs.projectileSpeed : -obs.projectileSpeed;
                    let vy = (obs.pattern === 'diagonal') ? -2 : 0;
                    obs.projectiles.push({ x: obs.x, y: obs.y + 20, vx: vx, vy: vy, life: 200 });
                }
                for (let i = obs.projectiles.length - 1; i >= 0; i--) {
                    let p = obs.projectiles[i];
                    p.x += p.vx;
                    p.y += p.vy;
                    if (obs.pattern === 'diagonal') p.vy += 0.1; 
                    p.life--;
                    if (Math.abs(cx - p.x) < 15 && Math.abs(cy - p.y) < 25) {
                        this.resetPlayer(); 
                    }
                    if (p.life <= 0) obs.projectiles.splice(i, 1);
                }
            }
            // E. COLLAPSING PLATFORM
            else if (obs.type === 'collapse') {
                if (obs.state === 'idle') {
                    if (this.player.isGrounded && pR > obs.x && pL < obs.x + obs.w && Math.abs(pB - obs.y) < 5) {
                        obs.state = 'shaking';
                        obs.timer = obs.delayAfterLanding;
                    }
                } else if (obs.state === 'shaking') {
                    obs.timer--;
                    if (obs.timer <= 0) {
                        obs.state = 'fallen';
                        obs.timer = obs.respawnTime;
                        if (obs.platformRef) obs.platformRef.y = 9000;
                        this.playSound('crumble');
                    }
                } else if (obs.state === 'fallen') {
                    obs.timer--;
                    if (obs.timer <= 0) {
                        obs.state = 'idle';
                        if (obs.platformRef) obs.platformRef.y = obs.y;
                    }
                }
            }
            // F. DARK ZONE
            else if (obs.type === 'darkZone') {
                obs.flickerTimer++;
                if (obs.flickerTimer > 35) { 
                    obs.flickerTimer = 0;
                    obs.currentAlpha = 0.5 + Math.random() * 0.2; 
                }
                const dist = Math.hypot(cx - obs.x, cy - obs.y);
                if (dist < obs.radius) {
                    this.player.vx *= 0.85; 
                }
            }
            // G. STALACTITES
            else if (obs.type === 'stalactite') {
                if (obs.state === 'idle') {
                    if (Math.abs(cx - obs.x) < obs.triggerRadius && pB > obs.y) {
                        obs.state = 'triggered';
                        obs.timer = obs.fallDelay;
                    }
                } else if (obs.state === 'triggered') {
                    obs.timer--;
                    if (obs.timer <= 0) {
                        obs.state = 'falling';
                        obs.vy = 0;
                    }
                } else if (obs.state === 'falling') {
                    obs.vy += 0.5;
                    obs.y += obs.vy;
                    if (pR > obs.x && pL < obs.x + obs.w && pB > obs.y && pT < obs.y + obs.h) {
                        this.resetPlayer();
                    }
                    if (obs.y > 900) obs.state = 'gone';
                }
            }
            // H. SWINGING CANDELABRA
            else if (obs.type === 'swing') {
                const time = this.time * 20; 
                const currentAngle = Math.sin(time * obs.speed) * obs.angleRange;
                const bx = obs.cx + Math.sin(currentAngle) * obs.length;
                const by = obs.cy + Math.cos(currentAngle) * obs.length;
                obs.bx = bx; obs.by = by;
                const dx = cx - bx;
                const dy = cy - by;
                if (Math.hypot(dx, dy) < (obs.radius + 18)) { 
                    this.applyStun(400);
                    this.player.vx = (dx > 0) ? 6 : -6;
                    this.player.vy = -4;
                }
            }
            // I. AUDIO ZONES
            else if (obs.type === 'audioZone') {
                const dist = Math.hypot(cx - obs.x, cy - obs.y);
                if (dist < obs.radius) {
                    const vol = obs.volumeMax * (1 - dist/obs.radius);
                    this.playSound('heartbeat', Math.max(0.1, vol));
                    if (this.time % 10 < 1) {
                         this.cameraX += (Math.random() - 0.5) * 4; 
                    }
                }
            }
            // J. JUMP SCARE
            else if (obs.type === 'jumpscare') {
                if (!obs.triggered && Math.abs(cx - obs.x) < obs.triggerRadius) {
                    obs.triggered = true;
                    this.triggerJumpScare();
                }
            }
        }
    },

    resetPlayer: function() {
        if (this.activeCheckpoint) {
            // Respawn at Checkpoint
            this.player.x = this.activeCheckpoint.x;
            this.player.y = this.activeCheckpoint.y - 60;
        } else {
            // Respawn at Start
            this.player.x = 100;
            this.player.y = 600;
        }
        
        this.player.vy = 0;
        this.player.vx = 0;
        this.flashIntensity = 0;
        this.inputBlocked = false;
        
        // Smart Reset: Only reset dynamic obstacles if starting from beginning
        // OR reset non-location specific puzzles.
        // For Collapsing Platforms: Reset them to ensure playability.
        this.obstacles.forEach(o => {
            if (o.type === 'collapse') {
                o.state = 'idle';
                if (o.platformRef) o.platformRef.y = o.y;
            }
            // Reset stalactites if they fell (gameplay fairness)
            if (o.type === 'stalactite' && o.state === 'gone') {
                o.state = 'idle';
                o.y = 100; // Hardcoded approximate original Y reset if needed, mostly fine
            }
        });
    },

    applyStun: function(duration) {
        this.player.isStunned = true;
        this.player.stunTimer = duration;
    },

    triggerJumpScare: function() {
        this.inputBlocked = true;
        this.flashIntensity = 1.0;
        this.playSound('scream', 1.0);
        this.phantomX = this.targetX + 400; 
        setTimeout(() => {
            this.inputBlocked = false;
        }, 200);
    },

    playSound: function(name, vol) {
        if (this.engine && this.engine.playSound) {
            this.engine.playSound(name, vol);
        }
    },

    render: function(ctx) {
        const w = ctx.canvas.width;
        const h = ctx.canvas.height;

        const cx = this.player ? (this.player.x + 18) : 0;
        const cy = this.player ? (this.player.y + 30) : 0;
        let inDarkZone = null;
        
        for (let obs of this.obstacles) {
            if (obs.type === 'darkZone') {
                if (Math.hypot(cx - obs.x, cy - obs.y) < obs.radius) inDarkZone = obs;
            }
        }

        // --- 1. HORROR SKY RENDER ---
        if (inDarkZone) {
             ctx.fillStyle = "#050505"; 
        } else {
            const grd = ctx.createLinearGradient(0, 0, 0, h);
            grd.addColorStop(0, "#090a14"); 
            grd.addColorStop(0.6, "#211a30"); 
            grd.addColorStop(1, "#2c2130"); 
            ctx.fillStyle = grd;
        }
        ctx.fillRect(0, 0, w, h);

        if (!inDarkZone) {
            ctx.fillStyle = "white";
            this.stars.forEach(s => {
                const twinkle = Math.sin(this.time * 5 + s.twinkleOffset);
                const alpha = s.alpha + (twinkle * 0.1);
                ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
                ctx.beginPath();
                ctx.arc(s.x * w, s.y * h, s.size, 0, Math.PI*2);
                ctx.fill();
            });
            ctx.globalAlpha = 1.0;

            const mx = w * 0.8;
            const my = h * 0.2;
            const mr = 40;
            const mGlow = ctx.createRadialGradient(mx, my, mr, mx, my, mr * 3);
            mGlow.addColorStop(0, "rgba(200, 200, 210, 0.2)");
            mGlow.addColorStop(1, "rgba(200, 200, 210, 0)");
            ctx.fillStyle = mGlow;
            ctx.beginPath();
            ctx.arc(mx, my, mr * 3, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = "#e0e0d0"; 
            ctx.beginPath();
            ctx.arc(mx, my, mr, 0, Math.PI*2);
            ctx.fill();
        }

        // --- WORLD RENDER START ---
        ctx.save();
        ctx.translate(-this.cameraX, 0);

        // CLOUDS
        this.clouds.forEach(c => {
            const px = c.x - (this.cameraX * 0.2); 
            if (px + c.w > -100 && px < w + 100) {
                ctx.fillStyle = `rgba(30, 30, 45, ${c.opacity})`;
                ctx.beginPath();
                ctx.roundRect(this.cameraX + px, c.y, c.w, 40, 20);
                ctx.fill();
            }
        });

        // CHECKPOINTS RENDER
        this.checkpoints.forEach(cp => {
            // Lantern Post
            ctx.fillStyle = "#1a1a1a";
            ctx.fillRect(cp.x - 2, cp.y - 40, 4, 40);
            
            // Lantern Glow
            if (cp.active) {
                // Cold Blue Safety Light
                const glow = ctx.createRadialGradient(cp.x, cp.y - 45, 2, cp.x, cp.y - 45, 30);
                glow.addColorStop(0, "rgba(100, 200, 255, 0.8)");
                glow.addColorStop(1, "rgba(100, 200, 255, 0)");
                ctx.fillStyle = glow;
                ctx.beginPath();
                ctx.arc(cp.x, cp.y - 45, 30, 0, Math.PI*2);
                ctx.fill();
                
                ctx.fillStyle = "#e0ffff"; // Bulb on
            } else {
                ctx.fillStyle = "#333"; // Bulb off
            }
            
            // Lantern Casing
            ctx.fillRect(cp.x - 5, cp.y - 50, 10, 12);
        });

        // PLATFORMS
        for (let plat of this.platforms) {
            if (plat.y > 2000) continue; 
            ctx.fillStyle = (plat.type === 'pillar') ? "#546e7a" : "#37474f"; 
            ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
            ctx.fillStyle = "rgba(0,0,0,0.4)";
            ctx.fillRect(plat.x + 5, plat.y + 5, plat.w - 10, plat.h - 10);
        }

        this.renderObstacles(ctx);

        if (this.player) {
            if (this.player.isStunned && Math.floor(this.time * 10) % 2 === 0) {
            } else {
                this.player.render(ctx);
            }
        }

        if (this.phantomX > -500 && this.flashIntensity > 0) {
            this.phantomX -= 40; 
            ctx.fillStyle = `rgba(0, 0, 0, ${this.flashIntensity})`;
            ctx.beginPath();
            ctx.arc(this.phantomX, 300, 100, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = "red";
            ctx.beginPath();
            ctx.arc(this.phantomX - 30, 280, 10, 0, Math.PI*2);
            ctx.arc(this.phantomX + 30, 280, 10, 0, Math.PI*2);
            ctx.fill();
        }

        ctx.fillStyle = "gold";
        ctx.fillRect(this.targetX, 200, 100, 600); 

        ctx.restore();
        // --- WORLD RENDER END ---

        // SCREEN EFFECTS
        if (inDarkZone) {
            const screenCx = cx - this.cameraX;
            const screenCy = cy;
            const r = 100; 
            const grad = ctx.createRadialGradient(screenCx, screenCy, r, screenCx, screenCy, w);
            grad.addColorStop(0, "rgba(0,0,0,0)");
            grad.addColorStop(0.2, `rgba(0,0,0,${inDarkZone.currentAlpha})`);
            grad.addColorStop(1, "rgba(0,0,0,0.95)");
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);
        }

        if (this.flashIntensity > 0.1) {
            ctx.fillStyle = `rgba(255, 255, 255, ${this.flashIntensity})`;
            ctx.fillRect(0, 0, w, h);
        }

        ctx.fillStyle = "#aaa";
        ctx.font = "16px monospace";
        ctx.fillText("LEVEL 1: The Silence (Checkpoints Active)", 20, 30);
    },

    renderObstacles: function(ctx) {
        for (let obs of this.obstacles) {
            if (obs.type === 'movingSpike') {
                ctx.fillStyle = "#500"; 
                ctx.beginPath();
                ctx.moveTo(obs.x, obs.y + obs.h);
                ctx.lineTo(obs.x + obs.w/2, obs.y);
                ctx.lineTo(obs.x + obs.w, obs.y + obs.h);
                ctx.fill();
            }
            else if (obs.type === 'sludge') {
                ctx.fillStyle = "#2a1c1a"; 
                ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
                if (Math.random() > 0.9) {
                    ctx.fillStyle = "#4a2c2a";
                    ctx.fillRect(obs.x + Math.random()*obs.w, obs.y, 4, 4);
                }
            }
            else if (obs.type === 'ghost') {
                if (obs.opacity > 0) {
                    ctx.fillStyle = `rgba(180, 220, 210, ${obs.opacity})`; 
                    ctx.beginPath();
                    ctx.arc(obs.x, obs.y, 20, Math.PI, 0);
                    ctx.lineTo(obs.x + 20, obs.y + 40);
                    ctx.lineTo(obs.x - 20, obs.y + 40);
                    ctx.fill();
                    ctx.fillStyle = (obs.state === 'patrol') ? "#111" : "red";
                    ctx.fillRect(obs.x - 10, obs.y - 5, 6, 6);
                    ctx.fillRect(obs.x + 4, obs.y - 5, 6, 6);
                }
            }
            else if (obs.type === 'statue') {
                ctx.fillStyle = "#bbb";
                ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
                ctx.fillStyle = "#eee";
                for (let p of obs.projectiles) {
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, 6, 0, Math.PI*2);
                    ctx.fill();
                }
            }
            else if (obs.type === 'collapse') {
                if (obs.state !== 'fallen') {
                    if (obs.state === 'shaking') {
                        ctx.strokeStyle = "#111";
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.moveTo(obs.x + 10, obs.y);
                        ctx.lineTo(obs.x + 20, obs.y + 20);
                        ctx.lineTo(obs.x + 30, obs.y);
                        ctx.stroke();
                    }
                }
            }
            else if (obs.type === 'stalactite') {
                if (obs.state !== 'gone') {
                    ctx.fillStyle = "#3e2723"; 
                    ctx.beginPath();
                    ctx.moveTo(obs.x, obs.y);
                    ctx.lineTo(obs.x + obs.w, obs.y);
                    ctx.lineTo(obs.x + obs.w/2, obs.y + obs.h);
                    ctx.fill();
                }
            }
            else if (obs.type === 'swing') {
                ctx.strokeStyle = "#111";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(obs.cx, obs.cy);
                ctx.lineTo(obs.bx, obs.by);
                ctx.stroke();
                ctx.fillStyle = "#aaa"; 
                ctx.beginPath();
                ctx.arc(obs.bx, obs.by, 15, 0, Math.PI*2);
                ctx.fill();
                const flicker = Math.random() * 5;
                ctx.fillStyle = `rgba(100, 150, 255, 0.6)`; 
                ctx.beginPath();
                ctx.arc(obs.bx, obs.by - 20, 8 + flicker, 0, Math.PI*2);
                ctx.fill();
            }
        }
    }
};