import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Card, Table, Tag, Button, Input, Select, Modal, Form,
  Steps, Tabs, Row, Col, Statistic, Badge, message, Alert,
  Space, Tooltip, Divider, DatePicker, Popconfirm, Spin
} from 'antd';
import {
  SafetyCertificateOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  FileDoneOutlined,
  ExperimentOutlined,
  AuditOutlined,
  QrcodeOutlined,
  PlusOutlined,
  EyeOutlined,
  ReloadOutlined,
  SearchOutlined,
  CheckOutlined,
  StopOutlined,
  ScheduleOutlined,
  UserOutlined,
  SolutionOutlined,
  DeploymentUnitOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  ExpandOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import '../styles/camunda-viewer.css';

const API_BASE_URL = import.meta.env.VITE_AUTH_URL || 'http://localhost:8080';

const STANDARD_OPTIONS = [
  { label: 'QCVN 16:2023/BXD (Hợp quy Vật liệu Xây dựng)', value: 'QCVN 16:2023/BXD' },
  { label: 'ISO 9001:2015 (Hệ thống Quản lý Chất lượng)', value: 'ISO 9001:2015' },
  { label: 'ISO 22000:2018 (An toàn Thực phẩm)', value: 'ISO 22000:2018' },
  { label: 'ISO 14001:2015 (Hệ thống Quản lý Môi trường)', value: 'ISO 14001:2015' },
  { label: 'HACCP (Phân tích mối nguy và điểm kiểm soát)', value: 'HACCP' },
  { label: 'TCVN (Chứng nhận Hợp chuẩn Sản phẩm)', value: 'TCVN' }
];

const AUDIT_TYPE_OPTIONS = [
  { label: 'Đánh giá Lần đầu (Initial)', value: 'INITIAL' },
  { label: 'Đánh giá Giám sát Lần 1 (Surveillance 1 - 12 tháng)', value: 'SURVEILLANCE_1' },
  { label: 'Đánh giá Giám sát Lần 2 (Surveillance 2 - 24 tháng)', value: 'SURVEILLANCE_2' },
  { label: 'Đánh giá Tái cấp (Re-certification - 36 tháng)', value: 'RECERTIFICATION' }
];

const STATUS_MAP = {
  STAGE_1_DESK_REVIEW: { label: 'GĐ 1: Soát xét Tài liệu', color: 'blue', step: 0 },
  STAGE_2_ON_SITE: { label: 'GĐ 2: Đánh giá Hiện trường', color: 'cyan', step: 1 },
  TESTING: { label: 'Thử nghiệm Mẫu (PTN)', color: 'geekblue', step: 2 },
  CAPA_PENDING: { label: 'Khắc phục NCR (CAPA)', color: 'warning', step: 3 },
  TECHNICAL_REVIEW: { label: 'Thẩm xét Kỹ thuật', color: 'purple', step: 4 },
  APPROVED: { label: 'Đã Thẩm xét - Chờ cấp GCN', color: 'lime', step: 4 },
  CERTIFIED: { label: 'Đã cấp Giấy Chứng Nhận', color: 'success', step: 5 },
  REJECTED: { label: 'Từ chối cấp chứng nhận', color: 'error', step: -1 }
};

const DEFAULT_CERTIFICATION_BPMN_XML = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" 
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" 
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" 
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI" 
                  xmlns:camunda="http://camunda.org/schema/1.0/bpmn" 
                  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
                  id="Definitions_Cert" 
                  targetNamespace="http://bpmn.io/schema/bpmn" 
                  exporter="Camunda Modeler" 
                  exporterVersion="5.34.0">
  <bpmn:process id="certification_assessment" name="Quy trình Đánh giá &amp; Cấp Chứng nhận Hợp chuẩn / Hợp quy" isExecutable="true">
    <bpmn:startEvent id="StartEvent_Cert" name="Tiếp nhận Hồ sơ Đăng ký">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:userTask id="Task_DeskReview" name="Giai đoạn 1: Soát xét Tài liệu &amp; Năng lực" camunda:assignee="LEAD_AUDITOR">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:userTask id="Task_OnSiteAudit" name="Giai đoạn 2: Đánh giá Hiện trường &amp; Lấy mẫu" camunda:assignee="LEAD_AUDITOR">
      <bpmn:incoming>Flow_2</bpmn:incoming>
      <bpmn:outgoing>Flow_3</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:userTask id="Task_LabTesting" name="Thử nghiệm Mẫu tại Phòng Lab (VILAS/17025)" camunda:assignee="AUDITOR">
      <bpmn:incoming>Flow_3</bpmn:incoming>
      <bpmn:outgoing>Flow_4</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:exclusiveGateway id="Gateway_NCR" name="Có phát hiện lỗi NCR?">
      <bpmn:incoming>Flow_4</bpmn:incoming>
      <bpmn:outgoing>Flow_HasNCR</bpmn:outgoing>
      <bpmn:outgoing>Flow_NoNCR</bpmn:outgoing>
    </bpmn:exclusiveGateway>
    <bpmn:userTask id="Task_CAPA" name="Doanh nghiệp nộp CAPA &amp; Chuyên gia Đóng lỗi" camunda:assignee="LEAD_AUDITOR">
      <bpmn:incoming>Flow_HasNCR</bpmn:incoming>
      <bpmn:outgoing>Flow_CAPADone</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:userTask id="Task_TechnicalReview" name="Thẩm xét Kỹ thuật Độc lập (ISO 17021/17065)" camunda:assignee="TECHNICAL_REVIEWER">
      <bpmn:incoming>Flow_NoNCR</bpmn:incoming>
      <bpmn:incoming>Flow_CAPADone</bpmn:incoming>
      <bpmn:outgoing>Flow_5</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:exclusiveGateway id="Gateway_ReviewDecision" name="Kết quả Thẩm xét?">
      <bpmn:incoming>Flow_5</bpmn:incoming>
      <bpmn:outgoing>Flow_ReviewPass</bpmn:outgoing>
      <bpmn:outgoing>Flow_ReviewFail</bpmn:outgoing>
    </bpmn:exclusiveGateway>
    <bpmn:userTask id="Task_IssueCert" name="Ký Quyết định &amp; Cấp Giấy Chứng Nhận (GCN)" camunda:assignee="CERT_DIRECTOR">
      <bpmn:incoming>Flow_ReviewPass</bpmn:incoming>
      <bpmn:outgoing>Flow_6</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:endEvent id="EndEvent_Certified" name="Phát hành GCN &amp; Kích hoạt Giám sát Định kỳ">
      <bpmn:incoming>Flow_6</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:endEvent id="EndEvent_Rejected" name="Từ chối Cấp Chứng nhận">
      <bpmn:incoming>Flow_ReviewFail</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_Cert" targetRef="Task_DeskReview" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_DeskReview" targetRef="Task_OnSiteAudit" />
    <bpmn:sequenceFlow id="Flow_3" sourceRef="Task_OnSiteAudit" targetRef="Task_LabTesting" />
    <bpmn:sequenceFlow id="Flow_4" sourceRef="Task_LabTesting" targetRef="Gateway_NCR" />
    <bpmn:sequenceFlow id="Flow_HasNCR" name="Có lỗi (Major/Minor)" sourceRef="Gateway_NCR" targetRef="Task_CAPA" />
    <bpmn:sequenceFlow id="Flow_NoNCR" name="Không có lỗi" sourceRef="Gateway_NCR" targetRef="Task_TechnicalReview" />
    <bpmn:sequenceFlow id="Flow_CAPADone" sourceRef="Task_CAPA" targetRef="Task_TechnicalReview" />
    <bpmn:sequenceFlow id="Flow_5" sourceRef="Task_TechnicalReview" targetRef="Gateway_ReviewDecision" />
    <bpmn:sequenceFlow id="Flow_ReviewPass" name="Đạt yêu cầu" sourceRef="Gateway_ReviewDecision" targetRef="Task_IssueCert" />
    <bpmn:sequenceFlow id="Flow_ReviewFail" name="Không đạt" sourceRef="Gateway_ReviewDecision" targetRef="EndEvent_Rejected" />
    <bpmn:sequenceFlow id="Flow_6" sourceRef="Task_IssueCert" targetRef="EndEvent_Certified" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_Cert">
    <bpmndi:BPMNPlane id="BPMNPlane_Cert" bpmnElement="certification_assessment">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_Cert" bpmnElement="StartEvent_Cert">
        <dc:Bounds x="162" y="162" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="141" y="205" width="80" height="27" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Activity_DeskReview_di" bpmnElement="Task_DeskReview">
        <dc:Bounds x="260" y="140" width="120" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Activity_OnSiteAudit_di" bpmnElement="Task_OnSiteAudit">
        <dc:Bounds x="440" y="140" width="130" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Activity_LabTesting_di" bpmnElement="Task_LabTesting">
        <dc:Bounds x="630" y="140" width="130" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Gateway_NCR_di" bpmnElement="Gateway_NCR" isMarkerVisible="true">
        <dc:Bounds x="820" y="155" width="50" height="50" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Activity_CAPA_di" bpmnElement="Task_CAPA">
        <dc:Bounds x="890" y="40" width="130" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Activity_TechnicalReview_di" bpmnElement="Task_TechnicalReview">
        <dc:Bounds x="930" y="140" width="130" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Gateway_ReviewDecision_di" bpmnElement="Gateway_ReviewDecision" isMarkerVisible="true">
        <dc:Bounds x="1120" y="155" width="50" height="50" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Activity_IssueCert_di" bpmnElement="Task_IssueCert">
        <dc:Bounds x="1230" y="140" width="130" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="EndEvent_Certified_di" bpmnElement="EndEvent_Certified">
        <dc:Bounds x="1420" y="162" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="EndEvent_Rejected_di" bpmnElement="EndEvent_Rejected">
        <dc:Bounds x="1280" y="272" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint x="198" y="180" />
        <di:waypoint x="260" y="180" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
        <di:waypoint x="380" y="180" />
        <di:waypoint x="440" y="180" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_3_di" bpmnElement="Flow_3">
        <di:waypoint x="570" y="180" />
        <di:waypoint x="630" y="180" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_4_di" bpmnElement="Flow_4">
        <di:waypoint x="760" y="180" />
        <di:waypoint x="820" y="180" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_HasNCR_di" bpmnElement="Flow_HasNCR">
        <di:waypoint x="845" y="155" />
        <di:waypoint x="845" y="80" />
        <di:waypoint x="890" y="80" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_NoNCR_di" bpmnElement="Flow_NoNCR">
        <di:waypoint x="870" y="180" />
        <di:waypoint x="930" y="180" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_CAPADone_di" bpmnElement="Flow_CAPADone">
        <di:waypoint x="1020" y="80" />
        <di:waypoint x="1050" y="80" />
        <di:waypoint x="1050" y="140" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_5_di" bpmnElement="Flow_5">
        <di:waypoint x="1060" y="180" />
        <di:waypoint x="1120" y="180" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_ReviewPass_di" bpmnElement="Flow_ReviewPass">
        <di:waypoint x="1170" y="180" />
        <di:waypoint x="1230" y="180" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_ReviewFail_di" bpmnElement="Flow_ReviewFail">
        <di:waypoint x="1145" y="205" />
        <di:waypoint x="1145" y="290" />
        <di:waypoint x="1280" y="290" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_6_di" bpmnElement="Flow_6">
        <di:waypoint x="1360" y="180" />
        <di:waypoint x="1420" y="180" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

export default function CertificationAudit({ user, token }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalProjects: 0,
    totalCertificates: 0,
    validCertificates: 0,
    openNcrs: 0,
    pendingTests: 0
  });

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStandard, setFilterStandard] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Active Project Detail Modal
  const [selectedProject, setSelectedProject] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('1');

  // Related Sub-data for Selected Project
  const [projectNcrs, setProjectNcrs] = useState([]);
  const [projectSamples, setProjectSamples] = useState([]);
  const [projectCertificate, setProjectCertificate] = useState(null);
  const [loadingSubData, setLoadingSubData] = useState(false);

  // Forms
  const [createProjectModalOpen, setCreateProjectModalOpen] = useState(false);
  const [createForm] = Form.useForm();

  const [createNcrModalOpen, setCreateNcrModalOpen] = useState(false);
  const [ncrForm] = Form.useForm();

  const [createSampleModalOpen, setCreateSampleModalOpen] = useState(false);
  const [sampleForm] = Form.useForm();

  const [capaModalOpen, setCapaModalOpen] = useState(false);
  const [selectedNcr, setSelectedNcr] = useState(null);
  const [capaForm] = Form.useForm();

  // Public Verification Portal Modal
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verifyInput, setVerifyInput] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifyLoading, setVerifyLoading] = useState(false);

  // Camunda BPMN Viewer States
  const [bpmnModalOpen, setBpmnModalOpen] = useState(false);
  const [bpmnProject, setBpmnProject] = useState(null);
  const [bpmnLoading, setBpmnLoading] = useState(false);
  const [bpmnError, setBpmnError] = useState(null);
  const [bpmnXml, setBpmnXml] = useState(null);
  const [bpmnMeta, setBpmnMeta] = useState(null);
  const [bpmnTimeline, setBpmnTimeline] = useState([]);
  const [bpmnActionButtons, setBpmnActionButtons] = useState([]);
  const bpmnContainerRef = useRef(null);
  const viewerInstanceRef = useRef(null);

  // Extract user position and role permissions
  const userRole = user?.authorities?.[0]?.authority || user?.roles?.[0]?.roleName || (user?.username === 'phongro' ? 'ADMIN' : '');
  const userPosition = user?.authorities?.[0]?.position || user?.roles?.[0]?.position || (userRole === 'ADMIN' ? 'ADMIN' : 'NORMAL');
  const isAdmin = userRole === 'ADMIN' || userRole === 'ROLE_ADMIN' || userPosition === 'ADMIN' || user?.username === 'phongro';

  const isLeadAuditor = isAdmin || ['LEAD_AUDITOR', 'STAFF', 'MANAGER'].includes(userPosition);
  const isTechnicalReviewer = isAdmin || ['TECHNICAL_REVIEWER'].includes(userPosition);
  const isCertDirector = isAdmin || ['CERT_DIRECTOR', 'DIRECTOR'].includes(userPosition);

  // Dynamic Action Buttons Map with ISO 17021/17065 Separation of Duties
  const getProjectActions = (project) => {
    if (!project) return { buttons: [], requiredRole: '', canAct: false, visibleButtons: [] };

    const status = project.status;
    let requiredRole = '';
    let allowedPositions = [];
    let buttons = [];

    switch (status) {
      case 'STAGE_1_DESK_REVIEW':
        requiredRole = 'Trưởng đoàn Đánh giá (LEAD_AUDITOR)';
        allowedPositions = ['LEAD_AUDITOR', 'ADMIN'];
        buttons = [
          {
            label: 'Duyệt GĐ 1 ➔ Đánh Giá Hiện Trường',
            color: 'success',
            action: 'STAGE_2_ON_SITE',
            note: 'Đã soát xét đạt hồ sơ tài liệu Giai đoạn 1',
            icon: 'check'
          },
          {
            label: 'Yêu Cầu Doanh Nghiệp Bổ Sung Hồ Sơ',
            color: 'warning',
            action: 'STAGE_1_DESK_REVIEW',
            note: 'Hồ sơ chưa đủ, yêu cầu doanh nghiệp bổ sung thêm tài liệu quy trình',
            icon: 'warning'
          }
        ];
        break;

      case 'STAGE_2_ON_SITE':
        requiredRole = 'Trưởng đoàn / Chuyên gia (LEAD_AUDITOR / AUDITOR)';
        allowedPositions = ['LEAD_AUDITOR', 'AUDITOR', 'ADMIN'];
        buttons = [
          {
            label: 'Lấy Mẫu Hiện Trường ➔ Gửi PTN Thử Nghiệm',
            color: 'primary',
            action: 'TESTING',
            note: 'Đã hoàn thành đánh giá hiện trường và niêm phong mẫu gửi PTN',
            icon: 'experiment'
          },
          {
            label: 'Phát Hiện Lỗi ➔ Chuyển Khắc Phục NCR',
            color: 'danger',
            action: 'CAPA_PENDING',
            note: 'Lập biên bản điểm không phù hợp (NCR) tại hiện trường',
            icon: 'warning'
          },
          {
            label: 'Hiện Trường Đạt Chuẩn ➔ Trình Thẩm Xét',
            color: 'success',
            action: 'TECHNICAL_REVIEW',
            note: 'Đánh giá hiện trường đạt 100%, chuyển bước thẩm xét độc lập',
            icon: 'check'
          }
        ];
        break;

      case 'TESTING':
        requiredRole = 'Phòng Thử Nghiệm / Chuyên gia (AUDITOR / LEAD_AUDITOR)';
        allowedPositions = ['AUDITOR', 'LEAD_AUDITOR', 'ADMIN'];
        buttons = [
          {
            label: 'Kết Quả Thử Nghiệm Đạt ➔ Chuyển Tiếp',
            color: 'success',
            action: 'CAPA_PENDING',
            note: 'Mẫu thử nghiệm đạt chuẩn theo tiêu chuẩn thử nghiệm quy định',
            icon: 'check'
          },
          {
            label: 'Kết Quả Thử Nghiệm Không Đạt ➔ Lập NCR',
            color: 'danger',
            action: 'CAPA_PENDING',
            note: 'Mẫu thử nghiệm không đạt chỉ tiêu kỹ thuật',
            icon: 'close'
          }
        ];
        break;

      case 'CAPA_PENDING':
        requiredRole = 'Trưởng đoàn Đánh giá (LEAD_AUDITOR) Thẩm tra CAPA';
        allowedPositions = ['LEAD_AUDITOR', 'ADMIN'];
        buttons = [
          {
            label: 'Đóng Lỗi NCR ➔ Trình Thẩm Xét Độc Lập',
            color: 'primary',
            action: 'TECHNICAL_REVIEW',
            note: 'Đã thẩm tra nghiệm thu hành động khắc phục CAPA của doanh nghiệp',
            icon: 'file-done'
          }
        ];
        break;

      case 'TECHNICAL_REVIEW':
        requiredRole = 'Thẩm xét viên Kỹ thuật Độc lập (TECHNICAL_REVIEWER)';
        // Theo ISO 17021: Chuyên gia đánh giá không được tự duyệt thẩm định
        allowedPositions = ['TECHNICAL_REVIEWER', 'ADMIN'];
        buttons = [
          {
            label: 'Thẩm Xét ĐẠT ➔ Trình Giám Đốc Cấp GCN',
            color: 'success',
            action: 'APPROVED',
            note: 'Thẩm xét độc lập đạt chuẩn ISO 17021 / ISO 17065',
            icon: 'check'
          },
          {
            label: 'Thẩm Xét Chưa Đạt ➔ Yêu Cầu Bổ Sung',
            color: 'warning',
            action: 'CAPA_PENDING',
            note: 'Thẩm xét viên yêu cầu đoàn đánh giá làm rõ thêm bằng chứng',
            icon: 'warning'
          },
          {
            label: 'Từ Chối Cấp Chứng Nhận',
            color: 'danger',
            action: 'REJECTED',
            note: 'Từ chối cấp chứng nhận do không đáp ứng tiêu chuẩn',
            icon: 'stop'
          }
        ];
        break;

      case 'APPROVED':
        requiredRole = 'Giám đốc Chứng nhận (CERT_DIRECTOR)';
        allowedPositions = ['CERT_DIRECTOR', 'DIRECTOR', 'ADMIN'];
        buttons = [
          {
            label: 'Ký Quyết Định & Cấp Giấy Chứng Nhận',
            color: 'success',
            action: 'ISSUE_CERT',
            isIssueCert: true,
            note: 'Ký duyệt và phát hành Giấy chứng nhận điện tử kèm QR tra cứu',
            icon: 'safety'
          },
          {
            label: 'Trả Lại Hồ Sơ Thẩm Xét',
            color: 'danger',
            action: 'TECHNICAL_REVIEW',
            note: 'Giám đốc yêu cầu xem xét lại hồ sơ thẩm định',
            icon: 'close'
          }
        ];
        break;

      case 'CERTIFIED':
        requiredRole = 'Đã hoàn tất cấp chứng nhận';
        allowedPositions = ['ALL'];
        buttons = [
          {
            label: 'Xem Giấy Chứng Nhận Điện Tử (QR)',
            color: 'primary',
            action: 'VIEW_CERT',
            isViewCert: true,
            icon: 'qrcode'
          }
        ];
        break;

      case 'REJECTED':
        requiredRole = 'Trưởng đoàn / Giám đốc (LEAD_AUDITOR / CERT_DIRECTOR)';
        allowedPositions = ['LEAD_AUDITOR', 'CERT_DIRECTOR', 'ADMIN'];
        buttons = [
          {
            label: 'Tái Khởi Động Đánh Giá Lại',
            color: 'warning',
            action: 'STAGE_1_DESK_REVIEW',
            note: 'Khởi động lại quy trình đánh giá mới cho doanh nghiệp',
            icon: 'reload'
          }
        ];
        break;

      default:
        break;
    }

    const canAct = isAdmin || allowedPositions.includes(userPosition) || allowedPositions.includes('ALL');

    return {
      buttons,
      requiredRole,
      canAct: Boolean(canAct),
      visibleButtons: canAct ? buttons : []
    };
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/certification/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const payload = await res.json();
        setStats(payload.data || stats);
      }
    } catch (err) {
      console.warn('Load certification stats failed:', err);
    }
  };

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/certification/projects`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const payload = await res.json();
        const data = payload.data || [];
        setProjects(data);
      }
    } catch (err) {
      console.warn('Load projects failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchStats();
  }, [token]);

  const loadProjectDetails = async (project) => {
    setSelectedProject(project);
    setDetailModalOpen(true);
    setActiveTab('1');
    setLoadingSubData(true);

    try {
      const [ncrsRes, samplesRes, certRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/certification/projects/${project.id}/ncrs`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/api/certification/projects/${project.id}/samples`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/api/certification/projects/${project.id}/certificate`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (ncrsRes.ok) {
        const payload = await ncrsRes.json();
        setProjectNcrs(payload.data || []);
      }
      if (samplesRes.ok) {
        const payload = await samplesRes.json();
        setProjectSamples(payload.data || []);
      }
      if (certRes.ok) {
        const payload = await certRes.json();
        setProjectCertificate(payload.data || null);
      }
    } catch (err) {
      console.warn('Load project subdata failed:', err);
    } finally {
      setLoadingSubData(false);
    }
  };

  // --- Status Transition Handler ---
  const handleTransitionStatus = async (newStatus, note = '', targetProject = null) => {
    const proj = targetProject || selectedProject || bpmnProject;
    if (!proj) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/certification/projects/${proj.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus, note })
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.description || 'Không thể chuyển trạng thái');
      }
      message.success(`Đã chuyển quy trình sang bước: ${STATUS_MAP[newStatus]?.label || newStatus}`);
      const updated = payload.data;
      if (selectedProject?.id === updated.id) {
        setSelectedProject(updated);
      }
      if (bpmnModalOpen && bpmnProject?.id === updated.id) {
        setBpmnProject(updated);
        openBpmnViewer(updated);
      }
      fetchProjects();
      fetchStats();
    } catch (err) {
      message.error(err.message);
    }
  };

  // --- Execute Project Action (Universal Action Dispatcher) ---
  const handleExecuteProjectAction = async (btn, project) => {
    if (!btn || !project) return;

    if (btn.isIssueCert) {
      Modal.confirm({
        title: 'Ký Quyết Định & Phát Hành Giấy Chứng Nhận',
        content: `Bạn có chắc chắn muốn ký duyệt và phát hành Giấy chứng nhận chính thức cho "${project.companyName}" (${project.standard})? Hệ thống sẽ tạo GCN điện tử có hiệu lực 3 năm kèm mã QR tra cứu công khai.`,
        okText: 'Ký Phê Duyệt & Phát Hành GCN',
        okType: 'primary',
        cancelText: 'Hủy',
        onOk: async () => {
          await handleIssueCertificate(project);
        }
      });
      return;
    }

    if (btn.isViewCert) {
      loadProjectDetails(project);
      setActiveTab('4');
      return;
    }

    await handleTransitionStatus(btn.action, btn.note, project);
  };

  // --- Create Project ---
  const handleCreateProject = async (values) => {
    try {
      const body = {
        ...values,
        plannedStartDate: values.dates?.[0]?.toISOString(),
        plannedEndDate: values.dates?.[1]?.toISOString()
      };
      delete body.dates;

      const res = await fetch(`${API_BASE_URL}/api/certification/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        message.success('Đã khởi tạo dự án đánh giá chứng nhận mới thành công');
        setCreateProjectModalOpen(false);
        createForm.resetFields();
        fetchProjects();
        fetchStats();
      } else {
        const payload = await res.json();
        message.error(payload.description || 'Thất bại khi tạo dự án');
      }
    } catch (err) {
      message.error(err.message);
    }
  };

  // --- Create NCR ---
  const handleCreateNcr = async (values) => {
    try {
      const body = {
        ...values,
        deadline: values.deadline?.toISOString()
      };
      const res = await fetch(`${API_BASE_URL}/api/certification/projects/${selectedProject.id}/ncrs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        message.success('Đã lập biên bản điểm không phù hợp (NCR) thành công');
        setCreateNcrModalOpen(false);
        ncrForm.resetFields();
        loadProjectDetails(selectedProject);
        fetchStats();
      }
    } catch (err) {
      message.error(err.message);
    }
  };

  // --- Submit CAPA ---
  const handleSubmitCapa = async (values) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/certification/ncrs/${selectedNcr.id}/submit-capa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(values)
      });
      if (res.ok) {
        message.success('Đã nộp hành động khắc phục CAPA');
        setCapaModalOpen(false);
        capaForm.resetFields();
        loadProjectDetails(selectedProject);
      }
    } catch (err) {
      message.error(err.message);
    }
  };

  // --- Review CAPA (Lead Auditor closes NCR) ---
  const handleReviewCapa = async (ncrId, approve) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/certification/ncrs/${ncrId}/review-capa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ approve })
      });
      if (res.ok) {
        message.success(approve ? 'Đã duyệt đóng lỗi NCR thành công' : 'Đã yêu cầu doanh nghiệp khắc phục lại');
        loadProjectDetails(selectedProject);
        fetchStats();
      }
    } catch (err) {
      message.error(err.message);
    }
  };

  // --- Create Sample ---
  const handleCreateSample = async (values) => {
    try {
      const body = {
        ...values,
        samplingDate: values.samplingDate?.toISOString()
      };
      const res = await fetch(`${API_BASE_URL}/api/certification/projects/${selectedProject.id}/samples`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        message.success('Đã lập biên bản lấy mẫu hiện trường thành công');
        setCreateSampleModalOpen(false);
        sampleForm.resetFields();
        loadProjectDetails(selectedProject);
        fetchStats();
      }
    } catch (err) {
      message.error(err.message);
    }
  };

  // --- Issue Certificate (Cert Director) ---
  const handleIssueCertificate = async (targetProject = null) => {
    const proj = targetProject || selectedProject || bpmnProject;
    if (!proj) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/certification/projects/${proj.id}/issue-certificate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.description || 'Không thể cấp Giấy chứng nhận');
      }
      message.success('Đã ký phê duyệt và phát hành Giấy chứng nhận thành công!');
      if (selectedProject?.id === proj.id) {
        loadProjectDetails(proj);
      }
      if (bpmnModalOpen && bpmnProject?.id === proj.id) {
        const refreshedProj = { ...bpmnProject, status: 'CERTIFIED' };
        setBpmnProject(refreshedProj);
        openBpmnViewer(refreshedProj);
      }
      fetchProjects();
      fetchStats();
    } catch (err) {
      message.error(err.message);
    }
  };

  // --- Public Certificate Verification ---
  const handleVerifyPublic = async () => {
    if (!verifyInput.trim()) {
      message.warning('Vui lòng nhập Số GCN hoặc Mã QR tra cứu');
      return;
    }
    setVerifyLoading(true);
    setVerifyResult(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/certification/public/verify?query=${encodeURIComponent(verifyInput.trim())}`);
      const payload = await res.json();
      if (res.ok && payload.data) {
        setVerifyResult(payload.data);
      } else {
        message.error(payload.description || 'Không tìm thấy chứng chỉ hợp lệ');
      }
    } catch (err) {
      message.error('Lỗi khi tra cứu: ' + err.message);
    } finally {
      setVerifyLoading(false);
    }
  };

  // --- Build Certification Timeline ---
  const buildCertificationTimeline = (project) => {
    const list = [];
    const now = new Date();

    list.push({
      id: 'step-1',
      timestamp: project.createdAt || new Date(Date.now() - 86400000 * 10),
      action: 'Tiếp nhận Hồ sơ Đăng ký Chứng nhận & Thẩm tra Năng lực',
      username: project.createdBy || 'Chuyên viên CSKH',
      status: 'HOÀN THÀNH',
      statusClass: 'approved'
    });

    if (['STAGE_2_ON_SITE', 'TESTING', 'CAPA_PENDING', 'TECHNICAL_REVIEW', 'APPROVED', 'CERTIFIED'].includes(project.status)) {
      list.push({
        id: 'step-2',
        timestamp: project.plannedStartDate || new Date(Date.now() - 86400000 * 8),
        action: 'Giai đoạn 1: Soát xét Tài liệu & Hệ thống Kiểm soát',
        username: project.leadAuditor || 'Trưởng đoàn Đánh giá',
        status: 'ĐẠT YÊU CẦU',
        statusClass: 'approved'
      });
    } else if (project.status === 'STAGE_1_DESK_REVIEW') {
      list.push({
        id: 'step-2-active',
        timestamp: now,
        action: 'Giai đoạn 1: Đang soát xét hồ sơ tài liệu khách hàng',
        username: project.leadAuditor || 'Trưởng đoàn Đánh giá',
        status: 'ĐANG XỬ LÝ',
        statusClass: 'pending'
      });
    }

    if (['TESTING', 'CAPA_PENDING', 'TECHNICAL_REVIEW', 'APPROVED', 'CERTIFIED'].includes(project.status)) {
      list.push({
        id: 'step-3',
        timestamp: project.actualAuditDate || new Date(Date.now() - 86400000 * 6),
        action: 'Giai đoạn 2: Đánh giá Hiện trường & Lấy mẫu niêm phong',
        username: project.leadAuditor || 'Trưởng đoàn Đánh giá',
        status: 'HOÀN THÀNH',
        statusClass: 'approved'
      });
    } else if (project.status === 'STAGE_2_ON_SITE') {
      list.push({
        id: 'step-3-active',
        timestamp: now,
        action: 'Giai đoạn 2: Đang thực hiện đánh giá tại cơ sở sản xuất',
        username: project.leadAuditor || 'Trưởng đoàn Đánh giá',
        status: 'ĐANG XỬ LÝ',
        statusClass: 'pending'
      });
    }

    if (['CAPA_PENDING', 'TECHNICAL_REVIEW', 'APPROVED', 'CERTIFIED'].includes(project.status)) {
      list.push({
        id: 'step-4',
        timestamp: new Date(Date.now() - 86400000 * 4),
        action: 'Thử nghiệm Mẫu tại Phòng Lab VILAS / ISO 17025',
        username: 'Phòng Thử nghiệm Chỉ định',
        status: 'ĐÃ CÓ KẾT QUẢ (PASS)',
        statusClass: 'approved'
      });
    } else if (project.status === 'TESTING') {
      list.push({
        id: 'step-4-active',
        timestamp: now,
        action: 'Mẫu đang được thử nghiệm các chỉ tiêu kỹ thuật tại phòng Lab',
        username: 'PTN VILAS',
        status: 'ĐANG THỬ NGHIỆM',
        statusClass: 'pending'
      });
    }

    if (['TECHNICAL_REVIEW', 'APPROVED', 'CERTIFIED'].includes(project.status)) {
      list.push({
        id: 'step-5',
        timestamp: new Date(Date.now() - 86400000 * 2),
        action: 'Thẩm tra & Xác nhận Đóng tất cả Điểm không phù hợp (NCR/CAPA)',
        username: project.leadAuditor || 'Trưởng đoàn Đánh giá',
        status: 'ĐÃ ĐÓNG LỖI',
        statusClass: 'approved'
      });
    } else if (project.status === 'CAPA_PENDING') {
      list.push({
        id: 'step-5-active',
        timestamp: now,
        action: 'Doanh nghiệp khắc phục điểm NCR & Chuyên gia thẩm tra đóng lỗi',
        username: project.leadAuditor || 'Doanh nghiệp & Trưởng đoàn',
        status: 'CHỜ ĐÓNG LỖI',
        statusClass: 'pending'
      });
    }

    if (['APPROVED', 'CERTIFIED'].includes(project.status)) {
      list.push({
        id: 'step-6',
        timestamp: new Date(Date.now() - 86400000 * 1),
        action: 'Thẩm xét Kỹ thuật Độc lập (ISO/IEC 17021 - 17065)',
        username: project.technicalReviewer || 'Thẩm xét viên Độc lập',
        status: 'ĐẠT YÊU CẦU',
        statusClass: 'approved'
      });
    } else if (project.status === 'TECHNICAL_REVIEW') {
      list.push({
        id: 'step-6-active',
        timestamp: now,
        action: 'Hồ sơ đang được Thẩm xét viên kỹ thuật độc lập xem xét',
        username: project.technicalReviewer || 'Thẩm xét viên Độc lập',
        status: 'ĐANG THẨM XÉT',
        statusClass: 'pending'
      });
    }

    if (project.status === 'CERTIFIED') {
      list.push({
        id: 'step-7',
        timestamp: now,
        action: 'Ký Quyết định & Phát hành Giấy chứng nhận điện tử (QR Verify)',
        username: 'Giám đốc Chứng nhận',
        status: 'ĐÃ CẤP GCN',
        statusClass: 'approved'
      });
    } else if (project.status === 'APPROVED') {
      list.push({
        id: 'step-7-active',
        timestamp: now,
        action: 'Chờ Giám đốc chứng nhận ký duyệt phát hành Giấy chứng nhận',
        username: 'Giám đốc Chứng nhận',
        status: 'CHỜ KÝ DUYỆT',
        statusClass: 'pending'
      });
    }

    return list.reverse();
  };

  // --- Camunda BPMN Viewer Open & Render ---
  const openBpmnViewer = async (project) => {
    setBpmnProject(project);
    setBpmnModalOpen(true);
    setBpmnLoading(true);
    setBpmnError(null);
    setBpmnXml(null);
    setBpmnTimeline(buildCertificationTimeline(project));

    let xml = DEFAULT_CERTIFICATION_BPMN_XML;
    let running = [];
    let completed = ['StartEvent_Cert'];

    try {
      const res = await fetch(`${API_BASE_URL}/api/certification/projects/${project.id}/bpmn-viewer`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const body = await res.json();
        if (body.data?.bpmn20Xml) {
          xml = body.data.bpmn20Xml;
        }
        running = body.data?.runningActivities || [];
        completed = body.data?.completedActivities || [];
        if (Array.isArray(body.data?.actionButtons)) {
          setBpmnActionButtons(body.data.actionButtons);
        } else if (Array.isArray(project.actionButtons)) {
          setBpmnActionButtons(project.actionButtons);
        }
      }
    } catch (apiErr) {
      console.warn('Fallback to local BPMN computation:', apiErr);
      if (Array.isArray(project.actionButtons)) {
        setBpmnActionButtons(project.actionButtons);
      }
    }

    if (running.length === 0) {
      const st = project.status || 'STAGE_1_DESK_REVIEW';
      if (st === 'STAGE_1_DESK_REVIEW') {
        running = ['Task_DeskReview'];
      } else if (st === 'STAGE_2_ON_SITE') {
        completed.push('Task_DeskReview');
        running = ['Task_OnSiteAudit'];
      } else if (st === 'TESTING') {
        completed.push('Task_DeskReview', 'Task_OnSiteAudit');
        running = ['Task_LabTesting'];
      } else if (st === 'CAPA_PENDING') {
        completed.push('Task_DeskReview', 'Task_OnSiteAudit', 'Task_LabTesting', 'Gateway_NCR');
        running = ['Task_CAPA'];
      } else if (st === 'TECHNICAL_REVIEW') {
        completed.push('Task_DeskReview', 'Task_OnSiteAudit', 'Task_LabTesting', 'Gateway_NCR', 'Task_CAPA');
        running = ['Task_TechnicalReview'];
      } else if (st === 'APPROVED') {
        completed.push('Task_DeskReview', 'Task_OnSiteAudit', 'Task_LabTesting', 'Gateway_NCR', 'Task_CAPA', 'Task_TechnicalReview', 'Gateway_ReviewDecision');
        running = ['Task_IssueCert'];
      } else if (st === 'CERTIFIED') {
        completed.push('Task_DeskReview', 'Task_OnSiteAudit', 'Task_LabTesting', 'Gateway_NCR', 'Task_CAPA', 'Task_TechnicalReview', 'Gateway_ReviewDecision', 'Task_IssueCert');
        running = ['EndEvent_Certified'];
      } else if (st === 'REJECTED') {
        completed.push('Task_DeskReview', 'Task_OnSiteAudit', 'Task_TechnicalReview', 'Gateway_ReviewDecision');
        running = ['EndEvent_Rejected'];
      }
    }

    setBpmnMeta({ running, completed, status: project.status });
    setBpmnXml(xml);
    setBpmnLoading(false);
  };

  // Render BPMN diagram when XML arrives and modal/container is mounted in DOM
  useEffect(() => {
    if (!bpmnModalOpen || !bpmnXml || !bpmnContainerRef.current) return;
    let mounted = true;

    const renderBpmn = async () => {
      try {
        const mod = await import('bpmn-js/lib/NavigatedViewer');
        const NavigatedViewer = mod.default;
        if (!mounted) return;

        if (viewerInstanceRef.current) {
          try { viewerInstanceRef.current.destroy(); } catch (e) {}
          viewerInstanceRef.current = null;
        }

        const viewer = new NavigatedViewer({ container: bpmnContainerRef.current });
        viewerInstanceRef.current = viewer;

        await viewer.importXML(bpmnXml);
        const canvas = viewer.get('canvas');
        setTimeout(() => {
          if (mounted && canvas && typeof canvas.zoom === 'function') {
            try {
              canvas.zoom('fit-viewport', 'auto');
            } catch (e) {
              canvas.zoom('fit-viewport');
            }
          }
        }, 150);

        const meta = bpmnMeta || {};
        (meta.completed || []).forEach((id) => {
          try { canvas.addMarker(id, 'highlight-done'); } catch (e) {}
        });
        (meta.running || []).forEach((id) => {
          try { canvas.addMarker(id, 'highlight-running'); } catch (e) {}
        });
        if (meta.status === 'CERTIFIED') {
          try { canvas.addMarker('EndEvent_Certified', 'highlight-end'); } catch (e) {}
        }
      } catch (err) {
        if (mounted) {
          setBpmnError('Lỗi hiển thị sơ đồ BPMN: ' + (err?.message || String(err)));
        }
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
  }, [bpmnXml, bpmnMeta, bpmnModalOpen]);

  const closeBpmnViewer = () => {
    setBpmnModalOpen(false);
    setBpmnProject(null);
    setBpmnXml(null);
    setBpmnActionButtons([]);
    if (viewerInstanceRef.current) {
      try { viewerInstanceRef.current.destroy(); } catch (e) {}
      viewerInstanceRef.current = null;
    }
  };

  const handleZoom = (delta) => {
    if (!viewerInstanceRef.current) return;
    try {
      const canvas = viewerInstanceRef.current.get('canvas');
      if (delta === 0) {
        canvas.zoom('fit-viewport', 'auto');
      } else {
        const current = canvas.zoom();
        canvas.zoom(Math.max(0.2, Math.min(3.0, current + delta)));
      }
    } catch (e) {}
  };

  // Filtered list
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchQuery = !searchQuery ||
        p.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.projectCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.taxCode?.includes(searchQuery);
      const matchStandard = filterStandard === 'ALL' || p.standard === filterStandard;
      const matchStatus = filterStatus === 'ALL' || p.status === filterStatus;
      return matchQuery && matchStandard && matchStatus;
    });
  }, [projects, searchQuery, filterStandard, filterStatus]);

  const columns = [
    {
      title: 'Mã Dự Án',
      dataIndex: 'projectCode',
      key: 'projectCode',
      width: 140,
      render: (code) => <strong style={{ color: 'var(--primary)' }}>{code}</strong>
    },
    {
      title: 'Doanh nghiệp / Đơn vị',
      dataIndex: 'companyName',
      key: 'companyName',
      render: (name, record) => (
        <div>
          <div style={{ fontWeight: 600 }}>{name}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            MST: {record.taxCode || 'Chưa cập nhật'} | ĐD: {record.contactPerson || 'N/A'}
          </div>
        </div>
      )
    },
    {
      title: 'Tiêu chuẩn & Loại hình',
      key: 'standard',
      render: (_, record) => {
        const isQcvn = record.standard?.includes('QCVN');
        return (
          <Space direction="vertical" size={2}>
            <Tag color={isQcvn ? 'geekblue' : 'purple'} style={{ fontWeight: 600 }}>
              {record.standard}
            </Tag>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {AUDIT_TYPE_OPTIONS.find((t) => t.value === record.auditType)?.label || record.auditType}
            </span>
          </Space>
        );
      }
    },
    {
      title: 'Đoàn đánh giá',
      key: 'team',
      render: (_, record) => (
        <div style={{ fontSize: '0.82rem' }}>
          <div><UserOutlined style={{ marginRight: 4 }} /> Trưởng đoàn: <strong>{record.leadAuditor || 'Chưa phân công'}</strong></div>
          <div style={{ color: 'var(--text-secondary)' }}><AuditOutlined style={{ marginRight: 4 }} /> Thẩm xét: {record.technicalReviewer || 'Chờ phân công'}</div>
        </div>
      )
    },
    {
      title: 'Trạng thái quy trình',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const cfg = STATUS_MAP[status] || { label: status, color: 'default' };
        return <Tag color={cfg.color} style={{ padding: '4px 8px', fontSize: '0.82rem' }}>{cfg.label}</Tag>;
      }
    },
    {
      title: 'Duyệt / Xử lý bước',
      key: 'workflow_action',
      width: 230,
      render: (_, record) => {
        const buttons = Array.isArray(record.actionButtons) && record.actionButtons.length > 0
          ? record.actionButtons
          : getProjectActions(record).visibleButtons;
        if (buttons.length > 0) {
          const mainBtn = buttons[0];
          return (
            <Space size={6} wrap>
              <Button
                type="primary"
                size="small"
                style={{
                  background: mainBtn.color === 'success' ? '#16a34a' : mainBtn.color === 'danger' ? '#dc2626' : mainBtn.color === 'warning' ? '#d97706' : undefined,
                  borderColor: mainBtn.color === 'success' ? '#22c55e' : mainBtn.color === 'danger' ? '#ef4444' : mainBtn.color === 'warning' ? '#f59e0b' : undefined,
                  fontWeight: 600
                }}
                onClick={() => handleExecuteProjectAction(mainBtn, record)}
              >
                {mainBtn.label.split('➔')[0].trim()}
              </Button>
              {buttons.length > 1 && (
                <Button
                  size="small"
                  onClick={() => openBpmnViewer(record)}
                  title="Mở sơ đồ Camunda để chọn các hướng xử lý khác"
                >
                  +{buttons.length - 1}
                </Button>
              )}
            </Space>
          );
        }
        return (
          <span style={{ color: 'var(--muted)', fontSize: '0.82rem', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>🔒</span> Chờ phân quyền duyệt
          </span>
        );
      }
    },
    {
      title: 'Hành động',
      key: 'actions',
      width: 170,
      render: (_, record) => (
        <Space size="small">
          <Button
            icon={<DeploymentUnitOutlined />}
            size="small"
            style={{ color: 'var(--primary)', borderColor: 'var(--primary)', fontWeight: 600 }}
            onClick={() => openBpmnViewer(record)}
          >
            Camunda
          </Button>
          <Button
            icon={<EyeOutlined />}
            size="small"
            onClick={() => loadProjectDetails(record)}
          >
            Chi tiết
          </Button>
        </Space>
      )
    }
  ];

  const currentStep = selectedProject ? (STATUS_MAP[selectedProject.status]?.step ?? 0) : 0;

  return (
    <div className="certification-container" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(204, 90, 1, 0.15) 0%, rgba(229, 150, 94, 0.05) 100%)',
        border: '1px solid rgba(204, 90, 1, 0.3)',
        borderRadius: '16px',
        padding: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <SafetyCertificateOutlined style={{ fontSize: '32px', color: 'var(--primary)' }} />
            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700 }}>
              Quản Lý Đánh Giá & Chứng Nhận (ISO / Hợp Quy)
            </h1>
          </div>
          <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Tuân thủ chuẩn mực ISO/IEC 17021 &amp; ISO/IEC 17065 cho các tổ chức chứng nhận (VietCert, AQCert).
          </p>
        </div>
        <Space wrap>
          <Button
            icon={<QrcodeOutlined />}
            size="large"
            onClick={() => {
              setVerifyModalOpen(true);
              setVerifyResult(null);
              setVerifyInput('');
            }}
          >
            Cổng Tra Cứu GCN
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            onClick={() => setCreateProjectModalOpen(true)}
          >
            Tạo Dự Án Đánh Giá Mới
          </Button>
        </Space>
      </div>

      {/* Metric Statistics Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} style={{ borderRadius: '12px', background: 'var(--card-bg)' }}>
            <Statistic
              title="Tổng Dự Án Đánh Giá"
              value={stats.totalProjects}
              prefix={<SolutionOutlined style={{ color: 'var(--primary)' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} style={{ borderRadius: '12px', background: 'var(--card-bg)' }}>
            <Statistic
              title="GCN Đang Hiệu Lực"
              value={stats.validCertificates}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} style={{ borderRadius: '12px', background: 'var(--card-bg)' }}>
            <Statistic
              title="Điểm NCR Chưa Đóng"
              value={stats.openNcrs}
              valueStyle={{ color: stats.openNcrs > 0 ? '#faad14' : 'inherit' }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} style={{ borderRadius: '12px', background: 'var(--card-bg)' }}>
            <Statistic
              title="Mẫu Chờ Kết Quả PTN"
              value={stats.pendingTests}
              valueStyle={{ color: '#1890ff' }}
              prefix={<ExperimentOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters & Table */}
      <Card
        title="Danh Sách Dự Án Đánh Giá Chứng Nhận"
        extra={
          <Button icon={<ReloadOutlined />} onClick={() => { fetchProjects(); fetchStats(); }}>
            Làm mới
          </Button>
        }
        bordered={false}
        style={{ borderRadius: '14px', background: 'var(--card-bg)' }}
      >
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} md={10}>
            <Input
              prefix={<SearchOutlined />}
              placeholder="Tìm theo Tên công ty, MST hoặc Mã dự án..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={7}>
            <Select
              style={{ width: '100%' }}
              value={filterStandard}
              onChange={setFilterStandard}
              options={[{ label: 'Tất cả tiêu chuẩn', value: 'ALL' }, ...STANDARD_OPTIONS]}
            />
          </Col>
          <Col xs={24} sm={12} md={7}>
            <Select
              style={{ width: '100%' }}
              value={filterStatus}
              onChange={setFilterStatus}
              options={[
                { label: 'Tất cả trạng thái', value: 'ALL' },
                ...Object.entries(STATUS_MAP).map(([k, v]) => ({ label: v.label, value: k }))
              ]}
            />
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={filteredProjects}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 8 }}
        />
      </Card>

      {/* PROJECT DETAILS MODAL */}
      <Modal
        title={
          selectedProject && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingRight: 24 }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                {selectedProject.companyName}
              </span>
              <Tag color={STATUS_MAP[selectedProject.status]?.color}>
                {STATUS_MAP[selectedProject.status]?.label}
              </Tag>
              <Tag color="cyan">{selectedProject.projectCode}</Tag>
            </div>
          )
        }
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        width={1000}
        footer={null}
        destroyOnClose
      >
        {selectedProject && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Steps Progress */}
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '16px 20px', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Tiến trình thực hiện:</span>
                <Button
                  type="dashed"
                  icon={<DeploymentUnitOutlined />}
                  onClick={() => openBpmnViewer(selectedProject)}
                  style={{ color: 'var(--primary)', borderColor: 'var(--primary)' }}
                >
                  Xem Sơ Đồ Camunda Trực Quan
                </Button>
              </div>
              <Steps
                current={currentStep}
                size="small"
                items={[
                  { title: 'GĐ 1: Soát xét' },
                  { title: 'GĐ 2: Hiện trường' },
                  { title: 'PTN Thử nghiệm' },
                  { title: 'Khắc phục NCR' },
                  { title: 'Thẩm xét Độc lập' },
                  { title: 'Cấp GCN' }
                ]}
              />
            </div>

            {/* Workflow Action Bar */}
            <Card size="small" title="Điều khiển Tiến độ Quy trình (Workflow Actions)" style={{ background: 'var(--card-bg)' }}>
              {(() => {
                const actionData = getProjectActions(selectedProject);
                if (actionData.canAct && actionData.visibleButtons.length > 0) {
                  return (
                    <Space wrap size="middle">
                      {actionData.visibleButtons.map((btn, idx) => (
                        <Button
                          key={`detail-act-${btn.action}-${idx}`}
                          type="primary"
                          style={{
                            background: btn.color === 'success' ? '#16a34a' : btn.color === 'danger' ? '#dc2626' : btn.color === 'warning' ? '#d97706' : undefined,
                            borderColor: btn.color === 'success' ? '#22c55e' : btn.color === 'danger' ? '#ef4444' : btn.color === 'warning' ? '#f59e0b' : undefined,
                            fontWeight: 600
                          }}
                          onClick={() => handleExecuteProjectAction(btn, selectedProject)}
                        >
                          {btn.label}
                        </Button>
                      ))}
                    </Space>
                  );
                }
                return (
                  <Alert
                    type="info"
                    showIcon
                    message="Quyền hạn phê duyệt bước hiện tại"
                    description={
                      <div>
                        Bước <strong>{STATUS_MAP[selectedProject.status]?.label}</strong> yêu cầu thẩm quyền: <strong>{actionData.requiredRole}</strong>.
                        Tài khoản hiện tại của bạn có vị trí: <Tag color="blue">{userPosition || 'STAFF'}</Tag>. Các nút duyệt chỉ xuất hiện với nhân sự được phân công theo quy chuẩn ISO 17021/17065.
                      </div>
                    }
                  />
                );
              })()}
            </Card>

            {/* Detail Tabs */}
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={[
                {
                  key: '1',
                  label: (
                    <span><SolutionOutlined /> Hồ sơ &amp; Năng lực</span>
                  ),
                  children: (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <Row gutter={[16, 16]}>
                        <Col span={12}>
                          <div><strong>Mã số thuế:</strong> {selectedProject.taxCode || 'N/A'}</div>
                          <div><strong>Địa chỉ:</strong> {selectedProject.address || 'N/A'}</div>
                          <div><strong>Người liên hệ:</strong> {selectedProject.contactPerson} ({selectedProject.contactPhone})</div>
                          <div><strong>Email:</strong> {selectedProject.contactEmail}</div>
                        </Col>
                        <Col span={12}>
                          <div><strong>Tiêu chuẩn:</strong> <Tag color="blue">{selectedProject.standard}</Tag></div>
                          <div><strong>Trưởng đoàn đánh giá:</strong> {selectedProject.leadAuditor}</div>
                          <div><strong>Thành viên đoàn:</strong> {selectedProject.auditorMembers || 'Chưa có'}</div>
                          <div><strong>Thẩm xét viên kỹ thuật:</strong> {selectedProject.technicalReviewer || 'Chưa phân công'}</div>
                        </Col>
                      </Row>
                      <Divider style={{ margin: '12px 0' }} />
                      <div>
                        <strong>Phạm vi chứng nhận (Certification Scope):</strong>
                        <p style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 8, marginTop: 4 }}>
                          {selectedProject.certificationScope || 'Chưa ghi nhận'}
                        </p>
                      </div>
                      <div>
                        <strong>Kết luận đánh giá hiện trường GĐ 2:</strong>
                        <p style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 8, marginTop: 4 }}>
                          {selectedProject.onSiteAuditSummary || 'Chưa có ghi nhận'}
                        </p>
                      </div>
                      <div>
                        <strong>Nhận xét của Thẩm xét viên độc lập:</strong>
                        <p style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 8, marginTop: 4 }}>
                          {selectedProject.technicalReviewNotes || 'Chưa thẩm xét'}
                        </p>
                      </div>
                    </div>
                  )
                },
                {
                  key: '2',
                  label: (
                    <span>
                      <WarningOutlined /> Điểm Không Phù Hợp (NCR) &amp; CAPA
                      <Badge count={projectNcrs.filter((n) => n.status !== 'CLOSED').length} offset={[8, -2]} />
                    </span>
                  ),
                  children: (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Alert
                          message="Nguyên tắc ISO 17021 / 17065: Tất cả các điểm không phù hợp nặng (Major NCR) bắt buộc phải được thẩm tra và Đóng lỗi trước khi ký quyết định cấp chứng nhận."
                          type="info"
                          showIcon
                          style={{ flex: 1, marginRight: 16 }}
                        />
                        <Button
                          type="primary"
                          icon={<PlusOutlined />}
                          onClick={() => setCreateNcrModalOpen(true)}
                        >
                          Lập biên bản NCR
                        </Button>
                      </div>

                      <Table
                        dataSource={projectNcrs}
                        rowKey="id"
                        pagination={false}
                        columns={[
                          {
                            title: 'Mã NCR',
                            dataIndex: 'ncrCode',
                            key: 'ncrCode',
                            render: (code) => <strong>{code}</strong>
                          },
                          {
                            title: 'Mức độ',
                            dataIndex: 'severity',
                            key: 'severity',
                            render: (s) => {
                              const colors = { MAJOR: 'error', MINOR: 'warning', OFI: 'blue' };
                              return <Tag color={colors[s] || 'default'}>{s}</Tag>;
                            }
                          },
                          {
                            title: 'Điều khoản vi phạm & Mô tả',
                            key: 'desc',
                            render: (_, record) => (
                              <div>
                                <div style={{ fontWeight: 600, color: 'var(--primary)' }}>{record.standardClause}</div>
                                <div style={{ fontSize: '0.85rem' }}>{record.description}</div>
                              </div>
                            )
                          },
                          {
                            title: 'Trạng thái CAPA',
                            dataIndex: 'status',
                            key: 'status',
                            render: (st) => {
                              const cfg = {
                                OPEN: { color: 'red', text: 'Chưa khắc phục' },
                                SUBMITTED: { color: 'orange', text: 'Chờ thẩm tra' },
                                CLOSED: { color: 'green', text: 'Đã đóng lỗi' },
                                REJECTED: { color: 'volcano', text: 'Từ chối CAPA' }
                              };
                              return <Tag color={cfg[st]?.color}>{cfg[st]?.text || st}</Tag>;
                            }
                          },
                          {
                            title: 'Hành động',
                            key: 'actions',
                            render: (_, record) => (
                              <Space>
                                {record.status !== 'CLOSED' && (
                                  <Button
                                    size="small"
                                    onClick={() => {
                                      setSelectedNcr(record);
                                      capaForm.setFieldsValue({
                                        rootCause: record.rootCause,
                                        correctiveAction: record.correctiveAction,
                                        correctiveEvidenceUrl: record.correctiveEvidenceUrl
                                      });
                                      setCapaModalOpen(true);
                                    }}
                                  >
                                    Nộp CAPA
                                  </Button>
                                )}
                                {record.status === 'SUBMITTED' && isLeadAuditor && (
                                  <Button
                                    size="small"
                                    type="primary"
                                    style={{ background: '#52c41a', borderColor: '#52c41a' }}
                                    onClick={() => handleReviewCapa(record.id, true)}
                                  >
                                    Đóng lỗi
                                  </Button>
                                )}
                              </Space>
                            )
                          }
                        ]}
                      />
                    </div>
                  )
                },
                {
                  key: '3',
                  label: (
                    <span><ExperimentOutlined /> Mẫu Thử Nghiệm PTN</span>
                  ),
                  children: (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          Lấy mẫu niêm phong và gửi thử nghiệm phòng Lab đạt chuẩn ISO/IEC 17025 (Bắt buộc với Hợp quy QCVN / Hợp chuẩn TCVN).
                        </span>
                        <Button
                          type="primary"
                          icon={<PlusOutlined />}
                          onClick={() => setCreateSampleModalOpen(true)}
                        >
                          Lập biên bản lấy mẫu
                        </Button>
                      </div>

                      <Table
                        dataSource={projectSamples}
                        rowKey="id"
                        pagination={false}
                        columns={[
                          { title: 'Mã niêm phong', dataIndex: 'sampleCode', key: 'sampleCode', render: (c) => <strong>{c}</strong> },
                          { title: 'Tên mẫu sản phẩm', dataIndex: 'sampleName', key: 'sampleName' },
                          { title: 'Vị trí lấy mẫu', dataIndex: 'samplingLocation', key: 'samplingLocation' },
                          { title: 'Phòng thử nghiệm Lab', dataIndex: 'testingLab', key: 'testingLab' },
                          { title: 'Số phiếu KQ', dataIndex: 'testReportNumber', key: 'testReportNumber' },
                          {
                            title: 'Kết quả',
                            dataIndex: 'testResult',
                            key: 'testResult',
                            render: (res) => {
                              const colors = { PASS: 'green', FAIL: 'red', PENDING: 'blue' };
                              const labels = { PASS: 'ĐẠT TIÊU CHUẨN', FAIL: 'KHÔNG ĐẠT', PENDING: 'ĐANG THỬ NGHIỆM' };
                              return <Tag color={colors[res]}>{labels[res] || res}</Tag>;
                            }
                          }
                        ]}
                      />
                    </div>
                  )
                },
                {
                  key: '4',
                  label: (
                    <span><SafetyCertificateOutlined /> Giấy Chứng Nhận (GCN)</span>
                  ),
                  children: projectCertificate ? (
                    <div style={{
                      border: '3px double #d97706',
                      borderRadius: 16,
                      padding: 32,
                      background: 'linear-gradient(to bottom, rgba(217, 119, 6, 0.05), rgba(0,0,0,0.2))',
                      position: 'relative'
                    }}>
                      <div style={{ textAlign: 'center', marginBottom: 24 }}>
                        <h2 style={{ color: '#d97706', textTransform: 'uppercase', letterSpacing: 2, margin: 0 }}>
                          GIẤY CHỨNG NHẬN
                        </h2>
                        <h4 style={{ margin: '4px 0 0', color: 'var(--text-secondary)' }}>
                          CERTIFICATE OF CONFORMITY
                        </h4>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: 8 }}>
                          Số GCN: <span style={{ color: 'var(--primary)' }}>{projectCertificate.certificateNumber}</span>
                        </div>
                      </div>

                      <Row gutter={[24, 24]}>
                        <Col span={16}>
                          <p>Chứng nhận hệ thống / sản phẩm của đơn vị:</p>
                          <h3 style={{ margin: '4px 0 12px', color: 'var(--primary)' }}>{projectCertificate.companyName}</h3>
                          <p><strong>Mã số thuế:</strong> {projectCertificate.taxCode}</p>
                          <p><strong>Địa chỉ:</strong> {projectCertificate.address}</p>
                          <p><strong>Phù hợp với tiêu chuẩn:</strong> <Tag color="orange" style={{ fontSize: '1rem', padding: '4px 8px' }}>{projectCertificate.standard}</Tag></p>
                          <p><strong>Phạm vi chứng nhận:</strong> {projectCertificate.scope}</p>
                        </Col>
                        <Col span={8} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{
                            padding: 12,
                            background: '#ffffff',
                            borderRadius: 12,
                            display: 'inline-block'
                          }}>
                            <QrcodeOutlined style={{ fontSize: 100, color: '#111' }} />
                          </div>
                          <div style={{ fontSize: '0.8rem', marginTop: 8, color: 'var(--text-secondary)' }}>
                            Mã xác thực: <strong>{projectCertificate.qrVerificationCode}</strong>
                          </div>
                          <div style={{ marginTop: 12 }}>
                            <Tag color="success" style={{ padding: '4px 12px', fontSize: '0.9rem' }}>
                              HIỆU LỰC HỢP PHÁP
                            </Tag>
                          </div>
                        </Col>
                      </Row>

                      <Divider style={{ margin: '20px 0' }} />

                      <Row gutter={[16, 16]} style={{ fontSize: '0.85rem' }}>
                        <Col span={6}>
                          <div><strong>Ngày cấp:</strong></div>
                          <div>{projectCertificate.issueDate ? dayjs(projectCertificate.issueDate).format('DD/MM/YYYY') : 'N/A'}</div>
                        </Col>
                        <Col span={6}>
                          <div><strong>Hạn hiệu lực (3 năm):</strong></div>
                          <div style={{ color: '#52c41a', fontWeight: 600 }}>
                            {projectCertificate.expiryDate ? dayjs(projectCertificate.expiryDate).format('DD/MM/YYYY') : 'N/A'}
                          </div>
                        </Col>
                        <Col span={6}>
                          <div><strong>Giám sát lần 1 (12 tháng):</strong></div>
                          <div style={{ color: '#faad14' }}>
                            {projectCertificate.surveillance1Date ? dayjs(projectCertificate.surveillance1Date).format('DD/MM/YYYY') : 'N/A'}
                          </div>
                        </Col>
                        <Col span={6}>
                          <div><strong>Giám sát lần 2 (24 tháng):</strong></div>
                          <div style={{ color: '#faad14' }}>
                            {projectCertificate.surveillance2Date ? dayjs(projectCertificate.surveillance2Date).format('DD/MM/YYYY') : 'N/A'}
                          </div>
                        </Col>
                      </Row>
                    </div>
                  ) : (
                    <Alert
                      message="Chưa phát hành Giấy chứng nhận"
                      description="Hồ sơ cần hoàn tất bước Đánh giá hiện trường, Thử nghiệm mẫu, Đóng hết lỗi Major NCR và được Giám đốc chứng nhận ký duyệt trước khi phát hành GCN."
                      type="warning"
                      showIcon
                    />
                  )
                }
              ]}
            />
          </div>
        )}
      </Modal>

      {/* CREATE PROJECT MODAL */}
      <Modal
        title="Khởi Tạo Dự Án Đánh Giá Chứng Nhận Mới"
        open={createProjectModalOpen}
        onCancel={() => setCreateProjectModalOpen(false)}
        footer={null}
        width={700}
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreateProject}>
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item name="companyName" label="Tên Doanh nghiệp / Đơn vị đăng ký" rules={[{ required: true }]}>
                <Input placeholder="Ví dụ: Công ty Cổ phần Thép Hòa Phát" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="taxCode" label="Mã số thuế" rules={[{ required: true }]}>
                <Input placeholder="0101234567" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="address" label="Địa chỉ nhà máy / Cơ sở sản xuất">
            <Input placeholder="Khu công nghiệp Phố Nối A, Hưng Yên..." />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="contactPerson" label="Người đại diện liên hệ">
                <Input placeholder="Nguyễn Văn A" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="contactPhone" label="Số điện thoại">
                <Input placeholder="0901234567" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="contactEmail" label="Email">
                <Input placeholder="contact@doanhnghiep.vn" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="standard" label="Tiêu chuẩn chứng nhận" rules={[{ required: true }]}>
                <Select options={STANDARD_OPTIONS} placeholder="Chọn tiêu chuẩn..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="auditType" label="Loại hình đánh giá" initialValue="INITIAL" rules={[{ required: true }]}>
                <Select options={AUDIT_TYPE_OPTIONS} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="certificationScope" label="Phạm vi chứng nhận (Scope)">
            <Input.TextArea rows={2} placeholder="Sản xuất, gia công và cung ứng sản phẩm..." />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="leadAuditor" label="Trưởng đoàn đánh giá (Lead Auditor)">
                <Input placeholder="Tên hoặc username chuyên gia trưởng đoàn" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="technicalReviewer" label="Thẩm xét viên kỹ thuật (Độc lập)">
                <Input placeholder="Tên chuyên gia thẩm xét độc lập" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="dates" label="Thời gian kế hoạch đánh giá">
            <DatePicker.RangePicker style={{ width: '100%' }} />
          </Form.Item>

          <div style={{ textAlign: 'right', marginTop: 16 }}>
            <Space>
              <Button onClick={() => setCreateProjectModalOpen(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit">Tạo Dự Án</Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* CREATE NCR MODAL */}
      <Modal
        title="Lập Biên Bản Sự Không Phù Hợp (NCR)"
        open={createNcrModalOpen}
        onCancel={() => setCreateNcrModalOpen(false)}
        footer={null}
      >
        <Form form={ncrForm} layout="vertical" onFinish={handleCreateNcr}>
          <Form.Item name="severity" label="Mức độ nghiêm trọng" initialValue="MINOR" rules={[{ required: true }]}>
            <Select options={[
              { label: 'MAJOR (Không phù hợp nặng - Phải đóng trước khi cấp GCN)', value: 'MAJOR' },
              { label: 'MINOR (Không phù hợp nhẹ)', value: 'MINOR' },
              { label: 'OFI (Cơ hội cải tiến)', value: 'OFI' }
            ]} />
          </Form.Item>

          <Form.Item name="standardClause" label="Điều khoản tiêu chuẩn vi phạm" rules={[{ required: true }]}>
            <Input placeholder="Ví dụ: Điều 8.5.1 ISO 9001:2015 hoặc Mục 2.3 QCVN 16:2023" />
          </Form.Item>

          <Form.Item name="description" label="Mô tả sự không phù hợp" rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder="Mô tả chi tiết sự việc, bằng chứng phát hiện tại hiện trường..." />
          </Form.Item>

          <Form.Item name="evidence" label="Bằng chứng khách quan ghi nhận">
            <Input.TextArea rows={2} placeholder="Biên bản, ảnh chụp, phiếu kiểm tra..." />
          </Form.Item>

          <Form.Item name="deadline" label="Hạn hoàn thành khắc phục (Deadline)">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setCreateNcrModalOpen(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit">Lập Biên Bản</Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* SUBMIT CAPA MODAL */}
      <Modal
        title={`Nộp Hành Động Khắc Phục CAPA - ${selectedNcr?.ncrCode}`}
        open={capaModalOpen}
        onCancel={() => setCapaModalOpen(false)}
        footer={null}
      >
        <Form form={capaForm} layout="vertical" onFinish={handleSubmitCapa}>
          <Form.Item name="rootCause" label="Phân tích nguyên nhân gốc rễ (Root Cause)" rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder="Áp dụng phương pháp 5 Whys, biểu đồ xương cá..." />
          </Form.Item>

          <Form.Item name="correctiveAction" label="Biện pháp khắc phục &amp; phòng ngừa (CAPA)" rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder="Hành động cụ thể đã thực hiện để khắc phục và ngăn tái diễn..." />
          </Form.Item>

          <Form.Item name="correctiveEvidenceUrl" label="Link tài liệu / Bằng chứng minh chứng đã khắc phục">
            <Input placeholder="https://..." />
          </Form.Item>

          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setCapaModalOpen(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit">Nộp Báo Cáo Khắc Phục</Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* CREATE SAMPLE MODAL */}
      <Modal
        title="Lập Biên Bản Lấy Mẫu Hiện Trường (PTN)"
        open={createSampleModalOpen}
        onCancel={() => setCreateSampleModalOpen(false)}
        footer={null}
      >
        <Form form={sampleForm} layout="vertical" onFinish={handleCreateSample}>
          <Form.Item name="sampleName" label="Tên mẫu sản phẩm lấy thử nghiệm" rules={[{ required: true }]}>
            <Input placeholder="Ví dụ: Gạch gốm ốp lát tráng men kích thước 600x600" />
          </Form.Item>

          <Form.Item name="samplingLocation" label="Vị trí lấy mẫu tại cơ sở">
            <Input placeholder="Kho thành phẩm lô số 04, dây chuyền đóng gói..." />
          </Form.Item>

          <Form.Item name="testingLab" label="Phòng thử nghiệm chỉ định (VILAS / ISO 17025)">
            <Input placeholder="Trung tâm Thử nghiệm Vật liệu Xây dựng VILAS 145" />
          </Form.Item>

          <Form.Item name="samplingDate" label="Ngày lấy mẫu">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setCreateSampleModalOpen(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit">Xác Nhận Lấy Mẫu</Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* PUBLIC CERTIFICATE VERIFICATION PORTAL */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <QrcodeOutlined style={{ fontSize: 24, color: 'var(--primary)' }} />
            <span>Cổng Tra Cứu Xác Thực Giấy Chứng Nhận Công Khai</span>
          </div>
        }
        open={verifyModalOpen}
        onCancel={() => setVerifyModalOpen(false)}
        width={750}
        footer={null}
      >
        <div style={{ padding: '12px 0' }}>
          <p style={{ color: 'var(--text-secondary)' }}>
            Mô phỏng cổng tra cứu trực tuyến của tổ chức chứng nhận (VietCert / AQCert) phục vụ hải quan, cơ quan quản lý thị trường hoặc đối tác quét mã QR kiểm tra tính hợp pháp của Giấy chứng nhận.
          </p>

          <Space.Compact style={{ width: '100%', marginBottom: 20 }}>
            <Input
              size="large"
              placeholder="Nhập Số GCN (VD: VIC.HQ.2026.0001) hoặc Mã QR..."
              value={verifyInput}
              onChange={(e) => setVerifyInput(e.target.value)}
              onPressEnter={handleVerifyPublic}
            />
            <Button size="large" type="primary" loading={verifyLoading} onClick={handleVerifyPublic}>
              Tra Cứu
            </Button>
          </Space.Compact>

          {verifyResult && (
            <Card
              bordered
              style={{
                borderRadius: 12,
                borderColor: '#52c41a',
                background: 'rgba(82, 196, 26, 0.05)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Tag color="success" style={{ fontSize: '0.9rem', padding: '4px 10px' }}>
                  ✓ GIẤY CHỨNG NHẬN HỢP LỆ VÀ CÒN HIỆU LỰC
                </Tag>
                <strong style={{ color: 'var(--primary)' }}>{verifyResult.certificateNumber}</strong>
              </div>

              <Row gutter={[16, 12]}>
                <Col span={24}>
                  <div><strong>Đơn vị sở hữu:</strong> <span style={{ fontSize: '1.05rem', fontWeight: 600 }}>{verifyResult.companyName}</span></div>
                  <div><strong>Mã số thuế:</strong> {verifyResult.taxCode}</div>
                  <div><strong>Địa chỉ:</strong> {verifyResult.address}</div>
                </Col>
                <Col span={24}>
                  <div><strong>Tiêu chuẩn chứng nhận:</strong> <Tag color="blue">{verifyResult.standard}</Tag></div>
                  <div><strong>Phạm vi chứng nhận:</strong> {verifyResult.scope}</div>
                </Col>
                <Col span={12}>
                  <div><strong>Ngày cấp:</strong> {dayjs(verifyResult.issueDate).format('DD/MM/YYYY')}</div>
                </Col>
                <Col span={12}>
                  <div><strong>Hạn hiệu lực:</strong> <strong style={{ color: '#52c41a' }}>{dayjs(verifyResult.expiryDate).format('DD/MM/YYYY')}</strong></div>
                </Col>
              </Row>
            </Card>
          )}
        </div>
      </Modal>

      {/* CAMUNDA BPMN WORKFLOW VIEWER MODAL - EXACT SAME STYLE AS TASKBOARD */}
      {bpmnModalOpen && createPortal(
        <div className="camunda-modal-overlay" role="dialog" aria-modal="true">
          <div className="camunda-modal">
            <div className="camunda-header">
              <div>
                <h3>Tiến trình xử lý quy trình đánh giá &amp; chứng nhận</h3>
                <small>Sơ đồ quy trình nghiệp vụ BPMN chuẩn ISO 17021 / 17065 và trạng thái thực thi hiện tại</small>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button type="button" className="close-btn" onClick={() => handleZoom(0.2)} title="Phóng to" style={{ fontSize: '18px', fontWeight: 'bold' }}>+</button>
                  <button type="button" className="close-btn" onClick={() => handleZoom(-0.2)} title="Thu nhỏ" style={{ fontSize: '18px', fontWeight: 'bold' }}>−</button>
                  <button type="button" className="close-btn" onClick={() => handleZoom(0)} title="Vừa màn hình" style={{ fontSize: '14px' }}>⛶</button>
                </div>
                <button type="button" className="close-btn" onClick={closeBpmnViewer} aria-label="Đóng">✕</button>
              </div>
            </div>

            <div className="process-banner">
              <div>
                <div className="process-label">Mã dự án đánh giá (Project Code) &amp; Tiêu chuẩn</div>
                <h4>{bpmnProject?.projectCode} - {bpmnProject?.companyName} ({bpmnProject?.standard})</h4>
              </div>
              <div className="process-status">
                Trạng thái: <strong style={{ color: 'var(--primary)' }}>{STATUS_MAP[bpmnProject?.status]?.label || bpmnProject?.status}</strong>
              </div>
            </div>

            <div className="camunda-content split-view">
              <div className="bpmn-wrap">
                {bpmnLoading ? (
                  <div className="history-empty">Đang tải tiến trình quy trình Camunda...</div>
                ) : bpmnError ? (
                  <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ color: '#ffb6b6', padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)', borderBottom: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '0.9rem' }}>
                      Lỗi hiển thị: {bpmnError}
                    </div>
                  </div>
                ) : (
                  <div className="bpmn-container" ref={bpmnContainerRef} />
                )}
              </div>

              <div className="timeline-panel">
                <h5>Lịch sử xử lý &amp; phê duyệt</h5>
                <div className="timeline-scroll">
                  {bpmnTimeline.length === 0 ? (
                    <div className="timeline-empty-status">Chưa có lịch sử xử lý.</div>
                  ) : (
                    <div className="timeline-flow">
                      {bpmnTimeline.map((item, index) => (
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
                                Trạng thái: <span className={`status-tag ${item.statusClass || item.status.toLowerCase()}`}>{item.status}</span>
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

            <div className="viewer-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {(() => {
                  const buttons = bpmnActionButtons.length > 0
                    ? bpmnActionButtons
                    : (Array.isArray(bpmnProject?.actionButtons) && bpmnProject.actionButtons.length > 0
                        ? bpmnProject.actionButtons
                        : getProjectActions(bpmnProject).visibleButtons);
                  if (buttons.length > 0) {
                    return buttons.map((btn, idx) => (
                      <button
                        key={`modal-act-${btn.action}-${idx}`}
                        type="button"
                        className={`action-button ${btn.color || 'primary'}`}
                        onClick={() => handleExecuteProjectAction(btn, bpmnProject)}
                      >
                        {btn.label}
                      </button>
                    ));
                  }
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94a3b8', fontSize: '0.88rem' }}>
                      <span style={{ fontSize: '1.1rem' }}>🔒</span>
                      <span>
                        Vị trí của bạn: <Tag color="orange" style={{ marginLeft: 4 }}>{userPosition || 'STAFF'}</Tag>
                        chưa được phân quyền duyệt ở bước này.
                      </span>
                    </div>
                  );
                })()}
              </div>

              <div>
                <button
                  type="button"
                  className="action-button secondary"
                  onClick={closeBpmnViewer}
                >
                  Đóng sơ đồ
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
