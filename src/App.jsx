import { useEffect, useMemo, useState, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ConfigProvider, theme as antdTheme, Layout as AntdLayout } from 'antd';
import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';
import ChatBox from './components/ChatBox.jsx';
import SeasonalCanvas from './components/SeasonalCanvas.jsx';
import Home from './pages/Home.jsx';
import Approvals from './pages/Approvals.jsx';
import Tasks from './pages/Tasks.jsx';
import StartTask from './pages/StartTask.jsx';
import PDFView from './pages/PDFView.jsx';
import Reports from './pages/Reports.jsx';
import Login from './pages/Login.jsx';
import AdminManagement from './pages/AdminManagement.jsx';
import SystemAdminPanel from './pages/SystemAdminPanel.jsx';
import { useSocket } from './hooks/useSocket.js';
import menuData from './data/menu.js';

const themeConfigMap = {
  spring: {
    algorithm: antdTheme.darkAlgorithm,
    token: {
      colorPrimary: '#e5965e',
      colorBgContainer: '#1b1b18',
      colorBgLayout: '#141413',
      colorBorder: '#2e2e2a',
      colorText: '#f1ede4',
      colorTextSecondary: '#c5c0b5',
      borderRadius: 14,
      fontFamily: 'Plus Jakarta Sans, sans-serif'
    }
  },
  summer: {
    algorithm: antdTheme.defaultAlgorithm,
    token: {
      colorPrimary: '#cc5a01',
      colorBgContainer: '#ffffff',
      colorBgLayout: '#fbfaf7',
      colorBorder: '#e5e0d8',
      colorText: '#191919',
      colorTextSecondary: '#5c5954',
      borderRadius: 14,
      fontFamily: 'Plus Jakarta Sans, sans-serif'
    }
  },
  autumn: {
    algorithm: antdTheme.darkAlgorithm,
    token: {
      colorPrimary: '#d97706',
      colorBgContainer: '#171515',
      colorBgLayout: '#0c0a0a',
      colorBorder: 'rgba(255, 255, 255, 0.06)',
      colorText: '#f5f5f4',
      colorTextSecondary: '#a8a29e',
      borderRadius: 14,
      fontFamily: 'Plus Jakarta Sans, sans-serif'
    }
  },
  winter: {
    algorithm: antdTheme.darkAlgorithm,
    token: {
      colorPrimary: '#0d9488',
      colorBgContainer: '#0a1110',
      colorBgLayout: '#030505',
      colorBorder: 'rgba(255, 255, 255, 0.06)',
      colorText: '#f0fdfa',
      colorTextSecondary: '#99f6e4',
      borderRadius: 14,
      fontFamily: 'Plus Jakarta Sans, sans-serif'
    }
  }
};

const seasons = ['spring', 'summer', 'autumn', 'winter'];
const AUTH_BASE_URL = import.meta.env.VITE_AUTH_URL || 'http://localhost:30080';

function App() {
  const [theme, setTheme] = useState('spring');
  const [menuPermissions, setMenuPermissions] = useState({});
  const [liveApprovals, setLiveApprovals] = useState([]);
  const [toastList, setToastList] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [token, setToken] = useState(localStorage.getItem('dms_token') || '');
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(Boolean(token));
  const [hasRedirected, setHasRedirected] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const themeClasses = ['theme-spring', 'theme-summer', 'theme-autumn', 'theme-winter'];
    document.body.classList.remove(...themeClasses);
    document.body.classList.add(`theme-${theme}`);
  }, [theme]);

  useEffect(() => {
    if (!token) return;
    const fetchSettings = async () => {
      try {
        const response = await fetch(`${AUTH_BASE_URL}/api/admin/settings`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (response.ok) {
          const payload = await response.json();
          const data = payload.data || payload;
          if (data.defaultTheme) {
            setTheme(data.defaultTheme);
          }
          if (data.menuPermissions) {
            setMenuPermissions(JSON.parse(data.menuPermissions));
          }
        }
      } catch (err) {
        console.warn("Failed to load settings in App.jsx", err);
      }
    };
    fetchSettings();
  }, [token, theme]);

  useEffect(() => {
    if (user && user.authorities?.[0]?.authority === 'ADMIN' && !hasRedirected) {
      setHasRedirected(true);
      navigate('/system-admin');
    }
  }, [user, hasRedirected, navigate]);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setLoadingUser(false);
      return;
    }

    const fetchCurrentUser = async () => {
      setLoadingUser(true);
      try {
        const response = await fetch(`${AUTH_BASE_URL}/current-user`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!response.ok) {
          localStorage.removeItem('dms_token');
          setToken('');
          setUser(null);
          setLoadingUser(false);
          return;
        }

        const currentUser = await response.json();
        setUser(currentUser);
      } catch (error) {
        setUser(null);
      } finally {
        setLoadingUser(false);
      }
    };

    fetchCurrentUser();
  }, [token]);

  const position = user?.authorities?.[0]?.position;

  const handleTaskReceived = useCallback((approval) => {
    setLiveApprovals((current) => [approval, ...current].slice(0, 5));
    
    // Push to persistent notifications history
    setNotifications((prev) => {
      const newNotification = {
        id: approval.taskId || Date.now().toString() + Math.random(),
        title: approval.title || approval.taskName || 'Phê duyệt mới',
        message: approval.message || `${approval.document} đã được duyệt bởi ${approval.user}`,
        read: false,
        timestamp: Date.now()
      };
      return [newNotification, ...prev];
    });

    setToastList((current) => {
      const next = [
        {
          id: approval.taskId || Date.now().toString(),
          title: approval.title || approval.taskName || 'Bạn có task mới',
          message: approval.message || approval.description || 'Vui lòng kiểm tra phần duyệt.',
          timestamp: Date.now()
        },
        ...current
      ];
      return next.slice(0, 4);
    });
  }, []);

  const { sendApproval } = useSocket(position, handleTaskReceived);

  const removeToast = (toastId) => {
    setToastList((current) => current.filter((toast) => toast.id !== toastId));
  };

  const handleLogin = ({ token }) => {
    localStorage.setItem('dms_token', token);
    setToken(token);
  };

  const handleLogout = () => {
    localStorage.removeItem('dms_token');
    setToken('');
    setUser(null);
    setHasRedirected(false);
  };

  const filteredMenu = useMemo(() => {
    const isAdmin = user?.authorities?.[0]?.authority === 'ADMIN';
    return menuData.filter((item) => {
      if (isAdmin) {
        return item.path === '/system-admin';
      }
      const overrideKey = item.path === '/' ? 'home' : item.path.replace('/', '');
      const allowedRoles = menuPermissions[overrideKey] || item.roles;
      return allowedRoles?.includes(user?.authorities?.[0]?.authority ?? 'NORMAL') && item.path !== '/system-admin';
    });
  }, [user, menuPermissions]);

  if (loadingUser) {
    return <div className="loading-shell fullscreen-loading">Đang tải thông tin người dùng...</div>;
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <ConfigProvider theme={themeConfigMap[theme]}>
      <SeasonalCanvas theme={theme} />
      <AntdLayout hasSider style={{ minHeight: '100vh', background: 'var(--bg)' }} className={`theme-${theme}`}>
        <Sidebar menu={filteredMenu} user={user} />
        <AntdLayout style={{ background: 'transparent' }}>
          <Header 
            user={user} 
            theme={theme} 
            setTheme={setTheme} 
            seasons={seasons} 
            onLogout={handleLogout} 
            notifications={notifications} 
            setNotifications={setNotifications} 
          />
          <AntdLayout.Content style={{ padding: '32px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="top-banner">
              <div>
                <h1>Dashboard DMS Approval</h1>
                <p>Quản lý duyệt hồ sơ, camunda task và xem file PDF trực tiếp.</p>
              </div>
              <div className="live-notice">
                <strong>Live approvals</strong>
                {liveApprovals.length === 0 ? (
                  <span>Chưa có phê duyệt mới</span>
                ) : (
                  <ul>
                    {liveApprovals.map((approval) => (
                      <li key={approval.id}>{approval.document} đã được duyệt bởi {approval.user}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {toastList.length > 0 && (
              <div className="toast-overlay" role="status" aria-live="polite">
                {toastList.map((toast) => (
                  <div key={toast.id} className="toast-card">
                    <div className="toast-content">
                      <strong>{toast.title}</strong>
                      <p>{toast.message}</p>
                    </div>
                    <button className="toast-close" type="button" onClick={() => removeToast(toast.id)}>
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <Routes>
              <Route path="/" element={user?.authorities?.[0]?.authority === 'ADMIN' ? <Navigate to="/system-admin" replace /> : <Home user={user} />} />
              <Route path="/approvals" element={user?.authorities?.[0]?.authority === 'ADMIN' ? <Navigate to="/system-admin" replace /> : <Approvals user={user} token={token} position={position} onApprove={sendApproval} />} />
              <Route path="/tasks" element={user?.authorities?.[0]?.authority === 'ADMIN' ? <Navigate to="/system-admin" replace /> : <Tasks user={user} token={token} />} />
              <Route path="/start" element={user?.authorities?.[0]?.authority === 'ADMIN' ? <Navigate to="/system-admin" replace /> : <StartTask token={token} user={user} />} />
              <Route path="/pdf" element={user?.authorities?.[0]?.authority === 'ADMIN' ? <Navigate to="/system-admin" replace /> : <PDFView user={user} token={token} />} />
              <Route path="/reports" element={user?.authorities?.[0]?.authority === 'ADMIN' ? <Navigate to="/system-admin" replace /> : <Reports user={user} token={token} />} />
              <Route path="/admin" element={<Navigate to="/system-admin" replace />} />
              <Route path="/system-admin" element={user?.authorities?.[0]?.authority === 'ADMIN' ? <SystemAdminPanel user={user} token={token} currentTheme={theme} setTheme={setTheme} /> : <Navigate to="/" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AntdLayout.Content>
        </AntdLayout>
      </AntdLayout>
      <ChatBox token={token} />
    </ConfigProvider>
  );
}

export default App;
