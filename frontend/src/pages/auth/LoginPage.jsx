import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { AlertCircle, ShieldCheck, Stethoscope, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import BrandLogo from '../../components/BrandLogo.jsx';
import FormInput from '../../components/FormInput.jsx';
import { getErrorMessage } from '../../utils/formatters.js';

const ROLE_OPTIONS = [
  {
    value: 'patient',
    title: 'Patient Login',
    shortLabel: 'Patient',
    subtitle: 'Sign in to book visits, review medical records, prescriptions, and billing.',
    placeholder: 'patient@example.com',
    icon: User,
    accentClass: 'is-patient',
  },
  {
    value: 'doctor',
    title: 'Doctor Login',
    shortLabel: 'Doctor',
    subtitle: 'Sign in to manage consultations, patient charts, prescriptions, and availability.',
    placeholder: 'doctor@hospital.org',
    icon: Stethoscope,
    accentClass: 'is-doctor',
  },
  {
    value: 'admin',
    title: 'Admin Login',
    shortLabel: 'Admin',
    subtitle: 'Sign in to oversee doctors, patients, scheduling, records, and hospital billing.',
    placeholder: 'admin@hospital.org',
    icon: ShieldCheck,
    accentClass: 'is-admin',
  },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const { user, login, dbStatus } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [selectedRole, setSelectedRole] = useState('patient');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [imgFailed, setImgFailed] = useState(false);

  if (user) {
    return <Navigate to={`/${user.role}`} replace />;
  }

  const activeRole = ROLE_OPTIONS.find((item) => item.value === selectedRole) || ROLE_OPTIONS[0];

  const handleRoleSelect = (roleValue) => {
    setSelectedRole(roleValue);
    setError('');
    setFieldErrors({ email: '', password: '' });
  };

  const validateForm = () => {
    const nextErrors = { email: '', password: '' };
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      nextErrors.email = 'Please enter your email address.';
    } else if (!EMAIL_PATTERN.test(trimmedEmail)) {
      nextErrors.email = 'Please enter a valid email address.';
    }

    if (!password) {
      nextErrors.password = 'Please enter your password.';
    } else if (password.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters.';
    }

    setFieldErrors(nextErrors);
    return !nextErrors.email && !nextErrors.password;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      const data = await login(email.trim(), password, selectedRole);
      showToast(`Welcome back, ${data.user.name}`);
      navigate(`/${data.user.role}`, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Invalid email or password.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-visual">
        {!imgFailed && (
          <img
            src="/src/assets/images/hospital_atrium_hero_1795002380307.jpg"
            alt="Meridian Health hospital reception atrium"
            className="auth-visual-img"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
          />
        )}
        <div className="auth-visual-scrim" />
        <div className="auth-visual-content">
          <span className="auth-visual-kicker">Meridian Health · Hospital Management System</span>
          <h2>Coordinated care across every clinical department.</h2>
          <p>
            Unified scheduling, digital medical records, prescriptions, and billing
            for hospital administrators, physicians, and patients.
          </p>
          <div className="auth-visual-tagline">Modern Healthcare. Connected Care.</div>
        </div>
      </div>

      <div className="auth-panel">
        <div className="auth-card auth-card--login">
          <div className="auth-brand">
            <BrandLogo size="md" showSubtitle showTagline />
          </div>

          <div className="role-selector-section">
            <span className="role-selector-label">Select Login Portal</span>
            <div className="role-selector-grid" role="tablist" aria-label="Login role selection">
              {ROLE_OPTIONS.map((roleOption) => {
                const Icon = roleOption.icon;
                const isSelected = selectedRole === roleOption.value;
                return (
                  <button
                    key={roleOption.value}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    className={`role-option-card ${roleOption.accentClass} ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => handleRoleSelect(roleOption.value)}
                  >
                    <span className="role-option-icon" aria-hidden="true">
                      <Icon size={15} />
                    </span>
                    <span className="role-option-title">{roleOption.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="auth-selected-header">
            <h1 className="auth-title">{activeRole.title}</h1>
            <p className="auth-subtitle">{activeRole.subtitle}</p>
          </div>

          {!dbStatus.isConnected && (
            <div className="alert-banner alert-banner--warning" role="status">
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
              <div>
                <strong>Database not connected:</strong>{' '}
                {dbStatus.message || 'Please configure MONGO_URI to enable sign in.'}
              </div>
            </div>
          )}

          {error && (
            <div className="alert-banner alert-banner--error" role="alert">
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <FormInput
              label="Email Address"
              name="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }));
              }}
              placeholder={activeRole.placeholder}
              error={fieldErrors.email}
              autoComplete="email"
              required
            />

            <FormInput
              label="Password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }));
              }}
              placeholder="Enter your password"
              error={fieldErrors.password}
              autoComplete="current-password"
              required
            />

            <button
              type="submit"
              className={`btn ${selectedRole === 'doctor' ? 'btn-teal' : 'btn-primary'}`}
              style={{ width: '100%', marginTop: '8px' }}
              disabled={submitting}
            >
              {submitting ? `Signing in as ${activeRole.shortLabel}...` : `Sign In to ${activeRole.title}`}
            </button>
          </form>

          <div className="auth-footer">
            <span>New patient at Meridian Health? </span>
            <Link to="/register" style={{ fontWeight: 600 }}>
              Create a patient account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
