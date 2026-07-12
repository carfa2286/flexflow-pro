import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Settings({ settings, onSave }) {
  const [interest_rate, setInterestRate] = useState(settings.interest_rate || 10);
  const [frequency, setFrequency] = useState(settings.frequency || 'monthly');

  useEffect(() => {
    setInterestRate(settings.interest_rate || 10);
    setFrequency(settings.frequency || 'monthly');
  }, [settings]);

  const handleSave = async (e) => {
    e.preventDefault();

    try {
      await axios.post('/api/settings', {
        interest_rate: parseFloat(interest_rate),
        frequency
      });
      alert('Configuración guardada correctamente');
      onSave();
    } catch (err) {
      alert('Error al guardar: ' + err.message);
    }
  };

  return (
    <div className="settings-page">
      <h2>⚙️ Configuración</h2>

      <div className="form-card">
        <h3>Preferencias Predeterminadas</h3>
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label>Porcentaje de Interés Predeterminado (%)</label>
            <select
              value={interest_rate}
              onChange={(e) => setInterestRate(e.target.value)}
            >
              <option value="5">5%</option>
              <option value="10">10%</option>
              <option value="15">15%</option>
              <option value="20">20%</option>
              <option value="25">25%</option>
              <option value="30">30%</option>
            </select>
            <small>Este valor se usará por defecto al crear nuevos préstamos</small>
          </div>

          <div className="form-group">
            <label>Frecuencia de Pago Predeterminada</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
            >
              <option value="daily">Diario</option>
              <option value="weekly">Semanal</option>
              <option value="biweekly">Quincenal</option>
              <option value="monthly">Mensual</option>
            </select>
            <small>Esta será la frecuencia por defecto para nuevos préstamos</small>
          </div>

          <button type="submit" className="btn-primary">💾 Guardar Configuración</button>
        </form>
      </div>

      <div className="info-card">
        <h3>ℹ️ Información</h3>
        <p>
          <strong>Configuración Actual:</strong>
        </p>
        <ul>
          <li>Interés predeterminado: {interest_rate}%</li>
          <li>Frecuencia predeterminada: {frequency}</li>
        </ul>
        <p className="note">
          💡 <strong>Nota:</strong> Estos valores se aplicarán como predeterminados.
          Puedes cambiarlos para cada préstamo individual al crearlo.
        </p>
      </div>
    </div>
  );
}

export default Settings;
