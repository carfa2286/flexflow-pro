import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Payments({ clients }) {
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedLoan, setSelectedLoan] = useState('');
  const [amount, setAmount] = useState('');
  const [loans, setLoans] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);

  useEffect(() => {
    if (selectedClient) {
      axios.get(`/api/loans/${selectedClient}`)
        .then(res => setLoans(res.data))
        .catch(err => console.error('Error:', err));
    }
  }, [selectedClient]);

  useEffect(() => {
    axios.get('/api/payments-history')
      .then(res => setPaymentHistory(res.data || []))
      .catch(err => console.error('Error:', err));
  }, []);

  const handleRegisterPayment = async (e) => {
    e.preventDefault();
    if (!selectedLoan || !amount) {
      alert('Completa todos los campos');
      return;
    }

    try {
      await axios.post('/api/payments', {
        loan_id: parseInt(selectedLoan),
        amount: parseFloat(amount)
      });
      alert('✅ Pago registrado correctamente');
      setAmount('');
      setSelectedLoan('');
      // Recargar historial
      axios.get('/api/payments-history')
        .then(res => setPaymentHistory(res.data || []))
        .catch(err => console.error('Error:', err));
    } catch (err) {
      alert('❌ Error: ' + err.message);
    }
  };

  return (
    <div className="payments-page">
      <h2>💳 Registrar Pagos</h2>

      {/* Formulario de Pago */}
      <div className="form-card">
        <h3>Nuevo Pago</h3>
        <form onSubmit={handleRegisterPayment}>
          <div className="form-group">
            <label>Cliente *</label>
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              required
            >
              <option value="">-- Selecciona cliente --</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.cedula})</option>
              ))}
            </select>
          </div>

          {loans.length > 0 && (
            <div className="form-group">
              <label>Préstamo *</label>
              <select
                value={selectedLoan}
                onChange={(e) => setSelectedLoan(e.target.value)}
                required
              >
                <option value="">-- Selecciona préstamo --</option>
                {loans.map(l => (
                  <option key={l.id} value={l.id}>
                    ${(l.amount / 1000).toFixed(0)}K - {l.interest_rate}% ({new Date(l.start_date).toLocaleDateString('es-CO')})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label>Monto Pagado ($) *</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Ej: 100000"
              required
            />
          </div>

          <button type="submit" className="btn-primary">💾 Registrar Pago</button>
        </form>
      </div>

      {/* Historial de Pagos */}
      <div className="table-container">
        <h3>📜 Últimos Pagos Registrados</h3>
        {paymentHistory.length === 0 ? (
          <p className="empty-state">No hay pagos registrados aún</p>
        ) : (
          <table className="payments-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Cliente</th>
                <th>Monto</th>
                <th>Fecha Pago</th>
              </tr>
            </thead>
            <tbody>
              {paymentHistory.slice(0, 20).map((payment, idx) => (
                <tr key={payment.id}>
                  <td>{idx + 1}</td>
                  <td>{payment.client_name || 'N/A'}</td>
                  <td>${(payment.amount / 1000).toFixed(0)}K</td>
                  <td>{new Date(payment.payment_date).toLocaleDateString('es-CO')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Payments;
