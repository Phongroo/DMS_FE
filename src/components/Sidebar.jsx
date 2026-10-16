import { useLocation, useNavigate } from 'react-router-dom';
import { Layout, Menu, Avatar } from 'antd';
import { 
  HomeOutlined, 
  CheckCircleOutlined, 
  CompassOutlined, 
  PlusCircleOutlined, 
  FilePdfOutlined, 
  BarChartOutlined, 
  SettingOutlined,
  UserOutlined 
} from '@ant-design/icons';

const { Sider } = Layout;

const iconMap = {
  '🏠': <HomeOutlined />,
  '✅': <CheckCircleOutlined />,
  '🧭': <CompassOutlined />,
  '🆕': <PlusCircleOutlined />,
  '📄': <FilePdfOutlined />,
  '📊': <BarChartOutlined />,
  '⚙️': <SettingOutlined />
};

/**
 * @typedef {Object} MenuItem
 * @property {string} path - Target path for routing navigation.
 * @property {string} icon - Emoji descriptor or component representing the icon.
 * @property {string} label - Display label for the navigation item.
 */

/**
 * @typedef {Object} UserAuthority
 * @property {string} authority - Access role authority name (e.g. 'ADMIN', 'NORMAL').
 * @property {string} [position] - User position.
 */

/**
 * @typedef {Object} UserInfo
 * @property {string} [firstName] - First name of the operator.
 * @property {string} [lastName] - Last name of the operator.
 * @property {string} username - Logged-in identifier.
 * @property {UserAuthority[]} authorities - Collection of granted role tags.
 */

/**
 * Sidebar navigation component using Ant Design Sider.
 * 
 * @component
 * @param {Object} props - Component properties.
 * @param {MenuItem[]} props.menu - Collection of active menu items mapped by role authorization.
 * @param {UserInfo} props.user - Information payload of current logged-in user.
 * @returns {React.ReactElement} The rendered Sider navigation panel.
 */
function Sidebar({ menu, user, isMobile, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = menu.map((item) => ({
    key: item.path,
    icon: iconMap[item.icon] || item.icon,
    label: item.label
  }));

  const userDisplayName = user?.firstName ? `${user.firstName} ${user.lastName}` : user?.username;
  const userRole = user?.authorities?.[0]?.authority ?? 'NORMAL';

  return (
    <Sider
      width={280}
      breakpoint="lg"
      collapsedWidth="0"
      style={{
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--border)',
        height: '100vh',
        position: 'sticky',
        top: 0,
        left: 0,
        zIndex: 100
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '24px 20px', gap: '20px' }}>
        <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: 0 }}>
          <div className="brand-logo" style={{ margin: 0 }}>DMS</div>
          <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text)' }}>Approval Hub</span>
        </div>
        
        <div className="role-chip" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', width: '100%', background: 'var(--surface-strong)', border: '1px solid var(--border)', borderRadius: '12px' }}>
          <Avatar icon={<UserOutlined />} style={{ backgroundColor: 'var(--accent)', flexShrink: 0 }} size="small" />
          <div style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>
            <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.85rem', lineHeight: 1.2 }}>{userDisplayName}</div>
            <small style={{ color: 'var(--muted)', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700 }}>{userRole}</small>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            onClick={({ key }) => {
              navigate(key);
              if (isMobile && onClose) {
                onClose();
              }
            }}
            items={menuItems}
            style={{ border: 'none', background: 'transparent', width: '100%' }}
          />
        </div>

        <div className="sidebar-footer" style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--muted)' }}>Quản lý duyệt hồ sơ DMS</p>
          <small style={{ color: 'var(--muted)', fontSize: '0.72rem' }}>Phiên bản Ant Design UI</small>
        </div>
      </div>
    </Sider>
  );
}

export default Sidebar;
