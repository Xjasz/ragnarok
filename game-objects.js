// Initialize global attackTarget
window.attackTarget = null;

// Enemy classes
class Enemy extends Character {
    constructor(x, y) {
        super(x, y);
        this.color = '#8b4513'; // Brown
        this.speed = 37.5; // 4 times slower than before (was 150)
        this.attackDamage = 20;
        this.attackRange = 40;
        this.attackCooldown = 2; // 2 seconds between attacks
        this.expValue = 100;
        this.target = null;
    }
    
    update(deltaTime, player) {
        super.update(deltaTime);
        
        // Find closest player
        if (!this.target || this.target.hp <= 0) {
            this.target = player;
        }
        
        // Move towards player
        if (this.target) {
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const distance = Math.hypot(dx, dy);
            
            if (distance > this.attackRange) {
                this.moveTo(this.target.x, this.target.y);
            } else if (this.attackCooldown <= 0) {
                // Attack player
                this.target.takeDamage(this.attackDamage);
                this.attackCooldown = 2;
            }
        }
    }
    
    render(ctx) {
        // Highlight if this is the attack target
        if (this === window.attackTarget) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 5, 0, Math.PI * 2);
            ctx.strokeStyle = 'yellow';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.closePath();
        }
        
        super.render(ctx);
    }
}

class Orc extends Enemy {
    constructor(x, y) {
        super(x, y);
        this.radius = 15;
        this.maxHp = 500;
        this.hp = this.maxHp;
        this.attackDamage = 30;
        this.expValue = 150;
    }
}

class HighOrc extends Enemy {
    constructor(x, y) {
        super(x, y);
        this.radius = 25;
        this.maxHp = 5000;
        this.hp = this.maxHp;
        this.attackDamage = 100;
        this.attackRange = 60;
        this.speed = 150;
        this.expValue = 1000;
        this.color = '#8b0000'; // Dark red
        this.specialAttackCooldown = 0;
    }
    
    update(deltaTime, player) {
        super.update(deltaTime, player);
        
        // Special attack
        if (this.specialAttackCooldown > 0) {
            this.specialAttackCooldown -= deltaTime / 1000;
        } else if (this.target && Math.hypot(this.target.x - this.x, this.target.y - this.y) <= this.attackRange * 2) {
            // Ground slam attack
            this.specialAttack();
            this.specialAttackCooldown = 5; // 5 seconds
        }
    }
    
    specialAttack() {
        // Deal damage to all enemies in range
        window.enemies.forEach(enemy => {
            if (enemy !== this) {
                const distance = Math.hypot(enemy.x - this.x, enemy.y - this.y);
                if (distance <= this.attackRange * 2) {
                    enemy.takeDamage(this.attackDamage * 0.5);
                    window.effects.push(new HitEffect(enemy.x, enemy.y));
                }
            }
        });
        
        // Add ground slam effect
        window.effects.push(new AreaEffect(this.x, this.y, this.attackRange * 2, '#8b0000'));
    }
}

// Projectile classes
class Projectile {
    constructor(x, y, targetX, targetY, damage, speed, color) {
        this.x = x;
        this.y = y;
        this.targetX = targetX;
        this.targetY = targetY;
        this.damage = damage;
        this.speed = speed;
        this.color = color;
        this.radius = 5;
        this.expired = false;
        
        // Calculate direction
        const dx = targetX - x;
        const dy = targetY - y;
        const distance = Math.hypot(dx, dy);
        this.directionX = dx / distance;
        this.directionY = dy / distance;
    }
    
    update(deltaTime) {
        const dt = deltaTime / 1000;
        
        // Move projectile
        this.x += this.directionX * this.speed * dt;
        this.y += this.directionY * this.speed * dt;
        
        // Check if projectile is out of bounds
        if (this.x < 0 || this.x > window.gameCanvas.width || 
            this.y < 0 || this.y > window.gameCanvas.height) {
            this.expired = true;
        }
    }
    
    render(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
    }
    
    checkCollision(target) {
        const distance = Math.hypot(target.x - this.x, target.y - this.y);
        return distance <= target.radius + this.radius;
    }
    
    onHit(target) {
        this.expired = true;
    }
}

class MagicProjectile extends Projectile {
    constructor(x, y, targetX, targetY, damage, speed, color) {
        super(x, y, targetX, targetY, damage, speed, color);
        this.radius = 3;
    }
}

class FireballProjectile extends Projectile {
    constructor(x, y, targetX, targetY, damage, speed) {
        super(x, y, targetX, targetY, damage, speed, '#ff5500');
        this.radius = 8;
        this.explosionRadius = 50;
    }
    
    onHit(target) {
        // Deal damage to all enemies in explosion radius
        enemies.forEach(enemy => {
            const distance = Math.hypot(enemy.x - this.x, enemy.y - this.y);
            if (distance <= this.explosionRadius) {
                enemy.takeDamage(this.damage * 0.5);
                effects.push(new HitEffect(enemy.x, enemy.y));
            }
        });
        
        // Add explosion effect
        effects.push(new AreaEffect(this.x, this.y, this.explosionRadius, '#ff5500'));
        
        this.expired = true;
    }
}

// Effect classes
class Effect {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.expired = false;
        this.renderLayer = 'front';
    }
    
    update(deltaTime) {
        // Override in subclasses
    }
    
    render(ctx) {
        // Override in subclasses
    }
}

class HitEffect extends Effect {
    constructor(x, y) {
        super(x, y);
        this.radius = 10;
        this.maxRadius = 20;
        this.currentRadius = this.radius;
        this.duration = 0.3; // seconds
        this.timeLeft = this.duration;
    }
    
    update(deltaTime) {
        const dt = deltaTime / 1000;
        this.timeLeft -= dt;
        
        if (this.timeLeft <= 0) {
            this.expired = true;
        } else {
            // Expand effect
            this.currentRadius = this.radius + (this.maxRadius - this.radius) * (1 - this.timeLeft / this.duration);
        }
    }
    
    render(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.currentRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.closePath();
    }
}

class DamageNumber extends Effect {
    constructor(x, y, amount, color = '#ff0000') {
        super(x, y);
        this.amount = amount;
        this.color = color;
        this.yOffset = 0;
        this.opacity = 1;
        this.duration = 1; // seconds
        this.timeLeft = this.duration;
    }
    
    update(deltaTime) {
        const dt = deltaTime / 1000;
        this.timeLeft -= dt;
        
        if (this.timeLeft <= 0) {
            this.expired = true;
        } else {
            // Move up and fade out
            this.yOffset -= 50 * dt;
            this.opacity = this.timeLeft / this.duration;
        }
    }
    
    render(ctx) {
        ctx.fillStyle = this.color.replace(')', `, ${this.opacity})`).replace('rgb', 'rgba');
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.amount, this.x, this.y + this.yOffset);
    }
}

class ExpNumber extends Effect {
    constructor(x, y, amount) {
        super(x, y);
        this.amount = amount;
        this.yOffset = 0;
        this.opacity = 1;
        this.duration = 1; // seconds
        this.timeLeft = this.duration;
    }
    
    update(deltaTime) {
        const dt = deltaTime / 1000;
        this.timeLeft -= dt;
        
        if (this.timeLeft <= 0) {
            this.expired = true;
        } else {
            // Move up and fade out
            this.yOffset -= 50 * dt;
            this.opacity = this.timeLeft / this.duration;
        }
    }
    
    render(ctx) {
        ctx.fillStyle = `rgba(255, 255, 0, ${this.opacity})`;
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`+${this.amount} EXP`, this.x, this.y + this.yOffset);
    }
}

class LevelUpEffect extends Effect {
    constructor(x, y) {
        super(x, y);
        this.radius = 20;
        this.maxRadius = 40;
        this.currentRadius = this.radius;
        this.duration = 1; // seconds
        this.timeLeft = this.duration;
    }
    
    update(deltaTime) {
        const dt = deltaTime / 1000;
        this.timeLeft -= dt;
        
        if (this.timeLeft <= 0) {
            this.expired = true;
        } else {
            // Expand effect
            this.currentRadius = this.radius + (this.maxRadius - this.radius) * (1 - this.timeLeft / this.duration);
        }
    }
    
    render(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.currentRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.closePath();
    }
}

class AreaEffect extends Effect {
    constructor(x, y, radius, color) {
        super(x, y);
        this.radius = radius;
        this.color = color;
        this.opacity = 0.5;
        this.duration = 0.5; // seconds
        this.timeLeft = this.duration;
    }
    
    update(deltaTime) {
        const dt = deltaTime / 1000;
        this.timeLeft -= dt;
        
        if (this.timeLeft <= 0) {
            this.expired = true;
        } else {
            // Fade out
            this.opacity = 0.5 * (this.timeLeft / this.duration);
        }
    }
    
    render(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color.replace(')', `, ${this.opacity})`).replace('rgb', 'rgba');
        ctx.fill();
        ctx.closePath();
    }
}

class CastingEffect extends Effect {
    constructor(x, y, duration) {
        super(x, y);
        this.radius = 15;
        this.duration = duration / 1000; // Convert ms to seconds
        this.timeLeft = this.duration;
        this.angle = 0;
    }
    
    update(deltaTime) {
        const dt = deltaTime / 1000;
        this.timeLeft -= dt;
        
        if (this.timeLeft <= 0) {
            this.expired = true;
        } else {
            // Rotate effect
            this.angle += Math.PI * 2 * dt;
        }
    }
    
    render(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, this.angle, this.angle + Math.PI * 0.5);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.closePath();
    }
}

class SkillEffect extends Effect {
    constructor(x, y, text, layer) {
        super(x, y);
        this.text = text;
        this.renderLayer = layer;
        this.yOffset = 0;
        this.opacity = 1;
        this.duration = 1; // seconds
        this.timeLeft = this.duration;
    }
    
    update(deltaTime) {
        const dt = deltaTime / 1000;
        this.timeLeft -= dt;
        
        if (this.timeLeft <= 0) {
            this.expired = true;
        } else {
            // Move up and fade out
            this.yOffset -= 30 * dt;
            this.opacity = this.timeLeft / this.duration;
        }
    }
    
    render(ctx) {
        ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.text, this.x, this.y + this.yOffset);
    }
} 