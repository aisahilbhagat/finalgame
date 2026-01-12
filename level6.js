window.Level6 = {
    engine: null,
    targetX: 6800, // Significantly longer than Level 4 (was 4800)
    player: null,
    cameraX: 0,
    time: 0,
    
    // Level Data
    platforms: [], 
    obstacles: [], 
    checkpoints: [], 
    activeCheckpoint: null, 
    
    // Visuals
    particles: [],
    torches: [],
    banners: [],
    
    // State for control suppression
    inputBlocked: false,
    flashIntensity: 0,
    shake: 0,

    init: function(engine) {
        this.engine = engine;
        console.log("Level 6 Initialized: The Iron Sanctum (Hard Mode)");
        this.generateDust();
    },

    load: function() {
        this.loadCharacterScript(() => {
            if (window.LevelCharacter) {
                // Spawn Player at start
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
        // --- 1. PLATFORMS (Difficulty: 9.0) ---
        // Theme: The Iron Sanctum. Deeper, harder, less forgiving.
        
        this.platforms = [
            // START: Safe Zone
            { x: 0, y: 700, w: 400, h: 200, type: 'ground' },

            // PHASE 1: The Shredder Hall (Rhythmic Movement)
            // Low ceilings, many blades.
            { x: 500, y: 700, w: 200, h: 200, type: 'stone' },
            { x: 800, y: 700, w: 200, h: 200, type: 'stone' },
            { x: 1100, y: 700, w: 200, h: 200, type: 'stone' },
            { x: 1400, y: 650, w: 200, h: 250, type: 'stone' },

            // PHASE 2: The Vertical Shaft (Precision Jumping)
            // Climbing high with narrow footholds.
            { x: 1700, y: 550, w: 80, h: 20, type: 'floating' },
            { x: 1900, y: 450, w: 80, h: 20, type: 'floating' },
            { x: 1700, y: 350, w: 80, h: 20, type: 'floating' },
            { x: 1900, y: 250, w: 80, h: 20, type: 'floating' },
            { x: 1700, y: 150, w: 80, h: 20, type: 'floating' }, // Peak

            // High Walkway (Transition)
            { x: 2000, y: 150, w: 400, h: 20, type: 'stone' },

            // CHECKPOINT 1 (The Upper Bastion)
            { x: 2500, y: 300, w: 300, h: 400, type: 'stone' },

            // PHASE 3: The Bridge of Regret (Combat on narrow footing)
            // Long fall if you get knocked back.
            { x: 3000, y: 300, w: 150, h: 20, type: 'bridge' },
            { x: 3300, y: 300, w: 150, h: 20, type: 'bridge' },
            { x: 3600, y: 300, w: 150, h: 20, type: 'bridge' },
            { x: 3900, y: 300, w: 150, h: 20, type: 'bridge' },

            // CHECKPOINT 2 (The Middle Keep)
            { x: 4200, y: 400, w: 300, h: 400, type: 'stone' },

            // PHASE 4: The Descent (Controlled falling)
            { x: 4600, y: 500, w: 100, h: 20, type: 'floating' },
            { x: 4800, y: 600, w: 100, h: 20, type: 'floating' },
            { x: 5000, y: 700, w: 100, h: 20, type: 'floating' },

            // PHASE 5: The Final Gauntlet (Density Spike)
            // A long, flat run populated densely with hazards.
            { x: 5200, y: 750, w: 1200, h: 150, type: 'stone' }, // The killing floor
            
            // EXIT
            { x: 6500, y: 650, w: 600, h: 250, type: 'ground' }
        ];

        // --- CHECKPOINTS ---
        // Spaced deliberately to force mastery of sections.
        this.checkpoints = [
            { x: 2550, y: 300, active: false, id: 1 }, // After the climb
            { x: 4250, y: 400, active: false, id: 2 }, // After the bridges
            { x: 5250, y: 750, active: false, id: 3 }  // Before the final gauntlet
        ];

        // --- 2. OBSTACLES (High Density) ---
        this.obstacles = [
            // PHASE 1: The Shredder Hall
            // Denser blades than Level 4. Overlapping danger zones.
            { type: 'swing_blade', cx: 600, cy: 100, length: 450, speed: 0.05, angle: 0, range: 0.8 },
            { type: 'swing_blade', cx: 900, cy: 100, length: 450, speed: 0.06, angle: 1.5, range: 0.8 }, // Offbeat
            { type: 'swing_blade', cx: 1200, cy: 100, length: 450, speed: 0.05, angle: 0.5, range: 0.8 },
            
            // PHASE 2: The Vertical Shaft
            // Jets placed to punish lingering on the small floating platforms.
            { type: 'lava_jet', x: 1720, y: 570, h: 100, timer: 0, interval: 120, state: 'idle' },
            { type: 'lava_jet', x: 1920, y: 470, h: 100, timer: 40, interval: 120, state: 'idle' },
            { type: 'lava_jet', x: 1720, y: 370, h: 100, timer: 80, interval: 120, state: 'idle' },
            // Removed the blade at cx: 1800 that was guarding the peak

            // PHASE 3: The Bridge of Regret (Enemies + Hazards)
            // Enemies on narrow platforms are deadly due to knockback.
            { 
                type: 'armor', x: 3050, y: 250, range: 60, baseSpeed: 1.5, 
                aggroRadius: 250, aggroSpeed: 3.5, cooldown: 0, 
                startX: 3050, dir: 1, state: 'patrol', hp: 2 
            },
            { 
                type: 'armor', x: 3650, y: 250, range: 60, baseSpeed: 1.5, 
                aggroRadius: 250, aggroSpeed: 3.5, cooldown: 0, 
                startX: 3650, dir: -1, state: 'patrol', hp: 3 
            },
            // A blade cutting across the gap between bridges
            { type: 'swing_blade', cx: 3450, cy: -100, length: 350, speed: 0.03, angle: 0, range: 0.5 },

            // PHASE 5: The Final Gauntlet
            // A mix of everything.
            { 
                type: 'armor', x: 5400, y: 700, range: 100, baseSpeed: 2, 
                aggroRadius: 300, aggroSpeed: 4.5, cooldown: 0, 
                startX: 5400, dir: 1, state: 'patrol', hp: 3 
            },
            { type: 'lava_jet', x: 5600, y: 900, h: 250, timer: 20, interval: 100, state: 'idle' },
            { type: 'lava_jet', x: 5700, y: 900, h: 250, timer: 70, interval: 100, state: 'idle' },
            
            // The Twin Wardens (Two elites at the end)
            { 
                type: 'armor', x: 6000, y: 700, range: 150, baseSpeed: 1.5, 
                aggroRadius: 400, aggroSpeed: 4.0, cooldown: 0, 
                startX: 6000, dir: 1, state: 'patrol', hp: 4 
            },
            { 
                type: 'armor', x: 6200, y: 700, range: 150, baseSpeed: 1.5, 
                aggroRadius: 400, aggroSpeed: 4.0, cooldown: 0, 
                startX: 6200, dir: -1, state: 'patrol', hp: 4 
            },
            
            // Final blade to dodge while fighting
            { type: 'swing_blade', cx: 6100, cy: 300, length: 400, speed: 0.04, angle: 0, range: 0.9 }
        ];

        // --- 3. DECORATIONS ---
        this.torches = [
            { x: 200, y: 650 }, 
            { x: 1400, y: 600 }, 
            { x: 2050, y: 100 }, // High up
            { x: 2500, y: 250 },
            { x: 4200, y: 350 },
            { x: 5300, y: 700 },
            { x: 6400, y: 600 }
        ];

        this.banners = [
            { x: 600, y: 200, color: '#331111' },
            { x: 1200, y: 200, color: '#111133' },
            { x: 2600, y: 100, color: '#331111' },
            { x: 4300, y: 200, color: '#111133' },
            { x: 5500, y: 400, color: '#550000' } // Red warning banners
        ];
    },

    generateDust: function() {
        this.particles = [];
        for(let i=0; i<50; i++) { // Increased particle count for deeper atmosphere
            this.particles.push({
                x: Math.random() * 2000, 
                y: Math.random() * 800, 
                size: Math.random() * 2 + 0.5,
                speedY: Math.random() * 0.5 + 0.1,
                speedX: Math.random() * 0.4 - 0.2,
                life: Math.random() * 100,
                color: '#8899aa' // Steel grey dust
            });
        }
    },

    update: function() {
        this.time += 0.05;
        if (this.flashIntensity > 0) this.flashIntensity -= 0.05;
        if (this.shake > 0) this.shake--;

        if (!this.player) return;

        // --- PLAYER UPDATE ---
        this.player.update();

        // --- CHECKPOINT LOGIC ---
        for (let cp of this.checkpoints) {
            if (!cp.active && this.player.x > cp.x) {
                cp.active = true;
                this.activeCheckpoint = cp;
                this.playSound('checkpoint');
                // Hard Mode: Smaller heal at checkpoint (+25 instead of +30)
                if (this.player.hp < this.player.maxHp) {
                    this.player.hp = Math.min(this.player.hp + 25, this.player.maxHp);
                }
            }
        }

        // --- DEATH CHECK ---
        if (this.player.hp <= 0) {
            this.resetPlayer();
        }

        // --- PHYSICS & COLLISION ---
        const hitbox = this.player.hitbox || { offsetX: 0, offsetY: 0, width: 36, height: 60 };
        let pLeft = this.player.x + hitbox.offsetX;
        let pRight = pLeft + hitbox.width;
        let pTop = this.player.y + hitbox.offsetY;
        let pBottom = pTop + hitbox.height;
        let pVelY = this.player.vy || 0;

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

        // 2. Vertical
        let groundLevel = 1200; // Lower death plane for vertical sections
        for (let plat of this.platforms) {
            if (pRight > plat.x && pLeft < plat.x + plat.w) {
                if (pBottom <= plat.y + 35) {
                    if (plat.y < groundLevel) groundLevel = plat.y;
                }
            }
        }
        this.player.groundY = groundLevel;

        this.updateObstacles(hitbox, pLeft, pRight, pTop, pBottom);

        // --- CAMERA ---
        let targetCam = this.player.x - 300;
        
        // Improved Vertical Camera for the climbing section
        // If player goes high, camera follows up.
        // If player goes low (the final gauntlet), camera follows down.
        // We use a "soft" vertical follow.
        
        let targetCamY = 0;
        if (this.player.y < 300) targetCamY = (this.player.y - 300) * 0.8; // Follow up
        
        // Apply smooth follow
        this.cameraX += (targetCam - this.cameraX) * 0.1;
        
        // Clamp start
        if (this.cameraX < 0) this.cameraX = 0;

        // --- DEATH & WIN ---
        if (this.player.y > 1100) { // Adjusted for deeper level
            this.playSound('fall');
            this.player.hp = 0; 
            this.resetPlayer();
        }

        if (this.player.x >= this.targetX) {
             console.log("Level 6 Complete!");
             if (this.engine && this.engine.handleContentComplete) {
                 this.engine.handleContentComplete();
             }
        }
    },

    updateObstacles: function(hitbox, pL, pR, pT, pB) {
        const cx = pL + (pR - pL)/2; 
        const cy = pT + (pB - pT)/2; 

        // Cleanup dead obstacles
        this.obstacles = this.obstacles.filter(o => !o.dead);

        for (let obs of this.obstacles) {
            // A. SWING BLADE
            if (obs.type === 'swing_blade') {
                const time = this.time * 20; 
                const currentAngle = Math.sin(time * obs.speed + obs.angle) * obs.range;
                
                const bx = obs.cx + Math.sin(currentAngle) * obs.length;
                const by = obs.cy + Math.cos(currentAngle) * obs.length;
                obs.bx = bx; obs.by = by;

                const bladeCenterX = obs.cx + Math.sin(currentAngle) * (obs.length + 30);
                const bladeCenterY = obs.cy + Math.cos(currentAngle) * (obs.length + 30);

                if (Math.hypot(cx - bladeCenterX, cy - bladeCenterY) < 45) {
                     if (!this.player.isStunned) {
                        this.player.takeDamage(25, (cx > bx ? 1 : -1));
                        this.playSound('clank');
                        this.shake = 5;
                     }
                }
            }
            // B. LAVA JET
            else if (obs.type === 'lava_jet') {
                obs.timer++;
                if (obs.timer > obs.interval) obs.timer = 0;
                
                if (obs.timer > (obs.interval - 40)) {
                    if (pR > obs.x && pL < obs.x + 30 && pB > (obs.y - obs.h)) {
                         if (!this.player.isStunned) {
                             this.player.takeDamage(35, (this.player.facingRight ? -1 : 1));
                             this.player.vy = -12;
                         }
                    }
                }
            }
            // C. ARMOR
            else if (obs.type === 'armor') {
                if (obs.hp <= 0) continue;
                
                const dist = Math.hypot(cx - obs.x, cy - obs.y);
                
                // Aggro Logic
                if (dist < obs.aggroRadius) {
                     const dir = (cx > obs.x) ? 1 : -1;
                     obs.x += dir * obs.aggroSpeed;
                     obs.dir = dir;
                } else {
                     obs.x += obs.dir * obs.baseSpeed;
                     if (Math.abs(obs.x - obs.startX) > obs.range) obs.dir *= -1;
                }

                // Collision
                if (Math.abs(cx - obs.x) < 30 && Math.abs(cy - obs.y) < 50) {
                    if (this.player.isAttacking) {
                        obs.hp--;
                        this.playSound('hit');
                        obs.x += (this.player.facingRight ? 10 : -10);
                        
                        if (obs.hp <= 0) {
                            obs.dead = true;
                            // Lower drop chance in hard mode (50%)
                            if (Math.random() > 0.5) {
                                this.player.hp = Math.min(this.player.hp + 20, this.player.maxHp);
                            }
                        }
                    } else if (!this.player.isStunned) {
                        this.player.takeDamage(15, (cx > obs.x ? 1 : -1));
                    }
                }
            }
        }
    },

    resetPlayer: function() {
        if (this.activeCheckpoint) {
            this.player.x = this.activeCheckpoint.x;
            this.player.y = this.activeCheckpoint.y - 60;
            
            // CHECKPOINT RESPAWN: Hard Mode (70% HP)
            // You are deep in the castle, so you don't get a full recovery.
            this.player.hp = Math.floor(this.player.maxHp * 0.7);
        } else {
            this.player.x = 100;
            this.player.y = 600;
            
            // LEVEL START RESPAWN: Full recovery
            this.player.hp = this.player.maxHp;
        }
        
        this.player.vy = 0;
        this.player.vx = 0;
        this.player.isStunned = false;
        this.flashIntensity = 0.5;
        this.shake = 5;
    },

    playSound: function(name) {
        if (this.engine && this.engine.playSound) this.engine.playSound(name);
    },

    // --- RENDER ---
    render: function(ctx) {
        const w = ctx.canvas.width;
        const h = ctx.canvas.height;

        // 1. BACKGROUND (Deeper, darker castle)
        const grd = ctx.createLinearGradient(0, 0, 0, h);
        grd.addColorStop(0, "#020205"); // Near black top
        grd.addColorStop(0.6, "#10101a"); 
        grd.addColorStop(1, "#050508"); 
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, w, h);

        // 2. PARALLAX DUST
        ctx.save();
        this.updateAndRenderDust(ctx);
        ctx.restore();

        // 3. WORLD
        ctx.save();
        
        // Screen Shake
        let shakeX = 0, shakeY = 0;
        if (this.shake > 0) {
            shakeX = (Math.random() - 0.5) * this.shake;
            shakeY = (Math.random() - 0.5) * this.shake;
        }
        
        // Apply Camera with vertical handling (simplified for stability)
        // We only translate Y if the player is very high up
        let camY = 0;
        if (this.player && this.player.y < 300) camY = (300 - this.player.y) * 0.5;
        
        ctx.translate(-this.cameraX + shakeX, camY + shakeY);

        // A. Background Pillars
        ctx.fillStyle = "rgba(10, 10, 20, 0.4)";
        for (let x = 200; x < 7000; x += 600) {
            ctx.fillRect(x, -500, 120, h + 1000);
        }

        // B. Banners
        this.banners.forEach(b => {
            ctx.fillStyle = b.color;
            ctx.beginPath();
            ctx.moveTo(b.x, b.y);
            ctx.lineTo(b.x + 40, b.y);
            ctx.lineTo(b.x + 40, b.y + 100);
            ctx.lineTo(b.x + 20, b.y + 80);
            ctx.lineTo(b.x, b.y + 100);
            ctx.fill();
        });

        // C. Torches
        this.torches.forEach(t => {
            const glow = ctx.createRadialGradient(t.x, t.y, 5, t.x, t.y, 80);
            glow.addColorStop(0, "rgba(255, 180, 80, 0.4)");
            glow.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = glow;
            ctx.fillRect(t.x - 80, t.y - 80, 160, 160);
            
            ctx.fillStyle = "#333";
            ctx.fillRect(t.x - 2, t.y, 4, 20);
            
            const flicker = Math.random() * 5;
            ctx.fillStyle = "#ffaa00";
            ctx.beginPath();
            ctx.arc(t.x, t.y - 5, 4 + flicker, 0, Math.PI*2);
            ctx.fill();
        });

        // D. Platforms
        for (let plat of this.platforms) {
            if (plat.type === 'bridge') {
                ctx.fillStyle = "#4e342e"; // Darker Wood
                ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
                ctx.fillStyle = "#3e2723";
                for(let i=0; i<plat.w; i+=20) ctx.fillRect(plat.x + i, plat.y, 2, plat.h);
            } else if (plat.type === 'floating') {
                ctx.fillStyle = "#263238"; // Darker Slate
                ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
                ctx.strokeStyle = "#455a64"; 
                ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
            } else {
                ctx.fillStyle = "#1a1a1a"; // Darker Stone
                ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
                ctx.fillStyle = "#333"; 
                ctx.fillRect(plat.x, plat.y, plat.w, 5); 
            }
        }

        // E. Exit Gate
        this.renderExitGate(ctx);

        // F. Checkpoints
        this.checkpoints.forEach(cp => {
            ctx.fillStyle = cp.active ? "#00ffaa" : "#333"; // Greenish-cyan for active
            ctx.fillRect(cp.x - 2, cp.y - 50, 4, 50); 
            ctx.beginPath();
            ctx.moveTo(cp.x, cp.y - 50);
            ctx.lineTo(cp.x + 30, cp.y - 40);
            ctx.lineTo(cp.x, cp.y - 30);
            ctx.fill();
        });

        // G. Obstacles
        this.renderObstacles(ctx);

        // H. Player
        if (this.player) this.player.render(ctx);

        ctx.restore();

        // 4. UI / HUD
        if (this.flashIntensity > 0) {
            ctx.fillStyle = `rgba(255, 0, 0, ${this.flashIntensity})`;
            ctx.fillRect(0, 0, w, h);
        }

        if (this.player) {
            const maxHp = this.player.maxHp || 100;
            const curHp = Math.max(0, this.player.hp);
            const pct = curHp / maxHp;

            ctx.fillStyle = "#111";
            ctx.fillRect(20, 50, 204, 20);
            ctx.strokeStyle = "#666";
            ctx.strokeRect(20, 50, 204, 20);

            ctx.fillStyle = pct > 0.5 ? "#00e676" : (pct > 0.25 ? "#ffea00" : "#d50000"); 
            ctx.fillRect(22, 52, 200 * pct, 16);

            ctx.fillStyle = "#ccc";
            ctx.font = "12px monospace";
            ctx.fillText(`ARMOR: ${Math.ceil(curHp)}`, 230, 64);
        }

        ctx.fillStyle = "#fff";
        ctx.font = "16px monospace";
        ctx.fillText("LEVEL 6: The Iron Sanctum", 20, 30);
    },

    renderExitGate: function(ctx) {
        const gateX = 6600; // Updated end coordinates
        const gateY = 650;
        
        ctx.fillStyle = "#222";
        ctx.fillRect(gateX - 60, gateY - 120, 120, 120);
        ctx.fillStyle = "#000";
        ctx.fillRect(gateX - 40, gateY - 120, 80, 120); 

        const time = this.time * 2;
        ctx.fillStyle = `rgba(200, 200, 255, ${Math.abs(Math.sin(time)) * 0.3})`;
        ctx.fillRect(gateX - 40, gateY - 120, 80, 120);

        ctx.save();
        ctx.fillStyle = "#888"; 
        ctx.font = "bold 14px monospace";
        ctx.textAlign = "center";
        ctx.fillText("ASCEND >", gateX, gateY - 130);
        ctx.restore();
    },

    updateAndRenderDust: function(ctx) {
        this.particles.forEach(p => {
            p.y += p.speedY;
            p.x += p.speedX;
            if (p.y > ctx.canvas.height) {
                p.y = 0;
                p.x = this.cameraX + Math.random() * window.innerWidth;
            }
            ctx.fillStyle = p.color;
            ctx.globalAlpha = 0.4;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
            ctx.fill();
        });
        ctx.globalAlpha = 1.0;
    },

    renderObstacles: function(ctx) {
        for (let obs of this.obstacles) {
            if (obs.type === 'swing_blade') {
                ctx.strokeStyle = "#555";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(obs.cx, obs.cy);
                ctx.lineTo(obs.bx, obs.by);
                ctx.stroke();
                
                ctx.save();
                ctx.translate(obs.bx, obs.by);
                const angle = Math.atan2(obs.bx - obs.cx, obs.by - obs.cy);
                ctx.rotate(-angle);
                
                ctx.fillStyle = "#ccc"; 
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(-20, 40);
                ctx.lineTo(0, 60);
                ctx.lineTo(20, 40);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
            else if (obs.type === 'lava_jet') {
                ctx.fillStyle = "#333"; 
                ctx.fillRect(obs.x, obs.y, 30, 10);
                
                if (obs.timer > (obs.interval - 40)) {
                    const height = obs.h * (Math.random() * 0.2 + 0.8);
                    const grad = ctx.createLinearGradient(0, obs.y, 0, obs.y - height);
                    grad.addColorStop(0, "rgba(255, 255, 255, 0.6)"); // Steam look
                    grad.addColorStop(1, "rgba(200, 200, 200, 0)");
                    ctx.fillStyle = grad;
                    ctx.fillRect(obs.x + 5, obs.y - height, 20, height);
                } else if (obs.timer > (obs.interval - 60)) {
                    ctx.fillStyle = "rgba(150, 150, 150, 0.5)";
                    ctx.beginPath();
                    ctx.arc(obs.x + 15, obs.y - 5, Math.random() * 5, 0, Math.PI*2);
                    ctx.fill();
                }
            }
            else if (obs.type === 'armor') {
                if (obs.dead) return;
                ctx.fillStyle = obs.hp > 1 ? "#888" : "#844"; 
                ctx.fillRect(obs.x - 12, obs.y - 25, 24, 45); 
                
                ctx.fillStyle = "#444"; 
                ctx.fillRect(obs.x - 10, obs.y - 40, 20, 15);
                
                ctx.fillStyle = "#f00"; // Red Eyes for elite guards
                ctx.fillRect(obs.x - 5, obs.y - 35, 4, 4);
                ctx.fillRect(obs.x + 2, obs.y - 35, 4, 4);
                
                ctx.fillStyle = "#ddd";
                ctx.fillRect(obs.x + 12, obs.y - 20, 4, 35);
            }
        }
    }
};