window.Level2 = {
    engine: null,
    targetX: 4200,
    player: null,
    cameraX: 0,
    time: 0,
    platforms: [], 
    obstacles: [], 
    checkpoints: [], 
    activeCheckpoint: null, 
    
    // Background parallax & Atmosphere
    clouds: [],
    stars: [],
    
    // State for control suppression
    inputBlocked: false,
    flashIntensity: 0,
    
    // Unique Level 2 State
    gateOpen: false,

    init: function(engine) {
        this.engine = engine;
        console.log("Level 2 Initialized: The Castle Approach");
        this.generateClouds();
        this.generateStars();
    },

    load: function() {
        // Safe check for character class
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
        // --- 1. PLATFORMS (Difficulty: 7) ---
        // Narrower landing zones, slightly more verticality
        this.platforms = [
            // Start (Safe)
            { x: 0, y: 700, w: 400, h: 200, type: 'ground' },
            
            // The Ascent (HARDER: Gaps widened, pillars narrower)
            { x: 480, y: 600, w: 60, h: 300, type: 'stone' }, // Moved 450->480
            { x: 720, y: 500, w: 60, h: 400, type: 'stone' }, // Moved 650->720 (Gap 240)
            { x: 950, y: 450, w: 60, h: 450, type: 'stone' }, // Moved 850->950 (Gap 230)
            
            // Sludge Run (Safe fall, but annoying)
            { x: 1150, y: 550, w: 400, h: 50, type: 'stone' }, // Moved to fit new ascent
            
            // The Bridge of Collapse
            { x: 1650, y: 500, w: 100, h: 400, type: 'pillar' },
            { x: 1900, y: 500, w: 100, h: 400, type: 'pillar' }, // Gap requires momentum
            
            // Mid-Air Safety
            { x: 2200, y: 400, w: 200, h: 50, type: 'floating' }, 

            // High Road (Precision)
            { x: 2600, y: 350, w: 80, h: 50, type: 'floating' },
            { x: 2850, y: 300, w: 80, h: 50, type: 'floating' },
            { x: 3100, y: 250, w: 80, h: 50, type: 'floating' },

            // Pre-Gate Platform (CP3)
            { x: 3350, y: 400, w: 150, h: 50, type: 'floating' },

            // The Gauntlet (HARDER: Smaller platforms, wider gaps)
            { x: 3580, y: 420, w: 60, h: 20, type: 'floating' }, // Small foothold
            { x: 3780, y: 450, w: 60, h: 20, type: 'floating' }, // Small foothold
            
            // The Castle Grounds (Goal)
            { x: 3950, y: 500, w: 800, h: 400, type: 'ground' }
        ];

        // --- CHECKPOINTS ---
        this.checkpoints = [
            { x: 1150, y: 550, active: false, id: 1 }, // After ascent
            { x: 2200, y: 400, active: false, id: 2 }, // Before High Road
            { x: 3350, y: 400, active: false, id: 3 }  // Before final gate
        ];

        // --- 2. OBSTACLES (Tuned for Difficulty 7) ---
        this.obstacles = [
            // A. EARLY GAME: New Ghost + Sludge on Ascent
            { 
                type: 'ghost', x: 720, y: 350, range: 120, baseSpeed: 1.2, 
                aggroRadius: 140, aggroSpeed: 2.8, cooldown: 0, 
                startX: 720, dir: 1, opacity: 0.8, state: 'patrol' 
            },
            // Sludge patch on the 2nd pillar (x=720) - Don't slip!
            { type: 'sludge', x: 730, y: 495, w: 40, h: 10, frictionMultiplier: 0.8 }, 

            // B. Sludge on the landing
            { type: 'sludge', x: 1150, y: 545, w: 400, h: 10, frictionMultiplier: 0.5 },

            // C. Ghosts (Patrolling the gap)
            { 
                type: 'ghost', x: 1350, y: 500, range: 180, baseSpeed: 1.5, 
                aggroRadius: 160, aggroSpeed: 3.5, cooldown: 0, 
                startX: 1350, dir: 1, opacity: 0.9, state: 'patrol' 
            },
            
            // D. Collapsing Platforms (The Bridge)
            { 
                type: 'collapse', x: 1780, y: 500, w: 90, h: 20, 
                delayAfterLanding: 30, 
                respawnTime: 180, 
                state: 'idle', timer: 0, platformRef: null 
            },
            { 
                type: 'collapse', x: 2050, y: 450, w: 90, h: 20, 
                delayAfterLanding: 30, 
                respawnTime: 180, 
                state: 'idle', timer: 0, platformRef: null 
            },

            // E. Stalactites (The High Road)
            { 
                type: 'stalactite', x: 2620, y: 50, w: 40, h: 80, 
                triggerRadius: 90, fallDelay: 15, 
                state: 'idle', vy: 0, timer: 0 
            },
            { 
                type: 'stalactite', x: 2870, y: 40, w: 40, h: 100, 
                triggerRadius: 90, fallDelay: 15, 
                state: 'idle', vy: 0, timer: 0 
            },

            // F. Swinging Candelabras (The Gauntlet - Synced to new platforms)
            // Swing 1 covers x=3580
            { 
                type: 'swing', cx: 3600, cy: 100, length: 260, 
                angleRange: 0.8, speed: 0.035, radius: 25, angle: 0 
            },
            // Swing 2 covers x=3780
            { 
                type: 'swing', cx: 3800, cy: 100, length: 260, 
                angleRange: 0.8, speed: 0.03, radius: 25, angle: 1.5 
            },

            // G. Bone Statue (Sniper at the end)
            { 
                type: 'statue', x: 3980, y: 450, w: 40, h: 80, 
                fireInterval: 80, projectileSpeed: 5.5, pattern: 'horizontal', // Slightly faster fire rate
                timer: 0, projectiles: []
            },
            
            // H. Dark Zones (Atmosphere)
            { 
                type: 'darkZone', x: 2400, y: 400, radius: 250, 
                flickerTimer: 0, currentAlpha: 0.5 
            }
        ];

        // Initialize Collapsing Platforms
        this.obstacles.forEach(o => {
            if (o.type === 'collapse') {
                const p = { x: o.x, y: o.y, w: o.w, h: o.h, type: 'floating' };
                this.platforms.push(p);
                o.platformRef = p;
            }
        });
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
        this.clouds = [];
        for(let i=0; i<25; i++) {
            this.clouds.push({
                x: Math.random() * 5000,
                y: Math.random() * 400,
                w: 100 + Math.random() * 200,
                speed: 0.05 + Math.random() * 0.15, 
                opacity: 0.1 + Math.random() * 0.15 
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
            }
        }

        // Control Suppression
        if (this.inputBlocked || (this.player.isStunned && this.player.stunTimer > 0)) {
            // Friction/Stop during stun
            this.player.vx *= 0.8; 
            if (this.player.isStunned) {
                this.player.stunTimer -= 16; 
                if (this.player.stunTimer <= 0) this.player.isStunned = false;
            }
        }

        // --- PHYSICS ENGINE COPY (Independent from Level 1) ---
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
                if (pBottom <= plat.y + 35) { // Snap tolerance
                    if (plat.y < groundLevel) groundLevel = plat.y;
                }
            }
        }
        this.player.groundY = groundLevel;

        this.updateObstacles(hitbox, pLeft, pRight, pTop, pBottom);

        // Camera Logic
        this.cameraX = Math.max(0, this.player.x - 300);

        // Death & Win Conditions
        if (this.player.y > 900) this.resetPlayer();
        
        // ENDING: Castle Gate logic
        // Trigger win if player overlaps with the center of the gate (approx 4200)
        if (this.player.x >= this.targetX && Math.abs(this.player.y - 500) < 100) {
            console.log("Level 2 Complete: Entered Castle!");
            if (this.engine && this.engine.handleContentComplete) {
                this.engine.handleContentComplete();
            }
        }
    },

    updateObstacles: function(hitbox, pL, pR, pT, pB) {
        const cx = pL + (pR - pL)/2; 
        const cy = pT + (pB - pT)/2; 

        for (let obs of this.obstacles) {
            // A. SLUDGE
            if (obs.type === 'sludge') {
                if (pR > obs.x && pL < obs.x + obs.w && pB > obs.y && pB < obs.y + 20) {
                    if (this.player.isGrounded) {
                        this.player.vx *= obs.frictionMultiplier;
                        // Prevent getting stuck in sticky friction
                        if (Math.abs(this.player.vx) < 0.5 && Math.abs(this.player.vx) > 0.01) {
                             this.player.x += (this.player.facingRight ? 1 : -1) * 0.5;
                        }
                    }
                }
            }
            // B. GHOST
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
                        obs.opacity = 0.9;
                    }
                } else {
                    // Aggro Logic
                    if (dist < obs.aggroRadius) {
                        const dir = (cx > obs.x) ? 1 : -1;
                        obs.x += dir * obs.aggroSpeed;
                        obs.cooldown++; 
                        if (obs.cooldown > 90) obs.state = 'fading'; // Chase for longer in L2
                    } else {
                        // Patrol
                        obs.x += obs.dir * obs.baseSpeed;
                        if (obs.x > obs.startX + obs.range) obs.dir = -1;
                        if (obs.x < obs.startX - obs.range) obs.dir = 1;
                        obs.cooldown = 0;
                    }
                    // Collision
                    if (Math.abs(cx - obs.x) < 20 && Math.abs(cy - obs.y) < 30) {
                        this.applyStun(200);
                        this.player.vx = (cx > obs.x) ? 10 : -10; 
                        this.player.vy = -5;
                        obs.state = 'fading'; 
                    }
                }
            }
            // C. COLLAPSE
            else if (obs.type === 'collapse') {
                if (obs.state === 'idle') {
                    if (this.player.isGrounded && pR > obs.x && pL < obs.x + obs.w && Math.abs(pB - obs.y) < 10) {
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
            // D. STALACTITES
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
                    obs.vy += 0.6; // Slightly faster gravity than L1
                    obs.y += obs.vy;
                    if (pR > obs.x && pL < obs.x + obs.w && pB > obs.y && pT < obs.y + obs.h) {
                        this.resetPlayer();
                    }
                    if (obs.y > 900) obs.state = 'gone';
                }
            }
            // E. SWING
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
                    this.player.vx = (dx > 0) ? 8 : -8; // Stronger knockback
                    this.player.vy = -5;
                }
            }
            // F. STATUE (Projectiles)
            else if (obs.type === 'statue') {
                obs.timer++;
                if (obs.timer > obs.fireInterval) {
                    obs.timer = 0;
                    let vx = (obs.pattern === 'horizontal') ? -obs.projectileSpeed : -obs.projectileSpeed;
                    let vy = 0;
                    obs.projectiles.push({ x: obs.x, y: obs.y + 20, vx: vx, vy: vy, life: 200 });
                }
                for (let i = obs.projectiles.length - 1; i >= 0; i--) {
                    let p = obs.projectiles[i];
                    p.x += p.vx;
                    p.y += p.vy;
                    p.life--;
                    if (Math.abs(cx - p.x) < 15 && Math.abs(cy - p.y) < 25) {
                        this.resetPlayer(); 
                    }
                    if (p.life <= 0) obs.projectiles.splice(i, 1);
                }
            }
            // G. DARK ZONE
            else if (obs.type === 'darkZone') {
                obs.flickerTimer++;
                if (obs.flickerTimer > 35) { 
                    obs.flickerTimer = 0;
                    obs.currentAlpha = 0.5 + Math.random() * 0.2; 
                }
                const dist = Math.hypot(cx - obs.x, cy - obs.y);
                if (dist < obs.radius) {
                    // Just atmosphere, no slow down in Level 2 to keep pace up
                }
            }
        }
    },

    resetPlayer: function() {
        if (this.activeCheckpoint) {
            this.player.x = this.activeCheckpoint.x;
            this.player.y = this.activeCheckpoint.y - 60;
        } else {
            this.player.x = 100;
            this.player.y = 600;
        }
        
        this.player.vy = 0;
        this.player.vx = 0;
        this.flashIntensity = 0;
        this.inputBlocked = false;
        
        // Reset puzzles for fairness
        this.obstacles.forEach(o => {
            if (o.type === 'collapse') {
                o.state = 'idle';
                if (o.platformRef) o.platformRef.y = o.y;
            }
            // Reset stalactites so they don't stay gone forever
            if (o.type === 'stalactite' && o.state === 'gone') {
                o.state = 'idle';
                o.y = 50; // Approximation of ceiling
            }
        });
    },

    applyStun: function(duration) {
        this.player.isStunned = true;
        this.player.stunTimer = duration;
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

        // --- 1. BACKGROUND (Purple Hue for Level 2) ---
        if (inDarkZone) {
             ctx.fillStyle = "#050005"; 
        } else {
            const grd = ctx.createLinearGradient(0, 0, 0, h);
            grd.addColorStop(0, "#1a0b2e"); // Dark Purple Top
            grd.addColorStop(0.6, "#2d1b4e"); 
            grd.addColorStop(1, "#4a3b5c"); // Foggy bottom
            ctx.fillStyle = grd;
        }
        ctx.fillRect(0, 0, w, h);

        if (!inDarkZone) {
            // Stars
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

            // Moon/Atmosphere
            const mx = w * 0.8;
            const my = h * 0.2;
            const mr = 40;
            const mGlow = ctx.createRadialGradient(mx, my, mr, mx, my, mr * 3);
            mGlow.addColorStop(0, "rgba(220, 200, 255, 0.2)");
            mGlow.addColorStop(1, "rgba(220, 200, 255, 0)");
            ctx.fillStyle = mGlow;
            ctx.beginPath();
            ctx.arc(mx, my, mr * 3, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = "#e6e6fa"; 
            ctx.beginPath();
            ctx.arc(mx, my, mr, 0, Math.PI*2);
            ctx.fill();
        }

        // --- WORLD RENDER ---
        ctx.save();
        ctx.translate(-this.cameraX, 0);

        // Render Castle Gate (Background Layer)
        this.renderCastleGate(ctx);

        // Clouds
        this.clouds.forEach(c => {
            const px = c.x - (this.cameraX * 0.1); // Faster parallax
            if (px + c.w > -100 && px < w + 100) {
                ctx.fillStyle = `rgba(50, 40, 60, ${c.opacity})`;
                ctx.beginPath();
                ctx.roundRect(this.cameraX + px, c.y, c.w, 40, 20);
                ctx.fill();
            }
        });

        // Checkpoints
        this.checkpoints.forEach(cp => {
            ctx.fillStyle = "#1a1a1a";
            ctx.fillRect(cp.x - 2, cp.y - 40, 4, 40);
            
            if (cp.active) {
                const glow = ctx.createRadialGradient(cp.x, cp.y - 45, 2, cp.x, cp.y - 45, 30);
                glow.addColorStop(0, "rgba(100, 255, 100, 0.8)"); // Green for L2
                glow.addColorStop(1, "rgba(100, 255, 100, 0)");
                ctx.fillStyle = glow;
                ctx.beginPath();
                ctx.arc(cp.x, cp.y - 45, 30, 0, Math.PI*2);
                ctx.fill();
                ctx.fillStyle = "#ccffcc"; 
            } else {
                ctx.fillStyle = "#333";
            }
            ctx.fillRect(cp.x - 5, cp.y - 50, 10, 12);
        });

        // Platforms
        for (let plat of this.platforms) {
            if (plat.y > 2000) continue; 
            // Level 2 Style: Darker Stone
            ctx.fillStyle = (plat.type === 'pillar') ? "#3e2723" : "#263238"; 
            ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
            
            // Texture/Detail
            ctx.fillStyle = "rgba(0,0,0,0.3)";
            ctx.fillRect(plat.x + 5, plat.y + 5, plat.w - 10, plat.h - 10);
            
            // Moss/Grass on top
            if (plat.type === 'stone' || plat.type === 'ground') {
                ctx.fillStyle = "#1b5e20";
                ctx.fillRect(plat.x, plat.y, plat.w, 8);
            }
        }

        this.renderObstacles(ctx);

        if (this.player) {
            if (this.player.isStunned && Math.floor(this.time * 10) % 2 === 0) {
                // Blink
            } else {
                this.player.render(ctx);
            }
        }

        ctx.restore();
        // --- WORLD RENDER END ---

        // SCREEN EFFECTS
        if (inDarkZone) {
            const screenCx = cx - this.cameraX;
            const r = 120; 
            const grad = ctx.createRadialGradient(screenCx, cy, r, screenCx, cy, w);
            grad.addColorStop(0, "rgba(0,0,0,0)");
            grad.addColorStop(0.3, `rgba(10,0,10,${inDarkZone.currentAlpha})`);
            grad.addColorStop(1, "rgba(10,0,10,0.98)");
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);
        }

        if (this.flashIntensity > 0.1) {
            ctx.fillStyle = `rgba(255, 255, 255, ${this.flashIntensity})`;
            ctx.fillRect(0, 0, w, h);
        }

        // HUD
        ctx.fillStyle = "#ddd";
        ctx.font = "16px monospace";
        ctx.fillText("LEVEL 2: The Castle Approach", 20, 30);
    },

    renderCastleGate: function(ctx) {
        // Draw the massive gate at targetX
        const gateX = this.targetX;
        const gateY = 500; // Ground level where it sits
        
        // Main Arch Structure
        ctx.fillStyle = "#1a1a1a";
        ctx.fillRect(gateX, gateY - 300, 200, 300); // Main block
        
        // Archway hole
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.arc(gateX + 100, gateY, 70, Math.PI, 0); // Door arch
        ctx.fill();

        // Door (Closed)
        ctx.fillStyle = "#3e2723"; // Wood
        ctx.fillRect(gateX + 30, gateY - 140, 140, 140);
        
        // Door details (Iron bars)
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(gateX + 100, gateY - 140);
        ctx.lineTo(gateX + 100, gateY);
        ctx.stroke();

        // Battlements
        ctx.fillStyle = "#1a1a1a";
        ctx.fillRect(gateX - 20, gateY - 320, 40, 40);
        ctx.fillRect(gateX + 180, gateY - 320, 40, 40);
        
        // Torches on the gate
        const flicker = Math.random() * 5;
        ctx.fillStyle = "orange";
        ctx.beginPath();
        ctx.arc(gateX + 20, gateY - 200, 5 + flicker, 0, Math.PI*2);
        ctx.arc(gateX + 180, gateY - 200, 5 + flicker, 0, Math.PI*2);
        ctx.fill();
    },

    renderObstacles: function(ctx) {
        for (let obs of this.obstacles) {
            if (obs.type === 'sludge') {
                ctx.fillStyle = "#3e2723"; 
                ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
                // Bubbles
                if (Math.random() > 0.9) {
                    ctx.fillStyle = "#5d4037";
                    ctx.fillRect(obs.x + Math.random()*obs.w, obs.y, 3, 3);
                }
            }
            else if (obs.type === 'ghost') {
                if (obs.opacity > 0) {
                    ctx.fillStyle = `rgba(200, 180, 220, ${obs.opacity})`; 
                    ctx.beginPath();
                    ctx.arc(obs.x, obs.y, 20, Math.PI, 0);
                    ctx.lineTo(obs.x + 20, obs.y + 40);
                    ctx.lineTo(obs.x - 20, obs.y + 40);
                    ctx.fill();
                    // Red eyes for Level 2 ghosts
                    ctx.fillStyle = "red";
                    ctx.fillRect(obs.x - 8, obs.y - 5, 4, 4);
                    ctx.fillRect(obs.x + 4, obs.y - 5, 4, 4);
                }
            }
            else if (obs.type === 'statue') {
                ctx.fillStyle = "#5d4037"; // Darker statue
                ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
                ctx.fillStyle = "#ff5722"; // Fire projectiles
                for (let p of obs.projectiles) {
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, 5, 0, Math.PI*2);
                    ctx.fill();
                }
            }
            else if (obs.type === 'collapse') {
                if (obs.state !== 'fallen') {
                    if (obs.state === 'shaking') {
                        ctx.strokeStyle = "#fff";
                        ctx.lineWidth = 1;
                        ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
                    }
                }
            }
            else if (obs.type === 'stalactite') {
                if (obs.state !== 'gone') {
                    ctx.fillStyle = "#5d4037"; 
                    ctx.beginPath();
                    ctx.moveTo(obs.x, obs.y);
                    ctx.lineTo(obs.x + obs.w, obs.y);
                    ctx.lineTo(obs.x + obs.w/2, obs.y + obs.h);
                    ctx.fill();
                }
            }
            else if (obs.type === 'swing') {
                ctx.strokeStyle = "#222";
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(obs.cx, obs.cy);
                ctx.lineTo(obs.bx, obs.by);
                ctx.stroke();
                
                // Candelabra look
                ctx.fillStyle = "#ffb300"; // Gold
                ctx.beginPath();
                ctx.arc(obs.bx, obs.by, 15, 0, Math.PI*2);
                ctx.fill();
                
                // Blue flame (Magic)
                const flicker = Math.random() * 5;
                ctx.fillStyle = `rgba(0, 200, 255, 0.8)`; 
                ctx.beginPath();
                ctx.arc(obs.bx, obs.by - 20, 6 + flicker, 0, Math.PI*2);
                ctx.fill();
            }
        }
    }
};