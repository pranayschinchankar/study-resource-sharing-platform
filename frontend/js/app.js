// ─── CONFIG ───────────────────────────────────────────────────
// Change this to your deployed backend URL (e.g. https://studyshare-api.onrender.com)
const API_BASE = window.BACKEND_URL || 'http://localhost:5000';
const API = `${API_BASE}/api`;

// ─── AUTH ─────────────────────────────────────────────────────
const Auth = {
  getToken: () => localStorage.getItem('ss_token'),
  getUser: () => JSON.parse(localStorage.getItem('ss_user') || 'null'),
  isLoggedIn: () => !!localStorage.getItem('ss_token'),
  isAdmin: () => Auth.getUser()?.role === 'admin',
  set: (token, user) => {
    localStorage.setItem('ss_token', token);
    localStorage.setItem('ss_user', JSON.stringify(user));
  },
  clear: () => {
    localStorage.removeItem('ss_token');
    localStorage.removeItem('ss_user');
  }
};

// ─── API HELPER ───────────────────────────────────────────────
async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...opts.headers };
  if (Auth.getToken()) headers['Authorization'] = `Bearer ${Auth.getToken()}`;
  if (opts.body instanceof FormData) delete headers['Content-Type'];
  const res = await fetch(`${API}${path}`, { ...opts, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ─── TOAST ────────────────────────────────────────────────────
function toast(msg, type = 'success') {
  let container = document.getElementById('toasts');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toasts';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${icon}</span><span>${msg}</span>`;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ─── UTILITIES ────────────────────────────────────────────────
function fileIcon(name = '', type = '') {
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (ext === 'pdf') return { icon: '📄', cls: 'icon-pdf' };
  if (['doc', 'docx'].includes(ext)) return { icon: '📝', cls: 'icon-doc' };
  if (['ppt', 'pptx'].includes(ext)) return { icon: '📊', cls: 'icon-img' };
  if (['png', 'jpg', 'jpeg'].includes(ext)) return { icon: '🖼️', cls: 'icon-img' };
  if (type === 'link') return { icon: '🔗', cls: 'icon-link' };
  return { icon: '📦', cls: 'icon-other' };
}

function renderStars(avg, count = 0) {
  const full = Math.round(avg || 0);
  return `${'★'.repeat(full)}${'☆'.repeat(5 - full)} <small style="color:var(--text-dim)">(${count})</small>`;
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso);
  const m = Math.floor(diff / 60000), h = Math.floor(m / 60), d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return 'just now';
}

function fmtBytes(n) {
  if (!n) return '';
  if (n < 1024) return n + ' B';
  if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1048576).toFixed(1) + ' MB';
}

// ─── NAV ─────────────────────────────────────────────────────
function renderNav(activePage = '') {
  const user = Auth.getUser();
  const navEl = document.getElementById('navbar');
  if (!navEl) return;
  const pages = [
    { href: 'index.html', label: 'Browse', id: 'browse' },
    { href: 'upload.html', label: 'Upload', id: 'upload', auth: true },
    { href: 'profile.html', label: 'My Files', id: 'profile', auth: true },
    { href: 'admin.html', label: 'Admin', id: 'admin', admin: true },
  ];
  const links = pages
    .filter(p => !p.auth || Auth.isLoggedIn())
    .filter(p => !p.admin || Auth.isAdmin())
    .map(p => `<a href="${p.href}" class="nav-link ${activePage === p.id ? 'active' : ''}">${p.label}</a>`)
    .join('');
  const right = user
    ? `<div class="nav-user">
        <span style="font-size:0.85rem;color:var(--text-muted)">Hi, ${user.name.split(' ')[0]}</span>
        <img src="${user.avatar}" class="nav-avatar" onclick="location.href='profile.html'" title="${user.name}"/>
        <button class="btn btn-secondary btn-sm" onclick="logout()">Logout</button>
       </div>`
    : `<div class="nav-user">
        <button class="btn btn-secondary btn-sm" onclick="openAuthModal('login')">Login</button>
        <button class="btn btn-primary btn-sm" onclick="openAuthModal('signup')">Sign Up</button>
       </div>`;
  navEl.innerHTML = `<a href="index.html" class="nav-logo">📚 Study<span>Share</span></a><div class="nav-links">${links}</div>${right}`;
}

function logout() {
  Auth.clear();
  toast('Logged out');
  setTimeout(() => location.href = 'index.html', 500);
}

function requireAuth(cb) {
  if (Auth.isLoggedIn()) cb();
  else openAuthModal('login');
}

// ─── AUTH MODAL ───────────────────────────────────────────────
function openAuthModal(mode = 'login') {
  document.getElementById('auth-modal')?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'auth-modal';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <span class="modal-title" id="auth-modal-title">${mode === 'login' ? 'Welcome back' : 'Create account'}</span>
        <button class="modal-close" onclick="document.getElementById('auth-modal').remove()">✕</button>
      </div>
      <div id="auth-tabs" class="tabs">
        <button class="tab ${mode === 'login' ? 'active' : ''}" onclick="switchAuthTab('login')">Login</button>
        <button class="tab ${mode === 'signup' ? 'active' : ''}" onclick="switchAuthTab('signup')">Sign Up</button>
      </div>
      <div id="auth-form-wrap"></div>
      <p style="font-size:0.78rem;color:var(--text-dim);margin-top:1rem;text-align:center">
        Admin: <b>admin@studyshare.com</b>
      </p>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  renderAuthForm(mode);
}

function switchAuthTab(mode) {
  document.querySelectorAll('#auth-tabs .tab').forEach((t, i) =>
    t.classList.toggle('active', (i === 0 && mode === 'login') || (i === 1 && mode === 'signup'))
  );
  document.getElementById('auth-modal-title').textContent = mode === 'login' ? 'Welcome back' : 'Create account';
  renderAuthForm(mode);
}

function renderAuthForm(mode) {
  const wrap = document.getElementById('auth-form-wrap');
  if (mode === 'login') {
    wrap.innerHTML = `
      <div class="form-group"><label class="form-label">Email</label>
        <input id="auth-email" type="email" class="form-control" placeholder="you@email.com"/></div>
      <div class="form-group"><label class="form-label">Password</label>
        <input id="auth-pass" type="password" class="form-control" placeholder="••••••••" onkeydown="if(event.key==='Enter')doLogin()"/></div>
      <button class="btn btn-primary" style="width:100%" onclick="doLogin()">Login</button>`;
  } else {
    wrap.innerHTML = `
      <div class="form-group"><label class="form-label">Full Name</label>
        <input id="auth-name" type="text" class="form-control" placeholder="Your name"/></div>
      <div class="form-group"><label class="form-label">Email</label>
        <input id="auth-email" type="email" class="form-control" placeholder="you@email.com"/></div>
      <div class="form-group"><label class="form-label">Password</label>
        <input id="auth-pass" type="password" class="form-control" placeholder="Min 6 characters" onkeydown="if(event.key==='Enter')doSignup()"/></div>
      <button class="btn btn-primary" style="width:100%" onclick="doSignup()">Create Account</button>`;
  }
}

async function doLogin() {
  try {
    const data = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: document.getElementById('auth-email').value,
        password: document.getElementById('auth-pass').value
      })
    });
    Auth.set(data.token, data.user);
    toast('Logged in!');
    document.getElementById('auth-modal').remove();
    setTimeout(() => location.reload(), 300);
  } catch (e) { toast(e.message, 'error'); }
}

async function doSignup() {
  try {
    const data = await api('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        name: document.getElementById('auth-name').value,
        email: document.getElementById('auth-email').value,
        password: document.getElementById('auth-pass').value
      })
    });
    Auth.set(data.token, data.user);
    toast('Account created!');
    document.getElementById('auth-modal').remove();
    setTimeout(() => location.reload(), 300);
  } catch (e) { toast(e.message, 'error'); }
}
