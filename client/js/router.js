// Hash 路由 + JWT 守卫

const routes = {};
let currentRoute = null;
let currentHandler = null;

function register(hash, handler) {
  routes[hash] = handler;
}

function navigate(hash) {
  if (currentRoute === hash && currentHandler === routes[hash]) return;
  window.location.hash = hash;
}

function requireAuth(hash, handler) {
  register(hash, () => {
    if (!getToken()) {
      window.location.hash = '#/login';
      return;
    }
    handler();
  });
}

function handleRoute() {
  const hash = window.location.hash || '#/login';
  const [route] = hash.split('?');
  const handler = routes[route];

  if (!handler) {
    navigate('#/login');
    return;
  }

  // 如果已经登录且访问登录页，跳转游戏页
  if (route === '#/login' && getToken()) {
    navigate('#/game');
    return;
  }
  if (route === '#/register' && getToken()) {
    navigate('#/game');
    return;
  }

  currentRoute = route;
  currentHandler = handler;
  handler();
}

function start() {
  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}

window.Router = { register, navigate, requireAuth, start, handleRoute };
