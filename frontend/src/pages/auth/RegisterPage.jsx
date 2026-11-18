import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import BrandLogo from '../../components/BrandLogo.jsx';
import FormInput from '../../components/FormInput.jsx';
import { getErrorMessage } from '../../utils/formatters.js';

export default function RegisterPage() {
  const { user, register, dbStatus } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    dateOfBirth: '',
    gender: 'Prefer not to say',
    bloodGroup: 'Unknown',
    address: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [imgFailed, setImgFailed] = useState(false);

  if (user) {
    return <Navigate to={`/${user.role}`} replace />;
  }

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await register({
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone,
        dateOfBirth: form.dateOfBirth || null,
        gender: form.gender,
        bloodGroup: form.bloodGroup,
        address: form.address,
      });
      showToast('Patient account created successfully.');
      navigate('/patient', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Registration failed.'));
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
          <h2>Direct access to your doctors, appointments, and records.</h2>
          <p>
            Register as a patient to browse clinical departments, reserve appointment
            slots, view prescriptions, and review billing statements.
          </p>
          <div className="auth-visual-tagline">Modern Healthcare. Connected Care.</div>
        </div>
      </div>

      <div className="auth-panel">
        <div className="auth-card">
          <div className="auth-brand">
            <BrandLogo size="md" showSubtitle showTagline />
          </div>

          <h1 className="auth-title">Patient Registration</h1>
          <p className="auth-subtitle">
            Create your personal patient portal account.
          </p>

          {!dbStatus.isConnected && (
            <div className="alert-banner alert-banner--warning" role="status">
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
              <div>
                <strong>Database not connected:</strong>{' '}
                {dbStatus.message || 'Please configure MONGO_URI to enable registration.'}
              </div>
            </div>
          )}

          {error && (
            <div className="alert-banner alert-banner--error" role="alert">
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <FormInput
                label="Full Name"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Jane Doe"
                required
                className="form-grid-full"
              />

              <FormInput
                label="Email Address"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="jane@example.com"
                required
              />

              <FormInput
                label="Phone Number"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="+1 555 0199"
              />

              <FormInput
                label="Password"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Min 6 characters"
                required
              />

              <FormInput
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Repeat password"
                required
              />

              <FormInput
                label="Date of Birth"
                name="dateOfBirth"
                type="date"
                value={form.dateOfBirth}
                onChange={handleChange}
              />

              <FormInput
                label="Gender"
                name="gender"
                type="select"
                value={form.gender}
                onChange={handleChange}
                options={['Prefer not to say', 'Female', 'Male', 'Other']}
              />

              <FormInput
                label="Blood Group"
                name="bloodGroup"
                type="select"
                value={form.bloodGroup}
                onChange={handleChange}
                options={['Unknown', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']}
              />

              <FormInput
                label="Residential Address"
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="Street, City, State"
              />
            </div>

            <button
              type="submit"
              className="btn btn-teal"
              style={{ width: '100%', marginTop: '18px' }}
              disabled={submitting}
            >
              {submitting ? 'Creating Account...' : 'Create Patient Account'}
            </button>
          </form>

          <div className="auth-footer">
            Already have an account?{' '}
            <Link to="/login" style={{ fontWeight: 600 }}>
              Sign in here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
