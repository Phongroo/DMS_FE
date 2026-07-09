import { Link } from 'react-router-dom';
import { Card, Typography, Button, Space, Row, Col, Timeline } from 'antd';
import { 
  RocketOutlined, 
  SafetyCertificateOutlined,
  CompassOutlined,
  CheckSquareOutlined
} from '@ant-design/icons';

const { Title, Paragraph } = Typography;

/**
 * App Dashboard Home component.
 * Displays greeting messages, core platform features, and quick action links.
 * 
 * @component
 * @param {Object} props - Component properties.
 * @param {Object} props.user - Information payload of currently logged-in user.
 * @returns {React.ReactElement} The styled Home dashboard container.
 */
function Home({ user }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <Row gutter={[24, 24]}>
        <Col span={24}>
          <Card 
            className="hero-card"
            style={{ 
              background: 'var(--surface-card)', 
              border: '1px solid var(--border)',
              borderRadius: '20px',
              padding: '12px' 
            }}
          >
            <Title level={2} style={{ margin: '0 0 12px 0', color: 'var(--text)', fontWeight: 800 }}>
              Chào mừng, {user?.firstName ?? user?.username}
            </Title>
            <Paragraph style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', margin: '0 0 24px 0' }}>
              Hệ thống điều hành quy trình DMS thông minh tích hợp menu phân quyền tự động, Camunda Workflow Engine trực quan và luồng ký duyệt thời gian thực (Real-time Socket Notifications).
            </Paragraph>
            <Space size="middle">
              <Link to="/approvals">
                <Button type="primary" size="large" icon={<CheckSquareOutlined />} style={{ borderRadius: '10px', height: '46px', fontWeight: 600 }}>
                  Xem duyệt hồ sơ
                </Button>
              </Link>
              <Link to="/tasks">
                <Button type="default" size="large" icon={<RocketOutlined />} style={{ borderRadius: '10px', height: '46px', fontWeight: 600, background: 'var(--surface-strong)', color: 'var(--text)', borderColor: 'var(--border)' }}>
                  Xem Camunda Tasks
                </Button>
              </Link>
            </Space>
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card 
            title={<span style={{ color: 'var(--text)', fontWeight: 700 }}><SafetyCertificateOutlined /> Ưu điểm hệ thống</span>}
            style={{ 
              background: 'var(--surface-card)', 
              border: '1px solid var(--border)',
              borderRadius: '20px',
              height: '100%'
            }}
          >
            <Timeline 
              items={[
                {
                  color: 'green',
                  content: (
                    <div>
                      <strong style={{ color: 'var(--text)' }}>Phân quyền menu động</strong>
                      <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0', fontSize: '0.88rem' }}>Menu tự động ẩn/hiện tùy thuộc vào vị trí (position) và quyền hạn của người sử dụng.</p>
                    </div>
                  )
                },
                {
                  color: 'blue',
                  content: (
                    <div>
                      <strong style={{ color: 'var(--text)' }}>Quy trình BPMN trực quan</strong>
                      <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0', fontSize: '0.88rem' }}>Sơ đồ quy trình Camunda trực quan hóa sơ đồ xử lý thực tế và tô màu các bước đã xong.</p>
                    </div>
                  )
                },
                {
                  color: 'cyan',
                  content: (
                    <div>
                      <strong style={{ color: 'var(--text)' }}>Trình xem tài liệu PDF inline</strong>
                      <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0', fontSize: '0.88rem' }}>Xem trực tiếp các tập tin PDF đính kèm của hồ sơ ngay trên ứng dụng mà không cần tải về.</p>
                    </div>
                  )
                },
                {
                  color: 'purple',
                  content: (
                    <div>
                      <strong style={{ color: 'var(--text)' }}>Real-time Live Notification</strong>
                      <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0', fontSize: '0.88rem' }}>Hệ thống nhận thông báo real-time qua WebSockets khi có hồ sơ mới được phê duyệt.</p>
                    </div>
                  )
                }
              ]}
            />
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card 
            title={<span style={{ color: 'var(--text)', fontWeight: 700 }}><CompassOutlined /> Hướng dẫn thao tác nhanh</span>}
            className="accent-card"
            style={{ 
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(99, 102, 241, 0.08) 100%)',
              border: '1px solid var(--border)',
              borderRadius: '20px',
              height: '100%'
            }}
          >
            <Timeline 
              mode="start"
              items={[
                {
                  color: 'gray',
                  content: <span style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Bước 1: Chọn vị trí role và kiểm tra menu phân quyền hiển thị phù hợp.</span>
                },
                {
                  color: 'gray',
                  content: <span style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Bước 2: Đi tới trang <strong>Duyệt hồ sơ</strong> để ký duyệt tài liệu được giao.</span>
                },
                {
                  color: 'gray',
                  content: <span style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Bước 3: Mở <strong>Hồ sơ</strong> để tương tác trực tiếp với Camunda BPMN.</span>
                },
                {
                  color: 'gray',
                  content: <span style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Bước 4: Theo dõi chỉ số SLA và điểm nghẽn của quy trình tại trang <strong>Báo cáo</strong>.</span>
                }
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default Home;
