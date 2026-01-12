window.LoadGameScreen = {
    // --- STATE ---
    saveFiles: [],
    fileButtons: [], 
    deleteButtons: [], 
    isLoading: true,
    statusMessage: "Checking file system...",
    
    // --- MODAL STATE ---
    showModal: false,
    fileToDelete: null,
    modalButtons: [],

    // --- UI ELEMENTS ---
    backBtn: { 
        x: 40, y: 40, w: 100, h: 40, label: "BACK",
        scale: 1, targetScale: 1, isHovered: false, isPressed: false
    },
    
    // --- AUDIO ---
    clickSound: new Audio('mouse-click.wav'),

    init: function() {
        console.log("LoadGame Screen initialized");
        this.saveFiles = [];
        this.fileButtons = [];
        this.deleteButtons = [];
        this.isLoading = true;
        this.showModal = false;
        this.fileToDelete = null;
        this.statusMessage = "Checking file system...";
        this.backBtn.scale = 1;
        this.backBtn.targetScale = 1;
        
        this.checkSaveSystem();
    },

    checkSaveSystem: function() {
        if (!window.indexedDB) {
            this.handleNoSaves("File system not supported.");
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
            if (!db.objectStoreNames.contains('saves')) {
                this.handleNoSaves("Save directory empty.");
                return;
            }

            const transaction = db.transaction(['saves'], 'readonly');
            const store = transaction.objectStore('saves');
            const countRequest = store.count();

            countRequest.onsuccess = () => {
                if (countRequest.result === 0) {
                    this.handleNoSaves("No save files found.");
                } else {
                    this.loadSaveFiles(store);
                }
            };

            countRequest.onerror = () => {
                this.handleNoSaves("Error reading file system.");
            };
        };

        request.onerror = (e) => {
            console.error("IndexedDB error:", e.target.errorCode);
            this.handleNoSaves("Could not access saves.");
        };
    },

    loadSaveFiles: function(store) {
        const cursorRequest = store.getAll();
        cursorRequest.onsuccess = (e) => {
            const allFiles = e.target.result;
            
            // Filter out corrupt/undefined saves
            this.saveFiles = allFiles.filter(f => f && f.adventureName && f.id);
            
            if (this.saveFiles.length === 0) {
                this.handleNoSaves("No valid save files found.");
                return;
            }

            // Sort by Date (newest first)
            this.saveFiles.sort((a, b) => b.id - a.id);
            
            this.isLoading = false;
            this.statusMessage = "Select a world to load:";
            this.createSaveButtons();
        };
    },

    // --- NEW: Helper to get clean name from Step Index ---
    getProgressName: function(index) {
        // Matches the gameSequence in engine.js
        const stepMap = [
            "Intro Cutscene",       // 0
            "Forest",          // 1
            "Level 1: The Beginning", // 2
            "Level 2: Reach the Castle",   // 3
            "Story Sequence 2",     // 4
            "Level 3: The gatekeeper",     // 5
            "Level 4: The secret room",   // 6
            "Story Sequence 3",     // 7
            "Level 5: Who is he?",     // 8
            "Level 6: The room",  // 9
            "Level 7: The Bridge",    // 10
            "Story Sequence 4",     // 11
            "Level 8: High Peaks",    // 12
            "Level 9: I give up!",        // 13
            "Story Sequence 5",     // 14
            "Level 10: Final Boss",   // 15
            "Ending Sequence",      // 16
            "Adventure Completed"   // 17
        ];

        if (index === undefined || index === null) return "New Adventure";
        if (index >= stepMap.length) return "Adventure Completed";
        return stepMap[index] || ("Level " + (index - 1)); // Fallback
    },

    createSaveButtons: function() {
        this.fileButtons = [];
        this.deleteButtons = [];
        
        const startY = 150;
        const btnH = 65; 
        const gap = 15;
        const btnW = 550; 
        const delBtnSize = 50; 

        this.saveFiles.forEach((file, index) => {
            const yPos = startY + (index * (btnH + gap));
            
            // --- UPDATED LOGIC HERE ---
            // Use the stepIndex directly to get the exact level name
            let progressText = "Current: " + this.getProgressName(file.stepIndex);

            // 1. Main Load Button
            this.fileButtons.push({
                fileData: file,
                displayStatus: progressText, 
                x: -30, 
                y: yPos,
                w: btnW,
                h: btnH,
                scale: 1, targetScale: 1, isHovered: false, isPressed: false
            });

            // 2. Delete "X" Button
            this.deleteButtons.push({
                fileId: file.id,
                x: (btnW / 2) + 10,
                y: yPos,
                w: delBtnSize,
                h: btnH,
                scale: 1, targetScale: 1, isHovered: false, isPressed: false
            });
        });
    },

    // --- DELETE LOGIC ---
    promptDelete: function(id) {
        this.fileToDelete = id;
        this.showModal = true;
        
        // Setup Modal Buttons
        this.modalButtons = [
            { id: 'confirm', label: "CONFIRM DELETE", x: -80, y: 50, w: 180, h: 40, color: '#8a0303', hover: '#ff0000' },
            { id: 'cancel', label: "CANCEL", x: 120, y: 50, w: 100, h: 40, color: '#333', hover: '#555' }
        ];
    },

    confirmDelete: function() {
        if (!this.fileToDelete) return;
        
        console.log("Deleting file ID:", this.fileToDelete);
        const request = window.indexedDB.open("AdventureGameDB", 1);
        
        request.onsuccess = (e) => {
            const db = e.target.result;
            const transaction = db.transaction(['saves'], 'readwrite');
            const store = transaction.objectStore('saves');
            
            store.delete(this.fileToDelete).onsuccess = () => {
                console.log("Delete successful.");
                this.closeModal();
                // Refresh list
                this.checkSaveSystem();
            };
        };
    },

    closeModal: function() {
        this.showModal = false;
        this.fileToDelete = null;
        this.modalButtons = [];
    },

    handleNoSaves: function(msg) {
        this.isLoading = false;
        this.statusMessage = msg;
        this.saveFiles = []; 
        this.fileButtons = [];
        this.deleteButtons = [];

        console.log(msg + " - Redirecting immediately.");
        if (window.GameMenu) {
            window.GameMenu.loadScreen('newgame.js', 'NewGameScreen');
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
        let x, y;
        if (cx !== undefined) {
             x = cx + element.x - element.w / 2; 
             y = element.y; 
        } else {
             x = element.x; 
             y = element.y;
        }
        return (pos.x >= x && pos.x <= x + element.w && pos.y >= y && pos.y <= y + element.h);
    },

    handleMouseMove: function(e, canvas) {
        const pos = this.getMousePos(e, canvas);
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        let anyHover = false;

        // --- MODAL INTERACTION ---
        if (this.showModal) {
            this.modalButtons.forEach(btn => {
                if (pos.x >= cx + btn.x - btn.w/2 && pos.x <= cx + btn.x + btn.w/2 &&
                    pos.y >= cy + btn.y - btn.h/2 && pos.y <= cy + btn.y + btn.h/2) {
                    btn.isHovered = true;
                    anyHover = true;
                } else {
                    btn.isHovered = false;
                }
            });
            document.body.style.cursor = anyHover ? 'pointer' : 'default';
            return; 
        }

        // --- NORMAL INTERACTION ---

        // 1. Back Button
        if (this.checkCollision(pos, this.backBtn)) {
            this.backBtn.isHovered = true;
            this.backBtn.targetScale = this.backBtn.isPressed ? 0.95 : 1.1;
            anyHover = true;
        } else {
            this.backBtn.isHovered = false;
            this.backBtn.targetScale = 1.0;
            this.backBtn.isPressed = false;
        }

        // 2. Save File Buttons
        this.fileButtons.forEach(btn => {
            if (this.checkCollision(pos, btn, cx)) {
                btn.isHovered = true;
                btn.targetScale = btn.isPressed ? 0.98 : 1.05;
                anyHover = true;
            } else {
                btn.isHovered = false;
                btn.targetScale = 1.0;
                btn.isPressed = false;
            }
        });

        // 3. Delete Buttons
        this.deleteButtons.forEach(btn => {
            if (this.checkCollision(pos, btn, cx)) {
                btn.isHovered = true;
                btn.targetScale = btn.isPressed ? 0.90 : 1.1;
                anyHover = true;
            } else {
                btn.isHovered = false;
                btn.targetScale = 1.0;
                btn.isPressed = false;
            }
        });

        document.body.style.cursor = anyHover ? 'pointer' : 'default';
    },

    handleMouseDown: function(e, canvas) {
        const pos = this.getMousePos(e, canvas);
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        // --- MODAL CLICK ---
        if (this.showModal) {
            this.modalButtons.forEach(btn => {
                if (pos.x >= cx + btn.x - btn.w/2 && pos.x <= cx + btn.x + btn.w/2 &&
                    pos.y >= cy + btn.y - btn.h/2 && pos.y <= cy + btn.y + btn.h/2) {
                    
                    this.playClick();
                    if (btn.id === 'confirm') this.confirmDelete();
                    if (btn.id === 'cancel') this.closeModal();
                }
            });
            return;
        }

        // --- NORMAL CLICK ---

        // Back Button
        if (this.checkCollision(pos, this.backBtn)) {
            this.backBtn.isPressed = true;
            this.backBtn.targetScale = 0.95;
            this.playClick();
        }

        // Save File Buttons
        this.fileButtons.forEach(btn => {
            if (this.checkCollision(pos, btn, cx)) {
                btn.isPressed = true;
                btn.targetScale = 0.98;
                this.playClick();
            }
        });

        // Delete Buttons
        this.deleteButtons.forEach(btn => {
            if (this.checkCollision(pos, btn, cx)) {
                btn.isPressed = true;
                btn.targetScale = 0.90;
                this.playClick();
            }
        });
    },

    handleMouseUp: function(e) {
        if (this.showModal) return;

        // Back Button
        if (this.backBtn.isPressed) {
            this.backBtn.isPressed = false;
            this.backBtn.targetScale = this.backBtn.isHovered ? 1.1 : 1.0;
            if (this.backBtn.isHovered && window.GameMenu) {
                window.GameMenu.closeSubScreen();
            }
        }

        // Save File Buttons (Load Game)
        this.fileButtons.forEach(btn => {
            if (btn.isPressed) {
                btn.isPressed = false;
                btn.targetScale = btn.isHovered ? 1.05 : 1.0;
                if (btn.isHovered) {
                    console.log("Loading Save:", btn.fileData);
                    if (window.GameEngine) {
                        window.GameEngine.start(btn.fileData);
                    } else {
                        console.error("GameEngine not found! Ensure game_engine.js is loaded.");
                    }
                }
            }
        });

        // Delete Buttons (Trigger Modal)
        this.deleteButtons.forEach(btn => {
            if (btn.isPressed) {
                btn.isPressed = false;
                btn.targetScale = btn.isHovered ? 1.1 : 1.0;
                if (btn.isHovered) {
                    this.promptDelete(btn.fileId);
                }
            }
        });
    },

    playClick: function() {
        this.clickSound.currentTime = 0;
        this.clickSound.play().catch(e=>{});
    },

    render: function(ctx, canvas) {
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        ctx.fillStyle = "#121212";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Title
        ctx.textAlign = "center";
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 40px monospace";
        ctx.fillText("LOAD SAVED GAME", cx, 100);

        // Status / Message
        if (this.isLoading || this.saveFiles.length === 0) {
            ctx.fillStyle = this.isLoading ? "#aaaaaa" : "#ff5555";
            ctx.font = "20px monospace";
            ctx.fillText(this.statusMessage, cx, canvas.height / 2);
        } else {
            ctx.fillStyle = "#aaaaaa";
            ctx.font = "16px monospace";
            ctx.fillText(this.statusMessage, cx, 130);
        }

        // --- RENDER FILES ---
        // 1. Load Buttons
        this.fileButtons.forEach(btn => {
            btn.scale += (btn.targetScale - btn.scale) * 0.2;
            
            ctx.save();
            ctx.translate(cx + btn.x, btn.y + btn.h/2); 
            ctx.scale(btn.scale, btn.scale);
            const dx = -btn.w / 2;
            const dy = -btn.h / 2;

            // Box
            ctx.fillStyle = btn.isHovered ? "#222" : "#1a1a1a";
            ctx.fillRect(dx, dy, btn.w, btn.h);
            
            // Border
            ctx.strokeStyle = btn.isHovered ? "#4a90e2" : "#333";
            ctx.lineWidth = 2;
            ctx.strokeRect(dx, dy, btn.w, btn.h);

            // Text: Adventure Name (Moved up slightly)
            ctx.textAlign = "left";
            ctx.fillStyle = "#fff";
            ctx.font = "bold 18px monospace";
            ctx.fillText(btn.fileData.adventureName, dx + 20, -5); 

            // Text: Status (UPDATED COLOR AND PLACEMENT)
            ctx.fillStyle = "#4a90e2";
            ctx.font = "14px monospace";
            ctx.fillText(btn.displayStatus, dx + 20, 20);

            // Date
            ctx.textAlign = "right";
            ctx.fillStyle = "#888";
            ctx.font = "14px monospace";
            ctx.fillText(btn.fileData.date, dx + btn.w - 20, 5);
            ctx.restore();
        });

        // 2. Delete Buttons
        this.deleteButtons.forEach(btn => {
            btn.scale += (btn.targetScale - btn.scale) * 0.2;
            
            ctx.save();
            ctx.translate(cx + btn.x, btn.y + btn.h/2); 
            ctx.scale(btn.scale, btn.scale);
            const dx = -btn.w / 2;
            const dy = -btn.h / 2;

            ctx.fillStyle = btn.isHovered ? "#8a0303" : "#330000";
            ctx.fillRect(dx, dy, btn.w, btn.h);
            
            ctx.strokeStyle = "#ff0000";
            ctx.lineWidth = 1;
            ctx.strokeRect(dx, dy, btn.w, btn.h);

            ctx.fillStyle = "#fff";
            ctx.font = "bold 20px monospace";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("X", 0, 0);
            ctx.restore();
        });

        // Loading Spinner
        if (this.isLoading) {
            const time = Date.now() / 100;
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cx, cy + 50, 20, time, time + 1.5 * Math.PI);
            ctx.stroke();
        }

        // Back Button
        const b = this.backBtn;
        b.scale += (b.targetScale - b.scale) * 0.2;
        ctx.save();
        ctx.translate(b.x + b.w/2, b.y + b.h/2);
        ctx.scale(b.scale, b.scale);
        
        ctx.fillStyle = "#333";
        ctx.fillRect(-b.w/2, -b.h/2, b.w, b.h);
        ctx.strokeStyle = "#777";
        ctx.strokeRect(-b.w/2, -b.h/2, b.w, b.h);
        
        ctx.fillStyle = "#fff";
        ctx.font = "bold 16px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(b.label, 0, 0);
        ctx.restore();

        // --- RENDER MODAL ---
        if (this.showModal) {
            // Overlay
            ctx.fillStyle = "rgba(0,0,0,0.85)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Modal Box
            const mw = 500;
            const mh = 250;
            ctx.save();
            ctx.translate(cx, cy);
            
            ctx.fillStyle = "#1a0505"; // Dark red/black bg
            ctx.fillRect(-mw/2, -mh/2, mw, mh);
            
            ctx.strokeStyle = "#ff0000";
            ctx.lineWidth = 4;
            ctx.strokeRect(-mw/2, -mh/2, mw, mh);

            // Warning Text
            ctx.fillStyle = "#ff0000";
            ctx.textAlign = "center";
            ctx.font = "bold 24px monospace";
            ctx.fillText("WARNING!", 0, -60);
            
            ctx.fillStyle = "#ffffff";
            ctx.font = "18px monospace";
            ctx.fillText("YOUR PROGRESS AND THINGS WILL BE LOST.", 0, -20);
            
            // Buttons
            this.modalButtons.forEach(btn => {
                const bx = btn.x;
                const by = btn.y;
                ctx.fillStyle = btn.isHovered ? btn.hover : btn.color;
                ctx.fillRect(bx - btn.w/2, by - btn.h/2, btn.w, btn.h);
                
                ctx.strokeStyle = "#fff";
                ctx.lineWidth = 1;
                ctx.strokeRect(bx - btn.w/2, by - btn.h/2, btn.w, btn.h);
                
                ctx.fillStyle = "#fff";
                ctx.font = "bold 16px monospace";
                ctx.fillText(btn.label, bx, by + 5);
            });

            ctx.restore();
        }
    }
};