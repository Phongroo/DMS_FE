import React, { useState } from 'react';
import ThemeSwitcher from './ThemeSwitcher.jsx';
import { Button, Layout, Badge, Popover, List } from 'antd';
import { LogoutOutlined, BellOutlined, MenuOutlined } from '@ant-design/icons';

const { Header: AntdHeader } = Layout;

/**
 * App portal Header component. Hosts greeting message for current user and Theme switcher tools.
 * 
 * @component
 * @param {Object} props - Component properties.
 * @param {Object} props.user - Information payload of currently logged-in user.
 * @param {string} props.theme - Active season theme label.
 * @param {function(string): void} props.setTheme - Callback helper triggers theme selection modification.
 * @param {string[]} props.seasons - Supported season tags list.
 * @param {function(): void} props.onLogout - Callback to handle logging out the user session.
 * @param {Object[]} props.notifications - Active unread notifications list.
 * @param {function(Object[]): void} props.setNotifications - Callback to update notification states.
 * @param {function(): void} props.onToggleMenu - Callback to toggle mobile Drawer sidebar.
 * @returns {React.ReactElement} The styled header container.
 */
function Header({ user, theme, setTheme, seasons, onLogout, notifications = [], setNotifications, onToggleMenu }) {
  const [popoverVisible, setPopoverVisible] = useState(false);
  const userDisplayName = user?.firstName ?? user?.username;
  const userRole = user?.authorities?.[0]?.authority ?? 'NORMAL';
  const userPosition = user?.authorities?.[0]?.position ?? 'N/A';

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const handleVisibleChange = (visible) => {
    setPopoverVisible(visible);
    if (visible && unreadCount > 0) {
      // Mark as read after a short delay so the user has time to see what is new
      setTimeout(() => {
        markAllAsRead();
      }, 1000);
    }
  };

  const popoverContent = (
    <div style={{ width: '320px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border)', marginBottom: '8px' }}>
        <strong style={{ color: 'var(--text)' }}>Thông báo ({unreadCount} mới)</strong>
        <div style={{ display: 'flex', gap: '12px' }}>
          <a onClick={markAllAsRead} style={{ fontSize: '0.82rem', color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}>Đọc tất cả</a>
          <a onClick={clearAllNotifications} style={{ fontSize: '0.82rem', color: 'var(--muted)', cursor: 'pointer', fontWeight: 600 }}>Xoá hết</a>
        </div>
      </div>
      {notifications.length === 0 ? (
        <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--muted)' }}>
          <p style={{ margin: 0, fontSize: '1.5rem' }}>🔔</p>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem' }}>Không có thông báo mới</p>
        </div>
      ) : (
        <div style={{ maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
          <List
            dataSource={notifications}
            renderItem={(item) => (
              <List.Item 
                style={{ 
                  padding: '8px 10px', 
                  borderBottom: '1px solid rgba(255, 255, 255, 0.03)', 
                  backgroundColor: item.read ? 'transparent' : 'var(--surface-light)',
                  borderRadius: '10px',
                  marginBottom: '6px',
                  border: 'none',
                  display: 'block'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                  <span style={{ fontWeight: item.read ? '600' : '800', color: 'var(--text)', fontSize: '0.85rem' }}>{item.title}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
                    {new Date(item.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.3 }}>{item.message}</p>
              </List.Item>
            )}
          />
        </div>
      )}
    </div>
  );

  return (
    <AntdHeader 
      className="app-header" 
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        height: 'auto', 
        lineHeight: 'normal', 
        background: 'var(--surface-header)', 
        borderBottom: '1px solid var(--border)', 
        padding: '16px 32px',
        boxShadow: 'var(--shadow)',
        borderRadius: 0
      }}
    >
      <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Button 
          type="text" 
          icon={<MenuOutlined />} 
          onClick={onToggleMenu}
          className="mobile-menu-btn"
          style={{ fontSize: '1.25rem', color: 'var(--text)', padding: 0, width: '40px', height: '40px', display: 'none', alignItems: 'center', justifyContent: 'center' }}
        />
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: '1.25rem', color: 'var(--text)', fontWeight: 700 }}>Xin chào, {userDisplayName}</h2>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>
            Quyền hạn: <strong style={{ color: 'var(--text)' }}>{userRole}</strong> • Vị trí: <strong style={{ color: 'var(--text)' }}>{userPosition}</strong>
          </p>
        </div>
      </div>

      <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
        <ThemeSwitcher theme={theme} setTheme={setTheme} seasons={seasons} />
        
        {/* Notification Bell Dropdown */}
        <Popover
          content={popoverContent}
          trigger="click"
          visible={popoverVisible}
          onVisibleChange={handleVisibleChange}
          placement="bottomRight"
          overlayClassName="notification-popover"
        >
          <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '42px', height: '42px', borderRadius: '10px', background: 'var(--surface-light)', border: '1px solid var(--border)' }}>
            <Badge count={unreadCount} overflowCount={99} size="small">
              <BellOutlined style={{ fontSize: '1.15rem', color: 'var(--text)' }} />
            </Badge>
          </div>
        </Popover>

        <Button 
          type="default" 
          icon={<LogoutOutlined />} 
          onClick={onLogout}
          className="logout-button"
          style={{ height: '42px', borderRadius: '10px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <span className="logout-text">Đăng xuất</span>
        </Button>
      </div>
    </AntdHeader>
  );
}

export default Header;
