/* 虎力全开·高项学习计划 Service Worker —— 离线应用外壳缓存
 * 策略：HTML network-first（每次打开都拿服务器最新版），静态资源 cache-first。
 * 学习计划要频繁迭代，务必保证页面 network-first，避免被旧缓存锁死。
 * 每次发版 bump 下面 CACHE 版本号。
 */
const CACHE = 'study-plan-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(ASSETS).catch(function () { return Promise.resolve(); });
    })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE; })
            .map(function (k) { return caches.delete(k); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);

  // 跨域请求一律放行走网络（学习计划当前无跨域数据源，保留以防后续接入行情）
  if (url.origin !== self.location.origin) return;

  var isHtml = (req.mode === 'navigate') || /(\/index\.html|\.html)$/.test(url.pathname) || url.pathname.endsWith('/');

  if (isHtml) {
    // 页面：network-first —— 保证每次打开都拿到服务器上最新的页面
    e.respondWith(
      fetch(req).then(function (res) {
        if (res && res.status === 200) {
          var cp = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, cp); });
        }
        return res;
      }).catch(function () {
        return caches.match(req).then(function (hit) {
          return hit || caches.match('./index.html');
        });
      })
    );
    return;
  }

  // 静态资源：cache-first
  e.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        if (res && res.status === 200) {
          var cp = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, cp); });
        }
        return res;
      }).catch(function () { return hit; });
    })
  );
});
