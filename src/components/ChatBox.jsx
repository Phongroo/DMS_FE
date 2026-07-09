import { useState, useRef, useEffect } from 'react';
import '../styles/chatbox.css';

/**
 * AI Assistant Chat Widget Component.
 * Supports direct message submissions to an LLM back-end proxy with auto-scrolling log timeline.
 * 
 * @component
 * @param {Object} props - Component properties.
 * @param {string} props.token - JWT token credential used to authorize API calls against chat endpoints.
 * @returns {React.ReactElement} The chatbot toggle button and window.
 */
function ChatBox({ token }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: 'Xin chào! Tôi là AI Assistant. Hãy giúp tôi nếu bạn cần hỗ trợ gì.',
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showTimeout, setShowTimeout] = useState(false);
  const messagesEndRef = useRef(null);
  const timeoutRef = useRef(null);

  const AI_CHAT = 'http://localhost:30080/api/chat';

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    // Add user message
    const userMessage = {
      id: Date.now(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date()
    };

    const messageText = inputValue;
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setShowTimeout(false);

    // Set timeout warning after 5 seconds
    timeoutRef.current = setTimeout(() => {
      setShowTimeout(true);
    }, 5000);

    try {
        console.log('Sending message to AI:', token, messageText);
 
      // Call API endpoint instead of socket
          const response = await fetch(`${AI_CHAT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : undefined
        },
        body: JSON.stringify({
          message: messageText
        })
      });

      // Clear timeout when response arrives
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(`API error: ${response.status} ${errorBody?.message || response.statusText}`);
      }

      const result = await response.json();
      const aiText = result?.data?.message || result?.message || 'Xin lỗi, AI không trả về nội dung.';

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          text: aiText,
          sender: 'ai',
          timestamp: new Date()
        }
      ]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          text: 'Xin lỗi, có lỗi xảy ra khi kết nối. Vui lòng thử lại sau.',
          sender: 'ai',
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsLoading(false);
      setShowTimeout(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="chatbox-container">
      {/* Chat Window */}
      <div className={`chatbox-window ${isOpen ? 'open' : 'closed'}`}>
        <div className="chatbox-header">
          <h3>AI Assistant</h3>
          <button className="chatbox-close" onClick={toggleChat}>
            ×
          </button>
        </div>

        <div className="chatbox-messages">
          {messages.map((msg) => (
            <div key={msg.id} className={`message ${msg.sender}`}>
              <div className="message-content">
                <p>{msg.text}</p>
                <span className="message-time">{formatTime(msg.timestamp)}</span>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="message ai">
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                {showTimeout && (
                  <span className="timeout-notice">Đang xử lý... (có thể mất thêm chút thời gian)</span>
                )}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chatbox-input-area">
          <textarea
            className="chatbox-input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Nhập tin nhắn của bạn..."
            rows="2"
          />
          <button
            className="chatbox-send"
            onClick={handleSendMessage}
            disabled={isLoading}
          >
            Gửi
          </button>
        </div>
      </div>

      {/* Chat Button */}
      {!isOpen && (
        <button className="chatbox-toggle" onClick={toggleChat}>
          💬
        </button>
      )}
    </div>
  );
}

export default ChatBox;
