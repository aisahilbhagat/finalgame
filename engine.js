window.GameEngine = {
    // --- STATE ---
    isActive: false,
    currentStepIndex: 0,
    currentModule: null, 
    isTransitioning: false,
    currentSaveData: null, // NEW: Stores the full save object (ID, Name, Stats)
    
    // --- SEQUENCE CONFIGURATION ---
    gameSequence: [
        { type: 'cutscene', id: 'Cutscene1', file: 'cutscene1.js' },
        { type: 'world',    id: 'WorldManager', file: 'world.js' },
        { type: 'level',    id: 'Level1',    file: 'level1.js' },
        { type: 'level',    id: 'Level2',    file: 'level2.js' },
        { type: 'cutscene', id: 'Cutscene2', file: 'cutscene2.js' },
        { type: 'level',    id: 'Level3',    file: 'level3.js' },
        { type: 'level',    id: 'Level4',    file: 'level4.js' },
        { type: 'cutscene', id: 'Cutscene3', file: 'cutscene3.js' },
        { type: 'level',    id: 'Level5',    file: 'level5.js' },
        { type: 'level',    id: 'Level6',    file: 'level6.js' },
        { type: 'level',    id: 'Level7',    file: 'level7.js' },
        { type: 'cutscene', id: 'Cutscene4', file: 'cutscene4.js' },
        { type: 'level',    id: 'Level8',    file: 'level8.js' },
        { type: 'level',    id: 'Level9',    file: 'level9.js' },
        { type: 'cutscene', id: 'Cutscene5', file: 'cutscene5.js' },
        { type: 'level',    id: 'Level10',   file: 'level10.js' },
        { type: 'cutscene', id: 'Cutscene6', file: 'cutscene6.js' },
        { type: 'endgame',  id: 'GameEnd',   file: 'game_end.js' }
    ],

    init: function() {
        console.log("Game Engine Initialized");
        
        // ✅ SETUP CANVAS GLOBALS
        const c = document.getElementById('gameCanvas') || document.querySelector('canvas');
        if (c) {
            window.canvas = c;
            window.ctx = c.getContext('2d');
            
            // Set Initial Size
            window.canvas.width = window.innerWidth;
            window.canvas.height = window.innerHeight;
            
            // Handle Resize
            window.addEventListener('resize', () => {
                if (window.canvas) {
                    window.canvas.width = window.innerWidth;
                    window.canvas.height = window.innerHeight;
                }
            });
        } else {
            console.error("No <canvas> element found in HTML!");
        }
    },

    start: function(saveData) {
        console.log("Engine Starting with Save Data:", saveData);
        this.isActive = true;
        
        // 1. STORE THE FULL SAVE DATA
        // This ensures we have the ID, Name, Inventory, etc. in memory
        this.currentSaveData = saveData || {};

        // 2. Load progress from that specific file
        this.currentStepIndex = this.currentSaveData.stepIndex || 0;
        
        // Hijack the loop
        window.render = this.render.bind(this);
        window.update = this.update.bind(this);

        // Hide Menu
        if(window.GameMenu) window.GameMenu.active = false;
        window.canvasMenuVisible = false;

        this.loadCurrentStep();
    },

    loadCurrentStep: function() {
        this.isTransitioning = false;

        if (this.currentStepIndex >= this.gameSequence.length) {
            console.log("Game Completed!");
            return;
        }

        const step = this.gameSequence[this.currentStepIndex];
        console.log(`Engine: Loading Step ${this.currentStepIndex + 1}: ${step.id} (${step.file})`);

        const script = document.createElement('script');
        script.src = step.file;
        script.onload = () => {
            if (window[step.id]) {
                this.currentModule = window[step.id];
                if (this.currentModule.init) this.currentModule.init(this);
                if (this.currentModule.load) this.currentModule.load();
            } else {
                console.error(`Module ${step.id} not found in ${step.file}`);
            }
        };
        document.body.appendChild(script);
    },

    handleContentComplete: function() {
        if (this.isTransitioning) return; 
        this.isTransitioning = true;

        console.log("Step Complete. Saving and advancing...");
        
        if (this.currentModule && this.currentModule.cleanup) {
            this.currentModule.cleanup();
        }
        this.currentModule = null;

        // Advance progress
        this.currentStepIndex++;
        
        // Save immediately before loading next
        this.saveProgress();
        
        this.loadCurrentStep();
    },

    saveProgress: function() {
        if (!this.currentSaveData) {
            console.error("No save data loaded to update!");
            return;
        }

        // 1. Update the local data object with new progress
        this.currentSaveData.stepIndex = this.currentStepIndex;
        this.currentSaveData.date = new Date().toLocaleString();
        
        // Optional: Update legacy flags for Load Game UI if needed
        if (this.currentStepIndex > 2) this.currentSaveData.level1Played = true; 
        
        console.log("Saving progress to ID:", this.currentSaveData.id);

        // 2. Write the ENTIRE updated object back to DB
        const request = window.indexedDB.open("AdventureGameDB", 1);
        request.onsuccess = (e) => {
            const db = e.target.result;
            const transaction = db.transaction(['saves'], 'readwrite');
            const store = transaction.objectStore('saves');
            
            // CRITICAL FIX: We put 'this.currentSaveData' which contains the correct ID.
            // We do NOT create a new object { id: 1 }.
            const putRequest = store.put(this.currentSaveData);
            
            putRequest.onsuccess = () => {
                console.log("Save successful!");
            };
            
            putRequest.onerror = (err) => {
                console.error("Save failed:", err);
            };
        };
    },

    update: function() {
        if (this.isTransitioning) return;
        if (this.currentModule && this.currentModule.update) {
            this.currentModule.update();
        }
    },

    render: function() {
        if (this.isTransitioning) return;

        const ctx = window.ctx;
        if (!ctx) return;

        ctx.clearRect(0, 0, window.canvas.width, window.canvas.height);
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, window.canvas.width, window.canvas.height);

        if (this.currentModule && this.currentModule.render) {
            this.currentModule.render(ctx);
        }
    }
};

setTimeout(() => window.GameEngine.init(), 100);