'use client';

import { useState, useEffect } from 'react';
import { PlayerWithAverages } from '@/types';

interface AdminProfileImages {
  players: PlayerWithAverages[];
  teams: any[];
}

export default function AdminProfileImages() {
  const [activeTab, setActiveTab] = useState<'players' | 'teams'>('players');
  const [players, setPlayers] = useState<PlayerWithAverages[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const playersRes = await fetch('/api/players');
      const teamsRes = await fetch('/api/teams');
      
      if (playersRes.ok) {
        const playersData = await playersRes.json();
        setPlayers(playersData);
      }
      if (teamsRes.ok) {
        const teamsData = await teamsRes.json();
        setTeams(teamsData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleSaveImage = async () => {
    if (!selectedId || !imageUrl.trim()) {
      alert('Зураг сонгооч');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/profile-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: activeTab === 'players' ? 'player' : 'team',
          id: selectedId,
          imageUrl: imageUrl.trim()
        })
      });

      if (response.ok) {
        alert('Зураг амжилттай хадгалагдлаа');
        setImageUrl('');
        setSelectedId('');
        fetchData();
      } else {
        alert('Aldaa: ' + (await response.text()));
      }
    } catch (error) {
      console.error('Error saving image:', error);
      alert('Error saving image');
    } finally {
      setLoading(false);
    }
  };

  const filteredPlayers = players.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTeams = teams.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <section style={{
      backgroundColor: '#fff',
      borderRadius: '8px',
      padding: '24px',
      marginBottom: '24px',
      border: '1px solid #e0e0e0'
    }}>
      <h2 style={{ marginTop: 0, marginBottom: '24px', fontSize: '20px', fontWeight: '600' }}>
        <i className="fas fa-image"></i> Профайл Зураг Удирдах
      </h2>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        borderBottom: '2px solid #f0f0f0',
        paddingBottom: '12px'
      }}>
        {(['players', 'teams'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setSelectedId('');
              setSearchTerm('');
            }}
            style={{
              padding: '10px 16px',
              border: 'none',
              backgroundColor: activeTab === tab ? '#ff6b35' : '#f5f5f5',
              color: activeTab === tab ? '#fff' : '#666',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              transition: 'all 0.3s'
            }}
          >
            {tab === 'players' ? '🏀 Тоглогчид' : '👥 Багууд'}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Left: List */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: '600',
            marginBottom: '8px',
            color: '#666',
            textTransform: 'uppercase'
          }}>
            {activeTab === 'players' ? 'Тоглогч сонгох' : 'Баг сонгох'}
          </label>
          
          <input
            type="text"
            placeholder="Хайх..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              marginBottom: '12px',
              fontSize: '14px'
            }}
          />

          <div style={{
            border: '1px solid #e0e0e0',
            borderRadius: '4px',
            maxHeight: '400px',
            overflowY: 'auto',
            backgroundColor: '#f9f9f9'
          }}>
            {(activeTab === 'players' ? filteredPlayers : filteredTeams).map(item => (
              <div
                key={item.id}
                onClick={() => {
                  setSelectedId(item.id);
                  setImageUrl(item.image || '');
                }}
                style={{
                  padding: '12px',
                  borderBottom: '1px solid #e0e0e0',
                  cursor: 'pointer',
                  backgroundColor: selectedId === item.id ? '#fff3e0' : '#fff',
                  transition: 'background-color 0.2s'
                }}
              >
                <div style={{ fontWeight: selectedId === item.id ? '600' : '400', color: '#1a1a2e' }}>
                  {item.name}
                </div>
                {activeTab === 'players' && (
                  <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                    #{item.number} • {item.position}
                  </div>
                )}
                {item.image && (
                  <div style={{ fontSize: '12px', color: '#0066cc', marginTop: '4px' }}>
                    ✓ Зураг байгаа
                  </div>
                )}
              </div>
            ))}
            {((activeTab === 'players' ? filteredPlayers : filteredTeams).length === 0) && (
              <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                Үр дүн олдсонгүй
              </div>
            )}
          </div>
        </div>

        {/* Right: Image Editor */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: '600',
            marginBottom: '8px',
            color: '#666',
            textTransform: 'uppercase'
          }}>
            Зургийн URL
          </label>

          {selectedId ? (
            <>
              {/* Preview */}
              <div style={{
                width: '100%',
                height: '200px',
                backgroundColor: '#f0f0f0',
                borderRadius: '4px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                border: '2px dashed #ddd'
              }}>
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt="Preview"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                    onError={() => alert('Зургийг сайтаас ачаалж чадсангүй')}
                  />
                ) : (
                  <div style={{ textAlign: 'center', color: '#999' }}>
                    <i className="fas fa-image" style={{ fontSize: '48px', marginBottom: '8px', display: 'block' }}></i>
                    Зургийн урьдчилсан харагдац
                  </div>
                )}
              </div>

              {/* URL Input */}
              <input
                type="url"
                placeholder="https://example.com/image.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  marginBottom: '12px',
                  boxSizing: 'border-box'
                }}
              />

              {/* Quick URL Examples */}
              <div style={{ marginBottom: '16px', fontSize: '12px' }}>
                <p style={{ margin: '0 0 8px 0', color: '#666', fontWeight: '600' }}>URL жишээ:</p>
                <ul style={{ margin: '0', paddingLeft: '16px', color: '#999' }}>
                  <li>https://via.placeholder.com/500x500?text=PlayerName</li>
                  <li>https://images.unsplash.com/photo-xxx</li>
                </ul>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSaveImage}
                disabled={loading || !imageUrl.trim()}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: !imageUrl.trim() ? '#ccc' : '#ff6b35',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: !imageUrl.trim() ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.3s'
                }}
              >
                {loading ? 'Хадгалаж байна...' : '💾 Хадгалах'}
              </button>
            </>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: '#999',
              backgroundColor: '#f9f9f9',
              borderRadius: '4px'
            }}>
              <i className="fas fa-info-circle" style={{ fontSize: '32px', marginBottom: '12px', display: 'block' }}></i>
              <p>Зургийг хүсэлтээ туулаахын үед тоглогч эсвэл багыг сонгоно уу</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
