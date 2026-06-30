// 应用入口：路由分发、JWT 管理、全局状态

(function () {
  'use strict';

  // 注册路由
  Router.register('#/login', () => {
    renderAuthPage();
    document.getElementById('login-container').style.display = 'flex';
    document.getElementById('game-container').style.display = 'none';
    if (GameLoop.running) GameLoop.stop();
  });

  Router.register('#/register', () => {
    renderAuthPage();
    document.getElementById('login-container').style.display = 'flex';
    document.getElementById('game-container').style.display = 'none';
  });

  Router.register('#/captcha-login', () => {
    renderAuthPage();
    document.getElementById('login-container').style.display = 'flex';
    document.getElementById('game-container').style.display = 'none';
  });

  Router.register('#/captcha-register', () => {
    renderAuthPage();
    document.getElementById('login-container').style.display = 'flex';
    document.getElementById('game-container').style.display = 'none';
  });

  Router.register('#/reset-password', () => {
    renderAuthPage();
    document.getElementById('login-container').style.display = 'flex';
    document.getElementById('game-container').style.display = 'none';
  });

  Router.requireAuth('#/game', () => {
    GamePage.init();
    Sidebar.init();
  });

  // 启动路由
  Router.start();
})();
