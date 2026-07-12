import React, { useState, useEffect } from 'react';
import axios from 'axios';

function ClientPublicProfile({ clientId, onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) return;

    axios.get(`/api/clients/${clientId}/public-profile`)
      .then(res => {
        setProfile(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error cargando perfil:', err);
        setLoading(false);
      });
  }, [clientId]);

  if (loading) return <div className="loading">Cargando perfil...</div>;
  if (!profile) return <div className="error">Perfil no encontrado</div>;

  const scoreColor = profile.score >= 80 ? '#10b981' : profile.score >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div className="public-profile-modal">
      <div className="profile-header">
        <button className="close-btn" onClick={onClose}>✕</button>
        <h2>{profile.name}</h2>
        <p className="profile-views">👁️ {profile.profile_views} visualizaciones</p>
      </div>

      <div className="profile-content">
        {/* Score y Stars */}
        <div className="profile-score">
          <div className="stars-display">
            {[...Array(5)].map((_, i) => (
              <span key={i} style={{ color: i < profile.stars ? '#fbbf24' : '#d1d5db', fontSize: '24px' }}>
                ★
              </span>
            ))}
          </div>
          <p className="score-text" style={{ color: scoreColor }}>
            <strong>Score: {profile.score}/100</strong>
          </p>
        </div>

        {/* Estadísticas */}
        <div className="profile-stats">
          <div className="stat-card">
            <h4>📊 Puntualidad</h4>
            <p className="stat-value">{profile.on_time_percentage}%</p>
            <small>Pagos a tiempo</small>
          </div>
          <div className="stat-card">
            <h4>🎯 Préstamos</h4>
            <p className="stat-value">{profile.total_loans}</p>
            <small>Total completados</small>
          </div>
          <div className="stat-card">
            <h4>💰 Volumen</h4>
            <p className="stat-value">${(profile.total_loaned / 1000000).toFixed(1)}M</p>
            <small>Total prestado</small>
          </div>
        </div>

        {/* Badges */}
        {profile.badges && profile.badges.length > 0 && (
          <div className="profile-badges">
            <h3>🎖️ Insignias</h3>
            <div className="badges-container">
              {profile.badges.map((badge, idx) => (
                <div key={idx} className="badge">
                  <span className="badge-icon">{badge.icon}</span>
                  <span className="badge-name">{badge.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Confiabilidad */}
        <div className="profile-trustworthiness">
          <h3>✅ Confiabilidad</h3>
          {profile.on_time_percentage === 100 ? (
            <p style={{ color: '#10b981' }}>✓ Historial perfecto de pagos</p>
          ) : (
            <p>Historial de pagos verificado</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ClientPublicProfile;
