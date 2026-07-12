import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ClientPublicProfile from './ClientPublicProfile';

function PublicProfiles() {
  const [profiles, setProfiles] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = () => {
    axios.get('/api/clients/public-profiles')
      .then(res => {
        setProfiles(res.data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error cargando perfiles:', err);
        setLoading(false);
      });
  };

  if (loading) {
    return <div className="loading">Cargando perfiles públicos...</div>;
  }

  if (profiles.length === 0) {
    return (
      <div className="public-profiles-page">
        <h2>👥 Perfiles Públicos de Confianza</h2>
        <div className="empty-state">
          <p>No hay perfiles públicos disponibles aún</p>
          <small>Los clientes pueden habilitar su perfil público para mostrar su historial de confiabilidad</small>
        </div>
      </div>
    );
  }

  return (
    <div className="public-profiles-page">
      <h2>👥 Perfiles Públicos de Confianza</h2>
      <p className="subtitle">TOP Clientes verificados por confiabilidad</p>

      <div className="profiles-grid">
        {profiles.map((profile, idx) => (
          <div
            key={profile.id}
            className="profile-card"
            onClick={() => setSelectedProfile(profile.id)}
            style={{
              cursor: 'pointer',
              borderLeft: `4px solid ${profile.score >= 80 ? '#10b981' : profile.score >= 60 ? '#f59e0b' : '#ef4444'}`
            }}
          >
            <div className="profile-rank">
              {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
            </div>

            <h3>{profile.name}</h3>

            <div className="profile-stars">
              {[...Array(5)].map((_, i) => (
                <span key={i} style={{ color: i < profile.stars ? '#fbbf24' : '#d1d5db', fontSize: '20px' }}>
                  ★
                </span>
              ))}
            </div>

            <div className="profile-info">
              <p><strong>{profile.score}</strong>/100</p>
              <p className="secondary">{profile.on_time_percentage}% puntualidad</p>
              <p className="secondary">{profile.total_loans} préstamos</p>
            </div>

            <div className="profile-volume">
              <p>💰 ${(profile.total_loaned / 1000000).toFixed(1)}M prestados</p>
            </div>

            <button className="view-btn">Ver Perfil →</button>
          </div>
        ))}
      </div>

      {selectedProfile && (
        <div className="modal-overlay" onClick={() => setSelectedProfile(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <ClientPublicProfile
              clientId={selectedProfile}
              onClose={() => setSelectedProfile(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default PublicProfiles;
