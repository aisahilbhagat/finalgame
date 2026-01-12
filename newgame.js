window.NewGameScreen = {
    // --- STATE ---
    adventureName: "", 
    isInputActive: false,
    cursorBlink: 0,
    isSaving: false, // Prevent double clicks

    // --- UI ELEMENTS ---
    backBtn: { 
        x: 40, y: 40, w: 100, h: 40, label: "BACK",
        scale: 1, targetScale: 1, isHovered: false, isPressed: false
    },
    
    startBtn: {
        w: 240, h: 60, label: "START ADVENTURE",
        scale: 1, targetScale: 1, isHovered: false, isPressed: false
    },

    inputBox: { w: 300, h: 50 },

    // --- AUDIO ---
    clickSound: new Audio('mouse-click.wav'),

    init: function() {
        console.log("NewGame Screen initialized");
        this.adventureName = ""; 
        this.isInputActive = false;
        this.isSaving = false;
        
        this.resetButton(this.backBtn);
        this.resetButton(this.startBtn);
    },

    resetButton: function(btn) {
        btn.scale = 1; btn.targetScale = 1;
        btn.isHovered = false; btn.isPressed = false;
    },

    // --- CORE GAME LOGIC ---
    startAdventure: function() {
        // Critical: Prevent execution if already saving
        if (this.isSaving) return;
        
        const name = this.adventureName.trim();
        if (name.length === 0) {
            console.log("Name required!");
            return;
        }

        this.isSaving = true;
        this.startBtn.label = "CREATING WORLD...";

        // 1. Define Initial Game State
        const initialGameState = {
            // Fix: Add random suffix to ID to ensure absolute uniqueness 
            // even if called multiple times in same millisecond
            id: Date.now() + Math.floor(Math.random() * 1000), 
            adventureName: name,
            date: new Date().toLocaleString(),
            
            // --- PROGRESS FLAGS ---
            cutscenePlayed: false,
            lobbyPlayed: false,
            level1Played: false,
            levelIndex: 1, 

            // --- PLAYER STATS ---
            xp: 0,
            inventory: [],
            position: { x: 100, y: 0, map: 'world_lobby' }, 
            stats: { hp: 100, maxHp: 100, mana: 50 }
        };

        // 2. Save to Database
        this.saveToDB(initialGameState);
    },

    saveToDB: function(gameState) {
        if (!window.indexedDB) {
            console.error("IndexedDB not supported!");
            this.isSaving = false;
            this.startBtn.label = "DB ERROR";
            return;
        }

        const request = window.indexedDB.open("AdventureGameDB", 1);

        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('saves')) {
                db.createObjectStore('saves', { keyPath: 'id' });
            }
        };

        request.onsuccess = (e) => {
            const db = e.target.result;
            const transaction = db.transaction(['saves'], 'readwrite');
            const store = transaction.objectStore('saves');
            
            const addRequest = store.add(gameState);

            addRequest.onsuccess = () => {
                console.log("World created successfully!");
                
                this.startBtn.label = "SAVED!";
                
                // Transition to Game Engine after a short delay
                setTimeout(() => {
                    if (window.GameEngine) {
                        console.log("Starting Game Engine with new state...");
                        window.GameEngine.start(gameState);
                        // Still don't unlock, because we are leaving this screen.
                    } else {
                        console.error("Game Engine not loaded!");
                        this.startBtn.label = "ENGINE ERROR";
                        
                        // ONLY unlock if there was an error preventing the game start
                        setTimeout(() => {
                            this.isSaving = false; 
                            this.startBtn.label = "START ADVENTURE";
                        }, 2000);
                    }
                }, 1000);
            };

            addRequest.onerror = (err) => {
                console.error("Error saving world:", err);
                this.isSaving = false; // Unlock on error
                this.startBtn.label = "ERROR!";
            };
        };

        request.onerror = (e) => {
            console.error("Database error:", e);
            this.isSaving = false; // Unlock on error
        };
    },

    // --- INPUT HANDLING ---
    handleKeyDown: function(e) {
        if (!this.isInputActive) return;

        if (e.key === "Backspace") {
            this.adventureName = this.adventureName.slice(0, -1);
        } else if (e.key === "Enter" || e.key === "Escape") {
            this.isInputActive = false;
        } else if (e.key.length === 1 && this.adventureName.length < 20) {
            const charCode = e.key.charCodeAt(0);
            if (
                (charCode >= 48 && charCode <= 57) || 
                (charCode >= 65 && charCode <= 90) || 
                (charCode >= 97 && charCode <= 122) || 
                charCode === 32
            ) {
                this.adventureName += e.key;
            }
        }
    },

    getMousePos: function(e, canvas) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) * (canvas.width / rect.width),
            y: (e.clientY - rect.top) * (canvas.height / rect.height)
        };
    },

    checkCollision: function(pos, element, cx, cy) {
        let x = element.x !== undefined ? element.x : cx - element.w / 2;
        let y = element.y !== undefined ? element.y : cy - element.h / 2;
        return (pos.x >= x && pos.x <= x + element.w && pos.y >= y && pos.y <= y + element.h);
    },

    handleMouseMove: function(e, canvas) {
        const pos = this.getMousePos(e, canvas);
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        if (this.checkCollision(pos, this.backBtn)) this.setHover(this.backBtn, true);
        else this.setHover(this.backBtn, false);

        if (!this.isSaving) {
            if (this.checkCollision(pos, this.startBtn, cx, cy + 120)) this.setHover(this.startBtn, true);
            else this.setHover(this.startBtn, false);
        } else {
            this.setHover(this.startBtn, false); 
        }

        const inputHover = this.checkCollision(pos, this.inputBox, cx, cy - 20);
        
        if (this.backBtn.isHovered || (this.startBtn.isHovered && !this.isSaving) || inputHover) {
            document.body.style.cursor = inputHover ? 'text' : 'pointer';
        } else {
            document.body.style.cursor = 'default';
        }
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
            this.backBtn.targetScale = 0.95;
            this.playClick();
        }

        if (!this.isSaving && this.checkCollision(pos, this.startBtn, cx, cy + 120)) {
            this.startBtn.isPressed = true;
            this.startBtn.targetScale = 0.95;
            this.playClick();
        }

        if (this.checkCollision(pos, this.inputBox, cx, cy - 20)) {
            this.isInputActive = true;
        } else {
            this.isInputActive = false;
        }
    },

    handleMouseUp: function(e) {
        if (this.backBtn.isPressed) {
            this.backBtn.isPressed = false;
            this.backBtn.targetScale = this.backBtn.isHovered ? 1.1 : 1.0;
            if (this.backBtn.isHovered && window.GameMenu) {
                window.GameMenu.closeSubScreen();
            }
        }

        if (this.startBtn.isPressed) {
            this.startBtn.isPressed = false;
            this.startBtn.targetScale = this.startBtn.isHovered ? 1.1 : 1.0;
            
            if (this.startBtn.isHovered && !this.isSaving) {
                this.startAdventure();
            }
        }
    },

    playClick: function() {
        this.clickSound.currentTime = 0;
        this.clickSound.play().catch(e => {});
    },

    render: function(ctx, canvas) {
        const grad = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 100, canvas.width/2, canvas.height/2, canvas.width);
        grad.addColorStop(0, "#2b0a0a"); 
        grad.addColorStop(1, "#050000"); 
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        ctx.textAlign = "center";
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 40px monospace";
        ctx.shadowColor = "#500000"; ctx.shadowBlur = 15;
        ctx.fillText("NEW ADVENTURE", cx, 100);
        ctx.shadowBlur = 0;

        ctx.fillStyle = "#994444";
        ctx.font = "16px monospace";
        ctx.fillText("ENTER ADVENTURE NAME:", cx, cy - 60);

        const ib = this.inputBox;
        const ix = cx - ib.w / 2;
        const iy = cy - 20 - ib.h / 2;

        ctx.save();
        ctx.fillStyle = this.isInputActive ? "#1a0505" : "#0f0202";
        ctx.fillRect(ix, iy, ib.w, ib.h);
        
        ctx.strokeStyle = this.isInputActive ? "#8a0303" : "#331111";
        ctx.lineWidth = 2;
        ctx.strokeRect(ix, iy, ib.w, ib.h);

        ctx.textBaseline = "middle";
        if (this.adventureName.length === 0) {
            ctx.fillStyle = "#4a1a1a";
            ctx.font = "italic 24px monospace";
            ctx.fillText("Adventure Name", cx, cy - 20);
        } else {
            ctx.fillStyle = "#ffdddd";
            ctx.font = "24px monospace";
            ctx.fillText(this.adventureName, cx, cy - 20);
        }

        if (this.isInputActive) {
            this.cursorBlink++;
            if (Math.floor(this.cursorBlink / 20) % 2 === 0) {
                let cursorX;
                if (this.adventureName.length === 0) cursorX = cx;
                else cursorX = cx + ctx.measureText(this.adventureName).width / 2 + 5;
                ctx.fillStyle = "#8a0303"; 
                ctx.fillRect(cursorX, iy + 10, 2, ib.h - 20);
            }
        }
        ctx.restore();

        const btnColor = this.isSaving ? "#222" : "#4a0a0a";
        const btnHover = this.isSaving ? "#222" : "#6e0e0e";
        
        this.drawButton(ctx, this.startBtn, cx, cy + 120, btnColor, btnHover);
        this.drawButton(ctx, this.backBtn, this.backBtn.x + this.backBtn.w/2, this.backBtn.y + this.backBtn.h/2, "#333", "#444");
    },

    drawButton: function(ctx, btn, centerX, centerY, color, hoverColor) {
        btn.scale += (btn.targetScale - btn.scale) * 0.2;

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.scale(btn.scale, btn.scale);
        
        const w = btn.w;
        const h = btn.h;
        const dx = -w / 2;
        const dy = -h / 2;

        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(dx + 4, dy + 4, w, h);

        ctx.fillStyle = btn.isHovered ? hoverColor : color; 
        if (btn.label === "BACK") ctx.fillStyle = btn.isHovered ? "#444" : "#222"; 
        
        ctx.fillRect(dx, dy, w, h);

        ctx.strokeStyle = btn.label === "BACK" ? "#555" : "#6e0e0e";
        if (btn.isHovered && btn.label !== "BACK") ctx.strokeStyle = "#ff3333";
        if (this.isSaving && btn.label !== "BACK") ctx.strokeStyle = "#444";

        ctx.lineWidth = 2;
        ctx.strokeRect(dx, dy, w, h);
        
        ctx.fillStyle = "#fff";
        ctx.font = "bold 18px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = "#000"; ctx.shadowBlur = 4;
        ctx.fillText(btn.label, 0, 0);

        ctx.restore();
    }
};

window.addEventListener('keydown', (e) => {
    if (window.GameMenu && window.GameMenu.currentScreen === window.NewGameScreen) {
        window.NewGameScreen.handleKeyDown(e);
    }
});