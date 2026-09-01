const nodemailer = require('nodemailer');
const { pool } = require('./db/pool');

async function readSettings() {
  const { rows } = await pool.query('SELECT key, value FROM settings');
  const settings = {};
  rows.forEach((row) => { settings[row.key] = row.value; });
  return settings;
}

function buildTransport(settings) {
  return nodemailer.createTransport({
    host: settings.smtp_host,
    port: Number(settings.smtp_port || 587),
    secure: Number(settings.smtp_port) === 465,
    auth: settings.smtp_user ? { user: settings.smtp_user, pass: settings.smtp_pass } : undefined,
  });
}

// FR-008 (fallo de fuente) y FR-010 (métrica a cero). Nunca lanza — un fallo de email no
// debe bloquear el informe (Principio III).
async function sendAlert({ to, subject, html }) {
  const settings = await readSettings();
  const recipient = to || settings.notify_email;
  if (!settings.smtp_host || !recipient) return { ok: false, error: 'SMTP no configurado' };

  try {
    const transport = buildTransport(settings);
    await transport.sendMail({ from: settings.smtp_user || 'reportinggriego@localhost', to: recipient, subject, html });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function testEmail() {
  return sendAlert({
    subject: 'ReportingGriego — email de prueba',
    html: '<p>Configuración SMTP correcta.</p>',
  });
}

module.exports = { sendAlert, testEmail };
