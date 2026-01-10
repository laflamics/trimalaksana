import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/Card';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { validateUserLogin } from '../../utils/access-control-helper';
import { logLogin } from '../../utils/activity-logger';
import './Login.css';

const DEFAULT_ADMIN = {
  id: 'default-admin',
  fullName: 'System Administrator',
  username: 'admin',
  role: 'Administrator',
  accessCode: '8888', // Super admin password
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
      const providedCode = accessCode.trim();
      
      // Debug logging (remove in production)
      console.log('[Login] Username:', normalizedUsername, 'Expected:', DEFAULT_ADMIN.username);
      console.log('[Login] AccessCode:', providedCode, 'Expected:', DEFAULT_ADMIN.accessCode);
      
      // Check for default admin first (BEFORE checking userAccessControl)
      if (
        normalizedUsername === DEFAULT_ADMIN.username &&
        providedCode === DEFAULT_ADMIN.accessCode
      ) {
        console.log('[Login] Admin login successful');
        const currentUser = {
          id: DEFAULT_ADMIN.id,
          fullName: DEFAULT_ADMIN.fullName,
          username: DEFAULT_ADMIN.username,
          role: DEFAULT_ADMIN.role,
          defaultBusiness: DEFAULT_ADMIN.defaultBusiness,
        };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        if (DEFAULT_ADMIN.defaultBusiness) {
          localStorage.setItem('selectedBusiness', DEFAULT_ADMIN.defaultBusiness);
        }
        // Log login activity (pass user info directly since currentUser not yet in localStorage)
        try {
          await logLogin(
            DEFAULT_ADMIN.id,
            DEFAULT_ADMIN.username,
            DEFAULT_ADMIN.fullName
          );
        } catch (logError) {
          // Silent fail - don't block login if logging fails
        }
        navigate('/', { replace: true });
        return;
      }
      
      // If admin username but wrong password
      if (normalizedUsername === DEFAULT_ADMIN.username && providedCode !== DEFAULT_ADMIN.accessCode) {
        setError('PIN / Access Code salah untuk admin.');
        setLoading(false);
        return;
      }
      
      // If admin username but no password provided
      if (normalizedUsername === DEFAULT_ADMIN.username && !providedCode) {
        setError('PIN / Access Code wajib untuk admin.');
        setLoading(false);
        return;
      }
      
      // Validate user login (checks isActive and deleted status)
      const validation = await validateUserLogin(normalizedUsername);
      if (!validation.valid || !validation.user) {
        setError(validation.error || 'User tidak ditemukan. Hubungi admin untuk registrasi.');
        return;
      }
      
      const target = validation.user;

      const requiredCode = target.accessCode?.trim();

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

      // Log login activity (pass user info directly)
      try {
        await logLogin(
          target.id,
          target.username,
          target.fullName
        );
      } catch (logError) {
        // Silent fail - don't block login if logging fails
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

