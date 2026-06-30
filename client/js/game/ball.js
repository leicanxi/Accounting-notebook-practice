// 小球：绘制、状态、命中检测
// 彩色小球（支出）+ 金色小球（收入）

const BALL_COLORS = ['#FF6B6B', '#FFA94D', '#FFD43B', '#69DB7C', '#74C0FC', '#DA77F2'];
const GOLD_COLOR = '#FFD700';
const GOLD_CONFIGURED = '#DAA520';

class Ball {
  constructor(x, y, color, isGold = false) {
    this.x = x;
    this.y = y;
    this.radius = 25;
    this.configuredRadius = 32;
    this.color = color;
    this.isGold = isGold;
    this.configured = false;
    this.amount = 0;
    this.categoryId = null;
    this.categoryIcon = '';
    this.categoryName = '';
    this.type = isGold ? 'income' : 'expense';
    this.eaten = false;
    this.flying = false;
    this.flyProgress = 0;
    this.flyStart = null;
    this.flyEnd = null;
    this.flyControl = null;
    this.pulsePhase = Math.random() * Math.PI * 2;
  }

  configure(amount, categoryId, categoryIcon, categoryName) {
    this.amount = amount;
    this.categoryId = categoryId;
    this.categoryIcon = categoryIcon;
    this.configured = true;
    if (!this.isGold) {
      this.categoryName = categoryName;
    }
  }

  hitTest(mx, my) {
    if (this.eaten || this.flying) return false;
    const dx = mx - this.x;
    const dy = my - this.y;
    const r = this.configured ? this.configuredRadius : this.radius;
    return (dx * dx + dy * dy) <= (r * r);
  }

  update(dt) {
    if (this.eaten) return;
    this.pulsePhase += dt * 2;
    if (this.flying) {
      this.flyProgress += dt * 3;
      if (this.flyProgress >= 1) {
        this.flyProgress = 1;
        this.eaten = true;
      }
      const t = this.easeOutCubic(this.flyProgress);
      // 贝塞尔曲线: B(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2
      const mt = 1 - t;
      this.x = mt * mt * this.flyStart.x + 2 * mt * t * this.flyControl.x + t * t * this.flyEnd.x;
      this.y = mt * mt * this.flyStart.y + 2 * mt * t * this.flyControl.y + t * t * this.flyEnd.y;
    }
  }

  easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  startFlying(targetX, targetY) {
    this.flying = true;
    this.flyProgress = 0;
    this.flyStart = { x: this.x, y: this.y };
    this.flyEnd = { x: targetX, y: targetY - 20 };
    // 控制点在目标侧上方
    const mx = (this.flyStart.x + this.flyEnd.x) / 2;
    const my = Math.min(this.flyStart.y, this.flyEnd.y) - 60;
    this.flyControl = { x: mx, y: my };
  }

  draw(ctx) {
    if (this.eaten) return;

    const r = this.configured ? this.configuredRadius : this.radius;
    const pulse = 1 + Math.sin(this.pulsePhase) * 0.05;

    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.isGold) {
      // 金色小球 - 光泽渐变
      const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r * pulse);
      grad.addColorStop(0, '#FFF8DC');
      grad.addColorStop(0.4, this.configured ? GOLD_CONFIGURED : GOLD_COLOR);
      grad.addColorStop(1, this.configured ? '#B8860B' : '#DAA520');
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = this.getConfiguredColor();
    }

    ctx.beginPath();
    ctx.arc(0, 0, r * pulse, 0, Math.PI * 2);
    ctx.fill();

    // 高光
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.arc(-r * 0.25, -r * 0.3, r * 0.3, 0, Math.PI * 2);
    ctx.fill();

    // 配置后显示金额
    if (this.configured) {
      const displayAmount = this.isGold
        ? `+${this.amount}`
        : `${this.amount}`;
      ctx.fillStyle = this.isGold ? '#4A3728' : '#FFFFFF';
      ctx.font = 'bold 16px "Segoe UI","PingFang SC",sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(displayAmount, 0, 0);
    }

    ctx.restore();
  }

  getConfiguredColor() {
    if (!this.configured) return this.color;
    // 加深 20%（HSL 调整 L 分量）
    const hex = this.color;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const factor = 0.7;
    return `rgb(${Math.round(r * factor)},${Math.round(g * factor)},${Math.round(b * factor)})`;
  }
}

const BallManager = {
  balls: [],

  init(ballDataList) {
    this.balls = ballDataList;
  },

  add(ball) {
    this.balls.push(ball);
  },

  remove(ball) {
    const idx = this.balls.indexOf(ball);
    if (idx >= 0) this.balls.splice(idx, 1);
  },

  getConfigured() {
    return this.balls.filter(b => b.configured && !b.eaten && !b.flying);
  },

  getActive() {
    return this.balls.filter(b => !b.eaten);
  },

  getActiveCount() {
    return this.balls.filter(b => !b.eaten && !b.flying).length;
  },

  onClick(x, y) {
    // 逆序检查（上层优先）
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const ball = this.balls[i];
      if (ball.hitTest(x, y) && !ball.configured) {
        Panel.open(ball, x, y);
        return;
      }
    }
  },

  updateAll(dt) {
    this.balls.forEach(b => b.update(dt));
    // 清理被吃掉的小球
    this.balls = this.balls.filter(b => !b.eaten);
  },

  drawAll(ctx) {
    this.balls.forEach(b => b.draw(ctx));
  }
};

window.Ball = Ball;
window.BallManager = BallManager;
