const menuData = [
  { label: 'Tổng quan', path: '/', roles: ['ADMIN', 'NORMAL'], icon: '🏠' },
  { label: 'Duyệt hồ sơ', path: '/approvals', roles: ['ADMIN', 'NORMAL'], icon: '✅' },
  { label: 'Hồ sơ', path: '/tasks', roles: ['ADMIN', 'NORMAL'], icon: '🧭' },
  { label: 'Tạo Task', path: '/start', roles: ['ADMIN', 'NORMAL'], icon: '🆕' },
  { label: 'PDF Viewer', path: '/pdf', roles: ['ADMIN', 'NORMAL'], icon: '📄' },
  { label: 'Đánh giá Chứng nhận', path: '/certification', roles: ['ADMIN', 'NORMAL'], icon: '🏅' },
  { label: 'Báo cáo', path: '/reports', roles: ['ADMIN'], icon: '📊' },
  { label: 'Quản trị hồ sơ', path: '/admin', roles: ['ADMIN'], icon: '📂' },
  { label: 'Quản trị hệ thống', path: '/system-admin', roles: ['ADMIN'], icon: '⚙️' }
];

export default menuData;

