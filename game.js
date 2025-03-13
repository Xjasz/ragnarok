// Game initialization
document.addEventListener('DOMContentLoaded', function() {
    console.log('Game initialized');
    
    // DOM elements
    const characterSelection = document.getElementById('character-selection');
    const gameScreen = document.getElementById('game-screen');
    const startGameBtn = document.getElementById('start-game');
    const knightOption = document.getElementById('knight');
    const wizardOption = document.getElementById('wizard');
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    
    // Game state
    let selectedCharacter = null;
    let gameRunning = false;
    let lastTimestamp = 0;
    let selectedSkill = null;
    
    // Game objects
    let player = null;
    window.enemies = []; // Make enemies global
    let projectiles = [];
    window.effects = []; // Make effects global
    let isCasting = false;
    let castEndTime = 0;
    
    // Make canvas global
    window.gameCanvas = canvas;
    
    // Base Character class
    class Character {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.targetX = x;
            this.targetY = y;
            this.radius = 20;
            this.speed = 200; // pixels per second
            this.level = 20;
            this.maxHp = 5000; // Increased HP
            this.hp = this.maxHp;
            this.maxSp = 500;
            this.sp = this.maxSp;
            this.exp = 0;
            this.expToNextLevel = 1000;
            this.isMoving = false;
            this.isAttacking = false;
            this.attackCooldown = 0;
            this.attackDamage = 50;
            this.attackRange = 50;
            this.attackArc = Math.PI / 2; // 90 degrees
            this.attackType = 'none'; // Will be set by subclasses to 'melee' or 'ranged'
            this.weapon = 'none'; // Will be set by subclasses
            this.facing = 0; // radians, 0 = right
            this.skills = [];
            this.skillCooldowns = [0, 0];
            this.castTime = 0;
            this.isCasting = false;
        }
        
        update(deltaTime) {
            const dt = deltaTime / 1000;
            
            // Update cooldowns
            if (this.attackCooldown > 0) {
                this.attackCooldown -= dt;
            }
            
            for (let i = 0; i < this.skillCooldowns.length; i++) {
                if (this.skillCooldowns[i] > 0) {
                    this.skillCooldowns[i] -= dt;
                }
            }
            
            // Update casting
            if (this.isCasting) {
                this.castTime -= dt;
                if (this.castTime <= 0) {
                    this.isCasting = false;
                }
            }
            
            // Move towards target
            if (this.isMoving && !this.isCasting) {
                const dx = this.targetX - this.x;
                const dy = this.targetY - this.y;
                const distance = Math.hypot(dx, dy);
                
                if (distance > 5) {
                    // Update facing direction
                    this.facing = Math.atan2(dy, dx);
                    
                    // Move towards target
                    const moveX = (dx / distance) * this.speed * dt;
                    const moveY = (dy / distance) * this.speed * dt;
                    
                    this.x += moveX;
                    this.y += moveY;
                } else {
                    this.isMoving = false;
                }
            }
            
            // Auto-attack if we have a target and are in range
            if (!this.isCasting && window.attackTarget && window.attackTarget.hp > 0 && this.attackCooldown <= 0) {
                const distance = Math.hypot(window.attackTarget.x - this.x, window.attackTarget.y - this.y);
                // Only auto-attack if we're in weapon range and it's the right type of weapon
                if (distance <= this.attackRange && 
                    ((this.attackType === 'melee' && distance <= 80) || // Melee range check
                     (this.attackType === 'ranged' && distance <= 300))) { // Ranged range check
                    this.attack(window.attackTarget);
                }
            }
            
            // Regenerate SP
            if (this.sp < this.maxSp) {
                this.sp = Math.min(this.maxSp, this.sp + 10 * dt);
            }
        }
        
        render(ctx) {
            // Draw character
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
            ctx.closePath();
            
            // Draw facing direction
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(
                this.x + Math.cos(this.facing) * this.radius,
                this.y + Math.sin(this.facing) * this.radius
            );
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.closePath();
            
            // Draw HP bar
            this.renderHealthBar(ctx);
        }
        
        renderHealthBar(ctx) {
            const barWidth = this.radius * 2;
            const barHeight = 5;
            const barX = this.x - this.radius;
            const barY = this.y - this.radius - 10;
            
            // Background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            
            // Health
            const healthWidth = (this.hp / this.maxHp) * barWidth;
            ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
            ctx.fillRect(barX, barY, healthWidth, barHeight);
        }
        
        moveTo(x, y) {
            this.targetX = x;
            this.targetY = y;
            this.isMoving = true;
        }
        
        attack(target) {
            if (this.attackCooldown <= 0) {
                this.isAttacking = true;
                
                // Face target
                this.facing = Math.atan2(target.y - this.y, target.x - this.x);
                
                // Deal damage
                if (Math.hypot(target.x - this.x, target.y - this.y) <= this.attackRange) {
                    target.takeDamage(this.attackDamage, effects);
                    
                    // Add hit effect
                    effects.push(new HitEffect(target.x, target.y));
                }
                
                // Reset cooldown
                this.attackCooldown = 1; // 1 second
                
                // Reset attack state after animation
                setTimeout(() => {
                    this.isAttacking = false;
                }, 200);
            }
        }
        
        useSkill(index) {
            if (index >= 0 && index < this.skills.length && this.skillCooldowns[index] <= 0) {
                this.skills[index]();
            }
        }
        
        takeDamage(amount) {
            this.hp -= amount;
            
            // Add hit effect
            effects.push(new HitEffect(this.x, this.y));
            
            // Show damage number
            effects.push(new DamageNumber(this.x, this.y, amount));
            
            if (this.hp <= 0) {
                this.hp = 0;
                // Handle death
            }
        }
        
        gainExp(amount) {
            this.exp += amount;
            
            // Show exp gain
            effects.push(new ExpNumber(this.x, this.y, amount));
            
            // Check for level up
            if (this.exp >= this.expToNextLevel) {
                this.levelUp();
            }
        }
        
        levelUp() {
            this.level++;
            this.exp -= this.expToNextLevel;
            this.expToNextLevel = Math.floor(this.expToNextLevel * 1.2);
            this.maxHp = Math.floor(this.maxHp * 1.1);
            this.hp = this.maxHp;
            this.maxSp = Math.floor(this.maxSp * 1.1);
            this.sp = this.maxSp;
            this.attackDamage = Math.floor(this.attackDamage * 1.1);
            
            // Show level up effect
            effects.push(new LevelUpEffect(this.x, this.y));
            
            // Show message
            showMessage(`Level up! You are now level ${this.level}!`);
        }
        
        startCasting(duration) {
            this.isCasting = true;
            this.castTime = duration;
            this.isMoving = false; // Stop movement while casting
            effects.push(new CastingEffect(this.x, this.y, duration * 1000));
        }
    }
    
    // Knight class
    class Knight extends Character {
        constructor(x, y) {
            super(x, y);
            this.color = '#d13438'; // Red
            this.attackDamage = 70;
            this.attackRange = 60; // Spear has slightly longer melee range
            this.attackType = 'melee';
            this.weapon = 'spear';
            
            // Define skills
            this.skills = [
                // Spiral Pierce
                () => {
                    if (this.sp >= 30 && !this.isCasting && window.attackTarget) {
                        this.sp -= 30;
                        
                        // Start casting
                        this.startCasting(0.5); // 0.5 second cast time
                        
                        const target = window.attackTarget;
                        // Face target
                        this.facing = Math.atan2(target.y - this.y, target.x - this.x);
                        
                        // Add skill effect
                        effects.push(new SkillEffect(this.x, this.y, 'Casting Spiral Pierce!', 'front'));
                        
                        // Execute after cast time
                        setTimeout(() => {
                            if (target.hp > 0) {
                                for (let i = 0; i < 3; i++) {
                                    setTimeout(() => {
                                        target.takeDamage(this.attackDamage * 1.2);
                                        effects.push(new HitEffect(target.x, target.y));
                                    }, i * 200);
                                }
                            }
                        }, 500); // Match cast time
                    } else if (this.isCasting) {
                        showMessage('Already casting a skill!');
                    } else if (this.sp < 30) {
                        showMessage('Not enough SP!');
                    }
                },
                
                // Brandish - Cone Attack
                () => {
                    if (this.sp >= 50 && !this.isCasting) {
                        this.sp -= 50;
                        
                        // Start casting
                        this.startCasting(1); // 1 second cast time
                        
                        // Add skill effect
                        effects.push(new SkillEffect(this.x, this.y, 'Casting Brandish!', 'front'));
                        
                        // Execute after cast time
                        setTimeout(() => {
                            // Define cone parameters
                            const coneAngle = Math.PI / 3; // 60-degree cone
                            const coneRange = this.attackRange * 2;
                            
                            enemies.forEach(enemy => {
                                const dx = enemy.x - this.x;
                                const dy = enemy.y - this.y;
                                const distance = Math.hypot(dx, dy);
                                const angleToEnemy = Math.atan2(dy, dx);
                                
                                // Calculate angle difference, accounting for wraparound
                                let angleDiff = angleToEnemy - this.facing;
                                while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                                while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
                                
                                // Check if enemy is in cone
                                if (distance <= coneRange && Math.abs(angleDiff) <= coneAngle / 2) {
                                    enemy.takeDamage(this.attackDamage * 1.5, effects);
                                    effects.push(new HitEffect(enemy.x, enemy.y));
                                }
                            });
                            
                            // Visual effect for cone
                            effects.push(new ConeEffect(this.x, this.y, coneRange, this.facing, coneAngle, '#d13438'));
                        }, 1000); // Match cast time
                    } else if (this.isCasting) {
                        showMessage('Already casting a skill!');
                    } else if (this.sp < 50) {
                        showMessage('Not enough SP!');
                    }
                }
            ];
        }
        
        getClosestEnemy() {
            let closest = null;
            let closestDistance = Infinity;
            
            enemies.forEach(enemy => {
                const distance = Math.hypot(enemy.x - this.x, enemy.y - this.y);
                if (distance < closestDistance) {
                    closest = enemy;
                    closestDistance = distance;
                }
            });
            
            return closest;
        }
    }
    
    // Wizard class
    class Wizard extends Character {
        constructor(x, y) {
            super(x, y);
            this.color = '#00a4ef'; // Blue
            this.attackDamage = 40;
            this.attackRange = 300; // Wand has long range
            this.attackType = 'ranged';
            this.weapon = 'wand';
            this.fireBoltCount = 5; // Default fire bolt count
            
            // Define skills
            this.skills = [
                // Fire Bolt
                () => {
                    if (!this.isCasting && window.attackTarget) {
                        const spCost = this.fireBoltCount * 8;
                        
                        if (this.sp >= spCost) {
                            this.sp -= spCost;
                            
                            // Start casting
                            this.startCasting(this.fireBoltCount * 0.2); // 0.2 seconds per bolt cast time
                            
                            const target = window.attackTarget;
                            // Face target
                            this.facing = Math.atan2(target.y - this.y, target.x - this.x);
                            
                            // Add skill effect
                            effects.push(new SkillEffect(this.x, this.y, 'Casting Fire Bolt!', 'front'));
                            
                            // Execute after cast time
                            setTimeout(() => {
                                for (let i = 0; i < this.fireBoltCount; i++) {
                                    setTimeout(() => {
                                        target.takeDamage(this.attackDamage * 0.7, effects);
                                        effects.push(new HitEffect(target.x, target.y));
                                        
                                        // Visual projectile effect
                                        const offsetX = target.x + (Math.random() - 0.5) * 30;
                                        const offsetY = target.y + (Math.random() - 0.5) * 30;
                                        
                                        projectiles.push(new MagicProjectile(
                                            this.x,
                                            this.y,
                                            offsetX,
                                            offsetY,
                                            this.attackDamage * 0.7,
                                            400,
                                            '#ff5500'
                                        ));
                                    }, i * 200);
                                }
                            }, this.fireBoltCount * 200); // Match cast time
                        } else {
                            showMessage('Not enough SP!');
                        }
                    } else if (this.isCasting) {
                        showMessage('Already casting a skill!');
                    }
                },
                
                // Fireball
                () => {
                    if (this.sp >= 60 && !this.isCasting) {
                        this.sp -= 60;
                        
                        // Start casting
                        this.startCasting(1.5); // 1.5 second cast time
                        
                        const target = this.getClosestEnemy();
                        if (target) {
                            // Face target
                            this.facing = Math.atan2(target.y - this.y, target.x - this.x);
                            
                            // Add skill effect
                            effects.push(new SkillEffect(this.x, this.y, 'Casting Fireball!', 'front'));
                            
                            // Execute after cast time
                            setTimeout(() => {
                                projectiles.push(new FireballProjectile(
                                    this.x,
                                    this.y,
                                    target.x,
                                    target.y,
                                    this.attackDamage * 2,
                                    250
                                ));
                            }, 1500); // Match cast time
                        }
                    } else if (this.isCasting) {
                        showMessage('Already casting a skill!');
                    } else if (this.sp < 60) {
                        showMessage('Not enough SP!');
                    }
                }
            ];
        }
        
        getClosestEnemy() {
            let closest = null;
            let closestDistance = Infinity;
            
            enemies.forEach(enemy => {
                const distance = Math.hypot(enemy.x - this.x, enemy.y - this.y);
                if (distance < closestDistance && distance <= this.attackRange) {
                    closest = enemy;
                    closestDistance = distance;
                }
            });
            
            return closest;
        }
    }
    
    // Event listeners for character selection
    knightOption.addEventListener('click', function() {
        selectCharacter('knight');
    });
    
    wizardOption.addEventListener('click', function() {
        selectCharacter('wizard');
    });
    
    // Start game button
    startGameBtn.addEventListener('click', function() {
        if (selectedCharacter) {
            startGame();
        } else {
            alert('Please select a character first!');
        }
    });
    
    // Select character function
    function selectCharacter(type) {
        selectedCharacter = type;
        
        // Update UI
        knightOption.classList.remove('selected');
        wizardOption.classList.remove('selected');
        
        if (type === 'knight') {
            knightOption.classList.add('selected');
        } else {
            wizardOption.classList.add('selected');
        }
    }
    
    // Start game function
    function startGame() {
        // Hide character selection, show game screen
        characterSelection.classList.add('hidden');
        gameScreen.classList.remove('hidden');
        
        // Set canvas size
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        
        // Initialize game
        initGame();
        
        // Start game loop
        gameRunning = true;
        requestAnimationFrame(gameLoop);
    }
    
    // Resize canvas function
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    
    // Initialize game function
    function initGame() {
        console.log('Starting game with character:', selectedCharacter);
        
        // Create player based on selected character
        if (selectedCharacter === 'knight') {
            player = new Knight(canvas.width / 2, canvas.height / 2);
        } else {
            player = new Wizard(canvas.width / 2, canvas.height / 2);
        }
        
        // Spawn initial enemies (increased from 5 to 15)
        spawnEnemies(15);
        
        // Set up timer for boss spawn (reduced from 60000 to 30000 ms)
        setTimeout(spawnBoss, 30000); // 30 seconds
    }
    
    // Game loop
    function gameLoop(timestamp) {
        if (!gameRunning) return;
        
        // Calculate delta time
        const deltaTime = timestamp - lastTimestamp;
        lastTimestamp = timestamp;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Update and render game objects
        updateGame(deltaTime);
        renderGame();
        
        // Continue game loop
        requestAnimationFrame(gameLoop);
    }
    
    // Update game function
    function updateGame(deltaTime) {
        // Update player
        if (player) {
            player.update(deltaTime);
        }
        
        // Update enemies
        enemies.forEach(enemy => {
            enemy.update(deltaTime, player);
        });
        
        // Update projectiles
        projectiles.forEach(projectile => {
            projectile.update(deltaTime);
            
            // Check collisions with enemies
            enemies.forEach(enemy => {
                if (projectile.checkCollision(enemy)) {
                    enemy.takeDamage(projectile.damage);
                    projectile.onHit(enemy);
                }
            });
        });
        
        // Update effects
        effects.forEach(effect => {
            effect.update(deltaTime);
        });
        
        // Remove expired objects
        projectiles = projectiles.filter(p => !p.expired);
        effects = effects.filter(e => !e.expired);
        enemies = enemies.filter(e => {
            if (e.hp <= 0) {
                if (player) {
                    player.gainExp(e.expValue, effects);
                }
                return false;
            }
            return true;
        });
        
        // Update UI
        renderUI();
    }
    
    // Render game function
    function renderGame() {
        // Render map (simple green background for now)
        ctx.fillStyle = '#2e7d32';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Render effects (behind)
        effects.forEach(effect => {
            if (effect.renderLayer === 'behind') {
                effect.render(ctx);
            }
        });
        
        // Render enemies
        enemies.forEach(enemy => {
            enemy.render(ctx);
        });
        
        // Render player
        player.render(ctx);
        
        // Render projectiles
        projectiles.forEach(projectile => {
            projectile.render(ctx);
        });
        
        // Render effects (front)
        effects.forEach(effect => {
            if (effect.renderLayer === 'front') {
                effect.render(ctx);
            }
        });
        
        // Render UI
        renderUI();
    }
    
    // Render UI function
    function renderUI() {
        // Update character info
        document.getElementById('character-level').textContent = `Level: ${player.level}`;
        document.getElementById('character-hp').textContent = `HP: ${player.hp}/${player.maxHp}`;
        document.getElementById('character-sp').textContent = `SP: ${player.sp}/${player.maxSp}`;
        document.getElementById('character-exp').textContent = `EXP: ${player.exp}/${player.expToNextLevel}`;
        
        // Update skill names and cooldowns
        if (selectedCharacter === 'knight') {
            document.getElementById('skill-1').textContent = `1: Spiral Pierce ${player.isCasting ? '(Casting...)' : ''}`;
            document.getElementById('skill-2').textContent = `2: Brandish ${player.isCasting ? '(Casting...)' : ''}`;
        } else {
            const fireBoltText = document.getElementById('skill-1');
            if (!fireBoltText.hasAttribute('contenteditable')) {
                fireBoltText.setAttribute('contenteditable', 'true');
                fireBoltText.addEventListener('blur', function() {
                    const count = parseInt(this.textContent.match(/\d+/)?.[0] || '5');
                    player.fireBoltCount = Math.min(10, Math.max(1, count));
                    this.textContent = `1: Fire Bolt (${player.fireBoltCount}) ${player.isCasting ? '(Casting...)' : ''}`;
                });
                fireBoltText.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.blur();
                    }
                });
            }
            fireBoltText.textContent = `1: Fire Bolt (${player.fireBoltCount}) ${player.isCasting ? '(Casting...)' : ''}`;
            document.getElementById('skill-2').textContent = `2: Fireball ${player.isCasting ? '(Casting...)' : ''}`;
        }
    }
    
    // Spawn enemies function
    function spawnEnemies(count) {
        for (let i = 0; i < count; i++) {
            // Random position away from player
            let x, y;
            do {
                x = Math.random() * canvas.width;
                y = Math.random() * canvas.height;
            } while (Math.hypot(x - player.x, y - player.y) < 200);
            
            enemies.push(new Orc(x, y));
        }
    }
    
    // Spawn boss function
    function spawnBoss() {
        // Spawn boss at random position away from player
        let x, y;
        do {
            x = Math.random() * canvas.width;
            y = Math.random() * canvas.height;
        } while (Math.hypot(x - player.x, y - player.y) < 300);
        
        enemies.push(new HighOrc(x, y));
        
        // Show message
        showMessage('A High Orc has appeared!');
    }
    
    // Show message function
    function showMessage(text) {
        const messagesDiv = document.getElementById('messages');
        messagesDiv.textContent = text;
        messagesDiv.style.opacity = 1;
        
        // Fade out after 3 seconds
        setTimeout(() => {
            messagesDiv.style.opacity = 0;
        }, 3000);
    }
    
    // Input handling
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keydown', handleKeyDown);
    
    let isMouseDown = false;
    let targetX = 0;
    let targetY = 0;
    
    function handleMouseDown(e) {
        isMouseDown = true;
        const rect = canvas.getBoundingClientRect();
        targetX = e.clientX - rect.left;
        targetY = e.clientY - rect.top;
        
        // Check if clicked on enemy
        window.attackTarget = null;
        enemies.forEach(enemy => {
            if (Math.hypot(enemy.x - targetX, enemy.y - targetY) < enemy.radius) {
                window.attackTarget = enemy;
                // If a skill is selected, use it
                if (selectedSkill !== null) {
                    player.skills[selectedSkill]();
                    selectedSkill = null; // Reset selected skill
                    return;
                }
                // Move towards enemy if not in range
                const distance = Math.hypot(enemy.x - player.x, enemy.y - player.y);
                if (distance > player.attackRange) {
                    player.moveTo(enemy.x, enemy.y);
                }
            }
        });
        
        // If not clicked on enemy and no skill is selected, move to position
        if (!window.attackTarget && selectedSkill === null) {
            player.moveTo(targetX, targetY);
        } else if (selectedSkill !== null) {
            // If we clicked empty space while a skill was selected, cancel it
            selectedSkill = null;
            showMessage('Skill cancelled');
        }
    }
    
    function handleMouseMove(e) {
        if (isMouseDown && !window.attackTarget) {
            const rect = canvas.getBoundingClientRect();
            targetX = e.clientX - rect.left;
            targetY = e.clientY - rect.top;
            player.moveTo(targetX, targetY);
        }
    }
    
    function handleMouseUp() {
        isMouseDown = false;
    }
    
    function handleKeyDown(e) {
        // Number keys 1-2 for skills (instead of F-keys)
        if (e.key === '1' && !player.isCasting) {
            e.preventDefault();
            selectedSkill = 0;
            showMessage('Select a target for the skill!');
        } else if (e.key === '2' && !player.isCasting) {
            e.preventDefault();
            selectedSkill = 1;
            showMessage('Select a target for the skill!');
        }
    }
});

// Add ConeEffect class
class ConeEffect {
    constructor(x, y, radius, angle, spread, color) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.angle = angle;
        this.spread = spread;
        this.color = color;
        this.duration = 300;
        this.elapsed = 0;
        this.expired = false;
        this.renderLayer = 'front';
    }
    
    update(deltaTime) {
        this.elapsed += deltaTime;
        if (this.elapsed >= this.duration) {
            this.expired = true;
        }
    }
    
    render(ctx) {
        const opacity = 1 - (this.elapsed / this.duration);
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.arc(this.x, this.y, this.radius, 
            this.angle - this.spread/2, 
            this.angle + this.spread/2);
        ctx.lineTo(this.x, this.y);
        ctx.fillStyle = `${this.color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
        ctx.fill();
    }
}
