import React, { useState, useRef, useEffect } from "react";
// import './App.css'; // We'll use inline styles for simplicity here

function App() {
  // messages state now holds the full conversation history
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatBoxRef = useRef(null); // Ref for scrolling

  // Scroll to the bottom when messages change or loading state changes (to show 'Thinking...')
  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages, isLoading]); // Also scroll when isLoading changes

  const handleInputChange = (event) => {
    setInput(event.target.value);
  };

  const handleSendMessage = async (event) => {
    event.preventDefault();

    const userQuestion = input.trim();
    if (!userQuestion || isLoading) {
      return;
    }

    // Add user message instantly to UI
    const userMessage = { type: "user", text: userQuestion };
    // Use functional update to ensure we have the latest messages state
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Use the environment variable for the API URL
      const apiUrl = import.meta.env.VITE_API_URL + "/ask";
      if (!apiUrl || apiUrl === "/ask") {
        throw new Error("API URL is not configured.");
      }

      // Send the full current messages history PLUS the new question
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: userQuestion,
          history: [...messages, userMessage], // Send history including the message just added
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

      // Add bot response to UI
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
      {/* Chat Box displays all messages */}
      <div className="chat-box" ref={chatBoxRef}>
        {messages.length === 0 ? (
          <div
            style={{ textAlign: "center", color: "#666", marginTop: "20px" }}
          >
            Ask me anything about Bitcoin!
          </div>
        ) : (
          messages.map((message, index) => (
            // Use index as key - better to use unique IDs if messages had them
            <div key={index} className={`message ${message.type}-message`}>
              <strong>{message.type === "user" ? "You" : "Chatbot"}:</strong>
              {/* Basic rendering - could add markdown parsing here */}
              {message.text}
            </div>
          ))
        )}
        {/* Loading indicator */}
        {isLoading && (
          <div className="message bot-message loading-message">
            <strong>Chatbot:</strong> Thinking...
          </div>
        )}
      </div>

      {/* Input Form */}
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

      {/* Basic Styling Block */}
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
               margin: 20px auto; /* Less margin */
               background-color: #fff;
               padding: 20px;
               border-radius: 8px;
               box-shadow: 0 2px 5px rgba(0,0,0,0.1);
               display: flex;
               flex-direction: column;
               height: 90vh; /* Make it a bit taller */
               box-sizing: border-box; /* Include padding in height */
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
               margin-bottom: 15px; /* Less margin */
               border-radius: 5px;
               overflow-y: auto;
               display: flex;
               flex-direction: column;
               /* Add some padding at the bottom to prevent last message being hidden */
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
               background-color: #e1ffc7; /* Light green */
           }
           .bot-message {
               align-self: flex-start;
               background-color: #cce5ff; /* Light blue */
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
               padding-top: 15px; /* Add padding above form */
               border-top: 1px solid #eee; /* Separator line */
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
               border-radius: 4px;
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
       `}</style>
    </div>
  );
}

export default App;
