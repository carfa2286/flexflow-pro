import React, { useState, useEffect } from 'react';
import axios from 'axios';

function ClientList({ clients, onRefresh }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loansData, setLoansData] = useState({});
  const [scoresData, setScoresData] = useState({});
  const [publicProfiles, setPublicProfiles] = useState({});

  // Cargar préstamos y scores de cada cliente
  useEffect(() => {
    clients.forEach(client => {
      axios.get(`/api/loans/${client.id}`)
        .then(res => {
          setLoansData(prev => ({
            ...prev,
            [client.id]: res.data
          }));
        })
        .catch(err => console.error('Error cargando préstamos:', err));

      axios.get(`/api/clients/${client.id}/score`)
        .then(res => {
          setScoresData(prev => ({
            ...prev,
            [client.id]: res.data
          }));
        })
        .catch(err => console.error('Error cargando score:', err));
    });
  }, [clients]);

  const handleAddClient = async (e) => {
    e.preventDefault();
    if (!name) {
      alert('Nombre es requerido');
      return;
    }

    try {
      await axios.post('/api/clients', { name, phone, email });
      setName('');
      setPhone('');
      setEmail('');
      onRefresh();
      alert('Cliente creado correctamente');
    } catch (err) {
      alert('Error al crear cliente: ' + err.message);
    }
  };

  const togglePublicProfile = async (clientId, currentStatus) => {
    try {
      await axios.post(`/api/clients/${clientId}/enable-public-profile`, {
        enabled: !currentStatus,
        nickname: ''
      });
      setPublicProfiles(prev => ({
        ...prev,
        [clientId]: !currentStatus
      }));
    } catch (err) {
      alert('Error actualizando perfil público: ' + err.message);
    }
  };

  return (
    <div className="clients-page">
      <h2>👥 Base de Datos de Clientes</h2>

      {/* Formulario */}
      <div className="form-card">
        <h3>➕ Agregar Nuevo Cliente</h3>
        <form onSubmit={handleAddClient}>
          <input
            type="text"
            placeholder="Nombre completo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            type="tel"
            placeholder="Teléfono (opcional)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <input
            type="email"
            placeholder="Email (opcional)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit" className="btn-primary">Guardar Cliente</button>
        </form>
      </div>

      {/* Tabla de clientes */}
      <div className="table-container">
        <h3>Clientes Registrados ({clients.length})</h3>
        {clients.length === 0 ? (
          <p className="empty-state">No hay clientes registrados aún</p>
        ) : (
          <table className="clients-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Cédula</th>
                <th>Nombre</th>
                <th>⭐ Score</th>
                <th>👁️ Perfil Público</th>
                <th>📅 Fecha Préstamo</th>
                <th>💵 Monto</th>
                <th>📊 Interés %</th>
                <th>Teléfono</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client, idx) => {
                const loans = loansData[client.id] || [];
                const loan = loans.length > 0 ? loans[0] : null;
                const loanDate = loan ? new Date(loan.start_date).toLocaleDateString('es-CO') : '-';
                const loanAmount = loan ? `$${(loan.amount / 1000).toFixed(0)}K` : '-';
                const interestRate = loan ? `${loan.interest_rate}%` : '-';

                const score = scoresData[client.id] || {};
                const stars = Math.round((score.credit_score || 0) / 20);
                const starDisplay = '⭐'.repeat(Math.max(1, stars)) || '◯';
                const scoreColor = score.credit_score >= 80 ? '#10b981' : score.credit_score >= 60 ? '#f59e0b' : score.credit_score >= 40 ? '#f97316' : '#ef4444';

                const isPublic = publicProfiles[client.id];

                return (
                  <tr key={client.id}>
                    <td>{idx + 1}</td>
                    <td><strong>{client.cedula || '-'}</strong></td>
                    <td>{client.name}</td>
                    <td><strong style={{ color: scoreColor, fontSize: '14px' }}>
                      {starDisplay} ({score.credit_score || 0})
                    </strong></td>
                    <td>
                      <button
                        onClick={() => togglePublicProfile(client.id, isPublic)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '4px',
                          border: 'none',
                          cursor: 'pointer',
                          background: isPublic ? '#10b981' : '#e5e7eb',
                          color: isPublic ? 'white' : '#6b7280',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}
                      >
                        {isPublic ? '✓ Público' : '○ Privado'}
                      </button>
                    </td>
                    <td>{loanDate}</td>
                    <td><strong>{loanAmount}</strong></td>
                    <td><strong style={{ color: '#10b981' }}>{interestRate}</strong></td>
                    <td>{client.phone || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default ClientList;
