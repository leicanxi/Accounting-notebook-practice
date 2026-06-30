// 游戏主界面初始化

const GamePage = {
  async init() {
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';

    GameLoop.init();
    Character.init();
    AnimationManager.init();
    await Panel.init();
    Spawner.initialSpawn();

    // 加载用户币种偏好和年度花费
    await this.loadUserSettings();

    GameLoop.start();

    // 窗口大小提示
    this.checkWindowSize();
    window.addEventListener('resize', () => this.checkWindowSize());
  },

  async loadUserSettings() {
    try {
      // 获取年度总消费
      const now = new Date();
      const currentYear = now.getFullYear();
      const summary = await api.getSummary({ period: `${currentYear}-01`, granularity: 'month' });
      // 获取全年支出
      let yearExpense = 0;
      for (let m = 1; m <= now.getMonth() + 1; m++) {
        const month = `${currentYear}-${String(m).padStart(2, '0')}`;
        try {
          const data = await api.getSummary({ period: month, granularity: 'month' });
          yearExpense += data.expense_total;
        } catch (e) { /* ignore */ }
      }
      GameLoop.setAnnualExpense(yearExpense);
    } catch (e) {
      console.warn('加载用户设置失败:', e);
    }
  },

  checkWindowSize() {
    const warning = document.getElementById('size-warning');
    if (window.innerWidth < 1024) {
      warning.style.display = 'block';
    } else {
      warning.style.display = 'none';
    }
  },

  destroy() {
    GameLoop.stop();
  }
};

window.GamePage = GamePage;
