// 统计页：Canvas 饼图绘制、月份时间轴（上→下）、环比信息

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
      <div id="timeline-section" style="margin-top:16px;border-top:1px solid var(--border);padding-top:12px;">
        <h4 style="margin-bottom:10px;font-size:12px;color:var(--neon-yellow);">消费趋势</h4>
        <div id="timeline-chart" style="position:relative;min-height:200px;"></div>
      </div>
    `;

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
      const summaryParams = this.periodMode === 'month'
        ? { period: month, granularity: 'month' }
        : { period: week, granularity: 'week' };
      const summary = await api.getSummary(summaryParams);

      const summaryEl = container.querySelector('#stats-summary');
      summaryEl.innerHTML = `
        <div style="display:flex;justify-content:space-around;padding:8px 0;">
          <div style="text-align:center;"><div style="font-size:12px;color:var(--neon-green);">收入</div><div style="font-weight:700;color:var(--neon-green);">+${summary.income_total.toFixed(2)}</div></div>
          <div style="text-align:center;"><div style="font-size:12px;color:var(--neon-pink);">支出</div><div style="font-weight:700;color:var(--neon-pink);">-${summary.expense_total.toFixed(2)}</div></div>
        </div>
      `;

      const changeEl = container.querySelector('#change-indicator');
      if (summary.change_percent !== null) {
        const isUp = summary.change_percent > 0;
        changeEl.innerHTML = `比上${this.periodMode === 'month' ? '月' : '周'} <span class="${isUp ? 'up' : 'down'}">${isUp ? '+' : ''}${summary.change_percent}%</span>`;
      } else {
        changeEl.innerHTML = '暂无环比数据';
      }

      const pieParams = this.periodMode === 'month' ? { month } : { week };
      const pieData = await api.getCategoryPie(pieParams);
      this.drawPieChart(container.querySelector('#pie-canvas'), pieData, container.querySelector('#pie-legend'));

      // 月份时间轴：从上往下
      const timelineData = await api.getTimeline({
        start: `${now.getFullYear()}-01`,
        end: `${now.getFullYear()}-12`,
        granularity: 'month'
      });
      this.renderTimeline(container.querySelector('#timeline-chart'), timelineData);
    } catch (e) {
      console.error('stats load error:', e);
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
      ctx.fillStyle = '#111144';
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#666699';
      ctx.font = '12px "PingFang SC","Microsoft YaHei",sans-serif';
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
    if (!data || data.length === 0) {
      el.innerHTML = '<div style="color:var(--text-dim);padding:12px;text-align:center;">暂无趋势数据</div>';
      return;
    }

    // 计算最大值用于比例
    const maxVal = Math.max(
      ...data.map(d => Math.max(d.expense || 0, d.income || 0)),
      1
    );

    // 从上往下渲染
    const html = data.map(d => {
      const label = d.period; // "2026-01" 格式
      const displayLabel = label.slice(5); // "01" 月份
      const expensePct = ((d.expense || 0) / maxVal * 100).toFixed(1);
      const incomePct = ((d.income || 0) / maxVal * 100).toFixed(1);
      const expenseW = Math.max((d.expense || 0) / maxVal * 150, 4);
      const incomeW = Math.max((d.income || 0) / maxVal * 150, 4);

      return `
        <div style="display:flex;align-items:center;gap:8px;padding:3px 0;font-size:11px;min-height:22px;">
          <!-- 月份标签 -->
          <div style="width:28px;text-align:right;color:var(--text-dim);font-family:'Press Start 2P','Courier New',monospace;font-size:9px;flex-shrink:0;">
            ${displayLabel}月
          </div>
          <!-- 支出条（粉色，向右） -->
          <div style="flex:1;display:flex;align-items:center;gap:4px;justify-content:flex-end;">
            <span style="color:var(--neon-pink);font-size:10px;width:50px;text-align:right;">${(d.expense||0).toFixed(0)}</span>
            <div style="height:14px;width:${expenseW}px;background:linear-gradient(90deg,rgba(255,110,199,0.2),rgba(255,110,199,0.7));border-radius:2px;transition:width 0.3s;"></div>
          </div>
          <!-- 分隔 -->
          <div style="width:16px;text-align:center;font-size:9px;color:var(--text-dim);flex-shrink:0;">|</div>
          <!-- 收入条（绿色，向左） -->
          <div style="flex:1;display:flex;align-items:center;gap:4px;">
            <div style="height:14px;width:${incomeW}px;background:linear-gradient(90deg,rgba(57,255,20,0.7),rgba(57,255,20,0.2));border-radius:2px;transition:width 0.3s;"></div>
            <span style="color:var(--neon-green);font-size:10px;width:50px;">${(d.income||0).toFixed(0)}</span>
          </div>
        </div>
      `;
    }).join('');

    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;font-size:9px;color:var(--text-dim);">
        <span style="width:28px;"></span>
        <span style="flex:1;text-align:right;color:var(--neon-pink);">支出</span>
        <span style="width:16px;"></span>
        <span style="flex:1;text-align:left;color:var(--neon-green);">收入</span>
      </div>
      ${html}
    `;
  }
};

window.SidebarStats = SidebarStats;
