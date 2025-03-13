class Knight extends Character {
    constructor(x, y) {
        super(x, y);
        this.color = '#4169e1'; // Royal blue
        this.attackDamage = 60;
        this.attackRange = 50;
        this.skills = [
            {
                name: 'Regular Attack',
                key: 'F1',
                damage: this.attackDamage,
                spCost: 0,
                cooldown: 0.5,
                currentCooldown: 0
            },
            {
                name: 'Spiral Pierce',
                key: 'F2',
                damage: this.attackDamage * 1.5,
                spCost: 50,
                cooldown: 5,
                currentCooldown: 0,
                hits: 3
            },
            {
                name: 'Brandish',
                key: 'F3',
                damage: this.attackDamage * 2,
                spCost: 100,
                cooldown: 10,
                currentCooldown: 0,
                radius: 100
            }
        ];
    }
    
    useSkill(skillIndex) {
        const skill = this.skills[skillIndex];
        if (!skill || skill.currentCooldown > 0 || this.sp < skill.spCost) return false;
        
        this.sp -= skill.spCost;
        skill.currentCooldown = skill.cooldown;
        
        switch (skillIndex) {
            case 0: // Regular Attack
                if (this.target) {
                    this.target.takeDamage(skill.damage);
                    effects.push(new HitEffect(this.target.x, this.target.y));
                }
                break;
                
            case 1: // Spiral Pierce
                if (this.target) {
                    for (let i = 0; i < skill.hits; i++) {
                        setTimeout(() => {
                            this.target.takeDamage(skill.damage);
                            effects.push(new HitEffect(this.target.x, this.target.y));
                        }, i * 200);
                    }
                    effects.push(new SkillEffect(this.x, this.y, 'Spiral Pierce!', 'front'));
                }
                break;
                
            case 2: // Brandish
                enemies.forEach(enemy => {
                    const distance = Math.hypot(enemy.x - this.x, enemy.y - this.y);
                    if (distance <= skill.radius) {
                        enemy.takeDamage(skill.damage);
                        effects.push(new HitEffect(enemy.x, enemy.y));
                    }
                });
                effects.push(new AreaEffect(this.x, this.y, skill.radius, '#4169e1'));
                effects.push(new SkillEffect(this.x, this.y, 'Brandish!', 'front'));
                break;
        }
        
        return true;
    }
    
    findTarget() {
        let closest = null;
        let minDistance = Infinity;
        
        enemies.forEach(enemy => {
            const distance = Math.hypot(enemy.x - this.x, enemy.y - this.y);
            if (distance < minDistance) {
                minDistance = distance;
                closest = enemy;
            }
        });
        
        this.target = closest;
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        
        // Update skill cooldowns
        this.skills.forEach(skill => {
            if (skill.currentCooldown > 0) {
                skill.currentCooldown -= deltaTime / 1000;
            }
        });
        
        // Find closest enemy
        this.findTarget();
        
        // Auto-attack if in range
        if (this.target && this.attackCooldown <= 0) {
            const distance = Math.hypot(this.target.x - this.x, this.target.y - this.y);
            if (distance <= this.attackRange) {
                this.target.takeDamage(this.attackDamage);
                this.attackCooldown = 0.5;
                effects.push(new HitEffect(this.target.x, this.target.y));
            }
        }
    }
}

class Wizard extends Character {
    constructor(x, y) {
        super(x, y);
        this.color = '#ff69b4'; // Hot pink
        this.attackDamage = 40;
        this.attackRange = 200;
        this.skills = [
            {
                name: 'Regular Attack',
                key: 'F1',
                damage: this.attackDamage,
                spCost: 0,
                cooldown: 0.5,
                currentCooldown: 0
            },
            {
                name: 'Fire Bolt',
                key: 'F2',
                damage: this.attackDamage * 1.2,
                spCost: 30,
                cooldown: 3,
                currentCooldown: 0,
                bolts: 5
            },
            {
                name: 'Fireball',
                key: 'F3',
                damage: this.attackDamage * 3,
                spCost: 80,
                cooldown: 8,
                currentCooldown: 0,
                radius: 100
            }
        ];
    }
    
    useSkill(skillIndex) {
        const skill = this.skills[skillIndex];
        if (!skill || skill.currentCooldown > 0 || this.sp < skill.spCost) return false;
        
        this.sp -= skill.spCost;
        skill.currentCooldown = skill.cooldown;
        
        switch (skillIndex) {
            case 0: // Regular Attack
                if (this.target) {
                    projectiles.push(new MagicProjectile(
                        this.x,
                        this.y,
                        this.target.x,
                        this.target.y,
                        skill.damage,
                        300,
                        '#ff69b4'
                    ));
                }
                break;
                
            case 1: // Fire Bolt
                if (this.target) {
                    for (let i = 0; i < skill.bolts; i++) {
                        setTimeout(() => {
                            projectiles.push(new MagicProjectile(
                                this.x,
                                this.y,
                                this.target.x + (Math.random() - 0.5) * 50,
                                this.target.y + (Math.random() - 0.5) * 50,
                                skill.damage,
                                400,
                                '#ff4500'
                            ));
                        }, i * 100);
                    }
                    effects.push(new SkillEffect(this.x, this.y, 'Fire Bolt!', 'front'));
                }
                break;
                
            case 2: // Fireball
                if (this.target) {
                    projectiles.push(new FireballProjectile(
                        this.x,
                        this.y,
                        this.target.x,
                        this.target.y,
                        skill.damage,
                        200
                    ));
                    effects.push(new SkillEffect(this.x, this.y, 'Fireball!', 'front'));
                }
                break;
        }
        
        return true;
    }
    
    findTarget() {
        let closest = null;
        let minDistance = Infinity;
        
        enemies.forEach(enemy => {
            const distance = Math.hypot(enemy.x - this.x, enemy.y - this.y);
            if (distance < minDistance) {
                minDistance = distance;
                closest = enemy;
            }
        });
        
        this.target = closest;
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        
        // Update skill cooldowns
        this.skills.forEach(skill => {
            if (skill.currentCooldown > 0) {
                skill.currentCooldown -= deltaTime / 1000;
            }
        });
        
        // Find closest enemy
        this.findTarget();
        
        // Auto-attack if in range
        if (this.target && this.attackCooldown <= 0) {
            const distance = Math.hypot(this.target.x - this.x, this.target.y - this.y);
            if (distance <= this.attackRange) {
                projectiles.push(new MagicProjectile(
                    this.x,
                    this.y,
                    this.target.x,
                    this.target.y,
                    this.attackDamage,
                    300,
                    '#ff69b4'
                ));
                this.attackCooldown = 0.5;
            }
        }
    }
} 