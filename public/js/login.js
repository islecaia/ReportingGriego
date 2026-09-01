// FR-001, FR-002, FR-003: login único, mensaje genérico de error.
// Botón type="button" + listener de click (no "submit") para no depender de que
// preventDefault() gane la carrera contra el envío nativo del formulario.
async function doLogin() {
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
}

document.getElementById('loginBtn').addEventListener('click', doLogin);

// Permite enviar con Enter desde cualquier campo, sin depender del submit nativo del form.
document.getElementById('loginForm').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    doLogin();
  }
});
