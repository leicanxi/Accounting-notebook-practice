// 小球生成器：随机位置、颜色、补充逻辑、避开糖豆人

const Spawner = {
  minBalls: 5,
  maxBalls: 8,
  maxGoldBalls: 2,
  goldProbability: 0.2,

  initialSpawn() {
    const balls = [];
    const count = this.minBalls + Math.floor(Math.random() * (this.maxBalls - this.minBalls + 1));
    const goldCount = Math.floor(count * this.goldProbability);

    for (let i = 0; i < count; i++) {
      const isGold = i < goldCount;
      const ball = this.createRandomBall(isGold);
      balls.push(ball);
    }

    BallManager.init(balls);
  },

  createRandomBall(isGold = false) {
    const margin = 60;
    const x = margin + Math.random() * (GameLoop.width - margin * 2);
    const y = margin + Math.random() * (GameLoop.height - margin * 2);
    const color = isGold ? GOLD_COLOR : BALL_COLORS[Math.floor(Math.random() * BALL_COLORS.length)];
    return new Ball(x, y, color, isGold);
  },

  checkAndSpawn() {
    const activeCount = BallManager.getActiveCount();
    if (activeCount >= this.minBalls) return;

    const need = this.maxBalls - activeCount;
    for (let i = 0; i < need; i++) {
      const isGold = Math.random() < this.goldProbability && this.getGoldCount() < this.maxGoldBalls;
      const ball = this.createRandomBallAwayFromCharacter(isGold);
      BallManager.add(ball);
    }
  },

  createRandomBallAwayFromCharacter(isGold = false) {
    let attempts = 0;
    let x, y;
    do {
      const margin = 60;
      x = margin + Math.random() * (GameLoop.width - margin * 2);
      y = margin + Math.random() * (GameLoop.height - margin * 2);
      attempts++;
    } while (attempts < 50 &&
      (Math.abs(x - Character.x) < 80 && Math.abs(y - Character.y) < 80));

    const color = isGold ? GOLD_COLOR : BALL_COLORS[Math.floor(Math.random() * BALL_COLORS.length)];
    return new Ball(x, y, color, isGold);
  },

  getGoldCount() {
    return BallManager.balls.filter(b => b.isGold && !b.eaten).length;
  },

  respawnOnResize() {
    // 移除屏幕外的小球
    BallManager.balls = BallManager.balls.filter(b => {
      return b.x >= 0 && b.x <= GameLoop.width && b.y >= 0 && b.y <= GameLoop.height;
    });
    // 补充不足
    this.checkAndSpawn();
  }
};

window.Spawner = Spawner;
