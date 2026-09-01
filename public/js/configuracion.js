// Pantalla Configuración: SMTP + destinatarios (FR-008, FR-010) vía /api/settings.

async function getSetting(key) {
  const res = await fetch(`/api/settings?key=${key}`).then((r) => r.json());
  return res.ok ? res.settings[key] : null;
}
async function setSetting(key, value) {
  await fetch('/api/settings', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value }),
  });
}

async function init() {
  const fields = { smtpHost: 'smtp_host', smtpPort: 'smtp_port', smtpUser: 'smtp_user', smtpPass: 'smtp_pass', notifyEmail: 'notify_email' };
  for (const [id, key] of Object.entries(fields)) {
    const value = await getSetting(key);
    if (value) document.getElementById(id).value = value;
  }

  document.getElementById('saveBtn').addEventListener('click', async () => {
    for (const [id, key] of Object.entries(fields)) {
      await setSetting(key, document.getElementById(id).value.trim());
    }
    alert('Configuración guardada.');
  });

  document.getElementById('testBtn').addEventListener('click', async () => {
    const flash = document.getElementById('testFlash');
    const result = await fetch('/api/settings/test-email', { method: 'POST' }).then((r) => r.json());
    flash.textContent = result.ok ? 'Email de prueba enviado.' : `Error: ${result.error}`;
    flash.className = result.ok ? 'alert alert-success' : 'alert alert-error';
    flash.style.display = 'block';
  });
}

init();
