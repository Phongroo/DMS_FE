const tasks = [
  {
    id: 'TASK-1001',
    title: 'Kiểm tra hồ sơ nhập liệu',
    assignee: 'Nguyễn An',
    stage: 'Pending',
    description: 'Xác nhận dữ liệu cơ bản và thông tin đính kèm.'
  },
  {
    id: 'TASK-1002',
    title: 'Phê duyệt tài liệu hợp lệ',
    assignee: 'Trần Bảo',
    stage: 'In Review',
    description: 'Đánh giá tính hợp lệ của hồ sơ DMS trước khi ký duyệt.'
  },
  {
    id: 'TASK-1003',
    title: 'Xác thực chữ ký số',
    assignee: 'Phạm Linh',
    stage: 'Approved',
    description: 'Kiểm tra chữ ký số và thời hạn hiệu lực.'
  },
  {
    id: 'TASK-1004',
    title: 'Gửi thông báo phản hồi',
    assignee: 'Lê Huy',
    stage: 'Pending',
    description: 'Chuẩn bị email/phản hồi cho người đề nghị.'
  }
];

export default tasks;
