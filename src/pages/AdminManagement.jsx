import { useState, useEffect, useMemo } from 'react';
import { Select, message } from 'antd';
import '../styles/admin-management.css';

const ADMIN_API_BASE_URL = import.meta.env.VITE_AUTH_URL || 'http://192.168.42.243:8080';

// Pre-configured mock backup data for offline resilience
const MOCK_USERS = [
  { id: 1, username: 'hongphong', name: 'Hồng Phong', firstName: 'Phong', lastName: 'Hồng', email: 'hongphong.12012001@gmail.com', role: 'ADMIN', position: 'STAFF', enabled: true },
  { id: 2, username: 'normaluser', name: 'Normal User', firstName: 'User', lastName: 'Normal', email: 'normaluser@example.com', role: 'NORMAL', position: 'STAFF', enabled: true },
  { id: 3, username: 'emmadirector', name: 'Emma Watson', firstName: 'Watson', lastName: 'Emma', email: 'emma.watson@dms-hq.com', role: 'ADMIN', position: 'DIRECTOR', enabled: true },
  { id: 4, username: 'johnmanager', name: 'John Doe', firstName: 'Doe', lastName: 'John', email: 'john.doe@dms-hq.com', role: 'NORMAL', position: 'MANAGER', enabled: false }
];

const MOCK_DOCS = [
  { id: 'doc-1', title: 'Hợp đồng nguyên tắc mua bán hàng hóa.pdf', size: '1.2 MB', creator: 'Nguyễn Văn A', date: '18/06/2026', security: 'Nội bộ', status: 'Chờ duyệt' },
  { id: 'doc-2', title: 'Báo cáo kiểm toán Quý 1 - 2026.pdf', size: '845 KB', creator: 'Trần Thị B', date: '17/06/2026', security: 'Tối mật', status: 'Chờ duyệt' },
  { id: 'doc-3', title: 'Tài liệu hướng dẫn Camunda Workflow.pdf', size: '2.1 MB', creator: 'Lê Văn C', date: '15/06/2026', security: 'Nội bộ', status: 'Đã duyệt' }
];

const MOCK_LOGS = [
  { id: 101, time: '18/06/2026 13:40:02', user: 'hongphong', action: 'Đăng nhập trang quản trị hệ thống', level: 'INFO', ip: '192.168.1.15' },
  { id: 102, time: '18/06/2026 13:30:15', user: 'normaluser', action: 'Khởi tạo luồng Camunda Task mới', level: 'INFO', ip: '192.168.1.48' },
  { id: 103, time: '18/06/2026 13:05:44', user: 'hongphong', action: 'Ký duyệt số trên tài liệu Hợp đồng mua bán', level: 'INFO', ip: '192.168.1.15' },
  { id: 104, time: '18/06/2026 12:45:11', user: 'anonymous', action: 'Đăng nhập thất bại cho user manager_john (Sai mật khẩu)', level: 'WARN', ip: '10.0.8.22' }
];

function AdminManagement({ user, token, branches: propBranches }) {
  const [activeTab, setActiveTab] = useState('users');

  // Database States
  const [usersList, setUsersList] = useState(MOCK_USERS);
  const [docsList, setDocsList] = useState(MOCK_DOCS);
  const [logsList, setLogsList] = useState(MOCK_LOGS);
  const [rolesList, setRolesList] = useState(['ADMIN', 'NORMAL']);
  const [positionsList, setPositionsList] = useState(['STAFF', 'MANAGER', 'DIRECTOR', 'SALES_CS', 'LEAD_AUDITOR', 'AUDITOR', 'TECHNICAL_REVIEWER', 'CERT_DIRECTOR']);
  const [branches, setBranches] = useState([]);

  useEffect(() => {
    if (propBranches) {
      setBranches(propBranches);
    }
  }, [propBranches]);

  const [stats, setStats] = useState({
    totalUsers: 4,
    activeUsers: 3,
    totalDocs: 3,
    pendingDocs: 2
  });

  const [settings, setSettings] = useState({
    camundaUrl: 'http://192.168.42.243:8080/engine-rest',
    socketUrl: 'http://localhost:4000',
    requireSignature: true,
    autoNotification: false,
    auditLogging: true,
    apiTimeout: 5000,
  });

  // Resilience state
  const [isOffline, setIsOffline] = useState(false);
  const [loading, setLoading] = useState(false);

  // Filters
  const [userSearch, setUserSearch] = useState('');
  const [docFilter, setDocFilter] = useState('ALL');

  // Access Control Modals and Forms
  const [accessModalOpen, setAccessModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [accessForm, setAccessForm] = useState({
    securityLevel: 'Nội bộ',
    allowedRoles: '',
    allowedPositions: []
  });

  // Modals and Forms
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({
    username: '',
    password: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'NORMAL',
    position: 'STAFF',
    enabled: true,
    branchId: null
  });

  const triggerToast = (msg) => {
    const lower = msg.toLowerCase();
    if (lower.includes('thành công') || lower.includes('đã xóa') || lower.includes('đã tạo') || lower.includes('đã thêm')) {
      message.success(msg.replace(/^[✨⚡️]\s*/, ''));
    } else if (lower.includes('không thể') || lower.includes('vui lòng') || lower.includes('lỗi')) {
      message.warning(msg);
    } else if (lower.includes('[offline]')) {
      message.warning(msg);
    } else {
      message.info(msg);
    }
  };

  // Helper to normalize backend user mapping structures
  const normalizeUser = (item) => {
    const lastName = item.lastName || '';
    const firstName = item.firstName || '';
    const name = lastName || firstName ? `${lastName} ${firstName}`.trim() : (item.name || item.username);

    let role = item.roleName || item.role || 'NORMAL';
    let position = item.positionName || item.position || 'STAFF';
    if (item.authorities && item.authorities.length > 0) {
      if (item.authorities[0].authority) {
        role = item.authorities[0].authority;
      }
      if (item.authorities[0].position) {
        position = item.authorities[0].position;
      }
    }

    return {
      id: item.id,
      username: item.username,
      name: name,
      firstName: firstName,
      lastName: lastName,
      email: item.email || '',
      phone: item.phone || '',
      role: role,
      position: position,
      enabled: item.enabled ?? item.enable ?? true,
      branchId: item.branchId || null
    };
  };

  // Log events locally when offline
  const logLocalEvent = (action, level = 'INFO') => {
    const newLog = {
      id: Date.now(),
      time: new Date().toLocaleString('vi-VN', { hour12: false }),
      user: user?.username || 'hongphong',
      action: `${action} (Cục bộ)`,
      level: level,
      ip: '127.0.0.1 (Offline)'
    };
    setLogsList(prev => [newLog, ...prev]);
  };

  // --- API REQUEST PIPELINES ---

  // 1. Fetch statistics summary
  const fetchStats = async () => {
    try {
      const response = await fetch(`${ADMIN_API_BASE_URL}/api/admin/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch API stats');
      const data = await response.json();
      setStats({
        totalUsers: data.totalUsers ?? 0,
        activeUsers: data.activeUsers ?? 0,
        totalDocs: data.totalDocs ?? 0,
        pendingDocs: data.pendingDocs ?? 0
      });
      setIsOffline(false);
    } catch (err) {
      console.warn('Stats API failed. Using resilient local values.');
      setIsOffline(true);
      // Recompute locally
      setStats({
        totalUsers: usersList.length,
        activeUsers: usersList.filter(u => u.enabled).length,
        totalDocs: docsList.length,
        pendingDocs: docsList.filter(d => d.status === 'Chờ duyệt').length
      });
    }
  };

  // 2. Fetch User lists (supports Instant Search API)
  const fetchUsers = async (query = '') => {
    setLoading(true);
    try {
      const response = await fetch(`${ADMIN_API_BASE_URL}/api/admin/users?query=${encodeURIComponent(query)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Users API failed');
      const data = await response.json();
      const list = Array.isArray(data) ? data : (data.data || []);
      setUsersList(list.map(normalizeUser));
      setIsOffline(false);
    } catch (err) {
      console.warn('Users API failed. Using resilient local values.');
      setIsOffline(true);
      // Fallback is handled by keeping current state
    } finally {
      setLoading(false);
    }
  };

  // 3. Fetch Dropdown configurations
  const fetchRolesAndPositions = async () => {
    // Fetch Roles
    try {
      const resRoles = await fetch(`${ADMIN_API_BASE_URL}/api/admin/roles`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resRoles.ok) {
        const data = await resRoles.json();
        setRolesList(Array.isArray(data) ? data : (data.data || ['ADMIN', 'NORMAL']));
      } else {
        setRolesList(prev => prev.length ? prev : ['ADMIN', 'NORMAL']);
      }
    } catch (err) {
      console.warn('Roles API failed. Using local defaults:', err);
      setRolesList(prev => prev.length ? prev : ['ADMIN', 'NORMAL']);
    }

    // Fetch Positions
    try {
      const resPos = await fetch(`${ADMIN_API_BASE_URL}/api/admin/positions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resPos.ok) {
        const data = await resPos.json();
        setPositionsList(Array.isArray(data) ? data : (data.data || ['STAFF', 'MANAGER', 'DIRECTOR', 'SALES_CS', 'LEAD_AUDITOR', 'AUDITOR', 'TECHNICAL_REVIEWER', 'CERT_DIRECTOR']));
      } else {
        setPositionsList(prev => prev.length ? prev : ['STAFF', 'MANAGER', 'DIRECTOR', 'SALES_CS', 'LEAD_AUDITOR', 'AUDITOR', 'TECHNICAL_REVIEWER', 'CERT_DIRECTOR']);
      }
    } catch (err) {
      console.warn('Positions API failed. Using local defaults:', err);
      setPositionsList(prev => prev.length ? prev : ['STAFF', 'MANAGER', 'DIRECTOR', 'SALES_CS', 'LEAD_AUDITOR', 'AUDITOR', 'TECHNICAL_REVIEWER', 'CERT_DIRECTOR']);
    }
  };

  // 4. Fetch Documents Catalog
  const fetchDocs = async (status = 'ALL') => {
    try {
      const response = await fetch(`${ADMIN_API_BASE_URL}/api/admin/docs?status=${status}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Docs API failed');
      const data = await response.json();
      const list = Array.isArray(data) ? data : (data.data || []);
      setDocsList(list);
      setIsOffline(false);
    } catch (err) {
      console.warn('Docs API failed. Using resilient local values.');
      setIsOffline(true);
    }
  };

  // 5. Fetch Settings Configuration
  const fetchSettings = async () => {
    try {
      const response = await fetch(`${ADMIN_API_BASE_URL}/api/admin/settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Settings API failed');
      const data = await response.json();
      setSettings({
        camundaUrl: data.camundaUrl || '',
        socketUrl: data.socketHost || data.socketUrl || '',
        apiTimeout: data.apiTimeout || 5000,
        requireSignature: data.requireDigitalSignature ?? true,
        autoNotification: data.sendAutoEmail ?? false,
        auditLogging: data.systemMonitoring ?? true
      });
      setIsOffline(false);
    } catch (err) {
      console.warn('Settings API failed. Using resilient local values.');
      setIsOffline(true);
    }
  };

  // 6. Fetch Logs History
  const fetchLogs = async () => {
    try {
      const response = await fetch(`${ADMIN_API_BASE_URL}/api/admin/audit-trail`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Audit trail API failed');
      const data = await response.json();
      const list = Array.isArray(data) ? data : (data.data || []);
      setLogsList(list);
      setIsOffline(false);
    } catch (err) {
      console.warn('Audit trail API failed. Using resilient local values.');
      setIsOffline(true);
    }
  };

  const fetchBranches = async () => {
    try {
      const response = await fetch(`${ADMIN_API_BASE_URL}/api/admin/branches`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const payload = await response.json();
        setBranches(payload.data || []);
      }
    } catch (err) {
      console.warn("Failed to fetch branches in AdminManagement", err);
    }
  };

  // Mount effects triggers
  useEffect(() => {
    if (token) {
      fetchStats();
      fetchUsers(userSearch);
      fetchRolesAndPositions();
      fetchDocs(docFilter);
      fetchSettings();
      fetchLogs();
      fetchBranches();
    }
  }, [token]);

  // Handle Search Input Debounce / Action
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchUsers(userSearch);
    }, 400);
    return () => clearTimeout(handler);
  }, [userSearch]);

  // Handle Document Filtering triggers
  useEffect(() => {
    fetchDocs(docFilter);
  }, [docFilter]);

  // 7. Server-Sent Events (SSE) Audit Logs Live Stream
  useEffect(() => {
    if (!token || activeTab !== 'logs' || isOffline) return;

    const streamUrl = `${ADMIN_API_BASE_URL}/api/admin/audit-trail/stream?token=${encodeURIComponent(token)}`;
    const eventSource = new EventSource(streamUrl);

    eventSource.onmessage = (event) => {
      try {
        const nextLog = JSON.parse(event.data);
        setLogsList(prev => [nextLog, ...prev]);
      } catch (err) {
        console.error('SSE data parsing error:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.warn('SSE disconnected. Client will auto-reconnect.', err);
    };

    return () => {
      eventSource.close();
    };
  }, [token, activeTab, isOffline]);

  // --- ACTIONS HANDLERS ---

  // Add / Edit user submit trigger
  const handleUserFormSubmit = async (e) => {
    e.preventDefault();
    if (!userForm.username || (!editingUser && !userForm.password)) {
      triggerToast('Vui lòng điền tên đăng nhập và mật khẩu!');
      return;
    }

    const payload = {
      user: {
        username: userForm.username,
        firstName: userForm.firstName || userForm.username,
        lastName: userForm.lastName || '',
        email: userForm.email,
        phone: userForm.phone || '',
        profile: 'avatar-default.png',
        branchId: userForm.branchId
      },
      roleName: userForm.role,
      positionName: userForm.position
    };

    if (!editingUser) {
      payload.user.password = userForm.password;
    }

    try {
      const url = editingUser
        ? `${ADMIN_API_BASE_URL}/api/admin/users/${editingUser.id}`
        : `${ADMIN_API_BASE_URL}/api/admin/users`;

      const method = editingUser ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || 'Request failed');
      }

      triggerToast(editingUser ? `Cập nhật thành công: ${userForm.username}` : `Đã thêm thành công: ${userForm.username}`);
      setUserModalOpen(false);
      fetchUsers(userSearch);
      fetchStats();
    } catch (err) {
      console.warn('Users mutate API error. Activating resilient local fallback.', err);
      setIsOffline(true);

      if (editingUser) {
        setUsersList(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...userForm, name: `${userForm.lastName} ${userForm.firstName}`.trim() } : u));
        logLocalEvent(`Cập nhật thông tin người dùng: ${userForm.username}`);
        triggerToast(`[Offline] Đã lưu thông tin: ${userForm.username}`);
      } else {
        const newUser = {
          id: Date.now(),
          username: userForm.username,
          name: `${userForm.lastName} ${userForm.firstName}`.trim(),
          firstName: userForm.firstName,
          lastName: userForm.lastName,
          email: userForm.email,
          role: userForm.role,
          position: userForm.position,
          enabled: true
        };
        setUsersList([...usersList, newUser]);
        logLocalEvent(`Tạo mới tài khoản người dùng: ${userForm.username}`);
        triggerToast(`[Offline] Đã tạo thành công: ${userForm.username}`);
      }
      setUserModalOpen(false);
    }
  };

  // Toggle user active status
  const handleToggleUserStatus = async (targetUser) => {
    try {
      const response = await fetch(`${ADMIN_API_BASE_URL}/api/admin/users/${targetUser.id}/toggle-status`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('API Toggle error');
      triggerToast(`Đã đổi trạng thái tài khoản: ${targetUser.username}`);
      fetchUsers(userSearch);
    } catch (err) {
      console.warn('Status Toggle API error. Activating resilient local fallback.');
      setIsOffline(true);
      const nextStatus = !targetUser.enabled;
      setUsersList(prev => prev.map(u => u.id === targetUser.id ? { ...u, enabled: nextStatus } : u));
      logLocalEvent(`${nextStatus ? 'Kích hoạt' : 'Vô hiệu hóa'} tài khoản người dùng: ${targetUser.username}`);
      triggerToast(`[Offline] Đã khóa/mở khóa tài khoản: ${targetUser.username}`);
    }
  };

  // Delete user account
  const handleDeleteUser = async (targetUser) => {
    if (targetUser.username === user?.username) {
      triggerToast('Không thể tự xóa tài khoản của bạn!');
      return;
    }

    if (window.confirm(`Xóa vĩnh viễn tài khoản người dùng: ${targetUser.username}?`)) {
      try {
        const response = await fetch(`${ADMIN_API_BASE_URL}/api/admin/users/${targetUser.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('API delete user error');
        triggerToast(`Đã xóa tài khoản: ${targetUser.username}`);
        fetchUsers(userSearch);
        fetchStats();
      } catch (err) {
        console.warn('Delete User API failed. Activating resilient local fallback.');
        setIsOffline(true);
        setUsersList(prev => prev.filter(u => u.id !== targetUser.id));
        logLocalEvent(`Xóa tài khoản người dùng: ${targetUser.username}`, 'WARN');
        triggerToast(`[Offline] Đã xóa tài khoản: ${targetUser.username}`);
      }
    }
  };

  // Delete document
  const handleDeleteDoc = async (docId, docTitle) => {
    if (window.confirm(`Xóa văn bản "${docTitle}" khỏi hệ thống DMS?`)) {
      try {
        const response = await fetch(`${ADMIN_API_BASE_URL}/api/admin/docs/${docId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Delete Doc API failed');
        triggerToast(`Đã xóa tài liệu: ${docTitle}`);
        fetchDocs(docFilter);
        fetchStats();
      } catch (err) {
        console.warn('Delete Doc API failed. Activating resilient local fallback.');
        setIsOffline(true);
        setDocsList(prev => prev.filter(d => d.id !== docId));
        logLocalEvent(`Xóa văn bản khỏi hệ thống DMS: ${docTitle}`, 'WARN');
        triggerToast(`[Offline] Đã xóa văn bản: ${docTitle}`);
      }
    }
  };

  // Edit document security level
  const handleChangeDocSecurity = async (docId, docTitle, currentSec) => {
    const levels = ['Nội bộ', 'Mật', 'Tối mật'];
    const nextIdx = (levels.indexOf(currentSec) + 1) % levels.length;
    const nextSec = levels[nextIdx];

    try {
      const response = await fetch(`${ADMIN_API_BASE_URL}/api/admin/docs/${docId}/security-level`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ securityLevel: nextSec })
      });

      if (!response.ok) throw new Error('Security API failed');
      triggerToast(`Độ mật mới: ${nextSec}`);
      fetchDocs(docFilter);
    } catch (err) {
      console.warn('Security API failed. Activating resilient local fallback.');
      setIsOffline(true);
      setDocsList(prev => prev.map(d => d.id === docId ? { ...d, security: nextSec } : d));
      logLocalEvent(`Thay đổi độ mật văn bản "${docTitle}" thành [${nextSec}]`);
      triggerToast(`[Offline] Cập nhật độ mật: ${nextSec}`);
    }
  };

  const openAccessModal = (doc) => {
    setSelectedDoc(doc);
    const secLevel = doc.security || doc.securityLevel || 'Nội bộ';
    const rolesStr = doc.allowedRole || doc.allowedRoles || '';
    const positionsStr = doc.allowedPositions || '';

    setAccessForm({
      securityLevel: secLevel,
      allowedRoles: rolesStr ? rolesStr.split(',')[0].trim() : '',
      allowedPositions: positionsStr ? positionsStr.split(',').map(p => p.trim()).filter(Boolean) : []
    });
    setAccessModalOpen(true);
  };

  const handleAccessFormSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDoc) return;

    const payload = {
      securityLevel: accessForm.securityLevel,
      allowedRole: accessForm.allowedRoles || '',
      allowedPositions: accessForm.allowedPositions.join(',')
    };

    try {
      const response = await fetch(`${ADMIN_API_BASE_URL}/api/admin/docs/${selectedDoc.id}/access-control`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Access control API failed');

      triggerToast(`Đã cập nhật phân quyền tài liệu: ${selectedDoc.title || selectedDoc.docId}`);
      setAccessModalOpen(false);
      fetchDocs(docFilter);
    } catch (err) {
      console.warn('Access Control API failed. Activating resilient local fallback.', err);
      setIsOffline(true);

      setDocsList(prev => prev.map(d => d.id === selectedDoc.id ? {
        ...d,
        security: accessForm.securityLevel,
        securityLevel: accessForm.securityLevel,
        allowedRole: accessForm.allowedRoles || '',
        allowedRoles: accessForm.allowedRoles || '',
        allowedPositions: accessForm.allowedPositions.join(',')
      } : d));

      logLocalEvent(`Cập nhật phân quyền văn bản "${selectedDoc.title || selectedDoc.docId}"`);
      triggerToast(`[Offline] Đã cập nhật phân quyền cục bộ`);
      setAccessModalOpen(false);
    }
  };

  // Save Settings configurations
  const saveSettings = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${ADMIN_API_BASE_URL}/api/admin/settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          camundaUrl: settings.camundaUrl,
          socketHost: settings.socketUrl,
          apiTimeout: settings.apiTimeout,
          requireDigitalSignature: settings.requireSignature,
          sendAutoEmail: settings.autoNotification,
          systemMonitoring: settings.auditLogging
        })
      });

      if (!response.ok) throw new Error('Save settings API failed');
      triggerToast('✨ Đồng bộ và cập nhật hệ thống thành công!');
      fetchSettings();
    } catch (err) {
      console.warn('Save settings API failed. Activating resilient local fallback.');
      setIsOffline(true);
      logLocalEvent('Thay đổi cấu hình hệ thống (Camunda Url, Chữ ký số, v.v...)');
      triggerToast('[Offline] Đã lưu thiết lập cục bộ thành công!');
    }
  };

  // Modal actions
  const openAddUserModal = () => {
    setEditingUser(null);
    setUserForm({ username: '', password: '', firstName: '', lastName: '', email: '', phone: '', role: 'NORMAL', position: 'STAFF', enabled: true, branchId: null });
    setUserModalOpen(true);
  };

  const openEditUserModal = (targetUser) => {
    setEditingUser(targetUser);
    setUserForm({
      username: targetUser.username,
      password: '',
      firstName: targetUser.firstName,
      lastName: targetUser.lastName,
      email: targetUser.email,
      phone: targetUser.phone,
      role: targetUser.role,
      position: targetUser.position,
      enabled: targetUser.enabled,
      branchId: targetUser.branchId || null
    });
    setUserModalOpen(true);
  };

  // Offline filtered UI helper (when search query changes and API fails)
  const viewUsers = useMemo(() => {
    if (!isOffline) return usersList;
    return usersList.filter(u =>
      u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.position.toLowerCase().includes(userSearch.toLowerCase())
    );
  }, [usersList, userSearch, isOffline]);

  const viewDocs = useMemo(() => {
    if (!isOffline) return docsList;
    if (docFilter === 'ALL') return docsList;
    return docsList.filter(d => d.status === docFilter);
  }, [docsList, docFilter, isOffline]);

  return (
    <div className="admin-container">
      {/* Page header and indicators */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: '0 0 6px 0', fontSize: '1.6rem', fontWeight: '800' }}>Bảng Quản Trị Hệ Thống DMS</h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Kết nối API tiến trình Camunda Engine, quản lý người dùng tương tác và giám sát luồng Audit Trail.
          </p>
        </div>

        {/* Offline status badge */}
        {isOffline && (
          <div className="admin-badge pending" style={{ padding: '8px 16px', fontSize: '0.85rem', fontWeight: '800', border: '1px solid #f59e0b', display: 'flex', gap: '8px', borderRadius: '12px' }}>
            ⚠️ Chế độ Offline (Mock Data)
          </div>
        )}
      </div>

      {/* Numerical summaries */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-icon">👥</div>
          <div className="admin-stat-info">
            <span className="admin-stat-title">Tổng Người Dùng</span>
            <span className="admin-stat-number">{stats.totalUsers}</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ color: '#10b981' }}>🟢</div>
          <div className="admin-stat-info">
            <span className="admin-stat-title">Đang Hoạt Động</span>
            <span className="admin-stat-number">{stats.activeUsers}</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ color: 'var(--accent)' }}>📂</div>
          <div className="admin-stat-info">
            <span className="admin-stat-title">Tài Liệu Lưu Trữ</span>
            <span className="admin-stat-number">{stats.totalDocs}</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ color: '#f59e0b' }}>⏳</div>
          <div className="admin-stat-info">
            <span className="admin-stat-title">Hồ Sơ Chờ Phê Duyệt</span>
            <span className="admin-stat-number">{stats.pendingDocs}</span>
          </div>
        </div>
      </div>

      {/* Tabs navigation panel */}
      <div className="admin-tabs">
        <button className={`admin-tab-btn ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
          👤 Quản lý người dùng
        </button>
        <button className={`admin-tab-btn ${activeTab === 'docs' ? 'active' : ''}`} onClick={() => setActiveTab('docs')}>
          📄 Quản lý tài liệu
        </button>
        <button className={`admin-tab-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
          ⚙️ Cấu hình hệ thống
        </button>
        <button className={`admin-tab-btn ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => setActiveTab('logs')}>
          📋 Nhật ký hệ thống
        </button>
      </div>

      {/* Main Workspace Card */}
      <div className="admin-card-workspace">

        {/* Tab 1: User Management List */}
        {activeTab === 'users' && (
          <>
            <div className="admin-workspace-header">
              <div className="admin-workspace-title">
                <h3>Danh sách tài khoản người dùng</h3>
                <p>Cập nhật vai trò phân quyền (Roles) và vị trí hành động duyệt hồ sơ (Positions) cho nhân viên.</p>
              </div>
              <div className="admin-action-row">
                <input
                  type="text"
                  className="admin-search-input"
                  placeholder="Tìm kiếm tài khoản..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
                <button className="file-button" style={{ padding: '0.65rem 1.2rem', fontSize: '0.85rem' }} onClick={openAddUserModal}>
                  ➕ Thêm Người Dùng
                </button>
              </div>
            </div>

            {loading ? (
              <div className="loading-shell" style={{ padding: '40px' }}>Đang nạp dữ liệu người dùng...</div>
            ) : (
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Tên tài khoản / Email</th>
                      <th>Vai trò</th>
                      <th>Vị trí chức vụ</th>
                      <th>Chi nhánh</th>
                      <th>Trạng thái</th>
                      <th style={{ textAlign: 'right' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewUsers.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div className="admin-user-cell">
                            <div className="admin-user-avatar">
                              {item.name.charAt(0)}
                            </div>
                            <div className="admin-user-details">
                              <span className="admin-username">{item.name}</span>
                              <span className="admin-email">@{item.username} • {item.email}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`admin-badge ${item.role.toLowerCase()}`}>
                            {item.role}
                          </span>
                        </td>
                        <td>{item.position}</td>
                        <td>{branches.find(b => b.id === item.branchId)?.name || 'Chưa gán'}</td>
                        <td>
                          <span className={`admin-badge ${item.enabled ? 'active' : 'disabled'}`}>
                            {item.enabled ? 'Đang hoạt động' : 'Bị khóa'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '4px' }}>
                            <button
                              className="admin-action-btn edit"
                              title="Chỉnh sửa thông tin"
                              onClick={() => openEditUserModal(item)}
                            >
                              ✏️
                            </button>
                            <button
                              className="admin-action-btn"
                              title={item.enabled ? 'Khóa tài khoản này' : 'Kích hoạt tài khoản này'}
                              onClick={() => handleToggleUserStatus(item)}
                            >
                              {item.enabled ? '🔒' : '🔑'}
                            </button>
                            <button
                              className="admin-action-btn delete"
                              title="Xóa tài khoản vĩnh viễn"
                              onClick={() => handleDeleteUser(item)}
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {viewUsers.length === 0 && (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: 'var(--muted)' }}>
                          Không có kết quả khớp với nội dung tìm kiếm.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* Tab 2: Document Catalog Manager */}
        {activeTab === 'docs' && (
          <>
            <div className="admin-workspace-header">
              <div className="admin-workspace-title">
                <h3>Thư viện tài liệu số DMS</h3>
                <p>Danh sách văn bản đang lưu hành, click để chuyển bậc cấp độ bảo mật hành chính.</p>
              </div>
              <div className="admin-action-row">
                 <Select
                   style={{ width: '160px' }}
                   value={docFilter}
                   onChange={(val) => setDocFilter(val)}
                   options={[
                     { value: 'ALL', label: 'Tất cả tài liệu' },
                     { value: 'Chờ duyệt', label: 'Chờ phê duyệt' },
                     { value: 'Đã duyệt', label: 'Đã phê duyệt' }
                   ]}
                 />
              </div>
            </div>

            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Tên văn bản</th>
                    <th>Dung lượng</th>
                    <th>Người đề xuất</th>
                    <th>Mức độ bảo mật</th>
                    <th>Trạng thái duyệt</th>
                    <th style={{ textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {viewDocs.map((doc) => (
                    <tr key={doc.id}>
                      <td style={{ fontWeight: '700' }}>{doc.title}</td>
                      <td>{doc.size}</td>
                      <td>{doc.creator} <span style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>({doc.date})</span></td>
                      <td>
                        <button
                          onClick={() => openAccessModal(doc)}
                          className="admin-badge admin"
                          style={{ cursor: 'pointer', border: '1px dashed var(--accent)', background: 'none' }}
                          title="Bấm để cấu hình phân quyền"
                        >
                          🛡️ {doc.security || doc.securityLevel}
                        </button>
                      </td>
                      <td>
                        <span className={`admin-badge ${doc.status === 'Đã duyệt' ? 'approved' : 'pending'}`}>
                          {doc.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            className="admin-action-btn edit"
                            style={{ padding: '6px 12px', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
                            title="Phân quyền chi tiết"
                            onClick={() => openAccessModal(doc)}
                          >
                            🔑 Quyền
                          </button>
                          <button
                            className="admin-action-btn delete"
                            style={{ padding: '6px 12px', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
                            onClick={() => handleDeleteDoc(doc.id, doc.title || doc.docId)}
                          >
                            🗑️ Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {viewDocs.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--muted)' }}>
                        Không tìm thấy tài liệu phù hợp.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Tab 3: System Config Settings */}
        {activeTab === 'settings' && (
          <>
            <div className="admin-workspace-header">
              <div className="admin-workspace-title">
                <h3>Cấu hình mạng lưới & Quy chế phê duyệt</h3>
                <p>Lưu và đồng bộ cấu hình tiến trình cổng kết nối Camunda BPMN và WebSocket Server.</p>
              </div>
            </div>

            <form onSubmit={saveSettings} className="admin-modal-form">
              <div className="admin-settings-grid">

                {/* Connections panel */}
                <div className="admin-settings-section">
                  <span className="admin-settings-section-title">🔗 Đường dẫn kết nối API & Cổng Socket</span>

                  <div className="admin-field-group">
                    <label>Camunda Rest URL Engine</label>
                    <input
                      type="text"
                      className="admin-input"
                      value={settings.camundaUrl}
                      onChange={(e) => handleSettingInput('camundaUrl', e.target.value)}
                    />
                  </div>

                  <div className="admin-field-group" style={{ marginTop: '10px' }}>
                    <label>Socket Host Hub</label>
                    <input
                      type="text"
                      className="admin-input"
                      value={settings.socketUrl}
                      onChange={(e) => handleSettingInput('socketUrl', e.target.value)}
                    />
                  </div>

                  <div className="admin-field-group" style={{ marginTop: '10px' }}>
                    <label>Thời gian chờ phản hồi tối đa (ms)</label>
                    <input
                      type="number"
                      className="admin-input"
                      value={settings.apiTimeout}
                      onChange={(e) => handleSettingInput('apiTimeout', parseInt(e.target.value) || 5000)}
                    />
                  </div>
                </div>

                {/* Policies Switches panel */}
                <div className="admin-settings-section">
                  <span className="admin-settings-section-title">🛡️ Chính sách quy trình ký duyệt số</span>

                  <div className="admin-switch-row">
                    <div className="admin-switch-label">
                      <span className="admin-switch-title">Bắt buộc đính chữ ký và dấu mộc</span>
                      <span className="admin-switch-desc">Yêu cầu hoàn tất ký nháp số trước khi chuyển luồng duyệt.</span>
                    </div>
                    <label className="admin-switch">
                      <input
                        type="checkbox"
                        checked={settings.requireSignature}
                        onChange={() => handleSettingToggle('requireSignature')}
                      />
                      <span className="admin-switch-slider"></span>
                    </label>
                  </div>

                  <div className="admin-switch-row">
                    <div className="admin-switch-label">
                      <span className="admin-switch-title">Gửi mail thông báo cho cấp quản lý</span>
                      <span className="admin-switch-desc">Kích hoạt thông báo tự động ngay khi có task Camunda mới.</span>
                    </div>
                    <label className="admin-switch">
                      <input
                        type="checkbox"
                        checked={settings.autoNotification}
                        onChange={() => handleSettingToggle('autoNotification')}
                      />
                      <span className="admin-switch-slider"></span>
                    </label>
                  </div>

                  <div className="admin-switch-row">
                    <div className="admin-switch-label">
                      <span className="admin-switch-title">Lưu vết vết hoạt động (Monitoring)</span>
                      <span className="admin-switch-desc">Tự động ghi nhận thông tin truy cập của admin vào Audit trail.</span>
                    </div>
                    <label className="admin-switch">
                      <input
                        type="checkbox"
                        checked={settings.auditLogging}
                        onChange={() => handleSettingToggle('auditLogging')}
                      />
                      <span className="admin-switch-slider"></span>
                    </label>
                  </div>
                </div>

              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button type="submit" className="file-button">
                  💾 Lưu Thiết Lập & Đồng Bộ
                </button>
              </div>
            </form>
          </>
        )}

        {/* Tab 4: System Audit Trail Logs (SSE Live Synced) */}
        {activeTab === 'logs' && (
          <>
            <div className="admin-workspace-header">
              <div className="admin-workspace-title">
                <h3>Dòng lịch sử giám sát hệ thống (Live synced via SSE)</h3>
                <p>Nhật ký tự động ghi nhận luồng hoạt động đăng nhập, ký duyệt và điều chỉnh cấu hình.</p>
              </div>
              <button
                className="pdf-btn"
                onClick={() => {
                  setLogsList([]);
                  triggerToast('Đã dọn dẹp danh sách nhật ký vết!');
                }}
                disabled={logsList.length === 0}
              >
                🗑️ Dọn dẹp Logs
              </button>
            </div>

            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Người dùng</th>
                    <th>IP kết nối</th>
                    <th>Nội dung hoạt động</th>
                    <th>Phân loại</th>
                  </tr>
                </thead>
                <tbody>
                  {logsList.map((log) => (
                    <tr key={log.id}>
                      <td style={{ whiteSpace: 'nowrap', color: 'var(--muted)' }}>{new Date(log.timestamp).toLocaleString('vi-VN')}</td>
                      <td style={{ fontWeight: '700' }}>{log.account}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{log.ipAddress}</td>
                      <td>
                        <span className="admin-log-desc">{log.action}</span>
                      </td>
                      <td>
                        <span className={`admin-log-level ${log.level.toLowerCase()}`}>
                          {log.level}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {logsList.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: 'var(--muted)' }}>
                        Nhật ký rỗng. Đang đợi gói tin mới...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

      </div>

      {/* Popup Form Modals for User administration */}
      {userModalOpen && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <div className="admin-modal-header">
              <h4>{editingUser ? '✏️ Sửa Thông Tin Tài Khoản' : '👤 Tạo Tài Khoản Mới'}</h4>
              <button className="admin-modal-close" onClick={() => setUserModalOpen(false)}>×</button>
            </div>

            <form onSubmit={handleUserFormSubmit} className="admin-modal-form">
              <div className="admin-field-group">
                <label>Tên đăng nhập (Username)</label>
                <input
                  type="text"
                  className="admin-input"
                  placeholder="E.g. hoangnam"
                  value={userForm.username}
                  onChange={(e) => setUserForm({...userForm, username: e.target.value.trim()})}
                  disabled={!!editingUser}
                  required
                />
              </div>

              {!editingUser && (
                <div className="admin-field-group">
                  <label>Mật khẩu đăng nhập</label>
                  <input
                    type="password"
                    className="admin-input"
                    placeholder="Mật khẩu bảo mật"
                    value={userForm.password}
                    onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                    required
                  />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="admin-field-group">
                  <label>Họ đệm (Last name)</label>
                  <input
                    type="text"
                    className="admin-input"
                    placeholder="Hoàng"
                    value={userForm.lastName}
                    onChange={(e) => setUserForm({...userForm, lastName: e.target.value})}
                    required
                  />
                </div>
                <div className="admin-field-group">
                  <label>Tên chính (First name)</label>
                  <input
                    type="text"
                    className="admin-input"
                    placeholder="Nam"
                    value={userForm.firstName}
                    onChange={(e) => setUserForm({...userForm, firstName: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="admin-field-group">
                <label>Hộp thư liên hệ (Email)</label>
                <input
                  type="email"
                  className="admin-input"
                  placeholder="nam.hoang@gmail.com"
                  value={userForm.email}
                  onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                  required
                />
              </div>

              <div className="admin-field-group">
                <label>Số điện thoại (Phone)</label>
                <input
                  type="text"
                  className="admin-input"
                  placeholder="0912345678"
                  value={userForm.phone}
                  onChange={(e) => setUserForm({...userForm, phone: e.target.value})}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="admin-field-group">
                  <label>Nhóm quyền (Role)</label>
                  <Select
                    style={{ width: '100%' }}
                    size="large"
                    value={userForm.role}
                    onChange={(val) => setUserForm({...userForm, role: val})}
                    getPopupContainer={triggerNode => triggerNode.parentNode}
                    options={rolesList.map(r => {
                      const name = typeof r === 'string' ? r : (r.roleName || r.name || '');
                      return { value: name, label: name };
                    })}
                  />
                </div>

                <div className="admin-field-group">
                  <label>Chức vụ duyệt (Position)</label>
                  <Select
                    style={{ width: '100%' }}
                    size="large"
                    value={userForm.position}
                    onChange={(val) => setUserForm({...userForm, position: val})}
                    getPopupContainer={triggerNode => triggerNode.parentNode}
                    options={positionsList.map(p => {
                      const name = typeof p === 'string' ? p : (p.positionName || p.name || '');
                      return { value: name, label: name };
                    })}
                  />
                </div>
              </div>

              <div className="admin-field-group" style={{ marginTop: '10px' }}>
                <label>Chi nhánh trực thuộc (Branch)</label>
                <Select
                  style={{ width: '100%' }}
                  size="large"
                  placeholder="Chọn chi nhánh..."
                  value={userForm.branchId}
                  onChange={(val) => setUserForm({...userForm, branchId: val})}
                  allowClear
                  getPopupContainer={triggerNode => triggerNode.parentNode}
                  options={branches.map(b => ({ value: b.id, label: `${b.code} - ${b.name}` }))}
                />
              </div>

              <div className="admin-switch-row" style={{ border: 'none', padding: '5px 0' }}>
                <span className="admin-switch-title">Kích hoạt tài khoản này</span>
                <label className="admin-switch">
                  <input
                    type="checkbox"
                    checked={userForm.enabled}
                    onChange={(e) => setUserForm({...userForm, enabled: e.target.checked})}
                  />
                  <span className="admin-switch-slider"></span>
                </label>
              </div>

              <div className="admin-modal-actions">
                <button type="button" className="pdf-btn" onClick={() => setUserModalOpen(false)}>
                  Hủy bỏ
                </button>
                <button type="submit" className="file-button">
                  {editingUser ? 'Lưu Thiết Lập' : 'Tạo Tài Khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Popup Form Modal for Access Control configuration */}
      {accessModalOpen && selectedDoc && (
        <div className="admin-modal-overlay">
          <div className="admin-modal" style={{ maxWidth: '500px' }}>
            <div className="admin-modal-header">
              <h4>🔑 Cấu hình phân quyền chi tiết</h4>
              <button className="admin-modal-close" onClick={() => setAccessModalOpen(false)}>×</button>
            </div>

            <form onSubmit={handleAccessFormSubmit} className="admin-modal-form">
              <div style={{ marginBottom: '16px', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Tài liệu cấu hình:</span>
                <div style={{ fontWeight: '700', fontSize: '0.95rem', wordBreak: 'break-all', marginTop: '4px' }}>
                  {selectedDoc.title || selectedDoc.docId}
                </div>
              </div>

              <div className="admin-field-group">
                <label>Mức độ bảo mật hành chính (Security Level)</label>
                <Select
                  style={{ width: '100%' }}
                  size="large"
                  value={accessForm.securityLevel}
                  onChange={(val) => setAccessForm({...accessForm, securityLevel: val})}
                  getPopupContainer={triggerNode => triggerNode.parentNode}
                  options={[
                    { value: 'Công khai', label: '🛡️ Công khai (Bất kỳ ai)' },
                    { value: 'Nội bộ', label: '🛡️ Nội bộ (Toàn bộ nhân viên)' },
                    { value: 'Mật', label: '🛡️ Mật (Manager / Director)' },
                    { value: 'Tối mật', label: '🛡️ Tối mật (Chỉ Director)' }
                  ]}
                />
              </div>

              <div className="admin-field-group" style={{ marginTop: '14px' }}>
                <label>Giới hạn theo vai trò (Allowed Role - Để trống nếu không giới hạn)</label>
                <Select
                  style={{ width: '100%' }}
                  size="large"
                  placeholder="Chọn vai trò được phép truy cập..."
                  value={accessForm.allowedRoles || undefined}
                  onChange={(val) => setAccessForm({...accessForm, allowedRoles: val || ''})}
                  allowClear
                  getPopupContainer={triggerNode => triggerNode.parentNode}
                  options={rolesList.map(r => {
                    const name = typeof r === 'string' ? r : (r.roleName || r.name || '');
                    return { value: name, label: name };
                  })}
                />
              </div>

              <div className="admin-field-group" style={{ marginTop: '14px' }}>
                <label>Giới hạn theo chức vụ (Allowed Positions - Để trống nếu không giới hạn)</label>
                <Select
                  mode="multiple"
                  style={{ width: '100%' }}
                  size="large"
                  placeholder="Chọn chức vụ được phép truy cập..."
                  value={accessForm.allowedPositions}
                  onChange={(vals) => setAccessForm({...accessForm, allowedPositions: vals})}
                  getPopupContainer={triggerNode => triggerNode.parentNode}
                  options={positionsList.map(p => {
                    const name = typeof p === 'string' ? p : (p.positionName || p.name || '');
                    return { value: name, label: name };
                  })}
                />
              </div>

              <div style={{ marginTop: '14px', fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                <span>💡</span>
                <span>Người tạo tài liệu và quản trị viên (Admin) luôn có toàn quyền truy cập tệp bất kể cấu hình này.</span>
              </div>

              <div className="admin-modal-actions" style={{ marginTop: '20px' }}>
                <button type="button" className="pdf-btn" onClick={() => setAccessModalOpen(false)}>
                  Hủy bỏ
                </button>
                <button type="submit" className="file-button">
                  Lưu cấu hình
                </button>
              </div>
            </form>
          </div>
        </div>
      )}    </div>
  );
}

export default AdminManagement;
