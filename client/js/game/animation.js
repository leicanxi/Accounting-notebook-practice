// 进食动画：飞行、爆炸星星、打嗝
// 使用粒子池复用

const PARTICLE_POOL_SIZE = 30;

class Particle {
  constructor() {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.life = 0;
    this.maxLife = 0;
    this.color = '';
    this.size = 4;
  }

  spawn(x, y, angle, speed, color) {
    this.active = true;
    this.x = x;
    this.y = y;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = 1.0;
    this.maxLife = 0.6;
    this.color = color;
    this.size = 3 + Math.random() * 3;
  }

  update(dt) {
    if (!this.active) return;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vy += 80 * dt; // 轻微重力
    this.life -= dt / this.maxLife;
    if (this.life <= 0) {
      this.active = false;
    }
  }

  draw(ctx) {
    if (!this.active) return;
    const alpha = Math.max(0, this.life);
    const s = this.size * alpha;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(this.x, this.y);

    // 简单五角星
    ctx.fillStyle = this.color;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 72 - 90) * Math.PI / 180;
      const innerAngle = ((i * 72) + 36 - 90) * Math.PI / 180;
      if (i === 0) ctx.moveTo(Math.cos(angle) * s, Math.sin(angle) * s);
      else ctx.lineTo(Math.cos(angle) * s, Math.sin(angle) * s);
      ctx.lineTo(Math.cos(innerAngle) * s * 0.4, Math.sin(innerAngle) * s * 0.4);
    }
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}

const AnimationManager = {
  particlePool: [],
  activeAnimation: null,

  // 动画状态
  gameState: null,       // null | 'open_mouth' | 'ball_flying' | 'explode' | 'burp'
  animTimer: 0,
  currentBall: null,
  burpOffset: 0,

  init() {
    // 初始化粒子池
    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      this.particlePool.push(new Particle());
    }
  },

  startEating(character, ball) {
    this.currentBall = ball;
    this.gameState = 'open_mouth';
    this.animTimer = 0;
    this.burpOffset = 0;
  },

  update(dt) {
    if (!this.gameState) return;

    this.animTimer += dt;

    // 爆炸粒子更新
    this.particlePool.forEach(p => p.update(dt));

    switch (this.gameState) {
      case 'open_mouth':
        Character.mouthOpen = true;
        if (this.animTimer >= 0.3) {
          this.gameState = 'ball_flying';
          this.animTimer = 0;
          if (this.currentBall) {
            this.currentBall.startFlying(Character.x, Character.y);
          }
        }
        break;

      case 'ball_flying':
        if (!this.currentBall || this.currentBall.eaten) {
          this.gameState = 'explode';
          this.animTimer = 0;
          this.spawnExplosion(Character.x, Character.y);
        }
        break;

      case 'explode':
        Character.mouthOpen = true;
        if (this.animTimer >= 0.5) {
          this.gameState = 'burp';
          this.animTimer = 0;
          Character.mouthOpen = false;
        }
        break;

      case 'burp':
        this.burpOffset = Math.sin(this.animTimer * 15) * 10 * Math.max(0, 1 - this.animTimer / 0.2);
        Character.y -= this.burpOffset;
        // 实际在draw中需要偏移，这里简化
        if (this.animTimer >= 0.3) {
          this.burpOffset = 0;
          this.gameState = null;
          this.saveBill();
          Character.onEatingDone();
        }
        break;
    }
  },

  spawnExplosion(x, y) {
    const colors = ['#FFD43B', '#FFA94D', '#FF6B6B', '#FFFFFF', '#FFE066'];
    const count = 12 + Math.floor(Math.random() * 5);
    let spawned = 0;

    for (const p of this.particlePool) {
      if (spawned >= count) break;
      if (!p.active) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 80 + Math.random() * 120;
        const color = colors[Math.floor(Math.random() * colors.length)];
        p.spawn(x, y, angle, speed, color);
        spawned++;
      }
    }
  },

  async saveBill() {
    if (!this.currentBall) return;
    const ball = this.currentBall;

    // 乐观更新
    if (ball.type === 'expense') {
      GameLoop.addExpense(ball.amount);
    }

    try {
      await api.createBill({
        category_id: ball.categoryId,
        type: ball.type,
        amount: ball.amount,
        note: ''
      });
    } catch (e) {
      // API 失败则回滚乐观更新
      if (ball.type === 'expense') {
        GameLoop.addExpense(-ball.amount);
      }
      showToast('网络异常，请稍后重试', 'error');
    }

    this.currentBall = null;
  },

  draw(ctx) {
    this.particlePool.forEach(p => p.draw(ctx));
  }
};

window.AnimationManager = AnimationManager;
