import { useEffect, useRef, useState } from 'react';
import BpmnModeler from 'bpmn-js/lib/Modeler';
import { Button, Input, message, Modal, Space } from 'antd';
import { 
  PlayCircleOutlined, DownloadOutlined, UploadOutlined, 
  FileImageOutlined, RollbackOutlined, PlusOutlined 
} from '@ant-design/icons';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';

const DEFAULT_BPMN_XML = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:camunda="http://camunda.org/schema/1.0/bpmn" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_Dms_Approval" name="DMS Document Approval Flow" isExecutable="true">
    <bpmn:startEvent id="StartEvent_1" name="Khởi tạo hồ sơ">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Task_Approval" />
    <bpmn:userTask id="Task_Approval" name="Duyệt hồ sơ" camunda:assignee="\${assignee}">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_Approval" targetRef="EndEvent_1" />
    <bpmn:endEvent id="EndEvent_1" name="Kết thúc">
      <bpmn:incoming>Flow_2</bpmn:incoming>
    </bpmn:endEvent>
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_Dms_Approval">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">
        <dc:Bounds x="173" y="102" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="156" y="145" width="71" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="UserTask_0_di" bpmnElement="Task_Approval">
        <dc:Bounds x="265" y="80" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="EndEvent_0_di" bpmnElement="EndEvent_1">
        <dc:Bounds x="422" y="102" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="420" y="145" width="41" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint x="209" y="120" />
        <di:waypoint x="265" y="120" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
        <di:waypoint x="365" y="120" />
        <di:waypoint x="422" y="120" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

const API_BASE_URL = import.meta.env.VITE_AUTH_URL || 'http://localhost:8085';

function BpmnDesigner({ token }) {
  const containerRef = useRef(null);
  const modelerRef = useRef(null);
  const fileInputRef = useRef(null);
  const [deployModalOpen, setDeployModalOpen] = useState(false);
  const [processName, setProcessName] = useState('process_dms_approval.bpmn');
  const [deploying, setDeploying] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const modeler = new BpmnModeler({
      container: containerRef.current,
      keyboard: {
        bindTo: window
      }
    });

    modelerRef.current = modeler;

    // Load initial empty diagram
    modeler.importXML(DEFAULT_BPMN_XML).catch((err) => {
      console.error('Error importing initial BPMN XML:', err);
    });

    return () => {
      modeler.destroy();
    };
  }, []);

  // Handler for uploading local bpmn file
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessName(file.name);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const xml = event.target?.result;
      if (typeof xml === 'string' && modelerRef.current) {
        try {
          await modelerRef.current.importXML(xml);
          message.success('Tải sơ đồ quy trình thành công!');
        } catch (err) {
          console.error('Error importing uploaded BPMN XML:', err);
          message.error('File không hợp lệ hoặc lỗi định dạng BPMN 2.0');
        }
      }
    };
    reader.readAsText(file);
    // Reset file input value to allow uploading same file again
    e.target.value = '';
  };

  // Export current diagram as BPMN XML and download
  const handleDownloadXml = async () => {
    if (!modelerRef.current) return;
    try {
      const { xml } = await modelerRef.current.saveXML({ format: true });
      const blob = new Blob([xml], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = processName.endsWith('.bpmn') ? processName : `${processName}.bpmn`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      message.success('Tải tệp BPMN về máy thành công!');
    } catch (err) {
      console.error('Error exporting BPMN XML:', err);
      message.error('Lỗi khi xuất sơ đồ quy trình.');
    }
  };

  // Export current diagram as SVG image and download
  const handleDownloadSvg = async () => {
    if (!modelerRef.current) return;
    try {
      const { svg } = await modelerRef.current.saveSVG();
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${processName.replace(/\.[^/.]+$/, '')}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      message.success('Tải ảnh SVG sơ đồ thành công!');
    } catch (err) {
      console.error('Error exporting BPMN SVG:', err);
      message.error('Lỗi khi xuất ảnh SVG.');
    }
  };

  // Reset to default diagram template
  const handleResetTemplate = () => {
    if (!modelerRef.current) return;
    Modal.confirm({
      title: 'Reset sơ đồ thiết kế',
      content: 'Hành động này sẽ xóa các chỉnh sửa hiện tại và khôi phục về sơ đồ mẫu. Bạn có chắc chắn muốn tiếp tục?',
      okText: 'Xác nhận',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await modelerRef.current.importXML(DEFAULT_BPMN_XML);
          setProcessName('process_dms_approval.bpmn');
          message.success('Khôi phục sơ đồ mẫu thành công!');
        } catch (err) {
          message.error('Lỗi khôi phục sơ đồ.');
        }
      }
    });
  };

  // Send XML payload to backend deployment endpoint
  const handleDeployToCamunda = async () => {
    if (!modelerRef.current) return;
    setDeploying(true);
    try {
      const { xml } = await modelerRef.current.saveXML({ format: true });
      
      const response = await fetch(`${API_BASE_URL}/deploy-bpmn`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          xml: xml,
          filename: processName
        })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || result.message || 'Lỗi kết nối Camunda Server');
      }

      message.success('🚀 Deploy quy trình lên Camunda Engine thành công!');
      setDeployModalOpen(false);
    } catch (err) {
      console.error('Error deploying BPMN:', err);
      Modal.error({
        title: 'Lỗi Deploy Quy trình',
        content: err.message || 'Không thể gửi yêu cầu deploy đến Camunda Engine. Kiểm tra kết nối mạng và Server.'
      });
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div className="bpmn-designer-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
      {/* Top Toolbar */}
      <div className="bpmn-toolbar" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', background: 'rgba(255,255,255,0.03)', padding: '14px 20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
        <Space size="middle" wrap>
          <input 
            type="file" 
            accept=".bpmn,.xml" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            onChange={handleFileUpload} 
          />
          <Button 
            icon={<UploadOutlined />} 
            onClick={() => fileInputRef.current?.click()}
          >
            Tải tệp BPMN (.bpmn)
          </Button>

          <Button 
            icon={<DownloadOutlined />} 
            onClick={handleDownloadXml}
          >
            Tải về máy (.bpmn)
          </Button>

          <Button 
            icon={<FileImageOutlined />} 
            onClick={handleDownloadSvg}
          >
            Tải ảnh SVG
          </Button>

          <Button 
            danger 
            icon={<RollbackOutlined />} 
            onClick={handleResetTemplate}
          >
            Khôi phục mẫu
          </Button>
        </Space>

        <Button 
          type="primary" 
          icon={<PlayCircleOutlined />} 
          onClick={() => setDeployModalOpen(true)}
          style={{ background: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)', border: 'none' }}
        >
          🚀 Deploy quy trình lên Camunda
        </Button>
      </div>

      {/* Editor canvas container */}
      <div 
        className="bpmn-canvas-container" 
        style={{ 
          height: '650px', 
          border: '1px solid var(--border)', 
          borderRadius: '16px', 
          overflow: 'hidden', 
          background: '#ffffff',
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)'
        }}
      >
        <div 
          ref={containerRef} 
          style={{ 
            width: '100%', 
            height: '100%',
            color: '#333333' // default text color inside bpmn canvas
          }} 
        />
      </div>

      {/* Deploy configuration modal */}
      <Modal
        title="🚀 Thiết lập Deploy Quy trình Camunda"
        open={deployModalOpen}
        onOk={handleDeployToCamunda}
        onCancel={() => setDeployModalOpen(false)}
        confirmLoading={deploying}
        okText="Deploy Ngay"
        cancelText="Hủy"
      >
        <div style={{ padding: '8px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p>Sơ đồ quy trình BPMN của bạn sẽ được chuyển thành định dạng chuẩn XML và nạp trực tiếp vào Camunda Engine. Quy trình mới sẽ có hiệu lực ngay lập tức.</p>
          <div>
            <label style={{ fontWeight: '600', display: 'block', marginBottom: '6px' }}>Tên tệp quy trình:</label>
            <Input 
              value={processName} 
              onChange={(e) => setProcessName(e.target.value)} 
              placeholder="process_dms_approval.bpmn" 
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default BpmnDesigner;
