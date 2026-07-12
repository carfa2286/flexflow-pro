import React, { useState } from 'react';
import NotificationSettings from './NotificationSettings';

function NotificationManager({ clients }) {
  const [selectedClientId, setSelectedClientId] = useState(clients.length > 0 ? clients[0].id : null);

  return (
    <div className="notification-manager-page">
      <h2>💬 Gestor de Notificaciones WhatsApp</h2>

      {/* Client Selector */}
      <div className="client-selector-card">
        <label htmlFor="client-select"><strong>Selecciona un cliente para configurar</strong></label>
        <select
          id="client-select"
          value={selectedClientId}
          onChange={(e) => setSelectedClientId(parseInt(e.target.value))}
          style={{ width: '100%', padding: '10px', marginTop: '10px', borderRadius: '5px', border: '2px solid #e0e0e0' }}
        >
          {clients.map(client => (
            <option key={client.id} value={client.id}>
              {client.name} ({client.cedula || 'sin cédula'})
            </option>
          ))}
        </select>
      </div>

      {/* Settings Component */}
      {selectedClientId && (
        <NotificationSettings clientId={selectedClientId} clients={clients} />
      )}
    </div>
  );
}

export default NotificationManager;
