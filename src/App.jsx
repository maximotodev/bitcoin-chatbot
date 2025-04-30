import React, { useState, useRef, useEffect } from "react";
// import './App.css'; // We'll use inline styles for simplicity here
import ReactMarkdown from "react-markdown"; // Import ReactMarkdown
import remarkGfm from "remark-gfm"; // Import the GFM plugin

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatBoxRef = useRef(null);

  // Scroll to the bottom when messages change or loading state changes
  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleInputChange = (event) => {
    setInput(event.target.value);
  };

  const handleSendMessage = async (event) => {
    event.preventDefault();

    const userQuestion = input.trim();
    if (!userQuestion || isLoading) {
      return;
    }

    const userMessage = { type: "user", text: userQuestion };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL + "/ask";
      if (!apiUrl || apiUrl === "/ask") {
        throw new Error("API URL is not configured.");
      }

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: userQuestion,
          history: [...messages, userMessage],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${
            errorData.error || response.statusText
          }`
        );
      }

      const data = await response.json();
      const botResponse = { type: "bot", text: data.answer };

      setMessages((prevMessages) => [...prevMessages, botResponse]);
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prevMessages) => [
        ...prevMessages,
        { type: "bot", text: `Error: ${error.message}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-container">
      <h1>Bitcoin Chatbot</h1>
      <div className="chat-box" ref={chatBoxRef}>
        {messages.length === 0 ? (
          <div
            style={{ textAlign: "center", color: "#666", marginTop: "20px" }}
          >
            Ask me anything about Bitcoin!
          </div>
        ) : (
          messages.map((message, index) => (
            <div key={index} className={`message ${message.type}-message`}>
              <strong>{message.type === "user" ? "You" : "Chatbot"}:</strong>
              {/* Conditionally render Markdown only for bot messages */}
              {message.type === "bot" ? (
                // Use ReactMarkdown to render bot message text
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.text}
                </ReactMarkdown>
              ) : (
                // Display user message as plain text
                message.text
              )}
            </div>
          ))
        )}
        {isLoading && (
          <div className="message bot-message loading-message">
            <strong>Chatbot:</strong> Thinking...
          </div>
        )}
      </div>

      <form onSubmit={handleSendMessage}>
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          placeholder="Ask me about Bitcoin..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? "..." : "Ask"}
        </button>
      </form>

      <p className="disclaimer">
        Note: This chatbot specializes in Bitcoin and cannot provide financial
        advice.
      </p>

      {/* Basic Styling Block - Add styles for Markdown elements here if needed */}
      <style>{`
           body {
               font-family: sans-serif;
               line-height: 1.6;
               margin: 0;
               background-color: #f4f4f4;
               color: #333;
           }
           .chat-container {
               max-width: 800px;
               margin: 20px auto;
               background-color: #fff;
               padding: 20px;
               border-radius: 8px;
               box-shadow: 0 2px 5px rgba(0,0,0,0.1);
               display: flex;
               flex-direction: column;
               height: 90vh;
               box-sizing: border-box;
           }
           h1 {
               text-align: center;
               color: #f7931a; /* Bitcoin orange */
               margin-top: 0;
               margin-bottom: 20px;
           }
           .chat-box {
               flex-grow: 1;
               border: 1px solid #eee;
               padding: 15px;
               margin-bottom: 15px;
               border-radius: 5px;
               overflow-y: auto;
               display: flex;
               flex-direction: column;
               padding-bottom: 15px;
           }
           .message {
               margin-bottom: 10px;
               padding: 10px;
               border-radius: 8px;
               max-width: 80%;
               word-wrap: break-word;
           }
           .user-message {
               align-self: flex-end;
               background-color: #e1ffc7;
           }
           .bot-message {
               align-self: flex-start;
               background-color: #cce5ff;
           }
            .message strong {
                display: block;
                margin-bottom: 3px;
            }
            .loading-message {
                font-style: italic;
                color: #555;
            }
           form {
               display: flex;
               margin-top: auto;
               padding-top: 15px;
               border-top: 1px solid #eee;
           }
           input[type="text"] {
               flex-grow: 1;
               padding: 10px;
               margin-right: 10px;
               border: 1px solid #ccc;
               border-radius: 4px;
               font-size: 1em;
           }
           button {
               padding: 10px 20px;
               background-color: #f7931a;
               color: white;
               border: none;
               border-radius: 4 occupiers;
               cursor: pointer;
               font-size: 1em;
           }
           button:disabled {
               background-color: #cccccc;
               cursor: not-allowed;
           }
           button:hover:not(:disabled) {
               background-color: #e08516;
           }
            .disclaimer {
               margin-top: 15px;
               text-align: center;
               font-size: 0.8em;
               color: #666;
           }

           /* --- Add basic styles for Markdown elements within bot messages --- */
           .bot-message p { margin-bottom: 0.5em; } /* Space out paragraphs */
           .bot-message ul, .bot-message ol { margin-bottom: 0.5em; padding-left: 20px; } /* Basic list styling */
           .bot-message li { margin-bottom: 0.2em; }
           .bot-message code {
                background-color: #eee;
                padding: 2px 4px;
                border-radius: 4px;
                font-family: monospace;
           }
           .bot-message pre {
                background-color: #eee;
                padding: 10px;
                border-radius: 4px;
                overflow-x: auto; /* Prevent overflow for long code lines */
                font-family: monospace;
           }
           .bot-message blockquote {
               border-left: 4px solid #ccc;
               padding-left: 10px;
               margin-left: 0;
               color: #666;
               font-style: italic;
           }
           /* Add more styles for h1-h6, hr, table etc if the AI is expected to use them */

       `}</style>
    </div>
  );
}

export default App;
