import TaskBoard from '../components/TaskBoard.jsx';

function Tasks({ user, token }) {
  return (
    <section className="page-grid">
      <TaskBoard token={token} user={user} />
      <div className="info-card">
        <h3>Quy trình nghiệp vụ</h3>
        <p>Hiển thị danh sách các nhiệm vụ cần thực hiện theo quy trình xử lý thực tế từ động cơ quy trình tích hợp với hệ thống quản lý tài liệu DMS.</p>
      </div>
    </section>
  );
}

export default Tasks;
