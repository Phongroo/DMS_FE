import { useEffect, useState } from 'react';
import ApprovalPanel from '../components/ApprovalPanel.jsx';

const API_BASE_URL = import.meta.env.VITE_AUTH_URL || 'https://dms-api-b25o.onrender.com';

function Approvals({ token, position, onApprove }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) {
      setError('Token không tồn tại. Vui lòng đăng nhập lại.');
      setLoading(false);
      return;
    }

    loadTasks();
  }, [token]);
  
    const loadTasks = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/doc/fetchDoc`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error || 'Không thể tải danh sách hồ sơ chờ duyệt');
        }

        const payload = await response.json();
        const tasksData = Array.isArray(payload.data) ? payload.data : payload.data?.data || [];
        const approvalTasks = tasksData.filter((task) => Array.isArray(task.actionButtons) && task.actionButtons.length > 0);
        setTasks(approvalTasks);
      } catch (err) {
        setError(err.message || 'Lỗi khi tải hồ sơ chờ duyệt');
      } finally {
        setLoading(false);
      }
    };

  return (
    <section className="page-grid">
      <ApprovalPanel position={position} tasks={tasks} loading={loading} error={error} onApprove={onApprove} token={token} loadTasks={loadTasks} />
      <div className="info-card">
        <h3>Luồng duyệt hồ sơ</h3>
        <p>Danh sách các task có actionButtons sẽ hiển thị ở đây để người dùng quản lý và duyệt.</p>
      </div>
    </section>
  );
}

export default Approvals;
