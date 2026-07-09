import { useEffect, useMemo, useRef, useState } from 'react';
import { Select, message } from 'antd';
import { createPortal } from 'react-dom';
import '../styles/camunda-viewer.css';
import PDFViewer from './PDFViewer.jsx';

const API_BASE_URL = import.meta.env.VITE_AUTH_URL || 'http://localhost:30080';
const statusClasses = {
  DIRECTOR_REJECTED: 'rejected',
  DIRECTOR_APPROVED: 'approved',
  APPROVED: 'approved',
  PENDING: 'pending'
};

const documentTypeNames = {
  CONTRACT: 'Hợp đồng',
  PROPOSAL: 'Tờ trình',
  DECISION: 'Quyết định',
  DISPATCH: 'Công văn',
  REPORT: 'Báo cáo'
};

const sortOptions = {
  newest: { label: 'Mới nhất', field: 'createdDate', direction: 'desc' },
  oldest: { label: 'Cũ nhất', field: 'createdDate', direction: 'asc' },
  docAsc: { label: 'Mã hồ sơ A-Z', field: 'docId', direction: 'asc' },
  statusAsc: { label: 'Trạng thái A-Z', field: 'status', direction: 'asc' },
  filesDesc: { label: 'Nhiều tài liệu nhất', field: 'files', direction: 'desc' }
};

const normalizeText = (value) => String(value ?? '').toLowerCase().trim();

const getTaskSearchText = (task) => {
  const fileNames = Array.isArray(task.dmsFiles)
    ? task.dmsFiles.map((file) => file.fileName).join(' ')
    : '';
  const actionLabels = Array.isArray(task.actionButtons)
    ? task.actionButtons.map((button) => button.label).join(' ')
    : '';

  return normalizeText([
    task.id,
    task.docId,
    task.processInstanceId,
    task.status,
    task.createdDate,
    fileNames,
    actionLabels
  ].join(' '));
};

const compareTaskValue = (first, second, field) => {
  if (field === 'createdDate') {
    return new Date(first.createdDate || 0).getTime() - new Date(second.createdDate || 0).getTime();
  }

  if (field === 'files') {
    return (first.dmsFiles?.length || 0) - (second.dmsFiles?.length || 0);
  }

  return String(first[field] ?? '').localeCompare(String(second[field] ?? ''), 'vi', {
    sensitivity: 'base',
    numeric: true
  });
};

function TaskBoard({ token, user }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [fileFilter, setFileFilter] = useState('all');
  const [sortKey, setSortKey] = useState('newest');

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(5);
  const [expandedTaskIds, setExpandedTaskIds] = useState({});

  const toggleExpandTask = (taskId) => {
    setExpandedTaskIds((prev) => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  useEffect(() => {
    setCurrentPage(1);
    setExpandedTaskIds({});
  }, [searchQuery, statusFilter, actionFilter, fileFilter, sortKey]);

  useEffect(() => {
    if (!token) {
      setError('Token không tồn tại. Vui lòng đăng nhập lại.');
      setLoading(false);
      return;
    }

    fetchDoc();
  }, [token]);

      const fetchDoc = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/doc/fetchDoc`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error || 'Không thể lấy dữ liệu task');
        }

        const payload = await response.json();
        const tasksData = Array.isArray(payload.data) ? payload.data : payload.data?.data || [];
        setTasks(tasksData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

  const fileBaseUrl = useMemo(() => API_BASE_URL.replace(/\/+$/, ''), []);

  const availableStatuses = useMemo(() => {
    return Array.from(new Set(tasks.map((task) => task.status).filter(Boolean))).sort((first, second) =>
      first.localeCompare(second, 'vi', { sensitivity: 'base' })
    );
  }, [tasks]);

  const visibleTasks = useMemo(() => {
    const query = normalizeText(searchQuery);
    const sortConfig = sortOptions[sortKey] || sortOptions.newest;

    return tasks
      .filter((task) => {
        const matchesSearch = !query || getTaskSearchText(task).includes(query);
        const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
        const hasActions = Array.isArray(task.actionButtons) && task.actionButtons.length > 0;
        const hasFiles = Array.isArray(task.dmsFiles) && task.dmsFiles.length > 0;
        const matchesAction =
          actionFilter === 'all' ||
          (actionFilter === 'actionable' && hasActions) ||
          (actionFilter === 'readonly' && !hasActions);
        const matchesFile =
          fileFilter === 'all' ||
          (fileFilter === 'withFiles' && hasFiles) ||
          (fileFilter === 'withoutFiles' && !hasFiles);

        return matchesSearch && matchesStatus && matchesAction && matchesFile;
      })
      .sort((first, second) => {
        const compared = compareTaskValue(first, second, sortConfig.field);
        return sortConfig.direction === 'desc' ? -compared : compared;
      });
  }, [actionFilter, fileFilter, searchQuery, sortKey, statusFilter, tasks]);

  const totalPages = Math.ceil(visibleTasks.length / pageSize);

  const paginatedTasks = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return visibleTasks.slice(startIndex, startIndex + pageSize);
  }, [visibleTasks, currentPage, pageSize]);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + maxVisiblePages - 1);
    
    if (end - start + 1 < maxVisiblePages) {
      start = Math.max(1, end - maxVisiblePages + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  const hasActiveFilters =
    searchQuery || statusFilter !== 'all' || actionFilter !== 'all' || fileFilter !== 'all' || sortKey !== 'newest';

  const resetTaskFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setActionFilter('all');
    setFileFilter('all');
    setSortKey('newest');
  };

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerXml, setViewerXml] = useState(null);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerError, setViewerError] = useState(null);
  const [viewerProcessId, setViewerProcessId] = useState(null);
  const [viewerMeta, setViewerMeta] = useState(null);
  const [viewerTaskId, setViewerTaskId] = useState(null);
  const [viewerTimeline, setViewerTimeline] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState(null);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState(null);
  const [pdfDocId, setPdfDocId] = useState(null);
  const bpmnRef = useRef(null);
  const viewerInstanceRef = useRef(null);

  useEffect(() => {
    if (pdfOpen || viewerOpen) {
      document.body.classList.add('modal-open');
      document.documentElement.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
      document.documentElement.classList.remove('modal-open');
    }
    return () => {
      document.body.classList.remove('modal-open');
      document.documentElement.classList.remove('modal-open');
    };
  }, [pdfOpen, viewerOpen]);

  // styles moved to src/styles/camunda-viewer.css

  const handleApprove = (taskId) => {
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId ? { ...task, status: 'DIRECTOR_APPROVED' } : task
      )
    );
  };

  const handleTaskAction = (taskId, button) => {
    if (!button) return;
    setLoading(true);

    const task = tasks.find((t) => t.id === taskId);
    if (!task) {
      setLoading(false);
      return;
    }

    const processTask = async () => {
      try {
        const payload = {
          processInstanceId: task.processInstanceId,
          dmsDoc: task
        };

        // Map button type to approval field
        const approvalMap = {
          '1': { managerApproved: button?.value },
          '2': { directorApproved: button?.value },
          '0': { action: button?.value }
        };

        Object.assign(payload, approvalMap[button?.type] || {});

        const response = await fetch(`${API_BASE_URL}/process`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error || 'Lỗi khi xử lý task');
        }

        await fetchDoc();
      } catch (err) {
        console.error('ERROR processing task:', err);
      } finally {
        setLoading(false);
      }
    };

    processTask();
  };

  const handleReUploadFile = async (docId, file) => {
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/doc/${docId}/re-upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || 'Lỗi khi tải tài liệu mới lên');
      }

      message.success('Đã cập nhật hồ sơ mới thành công!');
      await fetchDoc();
    } catch (err) {
      console.error('Error re-uploading file:', err);
      message.error(err.message || 'Lỗi khi tải tài liệu mới lên');
    } finally {
      setLoading(false);
    }
  };

  const openViewer = async (processInstanceId, taskId) => {
    setViewerProcessId(processInstanceId);
    setViewerTaskId(taskId);
    setViewerLoading(true);
    setViewerError(null);
    setViewerXml(null);
    setViewerOpen(true);
    setViewerTimeline([]);
    setTimelineLoading(true);
    setTimelineError(null);

    const currentTask = tasks.find((t) => t.id === taskId);
    const docId = currentTask?.id;

    // Fetch BPMN Diagram
    try {
      const resp = await fetch(`${API_BASE_URL}/viewer/${processInstanceId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body.error || 'Không thể lấy sơ đồ tiến trình');
      }
      const payload = await resp.json();
      const xml = payload?.data?.bpmn20Xml;
      if (!xml) throw new Error('Không tìm thấy BPMN XML');
      setViewerXml(xml);
      setViewerMeta({
        completedActivities: payload.data.completedActivities || [],
        runningActivities: payload.data.runningActivities || [],
        errorActivities: payload.data.errorActivities || [],
        flows: payload.data.flows || []
      });
    } catch (err) {
      setViewerError(err.message || String(err));
    } finally {
      setViewerLoading(false);
    }

    // Fetch Timeline History
    if (docId) {
      try {
        const resp = await fetch(`${API_BASE_URL}/doc/${docId}/timeline`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!resp.ok) {
          const body = await resp.json().catch(() => ({}));
          throw new Error(body.error || 'Không thể lấy lịch sử duyệt');
        }
        const payload = await resp.json();
        setViewerTimeline(payload.data || []);
      } catch (err) {
        setTimelineError(err.message || String(err));
      } finally {
        setTimelineLoading(false);
      }
    } else {
      setTimelineLoading(false);
    }
  };

  // render BPMN when XML arrives
  useEffect(() => {
    if (!viewerXml || !bpmnRef.current) return;

    let mounted = true;
    const renderBpmn = async () => {
      try {
        const mod = await import('bpmn-js/lib/NavigatedViewer');
        const NavigatedViewer = mod.default;
        if (!mounted) return;
        // destroy previous
        if (viewerInstanceRef.current) {
          try { viewerInstanceRef.current.destroy(); } catch (e) {}
          viewerInstanceRef.current = null;
        }
        const viewer = new NavigatedViewer({ container: bpmnRef.current });
        viewerInstanceRef.current = viewer;
        try {
          await viewer.importXML(viewerXml);
          const canvas = viewer.get('canvas');
          const elementRegistry = viewer.get('elementRegistry');
          setTimeout(() => {
            if (mounted && canvas && typeof canvas.zoom === 'function') {
              try {
                canvas.zoom('fit-viewport', 'auto');
              } catch (e) {
                canvas.zoom('fit-viewport');
              }
            }
          }, 150);

          // apply highlights from viewerMeta - highlight running/error steps and the End Event if completed
          try {
            const meta = viewerMeta || {};
            (meta.runningActivities || []).forEach((id) => {
              try { canvas.addMarker(id, 'highlight-running'); } catch (e) {}
            });
            (meta.errorActivities || []).forEach((id) => {
              try { canvas.addMarker(id, 'highlight-error'); } catch (e) {}
            });
            (meta.completedActivities || []).forEach((id) => {
              const el = elementRegistry.get(id);
              if (el && el.type === 'bpmn:EndEvent') {
                try { canvas.addMarker(id, 'highlight-end'); } catch (e) {}
              }
            });
          } catch (e) {
            // ignore highlighting errors
          }
        } catch (err) {
          setViewerError('Không thể render BPMN: ' + (err && err.message ? err.message : String(err)));
        }
      } catch (err) {
        // dynamic import failed -> fallback to iframe
        setViewerError('bpmn-js không có sẵn, dùng iframe thay thế');
      }
    };

    renderBpmn();

    return () => {
      mounted = false;
      if (viewerInstanceRef.current) {
        try { viewerInstanceRef.current.destroy(); } catch (e) {}
        viewerInstanceRef.current = null;
      }
    };
  }, [viewerXml, viewerMeta]);

  const closeViewer = () => {
    setViewerOpen(false);
    setViewerXml(null);
    setViewerError(null);
    setViewerProcessId(null);
    setViewerTaskId(null);
    setViewerTimeline([]);
    setTimelineLoading(false);
    setTimelineError(null);
    if (viewerInstanceRef.current) {
      try { viewerInstanceRef.current.destroy(); } catch (e) {}
      viewerInstanceRef.current = null;
    }
  };

  const closePdf = () => {
    setPdfOpen(false);
    setPdfError(null);
    setPdfFile(null);
    setPdfDocId(null);
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl('');
    }
  };

  const openPdf = async (file, docId) => {
    const fileId = typeof file === 'object' ? file?.id : file;
    if (!fileId) return;

    setPdfOpen(true);
    setPdfError(null);
    setPdfFile(typeof file === 'object' ? file : null);
    setPdfDocId(docId || null);
    setPdfLoading(true);

    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl('');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/file/view/${fileId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Không thể tải file PDF');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
    } catch (err) {
      setPdfError(err.message || 'Lỗi khi mở PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  return (
    <div className="panel-card wide-card">
      <div className="panel-header">
        <div>
          <h3>Danh sách hồ sơ</h3>
          <p>Quản lý và thực hiện các nhiệm vụ theo tiến trình hệ thống.</p>
        </div>
      </div>

      {loading ? (
        <div className="loading-shell">
          <div>Đang tải danh sách nhiệm vụ...</div>
          <div className="loading-lines">
            <span className="loading-line"></span>
            <span className="loading-line"></span>
            <span className="loading-line short"></span>
          </div>
        </div>
      ) : error ? (
        <div className="task-error">{error}</div>
      ) : (
        <>
        <div className="task-toolbar">
          <label className="task-search">
            <span>Tìm kiếm</span>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Mã hồ sơ, tiến trình, tệp tin, trạng thái..."
            />
          </label>

          <label className="task-filter">
            <span>Trạng thái</span>
            <Select
              style={{ width: '130px' }}
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
              options={[
                { value: 'all', label: 'Tất cả' },
                ...availableStatuses.map((status) => ({ value: status, label: status }))
              ]}
            />
          </label>

          <label className="task-filter">
            <span>Thao tác</span>
            <Select
              style={{ width: '130px' }}
              value={actionFilter}
              onChange={(val) => setActionFilter(val)}
              options={[
                { value: 'all', label: 'Tất cả' },
                { value: 'actionable', label: 'Cần xử lý' },
                { value: 'readonly', label: 'Chỉ theo dõi' }
              ]}
            />
          </label>

          <label className="task-filter">
            <span>Tài liệu</span>
            <Select
              style={{ width: '170px' }}
              value={fileFilter}
              onChange={(val) => setFileFilter(val)}
              options={[
                { value: 'all', label: 'Tất cả' },
                { value: 'withFiles', label: 'Có tài liệu đính kèm' },
                { value: 'withoutFiles', label: 'Không có tài liệu' }
              ]}
            />
          </label>

          <label className="task-filter">
            <span>Sắp xếp</span>
            <Select
              style={{ width: '160px' }}
              value={sortKey}
              onChange={(val) => setSortKey(val)}
              options={Object.entries(sortOptions).map(([key, option]) => ({
                value: key,
                label: option.label
              }))}
            />
          </label>

          <button type="button" className="collapse-button task-reset-button" onClick={resetTaskFilters} disabled={!hasActiveFilters}>
            Đặt lại
          </button>
        </div>

        <div className="task-result-summary">
          Hiển thị {visibleTasks.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} - {Math.min(currentPage * pageSize, visibleTasks.length)} trong số {visibleTasks.length} nhiệm vụ (tổng số {tasks.length})
        </div>

        <div className="task-list">
          {tasks.length === 0 ? (
            <p>Không tìm thấy nhiệm vụ nào.</p>
          ) : paginatedTasks.length === 0 ? (
            <div className="history-empty">Không có nhiệm vụ nào khớp bộ lọc.</div>
          ) : (
            paginatedTasks.map((task, index) => {
              const taskKey = task.id || task.processInstanceId || task.docId || index;
              const isExpanded = expandedTaskIds[taskKey];
              const creatorVal = normalizeText(task.createdBy || task.creatorName);
              const userUsername = user ? normalizeText(user.username) : '';
              const userFullName = user ? normalizeText((user.firstName || '') + ' ' + (user.lastName || '')) : '';
              const isCreator = user && (creatorVal === userUsername || creatorVal === userFullName);

              return (
                <div key={taskKey} className={`task-card ${statusClasses[task.status] ?? 'pending'}`}>
                  {/* Collapsed view (Always visible) */}
                  <div 
                    className="task-card-summary" 
                    onClick={() => toggleExpandTask(taskKey)}
                  >
                    <div className="task-card-summary-grid">
                      <div>
                        <div className="doc-label">Mã hồ sơ</div>
                        <div className="doc-value" style={{ fontWeight: 700, color: 'var(--text)' }}>{task.docId}</div>
                      </div>
                      <div>
                        <div className="doc-label">Loại hồ sơ</div>
                        <div className="doc-value">{documentTypeNames[task.documentType || task.docType] || task.documentType || task.docType || 'Chưa phân loại'}</div>
                      </div>
                      <div>
                        <div className="doc-label">Người tạo</div>
                        <div className="doc-value">{task.createdBy || task.creator || task.author || 'Hệ thống'}</div>
                      </div>
                      <div>
                        <div className="doc-label">Ngày tạo</div>
                        <div className="doc-value">{new Date(task.createdDate).toLocaleDateString('vi-VN')}</div>
                      </div>
                    </div>
                    
                    <button 
                      type="button" 
                      className="task-collapse-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpandTask(taskKey);
                      }}
                      aria-label={isExpanded ? "Thu gọn" : "Mở rộng"}
                      title={isExpanded ? "Thu gọn" : "Mở rộng"}
                    >
                      <svg 
                        width="18" 
                        height="18" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2.5" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                        style={{
                          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                  </div>

                  {/* Expanded view (Only visible when active) */}
                  {isExpanded && (
                    <div className="task-card-details" style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'grid', gap: '16px' }}>
                      <div className="doc-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                        <div>
                          <div className="doc-label">Mã tiến trình quy trình</div>
                          <div className="doc-value" style={{ wordBreak: 'break-all' }}>{task.processInstanceId}</div>
                        </div>
                        <div>
                          <div className="doc-label">Trạng thái phê duyệt</div>
                          <span className={`status-chip ${statusClasses[task.status] ?? 'pending'}`} style={{ display: 'inline-block', marginTop: '4px' }}>
                            {task.status}
                          </span>
                        </div>
                        <div>
                          <div className="doc-label">Thời gian khởi tạo chi tiết</div>
                          <div className="doc-value">{new Date(task.createdDate).toLocaleString('vi-VN')}</div>
                        </div>
                      </div>

                      {task.dmsFiles?.length > 0 && (
                        <div className="task-files" style={{ marginTop: '10px' }}>
                          <h4>Tài liệu đính kèm ({task.dmsFiles.length})</h4>
                          <ul className="file-list">
                            {task.dmsFiles.map((file) => (
                              <li key={file.id} className="file-item">
                                <div>
                                  <strong>{file.fileName}</strong>
                                  <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                                    {Math.round(file.fileSize / 1024)} KB • {file.contentType}
                                  </div>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                  <button
                                    type="button"
                                    className="action-button secondary"
                                    onClick={() => openPdf(file, task.id)}
                                  >
                                    Xem tài liệu (PDF)
                                  </button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {isCreator && (task.status === 'DIRECTOR_REJECTED' || task.status === 'MANAGER_REJECTED') && (
                        <div className="re-upload-section" style={{ marginTop: '14px', padding: '16px', background: 'rgba(239, 68, 68, 0.05)', border: '1px dashed rgba(239, 68, 68, 0.25)', borderRadius: '8px' }}>
                          <h4 style={{ color: '#ff7875', marginBottom: '8px', fontWeight: 'bold' }}>⚠️ Hồ sơ này đã bị trả về. Vui lòng tải lên tài liệu mới để chỉnh sửa:</h4>
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <input 
                              type="file" 
                              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" 
                              id={`re-upload-file-${task.id}`}
                              style={{ display: 'none' }}
                              onChange={(e) => handleReUploadFile(task.id, e.target.files[0])}
                            />
                            <button
                              type="button"
                              className="action-button secondary"
                              onClick={() => document.getElementById(`re-upload-file-${task.id}`).click()}
                              disabled={loading}
                            >
                              📁 Chọn tài liệu mới
                            </button>
                            <span style={{ fontSize: '0.88rem', color: 'var(--muted)' }}>
                              Chấp nhận: PDF, Word, Ảnh
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="task-card-actions" style={{ marginTop: '10px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                          <button
                            type="button"
                            className="action-button"
                            onClick={() => openViewer(task.processInstanceId, task.id)}
                          >
                            Xem tiến trình xử lý
                          </button>

                          {(Array.isArray(task.actionButtons) ? task.actionButtons : []).map((btn, btnIndex) => {
                            const buttonLabel = btn.label || 'Thực hiện';
                            const buttonClass = `action-button ${btn.color || 'primary'}`;

                            return (
                              <button
                                key={`${task.id}-${btn.action}-${btnIndex}`}
                                type="button"
                                className={buttonClass}
                                onClick={() => handleTaskAction(task.id, btn)}
                              >
                                {buttonLabel}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {totalPages > 1 && (
          <div className="pagination-container">
            <button
              type="button"
              className="pagination-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            >
              &laquo; Trước
            </button>
            
            <div className="pagination-pages">
              {getPageNumbers().map((page) => (
                <button
                  key={page}
                  type="button"
                  className={`pagination-page-btn ${currentPage === page ? 'active' : ''}`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="pagination-btn"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            >
              Sau &raquo;
            </button>
          </div>
        )}
        </>
      )}

      {viewerOpen && createPortal(
        <div className="camunda-modal-overlay" role="dialog" aria-modal="true">
          <div className="camunda-modal">
            <div className="camunda-header">
              <div>
                <h3>Tiến trình xử lý quy trình</h3>
                <small>Sơ đồ quy trình nghiệp vụ và trạng thái thực thi hiện tại</small>
              </div>
              <div>
                <button className="close-btn" onClick={closeViewer} aria-label="Đóng">✕</button>
              </div>
            </div>

            <div className="process-banner">
              <div>
                <div className="process-label">Mã tiến trình quy trình (Process Instance ID)</div>
                <h4>{viewerProcessId}</h4>
              </div>
              <div className="process-status">Thông tin chi tiết về sơ đồ hoạt động của hồ sơ</div>
            </div>

            <div className="camunda-content split-view">
              <div className="bpmn-wrap">
                {viewerLoading ? (
                  <div className="history-empty">Đang tải tiến trình quy trình...</div>
                ) : viewerError ? (
                  <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ color: '#ffb6b6', padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)', borderBottom: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '0.9rem' }}>
                      Đang kết nối trình xem trực tiếp: {viewerError}
                    </div>
                    <div style={{ flex: 1, minHeight: 0 }}>
                      <iframe
                        title={`viewer-${viewerProcessId}`}
                        src={`${fileBaseUrl}/viewer/${viewerProcessId}`}
                        style={{ width: '100%', height: '100%', border: 'none', background: '#ffffff' }}
                      />
                    </div>
                  </div>
                ) : viewerXml ? (
                  <div className="bpmn-container" ref={bpmnRef} />
                ) : (
                  <div className="history-empty">Không có dữ liệu tiến trình.</div>
                )}
              </div>

              <div className="timeline-panel">
                <h5>Lịch sử xử lý & phê duyệt</h5>
                <div className="timeline-scroll">
                  {timelineLoading ? (
                    <div className="timeline-loading-status">Đang tải lịch sử...</div>
                  ) : timelineError ? (
                    <div className="timeline-error-status">{timelineError}</div>
                  ) : viewerTimeline.length === 0 ? (
                    <div className="timeline-empty-status">Chưa có lịch sử xử lý.</div>
                  ) : (
                    <div className="timeline-flow">
                      {viewerTimeline.map((item, index) => (
                        <div key={item.id || index} className="timeline-node">
                          <div className="timeline-marker"></div>
                          <div className="timeline-node-content">
                            <div className="timeline-time">
                              {new Date(item.timestamp).toLocaleString('vi-VN')}
                            </div>
                            <div className="timeline-action">{item.action}</div>
                            <div className="timeline-user">
                              Thực hiện bởi: <strong>{item.username}</strong>
                            </div>
                            {item.status && (
                              <div className="timeline-status">
                                Trạng thái: <span className={`status-tag ${item.status.toLowerCase()}`}>{item.status}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {viewerTaskId && (() => {
              const currentTask = tasks.find((t) => t.id === viewerTaskId);
              const actionButtons = currentTask?.actionButtons || [];

              return actionButtons.length > 0 ? (
                <div className="viewer-actions">
                  {actionButtons.map((btn, btnIndex) => (
                    <button
                      key={`viewer-${viewerTaskId}-${btn.action}-${btnIndex}`}
                      type="button"
                      className={`action-button ${btn.color || 'primary'}`}
                      onClick={() => {
                        handleTaskAction(viewerTaskId, btn);
                        closeViewer();
                      }}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              ) : null;
            })()}
          </div>
        </div>,
        document.body
      )}

      {pdfOpen && createPortal(
        <div className="camunda-modal-overlay" role="dialog" aria-modal="true">
          <div className="camunda-modal" style={{ maxWidth: '92vw', width: '100%', height: '920px', maxHeight: '95vh' }}>
            <div className="camunda-header">
              <div>
                <h3>Trạm Phê Duyệt Văn Bản & Ký Số DMS</h3>
                <small>Kiểm tra tệp tin đính kèm và thực hiện ký điện tử trước khi duyệt</small>
              </div>
              <div>
                <button className="close-btn" onClick={closePdf} aria-label="Đóng">✕</button>
              </div>
            </div>

            <div className="camunda-content" style={{ padding: 0, minHeight: 0, overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column' }}>
              {pdfLoading ? (
                <div className="history-empty">Đang tải tài liệu PDF...</div>
              ) : pdfError ? (
                <div className="history-empty" style={{ color: 'var(--danger, #b00020)' }}>{pdfError}</div>
              ) : pdfUrl ? (
                <PDFViewer defaultPdfUrl={pdfUrl} defaultDocTitle={pdfFile?.fileName || 'Tài liệu phê duyệt'} defaultDocId={pdfDocId} token={token} />
              ) : (
                <div className="history-empty">Không tìm thấy tài liệu để hiển thị.</div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default TaskBoard;
