// 进食动画：吃豆人吃豆 → 豆子闪光消失 → 保存账单

const AnimationManager = {
  gameState: null,       // null | 'eating' | 'done'
  animTimer: 0,
  currentBall: null,
  particles: [],

  init() {},

  startEating(character, ball) {
    this.currentBall = ball;
    this.gameState = 'eating';
    this.animTimer = 0;
    ball.startEatAnim();
    this.spawnSimpleParticles(ball.x, ball.y, ball.isGold);
  },

  update(dt) {
    if (!this.gameState || !this.currentBall) return;

    this.animTimer += dt;

    // 更新粒子
    this.particles.forEach(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    });
    this.particles = this.particles.filter(p => p.life > 0);

    switch (this.gameState) {
      case 'eating':
        // 豆子闪烁动画
        const done = this.currentBall.updateEatAnim(dt);
        if (this.animTimer >= 0.25) {
          this.gameState = 'done';
        }
        break;
      case 'done':
        this.saveBill();
        Character.onEatingDone();
        this.gameState = null;
        this.currentBall = null;
        break;
    }
  },

  spawnSimpleParticles(x, y, isGold) {
    const colors = isGold
      ? ['#FFD700', '#FFA500', '#FFFFFF', '#FFE066']
      : ['#FFFFFF', '#FFD43B', '#FFA94D', '#FF6B6B'];
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 60;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 30,
        life: 0.3 + Math.random() * 0.3,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 2 + Math.random() * 3
      });
    }
  },

  async saveBill() {
    if (!this.currentBall) return;
    const ball = this.currentBall;

    if (ball.type === 'expense') {
      GameLoop.addExpense(ball.amount);
    }

    try {
      await api.createBill({
        category_id: ball.categoryId,
        type: ball.type,
        amount: ball.amount,
        note: '',
        created_at: ball.billDate || null
      });
    } catch (e) {
      if (ball.type === 'expense') {
        GameLoop.addExpense(-ball.amount);
      }
      showToast('网络异常，请稍后重试', 'error');
    }
  },

  draw(ctx) {
    this.particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life * 3);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * Math.max(0, p.life * 2), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }
};

window.AnimationManager = AnimationManager;
