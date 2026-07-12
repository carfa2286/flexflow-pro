import React, { useState } from 'react';
import axios from 'axios';

function NewLoan({ clients, settings, onSuccess }) {
  const [client_id, setClientId] = useState('');
  const [amount, setAmount] = useState('');
  const [interestRate, setInterestRate] = useState((settings.interest_rate || 10).toString());
  const [isCustomRate, setIsCustomRate] = useState(false);
  const [frequency, setFrequency] = useState(settings.frequency || 'monthly');
  const [preview, setPreview] = useState(null);

  const handleRateChange = (e) => {
    const value = e.target.value;
    if (value === 'custom') {
      setIsCustomRate(true);
      setInterestRate('');
    } else {
      setIsCustomRate(false);
      setInterestRate(value);
    }
  };

  const handleCustomRateChange = (e) => {
    setInterestRate(e.target.value);
  };

  const handleCalculatePreview = () => {
    if (!amount) {
      alert('Ingresa el monto del préstamo');
      return;
    }

    const rate = parseFloat(interestRate) / 100;
    const loanAmount = parseFloat(amount);
    const interest = loanAmount * rate;

    let frequencyText = '';
    let paymentCycles = 0;

    switch (frequency) {
      case 'daily':
        frequencyText = 'diario';
        paymentCycles = 30; // mes
        break;
      case 'weekly':
        frequencyText = 'semanal';
        paymentCycles = 4;
        break;
      case 'biweekly':
        frequencyText = 'quincenal';
        paymentCycles = 2;
        break;
      default:
        frequencyText = 'mensual';
        paymentCycles = 1;
    }

    setPreview({
      loanAmount,
      interest,
      totalToReceive: loanAmount + interest,
      frequencyText,
      interestPerPayment: interest,
      paymentCycles
    });
  };

  const handleCreateLoan = async (e) => {
    e.preventDefault();

    if (!client_id || !amount) {
      alert('Completa todos los campos requeridos');
      return;
    }

    try {
      await axios.post('/api/loans', {
        client_id: parseInt(client_id),
        amount: parseFloat(amount),
        interest_rate: parseFloat(interestRate),
        frequency
      });
      alert('Préstamo creado correctamente');
      setClientId('');
      setAmount('');
      setInterestRate((settings.interest_rate || 10).toString());
      setIsCustomRate(false);
      setFrequency(settings.frequency || 'monthly');
      setPreview(null);
      onSuccess();
    } catch (err) {
      alert('Error al crear préstamo: ' + err.message);
    }
  };

  return (
    <div className="new-loan-page">
      <h2>➕ Crear Nuevo Préstamo</h2>

      <div className="form-card">
        <form onSubmit={handleCreateLoan}>
          <div className="form-group">
            <label>Cliente *</label>
            <select
              value={client_id}
              onChange={(e) => setClientId(e.target.value)}
              required
            >
              <option value="">-- Selecciona un cliente --</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Monto del Préstamo ($) *</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Ej: 1000"
              required
            />
          </div>

          <div className="form-group">
            <label>Porcentaje de Interés (%) *</label>
            <select value={isCustomRate ? 'custom' : interestRate} onChange={handleRateChange}>
              <option value="5">5%</option>
              <option value="10">10%</option>
              <option value="15">15%</option>
              <option value="20">20%</option>
              <option value="25">25%</option>
              <option value="30">30%</option>
              <option value="custom">📝 Personalizado</option>
            </select>

            {isCustomRate && (
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                placeholder="Ingresa tu porcentaje"
                value={interestRate}
                onChange={handleCustomRateChange}
                style={{ width: '100%', marginTop: '10px', padding: '8px', borderRadius: '4px' }}
                autoFocus
              />
            )}
            <small>{interestRate && !isCustomRate ? `Interés seleccionado: ${interestRate}%` : isCustomRate && interestRate ? `Interés personalizado: ${interestRate}%` : ''}</small>
          </div>

          <div className="form-group">
            <label>Frecuencia de Pago *</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
            >
              <option value="daily">Diario</option>
              <option value="weekly">Semanal</option>
              <option value="biweekly">Quincenal</option>
              <option value="monthly">Mensual</option>
            </select>
          </div>

          <button
            type="button"
            className="btn-secondary"
            onClick={handleCalculatePreview}
          >
            📋 Calcular Vista Previa
          </button>

          <button type="submit" className="btn-primary">
            ✅ Crear Préstamo
          </button>
        </form>
      </div>

      {preview && (
        <div className="preview-card">
          <h3>📊 Vista Previa del Préstamo</h3>
          <div className="preview-details">
            <p><strong>Monto Prestado:</strong> ${preview.loanAmount.toFixed(2)}</p>
            <p><strong>Interés por Pago ({preview.frequencyText}):</strong> ${preview.interestPerPayment.toFixed(2)}</p>
            <p><strong>Total a Recibir (1 ciclo):</strong> ${preview.totalToReceive.toFixed(2)}</p>
            <p><strong>Frecuencia:</strong> {preview.frequencyText}</p>
            <p className="earning"><strong>Ganancia Total:</strong> ${(preview.interest * preview.paymentCycles).toFixed(2)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default NewLoan;
