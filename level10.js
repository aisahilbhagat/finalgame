window.Level10 = {
    engine: null,
    targetX: 800, 
    player: null, // Store the Class Instance here

    init: function(engine) {
        this.engine = engine;
        console.log("Level 10 Initialized");
    },

    load: function() {
        console.log("Level 10: Triggering Character Load...");
        
        // Use the "Set calls Actor" flow
        this.loadCharacterScript(() => {
            console.log("Character Script Loaded. Creating Player...");
            
            // Instantiate the player class
            // We set the spawn point to (50, 400)
            if (window.LevelCharacter) {
                this.player = new window.LevelCharacter(50, 400);
                
                // Set specific level constraints on the player
                this.player.groundY = 500; 
            } else {
                console.error("Critical: window.LevelCharacter is undefined after load.");
            }

            // Start the Level Logic
            this.setupLevel();
        });
    },

    // The Loader Logic (Dynamic Injection)
    loadCharacterScript: function(callback) {
        // A. Check if it's already loaded (Optimization)
        if (window.LevelCharacter) {
            callback(); 
            return;
        }

        // B. Create a new HTML <script> tag
        const script = document.createElement('script');
        script.src = 'levelcharacter.js'; 

        // C. Wait for the browser to say "I'm done loading"
        script.onload = () => {
            if (!window.LevelCharacter) {
                console.error("ERROR: window.LevelCharacter is missing in loaded file.");
                return;
            }
            // D. Run the code from Step 1 (creating the player)
            callback();
        };

        // E. Add it to the page to start the download
        document.body.appendChild(script);
    },

    setupLevel: function() {
        console.log("Level 10 Setup Complete.");
    },

    update: function() {
        // 1. Update Player (Delegate to Class)
        if (this.player) {
            this.player.update();
            
            // Check Boundaries
            if (this.player.x < 0) this.player.x = 0;
            if (this.engine && this.engine.canvas && this.player.x > this.engine.canvas.width) {
                 // Boundary logic if needed
            }

            // 2. Check Win Condition
            // Access player properties directly
            if (this.player.x >= this.targetX) {
                console.log("Level 1 Complete!");
                this.engine.handleContentComplete();
            }
        }
    },

    render: function(ctx) {
        // 1. Draw Sky
        ctx.fillStyle = "#87CEEB"; 
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        // 2. Draw Ground
        ctx.fillStyle = "#228B22";
        ctx.fillRect(0, 500, 2000, 500);

        // 3. Draw Finish Line
        ctx.fillStyle = "gold";
        ctx.fillRect(this.targetX, 450, 50, 100);
        ctx.fillStyle = "black";
        ctx.fillText("FINISH", this.targetX, 440);

        // 4. Draw Player (Delegate to Class)
        if (this.player) {
            this.player.render(ctx);
        } else {
            ctx.fillStyle = "white";
            ctx.fillText("Loading Actor...", 100, 100);
        }
        
        ctx.fillStyle = "white";
        ctx.font = "20px monospace";
        ctx.fillText("LEVEL 10 - Use Arrow Keys / WASD", 20, 30);
    }
};