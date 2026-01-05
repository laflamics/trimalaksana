import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/Card';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { storageService } from '../../services/storage';
import './Login.css';

interface StoredUserAccess {
  id: string;
  fullName: string;
  username: string;
  role?: string;
  accessCode?: string;
  defaultBusiness?: string;
  businessUnits?: string[];
}

const DEFAULT_ADMIN = {
  id: 'default-admin',
  fullName: 'System Administrator',
  username: 'admin',
  role: 'Administrator',
  accessCode: 'admin',
  defaultBusiness: 'packaging',
  businessUnits: ['packaging'],
};

const Login = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Masukkan username terlebih dahulu.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const normalizedUsername = username.trim().toLowerCase();
      const users =
        (await storageService.get<StoredUserAccess[]>('userAccessControl')) || [];
      let target =
        users.find(
          (user) => (user.username || '').toLowerCase() === normalizedUsername
        ) || null;

      if (!target) {
        if (
          normalizedUsername === DEFAULT_ADMIN.username &&
          accessCode.trim() === DEFAULT_ADMIN.accessCode
        ) {
          target = DEFAULT_ADMIN;
        } else {
          setError('User tidak ditemukan. Hubungi admin untuk registrasi.');
          return;
        }
      }

      const requiredCode = target.accessCode?.trim();
      const providedCode = accessCode.trim();

      if (requiredCode) {
        if (!providedCode) {
          setError('Masukkan PIN / Access Code.');
          return;
        }
        if (requiredCode !== providedCode) {
          setError('PIN / Access Code salah.');
          return;
        }
      }

      const currentUser = {
        id: target.id,
        fullName: target.fullName,
        username: target.username,
        role: target.role,
        defaultBusiness: target.defaultBusiness,
      };

      localStorage.setItem('currentUser', JSON.stringify(currentUser));

      if (target.defaultBusiness) {
        localStorage.setItem('selectedBusiness', target.defaultBusiness);
      } else {
        localStorage.removeItem('selectedBusiness');
      }

      navigate('/', { replace: true });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Login gagal. Coba ulangi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-hero">
        <h1>PT Trima Laksana Jaya Pratama</h1>
        <p>Enterprise Resource Planning Platform</p>
        <ul>
          <li>Kelola multi unit bisnis (Packaging, Trading, Tracking)</li>
          <li>Akses menu mengikuti hak akses setiap user</li>
          <li>Keamanan tambahan melalui PIN / access code</li>
        </ul>
      </div>

      <Card className="login-card" title="Masuk ke Dashboard">
        <form onSubmit={handleSubmit} className="login-form">
          <Input
            label="Username"
            value={username}
            onChange={setUsername}
            placeholder="contoh: ppic.sari"
          />
          <Input
            label="PIN / Access Code"
            type="password"
            value={accessCode}
            onChange={setAccessCode}
            placeholder="opsional jika tidak diset"
          />

          {error && <div className="login-error">{error}</div>}

          <Button type="submit" disabled={loading}>
            {loading ? 'Memproses...' : 'Login'}
          </Button>
        </form>

        <div className="login-hint">
          <p>
            <code></code>
            <strong></strong>.
          </p>
        </div>
      </Card>
    </div>
  );
};

export default Login;

