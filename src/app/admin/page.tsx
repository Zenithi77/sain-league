'use client';

import { useState, useEffect, FormEvent } from 'react';
import { TeamWithAverages } from '@/types';
import AdminGuard from '@/components/AdminGuard';
import { useAuth } from '@/contexts/AuthContext';

function AdminContent() {
  const [teams, setTeams] = useState<TeamWithAverages[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { userData } = useAuth();

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const res = await fetch('/api/teams');
      const data = await res.json();
      setTeams(data);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadStatus({ message: 'Файл сонгоно уу', type: 'error' });
      return;
    }

    setIsUploading(true);
    setUploadStatus(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    // Get optional game result
    const homeTeamSelect = document.getElementById('homeTeamSelect') as HTMLSelectElement;
    const awayTeamSelect = document.getElementById('awayTeamSelect') as HTMLSelectElement;
    const homeScore = document.getElementById('homeScore') as HTMLInputElement;
    const awayScore = document.getElementById('awayScore') as HTMLInputElement;

    if (homeTeamSelect.value && awayTeamSelect.value && homeScore.value && awayScore.value) {
      formData.append('homeTeamId', homeTeamSelect.value);
      formData.append('awayTeamId', awayTeamSelect.value);
      formData.append('homeScore', homeScore.value);
      formData.append('awayScore', awayScore.value);
    }

    try {
      const res = await fetch('/api/upload/game-stats', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (res.ok) {
        setUploadStatus({ message: data.message, type: 'success' });
        setSelectedFile(null);
        (document.getElementById('excelFile') as HTMLInputElement).value = '';
      } else {
        setUploadStatus({ message: data.error || 'Алдаа гарлаа', type: 'error' });
      }
    } catch (error) {
      setUploadStatus({ message: 'Сервертэй холбогдоход алдаа гарлаа', type: 'error' });
    }
    setIsUploading(false);
  };

  const handleAddPlayer = async (e: FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const playerData = {
      name: formData.get('name'),
      teamId: formData.get('teamId'),
      number: parseInt(formData.get('number') as string),
      position: formData.get('position'),
      height: formData.get('height'),
      weight: formData.get('weight'),
      age: parseInt(formData.get('age') as string) || 0,
    };

    try {
      const res = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(playerData),
      });

      if (res.ok) {
        alert('Тоглогч амжилттай нэмэгдлээ!');
        form.reset();
      } else {
        alert('Алдаа гарлаа');
      }
    } catch (error) {
      alert('Сервертэй холбогдоход алдаа гарлаа');
    }
  };

  const handleAddTeam = async (e: FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const teamData = {
      name: formData.get('name'),
      shortName: formData.get('shortName'),
      city: formData.get('city'),
      coachName: formData.get('coachName'),
      primaryColor: formData.get('primaryColor'),
      secondaryColor: formData.get('secondaryColor'),
    };

    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(teamData),
      });

      if (res.ok) {
        alert('Баг амжилттай нэмэгдлээ!');
        form.reset();
        fetchTeams();
      } else {
        alert('Алдаа гарлаа');
      }
    } catch (error) {
      alert('Сервертэй холбогдоход алдаа гарлаа');
    }
  };

  const handleAddGame = async (e: FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const gameData = {
      date: formData.get('date'),
      homeTeamId: formData.get('homeTeamId'),
      awayTeamId: formData.get('awayTeamId'),
    };

    try {
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gameData),
      });

      if (res.ok) {
        alert('Тоглолт амжилттай нэмэгдлээ!');
        form.reset();
      } else {
        alert('Алдаа гарлаа');
      }
    } catch (error) {
      alert('Сервертэй холбогдоход алдаа гарлаа');
    }
  };

  const downloadTemplate = () => {
    window.open('/api/download/template', '_blank');
  };

  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<any>(null);

  const handleMigration = async () => {
    if (!confirm('Бүх өгөгдлийг Firebase руу шилжүүлэх үү? Энэ үйлдлийг буцаах боломжгүй.')) {
      return;
    }
    setIsMigrating(true);
    try {
      const res = await fetch('/api/migrate', { method: 'POST' });
      const data = await res.json();
      setMigrationResult(data);
      if (data.success) {
        alert('Амжилттай шилжүүллээ!');
      }
    } catch (error) {
      alert('Шилжүүлэхэд алдаа гарлаа');
    }
    setIsMigrating(false);
  };

  return (
    <main className="main-content">
      <div className="page-header">
        <h1><i className="fas fa-cog"></i> Админ Панел</h1>
        <p>Мэдээлэл удирдах, Excel файл оруулах</p>
        {userData && (
          <p style={{ color: 'var(--primary-color)', marginTop: '10px' }}>
            <i className="fas fa-user-shield"></i> {userData.email} ({userData.role})
          </p>
        )}
      </div>

      {/* Firebase Migration Section */}
      <section className="admin-section" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}>
        <h3><i className="fas fa-database"></i> Firebase руу өгөгдөл шилжүүлэх</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
          Одоогийн database.json файлаас Firebase Firestore руу бүх өгөгдлийг шилжүүлнэ.
          Энэ үйлдлийг зөвхөн нэг удаа хийнэ.
        </p>
        <button 
          onClick={handleMigration} 
          className="btn btn-primary"
          disabled={isMigrating}
          style={{ background: '#4CAF50' }}
        >
          <i className="fas fa-cloud-upload-alt"></i> 
          {isMigrating ? 'Шилжүүлж байна...' : 'Firebase руу шилжүүлэх'}
        </button>
        {migrationResult && (
          <div style={{ marginTop: '15px', padding: '15px', background: 'var(--bg-card)', borderRadius: '10px' }}>
            <p><strong>Үр дүн:</strong></p>
            <p>Багууд: {migrationResult.results?.teams || 0}</p>
            <p>Тоглогчид: {migrationResult.results?.players || 0}</p>
            <p>Тоглолтууд: {migrationResult.results?.games || 0}</p>
            <p>Улирал: {migrationResult.results?.season ? 'Тийм' : 'Үгүй'}</p>
          </div>
        )}
      </section>

      {/* Upload Status Alert */}
      {uploadStatus && (
        <div className={`alert alert-${uploadStatus.type}`}>
          <i className={`fas fa-${uploadStatus.type === 'success' ? 'check-circle' : 'exclamation-circle'}`}></i>
          {uploadStatus.message}
        </div>
      )}

      {/* Upload Game Stats Section */}
      <section className="admin-section">
        <h3><i className="fas fa-file-excel"></i> Тоглолтын статистик оруулах (Excel)</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
          Тоглолт дууссаны дараа тоглогчдын статистик мэдээллийг Excel файлаар оруулна.
          Системд мэдээлэл шинэчлэгдэж, дундаж тооцоолол автоматаар хийгдэнэ.
        </p>

        <form onSubmit={handleUploadSubmit}>
          {/* File Upload Area */}
          <div className="file-upload" onClick={() => document.getElementById('excelFile')?.click()}>
            <i className="fas fa-cloud-upload-alt"></i>
            <p>Excel файлаа энд чирж тавина уу</p>
            <p>эсвэл дарж сонгоно уу</p>
            <input
              type="file"
              id="excelFile"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </div>
          {selectedFile && (
            <p style={{ marginTop: '10px', color: 'var(--primary-color)' }}>
              <i className="fas fa-file-excel"></i> {selectedFile.name}
            </p>
          )}

          {/* Optional: Game Result */}
          <div style={{ marginTop: '25px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
            <h4 style={{ marginBottom: '15px' }}>Тоглолтын үр дүн (заавал биш)</h4>
            <div className="form-row">
              <div className="form-group">
                <label>Гэрийн баг</label>
                <select id="homeTeamSelect" className="team-select">
                  <option value="">Баг сонгох</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Гэрийн оноо</label>
                <input type="number" id="homeScore" placeholder="0" />
              </div>
              <div className="form-group">
                <label>Зочин баг</label>
                <select id="awayTeamSelect" className="team-select">
                  <option value="">Баг сонгох</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Зочин оноо</label>
                <input type="number" id="awayScore" placeholder="0" />
              </div>
            </div>
          </div>

          <div style={{ marginTop: '20px', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
            <button type="submit" className="btn btn-primary" disabled={isUploading}>
              <i className="fas fa-upload"></i> {isUploading ? 'Уншиж байна...' : 'Upload хийх'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={downloadTemplate}>
              <i className="fas fa-download"></i> Загвар татах
            </button>
          </div>
        </form>
      </section>

      {/* Excel Format Guide */}
      <section className="admin-section">
        <h3><i className="fas fa-info-circle"></i> Excel файлын формат</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '15px' }}>
          Excel файл дараах баганатай байх ёстой:
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table className="stats-table">
            <thead>
              <tr>
                <th>PlayerName</th>
                <th>Team</th>
                <th>Number</th>
                <th>Position</th>
                <th>Minutes</th>
                <th>Points</th>
                <th>Rebounds</th>
                <th>Assists</th>
                <th>Steals</th>
                <th>Blocks</th>
                <th>Turnovers</th>
                <th>Fouls</th>
                <th>FGM</th>
                <th>FGA</th>
                <th>3PM</th>
                <th>3PA</th>
                <th>FTM</th>
                <th>FTA</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Сарангоо</td>
                <td>UBW</td>
                <td>23</td>
                <td>PG</td>
                <td>32</td>
                <td>18</td>
                <td>5</td>
                <td>8</td>
                <td>2</td>
                <td>1</td>
                <td>3</td>
                <td>2</td>
                <td>7</td>
                <td>14</td>
                <td>2</td>
                <td>5</td>
                <td>2</td>
                <td>3</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Add New Player Section */}
      <section className="admin-section">
        <h3><i className="fas fa-user-plus"></i> Шинэ тоглогч нэмэх</h3>
        <form onSubmit={handleAddPlayer}>
          <div className="form-row">
            <div className="form-group">
              <label>Нэр</label>
              <input type="text" name="name" required placeholder="Тоглогчийн нэр" />
            </div>
            <div className="form-group">
              <label>Баг</label>
              <select name="teamId" className="team-select" required>
                <option value="">Баг сонгох</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Дугаар</label>
              <input type="number" name="number" required placeholder="23" />
            </div>
            <div className="form-group">
              <label>Байрлал</label>
              <select name="position" required>
                <option value="PG">PG - Point Guard</option>
                <option value="SG">SG - Shooting Guard</option>
                <option value="SF">SF - Small Forward</option>
                <option value="PF">PF - Power Forward</option>
                <option value="C">C - Center</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Өндөр</label>
              <input type="text" name="height" placeholder="175 см" />
            </div>
            <div className="form-group">
              <label>Жин</label>
              <input type="text" name="weight" placeholder="65 кг" />
            </div>
            <div className="form-group">
              <label>Нас</label>
              <input type="number" name="age" placeholder="22" />
            </div>
            <div className="form-group">
              <label>&nbsp;</label>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                <i className="fas fa-plus"></i> Нэмэх
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* Add New Team Section */}
      <section className="admin-section">
        <h3><i className="fas fa-users"></i> Шинэ баг нэмэх</h3>
        <form onSubmit={handleAddTeam}>
          <div className="form-row">
            <div className="form-group">
              <label>Багийн нэр</label>
              <input type="text" name="name" required placeholder="Ulaanbaatar Warriors" />
            </div>
            <div className="form-group">
              <label>Товчлол (3-4 үсэг)</label>
              <input type="text" name="shortName" required placeholder="UBW" maxLength={4} />
            </div>
            <div className="form-group">
              <label>Хот</label>
              <input type="text" name="city" required placeholder="Улаанбаатар" />
            </div>
            <div className="form-group">
              <label>Дасгалжуулагч</label>
              <input type="text" name="coachName" placeholder="Нэр" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Үндсэн өнгө</label>
              <input type="color" name="primaryColor" defaultValue="#FF6B35" />
            </div>
            <div className="form-group">
              <label>Хоёрдогч өнгө</label>
              <input type="color" name="secondaryColor" defaultValue="#1A1A2E" />
            </div>
            <div className="form-group">
              <label>&nbsp;</label>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                <i className="fas fa-plus"></i> Баг нэмэх
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* Add New Game Section */}
      <section className="admin-section">
        <h3><i className="fas fa-calendar-plus"></i> Шинэ тоглолт нэмэх</h3>
        <form onSubmit={handleAddGame}>
          <div className="form-row">
            <div className="form-group">
              <label>Огноо</label>
              <input type="date" name="date" required />
            </div>
            <div className="form-group">
              <label>Гэрийн баг</label>
              <select name="homeTeamId" className="team-select" required>
                <option value="">Баг сонгох</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Зочин баг</label>
              <select name="awayTeamId" className="team-select" required>
                <option value="">Баг сонгох</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>&nbsp;</label>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                <i className="fas fa-plus"></i> Тоглолт нэмэх
              </button>
            </div>
          </div>
        </form>
      </section>
    </main>
  );
}

export default function AdminPage() {
  return (
    <AdminGuard>
      <AdminContent />
    </AdminGuard>
  );
}
