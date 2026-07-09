import PDFViewer from '../components/PDFViewer.jsx';

function PDFView({ token }) {
  return (
    <section className="pdf-view-page-container">
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ margin: '0 0 6px 0', fontSize: '1.6rem', fontWeight: '800' }}>Hệ Thống Phê Duyệt & Ký Số DMS</h2>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Xem chi tiết hồ sơ văn bản, ký nháp số trực quan và đóng dấu trực tiếp.
        </p>
      </div>
      <PDFViewer token={token} />
    </section>
  );
}

export default PDFView;

