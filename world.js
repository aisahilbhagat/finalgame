window.WorldManager = {
    // --- STATE ---
    engine: null,
    player: null,
    npcs: [], 
    entities: [],
    obstacles: [],
    river: null,
    fireflies: null,
    campfireSystem: null,
    soundSystem: null, 
    bgCanvas: null,
    bgCtx: null,
    showDebug: false,
    lastTime: 0,
    
    // --- INTRO & DIALOGUE STATE ---
    introTimer: 0,
    INTRO_DURATION: 5000, 
    
    dialogueTimer: 0,
    dialogueStep: 0, 

    // --- OBJECTIVE & UI STATE ---
    objectiveTimer: 0,
    showObjective: false,
    showTabHint: false,
    taskMenuOpen: false,
    currentObjectiveText: "Find the place with the campfire.",

    // --- CUTSCENE STATE ---
    cutsceneActive: false,
    cutsceneCompleted: false, 
    cutsceneTimer: 0,
    cutscenePhase: 0, 
    fadeInTimer: 0,

    CONSTANTS: {
        WORLD_WIDTH: 6000,
        WORLD_HEIGHT: 1600,
        PIXEL_SCALE: 6,
        MAIN_LAND_OFFSET: 2900, 
        RIVER_X: 2600,
        RIVER_W: 300,
        BRIDGE_Y: 740,
        BRIDGE_H: 120,
        TREE_TYPES: { OAK: 'oak', PINE: 'pine', BIRCH: 'birch' },
        
        CAMPFIRE_X: 1380,
        CAMPFIRE_Y: 940,
        
        // Conversation Spots
        SPOT_PLAYER: { x: 1380, y: 1000 },
        SPOT_ELDER: { x: 1460, y: 940 },
        SPOT_SCAVENGER: { x: 1300, y: 940 }
    },

    assets: {},

    init: function(engine) {
        console.log("WorldManager Initializing...");
        this.engine = engine;
        this.resetState();

        this.handleKeyDown = (e) => {
            if (e.code === 'F3') { e.preventDefault(); this.showDebug = !this.showDebug; }
            if (e.ctrlKey && e.code === 'KeyA') {
                e.preventDefault();
                if (this.engine) this.engine.handleContentComplete();
                return;
            }
            if (e.code === 'Tab' && this.showTabHint) {
                e.preventDefault();
                this.taskMenuOpen = !this.taskMenuOpen;
            }
            if (this.soundSystem) this.soundSystem.initAudioContext();
        };
        window.addEventListener('keydown', this.handleKeyDown);

        this.generateAssets();
        this.river = new this.RiverSystem(this.CONSTANTS.RIVER_X, this.CONSTANTS.RIVER_W);
        this.fireflies = new this.FireflySystem(this.CONSTANTS.WORLD_WIDTH, this.CONSTANTS.WORLD_HEIGHT);
        this.campfireSystem = new this.CampfireSystem();
        this.soundSystem = new this.SoundSystem();
        this.initLevel();

        this.loadScripts(() => {
            console.log("Scripts Loaded.");
            this.player = new window.Character(1250 + this.CONSTANTS.MAIN_LAND_OFFSET, 800);
            this.player.minX = 50; this.player.minY = 50;
            this.player.worldLimitW = this.CONSTANTS.WORLD_WIDTH - 50;
            this.player.worldLimitH = this.CONSTANTS.WORLD_HEIGHT - 50;
            this.player.lastX = this.player.x; this.player.lastY = this.player.y;

            if (window.NPC) {
                this.npcs.push(new window.NPC(1520, 930, 'elder'));
                this.npcs.push(new window.NPC(1240, 930, 'scavenger'));
            }
        });
        
        this.lastTime = performance.now();
    },

    resetState: function() {
        this.introTimer = 0;
        this.dialogueTimer = 0;
        this.dialogueStep = 0;
        this.objectiveTimer = 0;
        this.showObjective = false;
        this.showTabHint = false;
        this.taskMenuOpen = false;
        this.npcs = [];
        this.cutsceneActive = false;
        this.cutsceneCompleted = false; 
        this.cutsceneTimer = 0;
        this.cutscenePhase = 0;
        this.fadeInTimer = 0;
    },

    cleanup: function() {
        window.removeEventListener('keydown', this.handleKeyDown);
        if (this.soundSystem) this.soundSystem.stopAll();
        this.player = null; 
        this.npcs = [];
    },

    update: function() {
        if (!this.player) return; 

        const now = performance.now();
        const dt = now - this.lastTime;
        this.lastTime = now;

        // --- STANDARD INTRO LOGIC ---
        if (this.introTimer < this.INTRO_DURATION) {
            this.introTimer += dt;
        } else {
            this.dialogueTimer += dt;
            if (this.dialogueTimer < 5000) this.dialogueStep = 1; 
            else if (this.dialogueTimer < 10000) this.dialogueStep = 2; 
            else this.dialogueStep = 3; 

            if (this.dialogueStep >= 3 && !this.cutsceneActive && !this.cutsceneCompleted) {
                this.objectiveTimer += dt;
                if (this.objectiveTimer < 5000) this.showObjective = true;
                else { this.showObjective = false; this.showTabHint = true; }
            }
        }
        
        if (this.cutsceneCompleted && this.fadeInTimer < 2000) {
            this.fadeInTimer += dt;
        }

        const allObstacles = [...this.entities, ...this.obstacles];
        let isMoving = false;

        // --- CUTSCENE TRIGGER ---
        if (!this.cutsceneActive && !this.cutsceneCompleted && this.dialogueStep >= 3) {
            const dx = this.player.x - this.CONSTANTS.CAMPFIRE_X;
            const dy = this.player.y - this.CONSTANTS.CAMPFIRE_Y;
            if (Math.sqrt(dx*dx + dy*dy) < 250) {
                console.log("CUTSCENE START");
                this.cutsceneActive = true;
                this.cutscenePhase = 0;
                this.cutsceneTimer = 0;
                this.showObjective = false;
                this.showTabHint = false;
                this.taskMenuOpen = false;
            }
        }

        // --- END LEVEL TRIGGER (Leaving Bridge) ---
        // Check if player has crossed the river to the right side
        // River ends at X = 2900 (2600 + 300).
        if (this.cutsceneCompleted) {
             if (this.player.x > this.CONSTANTS.RIVER_X + this.CONSTANTS.RIVER_W + 50) {
                 console.log("Level Complete: Crossing Bridge");
                 if (this.engine) this.engine.handleContentComplete();
                 return; // Stop update
             }
        }

        // --- MAIN LOGIC BRANCH ---
        if (this.cutsceneActive) {
            this.updateCutscene(dt);
        } else {
            if (this.introTimer >= this.INTRO_DURATION && (this.dialogueStep >= 3 || this.cutsceneCompleted)) {
                this.player.update(dt, allObstacles);
                if (this.player.isMoving !== undefined) isMoving = this.player.isMoving;
                else {
                    const dx = this.player.x - this.player.lastX;
                    const dy = this.player.y - this.player.lastY;
                    if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) isMoving = true;
                    this.player.lastX = this.player.x; this.player.lastY = this.player.y;
                }
            }
            this.npcs.forEach(npc => npc.update(dt, this.player, this.npcs));
        }

        this.fireflies.update();
        this.campfireSystem.update(dt);
        this.soundSystem.update(this.player, this.campfireSystem.fires, this.CONSTANTS, isMoving);
    },

    updateCutscene: function(dt) {
        this.cutsceneTimer += dt;

        switch(this.cutscenePhase) {
            case 0: // FADE OUT
                if (this.cutsceneTimer > 2000) {
                    this.cutscenePhase = 1;
                    this.cutsceneTimer = 0;
                }
                break;
            case 1: // SETUP
                this.player.x = this.CONSTANTS.SPOT_PLAYER.x;
                this.player.y = this.CONSTANTS.SPOT_PLAYER.y;
                this.player.facingRight = true; 
                
                if(this.npcs[0]) {
                    this.npcs[0].x = this.CONSTANTS.SPOT_ELDER.x;
                    this.npcs[0].y = this.CONSTANTS.SPOT_ELDER.y;
                    this.npcs[0].facingRight = false; 
                }
                if(this.npcs[1]) {
                    this.npcs[1].x = this.CONSTANTS.SPOT_SCAVENGER.x;
                    this.npcs[1].y = this.CONSTANTS.SPOT_SCAVENGER.y;
                    this.npcs[1].facingRight = true; 
                }
                this.cutscenePhase = 2;
                break;
            case 2: // FADE IN
                if (this.cutsceneTimer > 2000) {
                    this.cutscenePhase = 3;
                    this.cutsceneTimer = 0;
                }
                break;
            case 3: // DIALOGUE 1
                if (this.cutsceneTimer > 4000) {
                    this.cutscenePhase = 4;
                    this.cutsceneTimer = 0;
                }
                break;
            case 4: // DIALOGUE 2
                if (this.cutsceneTimer > 4000) {
                    this.cutscenePhase = 5;
                    this.cutsceneTimer = 0;
                }
                break;
            case 5: // DIALOGUE 3
                if (this.cutsceneTimer > 6000) { 
                    this.cutscenePhase = 6;
                    this.cutsceneTimer = 0;
                }
                break;
            case 6: // FADE OUT
                if (this.cutsceneTimer > 2000) {
                    this.cutscenePhase = 7;
                    this.cutsceneTimer = 0;
                }
                break;
            case 7: // CLEANUP & END
                this.npcs = []; 
                this.player.x = this.CONSTANTS.RIVER_X + (this.CONSTANTS.RIVER_W / 2) - (this.player.width / 2);
                this.player.y = this.CONSTANTS.BRIDGE_Y + 20;

                this.currentObjectiveText = "Explore beyond the river."; 
                this.showObjective = true; // Briefly show new goal
                this.objectiveTimer = 0; // Use timer to hide it later
                this.showTabHint = true;   

                this.cutsceneActive = false; 
                this.cutsceneCompleted = true; 
                this.fadeInTimer = 0; 
                
                this.cutscenePhase = 8; 
                break;
        }
    },

    render: function(ctx) {
        if (!this.player) return; 

        const C = this.CONSTANTS;
        const canvas = window.canvas;

        let camX = this.player.x - canvas.width / 2 + this.player.width / 2;
        let camY = this.player.y - canvas.height / 2 + this.player.height / 2;
        camX = Math.max(0, Math.min(camX, C.WORLD_WIDTH - canvas.width));
        camY = Math.max(0, Math.min(camY, C.WORLD_HEIGHT - canvas.height));
        
        if (C.WORLD_WIDTH < canvas.width) camX = -(canvas.width - C.WORLD_WIDTH) / 2;
        if (C.WORLD_HEIGHT < canvas.height) camY = -(canvas.height - C.WORLD_HEIGHT) / 2;

        ctx.save();
        ctx.translate(-camX, -camY);
            
            ctx.drawImage(this.bgCanvas, 0, 0);
            this.river.draw(ctx, performance.now());
            this.drawBridge(ctx);

            const renderList = [...this.entities];
            renderList.push({ type: 'player', ySort: this.player.y + this.player.height });
            
            this.campfireSystem.fires.forEach(fire => {
                renderList.push({ type: 'campfire', fire: fire, ySort: fire.y + 10 });
            });
            
            this.npcs.forEach(npc => {
                renderList.push({ type: 'npc', obj: npc, ySort: npc.y + npc.height });
            });

            renderList.sort((a, b) => a.ySort - b.ySort);
            
            for (let item of renderList) {
                if (item.type === 'player') {
                    this.player.render(ctx);
                    if (!this.cutsceneActive && (this.dialogueStep === 1 || this.dialogueStep === 2)) {
                        this.drawDialogue(ctx, this.player.x + this.player.width/2, this.player.y - 20, (this.dialogueStep === 1 ? "Where am I?" : "I see light across the river... maybe someone can help."));
                    }
                } else if (item.type === 'campfire') {
                    this.campfireSystem.drawSingleFire(ctx, item.fire);
                } else if (item.type === 'npc') {
                    item.obj.render(ctx);
                } else {
                    ctx.drawImage(item.img, item.x, item.y);
                }
            }
            
            if (this.cutsceneActive && this.cutscenePhase >= 3 && this.cutscenePhase <= 5) {
                let text = "";
                let target = null;
                
                if (this.cutscenePhase === 3) {
                    text = "How are you and what are you doing here so late?";
                    target = this.npcs[0]; 
                } else if (this.cutscenePhase === 4) {
                    text = "I am lost, I don't know where to go.";
                    target = this.player;
                } else if (this.cutscenePhase === 5) {
                    text = "We can't have you with us, but here is a sword. Take it if you are in danger.";
                    target = this.npcs[0]; 
                }

                if (target) {
                    this.drawDialogue(ctx, target.x + target.width/2, target.y - 20, text);
                }
            }

            this.campfireSystem.drawDarkness(ctx, camX, camY, canvas);
            if (this.showDebug) this.drawDebug(ctx, [...this.entities, ...this.obstacles]);
            this.fireflies.draw(ctx);

        ctx.restore();

        const grad = ctx.createRadialGradient(canvas.width/2, canvas.height/2, canvas.height/2, canvas.width/2, canvas.height/2, canvas.height);
        grad.addColorStop(0, 'rgba(0, 5, 10, 0.0)');
        grad.addColorStop(1, 'rgba(0, 2, 5, 0.4)');
        ctx.fillStyle = grad;
        ctx.fillRect(0,0,canvas.width, canvas.height);

        if (this.introTimer < this.INTRO_DURATION) {
            let alpha = 1.0 - (this.introTimer / this.INTRO_DURATION);
            if (alpha < 0) alpha = 0;
            ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        if (this.cutsceneActive) {
            if (this.cutscenePhase === 0) { 
                let alpha = this.cutsceneTimer / 2000;
                if (alpha > 1) alpha = 1;
                ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            } else if (this.cutscenePhase === 2) { 
                let alpha = 1.0 - (this.cutsceneTimer / 2000);
                if (alpha < 0) alpha = 0;
                ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            } else if (this.cutscenePhase === 6) { 
                let alpha = this.cutsceneTimer / 2000;
                if (alpha > 1) alpha = 1;
                ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            } else if (this.cutscenePhase === 1) { 
                ctx.fillStyle = "black";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
        }
        
        if (this.cutsceneCompleted && this.fadeInTimer < 2000) {
             let alpha = 1.0 - (this.fadeInTimer / 2000);
             if (alpha < 0) alpha = 0;
             ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
             ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Hide objective text after 5 seconds post-cutscene
        if (this.showObjective && this.cutsceneCompleted) {
             // Reusing objectiveTimer, but ensure it updates in main update loop
             // For simplicity, hiding it after fade-in
             if (this.fadeInTimer >= 2000) this.showObjective = false;
        }

        if (this.showObjective && !this.cutsceneActive) {
            ctx.save(); ctx.textAlign = "center"; ctx.font = "bold 24px 'Courier New', monospace"; ctx.fillStyle = "#FFD700"; 
            ctx.shadowColor = "black"; ctx.shadowBlur = 4;
            ctx.fillText(`OBJECTIVE: ${this.currentObjectiveText}`, canvas.width / 2, 80);
            ctx.restore();
        }

        if (this.showTabHint && !this.taskMenuOpen && !this.cutsceneActive) {
            ctx.save(); ctx.textAlign = "right"; ctx.font = "bold 16px Arial, sans-serif"; ctx.fillStyle = "#00FFFF"; 
            ctx.fillText("Press [TAB] to open Tasks", canvas.width - 20, canvas.height - 30);
            ctx.restore();
        }

        if (this.taskMenuOpen && !this.cutsceneActive) this.drawTaskMenu(ctx, canvas);
    },

    wrapText: function(ctx, text, x, y, maxWidth, lineHeight) {
        const words = text.split(' ');
        let line = '';
        for(let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && n > 0) {
                ctx.fillText(line, x, y);
                line = words[n] + ' ';
                y += lineHeight;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, x, y);
    },

    drawTaskMenu: function(ctx, canvas) {
        ctx.save();
        ctx.fillStyle = "rgba(0, 15, 30, 0.85)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const mw = 400, mh = 300;
        const mx = (canvas.width - mw) / 2;
        const my = (canvas.height - mh) / 2;

        ctx.strokeStyle = "#00FFFF"; ctx.lineWidth = 3; ctx.strokeRect(mx, my, mw, mh);
        ctx.fillStyle = "#00FFFF"; ctx.font = "bold 24px Arial, sans-serif"; ctx.textAlign = "center";
        ctx.fillText("CURRENT TASKS", mx + mw/2, my + 50);

        ctx.beginPath(); ctx.moveTo(mx + 20, my + 70); ctx.lineTo(mx + mw - 20, my + 70); ctx.stroke();

        ctx.fillStyle = "#FFFFFF"; ctx.font = "18px 'Courier New', monospace"; ctx.textAlign = "left";
        this.wrapText(ctx, "• " + this.currentObjectiveText, mx + 40, my + 110, 320, 24);

        ctx.fillStyle = "#AAAAAA"; ctx.font = "italic 14px Arial, sans-serif"; ctx.textAlign = "center";
        ctx.fillText("Press [TAB] to close", mx + mw/2, my + mh - 20);
        ctx.restore();
    },

    drawDialogue: function(ctx, x, y, text) {
        if (!text) return;
        ctx.save();
        ctx.font = "bold 14px 'Courier New', monospace";
        
        const padding = 10;
        const maxWidth = 250; 
        const lineHeight = 18;
        
        const words = text.split(' ');
        let lines = [];
        let currentLine = words[0];

        for (let i = 1; i < words.length; i++) {
            const word = words[i];
            const width = ctx.measureText(currentLine + " " + word).width;
            if (width < maxWidth) {
                currentLine += " " + word;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        lines.push(currentLine);

        const boxWidth = Math.min(ctx.measureText(text).width + padding * 2, maxWidth + padding * 2);
        const boxHeight = lines.length * lineHeight + padding * 2;
        
        const bx = x - boxWidth / 2;
        const by = y - boxHeight - 10; 

        ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.rect(bx, by, boxWidth, boxHeight); ctx.fill(); ctx.stroke();
        
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        
        for (let i = 0; i < lines.length; i++) {
            ctx.fillText(lines[i], x, by + padding + (i * lineHeight));
        }
        
        ctx.beginPath(); 
        ctx.moveTo(x - 5, by + boxHeight); 
        ctx.lineTo(x + 5, by + boxHeight); 
        ctx.lineTo(x, by + boxHeight + 6);
        ctx.fillStyle = "#fff"; ctx.fill();
        
        ctx.restore();
    },

    loadScripts: function(callback) {
        const loadChar = () => {
            if (window.Character) { loadNPC(); return; }
            const s = document.createElement('script');
            s.src = 'worldcharacter.js';
            s.onload = loadNPC;
            document.body.appendChild(s);
        };
        const loadNPC = () => {
            if (window.NPC) { callback(); return; }
            const s = document.createElement('script');
            s.src = 'npc.js';
            s.onload = callback;
            document.body.appendChild(s);
        };
        loadChar();
    },

    createPixelCanvas: function(w, h) {
        const c = document.createElement('canvas');
        c.width = w * this.CONSTANTS.PIXEL_SCALE; 
        c.height = h * this.CONSTANTS.PIXEL_SCALE;
        return { c, ctx: c.getContext('2d'), w, h };
    },

    pRect: function(ctx, x, y, w, h, color) {
        ctx.fillStyle = color;
        ctx.fillRect(x * this.CONSTANTS.PIXEL_SCALE, y * this.CONSTANTS.PIXEL_SCALE, w * this.CONSTANTS.PIXEL_SCALE, h * this.CONSTANTS.PIXEL_SCALE);
    },

    generateAssets: function() {
        const TYPES = this.CONSTANTS.TREE_TYPES;
        this.assets = {
            oak: this.generateTreeAsset(TYPES.OAK),
            pine: this.generateTreeAsset(TYPES.PINE),
            birch: this.generateTreeAsset(TYPES.BIRCH),
            rock: this.generateRockAsset(),
            tent: this.generateTentAsset()
        };
    },

    generateTentAsset: function() {
        const w = 48, h = 32; 
        const { c, ctx } = this.createPixelCanvas(w, h);
        const scale = this.CONSTANTS.PIXEL_SCALE;

        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        ctx.ellipse(w/2 * scale, (h-2) * scale, (w/2) * scale, 4 * scale, 0, 0, Math.PI*2);
        ctx.fill();

        const tentColor = '#803020'; 
        const tentShadow = '#501a10';
        
        this.pRect(ctx, 4, 30, 20, 0, tentShadow); 
        ctx.fillStyle = tentShadow;
        ctx.beginPath();
        ctx.moveTo(4 * scale, 30 * scale);
        ctx.lineTo(24 * scale, 6 * scale);
        ctx.lineTo(24 * scale, 30 * scale);
        ctx.fill();

        ctx.fillStyle = tentColor;
        ctx.beginPath();
        ctx.moveTo(44 * scale, 30 * scale);
        ctx.lineTo(24 * scale, 6 * scale);
        ctx.lineTo(24 * scale, 30 * scale);
        ctx.fill();
        
        ctx.fillStyle = '#111'; 
        ctx.beginPath();
        ctx.moveTo(24 * scale, 30 * scale);
        ctx.lineTo(24 * scale, 12 * scale);
        ctx.lineTo(30 * scale, 30 * scale);
        ctx.lineTo(18 * scale, 30 * scale);
        ctx.fill();

        this.pRect(ctx, 23, 5, 2, 26, '#3e2723');
        this.pRect(ctx, 2, 30, 2, 2, '#aaa');
        this.pRect(ctx, 44, 30, 2, 2, '#aaa');

        return { 
            img: c, 
            width: w * scale, 
            height: h * scale, 
            colW: 32 * scale, 
            colH: 10 * scale, 
            colX: 8 * scale, 
            colY: 20 * scale 
        };
    },

    generateTreeAsset: function(type) {
        const TYPES = this.CONSTANTS.TREE_TYPES;
        let w, h;
        if (type === TYPES.OAK) { w = 32; h = 42; }
        else if (type === TYPES.PINE) { w = 24; h = 48; }
        else if (type === TYPES.BIRCH) { w = 20; h = 38; }

        const { c, ctx } = this.createPixelCanvas(w, h);
        const scale = this.CONSTANTS.PIXEL_SCALE;

        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.ellipse(w/2 * scale, (h-2) * scale, (w/3) * scale, 3 * scale, 0, 0, Math.PI*2);
        ctx.fill();

        let tW, tH, tColor, tShadow;
        if (type === TYPES.OAK) { tW = 6; tH = 10; tColor = '#3e2b20'; tShadow = '#261810'; }
        else if (type === TYPES.PINE) { tW = 4; tH = 8; tColor = '#2e2219'; tShadow = '#1a120d'; }
        else { tW = 4; tH = 12; tColor = '#8a8376'; tShadow = '#5e5950'; }

        const tX = Math.floor((w - tW) / 2);
        const tY = h - tH - 3; 
        this.pRect(ctx, tX, tY, tW, tH, tColor);
        this.pRect(ctx, tX + tW - 1, tY, 1, tH, tShadow); 
        
        if (type === TYPES.BIRCH) {
            this.pRect(ctx, tX + 1, tY + 2, 2, 1, '#222'); 
            this.pRect(ctx, tX, tY + 6, 2, 1, '#222'); 
            this.pRect(ctx, tX + 2, tY + 9, 1, 1, '#222');
        }

        if (type === TYPES.OAK) {
            const clusters = [ {x: tX - 10, y: tY - 14, w: 26, h: 16, c: '#1e4735'}, {x: tX - 6, y: tY - 22, w: 18, h: 12, c: '#1e4735'}, {x: tX - 12, y: tY - 8, w: 10, h: 10, c: '#122e22'}, {x: tX + 8, y: tY - 6, w: 10, h: 10, c: '#122e22'}, {x: tX - 4, y: tY - 24, w: 14, h: 6, c: '#2a5e48'}, {x: tX - 2, y: tY - 16, w: 6, h: 6, c: '#2a5e48'} ];
            clusters.forEach(cl => this.pRect(ctx, cl.x, cl.y, cl.w, cl.h, cl.c));
        } else if (type === TYPES.PINE) {
            this.pRect(ctx, tX - 8, tY - 8, tW + 16, 10, '#122e22'); this.pRect(ctx, tX - 6, tY - 14, tW + 12, 8, '#122e22'); this.pRect(ctx, tX - 4, tY - 20, tW + 8, 8, '#122e22'); this.pRect(ctx, tX - 2, tY - 26, tW + 4, 8, '#122e22'); this.pRect(ctx, tX, tY - 30, tW, 6, '#1e4735'); 
        } else if (type === TYPES.BIRCH) {
            this.pRect(ctx, tX - 6, tY - 18, 16, 20, '#4f705e'); this.pRect(ctx, tX - 4, tY - 24, 12, 8, '#4f705e'); this.pRect(ctx, tX + 2, tY - 10, 4, 4, '#2e664c'); this.pRect(ctx, tX - 2, tY - 20, 4, 4, '#7aa885'); 
        }

        return { 
            img: c, width: w * scale, height: h * scale, 
            trunkW: tW * scale, trunkH: 8 * scale, trunkOffX: tX * scale, trunkOffY: (tY + tH - 8) * scale 
        };
    },

    generateRockAsset: function() {
        const w = 16, h = 12;
        const { c, ctx } = this.createPixelCanvas(w, h);
        const scale = this.CONSTANTS.PIXEL_SCALE;
        
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath(); ctx.ellipse((w/2) * scale, (h-1) * scale, 6 * scale, 2 * scale, 0, 0, Math.PI*2); ctx.fill();
        this.pRect(ctx, 2, 4, 12, 6, '#4a5556'); this.pRect(ctx, 3, 3, 8, 2, '#4a5556'); this.pRect(ctx, 3, 8, 10, 2, '#2c3e50'); this.pRect(ctx, 4, 4, 4, 2, '#5d6d7e'); 
        return { img: c, width: w * scale, height: h * scale, colW: 10 * scale, colH: 4 * scale, colX: 3 * scale, colY: 6 * scale };
    },

    spawn: function(type, x, y) {
        if (type === 'pond') {
            const r = 70; 
            const cx = x; const cy = y;
            this.bgCtx.fillStyle = '#154360'; this.bgCtx.beginPath(); this.bgCtx.ellipse(cx, cy, r, r * 0.7, 0, 0, Math.PI*2); this.bgCtx.fill();
            this.bgCtx.fillStyle = '#21618c'; this.bgCtx.beginPath(); this.bgCtx.ellipse(cx, cy, r * 0.8, r * 0.7 * 0.8, 0, 0, Math.PI*2); this.bgCtx.fill();
            this.bgCtx.strokeStyle = '#2e86c1'; this.bgCtx.lineWidth = 4; this.bgCtx.stroke();
            this.obstacles.push({ collision: { x: cx - r + 10, y: cy - (r*0.7) + 10, w: (r*2)-20, h: (r*1.4)-20 } });
        } else {
            const asset = this.assets[type];
            if (!asset) return;
            const ent = {
                type: type, 
                img: asset.img, x: x, y: y,
                width: asset.width, height: asset.height,
                ySort: y + asset.height - 10,
            };
            
            if (type === 'rock' || type === 'tent') {
                ent.ySort = y + asset.height - 5;
                ent.collision = { x: x + asset.colX, y: y + asset.colY, w: asset.colW, h: asset.colH };
            } else {
                ent.collision = { x: x + asset.trunkOffX, y: y + asset.trunkOffY, w: asset.trunkW, h: asset.trunkH };
            }
            this.entities.push(ent);
        }
    },

    initLevel: function() {
        const C = this.CONSTANTS;
        this.bgCanvas = document.createElement('canvas');
        this.bgCanvas.width = C.WORLD_WIDTH; 
        this.bgCanvas.height = C.WORLD_HEIGHT;
        this.bgCtx = this.bgCanvas.getContext('2d');
        const ctx = this.bgCtx;

        ctx.fillStyle = '#0e1f16'; ctx.fillRect(0, 0, C.WORLD_WIDTH, C.WORLD_HEIGHT);
        
        const createTuft = (color) => {
            const tc = document.createElement('canvas'); tc.width = 18; tc.height = 12;
            const tcx = tc.getContext('2d');
            tcx.fillStyle = color; tcx.fillRect(0, 6, 3, 6); tcx.fillRect(4, 2, 3, 10); tcx.fillRect(8, 5, 3, 7);
            return tc;
        };
        const tuft1 = createTuft('#22402f'); 
        const tuft2 = createTuft('#112119');

        for(let y=50; y<C.WORLD_HEIGHT-50; y+=80) {
            for(let x=50; x<C.WORLD_WIDTH-50; x+=80) {
                if (x > C.RIVER_X - 20 && x < C.RIVER_X + C.RIVER_W + 20) continue; 
                const ox = (y%160 === 0) ? 40 : 0;
                const jitterX = Math.sin(y*0.1 + x) * 20; const jitterY = Math.cos(x*0.1) * 20;
                const drawX = x + ox + jitterX; const drawY = y + jitterY;
                const t = (x+y)%3 === 0 ? tuft2 : tuft1;
                ctx.drawImage(t, drawX, drawY);
            }
        }

        // --- SPAWN LOGIC ---
        const spawnLevelSet = (OFFSET_X) => {
            this.spawn('pine', 200+OFFSET_X, 200); this.spawn('pine', 260+OFFSET_X, 240); this.spawn('pine', 180+OFFSET_X, 280); this.spawn('pine', 320+OFFSET_X, 210); this.spawn('rock', 300+OFFSET_X, 300); this.spawn('rock', 350+OFFSET_X, 320);
            this.spawn('pine', 500+OFFSET_X, 150); this.spawn('pine', 550+OFFSET_X, 220); this.spawn('oak', 600+OFFSET_X, 180);
            
            this.spawn('oak', 1000+OFFSET_X, 150); this.spawn('rock', 1150+OFFSET_X, 200); this.spawn('oak', 1100+OFFSET_X, 250); this.spawn('pine', 950+OFFSET_X, 300); this.spawn('rock', 1050+OFFSET_X, 350);
            this.spawn('birch', 1400+OFFSET_X, 150); this.spawn('birch', 1500+OFFSET_X, 120); this.spawn('rock', 1450+OFFSET_X, 200);

            this.spawn('pond', 2100+OFFSET_X, 300); this.spawn('birch', 1900+OFFSET_X, 250); this.spawn('birch', 2000+OFFSET_X, 180); this.spawn('birch', 2250+OFFSET_X, 200); this.spawn('birch', 2300+OFFSET_X, 350); this.spawn('birch', 1950+OFFSET_X, 400); this.spawn('rock', 2200+OFFSET_X, 450);
            this.spawn('oak', 2400+OFFSET_X, 200);
            
            this.spawn('oak', 100+OFFSET_X, 700); this.spawn('oak', 150+OFFSET_X, 750); this.spawn('pine', 200+OFFSET_X, 700); this.spawn('pine', 120+OFFSET_X, 850); this.spawn('oak', 220+OFFSET_X, 800); this.spawn('rock', 280+OFFSET_X, 780); this.spawn('oak', 800+OFFSET_X, 600);
            this.spawn('pine', 400+OFFSET_X, 600); this.spawn('oak', 500+OFFSET_X, 650); this.spawn('rock', 450+OFFSET_X, 700);

            // Mid Center Cluster
            this.spawn('rock', 1100+OFFSET_X, 950); 
            this.spawn('birch', 1550+OFFSET_X, 750); 
            this.spawn('birch', 950+OFFSET_X, 850); 
            this.spawn('birch', 1600+OFFSET_X, 600); 
            this.spawn('rock', 1500+OFFSET_X, 650);
            this.spawn('birch', 1300+OFFSET_X, 550); 
            this.spawn('oak', 1700+OFFSET_X, 850); 
            this.spawn('pine', 1800+OFFSET_X, 700);

            this.spawn('rock', 2000+OFFSET_X, 800); this.spawn('rock', 2050+OFFSET_X, 820); this.spawn('rock', 2100+OFFSET_X, 780); this.spawn('rock', 2200+OFFSET_X, 900); this.spawn('pine', 2300+OFFSET_X, 850);

            this.spawn('pond', 400+OFFSET_X, 1300); this.spawn('birch', 250+OFFSET_X, 1250); this.spawn('birch', 350+OFFSET_X, 1400); this.spawn('birch', 550+OFFSET_X, 1350); this.spawn('rock', 480+OFFSET_X, 1200); this.spawn('pine', 800+OFFSET_X, 1100); this.spawn('rock', 750+OFFSET_X, 1150);
            this.spawn('birch', 150+OFFSET_X, 1450);

            this.spawn('oak', 1100+OFFSET_X, 1250); this.spawn('oak', 1200+OFFSET_X, 1300); this.spawn('oak', 1300+OFFSET_X, 1280); this.spawn('rock', 1250+OFFSET_X, 1250); this.spawn('pine', 1000+OFFSET_X, 1350);

            this.spawn('oak', 1800+OFFSET_X, 1200); this.spawn('oak', 1900+OFFSET_X, 1250); this.spawn('oak', 2000+OFFSET_X, 1200); this.spawn('oak', 1850+OFFSET_X, 1350); this.spawn('oak', 1950+OFFSET_X, 1380); this.spawn('pine', 2100+OFFSET_X, 1300); this.spawn('pine', 2200+OFFSET_X, 1350); this.spawn('rock', 1900+OFFSET_X, 1450);
            this.spawn('pine', 2400+OFFSET_X, 1200); this.spawn('rock', 2450+OFFSET_X, 1400);
        };

        // 1. Spawn Right Side
        spawnLevelSet(C.MAIN_LAND_OFFSET);

        // 2. Spawn Left Side
        spawnLevelSet(0);

        // --- CUSTOM CAMPSITE ---
        this.spawn('tent', 1250, 750); 
        this.campfireSystem.addFire(1380, 940); 
        this.obstacles.push({ collision: { x: 1380 - 15, y: 940 + 4, w: 30, h: 12 } });

        ctx.strokeStyle = '#05100a'; ctx.lineWidth = 40; ctx.strokeRect(0, 0, C.WORLD_WIDTH, C.WORLD_HEIGHT);
        
        this.obstacles.push({ collision: { x: C.RIVER_X, y: 0, w: C.RIVER_W, h: C.BRIDGE_Y } });
        this.obstacles.push({ collision: { x: C.RIVER_X, y: C.BRIDGE_Y + C.BRIDGE_H, w: C.RIVER_W, h: C.WORLD_HEIGHT - (C.BRIDGE_Y + C.BRIDGE_H) } });
    },

    drawBridge: function(ctx) {
        const C = this.CONSTANTS;
        const bx = C.RIVER_X; const by = C.BRIDGE_Y; const bw = C.RIVER_W; const bh = C.BRIDGE_H;
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(bx + 10, by + 10, bw, bh);
        ctx.fillStyle = '#2e1c18';
        ctx.fillRect(bx + 50, by + 10, 20, bh - 20); ctx.fillRect(bx + 140, by + 10, 20, bh - 20); ctx.fillRect(bx + 230, by + 10, 20, bh - 20);
        ctx.fillStyle = '#422d25';
        ctx.fillRect(bx - 10, by + 10, bw + 20, bh - 20);
        for(let i=0; i<30; i++) {
            const px = bx + i * 10;
            if (i === 5 || i === 18 || i === 24) continue; 
            ctx.fillStyle = (i % 3 === 0) ? '#4e342e' : '#5d4037'; 
            ctx.fillRect(px, by + 10, 8, bh - 20);
            ctx.fillStyle = '#2e1c18'; ctx.fillRect(px + 1, by + 15, 2, 2); ctx.fillRect(px + 1, by + bh - 18, 2, 2);
        }
        ctx.fillStyle = '#33521d'; ctx.fillRect(bx + 20, by + 15, 10, 10); ctx.fillRect(bx + 250, by + bh - 25, 15, 8);
        ctx.fillStyle = '#37231e'; ctx.fillRect(bx - 10, by, bw + 20, 10); ctx.fillRect(bx - 10, by + bh - 10, bw + 20, 10);
    },

    drawDebug: function(ctx, obsList) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
        ctx.lineWidth = 2;
        ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
        
        for (let obs of obsList) {
            if (obs.collision) {
                const c = obs.collision;
                ctx.fillRect(c.x, c.y, c.w, c.h);
                ctx.strokeRect(c.x, c.y, c.w, c.h);
            }
        }
        
        if (this.player && this.player.hitbox) {
            ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
            ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
            const hb = this.player.hitbox;
            ctx.fillRect(this.player.x + hb.offsetX, this.player.y + hb.offsetY, hb.width, hb.height);
            ctx.strokeRect(this.player.x + hb.offsetX, this.player.y + hb.offsetY, hb.width, hb.height);
        }
        
        ctx.restore();
    },

    // --- SYSTEMS CLASSES ---
    SoundSystem: class {
        constructor() {
            this.audioEnabled = false;
            this.sounds = {
                night: new Audio('bg_night.ogg'),
                river: new Audio('sfx_river.ogg'),
                fire: new Audio('sfx_fire.ogg'),
                stepGrass: new Audio('walking_grass_sfx.ogg'),
                stepWood: new Audio('walking_wood_sfx.ogg')
            };

            this.sounds.night.loop = true;
            this.sounds.river.loop = true;
            this.sounds.fire.loop = true;
            this.sounds.stepGrass.loop = false;
            this.sounds.stepWood.loop = false;

            this.sounds.night.volume = 0;
            this.sounds.river.volume = 0;
            this.sounds.fire.volume = 0;
            
            this.stepTimer = 0;
            this.stepInterval = 350; 

            this.config = { nightBaseVol: 0.5, riverMaxDist: 800, fireMaxDist: 500 };
        }

        initAudioContext() {
            if (this.audioEnabled) return;
            this.audioEnabled = true;
            const playPromise = (sound) => { sound.play().catch(e => console.log("Audio waiting for interaction...")); };
            playPromise(this.sounds.night);
            playPromise(this.sounds.river);
            playPromise(this.sounds.fire);
            console.log("Audio System Started.");
        }

        stopAll() {
            for (let k in this.sounds) {
                this.sounds[k].pause();
                this.sounds[k].currentTime = 0;
            }
        }

        update(player, fires, CONSTANTS, isMoving) {
            if (!this.audioEnabled) return;

            const riverCenter = CONSTANTS.RIVER_X + CONSTANTS.RIVER_W / 2;
            const distToRiver = Math.abs(player.x - riverCenter);

            let minFireDist = 999999;
            if (fires && fires.length > 0) {
                for (let f of fires) {
                    const dx = player.x - f.x;
                    const dy = player.y - f.y;
                    const d = Math.sqrt(dx*dx + dy*dy);
                    if (d < minFireDist) minFireDist = d;
                }
            }

            let riverVol = 1.0 - (distToRiver / this.config.riverMaxDist);
            riverVol = Math.max(0, Math.min(1, riverVol));

            let fireVol = 1.0 - (minFireDist / this.config.fireMaxDist);
            fireVol = Math.max(0, Math.min(1, fireVol));

            const noiseFactor = Math.max(riverVol, fireVol); 
            let nightVol = this.config.nightBaseVol * (1.0 - (noiseFactor * 0.6)); 
            nightVol = Math.max(0, Math.min(1, nightVol));

            this.sounds.river.volume = riverVol;
            this.sounds.fire.volume = fireVol;
            this.sounds.night.volume = nightVol;
            
            if (isMoving) {
                const onBridge = (
                    player.x > CONSTANTS.RIVER_X && 
                    player.x < CONSTANTS.RIVER_X + CONSTANTS.RIVER_W &&
                    player.y > CONSTANTS.BRIDGE_Y && 
                    player.y < CONSTANTS.BRIDGE_Y + CONSTANTS.BRIDGE_H
                );

                const now = performance.now();
                if (now - this.stepTimer > this.stepInterval) {
                    this.stepTimer = now;
                    if (onBridge) this.playSound('stepWood', 0.6); 
                    else this.playSound('stepGrass', 0.4); 
                }
            }
        }
        
        playSound(name, vol) {
            const s = this.sounds[name];
            if (s) {
                if (!s.paused) s.currentTime = 0; 
                else { s.volume = vol || 0.5; s.play().catch(e => {}); }
            }
        }
    },
    
    RiverSystem: class {
        constructor(x, width) {
            this.x = x;
            this.width = width;
            this.flowState = { offset: 0 };
            this.waveState = { phase: 0 };
            this.sparkleState = { intensity: 0.3 };
            this.colorPulse = { value: 0 };

            if (window.anime) {
                anime({ targets: this.waveState, phase: [0, Math.PI * 2], duration: 2500, easing: 'linear', loop: true });
                anime({ targets: this.sparkleState, intensity: [0.2, 0.9], duration: 1800, direction: 'alternate', easing: 'easeInOutSine', loop: true });
                anime({ targets: this.colorPulse, value: [0, 1], duration: 3000, direction: 'alternate', easing: 'easeInOutQuad', loop: true });
            }

            this.currentLines = [];
            for (let i = 0; i < 25; i++) {
                this.currentLines.push({ xOffset: Math.random() * this.width, speed: 0.8 + Math.random() * 0.6, amplitude: 5 + Math.random() * 10, frequency: 0.015 + Math.random() * 0.02, alpha: 0.15 + Math.random() * 0.25 });
            }
            this.ripples = [];
            for (let i = 0; i < 30; i++) {
                this.ripples.push({ x: this.x + 20 + Math.random() * (this.width - 40), y: Math.random() * 1600, baseSize: 3 + Math.random() * 6, speed: 30 + Math.random() * 50, phaseOffset: Math.random() * Math.PI * 2 });
            }
            this.sparkles = [];
            for (let i = 0; i < 40; i++) {
                this.sparkles.push({ x: this.x + 10 + Math.random() * (this.width - 20), y: Math.random() * 1600, size: 2 + Math.random() * 3, flickerSpeed: 0.005 + Math.random() * 0.01, phaseOffset: Math.random() * Math.PI * 2, driftSpeed: 20 + Math.random() * 40 });
            }
            this.foam = [];
            const pillarPositions = [50, 140, 230];
            for (let px of pillarPositions) {
                for (let i = 0; i < 12; i++) {
                    this.foam.push({ baseX: this.x + px + (Math.random() - 0.5) * 40, baseY: 740 - 20 + Math.random() * (120 + 60), size: 2 + Math.random() * 5, phaseX: Math.random() * Math.PI * 2, phaseY: Math.random() * Math.PI * 2, bobSpeedX: 0.002 + Math.random() * 0.003, bobSpeedY: 0.003 + Math.random() * 0.004 });
                }
            }
            this.edgeFoam = [];
            for (let y = 0; y < 1600; y += 40) {
                this.edgeFoam.push({ x: this.x + 5 + Math.random() * 15, y: y + Math.random() * 30, size: 2 + Math.random() * 4, phase: Math.random() * Math.PI * 2 });
                this.edgeFoam.push({ x: this.x + this.width - 20 + Math.random() * 15, y: y + Math.random() * 30, size: 2 + Math.random() * 4, phase: Math.random() * Math.PI * 2 });
            }
        }

        draw(ctx, time) {
            ctx.save();
            const pulseVal = this.colorPulse.value;
            const baseColor1 = this.lerpColor('#1a3c5e', '#16334f', pulseVal);
            const baseColor2 = this.lerpColor('#122a42', '#0e2235', pulseVal);
            const baseColor3 = this.lerpColor('#0b1a29', '#08131e', pulseVal);

            const grad = ctx.createLinearGradient(this.x, 0, this.x + this.width, 0);
            grad.addColorStop(0, baseColor1);
            grad.addColorStop(0.2, baseColor2);
            grad.addColorStop(0.5, baseColor3);
            grad.addColorStop(0.8, baseColor2);
            grad.addColorStop(1, baseColor1);
            ctx.fillStyle = grad;
            ctx.fillRect(this.x, 0, this.width, 1600);

            const flowOffset = time * 0.05; 
            const wavePhase = this.waveState.phase;
            for (let line of this.currentLines) {
                const yShift = (flowOffset * line.speed) % 80;
                ctx.strokeStyle = `rgba(150, 180, 220, ${line.alpha * 0.6})`;
                ctx.lineWidth = 1.5; ctx.lineCap = 'round';
                for (let baseY = -80 + yShift; baseY < 1600 + 80; baseY += 80) {
                    ctx.beginPath();
                    for (let localY = 0; localY < 60; localY += 4) {
                        const y = baseY + localY;
                        const waveX = Math.sin(y * line.frequency + wavePhase) * line.amplitude;
                        const x = this.x + line.xOffset + waveX;
                        const clampedX = Math.max(this.x + 5, Math.min(x, this.x + this.width - 5));
                        if (localY === 0) ctx.moveTo(clampedX, y); else ctx.lineTo(clampedX, y);
                    }
                    ctx.stroke();
                }
            }
            
            for (let ripple of this.ripples) {
                const yPos = (ripple.y + flowOffset * 0.3) % 1600;
                const pulse = Math.sin(time * 0.003 + ripple.phaseOffset) * 0.5 + 0.5;
                const size = ripple.baseSize * (0.8 + pulse * 0.4);
                ctx.strokeStyle = `rgba(100, 150, 200, ${0.1 + pulse * 0.2})`;
                ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(ripple.x, yPos, size, size * 0.4, 0, 0, Math.PI * 2); ctx.stroke();
            }

            const sparkleIntensity = this.sparkleState.intensity;
            for (let sparkle of this.sparkles) {
                const yPos = (sparkle.y + flowOffset * 0.5) % 1600;
                const flicker = Math.sin(time * sparkle.flickerSpeed + sparkle.phaseOffset);
                const alpha = sparkleIntensity * (flicker * 0.5 + 0.5);
                if (alpha > 0.25) {
                    ctx.fillStyle = `rgba(200, 220, 255, ${alpha * 0.8})`; 
                    const s = sparkle.size;
                    ctx.beginPath(); ctx.moveTo(sparkle.x, yPos - s); ctx.lineTo(sparkle.x + s * 0.5, yPos); ctx.lineTo(sparkle.x, yPos + s); ctx.lineTo(sparkle.x - s * 0.5, yPos); ctx.closePath(); ctx.fill();
                    if (alpha > 0.6) { ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.5})`; ctx.fillRect(sparkle.x - 1, yPos - 1, 2, 2); }
                }
            }

            for (let foam of this.foam) {
                const bobX = Math.sin(time * foam.bobSpeedX + foam.phaseX) * 4;
                const bobY = Math.sin(time * foam.bobSpeedY + foam.phaseY) * 3;
                const x = foam.baseX + bobX;
                const y = foam.baseY + bobY;
                const sizePulse = 1 + Math.sin(time * 0.004 + foam.phaseX) * 0.2;
                const size = foam.size * sizePulse;
                const foamGrad = ctx.createRadialGradient(x, y, 0, x, y, size);
                foamGrad.addColorStop(0, 'rgba(180, 200, 220, 0.5)');
                foamGrad.addColorStop(0.5, 'rgba(100, 120, 150, 0.3)');
                foamGrad.addColorStop(1, 'rgba(50, 60, 80, 0.0)');
                ctx.fillStyle = foamGrad; ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill();
            }

            ctx.fillStyle = 'rgba(100, 120, 150, 0.3)';
            for (let foam of this.edgeFoam) {
                const yPos = (foam.y + flowOffset * 0.8) % 1600;
                const wobble = Math.sin(time * 0.004 + foam.phase) * 3;
                ctx.beginPath(); ctx.arc(foam.x + wobble, yPos, foam.size, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
        }

        lerpColor(color1, color2, t) {
            const c1 = this.hexToRgb(color1);
            const c2 = this.hexToRgb(color2);
            const r = Math.round(c1.r + (c2.r - c1.r) * t);
            const g = Math.round(c1.g + (c2.g - c1.g) * t);
            const b = Math.round(c1.b + (c2.b - c1.b) * t);
            return `rgb(${r},${g},${b})`;
        }
        hexToRgb(hex) {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : { r: 0, g: 0, b: 0 };
        }
    },

    CampfireSystem: class {
        constructor() {
            this.fires = []; 
            this.LIGHT_SIZE = 32; 
            
            this.shadowCanvas = document.createElement('canvas');
            this.shadowCanvas.width = Math.ceil(6000 / 32); 
            this.shadowCanvas.height = Math.ceil(1600 / 32);
            this.shadowCtx = this.shadowCanvas.getContext('2d');
            
            this.lightMap = new Map(); 
        }
        
        addFire(x, y) {
            this.fires.push({ x, y, particles: [], timer: 0 });
        }
        
        update(dt) {
            for (let fire of this.fires) {
                fire.timer += dt;
                if (fire.timer > 50) { 
                    fire.timer = 0;
                    fire.particles.push({
                        x: 0, y: 0, 
                        vx: (Math.random() - 0.5) * 0.5, vy: -0.5 - Math.random() * 0.5,
                        life: 1.0, size: 6 + Math.random() * 4, colorType: Math.random()
                    });
                }
                
                for (let i = fire.particles.length - 1; i >= 0; i--) {
                    let p = fire.particles[i];
                    p.x += p.vx; p.y += p.vy; p.life -= dt * 0.0015; p.size *= 0.98;
                    if (p.life <= 0) fire.particles.splice(i, 1);
                }
            }
            this.updateLighting();
        }

        updateLighting() {
            this.lightMap.clear();
            for (let fire of this.fires) {
                const maxLight = 24; 
                const tx = Math.floor(fire.x / this.LIGHT_SIZE);
                const ty = Math.floor(fire.y / this.LIGHT_SIZE);
                const queue = [{ x: tx, y: ty, l: maxLight }];

                while (queue.length) {
                    const { x, y, l } = queue.shift();
                    if (l <= 0) continue;
                    const key = `${x},${y}`;
                    if ((this.lightMap.get(key) ?? -1) >= l) continue;
                    this.lightMap.set(key, l);
                    queue.push(
                        { x: x + 1, y: y, l: l - 1 }, { x: x - 1, y: y, l: l - 1 },
                        { x: x, y: y + 1, l: l - 1 }, { x: x, y: y - 1, l: l - 1 }
                    );
                }
            }

            const ctx = this.shadowCtx;
            const w = this.shadowCanvas.width;
            const h = this.shadowCanvas.height;

            ctx.clearRect(0, 0, w, h);
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = 'rgba(8, 12, 25, 0.70)'; 
            ctx.fillRect(0, 0, w, h);
            ctx.globalCompositeOperation = 'destination-out';
            
            for (let [key, level] of this.lightMap) {
                const [sx, sy] = key.split(',').map(Number);
                const alpha = Math.pow(level / 24, 1.1); 
                ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
                ctx.fillRect(sx, sy, 1, 1);
            }
        }
        
        drawDarkness(ctx, camX, camY, canvas) {
            ctx.save();
            ctx.imageSmoothingEnabled = true; 
            ctx.drawImage(this.shadowCanvas, 0, 0, this.shadowCanvas.width, this.shadowCanvas.height, 0, 0, 6000, 1600);
            ctx.restore();
        }
        
        drawSingleFire(ctx, fire) {
            ctx.save();
            ctx.fillStyle = '#3e2723';
            ctx.fillRect(fire.x - 12, fire.y + 4, 24, 6); 
            ctx.fillRect(fire.x - 8, fire.y + 8, 4, 4); 
            
            for (let p of fire.particles) {
                let r, g, b;
                if (p.life > 0.7) { r=255; g=255; b=0; } 
                else if (p.life > 0.3) { r=255; g=140; b=0; } 
                else { r=200; g=50; b=0; }
                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${p.life})`;
                ctx.fillRect(fire.x + p.x - p.size/2, fire.y + p.y - p.size, p.size, p.size);
            }
            
            ctx.fillStyle = '#4e342e';
            ctx.beginPath(); ctx.moveTo(fire.x - 14, fire.y + 8); ctx.lineTo(fire.x - 2, fire.y + 12); ctx.lineTo(fire.x - 4, fire.y + 16); ctx.lineTo(fire.x - 16, fire.y + 12); ctx.fill();
            ctx.beginPath(); ctx.moveTo(fire.x + 14, fire.y + 8); ctx.lineTo(fire.x + 2, fire.y + 12); ctx.lineTo(fire.x + 4, fire.y + 16); ctx.lineTo(fire.x + 16, fire.y + 12); ctx.fill();
            ctx.restore();
        }
    },

    FireflySystem: class {
        constructor(worldWidth, worldHeight) {
            this.flies = [];
            this.worldWidth = worldWidth || 6000;
            this.worldHeight = worldHeight || 1600;
            for(let i=0; i<60; i++) {
                this.flies.push({ x: Math.random() * this.worldWidth, y: Math.random() * this.worldHeight, t: Math.random() * 100, speedX: (Math.random()-0.5)*0.5, speedY: (Math.random()-0.5)*0.5 });
            }
        }
        update() {
            for(let f of this.flies) {
                f.x += f.speedX; f.y += f.speedY; f.t += 0.05;
                if(f.x < 0) f.x = 0; if(f.x > this.worldWidth) f.x = this.worldWidth;
                if(f.y < 0) f.y = 0; if(f.y > this.worldHeight) f.y = this.worldHeight;
            }
        }
        draw(ctx) {
            for(let f of this.flies) {
                const alpha = (Math.sin(f.t) + 1) / 2 * 0.8;
                ctx.fillStyle = `rgba(255, 255, 100, ${alpha})`; 
                ctx.fillRect(f.x, f.y, 4, 4);
                ctx.fillStyle = `rgba(255, 200, 50, ${alpha * 0.3})`; 
                ctx.beginPath(); ctx.arc(f.x + 2, f.y + 2, 8, 0, Math.PI*2); ctx.fill();
            }
        }
    }
};