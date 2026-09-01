// FR-001, FR-002, FR-003: login único, mensaje genérico de error.
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const errorEl = document.getElementById('loginError');
  errorEl.style.display = 'none';

  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();

  if (data.ok) {
    window.location.href = '/sitios.html';
  } else {
    errorEl.textContent = data.error || 'Usuario o contraseña incorrectos.';
    errorEl.style.display = 'block';
  }
});
