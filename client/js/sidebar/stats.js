// 统计页：Canvas 饼图绘制、时间轴、环比信息

const PIE_COLORS = ['#FF6B6B', '#FFA94D', '#FFD43B', '#69DB7C', '#74C0FC', '#DA77F2', '#FF8787', '#FFC078', '#FFE066', '#8CE99A'];

const SidebarStats = {
  periodMode: 'month', // month | week

  async render(container) {
    container.innerHTML = `<div class="loading">加载中...</div>`;

    container.innerHTML = `
      <div class="timeline-controls">
        <button class="${this.periodMode === 'month' ? 'active' : ''}" data-gran="month">本月</button>
        <button class="${this.periodMode === 'week' ? 'active' : ''}" data-gran="week">本周</button>
      </div>
      <div id="stats-summary"></div>
      <canvas id="pie-canvas" width="280" height="280"></canvas>
      <div id="pie-legend" class="stats-legend"></div>
      <div id="change-indicator" class="change-indicator"></div>
      <div id="timeline-section" style="margin-top:16px;">
        <h4 style="margin-bottom:8px;">消费趋势</h4>
        <div id="timeline-slider" style="overflow-x:auto;padding:4px 0;"></div>
      </div>
    `;

    // 绑定粒度切换
    container.querySelectorAll('[data-gran]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.periodMode = btn.dataset.gran;
        this.render(container);
      });
    });

    await this.loadData(container);
  },

  async loadData(container) {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const weekNum = SidebarBills.getWeekNumber(now);
    const week = `${now.getFullYear()}-W${weekNum}`;

    try {
      // 汇总
      const summaryParams = this.periodMode === 'month'
        ? { period: month, granularity: 'month' }
        : { period: week, granularity: 'week' };
      const summary = await api.getSummary(summaryParams);

      const summaryEl = container.querySelector('#stats-summary');
      summaryEl.innerHTML = `
        <div style="display:flex;justify-content:space-around;padding:8px 0;">
          <div style="text-align:center;"><div style="font-size:12px;color:#999;">收入</div><div style="font-weight:700;color:#69DB7C;">+${summary.income_total.toFixed(2)}</div></div>
          <div style="text-align:center;"><div style="font-size:12px;color:#999;">支出</div><div style="font-weight:700;color:#FF6B6B;">-${summary.expense_total.toFixed(2)}</div></div>
        </div>
      `;

      // 环比
      const changeEl = container.querySelector('#change-indicator');
      if (summary.change_percent !== null) {
        const isUp = summary.change_percent > 0;
        changeEl.innerHTML = `比上${this.periodMode === 'month' ? '月' : '周'} <span class="${isUp ? 'up' : 'down'}">${isUp ? '+' : ''}${summary.change_percent}%</span>`;
      } else {
        changeEl.innerHTML = '暂无环比数据';
      }

      // 饼图
      const pieParams = this.periodMode === 'month' ? { month } : { week };
      const pieData = await api.getCategoryPie(pieParams);
      this.drawPieChart(container.querySelector('#pie-canvas'), pieData, container.querySelector('#pie-legend'));

      // 时间轴
      const timelineData = await api.getTimeline({
        start: `${now.getFullYear() - 1}-01`,
        end: `${now.getFullYear()}-12`,
        granularity: 'month'
      });
      this.renderTimeline(container.querySelector('#timeline-slider'), timelineData);
    } catch (e) {
      container.innerHTML = `<div class="empty-state"><p>加载统计数据失败</p></div>`;
    }
  },

  drawPieChart(canvas, data, legendEl) {
    const ctx = canvas.getContext('2d');
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = 100;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (data.length === 0) {
      ctx.fillStyle = '#E0D0C0';
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#999';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('暂无数据', cx, cy);
      legendEl.innerHTML = '';
      return;
    }

    let startAngle = -Math.PI / 2;
    const legendItems = [];

    data.forEach((item, i) => {
      const sliceAngle = (item.percent / 100) * Math.PI * 2;
      const color = PIE_COLORS[i % PIE_COLORS.length];
      const endAngle = startAngle + sliceAngle;

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fill();

      legendItems.push({ color, icon: item.icon, name: item.category_name, percent: item.percent });

      startAngle = endAngle;
    });

    legendEl.innerHTML = legendItems.map(item =>
      `<div class="stats-legend-item">
        <span class="stats-legend-color" style="background:${item.color}"></span>
        <span>${item.icon} ${item.name} ${item.percent}%</span>
      </div>`
    ).join('');
  },

  renderTimeline(el, data) {
    if (data.length === 0) {
      el.innerHTML = '<div style="color:#999;padding:8px;">暂无趋势数据</div>';
      return;
    }

    const maxExpense = Math.max(...data.map(d => d.expense));
    const barWidth = Math.max(36, el.offsetWidth / data.length - 8);

    const html = data.map(d => {
      const height = maxExpense > 0 ? Math.max(4, (d.expense / maxExpense) * 100) : 4;
      return `
        <div style="display:inline-block;text-align:center;margin:0 4px;vertical-align:bottom;">
          <div style="width:${barWidth}px;height:${height}px;background:#FFA94D;border-radius:4px 4px 0 0;min-height:4px;"></div>
          <div style="font-size:10px;color:#999;margin-top:2px;">${d.period}</div>
          <div style="font-size:11px;">${d.expense.toFixed(0)}</div>
        </div>
      `;
    }).join('');

    el.innerHTML = `<div style="display:flex;align-items:flex-end;min-width:${data.length * 60}px;">${html}</div>`;
  }
};

window.SidebarStats = SidebarStats;
