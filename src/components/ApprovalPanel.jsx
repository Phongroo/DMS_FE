import { useEffect, useMemo, useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_AUTH_URL || 'http://localhost:30080';

/**
 * @typedef {Object} TaskItem
 * @property {string} id - The task unique identification code.
 * @property {string} [docId] - Associated document identification.
 * @property {string} [processInstanceId] - The Camunda engine process instance identification code.
 * @property {string} [status] - The current process/task execution state.
 * @property {Object[]} [actionButtons] - The collection of interactive workflow action keys.
 */

/**
 * ApprovalPanel component.
 * Renders lists of waiting document profiles and hosts logic for manager/director sign-offs.
 * 
 * @component
 * @param {Object} props - Component properties.
 * @param {string} props.position - Current active role tier designation (e.g. 'admin', 'manager', 'director').
 * @param {TaskItem[]} props.tasks - Set of workflow profiles matching pending states.
 * @param {boolean} props.loading - Fetching state tracker indicating API request is active.
 * @param {string|null} props.error - Error info logs if retrieve workflows failed.
 * @param {function(Object): void} props.onApprove - Callback trigger firing state update broadcast on finish.
 * @param {string} props.token - Authorization JWT credentials value.
 * @param {function(): Promise<void>} props.loadTasks - Helper to trigger query reload of active workflow lists.
 * @returns {React.ReactElement} Active pending approval documents grid.
 */
function ApprovalPanel({ position, tasks = [], loading, error, onApprove, token, loadTasks }) {
  const [approvals, setApprovals] = useState([]);

  useEffect(() => {
    setApprovals(
      tasks.map((task) => ({
        id: task.id,
        document: task.docId || task.processInstanceId || 'Không rõ',
        status: task.status || 'PENDING',
        label: task.actionButtons?.[0]?.label || 'Duyệt',
        action: task.actionButtons?.[0]?.action || 'submit'
      }))
    );
  }, [tasks]);

  const allowApprove = useMemo(() => position === 'admin' || position === 'manager', [position]);

  const handleApprove = async (item, actionButton) => {
    try {
      const task = tasks.find((t) => t.id === item.id);
      if (!task) return;

      const payload = {
        processInstanceId: task.processInstanceId,
        dmsDoc: task
      };

      // Map button type to approval field
      const approvalMap = {
        '1': { managerApproved: actionButton?.value },
        '2': { directorApproved: actionButton?.value }
      };

      Object.assign(payload, approvalMap[actionButton?.type] || {});

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
        throw new Error(body.error || 'Lỗi khi xử lý hồ sơ');
      }

      await loadTasks();
      onApprove({ ...item, user: position, document: item.document });
    } catch (err) {
      console.error('ERROR:', err);
    }
  };

  return (
    <div className="panel-card">
      <div className="panel-header">
        <div>
          <h3>Danh sách hồ sơ chờ duyệt</h3>
          <p>Những task có actionButtons được tải từ API và hiển thị tại đây.</p>
        </div>
      </div>
      {loading ? (
        <div className="loading-shell">
          <div>Đang tải hồ sơ chờ duyệt...</div>
          <div className="loading-lines">
            <span className="loading-line"></span>
            <span className="loading-line"></span>
            <span className="loading-line short"></span>
          </div>
        </div>
      ) : error ? (
        <div className="task-error">{error}</div>
      ) : approvals.length === 0 ? (
        <div className="history-empty">Không tìm thấy task có actionButtons.</div>
      ) : (
        <div className="approval-grid">
          {approvals.map((item) => {
            const fullTask = tasks.find((t) => t.id === item.id);
            const actionButtons = fullTask?.actionButtons || [];

            return (
              <div key={item.id} className={`approval-card ${item.status.toLowerCase()}`}>
                <div className="approval-meta">
                  <strong>{item.document}</strong>
                  <span>{item.id}</span>
                </div>
                <p>Trạng thái: {item.status}</p>
                <div className="approval-footer" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span className="status-chip">{item.status}</span>
                  {actionButtons.length > 0 ? (
                    actionButtons.map((btn, btnIndex) => (
                      <button
                        key={`${item.id}-${btn.action}-${btnIndex}`}
                        type="button"
                        className={`action-button ${btn.color || 'secondary'}`}
                        onClick={() => handleApprove(item, btn)}
                      >
                        {btn.label}
                      </button>
                    ))
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleApprove(item)}
                    >
                      {item.label}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ApprovalPanel;
