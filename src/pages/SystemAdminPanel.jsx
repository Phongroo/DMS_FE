import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table, Button, Input, Select, Switch, Modal, Form,
  Card, Checkbox, message, Space, Tag, Divider
} from 'antd';
import {
  SettingOutlined, BranchesOutlined, TeamOutlined,
  AppstoreOutlined, BgColorsOutlined, LogoutOutlined,
  PlusOutlined, EditOutlined, DeleteOutlined, FolderOpenOutlined,
  BarChartOutlined, HistoryOutlined, FileTextOutlined,
  DeploymentUnitOutlined
} from '@ant-design/icons';
import AdminManagement from './AdminManagement.jsx';
import BpmnDesigner from '../components/BpmnDesigner.jsx';
import Reports from './Reports.jsx';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Title,
  Filler
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import '../styles/system-admin.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Title,
  Filler
);

const ADMIN_API_BASE_URL = import.meta.env.VITE_AUTH_URL || 'http://192.168.42.243:8080';

const DEFAULT_MENUS = [
  { key: 'home', label: 'Tổng quan', path: '/', defaultRoles: ['ADMIN', 'NORMAL'] },
  { key: 'approvals', label: 'Duyệt hồ sơ', path: '/approvals', defaultRoles: ['ADMIN', 'NORMAL'] },
  { key: 'tasks', label: 'Hồ sơ', path: '/tasks', defaultRoles: ['ADMIN', 'NORMAL'] },
  { key: 'start', label: 'Tạo Task', path: '/start', defaultRoles: ['ADMIN', 'NORMAL'] },
  { key: 'pdf', label: 'PDF Viewer', path: '/pdf', defaultRoles: ['ADMIN', 'NORMAL'] },
  { key: 'certification', label: 'Đánh giá Chứng nhận', path: '/certification', defaultRoles: ['ADMIN', 'NORMAL'] },
  { key: 'reports', label: 'Báo cáo', path: '/reports', defaultRoles: ['ADMIN'] },
  { key: 'admin', label: 'Quản trị hồ sơ', path: '/admin', defaultRoles: ['ADMIN'] },
  { key: 'system-admin', label: 'Quản trị hệ thống', path: '/system-admin', defaultRoles: ['ADMIN'] }
];

const AVAILABLE_ROLES = ['ADMIN', 'NORMAL', 'STAFF', 'MANAGER', 'DIRECTOR'];
const AVAILABLE_PERMISSIONS = ['READ_DOC', 'WRITE_DOC', 'APPROVE_DOC', 'DELETE_DOC', 'ADMIN_SETTINGS'];

function SystemAdminPanel({ user, token, currentTheme, setTheme }) {
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState('docs-admin');

  // --- Real-time Logs & Analytics Stats State ---
  const [stats, setStats] = useState({
    totalAccounts: 0,
    activeAccounts: 0,
    totalDocuments: 0,
    pendingDocuments: 0,
    docsBySecurity: {},
    docsByBranch: {},
    docsByMonth: {}
  });

  const [auditLogs, setAuditLogs] = useState([]);
  const [logFilterQuery, setLogFilterQuery] = useState('');
  const [logFilterLevel, setLogFilterLevel] = useState('ALL');
  const [sseConnected, setSseConnected] = useState(false);

  // --- API State ---
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    camundaUrl: 'http://192.168.42.243:8080/engine-rest',
    socketHost: 'http://localhost:4000',
    apiTimeout: 5000,
    requireDigitalSignature: false,
    sendAutoEmail: false,
    systemMonitoring: true,
    defaultTheme: 'spring',
    menuPermissions: '{}'
  });

  const [branches, setBranches] = useState([]);
  const [groups, setGroups] = useState([]);

  // --- Modal Forms State ---
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [branchForm] = Form.useForm();

  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [groupForm] = Form.useForm();

  // --- Menu Permissions Local State ---
  const [menuPerms, setMenuPerms] = useState({});

  // --- Dynamic theme colors for ChartJS (handles Light/Dark theme dynamically) ---
  const isDarkTheme = currentTheme !== 'summer';
  const chartTextColor = isDarkTheme ? '#cbd5e1' : '#1e293b';
  const chartGridColor = isDarkTheme ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.08)';

  // --- Staggered animation configuration for smooth entry ---
  const chartAnimation = {
    duration: 1500,
    easing: 'easeOutQuart',
    delay: (context) => {
      let delay = 0;
      if (context.type === 'data' && context.mode === 'default') {
        delay = context.dataIndex * 100 + context.datasetIndex * 120;
      }
      return delay;
    }
  };

  // --- ChartJS Data & Configuration ---
  const securityDoughnutData = useMemo(() => {
    const securityData = stats.docsBySecurity || {};
    const levels = ['Công khai', 'Nội bộ', 'Mật', 'Tối mật'];
    const dataValues = levels.map(level => securityData[level] || 0);

    return {
      labels: levels,
      datasets: [
        {
          label: 'Số hồ sơ',
          data: dataValues,
          backgroundColor: [
            'rgba(16, 185, 129, 0.8)', // Công khai - Green
            'rgba(59, 130, 246, 0.8)', // Nội bộ - Blue
            'rgba(245, 158, 11, 0.8)',  // Mật - Orange
            'rgba(239, 68, 68, 0.8)'   // Tối mật - Red
          ],
          borderColor: [
            '#10b981',
            '#3b82f6',
            '#f59e0b',
            '#ef4444'
          ],
          borderWidth: 1.5,
          hoverOffset: 6
        }
      ]
    };
  }, [stats.docsBySecurity]);

  const securityDoughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: chartAnimation,
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          color: chartTextColor,
          font: { size: 11, family: "'Plus Jakarta Sans', sans-serif", weight: '600' },
          padding: 10,
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#fff',
        bodyColor: '#cbd5e1',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: function(context) {
            const val = context.parsed;
            const total = context.dataset.data.reduce((acc, curr) => acc + curr, 0);
            const pct = total ? Math.round((val / total) * 100) : 0;
            return ` ${context.label}: ${val} hồ sơ (${pct}%)`;
          }
        }
      }
    },
    cutout: '75%'
  };

  const branchBarData = useMemo(() => {
    const branchData = stats.docsByBranch || {};
    const sortedBranches = Object.entries(branchData)
      .sort((a, b) => b[1] - a[1]);

    const labels = sortedBranches.map(([name]) => name);
    const dataValues = sortedBranches.map(([, count]) => count);

    return {
      labels,
      datasets: [
        {
          label: 'Số hồ sơ',
          data: dataValues,
          backgroundColor: 'rgba(14, 165, 233, 0.8)',
          borderColor: '#0ea5e9',
          borderWidth: 1.5,
          borderRadius: {
            topLeft: 8,
            topRight: 8,
            bottomLeft: 0,
            bottomRight: 0
          },
          borderSkipped: false,
          barThickness: Math.min(45, 120 / (labels.length || 1))
        }
      ]
    };
  }, [stats.docsByBranch]);

  const branchBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: chartAnimation,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#fff',
        bodyColor: '#cbd5e1',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 10
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: chartTextColor, font: { size: 11, weight: '600' } }
      },
      y: {
        grid: { color: chartGridColor, borderDash: [5, 5], drawBorder: false },
        ticks: { color: chartTextColor, font: { size: 11 } }
      }
    }
  };

  const trendLineData = useMemo(() => {
    const monthData = Object.entries(stats.docsByMonth || {})
      .map(([month, count]) => ({ label: month, value: count }))
      .sort((a, b) => a.label.localeCompare(b.label));

    const labels = monthData.map(d => d.label);
    const dataValues = monthData.map(d => d.value);

    return {
      labels,
      datasets: [
        {
          label: 'Hồ sơ tải lên',
          data: dataValues,
          fill: true,
          borderColor: '#e5965e',
          backgroundColor: 'rgba(229, 150, 94, 0.08)',
          tension: 0.35,
          pointBackgroundColor: '#e5965e',
          pointBorderColor: '#fff',
          pointHoverRadius: 6,
          pointRadius: 4,
          borderWidth: 2.5
        }
      ]
    };
  }, [stats.docsByMonth]);

  const trendLineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: chartAnimation,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#fff',
        bodyColor: '#cbd5e1',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 10
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: chartTextColor, font: { size: 11, weight: '600' } }
      },
      y: {
        grid: { color: chartGridColor, borderDash: [5, 5], drawBorder: false },
        ticks: { color: chartTextColor, font: { size: 11 } }
      }
    }
  };

  // --- Load Data ---
  const loadAllData = async () => {
    setLoading(true);
    try {
      // 1. Load System Settings
      const settingsRes = await fetch(`${ADMIN_API_BASE_URL}/api/admin/settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (settingsRes.ok) {
        const payload = await settingsRes.json();
        const settingsData = payload.data || payload;
        setSettings(settingsData);
        if (settingsData.defaultTheme && currentTheme !== settingsData.defaultTheme) {
          setTheme(settingsData.defaultTheme);
        }

        // Parse menu permissions
        try {
          const parsed = JSON.parse(settingsData.menuPermissions || '{}');
          setMenuPerms(parsed);
        } catch (e) {
          console.error("Failed to parse menu permissions JSON", e);
        }
      }

      // 2. Load Branches
      const branchesRes = await fetch(`${ADMIN_API_BASE_URL}/api/admin/branches`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (branchesRes.ok) {
        const payload = await branchesRes.json();
        setBranches(payload.data || []);
      }

      // 3. Load Groups
      const groupsRes = await fetch(`${ADMIN_API_BASE_URL}/api/admin/groups`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (groupsRes.ok) {
        const payload = await groupsRes.json();
        setGroups(payload.data || []);
      }

      // 4. Load Analytics Stats
      const statsRes = await fetch(`${ADMIN_API_BASE_URL}/api/admin/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (statsRes.ok) {
        const payload = await statsRes.json();
        setStats(payload.data || {
          totalAccounts: 0,
          activeAccounts: 0,
          totalDocuments: 0,
          pendingDocuments: 0,
          docsBySecurity: {},
          docsByBranch: {},
          docsByMonth: {}
        });
      }
    } catch (err) {
      console.error("Failed to fetch admin dashboard configuration", err);
      message.error("Lỗi đồng bộ dữ liệu quản trị hệ thống");
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const res = await fetch(`${ADMIN_API_BASE_URL}/api/admin/audit-trail`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const payload = await res.json();
        setAuditLogs(payload.data || []);
      }
    } catch (e) {
      console.error("Failed to load historical audit logs", e);
    }
  };

  useEffect(() => {
    if (token) {
      loadAllData();
    }
  }, [token]);

  useEffect(() => {
    if (activeMenu === 'audit-logs' && token) {
      loadAuditLogs();
    }
  }, [activeMenu, token]);

  useEffect(() => {
    let active = true;
    let reader = null;

    const startStream = async () => {
      try {
        setSseConnected(false);
        const response = await fetch(`${ADMIN_API_BASE_URL}/api/admin/audit-trail/stream`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error("Stream connection failed");

        setSseConnected(true);
        reader = response.body.getReader();
        const decoder = new TextDecoder();

        let buffer = '';
        while (active) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data:')) {
              try {
                const logData = JSON.parse(line.substring(5).trim());
                setAuditLogs(prev => {
                  const exists = prev.some(l => l.timestamp === logData.timestamp && l.action === logData.action);
                  if (exists) return prev;
                  return [logData, ...prev].slice(0, 200);
                });
              } catch (e) {
                // Ignore parsing errors
              }
            }
          }
        }
      } catch (err) {
        setSseConnected(false);
        console.warn("SSE fetch stream disconnected. Retrying in 10s...", err);
        if (active) {
          setTimeout(startStream, 10000);
        }
      }
    };

    if (activeMenu === 'audit-logs' && token) {
      startStream();
    }

    return () => {
      active = false;
      if (reader) {
        try {
          reader.cancel();
        } catch (e) {}
      }
    };
  }, [activeMenu, token]);

  // --- Actions for System Settings ---
  const saveSystemSettings = async (updatedSettings = settings) => {
    try {
      const response = await fetch(`${ADMIN_API_BASE_URL}/api/admin/settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedSettings)
      });
      if (!response.ok) throw new Error("API Settings error");
      const res = await response.json();
      setSettings(res.data || res);
      message.success("Lưu cấu hình hệ thống thành công!");
    } catch (err) {
      message.error("Lỗi cập nhật cấu hình hệ thống");
    }
  };

  // --- Actions for Menu Permissions ---
  const handleMenuPermChange = (menuKey, role, checked) => {
    setMenuPerms(prev => {
      const currentRoles = prev[menuKey] || DEFAULT_MENUS.find(m => m.key === menuKey)?.defaultRoles || [];
      let updatedRoles;
      if (checked) {
        updatedRoles = [...new Set([...currentRoles, role])];
      } else {
        updatedRoles = currentRoles.filter(r => r !== role);
      }
      return { ...prev, [menuKey]: updatedRoles };
    });
  };

  const saveMenuPermissions = async () => {
    const updated = {
      ...settings,
      menuPermissions: JSON.stringify(menuPerms)
    };
    await saveSystemSettings(updated);
  };

  // --- Actions for Themes ---
  const changeTheme = async (themeName) => {
    setTheme(themeName);
    const updated = {
      ...settings,
      defaultTheme: themeName
    };
    await saveSystemSettings(updated);
  };

  // --- Actions for Branches ---
  const openBranchCreateModal = () => {
    setEditingBranch(null);
    branchForm.resetFields();
    setBranchModalOpen(true);
  };

  const openBranchEditModal = (record) => {
    setEditingBranch(record);
    branchForm.setFieldsValue(record);
    setBranchModalOpen(true);
  };

  const handleBranchSubmit = async (values) => {
    try {
      const url = editingBranch
        ? `${ADMIN_API_BASE_URL}/api/admin/branches/${editingBranch.id}`
        : `${ADMIN_API_BASE_URL}/api/admin/branches`;
      const method = editingBranch ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(values)
      });

      if (!response.ok) throw new Error("Branch API error");
      message.success(editingBranch ? "Cập nhật chi nhánh thành công!" : "Tạo chi nhánh thành công!");
      setBranchModalOpen(false);
      loadAllData();
    } catch (err) {
      message.error("Thao tác chi nhánh thất bại");
    }
  };

  const handleDeleteBranch = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa chi nhánh này?")) return;
    try {
      const response = await fetch(`${ADMIN_API_BASE_URL}/api/admin/branches/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Branch API delete error");
      message.success("Xóa chi nhánh thành công!");
      loadAllData();
    } catch (err) {
      message.error("Lỗi xóa chi nhánh");
    }
  };

  // --- Actions for Groups ---
  const openGroupCreateModal = () => {
    setEditingGroup(null);
    groupForm.resetFields();
    setGroupModalOpen(true);
  };

  const openGroupEditModal = (record) => {
    setEditingGroup(record);
    groupForm.setFieldsValue({
      ...record,
      roles: record.roles ? record.roles.split(',').filter(Boolean) : [],
      permissions: record.permissions ? record.permissions.split(',').filter(Boolean) : []
    });
    setGroupModalOpen(true);
  };

  const handleGroupSubmit = async (values) => {
    const payload = {
      ...values,
      roles: values.roles ? values.roles.join(',') : '',
      permissions: values.permissions ? values.permissions.join(',') : ''
    };

    try {
      const url = editingGroup
        ? `${ADMIN_API_BASE_URL}/api/admin/groups/${editingGroup.id}`
        : `${ADMIN_API_BASE_URL}/api/admin/groups`;
      const method = editingGroup ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error("Group API error");
      message.success(editingGroup ? "Cập nhật nhóm quản lý thành công!" : "Tạo nhóm quản lý thành công!");
      setGroupModalOpen(false);
      loadAllData();
    } catch (err) {
      message.error("Thao tác nhóm quản lý thất bại");
    }
  };

  const handleDeleteGroup = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa nhóm quản lý này?")) return;
    try {
      const response = await fetch(`${ADMIN_API_BASE_URL}/api/admin/groups/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Group API delete error");
      message.success("Xóa nhóm thành công!");
      loadAllData();
    } catch (err) {
      message.error("Lỗi xóa nhóm quản lý");
    }
  };

  // --- Columns Config ---
  const branchColumns = [
    { title: 'Mã chi nhánh', dataIndex: 'code', key: 'code', width: '150px' },
    { title: 'Tên chi nhánh', dataIndex: 'name', key: 'name' },
    { title: 'Địa chỉ', dataIndex: 'address', key: 'address' },
    { title: 'Điện thoại', dataIndex: 'phone', key: 'phone', width: '150px' },
    {
      title: 'Hành động',
      key: 'actions',
      width: '150px',
      render: (_, record) => (
        <Space size="middle">
          <Button icon={<EditOutlined />} onClick={() => openBranchEditModal(record)}>Sửa</Button>
          <Button danger icon={<DeleteOutlined />} onClick={() => handleDeleteBranch(record.id)}>Xóa</Button>
        </Space>
      )
    }
  ];

  const groupColumns = [
    { title: 'Tên nhóm', dataIndex: 'name', key: 'name', width: '200px' },
    { title: 'Mô tả', dataIndex: 'description', key: 'description' },
    {
      title: 'Quyền vai trò (Roles)',
      dataIndex: 'roles',
      key: 'roles',
      render: (roles) => (
        <Space size={[0, 4]} wrap>
          {(roles || '').split(',').filter(Boolean).map(role => (
            <Tag color="blue" key={role}>{role}</Tag>
          ))}
        </Space>
      )
    },
    {
      title: 'Quyền chi tiết (Privileges)',
      dataIndex: 'permissions',
      key: 'permissions',
      render: (perms) => (
        <Space size={[0, 4]} wrap>
          {(perms || '').split(',').filter(Boolean).map(perm => (
            <Tag color="cyan" key={perm}>{perm}</Tag>
          ))}
        </Space>
      )
    },
    {
      title: 'Hành động',
      key: 'actions',
      width: '150px',
      render: (_, record) => (
        <Space size="middle">
          <Button icon={<EditOutlined />} onClick={() => openGroupEditModal(record)}>Sửa</Button>
          <Button danger icon={<DeleteOutlined />} onClick={() => handleDeleteGroup(record.id)}>Xóa</Button>
        </Space>
      )
    }
  ];

  return (
    <div className="sys-admin-layout">
      {/* Sidebar Layout Quản Trị Hệ Thống */}
      <aside className="sys-admin-sidebar">
        <div className="sidebar-brand">
          <SettingOutlined className="brand-icon" />
          <div>
            <h3>SYSTEM ADMIN</h3>
            <span>Quản trị hệ thống</span>
          </div>
        </div>
        <Divider style={{ margin: '12px 0', borderColor: 'rgba(255,255,255,0.06)' }} />

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeMenu === 'docs-admin' ? 'active' : ''}`}
            onClick={() => setActiveMenu('docs-admin')}
          >
            <FolderOpenOutlined />
            <span>Quản trị hồ sơ</span>
          </button>

          <button
            className={`nav-item ${activeMenu === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveMenu('analytics')}
          >
            <BarChartOutlined />
            <span>Biểu đồ thống kê</span>
          </button>

          <button
            className={`nav-item ${activeMenu === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveMenu('reports')}
          >
            <FileTextOutlined />
            <span>Báo cáo</span>
          </button>

          <button
            className={`nav-item ${activeMenu === 'bpmn-designer' ? 'active' : ''}`}
            onClick={() => setActiveMenu('bpmn-designer')}
          >
            <DeploymentUnitOutlined />
            <span>Thiết kế quy trình</span>
          </button>

          <button
            className={`nav-item ${activeMenu === 'audit-logs' ? 'active' : ''}`}
            onClick={() => setActiveMenu('audit-logs')}
          >
            <HistoryOutlined />
            <span>Nhật ký hệ thống</span>
          </button>

          <button
            className={`nav-item ${activeMenu === 'menu-permissions' ? 'active' : ''}`}
            onClick={() => setActiveMenu('menu-permissions')}
          >
            <AppstoreOutlined />
            <span>Phân quyền menu</span>
          </button>

          <button
            className={`nav-item ${activeMenu === 'theme' ? 'active' : ''}`}
            onClick={() => setActiveMenu('theme')}
          >
            <BgColorsOutlined />
            <span>Cấu hình theme</span>
          </button>

          <button
            className={`nav-item ${activeMenu === 'branches' ? 'active' : ''}`}
            onClick={() => setActiveMenu('branches')}
          >
            <BranchesOutlined />
            <span>Quản lý chi nhánh</span>
          </button>

          <button
            className={`nav-item ${activeMenu === 'groups' ? 'active' : ''}`}
            onClick={() => setActiveMenu('groups')}
          >
            <TeamOutlined />
            <span>Phân quyền theo nhóm</span>
          </button>

          <button
            className={`nav-item ${activeMenu === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveMenu('settings')}
          >
            <SettingOutlined />
            <span>Tham số hệ thống</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <button className="nav-item exit-btn" onClick={() => {
            localStorage.removeItem('dms_token');
            window.location.reload();
          }}>
            <LogoutOutlined />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Workspace Content Pane */}
      <main className="sys-admin-workspace">
        <header className="workspace-header">
          <h2>
            {activeMenu === 'docs-admin' && '📂 Quản lý tài liệu & Tài khoản người dùng'}
            {activeMenu === 'analytics' && '📊 Biểu đồ thống kê & Giám sát tài nguyên'}
            {activeMenu === 'reports' && '📊 Báo cáo thống kê quy trình & hồ sơ'}
            {activeMenu === 'bpmn-designer' && '🎨 Thiết kế & Deploy quy trình BPMN Camunda trực tuyến'}
            {activeMenu === 'audit-logs' && '📜 Nhật ký hoạt động hệ thống (System Audit Trail)'}
            {activeMenu === 'menu-permissions' && '⚙️ Quản lý phân quyền hiển thị Menu'}
            {activeMenu === 'theme' && '🎨 Cấu hình và Thiết lập Theme'}
            {activeMenu === 'branches' && '🏢 Danh sách & Quản lý Chi nhánh'}
            {activeMenu === 'groups' && '👥 Phân quyền vai trò và phân nhóm nghiệp vụ'}
            {activeMenu === 'settings' && '🔧 Thiết lập tham số hệ thống & Security'}
          </h2>
          <div className="user-profile-tag">
            Chào, <strong>{user?.firstName || user?.username}</strong> ({user?.authorities?.[0]?.authority})
          </div>
        </header>

        <section className="workspace-body">
          {/* Admin Management Screen */}
          {activeMenu === 'docs-admin' && (
            <AdminManagement user={user} token={token} branches={branches} />
          )}

          {/* Analytics Dashboard Screen */}
          {activeMenu === 'analytics' && (
            <div className="analytics-container">
              {/* Stats Cards Row */}
              <div className="analytics-stats-grid">
                <Card className="stat-card gradient-blue">
                  <div className="stat-card-content">
                    <span className="stat-title">Tổng tài khoản</span>
                    <h3 className="stat-value">{stats.totalAccounts || 0}</h3>
                    <span className="stat-sub">Đang hoạt động: {stats.activeAccounts || 0}</span>
                  </div>
                </Card>
                <Card className="stat-card gradient-teal">
                  <div className="stat-card-content">
                    <span className="stat-title">Tổng tài liệu (DMS)</span>
                    <h3 className="stat-value">{stats.totalDocuments || 0}</h3>
                    <span className="stat-sub">Đang chờ duyệt: {stats.pendingDocuments || 0}</span>
                  </div>
                </Card>
                <Card className="stat-card gradient-orange">
                  <div className="stat-card-content">
                    <span className="stat-title">Tỷ lệ hoàn thành duyệt</span>
                    <h3 className="stat-value">
                      {stats.totalDocuments
                        ? Math.round(((stats.totalDocuments - stats.pendingDocuments) / stats.totalDocuments) * 100)
                        : 100}%
                    </h3>
                    <span className="stat-sub">Đã phê duyệt hoàn tất</span>
                  </div>
                </Card>
                <Card className="stat-card gradient-purple">
                  <div className="stat-card-content">
                    <span className="stat-title">Mạng lưới Chi nhánh</span>
                    <h3 className="stat-value">{branches.length || 0}</h3>
                    <span className="stat-sub">Chi nhánh toàn quốc</span>
                  </div>
                </Card>
              </div>

              {/* Main Dashboard Grid */}
              <div className="dashboard-main-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginTop: '24px' }}>
                {/* Left Column: Monthly Trend Chart */}
                <Card className="chart-card" title="📈 Xu hướng đăng tải hồ sơ theo thời gian">
                  <div style={{ height: '320px', padding: '10px 0', position: 'relative' }}>
                    {Object.keys(stats.docsByMonth || {}).length === 0 ? (
                      <div className="empty-stats-msg">Chưa ghi nhận xu hướng hồ sơ hàng tháng</div>
                    ) : (
                      <Line data={trendLineData} options={trendLineOptions} />
                    )}
                  </div>
                </Card>

                {/* Right Column: Security Level Doughnut Chart */}
                <Card className="chart-card" title="🛡️ Mức độ bảo mật hành chính">
                  <div style={{ height: '320px', padding: '10px 0', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    {Object.keys(stats.docsBySecurity || {}).length === 0 ? (
                      <div className="empty-stats-msg">Chưa có dữ liệu bảo mật</div>
                    ) : (
                      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                        <Doughnut data={securityDoughnutData} options={securityDoughnutOptions} />
                        <div style={{
                          position: 'absolute',
                          top: '40%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          textAlign: 'center',
                          pointerEvents: 'none'
                        }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #cbd5e1)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Tổng hồ sơ</span>
                          <h2 style={{ margin: '2px 0 0 0', fontSize: '1.8rem', fontWeight: 800, color: 'var(--text, #fff)' }}>{stats.totalDocuments || 0}</h2>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              {/* Bottom: Branch Document Allocation */}
              <Card className="chart-card" title="🏢 Phân bổ hồ sơ theo chi nhánh" style={{ marginTop: '24px' }}>
                <div style={{ height: '300px', padding: '10px 0', position: 'relative' }}>
                  {Object.keys(stats.docsByBranch || {}).length === 0 ? (
                    <div className="empty-stats-msg">Chưa có dữ liệu phân bổ chi nhánh</div>
                  ) : (
                    <Bar data={branchBarData} options={branchBarOptions} />
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* Reports Screen */}
          {activeMenu === 'reports' && (
            <Reports user={user} token={token} />
          )}

          {/* Audit Logs Screen */}
          {activeMenu === 'audit-logs' && (
            <Card className="workspace-card" title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📜 Nhật ký hoạt động toàn hệ thống</span>
                  <span className={`sse-status-dot ${sseConnected ? 'active' : 'connecting'}`} title={sseConnected ? 'Realtime Connected' : 'Reconnecting...'}></span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {sseConnected ? 'Đang kết nối trực tiếp (Realtime)' : 'Đang thử kết nối lại...'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <Input
                    placeholder="Tìm nội dung log..."
                    value={logFilterQuery}
                    onChange={e => setLogFilterQuery(e.target.value)}
                    style={{ width: '200px' }}
                  />
                  <Select
                    value={logFilterLevel}
                    onChange={val => setLogFilterLevel(val)}
                    style={{ width: '120px' }}
                    options={[
                      { value: 'ALL', label: 'Tất cả cấp độ' },
                      { value: 'INFO', label: '🔵 INFO' },
                      { value: 'WARN', label: '🟡 WARN' }
                    ]}
                  />
                  <Button onClick={loadAuditLogs}>Tải lại</Button>
                </div>
              </div>
            }>
              <Table
                dataSource={auditLogs.filter(log => {
                  const matchesQuery = logFilterQuery ? (log.action || '').toLowerCase().includes(logFilterQuery.toLowerCase()) : true;
                  const matchesLevel = logFilterLevel === 'ALL' ? true : log.level === logFilterLevel;
                  return matchesQuery && matchesLevel;
                })}
                rowKey={(record, idx) => `${record.timestamp}-${idx}`}
                size="middle"
                pagination={{ pageSize: 12 }}
                columns={[
                  {
                    title: 'Thời gian',
                    dataIndex: 'timestamp',
                    key: 'timestamp',
                    width: '180px',
                    render: (t) => {
                      try {
                        const date = new Date(t);
                        return date.toLocaleString('vi-VN');
                      } catch (e) {
                        return t;
                      }
                    }
                  },
                  {
                    title: 'Cấp độ',
                    dataIndex: 'level',
                    key: 'level',
                    width: '100px',
                    render: (l) => (
                      <Tag color={l === 'WARN' ? 'warning' : 'blue'}>
                        {l}
                      </Tag>
                    )
                  },
                  {
                    title: 'Chi tiết hoạt động',
                    dataIndex: 'action',
                    key: 'action',
                    render: (text) => (
                      <span style={{ fontWeight: '500', wordBreak: 'break-all' }}>{text}</span>
                    )
                  }
                ]}
              />
            </Card>
          )}

          {/* Menu Permissions Screen */}
          {activeMenu === 'menu-permissions' && (
            <Card className="workspace-card" title="Phân quyền ẩn hiện chức năng menu dựa trên vai trò">
              <div className="table-responsive">
                <table className="menu-perm-table">
                  <thead>
                    <tr>
                      <th>Chức năng Menu</th>
                      <th>Đường dẫn</th>
                      {AVAILABLE_ROLES.map(role => <th key={role}>{role}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {DEFAULT_MENUS.map(menu => {
                      const rolesList = menuPerms[menu.key] || menu.defaultRoles;
                      return (
                        <tr key={menu.key}>
                          <td><strong>{menu.label}</strong></td>
                          <td><code>{menu.path}</code></td>
                          {AVAILABLE_ROLES.map(role => (
                            <td key={role}>
                              <Checkbox
                                checked={rolesList.includes(role)}
                                onChange={(e) => handleMenuPermChange(menu.key, role, e.target.checked)}
                              />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="action-footer">
                <Button type="primary" size="large" onClick={saveMenuPermissions}>Lưu cấu hình phân quyền menu</Button>
              </div>
            </Card>
          )}

          {/* Theme Screen */}
          {activeMenu === 'theme' && (
            <Card className="workspace-card" title="Chọn Theme giao diện hệ thống mặc định (Real-time update)">
              <div className="theme-grid">
                {['spring', 'summer', 'autumn', 'winter'].map(t => (
                  <div
                    key={t}
                    className={`theme-box-card ${t} ${currentTheme === t ? 'active' : ''}`}
                    onClick={() => changeTheme(t)}
                  >
                    <div className="theme-preview-palette">
                      <span className="color-primary"></span>
                      <span className="color-layout"></span>
                    </div>
                    <h4>{t.toUpperCase()} Theme</h4>
                    <p>Cấu hình bảng màu {t} cho toàn bộ cổng thông tin.</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Branch Screen */}
          {activeMenu === 'branches' && (
            <Card
              className="workspace-card"
              title="Mạng lưới chi nhánh công ty"
              extra={<Button type="primary" icon={<PlusOutlined />} onClick={openBranchCreateModal}>Thêm chi nhánh</Button>}
            >
              <Table dataSource={branches} columns={branchColumns} rowKey="id" loading={loading} />
            </Card>
          )}

          {/* Group Screen */}
          {activeMenu === 'groups' && (
            <Card
              className="workspace-card"
              title="Phân nhóm quản lý & vai trò người dùng"
              extra={<Button type="primary" icon={<PlusOutlined />} onClick={openGroupCreateModal}>Thêm nhóm quyền</Button>}
            >
              <Table dataSource={groups} columns={groupColumns} rowKey="id" loading={loading} />
            </Card>
          )}

          {/* Settings Screen */}
          {activeMenu === 'settings' && (
            <Card className="workspace-card" title="Cấu hình tham số dịch vụ tích hợp">
              <Form
                layout="vertical"
                initialValues={settings}
                onFinish={(values) => saveSystemSettings({ ...settings, ...values })}
                style={{ maxWidth: '600px' }}
              >
                <Form.Item label="Camunda Rest URL Engine" name="camundaUrl">
                  <Input />
                </Form.Item>
                <Form.Item label="Socket Host Hub" name="socketHost">
                  <Input />
                </Form.Item>
                <Form.Item label="API Timeout tối đa (ms)" name="apiTimeout">
                  <Input type="number" />
                </Form.Item>
                <Form.Item label="Bắt buộc chữ ký và con dấu" name="requireDigitalSignature" valuePropName="checked">
                  <Switch />
                </Form.Item>
                <Form.Item label="Gửi email thông báo tự động" name="sendAutoEmail" valuePropName="checked">
                  <Switch />
                </Form.Item>
                <Form.Item label="Lưu vết lịch sử hệ thống (Audit trail)" name="systemMonitoring" valuePropName="checked">
                  <Switch />
                </Form.Item>
                <Button type="primary" size="large" htmlType="submit">Lưu thiết lập hệ thống</Button>
              </Form>
            </Card>
          )}

          {/* BPMN Designer Screen */}
          {activeMenu === 'bpmn-designer' && (
            <Card className="workspace-card" title="🎨 Trình thiết kế quy trình BPMN Camunda">
              <BpmnDesigner token={token} />
            </Card>
          )}
        </section>
      </main>

      {/* Branch Modal */}
      <Modal
        open={branchModalOpen}
        title={editingBranch ? "Chỉnh sửa thông tin chi nhánh" : "Thêm chi nhánh mới"}
        onCancel={() => setBranchModalOpen(false)}
        footer={null}
        zIndex={100000}
      >
        <Form form={branchForm} layout="vertical" onFinish={handleBranchSubmit}>
          <Form.Item label="Mã chi nhánh" name="code" rules={[{ required: true, message: 'Nhập mã chi nhánh' }]}>
            <Input placeholder="Ví dụ: CN_HN" />
          </Form.Item>
          <Form.Item label="Tên chi nhánh" name="name" rules={[{ required: true, message: 'Nhập tên chi nhánh' }]}>
            <Input placeholder="Ví dụ: Chi nhánh Hà Nội" />
          </Form.Item>
          <Form.Item label="Địa chỉ" name="address" rules={[{ required: true, message: 'Nhập địa chỉ' }]}>
            <Input placeholder="Ví dụ: Hoàn Kiếm, Hà Nội" />
          </Form.Item>
          <Form.Item label="Số điện thoại" name="phone">
            <Input placeholder="Ví dụ: 024.1234.5678" />
          </Form.Item>
          <Form.Item style={{ textAlign: 'right', marginTop: '20px' }}>
            <Button style={{ marginRight: '8px' }} onClick={() => setBranchModalOpen(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit">Xác nhận</Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Group Modal */}
      <Modal
        open={groupModalOpen}
        title={editingGroup ? "Chỉnh sửa phân nhóm quyền" : "Tạo nhóm quyền quản trị mới"}
        onCancel={() => setGroupModalOpen(false)}
        footer={null}
        zIndex={100000}
      >
        <Form form={groupForm} layout="vertical" onFinish={handleGroupSubmit}>
          <Form.Item label="Tên nhóm quản lý" name="name" rules={[{ required: true, message: 'Nhập tên nhóm' }]}>
            <Input placeholder="Ví dụ: Nhóm Pháp Chế và Hợp Đồng" />
          </Form.Item>
          <Form.Item label="Mô tả nhóm" name="description" rules={[{ required: true, message: 'Nhập mô tả nhóm' }]}>
            <Input placeholder="Ví dụ: Quản lý tính pháp lý và phê duyệt dự thảo hợp đồng" />
          </Form.Item>
          <Form.Item label="Gán vai trò hệ thống (Allowed Roles)" name="roles">
            <Select mode="multiple" placeholder="Chọn vai trò...">
              {AVAILABLE_ROLES.map(r => <Select.Option key={r} value={r}>{r}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item label="Gán quyền chi tiết (Allowed Privileges)" name="permissions">
            <Select mode="multiple" placeholder="Chọn quyền...">
              {AVAILABLE_PERMISSIONS.map(p => <Select.Option key={p} value={p}>{p}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item style={{ textAlign: 'right', marginTop: '20px' }}>
            <Button style={{ marginRight: '8px' }} onClick={() => setGroupModalOpen(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit">Xác nhận</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default SystemAdminPanel;
