// Compartido por las 5 páginas protegidas: marca el enlace activo y conecta "Cerrar sesión".
document.addEventListener('DOMContentLoaded', () => {
  const current = window.location.pathname.replace('/', '').replace('.html', '');
  document.querySelectorAll('.topnav a[data-page]').forEach((a) => {
    a.classList.toggle('active', a.dataset.page === current);
  });

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await fetch('/api/logout', { method: 'POST' });
      window.location.href = '/login.html';
    });
  }
});
