class Character {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 20;
        this.speed = 200;
        this.maxHp = 1000;
        this.hp = this.maxHp;
        this.maxSp = 500;
        this.sp = this.maxSp;
        this.level = 20;
        this.exp = 0;
        this.expToNextLevel = 1000;
        this.attackDamage = 50;
        this.attackRange = 40;
        this.attackCooldown = 0;
        this.skills = [];
        this.target = null;
        this.isMoving = false;
        this.moveTarget = null;
    }
    
    update(deltaTime) {
        const dt = deltaTime / 1000;
        
        // Update cooldowns
        if (this.attackCooldown > 0) {
            this.attackCooldown -= dt;
        }
        
        // Update SP regeneration
        if (this.sp < this.maxSp) {
            this.sp = Math.min(this.maxSp, this.sp + 10 * dt);
        }
        
        // Handle movement
        if (this.isMoving && this.moveTarget) {
            this.moveTo(this.moveTarget.x, this.moveTarget.y);
        }
    }
    
    moveTo(targetX, targetY) {
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const distance = Math.hypot(dx, dy);
        
        if (distance > 1) {
            const speed = this.speed * (1/60); // Convert speed to per-frame
            const moveX = (dx / distance) * speed;
            const moveY = (dy / distance) * speed;
            
            this.x += moveX;
            this.y += moveY;
        } else {
            this.isMoving = false;
            this.moveTarget = null;
        }
    }
    
    takeDamage(amount, effects) {
        this.hp = Math.max(0, this.hp - amount);
        if (effects) {
            effects.push(new DamageNumber(this.x, this.y, amount));
        }
        
        if (this.hp <= 0) {
            this.die();
        }
    }
    
    heal(amount, effects) {
        this.hp = Math.min(this.maxHp, this.hp + amount);
        if (effects) {
            effects.push(new DamageNumber(this.x, this.y, amount, '#00ff00'));
        }
    }
    
    gainExp(amount, effects) {
        this.exp += amount;
        if (effects) {
            effects.push(new ExpNumber(this.x, this.y, amount));
        }
        
        // Level up if enough exp
        if (this.exp >= this.expToNextLevel) {
            this.levelUp(effects);
        }
    }
    
    levelUp(effects) {
        this.level++;
        this.exp -= this.expToNextLevel;
        this.expToNextLevel = Math.floor(this.expToNextLevel * 1.5);
        
        // Increase stats
        this.maxHp += 100;
        this.hp = this.maxHp;
        this.maxSp += 50;
        this.sp = this.maxSp;
        this.attackDamage += 10;
        
        if (effects) {
            effects.push(new LevelUpEffect(this.x, this.y));
            showMessage(`Level Up! You are now level ${this.level}!`);
        }
    }
    
    die() {
        // Override in subclasses
    }
    
    render(ctx) {
        // Draw character
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
        
        // Draw health bar
        const healthBarWidth = this.radius * 2;
        const healthBarHeight = 5;
        const healthBarX = this.x - this.radius;
        const healthBarY = this.y - this.radius - 10;
        
        ctx.fillStyle = '#333';
        ctx.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
        
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(healthBarX, healthBarY, healthBarWidth * (this.hp / this.maxHp), healthBarHeight);
        
        // Draw SP bar
        ctx.fillStyle = '#333';
        ctx.fillRect(healthBarX, healthBarY - 8, healthBarWidth, 3);
        
        ctx.fillStyle = '#0000ff';
        ctx.fillRect(healthBarX, healthBarY - 8, healthBarWidth * (this.sp / this.maxSp), 3);
    }
} 