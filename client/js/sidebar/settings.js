// 设置页：导出、分类管理、币种、清空、注销

const SidebarSettings = {
  async render(container) {
    container.innerHTML = `<div class="loading">加载中...</div>`;

    try {
      const categories = await api.getCategories();

      const catListHtml = categories.map(cat => `
        <div class="settings-item">
          <span>${cat.icon} ${cat.name} ${cat.is_preset ? '(预设)' : ''}</span>
          <div style="display:flex;gap:8px;">
            ${!cat.is_preset ? `<button class="settings-btn" data-action="edit-cat" data-id="${cat.id}">编辑</button>` : ''}
            ${!cat.is_preset ? `<button class="settings-btn" data-action="delete-cat" data-id="${cat.id}">删除</button>` : ''}
          </div>
        </div>
      `).join('');

      container.innerHTML = `
        <div class="settings-section">
          <h3>分类管理</h3>
          ${catListHtml}
          <div class="settings-item">
            <span>+ 新增分类</span>
            <button class="settings-btn" data-action="add-cat">添加</button>
          </div>
        </div>

        <div class="settings-section">
          <h3>币种设置</h3>
          <div class="settings-item">
            <span>显示币种</span>
            <select class="currency-select" id="currency-select">
              <option value="CNY">¥ 人民币</option>
              <option value="USD">$ 美元</option>
              <option value="EUR">€ 欧元</option>
              <option value="JPY">¥ 日元</option>
              <option value="GBP">£ 英镑</option>
              <option value="HKD">HK$ 港币</option>
            </select>
          </div>
        </div>

        <div class="settings-section">
          <h3>数据管理</h3>
          <div class="settings-item">
            <span>导出账单 (CSV)</span>
            <button class="settings-btn" data-action="export">导出</button>
          </div>
          <div class="settings-item">
            <span>清空所有数据</span>
            <button class="settings-btn danger" data-action="clear">清空</button>
          </div>
          <div class="settings-item">
            <span>注销账号</span>
            <button class="settings-btn danger" data-action="delete-account">注销</button>
          </div>
          <div class="settings-item">
            <span>退出登录</span>
            <button class="settings-btn" data-action="logout">退出</button>
          </div>
        </div>
      `;

      // 当前币种
      document.getElementById('currency-select').value = GameLoop.currency;

      this.bindEvents(container);
    } catch (e) {
      container.innerHTML = `<div class="empty-state"><p>加载设置失败</p></div>`;
    }
  },

  bindEvents(container) {
    // 分类操作
    container.querySelector('[data-action="add-cat"]').addEventListener('click', async () => {
      const name = prompt('输入分类名称（最多20个字符）:');
      if (!name) return;
      if (name.length > 20) { showToast('分类名不能超过20个字符', 'error'); return; }

      const presets = ['🍔', '🚌', '🛒', '🎮', '🏠', '💰', '🐱', '🐶', '📚', '💊', '✈️', '🎵', '👗', '💻', '🎁'];
      const icon = prompt('输入emoji图标（可直接粘贴）:', presets[Math.floor(Math.random() * presets.length)]);
      if (!icon) return;

      try {
        await api.createCategory({ name, icon });
        showToast('分类已添加', 'success');
        Panel.refreshCategories();
        Sidebar.renderCurrentTab();
      } catch (e) {
        showToast(e.message, 'error');
      }
    });

    // 编辑分类
    container.querySelectorAll('[data-action="edit-cat"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.dataset.id);
        const name = prompt('输入新分类名称:');
        if (!name || name.length > 20) { showToast('分类名1-20个字符', 'error'); return; }
        const icon = prompt('输入新emoji图标:', '📦');
        if (!icon) return;
        try {
          await api.updateCategory(id, { name, icon });
          showToast('更新成功', 'success');
          Panel.refreshCategories();
          Sidebar.renderCurrentTab();
        } catch (e) {
          showToast(e.message, 'error');
        }
      });
    });

    // 删除分类
    container.querySelectorAll('[data-action="delete-cat"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.dataset.id);
        const confirmed = await showConfirmDialog('确定删除此分类吗？');
        if (!confirmed) return;
        try {
          await api.deleteCategory(id);
          showToast('删除成功', 'success');
          Panel.refreshCategories();
          Sidebar.renderCurrentTab();
        } catch (e) {
          showToast(e.message, 'error');
        }
      });
    });

    // 币种切换
    document.getElementById('currency-select').addEventListener('change', async (e) => {
      const currency = e.target.value;
      try {
        await api.updateCurrency({ currency });
        GameLoop.setCurrency(currency);
        showToast(`已切换为 ${currency}`, 'success');
      } catch (err) {
        showToast(err.message, 'error');
        e.target.value = GameLoop.currency;
      }
    });

    // 导出
    container.querySelector('[data-action="export"]').addEventListener('click', async () => {
      try {
        const token = getToken();
        const response = await fetch('/api/settings/export', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('导出失败');
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sugarrunner-export-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (e) {
        showToast(e.message, 'error');
      }
    });

    // 清空数据
    container.querySelector('[data-action="clear"]').addEventListener('click', async () => {
      const confirmed = await showConfirmDialog('确定清空所有账单数据吗？此操作不可撤销！');
      if (!confirmed) return;
      try {
        await api.clearData();
        GameLoop.setAnnualExpense(0);
        showToast('数据已清空', 'success');
      } catch (e) {
        showToast(e.message, 'error');
      }
    });

    // 注销
    container.querySelector('[data-action="delete-account"]').addEventListener('click', async () => {
      const confirmed = await showConfirmDialog('确定注销账号吗？所有数据将被永久删除！');
      if (!confirmed) return;
      try {
        await api.deleteAccount();
        clearToken();
        showToast('账号已注销', 'success');
        setTimeout(() => Router.navigate('#/login'), 500);
      } catch (e) {
        showToast(e.message, 'error');
      }
    });

    // 退出
    container.querySelector('[data-action="logout"]').addEventListener('click', async () => {
      try { await api.logout(); } catch (e) { /* ignore */ }
      clearToken();
      GameLoop.stop();
      document.getElementById('game-container').style.display = 'none';
      Router.navigate('#/login');
    });
  }
};

// 确认弹窗
function showConfirmDialog(message) {
  return new Promise((resolve) => {
    const existing = document.querySelector('.confirm-dialog');
    if (existing) existing.remove();

    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog';
    dialog.innerHTML = `
      <div class="confirm-dialog-content">
        <p>${message}</p>
        <div class="confirm-dialog-actions">
          <button class="confirm-cancel" id="confirm-cancel">取消</button>
          <button class="confirm-ok" id="confirm-ok">确定</button>
        </div>
      </div>
    `;
    document.body.appendChild(dialog);

    dialog.querySelector('#confirm-cancel').addEventListener('click', () => {
      dialog.remove();
      resolve(false);
    });
    dialog.querySelector('#confirm-ok').addEventListener('click', () => {
      dialog.remove();
      resolve(true);
    });
  });
}

window.SidebarSettings = SidebarSettings;
window.showConfirmDialog = showConfirmDialog;
