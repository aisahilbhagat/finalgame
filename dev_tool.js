window.DevSelectScreen = {
    // --- STATE ---
    adventureName: "Dev_Run_" + Math.floor(Math.random() * 999),
    selectedStepIndex: 0,
    availableSteps: [],
    
    // --- UI ELEMENTS ---
    // Using a "Terminal" aesthetic for the dev tool
    backBtn: { 
        x: 40, y: 40, w: 100, h: 40, label: "EXIT",
        scale: 1, targetScale: 1, isHovered: false, isPressed: false
    },
    
    startBtn: {
        w: 300, h: 60, label: "INJECT SAVE STATE",
        scale: 1, targetScale: 1, isHovered: false, isPressed: false
    },

    prevBtn: { w: 50, h: 50, label: "<" },
    nextBtn: { w: 50, h: 50, label: ">" },

    inputBox: { w: 400, h: 40 },

    // --- AUDIO ---
    // We'll reuse the existing click sound if available, or stay silent
    clickSound: new Audio('mouse-click.wav'),

    init: function() {
        console.log("%c DEV TOOL ACCESSED ", "background: #00ff00; color: black; font-weight: bold;");
        
        // 1. Hijack the sequence from the engine to populate our list
        if (window.GameEngine && window.GameEngine.gameSequence) {
            this.availableSteps = window.GameEngine.gameSequence.map((step, index) => {
                return {
                    index: index,
                    id: step.id,
                    type: step.type.toUpperCase(),
                    file: step.file
                };
            });
        } else {
            this.availableSteps = [{ index: 0, id: "ERROR: Engine Not Found", type: "ERR", file: "" }];
        }

        this.selectedStepIndex = 0;
        this.adventureName = "Dev_Run_" + Math.floor(Math.random() * 999);
        this.resetButton(this.backBtn);
        this.resetButton(this.startBtn);
    },

    resetButton: function(btn) {
        btn.scale = 1; btn.targetScale = 1;
        btn.isHovered = false; btn.isPressed = false;
    },

    // --- CORE LOGIC ---
    injectSave: function() {
        const name = this.adventureName.trim() || "Unknown_Dev";
        const step = this.availableSteps[this.selectedStepIndex];

        console.log(`Injecting Save at Step ${step.index}: ${step.id}`);

        // 1. Construct the God Mode State
        const godState = {
            id: Date.now(), // Unique ID
            adventureName: name,
            date: new Date().toLocaleString() + " [DEV]",
            
            // --- THE MAGIC: Force the engine to this step ---
            stepIndex: step.index, 

            // --- DEV FLAGS ---
            // If we are skipping ahead, we assume previous stuff is "done"
            // This prevents logic errors in the engine
            cutscenePlayed: true,
            lobbyPlayed: true,
            level1Played: true,
            levelIndex: step.index, // Heuristic: Sync level index to step index for UI
            
            // --- BEEFED UP STATS (Optional, remove if you want standard stats) ---
            xp: 1000, // Give some starter XP since we skipped levels
            inventory: ['Dev_Key'], 
            position: { x: 100, y: 0, map: 'dev_override' }, 
            stats: { hp: 100, maxHp: 100, mana: 100 }
        };

        this.saveToDB(godState);
    },

    saveToDB: function(gameState) {
        if (!window.indexedDB) return;

        const request = window.indexedDB.open("AdventureGameDB", 1);
        
        request.onsuccess = (e) => {
            const db = e.target.result;
            const transaction = db.transaction(['saves'], 'readwrite');
            const store = transaction.objectStore('saves');
            
            const addRequest = store.add(gameState);

            addRequest.onsuccess = () => {
                console.log("Dev State Injected.");
                this.startBtn.label = "INJECTION COMPLETE";
                
                setTimeout(() => {
                    if (window.GameEngine) {
                        window.GameEngine.start(gameState);
                    }
                }, 500);
            };
        };
    },

    // --- INPUT HANDLING ---
    handleKeyDown: function(e) {
        if (e.key === "ArrowRight") this.cycleStep(1);
        if (e.key === "ArrowLeft") this.cycleStep(-1);
        if (e.key === "Enter") this.injectSave();
        
        // Typing logic for name
        if (e.key === "Backspace") {
            this.adventureName = this.adventureName.slice(0, -1);
        } else if (e.key.length === 1 && this.adventureName.length < 25) {
             // Basic alphanumeric check
             if (/[a-zA-Z0-9 _-]/.test(e.key)) {
                 this.adventureName += e.key;
             }
        }
    },

    cycleStep: function(dir) {
        this.selectedStepIndex += dir;
        if (this.selectedStepIndex < 0) this.selectedStepIndex = this.availableSteps.length - 1;
        if (this.selectedStepIndex >= this.availableSteps.length) this.selectedStepIndex = 0;
    },

    getMousePos: function(e, canvas) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) * (canvas.width / rect.width),
            y: (e.clientY - rect.top) * (canvas.height / rect.height)
        };
    },

    handleMouseMove: function(e, canvas) {
        const pos = this.getMousePos(e, canvas);
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        // Back Button
        if (this.checkCollision(pos, this.backBtn)) this.setHover(this.backBtn, true);
        else this.setHover(this.backBtn, false);

        // Start Button
        if (this.checkCollision(pos, this.startBtn, cx, cy + 150)) this.setHover(this.startBtn, true);
        else this.setHover(this.startBtn, false);

        // Arrows
        // Prev
        if (pos.x >= cx - 250 && pos.x <= cx - 200 && pos.y >= cy && pos.y <= cy + 50) {
            this.prevBtn.isHovered = true;
        } else {
            this.prevBtn.isHovered = false;
        }

        // Next
        if (pos.x >= cx + 200 && pos.x <= cx + 250 && pos.y >= cy && pos.y <= cy + 50) {
            this.nextBtn.isHovered = true;
        } else {
            this.nextBtn.isHovered = false;
        }

        const anyHover = this.backBtn.isHovered || this.startBtn.isHovered || this.prevBtn.isHovered || this.nextBtn.isHovered;
        document.body.style.cursor = anyHover ? 'pointer' : 'default';
    },

    setHover: function(btn, hovered) {
        btn.isHovered = hovered;
        if (hovered) btn.targetScale = btn.isPressed ? 0.95 : 1.1;
        else {
            btn.targetScale = 1.0;
            btn.isPressed = false;
        }
    },

    handleMouseDown: function(e, canvas) {
        const pos = this.getMousePos(e, canvas);
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        if (this.checkCollision(pos, this.backBtn)) {
            this.backBtn.isPressed = true;
        }
        if (this.checkCollision(pos, this.startBtn, cx, cy + 150)) {
            this.startBtn.isPressed = true;
        }

        // Arrow Clicks
        if (this.prevBtn.isHovered) this.cycleStep(-1);
        if (this.nextBtn.isHovered) this.cycleStep(1);
    },

    handleMouseUp: function(e) {
        if (this.backBtn.isPressed) {
            this.backBtn.isPressed = false;
            if (this.backBtn.isHovered && window.GameMenu) window.GameMenu.closeSubScreen();
        }

        if (this.startBtn.isPressed) {
            this.startBtn.isPressed = false;
            if (this.startBtn.isHovered) this.injectSave();
        }
    },

    checkCollision: function(pos, element, cx, cy) {
        let x = element.x !== undefined ? element.x : cx - element.w / 2;
        let y = element.y !== undefined ? element.y : cy - element.h / 2;
        return (pos.x >= x && pos.x <= x + element.w && pos.y >= y && pos.y <= y + element.h);
    },

    render: function(ctx, canvas) {
        // --- MATRIX BACKGROUND ---
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Grid lines
        ctx.strokeStyle = "#003300";
        ctx.lineWidth = 1;
        for(let i=0; i<canvas.width; i+=40) {
            ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
        }
        for(let i=0; i<canvas.height; i+=40) {
            ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
        }

        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        // --- TITLE ---
        ctx.textAlign = "center";
        ctx.fillStyle = "#00ff00";
        ctx.font = "bold 40px monospace";
        ctx.shadowColor = "#00ff00"; ctx.shadowBlur = 10;
        ctx.fillText("DEV CONSOLE // LEVEL SELECT", cx, 80);
        ctx.shadowBlur = 0;

        // --- ADVENTURE NAME INPUT ---
        ctx.fillStyle = "#004400";
        ctx.fillRect(cx - 200, cy - 100, 400, 40);
        ctx.strokeStyle = "#00ff00";
        ctx.strokeRect(cx - 200, cy - 100, 400, 40);
        
        ctx.fillStyle = "#00ff00";
        ctx.font = "20px monospace";
        ctx.textBaseline = "middle";
        ctx.fillText(this.adventureName, cx, cy - 80);
        ctx.font = "14px monospace";
        ctx.fillStyle = "#00aa00";
        ctx.fillText("SAVE FILE ID", cx, cy - 115);


        // --- LEVEL SELECTOR ---
        const currentStep = this.availableSteps[this.selectedStepIndex];
        
        // Selector Box
        ctx.fillStyle = "#001100";
        ctx.fillRect(cx - 250, cy, 500, 50);
        ctx.strokeStyle = "#00ff00";
        ctx.lineWidth = 2;
        ctx.strokeRect(cx - 250, cy, 500, 50);

        // Arrows
        ctx.fillStyle = this.prevBtn.isHovered ? "#00ff00" : "#004400";
        ctx.fillRect(cx - 250, cy, 50, 50);
        ctx.fillStyle = this.prevBtn.isHovered ? "#000" : "#00ff00";
        ctx.font = "bold 30px monospace";
        ctx.fillText("<", cx - 225, cy + 25);

        ctx.fillStyle = this.nextBtn.isHovered ? "#00ff00" : "#004400";
        ctx.fillRect(cx + 200, cy, 50, 50);
        ctx.fillStyle = this.nextBtn.isHovered ? "#000" : "#00ff00";
        ctx.fillText(">", cx + 225, cy + 25);

        // Text Content
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 20px monospace";
        // Format: [5] LEVEL 3: THE GATE
        const label = `[${currentStep.index}] ${currentStep.id} (${currentStep.type})`;
        ctx.fillText(label, cx, cy + 25);
        
        // File Source (subtitle)
        ctx.fillStyle = "#00aa00";
        ctx.font = "14px monospace";
        ctx.fillText(`Source: ${currentStep.file}`, cx, cy + 65);

        // --- BUTTONS ---
        this.drawButton(ctx, this.startBtn, cx, cy + 150, "#004400", "#008800");
        this.drawButton(ctx, this.backBtn, this.backBtn.x + this.backBtn.w/2, this.backBtn.y + this.backBtn.h/2, "#330000", "#660000");
    },

    drawButton: function(ctx, btn, centerX, centerY, color, hoverColor) {
        btn.scale += (btn.targetScale - btn.scale) * 0.2;

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.scale(btn.scale, btn.scale);
        
        const w = btn.w;
        const h = btn.h;

        ctx.fillStyle = btn.isHovered ? hoverColor : color;
        ctx.fillRect(-w/2, -h/2, w, h);
        
        ctx.strokeStyle = "#00ff00";
        ctx.lineWidth = 2;
        ctx.strokeRect(-w/2, -h/2, w, h);

        ctx.fillStyle = "#00ff00";
        ctx.font = "bold 18px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(btn.label, 0, 0);

        ctx.restore();
    }
};

// Add listener for arrow keys
window.addEventListener('keydown', (e) => {
    if (window.GameMenu && window.GameMenu.currentScreen === window.DevSelectScreen) {
        window.DevSelectScreen.handleKeyDown(e);
    }
});