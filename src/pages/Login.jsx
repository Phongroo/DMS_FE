import { useState } from 'react';

const AUTH_BASE_URL = import.meta.env.VITE_AUTH_URL || 'http://192.168.42.243:8080';

function Login({ onLogin }) {
  const [username, setUsername] = useState('hongphong');
  const [password, setPassword] = useState('123456');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${AUTH_BASE_URL}/generate-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Đăng nhập thất bại. Kiểm tra lại tài khoản.');
        setLoading(false);
        return;
      }

      onLogin({ token: result.token, username: result.username, role: result.role });
    } catch (err) {
      setError('Không thể kết nối đến server.');
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Left side: branding and features (hidden on mobile) */}
      <div className="login-brand-panel">
        <div className="login-brand-overlay"></div>
        <div className="login-brand-content">
          <div className="login-logo-badge">DMS</div>
          <h1 className="login-brand-title">DMS Approval Hub</h1>
          <p className="login-brand-desc">
            Hệ thống quản lý tài liệu và tự động hóa quy trình phê duyệt hồ sơ doanh nghiệp tích hợp Camunda Workflow Engine.
          </p>
          <div className="login-features-list">
            <div className="login-feature-item">
              <div>
                <h4>Phê duyệt tức thời</h4>
                <p>Theo dõi và ký duyệt hồ sơ theo thời gian thực (Real-time socket alerts).</p>
              </div>
            </div>
            <div className="login-feature-item">
              <span className="feature-icon">🧬</span>
              <div>
                <h4>Camunda Workflow</h4>
                <p>Xem trực quan sơ đồ luồng quy trình nghiệp vụ BPMN ngay trên ứng dụng.</p>
              </div>
            </div>
            <div className="login-feature-item">
              <span className="feature-icon">📊</span>
              <div>
                <h4>Báo cáo thông minh</h4>
                <p>Phân tích dữ liệu SLA, theo dõi thời gian xử lý và điểm nghẽn quy trình.</p>
              </div>
            </div>
          </div>
          <div className="login-brand-footer">
            <small>© 2026 DMS Approval System. All rights reserved.</small>
          </div>
        </div>
      </div>

      {/* Right side: login form */}
      <div className="login-form-panel">
        <div className="login-form-box">
          <div className="login-form-header">
            <h2>Chào mừng quay trở lại</h2>
            <p>Vui lòng đăng nhập tài khoản của bạn để tiếp tục.</p>
          </div>

          <form className="login-form-body" onSubmit={handleSubmit}>
            <div className="form-input-group">
              <label htmlFor="username">Tên đăng nhập</label>
              <div className="input-with-icon">
                <span className="input-icon-span">👤</span>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Nhập tên đăng nhập"
                  required
                />
              </div>
            </div>

            <div className="form-input-group">
              <label htmlFor="password">Mật khẩu</label>
              <div className="input-with-icon">
                <span className="input-icon-span">🔒</span>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="login-error-alert" role="alert">
                <span className="alert-icon">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <button type="submit" className="login-submit-btn" disabled={loading}>
              {loading ? (
                <div className="btn-spinner-wrapper">
                  <div className="btn-spinner"></div>
                  <span>Đang đăng nhập...</span>
                </div>
              ) : (
                'Đăng nhập hệ thống'
              )}
            </button>
          </form>

          {/* Demo account hint box */}
          <div className="demo-accounts-card">
            <h4>Tài khoản dùng thử (Demo)</h4>
            <div className="demo-rows">
              <div className="demo-row">
                <span className="badge-role admin">ADMIN</span>
                <span>Tài khoản: <strong>hongphong</strong> / <strong>123456</strong></span>
              </div>
              <div className="demo-row">
                <span className="badge-role normal">NORMAL</span>
                <span>Tài khoản: <strong>normaluser</strong> / <strong>123456</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
