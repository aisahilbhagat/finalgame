window.Level9 = {
    engine: null,
    targetX: 8000, // Compact but dense level
    player: null,
    cameraX: 0,
    time: 0,
    
    // Level Data
    platforms: [], 
    hazards: [], // Renamed from obstacles to reflect non-entity nature
    checkpoints: [], 
    activeCheckpoint: null,
    
    // Visuals
    decorations: [],
    bgParticles: [],
    
    // Logic State
    globalTimer: 0,
    cycleDuration: 180, // 3 seconds approx at 60fps
    phase: 'A', // 'A' or 'B'

    init: function(engine) {
        this.engine = engine;
        console.log("Level 9 Initialized: The Logic Core");
        this.generateBackground();
    },

    load: function() {
        this.loadCharacterScript(() => {
            if (window.LevelCharacter) {
                this.player = new window.LevelCharacter(100, 600);
                this.setupLevel();
            } else {
                console.error("LevelCharacter failed to load.");
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
        this.platforms = [];
        this.hazards = [];
        this.checkpoints = [];
        this.decorations = [];

        // ============================================================
        // MECHANIC INTRODUCTION: PHASING
        // ============================================================
        // Ground
        this.platforms.push({ x: 0, y: 700, w: 400, h: 200, type: 'static' });
        
        // Instructional Deco
        this.decorations.push({ x: 300, y: 550, text: "OBSERVE THE CYCLE" });

        // Phase A Platform (Solid 0-50%)
        this.platforms.push({ x: 500, y: 600, w: 100, h: 20, type: 'phase_a' });
        
        // Phase B Platform (Solid 50-100%)
        this.platforms.push({ x: 700, y: 500, w: 100, h: 20, type: 'phase_b' });

        // Safe Landing
        this.platforms.push({ x: 900, y: 500, w: 200, h: 20, type: 'static' });

        // ============================================================
        // SECTION 1: THE BINARY STAIRCASE
        // ============================================================
        // A climb where every other step disappears.
        // If you rush, you fall.
        
        for (let i = 0; i < 6; i++) {
            let type = (i % 2 === 0) ? 'phase_a' : 'phase_b';
            this.platforms.push({ 
                x: 1200 + (i * 120), 
                y: 500 - (i * 60), 
                w: 80, 
                h: 20, 
                type: type 
            });
        }

        // Safe Platform
        this.platforms.push({ x: 2000, y: 100, w: 300, h: 20, type: 'static' });

        // ============================================================
        // CHECKPOINT 1
        // ============================================================
        this.checkpoints.push({ x: 2100, y: 100, active: false, id: 1 });
        this.decorations.push({ x: 2100, y: 50, text: "SYNC COMPLETE" });

        // ============================================================
        // SECTION 2: THE SEQUENCE LASERS
        // ============================================================
        // Horizontal corridor. Vertical lasers fire in a wave 1 -> 2 -> 3 -> 4.
        // Player must run *with* the wave or wait for the reset.
        
        this.platforms.push({ x: 2300, y: 100, w: 1400, h: 20, type: 'static' }); // Long bridge

        // Laser Array
        // interval: total cycle length
        // offset: when in the cycle it activates
        // duration: how long it stays active
        for (let i = 0; i < 5; i++) {
            this.hazards.push({
                type: 'laser_vertical',
                x: 2500 + (i * 250),
                y: 0,
                h: 100, // Hits the bridge level
                interval: 200,
                offset: i * 30, // Sequential firing
                duration: 60,
                active: false
            });
        }

        // ============================================================
        // SECTION 3: THE LOGIC GAP
        // ============================================================
        // A large gap. You must use a moving platform that is only solid
        // during specific phases.
        
        this.platforms.push({ x: 3800, y: 200, w: 200, h: 20, type: 'static' });

        // A moving platform that is also Phased
        // It moves back and forth. It is Phase A (Solid first half of cycle).
        // You must catch it when it's solid AND moving towards destination.
        this.platforms.push({ 
            x: 4000, y: 200, w: 100, h: 20, type: 'moving_phase_a', 
            startX: 4000, endX: 4500, speed: 2 
        });

        this.platforms.push({ x: 4600, y: 200, w: 200, h: 20, type: 'static' });

        // ============================================================
        // CHECKPOINT 2
        // ============================================================
        this.checkpoints.push({ x: 4700, y: 200, active: false, id: 2 });
        this.decorations.push({ x: 4700, y: 150, text: "PROCESSOR NODE" });

        // ============================================================
        // SECTION 4: THE MEMORY WALL
        // ============================================================
        // A vertical drop.
        // Platforms are arranged in a grid.
        // Only a specific path is solid (Phase A). The rest are Phase B (Traps).
        // But they look very similar. Phase A is Cyan, Phase B is Magenta.
        // The cycle is very fast here, forcing quick identification.

        this.platforms.push({ x: 5000, y: 200, w: 100, h: 20, type: 'static' });

        // The Drop
        const startX = 5200;
        const startY = 200;
        
        // Row 1
        this.platforms.push({ x: startX, y: startY + 100, w: 80, h: 20, type: 'phase_b' }); // Trap
        this.platforms.push({ x: startX + 150, y: startY + 100, w: 80, h: 20, type: 'phase_a' }); // Path

        // Row 2
        this.platforms.push({ x: startX + 50, y: startY + 250, w: 80, h: 20, type: 'phase_a' }); // Path
        this.platforms.push({ x: startX + 200, y: startY + 250, w: 80, h: 20, type: 'phase_b' }); // Trap

        // Row 3
        this.platforms.push({ x: startX, y: startY + 400, w: 80, h: 20, type: 'phase_b' }); // Trap
        this.platforms.push({ x: startX + 150, y: startY + 400, w: 80, h: 20, type: 'phase_a' }); // Path

        // Floor
        this.platforms.push({ x: 5200, y: 700, w: 600, h: 20, type: 'static' });

        // ============================================================
        // SECTION 5: THE FINAL CALCULATION
        // ============================================================
        // A mix of horizontal lasers and phase platforms.
        // You have to duck under lasers while standing on platforms that disappear.
        
        // Base
        for(let i=0; i<5; i++) {
             // Platforms that toggle.
             // You must jump between them.
             // But there are horizontal lasers at head height.
             
             let px = 6000 + (i * 200);
             let py = 600;
             let type = (i % 2 === 0) ? 'phase_a' : 'phase_b';
             
             this.platforms.push({ x: px, y: py, w: 100, h: 20, type: type });
             
             // Laser at Jump Height (forces timing)
             // Fires when the platform you are jumping TO is active.
             this.hazards.push({
                 type: 'laser_horizontal',
                 x: px + 100, // Gap between platforms
                 y: py - 50,
                 w: 100,
                 interval: 120,
                 offset: (i % 2 === 0) ? 0 : 60, // Alternating lasers
                 duration: 60
             });
        }

        // ============================================================
        // EXIT
        // ============================================================
        this.platforms.push({ x: 7200, y: 600, w: 800, h: 200, type: 'static' });
        this.decorations.push({ x: 7500, y: 400, text: "LOGIC VERIFIED" });
        this.targetX = 7800;
    },

    generateBackground: function() {
        this.bgParticles = [];
        for(let i=0; i<50; i++) {
            this.bgParticles.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                size: Math.random() * 2,
                speed: Math.random() * 0.5 + 0.1,
                opacity: Math.random() * 0.5
            });
        }
    },

    update: function() {
        this.time++;
        this.globalTimer++;
        
        // --- LOGIC CYCLE UPDATE ---
        const cyclePos = this.globalTimer % this.cycleDuration;
        const halfCycle = this.cycleDuration / 2;
        this.phase = (cyclePos < halfCycle) ? 'A' : 'B';
        
        // --- ENTITY UPDATES ---
        if (!this.player) return;
        this.player.update();
        
        // Camera (Smooth follow with lookahead)
        const targetCam = this.player.x - 300;
        this.cameraX += (targetCam - this.cameraX) * 0.08;
        if (this.cameraX < 0) this.cameraX = 0;

        // Death Check (Void)
        if (this.player.y > 1000) {
            this.resetPlayer();
        }

        // Win Condition
        if (this.player.x >= this.targetX) {
             console.log("Level 9 Complete!");
             if (this.engine && this.engine.handleContentComplete) {
                 this.engine.handleContentComplete();
             }
        }

        // --- PLATFORM PHYSICS (CUSTOM) ---
        // We override standard physics to handle "Ghost" platforms
        
        const hitbox = this.player.hitbox || { offsetX: 0, offsetY: 0, width: 36, height: 60 };
        let pL = this.player.x + hitbox.offsetX;
        let pR = pL + hitbox.width;
        let pT = this.player.y + hitbox.offsetY;
        let pB = pT + hitbox.height;
        let groundLevel = 2000;

        // Update Moving Platforms first
        for (let plat of this.platforms) {
            if (plat.type === 'moving_phase_a' || plat.type === 'moving_phase_b') {
                // Simple sine movement
                const movePhase = (this.time * 0.02); 
                const range = (plat.endX - plat.startX) / 2;
                const center = plat.startX + range;
                const oldX = plat.x;
                plat.x = center + Math.sin(movePhase) * range;
                
                // Carry player if on top
                // (Rough approximation: if player was on it last frame, move them)
                // Actually, standard platformer carry logic is complex. 
                // We'll rely on the player landing on it each frame.
            }
        }

        for (let plat of this.platforms) {
            // 1. Determine Solidity based on Phase
            let isSolid = true;
            if (plat.type === 'phase_a' || plat.type === 'moving_phase_a') {
                if (this.phase !== 'A') isSolid = false;
            } else if (plat.type === 'phase_b' || plat.type === 'moving_phase_b') {
                if (this.phase !== 'B') isSolid = false;
            }

            if (!isSolid) continue; // Skip collision if ghosted

            // Standard AABB
            if (pR > plat.x && pL < plat.x + plat.w &&
                pB > plat.y && pT < plat.y + plat.h) {
                
                const floorThreshold = plat.y + Math.max(15, this.player.vy + 5);
                
                // Landing on top
                if (pB > floorThreshold) {
                    // Check horizontal overlap to push out
                    const overlapL = pR - plat.x;
                    const overlapR = (plat.x + plat.w) - pL;
                    
                    if (overlapL < overlapR) this.player.x -= overlapL;
                    else this.player.x += overlapR;
                    
                    this.player.vx = 0;
                    // Re-calc bounds after push
                    pL = this.player.x + hitbox.offsetX;
                    pR = pL + hitbox.width;
                }
            }
            
            // Floor Detection (for jumping)
            if (pR > plat.x && pL < plat.x + plat.w) {
                 if (pB <= plat.y + 35 && this.player.vy >= 0) {
                     if (plat.y < groundLevel) groundLevel = plat.y;
                 }
            }
        }
        this.player.groundY = groundLevel;

        // --- HAZARD LOGIC ---
        this.updateHazards(pL, pR, pT, pB);
        
        // --- CHECKPOINTS ---
        for (let cp of this.checkpoints) {
            if (!cp.active && this.player.x > cp.x) {
                cp.active = true;
                this.activeCheckpoint = cp;
                this.playSound('checkpoint'); // Using Engine sound if avail, else fallback
            }
        }
    },

    updateHazards: function(pL, pR, pT, pB) {
        // Player Center
        const cx = pL + (pR - pL)/2; 
        const cy = pT + (pB - pT)/2;

        for (let h of this.hazards) {
            // Update Logic
            const cycle = (this.time + h.offset) % h.interval;
            h.active = (cycle < h.duration);

            if (!h.active) continue;

            // Collision
            let hit = false;
            if (h.type === 'laser_vertical') {
                // A thin vertical line
                if (cx > h.x - 10 && cx < h.x + 10 && pB > h.y && pT < h.y + h.h) hit = true;
            } else if (h.type === 'laser_horizontal') {
                if (cx > h.x && cx < h.x + h.w && cy > h.y - 10 && cy < h.y + 10) hit = true;
            }

            if (hit && !this.player.isStunned) {
                this.player.takeDamage(100); // Instant Fail/Reset usually, or heavy damage
                this.playSound('hit');
                // Force a "wrong choice" feel - heavy knockback
                this.player.vx = -10;
                this.player.vy = -5;
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
        this.player.hp = this.player.maxHp;
        this.player.vx = 0;
        this.player.vy = 0;
        this.player.isStunned = false;
    },

    playSound: function(name) {
        if (window.SoundManager) {
            if (name === 'hit') window.SoundManager.damage();
            if (name === 'checkpoint') window.SoundManager.playTone(600, 'sine', 0.2);
        }
    },

    // ============================================================
    // RENDERING
    // ============================================================
    render: function(ctx) {
        const w = ctx.canvas.width;
        const h = ctx.canvas.height;

        // --- BACKGROUND: THE VOID GRID ---
        ctx.fillStyle = "#050505";
        ctx.fillRect(0, 0, w, h);
        
        // Draw Grid Lines (Parallax)
        ctx.strokeStyle = "#112211";
        ctx.lineWidth = 1;
        const gridSize = 100;
        const offX = Math.floor(this.cameraX * 0.5) % gridSize;
        const offY = Math.floor(this.player ? this.player.y * 0.1 : 0) % gridSize;
        
        ctx.beginPath();
        for (let x = -offX; x < w; x+=gridSize) {
            ctx.moveTo(x, 0); ctx.lineTo(x, h);
        }
        for (let y = -offY; y < h; y+=gridSize) {
            ctx.moveTo(0, y); ctx.lineTo(w, y);
        }
        ctx.stroke();

        ctx.save();
        // Camera Transform
        let camY = 0;
        if (this.player && this.player.y < 300) camY = (300 - this.player.y) * 0.8;
        ctx.translate(-this.cameraX, camY);

        // --- DECORATIONS (Text) ---
        ctx.fillStyle = "#334433";
        ctx.font = "bold 40px monospace";
        ctx.textAlign = "center";
        this.decorations.forEach(d => {
            ctx.fillText(d.text, d.x, d.y);
        });

        // --- PLATFORMS ---
        for (let plat of this.platforms) {
            let color = "#444";
            let alpha = 1.0;
            let isGhost = false;

            // Visual Logic for Phase
            if (plat.type === 'static') {
                color = "#222";
                // Tech border
                ctx.fillStyle = color;
                ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
                ctx.strokeStyle = "#444";
                ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
            } else {
                const isA = (plat.type.includes('phase_a'));
                const isActive = (isA && this.phase === 'A') || (!isA && this.phase === 'B');
                
                if (isActive) {
                    color = isA ? "#00ff88" : "#ff0088"; // Neon Green (A) vs Neon Pink (B)
                    alpha = 1.0;
                } else {
                    color = isA ? "#004422" : "#440022";
                    alpha = 0.2;
                    isGhost = true;
                }

                ctx.globalAlpha = alpha;
                ctx.fillStyle = color;
                ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
                
                // Inner Detail (Circuitry look)
                ctx.strokeStyle = "#fff";
                ctx.lineWidth = 2;
                ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
                
                if (isGhost) {
                    // X pattern for ghost
                    ctx.beginPath();
                    ctx.moveTo(plat.x, plat.y); ctx.lineTo(plat.x + plat.w, plat.y + plat.h);
                    ctx.moveTo(plat.x + plat.w, plat.y); ctx.lineTo(plat.x, plat.y + plat.h);
                    ctx.stroke();
                }
                
                ctx.globalAlpha = 1.0;
            }
        }

        // --- HAZARDS ---
        for (let h of this.hazards) {
            if (h.active) {
                // Warning Flash
                ctx.shadowBlur = 20;
                ctx.shadowColor = "#ff0000";
                ctx.fillStyle = "#ff0000";
                
                if (h.type === 'laser_vertical') {
                    ctx.fillRect(h.x - 5, h.y, 10, h.h);
                    // Core
                    ctx.fillStyle = "#fff";
                    ctx.fillRect(h.x - 2, h.y, 4, h.h);
                } else if (h.type === 'laser_horizontal') {
                    ctx.fillRect(h.x, h.y - 5, h.w, 10);
                    ctx.fillStyle = "#fff";
                    ctx.fillRect(h.x, h.y - 2, h.w, 4);
                }
                ctx.shadowBlur = 0;
            } else {
                // Draw Emitter / Warning when inactive
                ctx.fillStyle = "#330000";
                if (h.type === 'laser_vertical') {
                    ctx.fillRect(h.x - 5, h.y, 10, 10); // Top emitter
                } else if (h.type === 'laser_horizontal') {
                    ctx.fillRect(h.x, h.y - 5, 10, 10); // Left emitter
                }
            }
        }

        // --- CHECKPOINTS ---
        this.checkpoints.forEach(cp => {
            ctx.fillStyle = cp.active ? "#00ff88" : "#333";
            ctx.beginPath();
            ctx.arc(cp.x, cp.y - 10, 10, 0, Math.PI*2);
            ctx.fill();
        });

        // --- EXIT ---
        ctx.fillStyle = "#fff";
        ctx.font = "20px monospace";
        ctx.fillText("EXIT_NODE >>", this.targetX, 550);
        ctx.strokeStyle = "#fff";
        ctx.strokeRect(this.targetX, 400, 100, 200);

        // Player
        if (this.player) this.player.render(ctx);

        ctx.restore();

        // --- UI ---
        this.renderUI(ctx, w, h);
    },

    renderUI: function(ctx, w, h) {
        // Draw Phase Indicator
        const pad = 20;
        const boxW = 150;
        const boxH = 60;
        
        ctx.fillStyle = "rgba(0,0,0,0.8)";
        ctx.fillRect(w - boxW - pad, pad, boxW, boxH);
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.strokeRect(w - boxW - pad, pad, boxW, boxH);
        
        // Progress Bar for Cycle
        const cyclePct = (this.globalTimer % this.cycleDuration) / this.cycleDuration;
        
        ctx.fillStyle = "#333";
        ctx.fillRect(w - boxW - pad + 10, pad + 40, boxW - 20, 10);
        
        ctx.fillStyle = "#fff";
        ctx.fillRect(w - boxW - pad + 10, pad + 40, (boxW - 20) * cyclePct, 10);

        // Text
        ctx.font = "bold 20px monospace";
        ctx.fillStyle = this.phase === 'A' ? "#00ff88" : "#ff0088";
        ctx.textAlign = "center";
        ctx.fillText(`PHASE: ${this.phase}`, w - boxW/2 - pad, pad + 30);
        
        // Level Title
        ctx.textAlign = "left";
        ctx.fillStyle = "#fff";
        ctx.font = "16px monospace";
        ctx.fillText("LEVEL 9: LOGIC CORE", 20, 30);
    }
};