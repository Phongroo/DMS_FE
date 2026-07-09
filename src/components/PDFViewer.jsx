import { useEffect, useRef, useState, useMemo } from 'react';
import { Select, message } from 'antd';
import '../styles/pdf-viewer.css';

const PRESET_DOCUMENTS = [
  {
    id: 'contract',
    title: 'Hợp đồng nguyên tắc mua bán hàng hóa.pdf',
    size: '1.2 MB',
    pages: 3,
    author: 'Nguyễn Văn A (Phòng Pháp chế)',
    date: '18/06/2026',
    status: 'Chờ duyệt',
    security: 'Nội bộ',
    url: 'https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf',
    mockPages: [
      {
        title: 'HỢP ĐỒNG NGUYÊN TẮC MUA BÁN HÀNG HÓA',
        no: 'Số: 120/2026/HĐNT',
        sections: [
          {
            title: 'Đại diện bên mua (Bên A):',
            content: 'Công ty Cổ phần Công nghệ DMS Việt Nam\nĐịa chỉ: Tòa nhà Innovation, Công viên phần mềm Quang Trung, Q.12, TP.HCM\nĐại diện: Ông Nguyễn Hồng Phong - Chức vụ: Giám đốc'
          },
          {
            title: 'Đại diện bên bán (Bên B):',
            content: 'Tập đoàn Công nghệ Antigravity Solutions\nĐịa chỉ: 123 Sky Tower, Silicon Valley, CA, USA\nĐại diện: Bà Emma Watson - Chức vụ: Trưởng bộ phận Khách hàng Doanh nghiệp'
          },
          {
            title: 'Điều 1: Nội dung giao dịch',
            content: 'Bên A đồng ý mua và Bên B đồng ý bán các thiết bị phần cứng phục vụ cho việc vận hành hạ tầng số tại Việt Nam. Chi tiết số lượng và thông số kỹ thuật được đính kèm trong phụ lục hợp đồng.'
          },
          {
            title: 'Điều 2: Phương thức thanh toán',
            content: 'Thanh toán chuyển khoản qua ngân hàng. Bên A thanh toán trước 30% giá trị hợp đồng ngay sau khi ký kết. 70% còn lại thanh toán sau khi bàn giao và ký biên bản nghiệm thu.'
          }
        ]
      },
      {
        title: 'CÁC ĐIỀU KHOẢN CHUNG',
        no: 'Trang 2 / 3',
        sections: [
          {
            title: 'Điều 3: Thời hạn và phương thức giao nhận',
            content: 'Bên B cam kết giao hàng đầy đủ tại địa chỉ của Bên A trong vòng 45 ngày kể từ ngày nhận được tiền tạm ứng lần thứ nhất. Trường hợp giao hàng trễ, Bên B chịu mức phạt 0.05% mỗi ngày chậm trễ.'
          },
          {
            title: 'Điều 4: Trách nhiệm bảo mật thông tin',
            content: 'Hai bên cam kết bảo mật tuyệt đối các thông tin kinh doanh, thông số kỹ thuật và điều khoản thương mại trong hợp đồng này. Không tiết lộ cho bên thứ ba khi chưa có sự đồng ý bằng văn bản của bên còn lại.'
          },
          {
            title: 'Điều 5: Giải quyết tranh chấp',
            content: 'Mọi tranh chấp phát sinh sẽ được ưu tiên giải quyết qua thương lượng hòa giải. Nếu không giải quyết được bằng thương lượng, vụ việc sẽ được đưa ra Trung tâm Trọng tài Quốc tế Việt Nam (VIAC) cạnh Phòng Thương mại và Công nghiệp Việt Nam (VCCI).'
          }
        ]
      },
      {
        title: 'KÝ KẾT VÀ XÁC NHẬN CÁC BÊN',
        no: 'Trang 3 / 3',
        sections: [
          {
            title: 'Điều 6: Hiệu lực hợp đồng',
            content: 'Hợp đồng này có hiệu lực từ ngày ký đến hết ngày 31/12/2026. Hợp đồng được lập thành 04 bản có giá trị pháp lý như nhau, mỗi bên giữ 02 bản.'
          },
          {
            title: 'Xác nhận chữ ký:',
            content: 'Đại diện bên A và Đại diện bên B ký và đóng dấu xác nhận dưới đây.'
          }
        ]
      }
    ]
  },
  {
    id: 'audit',
    title: 'Báo cáo kiểm toán Quý 1 - 2026.pdf',
    size: '845 KB',
    pages: 2,
    author: 'Trần Thị B (Phòng Tài chính)',
    date: '17/06/2026',
    status: 'Chờ duyệt',
    security: 'Tối mật',
    url: 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf',
    mockPages: [
      {
        title: 'BÁO CÁO TỔNG HỢP KIỂM TOÁN TÀI CHÍNH QUÝ 1/2026',
        no: 'BCKT - Q1/2026',
        sections: [
          {
            title: '1. Khái quát tình hình hoạt động tài chính:',
            content: 'Trong Quý 1/2026, doanh thu của công ty đạt 45.2 tỷ VNĐ, tăng trưởng 12% so với cùng kỳ năm ngoái. Lợi nhuận sau thuế đạt 8.6 tỷ VNĐ. Tỷ suất biên lợi nhuận ròng giữ ổn định ở mức 19%.'
          },
          {
            title: '2. Nhận xét của đơn vị kiểm toán:',
            content: 'Báo cáo tài chính đã phản ánh trung thực và hợp lý tình hình tài chính hiện tại của Công ty tại ngày 31/03/2026. Các dòng tiền thu chi được ghi nhận chính xác theo chế độ kế toán doanh nghiệp Việt Nam.'
          }
        ]
      },
      {
        title: 'Ý KIẾN BAN KIỂM SOÁT VÀ PHÊ DUYỆT',
        no: 'Trang 2 / 2',
        sections: [
          {
            title: '3. Khuyến nghị quản trị rủi ro:',
            content: 'Công ty cần chú ý giảm tỷ trọng công nợ quá hạn từ các đại lý cấp 2. Dự phòng nợ phải thu khó đòi cần tăng thêm 3.5% để đảm bảo mức an toàn tài chính trước các biến động thị trường.'
          },
          {
            title: '4. Kết luận phê duyệt:',
            content: 'Ban Kiểm Soát đề xuất Hội đồng Quản trị phê duyệt thông qua báo cáo kiểm toán này làm cơ sở công bố thông tin đại chúng.'
          }
        ]
      }
    ]
  },
  {
    id: 'camunda',
    title: 'Tài liệu hướng dẫn Camunda Workflow.pdf',
    size: '2.1 MB',
    pages: 2,
    author: 'Lê Văn C (Phòng IT)',
    date: '15/06/2026',
    status: 'Đã duyệt',
    security: 'Nội bộ',
    url: 'https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf',
    mockPages: [
      {
        title: 'HƯỚNG DẪN CẤU HÌNH QUY TRÌNH CAMUNDA DỰ ÁN DMS',
        no: 'IT-DOC-005',
        sections: [
          {
            title: '1. Tổng quan kiến trúc BPMN:',
            content: 'Hệ thống duyệt hồ sơ (DMS Approval) sử dụng Camunda BPMN Engine để điều phối luồng phê duyệt từ Nhân viên -> Trưởng phòng -> Giám đốc. Quy trình bắt đầu khi người dùng nhấn "Khởi tạo Task" tại giao diện StartTask.'
          },
          {
            title: '2. Các User Task trong quy trình:',
            content: '- Task 1 (Staff): Tạo hồ sơ & đính kèm tài liệu PDF.\n- Task 2 (Manager Approval): Trưởng phòng duyệt hoặc yêu cầu bổ sung.\n- Task 3 (Director Approval): Giám đốc ký duyệt số và hoàn thành quy trình.'
          }
        ]
      },
      {
        title: 'CÁC ĐIỂM LƯU Ý KHI VẬN HÀNH',
        no: 'Trang 2 / 2',
        sections: [
          {
            title: '3. Xử lý timeout và Escalation:',
            content: 'Mỗi User Task trong Camunda được cấu hình thời gian hết hạn (DueDate) là 48 giờ. Quá thời gian này, hệ thống sẽ tự động gửi email cảnh báo (Escalation) cho nhân viên quản trị để tránh ùn ứ hồ sơ.'
          },
          {
            title: '4. Tích hợp API Gateway:',
            content: 'Dữ liệu duyệt được đồng bộ thông qua Socket.IO tới các client đang kết nối thời gian thực. API callback `/process` nhận thông tin phản hồi từ người duyệt và chuyển trạng thái trên Camunda Engine.'
          }
        ]
      }
    ]
  }
];

const API_BASE_URL = import.meta.env.VITE_AUTH_URL || 'http://localhost:30080';

function PDFViewer({ defaultPdfUrl, defaultDocTitle, defaultDocId, token }) {
  const initialDoc = useMemo(() => {
    if (defaultPdfUrl) {
      return {
        id: defaultDocId || 'external-view',
        title: defaultDocTitle || 'Tài liệu đính kèm.pdf',
        size: 'Dung lượng động',
        pages: 1,
        author: 'DMS Core API',
        date: new Date().toLocaleDateString('vi-VN'),
        status: 'Chờ duyệt',
        security: 'Nội bộ',
        url: defaultPdfUrl,
        docUuid: defaultDocId,
        mockPages: [
          {
            title: defaultDocTitle ? defaultDocTitle.toUpperCase() : 'TÀI LIỆU PHÊ DUYỆT',
            no: 'Trang 1 / 1',
            sections: [
              {
                title: 'Chi tiết tài liệu phê duyệt:',
                content: `Tên tệp: ${defaultDocTitle || 'Hồ sơ tài liệu'}\nLiên kết: ${defaultPdfUrl}\n\nVăn bản đã được tải lên thành công và nạp vào trạm ký số. Bạn có thể sử dụng thanh công cụ bên trái để chèn chữ ký tay hoặc đóng dấu hành chính.`
              }
            ]
          }
        ]
      };
    }
    return PRESET_DOCUMENTS[0];
  }, [defaultPdfUrl, defaultDocTitle, defaultDocId]);

  // Global files state
  const [documentsList, setDocumentsList] = useState(PRESET_DOCUMENTS);
  const [selectedDoc, setSelectedDoc] = useState(initialDoc);

  useEffect(() => {
    if (defaultPdfUrl) {
      setSelectedDoc(initialDoc);
      setDocumentsList(prev => {
        if (prev.some(d => d.id === initialDoc.id)) return prev;
        return [initialDoc, ...prev];
      });
    }
  }, [defaultPdfUrl, initialDoc]);
  
  // PDF.js State
  const [pdfjsLoaded, setPdfjsLoaded] = useState(false);
  const [pdfDocument, setPdfDocument] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(1);
  const [zoom, setZoom] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);
  const [useMock, setUseMock] = useState(false);

  // UI layout state
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [leftTab, setLeftTab] = useState('library'); // 'library' | 'pages' | 'tools'
  const [rightTab, setRightTab] = useState('info'); // 'info' | 'activity'
  const [bannerVisible, setBannerVisible] = useState(true);
  
  // Custom interactive annotation state
  const [annotations, setAnnotations] = useState([]);
  const [selectedAnnotation, setSelectedAnnotation] = useState(null);

  // Timeline Activity State
  const [activities, setActivities] = useState([
    { id: 1, user: 'Lê Văn C (IT)', action: 'Khởi tạo tài liệu và đẩy lên hệ thống DMS', time: '18/06/2026 09:30' },
    { id: 2, user: 'Trần Thị B (Tài chính)', action: 'Chuyển trạng thái sang Chờ Duyệt', time: '18/06/2026 10:15' }
  ]);

  // DOM Refs
  const canvasRef = useRef(null);
  const renderTaskRef = useRef(null);
  const fileInputRef = useRef(null);
  const signatureCanvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureDrawn, setSignatureDrawn] = useState(false);

  // Dynamically load PDF.js from CDN
  useEffect(() => {
    const loadPdfJs = async () => {
      if (window.pdfjsLib) {
        setPdfjsLoaded(true);
        return;
      }
      try {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.async = true;
        
        script.onload = () => {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          setPdfjsLoaded(true);
        };
        
        script.onerror = () => {
          console.warn('CORS or offline network detected, running in high-fidelity mock vector document mode.');
          setUseMock(true);
          setLoading(false);
        };
        
        document.body.appendChild(script);
      } catch (err) {
        console.warn('PDF.js dynamic loader error. Falling back to mock engine.', err);
        setUseMock(true);
        setLoading(false);
      }
    };
    
    loadPdfJs();
  }, []);

  // PDF.js rendering pipeline
  useEffect(() => {
    if (!pdfjsLoaded) return;
    
    let isCurrent = true;
    setLoading(true);
    
    // Clear existing annotations when changing document
    if (selectedDoc.id !== (pdfDocument ? pdfDocument._docId : '')) {
      setAnnotations([]);
    }
    
    const renderPDF = async () => {
      try {
        // Cancel previous rendering process
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
          renderTaskRef.current = null;
        }

        const loadingTask = window.pdfjsLib.getDocument({
          url: selectedDoc.url,
          // Disable range requests to bypass some CORS and fetch issues
          disableRange: true,
          disableAutoFetch: true,
        });

        const pdf = await loadingTask.promise;
        if (!isCurrent) return;

        setPdfDocument(pdf);
        setNumPages(pdf.numPages);
        setCurrentPage(1);
        setUseMock(false);
        
        // Update document page count in list
        setDocumentsList(prev => prev.map(doc => doc.id === selectedDoc.id ? { ...doc, pages: pdf.numPages } : doc));
        setLoading(false);
      } catch (err) {
        console.warn('Error fetching PDF directly. Standard CORS blocks apply to mozilla.github.io. Initializing beautiful mock document.', err);
        if (isCurrent) {
          setUseMock(true);
          setNumPages(selectedDoc.mockPages ? selectedDoc.mockPages.length : 1);
          setCurrentPage(1);
          setLoading(false);
        }
      }
    };

    renderPDF();

    return () => {
      isCurrent = false;
    };
  }, [pdfjsLoaded, selectedDoc]);

  // Fetch timeline activities from API if docUuid is present
  useEffect(() => {
    const fetchTimeline = async () => {
      if (!selectedDoc || !selectedDoc.docUuid || !token) {
        // Fallback to mock timeline if no real backend UUID
        if (selectedDoc) {
          setActivities([
            { id: Date.now() + 1, user: selectedDoc.author || 'Hệ thống', action: 'Khởi tạo tài liệu trên hệ thống DMS', time: `${selectedDoc.date} 09:30` },
            { id: Date.now() + 2, user: 'Hệ thống (DMS)', action: `Gán trạng thái: ${selectedDoc.status}`, time: `${selectedDoc.date} 10:15` }
          ]);
        }
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/doc/${selectedDoc.docUuid}/timeline`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Không thể tải lịch sử tài liệu');
        }

        const payload = await response.json();
        
        if (Array.isArray(payload.data)) {
          const mappedActivities = payload.data.map(item => {
            let formattedTime = '';
            try {
              const dateObj = new Date(item.timestamp);
              formattedTime = dateObj.toLocaleString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
              });
            } catch (e) {
              formattedTime = item.timestamp;
            }

            return {
              id: item.id || Math.random(),
              user: item.username || 'N/A',
              action: `${item.action} [Trạng thái: ${item.status || 'N/A'}]`,
              time: formattedTime
            };
          });
          setActivities(mappedActivities);
        } else {
          setActivities([]);
        }
      } catch (err) {
        console.error('Lỗi khi tải lịch sử tài liệu:', err);
        setActivities([
          { id: 1, user: 'Hệ thống', action: 'Không thể tải lịch sử thực tế từ máy chủ (Chế độ Offline)', time: new Date().toLocaleString() }
        ]);
      }
    };

    fetchTimeline();
  }, [selectedDoc, token]);

  // Render Page to Canvas (if using PDF.js)
  useEffect(() => {
    if (useMock || !pdfDocument || !canvasRef.current) return;

    let isCurrent = true;

    const renderPage = async () => {
      try {
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
          renderTaskRef.current = null;
        }

        const page = await pdfDocument.getPage(currentPage);
        if (!isCurrent) return;

        const canvas = canvasRef.current;
        const context = canvas.getContext('2d', { alpha: false });
        
        // Setup viewport scaling and rotation
        const viewport = page.getViewport({ scale: zoom, rotation: rotation });
        
        // Calculate devicePixelRatio for crystal clear canvas text
        const dpr = window.devicePixelRatio || 1;
        canvas.width = viewport.width * dpr;
        canvas.height = viewport.height * dpr;
        
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        
        context.scale(dpr, dpr);

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;
        
        await renderTask.promise;
        renderTaskRef.current = null;
      } catch (err) {
        if (err.name !== 'RenderingCancelledException') {
          console.error('Error rendering page:', err);
        }
      }
    };

    renderPage();

    return () => {
      isCurrent = false;
    };
  }, [pdfDocument, currentPage, zoom, rotation, useMock]);

  // Show customized floating notifications
  const showNotificationToast = (msg) => {
    const lower = msg.toLowerCase();
    if (lower.includes('thành công') || lower.includes('đã lưu') || lower.includes('đã tải') || lower.includes('đã xuất')) {
      message.success(msg.replace(/^[✨⚡️📢]\s*/, ''));
    } else if (lower.includes('lỗi') || lower.includes('thất bại') || lower.includes('không thể')) {
      message.error(msg);
    } else {
      message.info(msg);
    }
  };

  const handlePageChange = (val) => {
    const pg = Math.max(1, Math.min(numPages, val));
    setCurrentPage(pg);
  };

  // Rotation controls
  const handleRotate = () => {
    setRotation(r => (r + 90) % 360);
    showNotificationToast(`Xoay tài liệu 90°`);
  };

  // Zoom controls
  const handleZoom = (factor) => {
    if (factor === 'width') {
      setZoom(1.25);
      showNotificationToast('Vừa chiều rộng màn hình (125%)');
      return;
    }
    const nextZoom = parseFloat((zoom + factor).toFixed(1));
    if (nextZoom >= 0.5 && nextZoom <= 2.5) {
      setZoom(nextZoom);
    }
  };

  // Custom File Uploader handler
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.type !== 'application/pdf') {
      showNotificationToast('Vui lòng chỉ tải tài liệu có định dạng PDF!');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const sizeStr = file.size > 1024 * 1024 
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
      : `${(file.size / 1024).toFixed(0)} KB`;
    
    const newDoc = {
      id: `uploaded-${Date.now()}`,
      title: file.name,
      size: sizeStr,
      pages: 1, // Will be computed by PDF.js parser
      author: 'Bạn (Người duyệt)',
      date: new Date().toLocaleDateString('vi-VN'),
      status: 'Mới tải lên',
      security: 'Nội bộ',
      url: objectUrl,
      isUploaded: true,
      mockPages: [
        {
          title: file.name,
          no: 'Trang 1 / 1',
          sections: [
            {
              title: 'Tập tin PDF được tải lên từ thiết bị:',
              content: `Tập tin: ${file.name}\nDung lượng: ${sizeStr}\nNgày tải: ${new Date().toLocaleDateString('vi-VN')}\n\nTài liệu đang được dựng trên máy khách của bạn. Hãy sử dụng thanh công cụ bên phải để đóng dấu hoặc vẽ chữ ký trực tiếp.`
            }
          ]
        }
      ]
    };

    setDocumentsList([newDoc, ...documentsList]);
    setSelectedDoc(newDoc);
    showNotificationToast(`Đã tải lên và mở file thành công!`);
    
    // Clear input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Digital Signature Canvas drawing handlers
  const startDrawing = (e) => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#021859'; // Premium blue ink
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0]?.clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0]?.clientY)) - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setSignatureDrawn(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0]?.clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0]?.clientY)) - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureDrawn(false);
  };

  // Save Signature overlay
  const saveSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    
    const blank = document.createElement('canvas');
    blank.width = canvas.width;
    blank.height = canvas.height;
    if (canvas.toDataURL() === blank.toDataURL()) {
      showNotificationToast('Vui lòng vẽ chữ ký của bạn vào khung trắng trước!');
      return;
    }

    const dataUrl = canvas.toDataURL();

    // Create signature annotation object
    const newAnnot = {
      id: `sig-${Date.now()}`,
      type: 'signature',
      page: currentPage,
      x: 120,
      y: 200,
      width: 140,
      height: 70,
      data: dataUrl,
      signer: 'Admin (DMS)',
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    setAnnotations([...annotations, newAnnot]);
    
    // Add to activity timeline
    const activityMsg = `Đã ký nháp điện tử tại Trang ${currentPage}`;
    setActivities(prev => [
      { id: Date.now(), user: 'Bạn (Trình duyệt)', action: activityMsg, time: new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) },
      ...prev
    ]);

    showNotificationToast(`Đã chèn chữ ký vào Trang ${currentPage}. Hãy kéo thả chữ ký đến vị trí phù hợp.`);
    clearSignature();
  };

  // Add customized administrative stamp mộc
  const addStamp = (stampType) => {
    const stampLabels = {
      approved: 'ĐÃ DUYỆT',
      rejected: 'TỪ CHỐI',
      urgent: 'HỎA TỐC',
      confidential: 'MẬT'
    };

    const newAnnot = {
      id: `stamp-${Date.now()}`,
      type: 'stamp',
      page: currentPage,
      x: 180,
      y: 120,
      width: 150,
      height: 52,
      stampType: stampType,
      text: stampLabels[stampType] || 'DMS DUYỆT',
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    setAnnotations([...annotations, newAnnot]);
    
    // Add to activity timeline
    const activityMsg = `Đã đóng dấu mộc [${stampLabels[stampType]}] tại Trang ${currentPage}`;
    setActivities(prev => [
      { id: Date.now(), user: 'Bạn (Trình duyệt)', action: activityMsg, time: new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) },
      ...prev
    ]);

    showNotificationToast(`Đã đóng dấu mộc [${stampLabels[stampType]}] ở Trang ${currentPage}. Có thể di chuyển vị trí.`);
  };

  // Remove applied annotation
  const deleteAnnotation = (id) => {
    setAnnotations(annotations.filter(a => a.id !== id));
    setSelectedAnnotation(null);
    showNotificationToast('Đã xóa dấu/chữ ký khỏi trang.');
  };

  // Handle dragging annotations on canvas
  const handleAnnotationDrag = (e, annotId) => {
    e.preventDefault();
    const element = e.currentTarget;
    const parent = element.offsetParent;
    if (!parent) return;

    const startX = e.clientX;
    const startY = e.clientY;

    const target = annotations.find(a => a.id === annotId);
    if (!target) return;

    const initialX = target.x;
    const initialY = target.y;

    const onMouseMove = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;

      // Restrict boundaries
      const boundedX = Math.max(0, Math.min(parent.clientWidth - target.width, initialX + dx));
      const boundedY = Math.max(0, Math.min(parent.clientHeight - target.height, initialY + dy));

      setAnnotations(prev => prev.map(a => a.id === annotId ? { ...a, x: boundedX, y: boundedY } : a));
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // Print function
  const handlePrint = () => {
    window.print();
  };

  // Download raw PDF file helper
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = selectedDoc.url;
    link.download = selectedDoc.title;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotificationToast(`Bắt đầu tải xuống tài liệu: ${selectedDoc.title}`);
  };

  // Save/Export annotated document (Mock DMS save)
  const saveAllChanges = () => {
    showNotificationToast('💾 Đang mã hóa chữ ký và đồng bộ lên hệ thống DMS...');
    setTimeout(() => {
      // update doc status
      const isApproved = annotations.some(a => a.type === 'stamp' && a.stampType === 'approved');
      const nextStatus = isApproved ? 'Đã duyệt' : selectedDoc.status;
      
      setDocumentsList(prev => prev.map(doc => doc.id === selectedDoc.id ? { ...doc, status: nextStatus } : doc));
      setSelectedDoc(prev => ({ ...prev, status: nextStatus }));

      setActivities(prev => [
        { id: Date.now(), user: 'Hệ thống (DMS)', action: `Đã lưu chữ ký số và cập nhật hồ sơ thành công.`, time: new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) },
        ...prev
      ]);
      
      showNotificationToast('✨ Đã lưu tài liệu ký số thành công lên máy chủ DMS!');
    }, 1500);
  };

  // Render dynamic list of annotations matching the current page
  const pageAnnotations = useMemo(() => {
    return annotations.filter(a => a.page === currentPage);
  }, [annotations, currentPage]);

  return (
    <div className="wide-card">
      {/* Banner introduction with tips */}
      {bannerVisible && (
        <div className="pdf-instruction-banner">
          <div className="pdf-instruction-text">
            <span className="pdf-instruction-icon">💡</span>
            <div>
              <strong>Trình xem văn bản DMS nâng cao:</strong> Bạn có thể chọn các tài liệu mẫu khác nhau,
              tải file PDF cục bộ lên, phóng to/thu nhỏ tài liệu, hoặc tự vẽ chữ ký của mình và đóng dấu trực tiếp lên hồ sơ để duyệt nhanh.
            </div>
          </div>
          <button className="pdf-instruction-close" onClick={() => setBannerVisible(false)}>×</button>
        </div>
      )}

      {/* Main Container */}
      <div className="pdf-viewer-container">
        {/* Main Header Toolbar */}
        <div className="pdf-viewer-toolbar">
          <div className="pdf-toolbar-group">
            {/* Sidebar toggle */}
            <button 
              className={`pdf-btn ${leftSidebarOpen ? 'active' : ''}`}
              title="Đóng/Mở thanh công cụ trái"
              onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
              <span>Thư viện ({documentsList.length})</span>
            </button>
            
            <div className="pdf-toolbar-divider"></div>

            {/* Page navigation */}
            <button 
              className="pdf-btn pdf-btn-icon" 
              disabled={currentPage <= 1 || loading}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              ←
            </button>
            <div className="pdf-page-indicator">
              <input 
                type="number" 
                className="pdf-page-input"
                value={currentPage}
                onChange={(e) => handlePageChange(parseInt(e.target.value) || 1)}
                min="1"
                max={numPages}
              />
              <span>/ {numPages}</span>
            </div>
            <button 
              className="pdf-btn pdf-btn-icon" 
              disabled={currentPage >= numPages || loading}
              onClick={() => handlePageChange(currentPage + 1)}
            >
              →
            </button>
          </div>

          {/* Zoom and view modes controls */}
          <div className="pdf-toolbar-group">
            <button className="pdf-btn pdf-btn-icon" disabled={zoom <= 0.6 || loading} onClick={() => handleZoom(-0.1)}>
              ➖
            </button>
            <Select 
              style={{ width: '90px' }}
              value={`${Math.round(zoom * 100)}%`}
              onChange={(val) => setZoom(parseFloat(val) / 100)}
              disabled={loading}
              options={[
                { value: '50%', label: '50%' },
                { value: '75%', label: '75%' },
                { value: '100%', label: '100%' },
                { value: '125%', label: '125%' },
                { value: '150%', label: '150%' },
                { value: '200%', label: '200%' }
              ]}
            />
            <button className="pdf-btn pdf-btn-icon" disabled={zoom >= 2.4 || loading} onClick={() => handleZoom(0.1)}>
              ➕
            </button>
            <button className="pdf-btn" disabled={loading} onClick={() => handleZoom('width')}>
              Vừa trang
            </button>
            <button className="pdf-btn pdf-btn-icon" title="Xoay trang" onClick={handleRotate} disabled={loading}>
              🔄
            </button>
          </div>

          {/* Save / Export buttons */}
          <div className="pdf-toolbar-group">
            <button className="pdf-btn" onClick={handlePrint} title="In tài liệu này" disabled={loading}>
              🖨️
            </button>
            <button className="pdf-btn" onClick={handleDownload} title="Tải xuống tệp gốc" disabled={loading}>
              📥
            </button>
            <button className="pdf-btn active" onClick={saveAllChanges} disabled={loading || annotations.length === 0} title="Lưu chữ ký lên DMS">
              💾 Lưu Ký Số
            </button>
            <button 
              className={`pdf-btn ${rightSidebarOpen ? 'active' : ''}`}
              title="Đóng/Mở chi tiết phê duyệt"
              onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
            >
              <span>Chi tiết</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="15" y1="3" x2="15" y2="21"></line></svg>
            </button>
          </div>
        </div>

        {/* Central Workspace area */}
        <div className="pdf-viewer-workspace">
          
          {/* Left Sidebar (Document library, pages, signature tools) */}
          <div className={`pdf-sidebar-left ${leftSidebarOpen ? '' : 'collapsed'}`}>
            <div className="pdf-sidebar-tabs">
              <div className={`pdf-sidebar-tab ${leftTab === 'library' ? 'active' : ''}`} onClick={() => setLeftTab('library')}>
                Thư viện
              </div>
              <div className={`pdf-sidebar-tab ${leftTab === 'pages' ? 'active' : ''}`} onClick={() => setLeftTab('pages')}>
                Trang
              </div>
              <div className={`pdf-sidebar-tab ${leftTab === 'tools' ? 'active' : ''}`} onClick={() => setLeftTab('tools')}>
                Ký & Đóng dấu
              </div>
            </div>
            
            <div className="pdf-sidebar-content">
              {leftTab === 'library' && (
                <>
                  <div className="pdf-tool-title">Tài liệu DMS hệ thống</div>
                  <div className="pdf-doc-list">
                    {documentsList.map((doc) => (
                      <div 
                        key={doc.id}
                        className={`pdf-doc-item ${selectedDoc.id === doc.id ? 'active' : ''}`}
                        onClick={() => setSelectedDoc(doc)}
                      >
                        <span className="pdf-doc-icon">📄</span>
                        <div className="pdf-doc-details">
                          <div className="pdf-doc-title" title={doc.title}>{doc.title}</div>
                          <div className="pdf-doc-meta">{doc.size} • {doc.pages} trang</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pdf-tool-divider" style={{ borderTop: '1px solid var(--border)', margin: '10px 0' }}></div>
                  
                  {/* File Uploader Button */}
                  <button className="pdf-picker-btn" onClick={() => fileInputRef.current?.click()}>
                    📁 Tải PDF từ Máy Tính
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="application/pdf"
                    style={{ display: 'none' }}
                  />
                </>
              )}

              {leftTab === 'pages' && (
                <div className="pdf-thumbnails-grid">
                  {Array.from({ length: numPages }, (_, index) => {
                    const pageNum = index + 1;
                    return (
                      <div 
                        key={pageNum}
                        className={`pdf-thumbnail-card ${currentPage === pageNum ? 'active' : ''}`}
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        <div className="pdf-thumbnail-preview">
                          <span>Trang {pageNum}</span>
                        </div>
                        <div className="pdf-thumbnail-num">{pageNum}</div>
                      </div>
                    );
                  })}
                </div>
              )}

              {leftTab === 'tools' && (
                <>
                  {/* Stamp tools */}
                  <div className="pdf-tool-section">
                    <div className="pdf-tool-title">Đóng Dấu Phê Duyệt</div>
                    <div className="pdf-stamp-grid">
                      <button className="pdf-stamp-btn" onClick={() => addStamp('approved')}>
                        <span className="stamp-preview-badge approved">ĐÃ DUYỆT</span>
                        <span>Đã duyệt</span>
                      </button>
                      <button className="pdf-stamp-btn" onClick={() => addStamp('rejected')}>
                        <span className="stamp-preview-badge rejected">TỪ CHỐI</span>
                        <span>Từ chối</span>
                      </button>
                      <button className="pdf-stamp-btn" onClick={() => addStamp('urgent')}>
                        <span className="stamp-preview-badge urgent">HỎA TỐC</span>
                        <span>Hỏa tốc</span>
                      </button>
                      <button className="pdf-stamp-btn" onClick={() => addStamp('confidential')}>
                        <span className="stamp-preview-badge confidential">MẬT</span>
                        <span>Mật</span>
                      </button>
                    </div>
                  </div>

                  {/* Draw Signature Pad */}
                  <div className="pdf-tool-section" style={{ marginTop: '10px' }}>
                    <div className="pdf-tool-title">Vẽ Chữ Ký Điện Tử</div>
                    <div className="pdf-signature-pad-container">
                      <div className="pdf-signature-canvas-wrapper">
                        <canvas 
                          ref={signatureCanvasRef}
                          className="pdf-signature-canvas"
                          width={260}
                          height={110}
                          onMouseDown={startDrawing}
                          onMouseMove={draw}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                          onTouchStart={startDrawing}
                          onTouchMove={draw}
                          onTouchEnd={stopDrawing}
                        />
                        {!signatureDrawn && (
                          <>
                            <div className="pdf-signature-guide-text signature-guide-fade">Ký tên tại đây</div>
                            <div className="pdf-signature-guide-line signature-guide-fade"></div>
                          </>
                        )}
                      </div>
                      <div className="pdf-signature-actions">
                        <button className="pdf-btn" onClick={clearSignature} style={{ flex: 1, padding: '6px' }}>
                          Xóa vẽ
                        </button>
                        <button className="pdf-btn active" onClick={saveSignature} style={{ flex: 1, padding: '6px' }}>
                          Ký tài liệu
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Center viewport area */}
          <div className="pdf-view-area">
            {loading && (
              <div className="pdf-loading-overlay">
                <div className="pdf-loading-spinner"></div>
                <div>Đang tải và đồng bộ tài liệu...</div>
              </div>
            )}
            
            <div className="pdf-view-viewport">
              {useMock ? (
                /* Falling back to gorgeous mockup representation */
                <div
                  className="pdf-mock-wrapper"
                  style={{
                    width: `${(rotation % 180 === 0 ? 610 : 860) * zoom}px`,
                    height: `${(rotation % 180 === 0 ? 860 : 610) * zoom}px`,
                    position: 'relative',
                    marginLeft: 'auto',
                    marginRight: 'auto',
                    marginTop: `${40 * zoom}px`,
                    marginBottom: `${40 * zoom}px`
                  }}
                >
                  <div 
                    className="pdf-mock-doc"
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: `translate(-50%, -50%) scale(${zoom}) rotate(${rotation}deg)`,
                      width: '610px',
                      height: '860px',
                      margin: 0
                    }}
                  >
                    <div className="pdf-mock-header">
                      <span className="pdf-mock-logo">🏛️ DMS APPROVAL SYSTEM</span>
                      <span className="pdf-mock-doc-no">{selectedDoc.mockPages?.[currentPage - 1]?.no || 'Hồ sơ chờ duyệt'}</span>
                    </div>
                    
                    <div className="pdf-mock-content">
                      <h2 className="pdf-mock-title">{selectedDoc.mockPages?.[currentPage - 1]?.title || selectedDoc.title}</h2>
                      
                      {selectedDoc.mockPages?.[currentPage - 1]?.sections?.map((sec, idx) => (
                        <div key={idx}>
                          <div className="pdf-mock-section">{sec.title}</div>
                          <p style={{ margin: '6px 0', whiteSpace: 'pre-wrap' }}>{sec.content}</p>
                        </div>
                      ))}
                    </div>

                    <div className="pdf-mock-footer">
                      <span>Hệ thống lưu trữ DMS v1.8</span>
                      
                      {/* Render sign box in mock representation only if on last page */}
                      {currentPage === numPages && (
                        <div className="pdf-mock-sign-block">
                          <div className="pdf-mock-sign-label">Người phê duyệt</div>
                          <div className="pdf-mock-sign-placeholder">Ký tên hoặc đóng dấu</div>
                        </div>
                      )}
                    </div>

                    {/* Active Annotation overlays inside viewport */}
                    <div className="pdf-annotations-layer">
                      {pageAnnotations.map((annot) => (
                        <div
                          key={annot.id}
                          className={`pdf-annotation-element ${selectedAnnotation === annot.id ? 'selected' : ''}`}
                          style={{
                            left: `${annot.x}px`,
                            top: `${annot.y}px`,
                            width: `${annot.width}px`,
                            height: `${annot.height}px`
                          }}
                          onMouseDown={(e) => {
                            setSelectedAnnotation(annot.id);
                            handleAnnotationDrag(e, annot.id);
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAnnotation(annot.id);
                          }}
                        >
                          <button className="pdf-annotation-delete" onClick={() => deleteAnnotation(annot.id)}>
                            ×
                          </button>
                          
                          {annot.type === 'stamp' ? (
                            <div className={`pdf-annotation-stamp ${annot.stampType}`}>
                              {annot.text}
                            </div>
                          ) : (
                            <div className="pdf-annotation-signature">
                              <img src={annot.data} alt="signature" />
                              <div className="pdf-annotation-signature-meta">
                                {annot.signer} • {annot.timestamp}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* PDFJS Canvas Renderer */
                <div 
                  className="pdf-canvas-container"
                  style={{
                    marginTop: `${20 * zoom}px`,
                    marginBottom: `${20 * zoom}px`
                  }}
                >
                  <canvas ref={canvasRef} className="pdf-canvas-el" />
                  
                  {/* Annotation overlay layer mapping annotations */}
                  <div className="pdf-annotations-layer">
                    {pageAnnotations.map((annot) => (
                      <div
                        key={annot.id}
                        className={`pdf-annotation-element ${selectedAnnotation === annot.id ? 'selected' : ''}`}
                        style={{
                          left: `${annot.x}px`,
                          top: `${annot.y}px`,
                          width: `${annot.width}px`,
                          height: `${annot.height}px`
                        }}
                        onMouseDown={(e) => {
                          setSelectedAnnotation(annot.id);
                          handleAnnotationDrag(e, annot.id);
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAnnotation(annot.id);
                        }}
                      >
                        <button className="pdf-annotation-delete" onClick={() => deleteAnnotation(annot.id)}>
                          ×
                        </button>
                        
                        {annot.type === 'stamp' ? (
                          <div className={`pdf-annotation-stamp ${annot.stampType}`}>
                            {annot.text}
                          </div>
                        ) : (
                          <div className="pdf-annotation-signature">
                            <img src={annot.data} alt="signature" />
                            <div className="pdf-annotation-signature-meta">
                              {annot.signer} • {annot.timestamp}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar (Metadata Info & Activity logs) */}
          <div className={`pdf-sidebar-right ${rightSidebarOpen ? '' : 'collapsed'}`}>
            <div className="pdf-sidebar-tabs">
              <div className={`pdf-sidebar-tab ${rightTab === 'info' ? 'active' : ''}`} onClick={() => setRightTab('info')}>
                Chi tiết tệp
              </div>
              <div className={`pdf-sidebar-tab ${rightTab === 'activity' ? 'active' : ''}`} onClick={() => setRightTab('activity')}>
                Lịch sử duyệt
              </div>
            </div>

            <div className="pdf-sidebar-content">
              {rightTab === 'info' && (
                <div className="pdf-info-list">
                  <div className="pdf-info-row">
                    <span className="pdf-info-label">Tên tài liệu</span>
                    <span className="pdf-info-val">{selectedDoc.title}</span>
                  </div>
                  <div className="pdf-info-row">
                    <span className="pdf-info-label">Trạng thái</span>
                    <span className={`pdf-info-val ${selectedDoc.status === 'Đã duyệt' ? 'status-approved' : 'status-pending'}`}>
                      {selectedDoc.status}
                    </span>
                  </div>
                  <div className="pdf-info-row">
                    <span className="pdf-info-label">Độ mật hồ sơ</span>
                    <span className="pdf-info-val" style={{ color: selectedDoc.security === 'Tối mật' ? '#ef4444' : 'inherit' }}>
                      🛡️ {selectedDoc.security}
                    </span>
                  </div>
                  <div className="pdf-info-row">
                    <span className="pdf-info-label">Dung lượng</span>
                    <span className="pdf-info-val">{selectedDoc.size}</span>
                  </div>
                  <div className="pdf-info-row">
                    <span className="pdf-info-label">Người đề xuất</span>
                    <span className="pdf-info-val">{selectedDoc.author}</span>
                  </div>
                  <div className="pdf-info-row">
                    <span className="pdf-info-label">Ngày khởi tạo</span>
                    <span className="pdf-info-val">{selectedDoc.date}</span>
                  </div>
                </div>
              )}

              {rightTab === 'activity' && (
                <div className="pdf-timeline">
                  {activities.map((act) => (
                    <div key={act.id} className="pdf-timeline-item">
                      <span className={`pdf-timeline-dot ${act.action.includes('Lưu') || act.action.includes('Đã duyệt') ? 'success' : 'pending'}`}></span>
                      <div className="pdf-timeline-user">{act.user}</div>
                      <div className="pdf-timeline-action">{act.action}</div>
                      <div className="pdf-timeline-time">{act.time}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>      </div>
    </div>
  );
}

export default PDFViewer;
