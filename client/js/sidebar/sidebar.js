// 侧边面板：打开/关闭、Tab 切换

const Sidebar = {
  sidebarEl: null,
  contentEl: null,
  currentTab: 'bills',
  openState: false,

  init() {
    this.sidebarEl = document.getElementById('sidebar');
    this.contentEl = document.getElementById('sidebar-content');

    // 关闭按钮
    document.getElementById('sidebar-close').addEventListener('click', () => this.close());

    // Tab 切换
    this.sidebarEl.querySelectorAll('.sidebar-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.switchTab(tab.dataset.tab);
      });
    });
  },

  open() {
    if (this.openState) return;
    this.openState = true;
    Character.paused = true;
    this.sidebarEl.classList.add('open');
    this.renderCurrentTab();
  },

  close() {
    if (!this.openState) return;
    this.openState = false;
    Character.paused = false;
    this.sidebarEl.classList.remove('open');
  },

  switchTab(tab) {
    this.currentTab = tab;
    this.sidebarEl.querySelectorAll('.sidebar-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tab);
    });
    this.renderCurrentTab();
  },

  async renderCurrentTab() {
    switch (this.currentTab) {
      case 'bills':
        await SidebarBills.render(this.contentEl);
        break;
      case 'stats':
        await SidebarStats.render(this.contentEl);
        break;
      case 'settings':
        await SidebarSettings.render(this.contentEl);
        break;
    }
  }
};

window.Sidebar = Sidebar;
