import TaskStatisticsChart from '../components/TaskStatisticsChart.jsx';
import '../styles/task-statistics.css';

function Reports({ user, token }) {
  return (
    <section className="page-grid">
      <div className="panel-card wide-card">
        <div className="panel-header">
          <div>
            <h3>📊 Báo cáo hệ thống</h3>
            <p>Trang báo cáo tổng hợp trạng thái phê duyệt, luồng DMS và thống kê task.</p>
          </div>
        </div>
      </div>

      {/* Task Statistics */}
      <div className="panel-card wide-card">
        <TaskStatisticsChart token={token} user={user} />
      </div>

      {/* Additional Reports Section */}
      <div className="panel-card wide-card">
        <div className="panel-header">
          <div>
            <h3>Các báo cáo khác</h3>
            <p>Bạn có thể mở rộng trang này để hiển thị báo cáo chi tiết theo danh mục, người duyệt và trạng thái nhóm.</p>
          </div>
        </div>
        <div className="info-card">
          <p>✓ Báo cáo theo người duyệt</p>
          <p>✓ Báo cáo theo danh mục</p>
          <p>✓ Báo cáo theo thời gian</p>
        </div>
      </div>
    </section>
  );
}

export default Reports;
