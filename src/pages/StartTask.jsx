import { useState, useEffect } from 'react';
import { Select } from 'antd';
import { jsPDF } from 'jspdf';

const API_BASE_URL = import.meta.env.VITE_AUTH_URL || 'http://192.168.42.243:8080';

// Utility to get current date formatted as DD/MM/YYYY
const getCurrentFormattedDate = () => {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

// Default initial state structure for template data
const getInitialTemplateData = (user) => ({
  CONTRACT: {
    title: '',
    createdDate: getCurrentFormattedDate(),
    createdBy: '',
    partnerName: '',
    amount: '',
    amountInWords: '',
    email: user?.email || ''
  },
  PROPOSAL: {
    title: '',
    createdDate: getCurrentFormattedDate(),
    createdBy: '',
    proposalContent: '',
    email: user?.email || ''
  },
  RECEIPT: {
    title: '',
    createdDate: getCurrentFormattedDate(),
    creatorName: '',
    amount: '',
    amountInWords: '',
    email: user?.email || ''
  }
});

// Format numeric string with thousands separator dots
const formatNumber = (numStr) => {
  if (!numStr) return '';
  const clean = numStr.replace(/\D/g, '');
  return clean.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

// Convert number string to Vietnamese words
const numberToVietnameseWords = (numStr) => {
  if (!numStr) return '';
  const cleanNumStr = numStr.replace(/\D/g, '');
  const num = parseInt(cleanNumStr, 10);
  if (isNaN(num)) return '';
  if (num === 0) return 'Không đồng';

  const units = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];
  const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

  const readThreeDigits = (n, showZero) => {
    let hundred = Math.floor(n / 100);
    let ten = Math.floor((n % 100) / 10);
    let unit = n % 10;
    let res = '';

    if (hundred > 0 || showZero) {
      res += digits[hundred] + ' trăm ';
    }

    if (ten > 0) {
      if (ten === 1) res += 'mười ';
      else res += digits[ten] + ' mươi ';
    } else if (hundred > 0 && unit > 0) {
      res += 'lẻ ';
    }

    if (unit > 0) {
      if (unit === 1 && ten > 1) res += 'mốt';
      else if (unit === 5 && ten > 0) res += 'lăm';
      else res += digits[unit];
    }
    return res.trim();
  };

  let temp = num;
  let groups = [];
  while (temp > 0) {
    groups.push(temp % 1000);
    temp = Math.floor(temp / 1000);
  }

  let words = '';
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i];
    if (g > 0) {
      const showZero = i < groups.length - 1;
      const gText = readThreeDigits(g, showZero);
      words += gText + ' ' + units[i] + ' ';
    }
  }

  let result = words.trim().replace(/\s+/g, ' ');
  if (result) {
    result = result.charAt(0).toUpperCase() + result.slice(1) + ' đồng chẵn';
  }
  return result;
};

// Extract JSON safely from AI text response
const extractJsonFromText = (text) => {
  if (!text) return null;
  let jsonString = text.trim();

  if (jsonString.includes('```')) {
    const match = jsonString.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
      jsonString = match[1].trim();
    }
  }

  const firstBrace = jsonString.indexOf('{');
  const lastBrace = jsonString.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) {
    jsonString = jsonString.substring(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(jsonString);
  } catch (e) {
    console.error('Failed to parse extracted JSON:', e);
    return null;
  }
};

function StartTask({ token, user }) {
  const [activeTab, setActiveTab] = useState('UPLOAD'); // 'UPLOAD' or 'TEMPLATE'
  const [file, setFile] = useState(null);
  const [uploadDocType, setUploadDocType] = useState(''); // Case A docType (optional)
  const [uploadEmail, setUploadEmail] = useState(user?.email || ''); // Case A email (required)
  const [docType, setDocType] = useState('CONTRACT'); // Case B docType (required)

  const [templateData, setTemplateData] = useState(getInitialTemplateData(user));

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Validation state tracking
  const [validationErrors, setValidationErrors] = useState({});

  // AI Auto-fill states
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState(null); // { type: 'success' | 'error', message: string }

  // Sync user email when user object is loaded
  useEffect(() => {
    if (user?.email) {
      setUploadEmail(prev => prev || user.email);
      setTemplateData(prev => {
        const updated = { ...prev };
        for (const type in updated) {
          if (!updated[type].email) {
            updated[type].email = user.email;
          }
        }
        return updated;
      });
    }
  }, [user]);

  const handleFileChange = (event) => {
    setFile(event.target.files?.[0] || null);
    setValidationErrors(prev => ({ ...prev, file: false }));
    setResult(null);
    setError(null);
  };

  const handleInputChange = (field, value) => {
    setTemplateData(prev => {
      const updated = {
        ...prev[docType],
        [field]: value
      };

      // Automatically convert amount to words
      if (field === 'amount') {
        updated.amountInWords = numberToVietnameseWords(value);
      }

      return {
        ...prev,
        [docType]: updated
      };
    });

    // Clear validation error for this field
    setValidationErrors(prev => ({ ...prev, [field]: false }));
    setResult(null);
    setError(null);
    setAiStatus(null);
  };

  // Reset/Clear input data helper
  const handleClearData = () => {
    if (activeTab === 'UPLOAD') {
      setFile(null);
      setUploadDocType('');
      setUploadEmail(user?.email || '');
    } else {
      setTemplateData(prev => ({
        ...prev,
        [docType]: getInitialTemplateData(user)[docType]
      }));
      setAiPrompt('');
      setAiStatus(null);
    }
    setValidationErrors({});
    setError(null);
    setResult(null);
  };

  const getFieldNameLabel = (field) => {
    const labels = {
      title: 'Tên hợp đồng / Tiêu đề / Lý do chi',
      createdDate: 'Ngày lập / Ngày đề xuất / Ngày nhận',
      createdBy: 'Người lập / Người đề xuất',
      partnerName: 'Tên đối tác ký kết',
      amount: 'Giá trị hợp đồng / Số tiền thanh toán (VNĐ)',
      amountInWords: 'Số tiền bằng chữ',
      proposalContent: 'Nội dung chi tiết tờ trình',
      creatorName: 'Tên người thụ hưởng',
      email: 'Email người lập / liên hệ'
    };
    return labels[field] || field;
  };

  const checkFormValidation = () => {
    const errors = {};
    if (activeTab === 'UPLOAD') {
      if (!file) {
        errors.file = true;
      }
      if (!uploadEmail.trim()) {
        errors.uploadEmail = true;
      }
    } else {
      const currentData = templateData[docType];
      for (const key in currentData) {
        if (key === 'amountInWords') continue; // auto-computed & disabled

        if (typeof currentData[key] === 'string' && !currentData[key].trim()) {
          errors[key] = true;
        }
      }
    }
    return errors;
  };

  const handleAiAutoFill = async () => {
    if (!aiPrompt.trim()) {
      setAiStatus({ type: 'error', message: 'Vui lòng nhập mô tả yêu cầu trước.' });
      return;
    }

    setAiLoading(true);
    setAiStatus(null);
    setError(null);

    const today = getCurrentFormattedDate();
    const userEmail = user?.email || '';
    let fieldsTemplate = '';
    if (docType === 'CONTRACT') {
      fieldsTemplate = `
      - title: Tên hợp đồng ngắn gọn
      - createdDate: Ngày tạo hợp đồng dạng DD/MM/YYYY (mặc định lấy "${today}" nếu không nhắc đến)
      - createdBy: Tên người lập/ký hợp đồng phía ta
      - partnerName: Tên công ty/đối tác ký kết bên ngoài
      - amount: Giá trị hợp đồng bằng số (chỉ chứa chữ số nguyên, ví dụ "150000000", không chứa chữ hoặc dấu chấm phẩy)
      - email: Email liên hệ người lập (mặc định lấy "${userEmail}" nếu không nhắc đến)
      `;
    } else if (docType === 'PROPOSAL') {
      fieldsTemplate = `
      - title: Tiêu đề tờ trình ngắn gọn
      - createdDate: Ngày đề xuất dạng DD/MM/YYYY (mặc định lấy "${today}" nếu không nhắc đến)
      - createdBy: Tên người đề xuất
      - proposalContent: Nội dung chi tiết của đề xuất, tờ trình
      - email: Email người đề xuất (mặc định lấy "${userEmail}" nếu không nhắc đến)
      `;
    } else if (docType === 'RECEIPT') {
      fieldsTemplate = `
      - title: Lý do chi tiền / nội dung nhận tiền ngắn gọn
      - createdDate: Ngày thanh toán dạng DD/MM/YYYY (mặc định lấy "${today}" nếu không nhắc đến)
      - creatorName: Tên người thụ hưởng / người nhận tiền
      - amount: Số tiền thanh toán bằng số (chỉ chứa chữ số nguyên, ví dụ "25000000", không chứa chữ hoặc dấu chấm phẩy)
      - email: Email liên hệ người lập (mặc định lấy "${userEmail}" nếu không nhắc đến)
      `;
    }

    const systemPrompt = `Bạn là một AI trích xuất thông tin nghiệp vụ. Hãy phân tích yêu cầu mô tả bằng ngôn ngữ tự nhiên bên dưới và trích xuất dữ liệu khớp hoàn toàn với cấu trúc JSON của biểu mẫu "${docType}".

Cấu trúc các trường cần trích xuất:
${fieldsTemplate}

Yêu cầu người dùng cung cấp: "${aiPrompt}"

LƯU Ý QUAN TRỌNG: Chỉ trả về duy nhất một khối JSON thô bắt đầu bằng "{" và kết thúc bằng "}". Tuyệt đối không thêm bất kỳ dòng giải thích, lời thoại, markdown hay khối ký tự nào khác ngoài JSON. Nếu trường nào không có thông tin, hãy để giá trị trống "".`;

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : undefined
        },
        body: JSON.stringify({ message: systemPrompt })
      });

      if (!response.ok) {
        throw new Error('Không thể kết nối đến máy chủ AI.');
      }

      const resJson = await response.json();
      const aiText = resJson?.data?.message || resJson?.message;
      const parsedData = extractJsonFromText(aiText);

      if (!parsedData) {
        throw new Error('AI trả về định dạng không hợp lệ hoặc không trích xuất được thông tin.');
      }

      setTemplateData(prev => {
        const updated = { ...prev[docType] };
        let count = 0;
        const newErrors = { ...validationErrors };
        for (const key in updated) {
          if (parsedData[key] !== undefined && parsedData[key] !== null && String(parsedData[key]).trim() !== '') {
            updated[key] = String(parsedData[key]);
            newErrors[key] = false; // Clear validation error on successful AI fill
            count++;
          }
        }

        // Auto update amountInWords if amount was updated by AI
        if (parsedData.amount !== undefined && parsedData.amount !== null && String(parsedData.amount).trim() !== '') {
          updated.amountInWords = numberToVietnameseWords(String(parsedData.amount));
        }

        setValidationErrors(newErrors);

        if (count === 0) {
          throw new Error('Không tìm thấy thông tin phù hợp trong mô tả của bạn. Hãy viết cụ thể hơn.');
        }

        setAiStatus({
          type: 'success',
          message: `✓ AI đã trích xuất và điền thành công ${count} trường thông tin!`
        });

        return {
          ...prev,
          [docType]: updated
        };
      });

    } catch (err) {
      setAiStatus({
        type: 'error',
        message: err.message || 'Lỗi xử lý trích xuất dữ liệu.'
      });
    } finally {
      setAiLoading(false);
    }
  };

  const removeVietnameseTones = (str) => {
    if (!str) return '';
    str = String(str);
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
    str = str.replace(/đ/g, "d");
    str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
    str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
    str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
    str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
    str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
    str = str.replace(/Ỳ|Ý|Ạ|Ỷ|Ỹ/g, "Y");
    str = str.replace(/Đ/g, "D");
    str = str.replace(/\u0300|\u0301|\u0303|\u0309|\u0323/g, "");
    str = str.replace(/\u02C6|\u0306|\u031B/g, "");
    return str;
  };

  const generateMockFileFromTemplate = (type, data) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    doc.setFont("Helvetica", "normal");
    let fileName = "";

    if (type === 'CONTRACT') {
      fileName = `Hop_dong_${(data.partnerName || 'Dich_vu').trim().replace(/\s+/g, '_')}.pdf`;

      // Title / Headers
      doc.setFontSize(11);
      doc.setFont("Helvetica", "bold");
      doc.text(removeVietnameseTones("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"), 105, 20, { align: "center" });
      doc.setFont("Helvetica", "normal");
      doc.text(removeVietnameseTones("Độc lập - Tự do - Hạnh phúc"), 105, 26, { align: "center" });
      doc.line(70, 28, 140, 28);

      doc.setFontSize(15);
      doc.setFont("Helvetica", "bold");
      doc.text(removeVietnameseTones("HỢP ĐỒNG DỊCH VỤ THƯƠNG MẠI"), 105, 45, { align: "center" });

      doc.setFontSize(10);
      doc.setFont("Helvetica", "normal");
      doc.text(removeVietnameseTones(`Hôm nay, ngày ${data.createdDate || getCurrentFormattedDate()}, tại văn phòng DMS Approval Hub.`), 20, 60);
      doc.text(removeVietnameseTones("Chúng tôi gồm các bên ký kết dưới đây:"), 20, 66);

      doc.setFont("Helvetica", "bold");
      doc.text(removeVietnameseTones("BÊN A (Bên Đề Xuất):"), 20, 74);
      doc.setFont("Helvetica", "normal");
      doc.text(removeVietnameseTones(`${data.createdBy || '................'} (Email: ${data.email})`), 60, 74);

      doc.setFont("Helvetica", "bold");
      doc.text(removeVietnameseTones("BÊN B (Đối Tác):"), 20, 82);
      doc.setFont("Helvetica", "normal");
      doc.text(removeVietnameseTones(`${data.partnerName || '................'}`), 55, 82);

      doc.text(removeVietnameseTones("Hai bên đồng ý ký kết hợp đồng dịch vụ thương mại với các điều khoản cụ thể sau:"), 20, 92);

      doc.setFont("Helvetica", "bold");
      doc.text(removeVietnameseTones("Điều 1: Nội dung thỏa thuận dịch vụ"), 20, 102);
      doc.setFont("Helvetica", "normal");
      const wrappedTitle = doc.splitTextToSize(removeVietnameseTones(`Thực hiện công việc: ${data.title}`), 170);
      doc.text(wrappedTitle, 20, 108);

      const nextY = 108 + (wrappedTitle.length * 6);
      doc.setFont("Helvetica", "bold");
      doc.text(removeVietnameseTones("Điều 2: Giá trị hợp đồng & Phương thức thanh toán"), 20, nextY);
      doc.setFont("Helvetica", "normal");
      doc.text(removeVietnameseTones(`- Tổng giá trị hợp đồng: ${formatNumber(data.amount)} VNĐ`), 20, nextY + 6);
      doc.text(removeVietnameseTones(`- Bằng chữ: ${data.amountInWords}`), 20, nextY + 12);

      // Signatures
      doc.setFont("Helvetica", "bold");
      doc.text(removeVietnameseTones("ĐẠI DIỆN BÊN A"), 50, nextY + 36, { align: "center" });
      doc.setFont("Helvetica", "normal");
      doc.text(removeVietnameseTones("(Ký, ghi rõ họ tên)"), 50, nextY + 41, { align: "center" });

      doc.setFont("Helvetica", "bold");
      doc.text(removeVietnameseTones("ĐẠI DIỆN BÊN B"), 160, nextY + 36, { align: "center" });
      doc.setFont("Helvetica", "normal");
      doc.text(removeVietnameseTones("(Ký, ghi rõ họ tên)"), 160, nextY + 41, { align: "center" });
    } else if (type === 'PROPOSAL') {
      fileName = `To_trinh_${(data.createdBy || 'De_xuat').trim().replace(/\s+/g, '_')}.pdf`;

      doc.setFontSize(11);
      doc.setFont("Helvetica", "bold");
      doc.text(removeVietnameseTones("CÔNG TY DMS APPROVAL HUB"), 20, 20);
      doc.setFont("Helvetica", "normal");
      doc.text(removeVietnameseTones("Số: ..... / TTr - DMS"), 20, 26);
      doc.line(20, 28, 55, 28);

      doc.setFontSize(15);
      doc.setFont("Helvetica", "bold");
      doc.text(removeVietnameseTones("TỜ TRÌNH PHÊ DUYỆT"), 105, 45, { align: "center" });

      doc.setFontSize(10);
      doc.setFont("Helvetica", "normal");
      doc.text(removeVietnameseTones("Kính gửi: Ban Giám đốc Công ty DMS Approval Hub"), 105, 58, { align: "center" });

      doc.setFont("Helvetica", "bold");
      doc.text(removeVietnameseTones("Người đề xuất:"), 20, 70);
      doc.setFont("Helvetica", "normal");
      doc.text(removeVietnameseTones(data.createdBy), 50, 70);

      doc.setFont("Helvetica", "bold");
      doc.text(removeVietnameseTones("Email liên hệ:"), 20, 76);
      doc.setFont("Helvetica", "normal");
      doc.text(removeVietnameseTones(data.email), 50, 76);

      doc.setFont("Helvetica", "bold");
      doc.text(removeVietnameseTones("Ngày đề xuất:"), 20, 82);
      doc.setFont("Helvetica", "normal");
      doc.text(removeVietnameseTones(data.createdDate), 50, 82);

      doc.text(removeVietnameseTones("Tôi xin trình lên Ban Giám đốc phê duyệt nội dung sau:"), 20, 94);

      doc.setFont("Helvetica", "bold");
      doc.text(removeVietnameseTones(`Tiêu đề: ${data.title}`), 20, 102);
      doc.setFont("Helvetica", "normal");

      const wrappedContent = doc.splitTextToSize(removeVietnameseTones(data.proposalContent), 170);
      doc.text(wrappedContent, 20, 108);

      const nextY = 108 + (wrappedContent.length * 6);
      doc.text(removeVietnameseTones("Kính mong Ban Giám đốc xem xét và cho ý kiến chỉ đạo."), 20, nextY + 10);

      doc.setFont("Helvetica", "normal");
      doc.text(removeVietnameseTones(`Hà Nội, ngày ${data.createdDate?.split('/')[0] || '...'} tháng ${data.createdDate?.split('/')[1] || '...'} năm ${data.createdDate?.split('/')[2] || '...'}`), 160, nextY + 28, { align: "center" });
      doc.setFont("Helvetica", "bold");
      doc.text(removeVietnameseTones("NGƯỜI LẬP TỜ TRÌNH"), 160, nextY + 34, { align: "center" });
      doc.setFont("Helvetica", "normal");
      doc.text(removeVietnameseTones("(Ký, ghi rõ họ tên)"), 160, nextY + 39, { align: "center" });
    } else {
      fileName = `Phieu_chi_${(data.creatorName || 'Thanh_toan').trim().replace(/\s+/g, '_')}.pdf`;

      doc.setFontSize(11);
      doc.setFont("Helvetica", "bold");
      doc.text(removeVietnameseTones("CÔNG TY DMS APPROVAL HUB"), 20, 20);
      doc.setFont("Helvetica", "normal");
      doc.text(removeVietnameseTones("Mẫu số: 02 - TT"), 20, 26);

      doc.setFont("Helvetica", "bold");
      doc.text(removeVietnameseTones("Số phiếu: CHI-DMS"), 190, 20, { align: "right" });

      doc.setFontSize(15);
      doc.setFont("Helvetica", "bold");
      doc.text(removeVietnameseTones("PHIẾU CHI KIÊM BIÊN NHẬN"), 105, 45, { align: "center" });
      doc.setFontSize(10);
      doc.setFont("Helvetica", "normal");
      doc.text(removeVietnameseTones(`Ngày lập: ${data.createdDate}`), 105, 51, { align: "center" });

      doc.setFont("Helvetica", "bold");
      doc.text(removeVietnameseTones("- Họ và tên người nhận tiền:"), 20, 64);
      doc.setFont("Helvetica", "normal");
      doc.text(removeVietnameseTones(data.creatorName), 75, 64);

      doc.setFont("Helvetica", "bold");
      doc.text(removeVietnameseTones("- Email liên hệ:"), 20, 72);
      doc.setFont("Helvetica", "normal");
      doc.text(removeVietnameseTones(data.email), 55, 72);

      doc.setFont("Helvetica", "bold");
      doc.text(removeVietnameseTones("- Lý do chi / Nội dung nhận tiền:"), 20, 80);
      doc.setFont("Helvetica", "normal");

      const wrappedTitle = doc.splitTextToSize(removeVietnameseTones(data.title), 170);
      doc.text(wrappedTitle, 20, 86);

      const nextY = 86 + (wrappedTitle.length * 6);
      doc.setFont("Helvetica", "bold");
      doc.text(removeVietnameseTones(`- Số tiền chi trả: ${formatNumber(data.amount)} VNĐ`), 20, nextY + 4);
      doc.setFont("Helvetica", "normal");
      doc.text(removeVietnameseTones(`- Bằng chữ: ${data.amountInWords}`), 20, nextY + 10);

      // Signatures
      doc.setFont("Helvetica", "bold");
      doc.text(removeVietnameseTones("THỦ QUỸ CHI"), 50, nextY + 32, { align: "center" });
      doc.setFont("Helvetica", "normal");
      doc.text(removeVietnameseTones("(Ký và nhận đủ tiền)"), 50, nextY + 37, { align: "center" });

      doc.setFont("Helvetica", "bold");
      doc.text(removeVietnameseTones("NGƯỜI NHẬN TIỀN"), 160, nextY + 32, { align: "center" });
      doc.setFont("Helvetica", "normal");
      doc.text(removeVietnameseTones("(Ký, ghi rõ họ tên)"), 160, nextY + 37, { align: "center" });
    }

    const blob = doc.output('blob');
    return new File([blob], fileName, { type: 'application/pdf' });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setResult(null);

    // Validate inputs
    const errors = checkFormValidation();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return; // Stop right here, draw borders red without throwing alert text
    }

    setSubmitting(true);
    setValidationErrors({});

    try {
      let response;
      if (activeTab === 'UPLOAD') {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('email', uploadEmail);
        if (uploadDocType) {
          formData.append('docType', uploadDocType);
          formData.append('documentType', uploadDocType); // For backward compatibility
        }

        response = await fetch(`${API_BASE_URL}/start`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: formData
        });
      } else {
        // Case B: Generate from Template and upload file directly!
        const currentData = templateData[docType];
        const generatedFile = generateMockFileFromTemplate(docType, currentData);

        const formData = new FormData();
        formData.append('file', generatedFile);
        formData.append('email', currentData.email);
        formData.append('docType', docType);
        formData.append('documentType', docType); // For backward compatibility
        formData.append('templateData', JSON.stringify(currentData));

        response = await fetch(`${API_BASE_URL}/start`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: formData
        });
      }

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || payload.description || 'Lỗi khi khởi động quy trình');
      }

      setResult(payload);

      // Auto clear input data on successful process start
      if (activeTab === 'UPLOAD') {
        setFile(null);
        setUploadDocType('');
        setUploadEmail(user?.email || '');
      } else {
        setTemplateData(prev => ({
          ...prev,
          [docType]: getInitialTemplateData(user)[docType]
        }));
        setAiPrompt('');
        setAiStatus(null);
      }
    } catch (err) {
      setError(err.message || 'Lỗi không xác định');
    } finally {
      setSubmitting(false);
    }
  };

  const renderPreview = () => {
    if (docType === 'CONTRACT') {
      const current = templateData.CONTRACT;
      return (
        <div className="template-preview-pane">
          <div className="preview-header">
            <div className="preview-national-title">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
            <div className="preview-national-subtitle">Độc Lập - Tự Do - Hạnh Phúc</div>
            <div className="preview-divider"></div>
            <div className="preview-doc-title">HỢP ĐỒNG DỊCH VỤ THƯƠNG MẠI</div>
          </div>
          <div className="preview-body">
            <p className="preview-paragraph">
              Hôm nay, ngày <span className="preview-bold-label">{current.createdDate || '__/__/____'}</span>, tại văn phòng DMS Approval Hub.
            </p>
            <p className="preview-paragraph">
              Chúng tôi gồm các bên ký kết dưới đây:
            </p>
            <p className="preview-paragraph">
              <span className="preview-bold-label">BÊN A (Bên Đề Xuất):</span> {current.createdBy || '................................'}
            </p>
            <p className="preview-paragraph" style={{ paddingLeft: 16 }}>
              • Email liên hệ: {current.email || '................................'}
            </p>
            <p className="preview-paragraph">
              <span className="preview-bold-label">BÊN B (Đối Tác):</span> {current.partnerName || '................................'}
            </p>
            <p className="preview-paragraph" style={{ marginTop: 12 }}>
              Hai bên đồng ý ký kết hợp đồng dịch vụ thương mại với các điều khoản cụ thể sau:
            </p>
            <p className="preview-paragraph">
              <span className="preview-bold-label">Điều 1: Nội dung thỏa thuận dịch vụ</span>
              <br />
              Thực hiện công việc: {current.title || '................................................................'}
            </p>
            <p className="preview-paragraph">
              <span className="preview-bold-label">Điều 2: Giá trị hợp đồng & Phương thức thanh toán</span>
              <br />
              - Tổng giá trị hợp đồng: <span className="preview-bold-label">{current.amount ? formatNumber(current.amount) : '................'} VNĐ</span>
              <br />
              - Bằng chữ: <span style={{ fontStyle: 'italic' }}>{current.amountInWords || '................................................................'}</span>
            </p>
          </div>
          <div className="preview-signatures-row">
            <div className="preview-signature-col">
              <div className="preview-signature-title">ĐẠI DIỆN BÊN A</div>
              <div style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '0.75rem' }}>(Ký và ghi rõ họ tên)</div>
            </div>
            <div className="preview-signature-col">
              <div className="preview-signature-title">ĐẠI DIỆN BÊN B</div>
              <div style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '0.75rem' }}>(Ký và ghi rõ họ tên)</div>
            </div>
          </div>
        </div>
      );
    } else if (docType === 'PROPOSAL') {
      const current = templateData.PROPOSAL;
      return (
        <div className="template-preview-pane">
          <div className="preview-header" style={{ textAlign: 'left' }}>
            <div className="preview-national-title" style={{ fontSize: '0.8rem' }}>CÔNG TY DMS APPROVAL HUB</div>
            <div className="preview-national-subtitle" style={{ fontSize: '0.75rem' }}>Số: ..... / TTr - DMS</div>
            <div style={{ borderBottom: '1px solid #1f2937', width: '80px', marginTop: 4 }}></div>
            <div className="preview-doc-title" style={{ marginTop: 24, textAlign: 'center' }}>TỜ TRÌNH PHÊ DUYỆT</div>
          </div>
          <div className="preview-body">
            <p className="preview-paragraph" style={{ textAlign: 'center', fontStyle: 'italic', marginBottom: 20 }}>
              Kính gửi: Ban Giám đốc Công ty DMS Approval Hub
            </p>
            <p className="preview-paragraph">
              <span className="preview-bold-label">Người đề xuất:</span> {current.createdBy || '................................'}
            </p>
            <p className="preview-paragraph">
              <span className="preview-bold-label">Email liên hệ:</span> {current.email || '................................'}
            </p>
            <p className="preview-paragraph">
              <span className="preview-bold-label">Ngày đề xuất:</span> {current.createdDate || '__/__/____'}
            </p>
            <p className="preview-paragraph" style={{ marginTop: 16 }}>
              Tôi xin trình lên Ban Giám đốc phê duyệt nội dung sau:
            </p>
            <div className="preview-paragraph" style={{ fontStyle: 'italic', whiteSpace: 'pre-wrap', padding: '12px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb', color: '#374151' }}>
              {current.title ? `Tiêu đề: ${current.title}\n\n` : ''}
              {current.proposalContent || '................................................................................................................................................................................................................................................................'}
            </div>
            <p className="preview-paragraph" style={{ marginTop: 16 }}>
              Kính mong Ban Giám đốc xem xét và cho ý kiến chỉ đạo.
            </p>
          </div>
          <div className="preview-signatures-row" style={{ justifyContent: 'flex-end' }}>
            <div className="preview-signature-col" style={{ flex: 'none', width: '200px' }}>
              <div style={{ fontSize: '0.78rem', fontStyle: 'italic', marginBottom: 4 }}>Hà Nội, ngày {current.createdDate?.split('/')[0] || '...'} tháng {current.createdDate?.split('/')[1] || '...'} năm {current.createdDate?.split('/')[2] || '...'}</div>
              <div className="preview-signature-title">NGƯỜI LẬP TỜ TRÌNH</div>
              <div style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '0.75rem' }}>(Ký và ghi rõ họ tên)</div>
            </div>
          </div>
        </div>
      );
    } else {
      const current = templateData.RECEIPT;
      return (
        <div className="template-preview-pane">
          <div className="preview-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', textAlign: 'left', marginBottom: 16 }}>
            <div>
              <div className="preview-national-title" style={{ fontSize: '0.78rem' }}>CÔNG TY DMS APPROVAL HUB</div>
              <div style={{ fontSize: '0.7rem', color: '#4b5563' }}>Mẫu số: 02 - TT</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="preview-national-title" style={{ fontSize: '0.78rem' }}>Quyển số: .........</div>
              <div style={{ fontSize: '0.75rem', color: '#4b5563' }}>Số phiếu: CHI-......</div>
            </div>
          </div>
          <div className="preview-doc-title">PHIẾU CHI KIÊM BIÊN NHẬN</div>
          <div className="preview-body">
            <div className="preview-paragraph" style={{ textAlign: 'center', fontSize: '0.8rem', fontStyle: 'italic', marginBottom: 16 }}>
              Ngày thanh toán: {current.createdDate || '__/__/____'}
            </div>
            <p className="preview-paragraph">
              - <span className="preview-bold-label">Họ và tên người nhận tiền:</span> {current.creatorName || '................................'}
            </p>
            <p className="preview-paragraph">
              - <span className="preview-bold-label">Email liên hệ:</span> {current.email || '................................'}
            </p>
            <div className="preview-paragraph">
              - <span className="preview-bold-label">Lý do chi / Nội dung nhận tiền:</span>
              <br />
              {current.title || '................................................................................................................................'}
            </div>
            <p className="preview-paragraph">
              - <span className="preview-bold-label">Số tiền chi trả:</span> <span className="preview-bold-label">{current.amount ? formatNumber(current.amount) : '................'} VNĐ</span>
            </p>
            <p className="preview-paragraph">
              - <span className="preview-bold-label">Bằng chữ:</span> <span style={{ fontStyle: 'italic' }}>{current.amountInWords || '................................................................................................................................'}</span>
            </p>
          </div>
          <div className="preview-signatures-row">
            <div className="preview-signature-col">
              <div className="preview-signature-title">THỦ QUỸ CHI</div>
              <div style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '0.75rem' }}>(Ký và nhận đủ tiền)</div>
            </div>
            <div className="preview-signature-col">
              <div className="preview-signature-title">NGƯỜI NHẬN TIỀN</div>
              <div style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '0.75rem' }}>(Ký và ghi rõ họ tên)</div>
            </div>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="panel-card wide-card">
      <style>{`
        .start-task-tabs {
          display: flex;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 18px;
          padding: 6px;
          gap: 8px;
          margin-bottom: 28px;
        }
        .start-task-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32px;
          align-items: start;
        }
        @media (max-width: 1024px) {
          .start-task-container {
            grid-template-columns: 1fr;
            gap: 24px;
          }
        }
        .template-inputs-pane {
          display: flex;
          flex-direction: column;
        }
        .template-preview-pane {
          position: sticky;
          top: 24px;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 32px;
          color: #1f2937;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
          font-family: "Times New Roman", Times, serif;
          line-height: 1.5;
          min-height: 580px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .preview-header {
          text-align: center;
          margin-bottom: 24px;
        }
        .preview-national-title {
          font-weight: bold;
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 2px;
          color: #111827;
        }
        .preview-national-subtitle {
          font-size: 0.8rem;
          margin-bottom: 8px;
          color: #374151;
        }
        .preview-divider {
          width: 120px;
          height: 1px;
          background: #1f2937;
          margin: 0 auto 16px;
        }
        .preview-doc-title {
          font-size: 1.15rem;
          font-weight: bold;
          text-align: center;
          text-transform: uppercase;
          margin-bottom: 20px;
          color: #111827;
        }
        .preview-body {
          font-size: 0.9rem;
          flex: 1;
          color: #1f2937;
        }
        .preview-paragraph {
          margin-bottom: 12px;
          text-align: justify;
          color: #1f2937;
        }
        .preview-bold-label {
          font-weight: bold;
          color: #111827;
        }
        .preview-signatures-row {
          display: flex;
          justify-content: space-between;
          margin-top: 36px;
          border-top: 1px dashed #e5e7eb;
          padding-top: 20px;
        }
        .preview-signature-col {
          flex: 1;
          text-align: center;
          font-size: 0.85rem;
        }
        .preview-signature-title {
          font-weight: bold;
          margin-bottom: 50px;
          color: #111827;
        }
        .start-task-tab-btn {
          flex: 1;
          padding: 14px 20px;
          border-radius: 14px;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        .start-task-tab-btn:hover {
          color: var(--text);
          background: rgba(255, 255, 255, 0.03);
        }
        .start-task-tab-btn.active {
          background: var(--accent);
          color: #ffffff;
          box-shadow: 0 8px 24px var(--accent-soft);
        }
        .form-stable-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px 24px;
          align-items: start;
        }
        .form-grid-span-2 {
          grid-column: 1 / -1;
        }
        .form-control-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .form-control-group label {
          font-size: 0.85rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--text-secondary);
        }
        .required-star {
          color: #ff6b7a;
          margin-left: 4px;
          font-weight: bold;
        }
        .form-input-field {
          min-height: 48px;
          width: 100%;
          padding: 12px 16px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(8, 15, 29, 0.75);
          color: var(--text);
          outline: none;
          font-size: 0.95rem;
          transition: all 0.25s ease;
        }
        .form-input-field:focus {
          border-color: rgba(102, 126, 234, 0.55);
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.18);
          background: rgba(8, 15, 29, 0.9);
        }
        .form-input-field::placeholder {
          color: rgba(255, 255, 255, 0.35);
        }
        
        /* Error state border and glow styling */
        .form-input-field.input-error {
          border-color: #ff6b7a !important;
          box-shadow: 0 0 0 3px rgba(245, 87, 108, 0.2) !important;
        }
        .file-picker-row.file-picker-error {
          border: 1px solid #ff6b7a !important;
          border-radius: 18px;
          padding: 8px;
          background: rgba(245, 87, 108, 0.04);
        }
        
        select.form-input-field {
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          padding-right: 44px;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23a8b5d1' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 16px center;
          background-size: 16px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        select.form-input-field:hover {
          border-color: rgba(255, 255, 255, 0.22);
          background-color: rgba(14, 22, 45, 0.85);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        }
        select.form-input-field:focus {
          border-color: rgba(102, 126, 234, 0.65);
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.22);
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%238b9dff' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
        }
        select.form-input-field option {
          background-color: #0d1527;
          color: #f0f4ff;
          padding: 12px;
          font-size: 0.95rem;
        }

        .form-textarea-field {
          grid-column: 1 / -1;
          min-height: 140px;
          resize: vertical;
        }
        .template-selector-container {
          padding: 20px;
          border-radius: 24px;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%);
          border: 1px solid rgba(255, 255, 255, 0.08);
          margin-bottom: 28px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
        }
        .pulse-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 4px 10px;
          border-radius: 99px;
          background: rgba(102, 126, 234, 0.15);
          color: #8b9dff;
          width: fit-content;
        }
        .pulse-dot {
          width: 6px;
          height: 6px;
          background-color: #8b9dff;
          border-radius: 50%;
          box-shadow: 0 0 0 0 rgba(139, 157, 255, 0.7);
          animation: pulse-ring 1.8s infinite;
        }
        @keyframes pulse-ring {
          0% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(139, 157, 255, 0.7);
          }
          70% {
            transform: scale(1);
            box-shadow: 0 0 0 6px rgba(139, 157, 255, 0);
          }
          100% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(139, 157, 255, 0);
          }
        }
        
        .ai-autofill-box {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.07) 0%, rgba(110, 100, 255, 0.02) 100%);
          border: 1px dashed rgba(102, 126, 234, 0.35);
          border-radius: 20px;
          padding: 20px;
          margin-bottom: 28px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          transition: all 0.3s ease;
        }
        .ai-autofill-box:hover {
          border-color: rgba(102, 126, 234, 0.6);
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.09) 0%, rgba(110, 100, 255, 0.03) 100%);
        }
        .ai-autofill-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .ai-autofill-title {
          font-weight: 700;
          font-size: 0.95rem;
          color: #8b9dff;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .ai-autofill-input-row {
          display: flex;
          gap: 12px;
        }
        @media (max-width: 640px) {
          .ai-autofill-input-row {
            flex-direction: column;
          }
          .ai-autofill-input-row button {
            width: 100%;
          }
        }
        .ai-autofill-btn {
          min-height: 48px;
          padding: 0 20px;
          border-radius: 14px;
          background: var(--accent-2, var(--accent));
          color: white;
          font-weight: 700;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 4px 15px var(--glow-2);
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          border: 1px solid rgba(255, 255, 255, 0.1);
          cursor: pointer;
          white-space: nowrap;
        }
        .ai-autofill-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px var(--glow-2);
          filter: brightness(1.05);
        }
        .ai-autofill-btn:active:not(:disabled) {
          transform: translateY(0);
        }
        .ai-autofill-btn:disabled {
          background: var(--surface-strong);
          color: var(--muted);
          border-color: var(--border);
          box-shadow: none;
          cursor: not-allowed;
          opacity: 0.6;
        }
        .ai-badge {
          background: var(--accent-soft);
          color: var(--text);
          font-size: 0.7rem;
          font-weight: 800;
          padding: 3px 8px;
          border-radius: 6px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
        .ai-status-msg {
          font-size: 0.85rem;
          padding: 10px 14px;
          border-radius: 10px;
          margin-top: 4px;
          animation: slideDown 0.3s ease;
        }
        .ai-status-msg.success {
          background: rgba(70, 214, 169, 0.1);
          color: #46d6a9;
          border: 1px solid rgba(70, 214, 169, 0.2);
        }
        .ai-status-msg.error {
          background: rgba(245, 87, 108, 0.1);
          color: #ff6b7a;
          border: 1px solid rgba(245, 87, 108, 0.2);
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 640px) {
          .form-stable-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          .form-grid-span-2 {
            grid-column: span 1;
          }
        }
      `}</style>

      <div className="panel-header">
        <div>
          <h3>Khởi tạo hồ sơ</h3>
          <p>Lựa chọn phương thức gửi tài liệu trực tiếp hoặc tự động sinh tài liệu theo biểu mẫu chuẩn.</p>
        </div>
      </div>

      <div className="start-task-tabs">
        <button
          type="button"
          className={`start-task-tab-btn ${activeTab === 'UPLOAD' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('UPLOAD');
            setResult(null);
            setError(null);
            setAiStatus(null);
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Tự tải tài liệu lên
        </button>
        <button
          type="button"
          className={`start-task-tab-btn ${activeTab === 'TEMPLATE' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('TEMPLATE');
            setResult(null);
            setError(null);
            setAiStatus(null);
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          Sinh theo biểu mẫu
        </button>
      </div>

      <form onSubmit={handleSubmit} className="doc-card" noValidate>
        {activeTab === 'UPLOAD' ? (
          <div className="form-stable-grid">
            <div className="form-control-group form-grid-span-2">
              <label htmlFor="task-file">Chọn tài liệu (PDF, Word, ...) <span className="required-star">*</span></label>
              <div className={`file-picker-row ${validationErrors.file ? 'file-picker-error' : ''}`}>
                <label htmlFor="task-file" className="file-button">
                  Chọn tệp tin
                </label>
                <div className="file-name">{file?.name || 'Chưa chọn tài liệu'}</div>
              </div>
              <input
                id="task-file"
                type="file"
                onChange={handleFileChange}
                className="file-input"
              />
            </div>

            <div className="form-control-group">
              <label htmlFor="upload-email">Email liên hệ / người lập <span className="required-star">*</span></label>
              <input
                id="upload-email"
                className={`form-input-field ${validationErrors.uploadEmail ? 'input-error' : ''}`}
                type="email"
                placeholder="Ví dụ: email@domain.com"
                value={uploadEmail}
                onChange={(e) => {
                  setUploadEmail(e.target.value);
                  setValidationErrors(prev => ({ ...prev, uploadEmail: false }));
                }}
              />
            </div>

             <div className="form-control-group">
               <label htmlFor="upload-doc-type">Loại hồ sơ (Không bắt buộc)</label>
               <Select
                 id="upload-doc-type"
                 size="large"
                 style={{ width: '100%' }}
                 value={uploadDocType}
                 onChange={(val) => setUploadDocType(val)}
                 placeholder="-- Tự động nhận diện / Không phân loại --"
                 options={[
                   { value: '', label: '-- Tự động nhận diện / Không phân loại --' },
                   { value: 'CONTRACT', label: 'Hợp đồng (Contract)' },
                   { value: 'PROPOSAL', label: 'Tờ trình (Proposal)' },
                   { value: 'RECEIPT', label: 'Biên nhận (Receipt)' }
                 ]}
               />
             </div>

            <div className="form-control-group form-grid-span-2">
              <label>Trạng thái file</label>
              <div style={{ minHeight: '40px', display: 'flex', alignItems: 'center' }} className="doc-value">
                {file ? `✓ Sẵn sàng gửi (${(file.size / 1024).toFixed(1)} KB)` : '⚠️ Hãy chọn một tệp tin'}
              </div>
            </div>
          </div>
        ) : (
          <div className="start-task-container">
            <div className="template-inputs-pane">
              <div className="template-selector-container">
                <div className="pulse-badge">
                  <span className="pulse-dot"></span>
                  Hệ thống tự động điền mẫu dữ liệu (.docx)
                </div>
                <div className="form-control-group">
                  <label htmlFor="template-doc-type">Lựa chọn Mẫu văn bản</label>
                  <Select
                    id="template-doc-type"
                    size="large"
                    style={{ width: '100%' }}
                    value={docType}
                    onChange={(val) => {
                      setDocType(val);
                      setAiStatus(null);
                      setValidationErrors({});
                    }}
                    options={[
                      { value: 'CONTRACT', label: 'Mẫu Hợp đồng (CONTRACT)' },
                      { value: 'PROPOSAL', label: 'Mẫu Tờ trình (PROPOSAL)' },
                      { value: 'RECEIPT', label: 'Mẫu Biên nhận (RECEIPT)' }
                    ]}
                  />
                </div>
              </div>

              {/* AI Assistant Auto-Fill Box */}
              <div className="ai-autofill-box">
                <div className="ai-autofill-header">
                  <div className="ai-autofill-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: '#8b9dff' }}>
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                    <span>AI Trợ lý Điền Nhanh</span>
                    <span className="ai-badge">Gemini</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Mẫu: {docType}
                  </div>
                </div>

                <div className="ai-autofill-input-row">
                  <input
                    type="text"
                    className="form-input-field"
                    style={{ flex: 1 }}
                    placeholder={
                      docType === 'CONTRACT'
                        ? 'Ví dụ: Hợp đồng hợp tác công nghệ với FPT trị giá 300 triệu do Nguyễn Văn A ký ngày 25/06/2026'
                        : docType === 'PROPOSAL'
                        ? 'Ví dụ: Tờ trình đề xuất mua 5 laptop Dell phục vụ dự án do Trần Văn B lập ngày hôm nay'
                        : 'Ví dụ: Tạm ứng tiền chi phí công tác Đà Nẵng 15 triệu cho Nguyễn Văn C ngày hôm qua'
                    }
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    disabled={aiLoading}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAiAutoFill();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="ai-autofill-btn"
                    onClick={handleAiAutoFill}
                    disabled={aiLoading}
                  >
                    {aiLoading ? (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="loading-spinner" style={{ animation: 'spin 1s linear infinite' }}>
                          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                        Đang phân tích...
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                        </svg>
                        AI Điền nhanh
                      </>
                    )}
                  </button>
                </div>

                {aiStatus && (
                  <div className={`ai-status-msg ${aiStatus.type}`}>
                    {aiStatus.message}
                  </div>
                )}
              </div>

              <div className="form-stable-grid">
                {docType === 'CONTRACT' && (
                  <>
                    <div className="form-control-group form-grid-span-2">
                      <label htmlFor="c-title">Tên hợp đồng (title) <span className="required-star">*</span></label>
                      <input
                        id="c-title"
                        className={`form-input-field ${validationErrors.title ? 'input-error' : ''}`}
                        type="text"
                        placeholder="Ví dụ: Hợp đồng Hợp tác Công nghệ"
                        value={templateData.CONTRACT.title}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                      />
                    </div>
                    <div className="form-control-group">
                      <label htmlFor="c-createdDate">Ngày tạo hợp đồng (createdDate) <span className="required-star">*</span></label>
                      <input
                        id="c-createdDate"
                        className={`form-input-field ${validationErrors.createdDate ? 'input-error' : ''}`}
                        type="text"
                        placeholder="Định dạng: DD/MM/YYYY"
                        value={templateData.CONTRACT.createdDate}
                        onChange={(e) => handleInputChange('createdDate', e.target.value)}
                      />
                    </div>
                    <div className="form-control-group">
                      <label htmlFor="c-createdBy">Người lập hợp đồng (createdBy) <span className="required-star">*</span></label>
                      <input
                        id="c-createdBy"
                        className={`form-input-field ${validationErrors.createdBy ? 'input-error' : ''}`}
                        type="text"
                        placeholder="Ví dụ: Nguyen Van A"
                        value={templateData.CONTRACT.createdBy}
                        onChange={(e) => handleInputChange('createdBy', e.target.value)}
                      />
                    </div>
                    <div className="form-control-group">
                      <label htmlFor="c-partnerName">Tên đối tác ký kết (partnerName) <span className="required-star">*</span></label>
                      <input
                        id="c-partnerName"
                        className={`form-input-field ${validationErrors.partnerName ? 'input-error' : ''}`}
                        type="text"
                        placeholder="Ví dụ: Công ty TNHH Giải pháp ABC"
                        value={templateData.CONTRACT.partnerName}
                        onChange={(e) => handleInputChange('partnerName', e.target.value)}
                      />
                    </div>
                    <div className="form-control-group">
                      <label htmlFor="c-amount">Giá trị hợp đồng VNĐ (amount) <span className="required-star">*</span></label>
                      <input
                        id="c-amount"
                        className={`form-input-field ${validationErrors.amount ? 'input-error' : ''}`}
                        type="text"
                        placeholder="Ví dụ: 250.000.000"
                        value={formatNumber(templateData.CONTRACT.amount)}
                        onChange={(e) => {
                          const rawValue = e.target.value.replace(/\D/g, '');
                          handleInputChange('amount', rawValue);
                        }}
                      />
                    </div>
                    <div className="form-control-group">
                      <label htmlFor="c-email">Email người lập <span className="required-star">*</span></label>
                      <input
                        id="c-email"
                        className={`form-input-field ${validationErrors.email ? 'input-error' : ''}`}
                        type="email"
                        placeholder="Ví dụ: email@domain.com"
                        value={templateData.CONTRACT.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                      />
                    </div>
                    <div className="form-control-group form-grid-span-2">
                      <label htmlFor="c-amountInWords">Số tiền bằng chữ (amountInWords)</label>
                      <input
                        id="c-amountInWords"
                        className="form-input-field"
                        type="text"
                        style={{ background: 'rgba(255, 255, 255, 0.02)', color: 'var(--text-secondary)', cursor: 'not-allowed' }}
                        placeholder="Tự động tính từ số tiền..."
                        value={templateData.CONTRACT.amountInWords}
                        disabled
                      />
                    </div>
                  </>
                )}

                {docType === 'PROPOSAL' && (
                  <>
                    <div className="form-control-group form-grid-span-2">
                      <label htmlFor="p-title">Tiêu đề tờ trình (title) <span className="required-star">*</span></label>
                      <input
                        id="p-title"
                        className={`form-input-field ${validationErrors.title ? 'input-error' : ''}`}
                        type="text"
                        placeholder="Ví dụ: Tờ trình phê duyệt mua sắm thiết bị"
                        value={templateData.PROPOSAL.title}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                      />
                    </div>
                    <div className="form-control-group">
                      <label htmlFor="p-createdDate">Ngày đề xuất (createdDate) <span className="required-star">*</span></label>
                      <input
                        id="p-createdDate"
                        className={`form-input-field ${validationErrors.createdDate ? 'input-error' : ''}`}
                        type="text"
                        placeholder="Định dạng: DD/MM/YYYY"
                        value={templateData.PROPOSAL.createdDate}
                        onChange={(e) => handleInputChange('createdDate', e.target.value)}
                      />
                    </div>
                    <div className="form-control-group">
                      <label htmlFor="p-createdBy">Người đề xuất (createdBy) <span className="required-star">*</span></label>
                      <input
                        id="p-createdBy"
                        className={`form-input-field ${validationErrors.createdBy ? 'input-error' : ''}`}
                        type="text"
                        placeholder="Ví dụ: Nguyen Van B"
                        value={templateData.PROPOSAL.createdBy}
                        onChange={(e) => handleInputChange('createdBy', e.target.value)}
                      />
                    </div>
                    <div className="form-control-group">
                      <label htmlFor="p-email">Email người đề xuất <span className="required-star">*</span></label>
                      <input
                        id="p-email"
                        className={`form-input-field ${validationErrors.email ? 'input-error' : ''}`}
                        type="email"
                        placeholder="Ví dụ: email@domain.com"
                        value={templateData.PROPOSAL.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                      />
                    </div>
                    <div className="form-control-group form-grid-span-2">
                      <label htmlFor="p-proposalContent">Nội dung chi tiết tờ trình (proposalContent) <span className="required-star">*</span></label>
                      <textarea
                        id="p-proposalContent"
                        className={`form-input-field form-textarea-field ${validationErrors.proposalContent ? 'input-error' : ''}`}
                        placeholder="Nêu rõ lý do, nội dung đề xuất và các phương án phê duyệt..."
                        value={templateData.PROPOSAL.proposalContent}
                        onChange={(e) => handleInputChange('proposalContent', e.target.value)}
                      />
                    </div>
                  </>
                )}

                {docType === 'RECEIPT' && (
                  <>
                    <div className="form-control-group form-grid-span-2">
                      <label htmlFor="r-title">Lý do chi / Nội dung nhận tiền (title) <span className="required-star">*</span></label>
                      <input
                        id="r-title"
                        className={`form-input-field ${validationErrors.title ? 'input-error' : ''}`}
                        type="text"
                        placeholder="Ví dụ: Thanh toán tạm ứng chi phí công tác"
                        value={templateData.RECEIPT.title}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                      />
                    </div>
                    <div className="form-control-group">
                      <label htmlFor="r-createdDate">Ngày thanh toán (createdDate) <span className="required-star">*</span></label>
                      <input
                        id="r-createdDate"
                        className={`form-input-field ${validationErrors.createdDate ? 'input-error' : ''}`}
                        type="text"
                        placeholder="Định dạng: DD/MM/YYYY"
                        value={templateData.RECEIPT.createdDate}
                        onChange={(e) => handleInputChange('createdDate', e.target.value)}
                      />
                    </div>
                    <div className="form-control-group">
                      <label htmlFor="r-creatorName">Người nhận tiền / Thụ hưởng (creatorName) <span className="required-star">*</span></label>
                      <input
                        id="r-creatorName"
                        className={`form-input-field ${validationErrors.creatorName ? 'input-error' : ''}`}
                        type="text"
                        placeholder="Ví dụ: Nguyen Van C"
                        value={templateData.RECEIPT.creatorName}
                        onChange={(e) => handleInputChange('creatorName', e.target.value)}
                      />
                    </div>
                    <div className="form-control-group">
                      <label htmlFor="r-amount">Số tiền thanh toán VNĐ (amount) <span className="required-star">*</span></label>
                      <input
                        id="r-amount"
                        className={`form-input-field ${validationErrors.amount ? 'input-error' : ''}`}
                        type="text"
                        placeholder="Ví dụ: 15.000.000"
                        value={formatNumber(templateData.RECEIPT.amount)}
                        onChange={(e) => {
                          const rawValue = e.target.value.replace(/\D/g, '');
                          handleInputChange('amount', rawValue);
                        }}
                      />
                    </div>
                    <div className="form-control-group">
                      <label htmlFor="r-email">Email người lập <span className="required-star">*</span></label>
                      <input
                        id="r-email"
                        className={`form-input-field ${validationErrors.email ? 'input-error' : ''}`}
                        type="email"
                        placeholder="Ví dụ: email@domain.com"
                        value={templateData.RECEIPT.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                      />
                    </div>
                    <div className="form-control-group form-grid-span-2">
                      <label htmlFor="r-amountInWords">Số tiền bằng chữ (amountInWords)</label>
                      <input
                        id="r-amountInWords"
                        className="form-input-field"
                        type="text"
                        style={{ background: 'rgba(255, 255, 255, 0.02)', color: 'var(--text-secondary)', cursor: 'not-allowed' }}
                        placeholder="Tự động tính từ số tiền..."
                        value={templateData.RECEIPT.amountInWords}
                        disabled
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Right side: Real-time Printed Document Preview */}
            {renderPreview()}
          </div>
        )}

        <div style={{ marginTop: 28, display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <button type="submit" className="action-button" disabled={submitting}>
            {submitting ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="loading-spinner" style={{ animation: 'spin 1s linear infinite' }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                Đang xử lý khởi tạo...
              </span>
            ) : (
              activeTab === 'UPLOAD' ? 'Khởi tạo bằng tài liệu tải lên' : 'Tạo và Khởi chạy Quy trình'
            )}
          </button>

          <button
            type="button"
            className="action-button secondary"
            onClick={handleClearData}
            disabled={submitting}
          >
            Xóa dữ liệu nhập
          </button>
        </div>
      </form>

      {error && (
        <div className="task-error" style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div>
            <strong>Lỗi thực thi:</strong> {error}
          </div>
        </div>
      )}

      {result && (
        <div className="doc-card" style={{ marginTop: 24, borderLeft: '5px solid #46d6a9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#46d6a9" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <h4 style={{ margin: 0, color: '#46d6a9' }}>Khởi tạo quy trình thành công</h4>
          </div>

          <div className="form-stable-grid">
            <div>
              <div className="doc-label">Mã tiến trình (Process Instance ID)</div>
              <div className="doc-value" style={{ fontFamily: 'monospace', background: 'rgba(255,255,255,0.04)', padding: '6px 10px', borderRadius: '8px' }}>
                {result.data?.processInstanceId || result.processInstanceId || result.data?.id || result.id || 'N/A'}
              </div>
            </div>
            <div>
              <div className="doc-label">Mã định nghĩa quy trình (Definition ID)</div>
              <div className="doc-value" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {result.data?.definitionId || result.definitionId || 'N/A'}
              </div>
            </div>
            <div>
              <div className="doc-label">Loại tài liệu</div>
              <div className="doc-value">
                <span className="role-chip" style={{ border: '1px solid rgba(70, 214, 169, 0.3)', color: '#46d6a9', background: 'rgba(70, 214, 169, 0.05)' }}>
                  {result.data?.documentType || result.data?.docType || result.documentType || result.docType || docType}
                </span>
              </div>
            </div>
            <div>
              <div className="doc-label">Thông báo hệ thống</div>
              <div className="doc-value" style={{ color: 'var(--text-secondary)' }}>
                {result.data?.message || result.message || 'Khởi tạo tiến trình thành công'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StartTask;
