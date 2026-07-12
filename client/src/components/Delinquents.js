import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Delinquents() {
  const [morosos, setMorosos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMorosos();
  }, []);

  const loadMorosos = async () => {
    try {
      const res = await axios.get('/api/delinquents');
      setMorosos(res.data || []);
    } catch (err) {
      console.error('Error:', err);
    }
    setLoading(false);
  };

  return (
    <div className="delinquents-page">
      <h2>⚠️ Clientes Morosos (Sin Pagos)</h2>

      <div className="alert-card">
        <p>
          Estos son clientes que tienen préstamos activos pero <strong>no han registrado pagos</strong>.
        </p>
      </div>

      <button onClick={loadMorosos} className="refresh-btn">🔄 Actualizar</button>

      {loading ? (
        <p>Cargando...</p>
      ) : morosos.length === 0 ? (
        <div className="success-card">
          <h3>✅ ¡Excelente!</h3>
          <p>Todos tus clientes están al día con sus pagos.</p>
        </div>
      ) : (
        <div className="table-container">
          <h3>Total Morosos: {morosos.length}</h3>
          <table className="morosos-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Cédula</th>
                <th>Nombre</th>
                <th>Teléfono</th>
                <th>Email</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {morosos.map((cliente, idx) => (
                <tr key={cliente.id} className="delinquent-row">
                  <td>{idx + 1}</td>
                  <td><strong>{cliente.cedula || '-'}</strong></td>
                  <td>{cliente.name}</td>
                  <td>{cliente.phone ? `📞 ${cliente.phone}` : '-'}</td>
                  <td>{cliente.email ? `📧 ${cliente.email}` : '-'}</td>
                  <td>
                    <button className="btn-call" title="Llamar">📱</button>
                    <button className="btn-message" title="Mensaje">💬</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="info-box">
            <h3>📞 Acciones Recomendadas:</h3>
            <ul>
              <li>Llamar o enviar mensaje a los morosos</li>
              <li>Recordarles la fecha de pago vencida</li>
              <li>Acordar fecha de pago con descuento si pagan rápido</li>
              <li>Registrar el pago una vez realizado</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default Delinquents;
