import React, { useState, useEffect } from 'react';
import axios from 'axios';

function NotificationSettings({ clientId, clients }) {
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [confirmationEnabled, setConfirmationEnabled] = useState(true);
  const [alertEnabled, setAlertEnabled] = useState(true);
  const [reminderDaysBefore, setReminderDaysBefore] = useState(1);
  const [loading, setLoading] = useState(false);
  const [testMessage, setTestMessage] = useState('');

  const client = clients.find(c => c.id === parseInt(clientId));

  useEffect(() => {
    if (!clientId) return;
    loadSettings();
  }, [clientId]);

  const loadSettings = async () => {
    try {
      const res = await axios.get(`/api/clients/${clientId}/notification-settings`);
      if (res.data) {
        setWhatsappEnabled(res.data.whatsapp_enabled === 1);
        setPhoneNumber(res.data.phone_number || '');
        setReminderEnabled(res.data.payment_reminder_enabled === 1);
        setConfirmationEnabled(res.data.payment_confirmation_enabled === 1);
        setAlertEnabled(res.data.default_alert_enabled === 1);
        setReminderDaysBefore(res.data.reminder_days_before || 1);
      }
    } catch (err) {
      console.error('Error cargando configuración:', err);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(`/api/clients/${clientId}/notification-settings`, {
        whatsapp_enabled: whatsappEnabled,
        phone_number: phoneNumber,
        payment_reminder_enabled: reminderEnabled,
        payment_confirmation_enabled: confirmationEnabled,
        default_alert_enabled: alertEnabled,
        reminder_days_before: reminderDaysBefore
      });

      alert('✅ Configuración guardada correctamente');
      setLoading(false);
    } catch (err) {
      alert('Error al guardar: ' + err.message);
      setLoading(false);
    }
  };

  const handleSendTest = async () => {
    if (!phoneNumber) {
      alert('Por favor ingresa un número de teléfono');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`/api/notifications/test-whatsapp/${clientId}`, {
        phone_number: phoneNumber
      });

      if (res.data.success) {
        setTestMessage('✅ Mensaje de prueba enviado. Revisa tu WhatsApp en unos momentos.');
      } else {
        setTestMessage('❌ Error al enviar: ' + (res.data.error || 'Unknown error'));
      }
      setLoading(false);
    } catch (err) {
      setTestMessage('❌ Error: ' + err.message);
      setLoading(false);
    }
  };

  if (!client) {
    return <div className="loading">Cliente no encontrado</div>;
  }

  return (
    <div className="notification-settings-page">
      <h2>🔔 Configuración de Notificaciones</h2>
      <p className="subtitle">Cliente: <strong>{client.name}</strong></p>

      <div className="settings-card">
        <form onSubmit={handleSave}>
          {/* WhatsApp Enabled */}
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={whatsappEnabled}
                onChange={(e) => setWhatsappEnabled(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <strong>Habilitar notificaciones por WhatsApp</strong>
            </label>
            <small>Recibe recordatorios y confirmaciones de pagos vía WhatsApp</small>
          </div>

          {whatsappEnabled && (
            <>
              {/* Phone Number */}
              <div className="form-group">
                <label>Número de WhatsApp *</label>
                <input
                  type="tel"
                  placeholder="Ej: +573001234567 o 3001234567"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required={whatsappEnabled}
                />
                <small>Formato: +57 (código país) + número local</small>
              </div>

              {/* Notification Types */}
              <div className="form-group">
                <h3>Tipos de Notificaciones</h3>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '10px' }}>
                  <input
                    type="checkbox"
                    checked={reminderEnabled}
                    onChange={(e) => setReminderEnabled(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span>📱 Recordatorios de pago</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '10px' }}>
                  <input
                    type="checkbox"
                    checked={confirmationEnabled}
                    onChange={(e) => setConfirmationEnabled(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span>✅ Confirmaciones de pago</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={alertEnabled}
                    onChange={(e) => setAlertEnabled(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span>⚠️ Alertas de incumplimiento</span>
                </label>
              </div>

              {/* Reminder Days Before */}
              <div className="form-group">
                <label>Recordar con anticipación (días)</label>
                <input
                  type="number"
                  min="1"
                  max="7"
                  value={reminderDaysBefore}
                  onChange={(e) => setReminderDaysBefore(parseInt(e.target.value))}
                />
                <small>¿Cuántos días antes del pago enviar recordatorio?</small>
              </div>

              {/* Test Button */}
              <div className="form-group">
                <button
                  type="button"
                  onClick={handleSendTest}
                  className="btn-secondary"
                  disabled={loading || !phoneNumber}
                  style={{ width: '100%' }}
                >
                  📨 Enviar Mensaje de Prueba
                </button>
                {testMessage && (
                  <div style={{
                    marginTop: '10px',
                    padding: '10px',
                    borderRadius: '5px',
                    background: testMessage.includes('✅') ? '#f0fdf4' : '#fee',
                    color: testMessage.includes('✅') ? '#10b981' : '#c33',
                    fontSize: '0.9em'
                  }}>
                    {testMessage}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Save Button */}
          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ width: '100%' }}
          >
            {loading ? 'Guardando...' : '💾 Guardar Configuración'}
          </button>
        </form>
      </div>

      {/* Info Box */}
      <div className="info-box">
        <h3>ℹ️ Información</h3>
        <p>
          <strong>WhatsApp es el canal preferido:</strong> 65% de usuarios latinoamericanos prefieren WhatsApp para recibir notificaciones.
        </p>
        <p style={{ marginTop: '10px' }}>
          <strong>Privacidad:</strong> Tu número de teléfono se almacena de forma segura y solo se utiliza para enviar notificaciones sobre tus préstamos.
        </p>
      </div>
    </div>
  );
}

export default NotificationSettings;
