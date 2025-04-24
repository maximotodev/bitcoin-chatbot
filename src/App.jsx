import React, { useState, useRef, useEffect } from "react";
// import './App.css'; // You can create this file for styling

function App() {
  const [messages, setMessages] = useState([]); // Array to hold chat messages
  const [input, setInput] = useState(""); // State for the current input value
  const [isLoading, setIsLoading] = useState(false); // State to show loading indicator
  const chatBoxRef = useRef(null); // Ref for scrolling to the bottom

  // Scroll to the bottom of the chat box whenever messages update
  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages]);

  const handleInputChange = (event) => {
    setInput(event.target.value);
  };

  const handleSendMessage = async (event) => {
    event.preventDefault(); // Prevent page reload on form submission

    if (!input.trim() || isLoading) {
      return; // Don't send empty messages or if loading
    }

    const userMessage = { type: "user", text: input };
    // Add user message instantly to UI
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInput(""); // Clear input field
    setIsLoading(true); // Start loading indicator

    try {
      // Make the POST request to your Flask backend
      const response = await fetch("http://127.0.0.1:5000/ask", {
        // <-- Make sure this URL matches your Flask server
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question: input }), // Send the question as JSON
      });

      if (!response.ok) {
        // Handle HTTP errors (e.g., 400, 500)
        const errorData = await response.json(); // Try to parse error response
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${
            errorData.error || response.statusText
          }`
        );
      }

      const data = await response.json(); // Parse the JSON response from Flask
      const botResponse = { type: "bot", text: data.answer };

      // Add bot response to UI
      setMessages((prevMessages) => [...prevMessages, botResponse]);
    } catch (error) {
      console.error("Error sending message:", error);
      // Display an error message in the chat
      setMessages((prevMessages) => [
        ...prevMessages,
        { type: "bot", text: `Error: ${error.message}` },
      ]);
    } finally {
      setIsLoading(false); // Stop loading indicator regardless of success or failure
    }
  };

  return (
    <div className="chat-container">
      <h1>Bitcoin Chatbot</h1>
      <div className="chat-box" ref={chatBoxRef}>
        {messages.length === 0 ? (
          <div style={{ textAlign: "center", color: "#666" }}>
            Ask me anything about Bitcoin!
          </div>
        ) : (
          messages.map((message, index) => (
            <div key={index} className={`message ${message.type}-message`}>
              <strong>{message.type === "user" ? "You" : "Chatbot"}:</strong>{" "}
              {message.text}
            </div>
          ))
        )}
        {isLoading && (
          <div className="message bot-message">
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
          disabled={isLoading} // Disable input while loading
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? "..." : "Ask"} {/* Button text changes when loading */}
        </button>
      </form>

      <p className="disclaimer">
        Note: This chatbot specializes in Bitcoin and cannot provide financial
        advice.
      </p>

      {/* Basic Styling - You would typically put this in App.css */}
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
               margin: 40px auto;
               background-color: #fff;
               padding: 20px;
               border-radius: 8px;
               box-shadow: 0 2px 5px rgba(0,0,0,0.1);
               display: flex; /* Use flexbox for layout */
               flex-direction: column;
               height: 80vh; /* Give it a fixed height */
           }
           h1 {
               text-align: center;
               color: #f7931a; /* Bitcoin orange */
               margin-bottom: 20px;
           }
           .chat-box {
               flex-grow: 1; /* Takes up remaining space */
               border: 1px solid #eee;
               padding: 15px;
               margin-bottom: 20px;
               border-radius: 5px;
               overflow-y: auto; /* Add scroll for overflow */
               display: flex;
               flex-direction: column;
           }
           .message {
               margin-bottom: 10px; /* Slightly less margin */
               padding: 10px;
               border-radius: 8px;
               max-width: 80%;
               word-wrap: break-word; /* Prevent long words from overflowing */
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
                margin-bottom: 3px; /* Less margin below name */
            }
           form {
               display: flex;
               margin-top: auto; /* Push form to the bottom */
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
               margin-top: 15px; /* Less margin */
               text-align: center;
               font-size: 0.8em;
               color: #666;
           }
       `}</style>
    </div>
  );
}

export default App;
