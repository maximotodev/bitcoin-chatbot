import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Optional: Create a simple TypingIndicator component
const TypingIndicator = () => (
  <div className="message bot-message loading-message">
    <strong>Chatbot:</strong>
    <span className="typing-dots">
      <span>.</span>
      <span>.</span>
      <span>.</span>
    </span>
  </div>
);

// Key for localStorage
const LOCAL_STORAGE_KEY = "bitcoinChatHistory";

function App() {
  // Initialize messages state by trying to load from localStorage
  // This will only run once when the component first mounts
  const [messages, setMessages] = useState(() => {
    try {
      const savedHistory = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedHistory) {
        // Parse the saved string back into an array
        const parsedHistory = JSON.parse(savedHistory);
        // Basic validation: check if it's actually an array
        if (Array.isArray(parsedHistory)) {
          return parsedHistory;
        } else {
          console.error("LocalStorage data was not an array.");
          localStorage.removeItem(LOCAL_STORAGE_KEY); // Clear invalid data
          return [];
        }
      }
    } catch (error) {
      console.error("Error loading chat history from localStorage:", error);
      // Clear any potentially corrupted data
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
    // If no saved history, or error occurred, start with an empty array
    return [];
  });

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isBotTyping, setIsBotTyping] = useState(false);

  const chatBoxRef = useRef(null);
  const latestMessageRef = useRef(null);

  // Effect to save messages to localStorage whenever the messages state changes
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(messages));
    } catch (error) {
      console.error("Error saving chat history to localStorage:", error);
      // Handle potential storage full errors if needed (less likely for text)
    }
  }, [messages]); // Dependency array: this effect runs whenever 'messages' changes

  // Effect to scroll to the latest message or indicator whenever messages or typing state changes
  useEffect(() => {
    if (latestMessageRef.current) {
      latestMessageRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isBotTyping]);

  const handleInputChange = (event) => {
    setInput(event.target.value);
  };

  const handleSendMessage = async (event) => {
    event.preventDefault();

    const userQuestion = input.trim();
    if (!userQuestion || isLoading) {
      return;
    }

    // Add user message instantly to UI and localStorage state
    const userMessage = { type: "user", text: userQuestion };
    // Use functional update to ensure we have the latest messages state for the API call
    setMessages((prevMessages) => [...prevMessages, userMessage]); // This state update will trigger the save useEffect shortly
    setInput("");
    setIsLoading(true);
    setIsBotTyping(true); // Show typing indicator

    try {
      const apiUrl = import.meta.env.VITE_API_URL + "/ask";
      if (!apiUrl || apiUrl === "/ask") {
        const errorMsg = "API URL is not configured.";
        console.error(errorMsg);
        setIsBotTyping(false); // Clear typing indicator
        // Add an error message bubble
        setMessages((prevMessages) => [
          ...prevMessages,
          { type: "error", text: errorMsg },
        ]);
        setIsLoading(false); // Stop overall loading
        return;
      }

      // Important: Send the history from the *current* state, including the user's message just added
      // The setMessages call above *might* not have completed yet, so use the functional update pattern
      // or pass `messages` directly and append the user message. Let's keep it simple by
      // sending the history from the state *after* we know the user message is added to the queue.
      // A safer way might be to append the user message directly to the `messages` array *before*
      // the setMessages call for the send, but relying on React's state batching is usually fine.
      // Let's pass `[...messages, userMessage]` to the API call directly for clarity.
      const historyForApi = [...messages, userMessage];

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: userQuestion,
          history: historyForApi, // Send the history including the message just added
        }),
      });

      // Clear typing indicator once response is received (even if it's an error response)
      setIsBotTyping(false);

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: response.statusText }));
        const errorMsg = `API Error: ${response.status} - ${
          errorData.error || "Unknown Error"
        }`;
        console.error("Error sending message:", errorMsg);
        // Add an error message bubble
        setMessages((prevMessages) => [
          ...prevMessages,
          { type: "error", text: errorMsg },
        ]);
        setIsLoading(false); // Stop overall loading
        return;
      }

      const data = await response.json();
      const botResponse = { type: "bot", text: data.answer };

      // Add bot response to UI state (this will trigger the save useEffect)
      setMessages((prevMessages) => [...prevMessages, botResponse]);
    } catch (error) {
      console.error("Error sending message:", error);
      setIsBotTyping(false); // Clear typing indicator
      // Add a general error message bubble
      setMessages((prevMessages) => [
        ...prevMessages,
        { type: "error", text: `Request failed: ${error.message}` },
      ]);
    } finally {
      setIsLoading(false); // Stop overall loading regardless of success or failure
      // setIsBotTyping is handled in try/catch/return blocks
    }
  };

  // Function to clear chat history
  const handleClearHistory = () => {
    setMessages([]); // Clear state (triggers save useEffect to save empty array)
    // Optionally, explicitly remove from localStorage, though the save useEffect handles it
    // localStorage.removeItem(LOCAL_STORAGE_KEY);
    console.log("Chat history cleared.");
  };

  return (
    <div className="chat-container">
      <h1>Bitcoin Chatbot</h1>

      {/* Clear History Button */}
      <button className="clear-history-button" onClick={handleClearHistory}>
        Clear History
      </button>

      <div className="chat-box" ref={chatBoxRef}>
        {messages.length === 0 ? (
          <div
            style={{ textAlign: "center", color: "#666", marginTop: "20px" }}
          >
            Ask me anything about Bitcoin!
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index} // Using index as key is okay for this simple case where messages aren't reordered/deleted mid-list
              className={`message ${message.type}-message`}
              ref={
                index === messages.length - 1 && !isBotTyping
                  ? latestMessageRef
                  : null
              }
            >
              <strong>
                {message.type === "user"
                  ? "You"
                  : message.type === "bot"
                  ? "Chatbot"
                  : "Error"}
                :
              </strong>
              {message.type === "bot" ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.text}
                </ReactMarkdown>
              ) : (
                message.text
              )}
            </div>
          ))
        )}
        {/* Loading indicator */}
        {isBotTyping && <TypingIndicator ref={latestMessageRef} />}
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

      {/* Basic Styling Block - Add/Refine styles here */}
      <style>{`
           body {
               font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
               line-height: 1.6;
               margin: 0;
               background-color: #e9ecef;
               color: #343a40;
               min-height: 100vh;
               display: flex;
               justify-content: center;
               align-items: flex-start;
               padding: 20px;
               box-sizing: border-box;
           }
           .chat-container {
               width: 100%;
               max-width: 800px;
               margin: 0 auto;
               background-color: #ffffff;
               padding: 20px;
               border-radius: 10px;
               box-shadow: 0 5px 15px rgba(0,0,0,0.1);
               display: flex;
               flex-direction: column;
               height: 90vh;
               box-sizing: border-box;
               overflow: hidden;
               position: relative; /* Needed for positioning clear button */
           }
            @media (max-width: 768px) {
                 .chat-container {
                     height: 95vh;
                     margin: 0;
                     padding: 15px;
                 }
            }

           h1 {
               text-align: center;
               color: #f7931a;
               margin-top: 0;
               margin-bottom: 20px;
               font-size: 1.8em;
           }

           /* Style for the Clear History Button */
            .clear-history-button {
                position: absolute;
                top: 20px; /* Adjust position as needed */
                right: 20px; /* Adjust position as needed */
                padding: 5px 10px;
                background-color: #ced4da; /* Light grey */
                color: #495057; /* Darker grey text */
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 0.8em;
                transition: background-color 0.2s ease-in-out;
                z-index: 10; /* Ensure it's above other elements */
            }
            .clear-history-button:hover {
                background-color: #adb5bd; /* Slightly darker grey */
            }
            @media (max-width: 768px) {
                 .clear-history-button {
                     top: 15px;
                     right: 15px;
                 }
            }


           .chat-box {
               flex-grow: 1;
               border: 1px solid #dee2e6;
               padding: 15px;
               margin-bottom: 15px;
               border-radius: 8px;
               overflow-y: auto;
               display: flex;
               flex-direction: column;
               padding-bottom: 15px;
           }
            .chat-box::-webkit-scrollbar { display: none; }
            .chat-box { -ms-overflow-style: none; scrollbar-width: none; }


           .message {
               margin-bottom: 15px;
               padding: 12px 15px;
               border-radius: 18px;
               max-width: 85%;
               word-wrap: break-word;
               position: relative;
               line-height: 1.5;
           }
            .message:last-child {
                 margin-bottom: 0;
            }

           .user-message {
               align-self: flex-end;
               background-color: #007bff;
               color: white;
               border-bottom-right-radius: 5px;
           }
           .bot-message {
               align-self: flex-start;
               background-color: #e9ecef;
               color: #343a40;
               border-bottom-left-radius: 5px;
           }
            .error-message {
                align-self: center;
                background-color: #dc3545;
                color: white;
                font-weight: bold;
                max-width: 90%;
                text-align: center;
                border-radius: 8px;
                margin-top: 10px; /* Add margin top to error bubbles */
            }

           .message strong {
                display: block;
                margin-bottom: 5px;
                font-size: 0.9em;
                opacity: 0.8;
            }
             .user-message strong { color: rgba(255, 255, 255, 0.8); }
             .bot-message strong { color: rgba(52, 58, 64, 0.8); }


           /* Typing Indicator Styles */
            .loading-message {
                font-style: italic;
                color: #555;
                background-color: #e9ecef;
            }
            .typing-dots span {
                animation: blink 1s infinite steps(1, start);
            }
            .typing-dots span:nth-child(2) {
                animation-delay: 0.2s;
            }
            .typing-dots span:nth-child(3) {
                animation-delay: 0.4s;
            }
            @keyframes blink {
                0% { opacity: 0; }
                50% { opacity: 1; }
                100% { opacity: 0; }
            }


           form {
               display: flex;
               margin-top: auto;
               padding-top: 15px;
               border-top: 1px solid #dee2e6;
               gap: 10px;
           }
           input[type="text"] {
               flex-grow: 1;
               padding: 12px 15px;
               border: 1px solid #ced4da;
               border-radius: 25px;
               font-size: 1em;
               outline: none;
               transition: border-color 0.2s ease-in-out;
           }
           input[type="text"]:focus {
               border-color: #007bff;
           }

           button {
               padding: 12px 25px;
               background-color: #f7931a;
               color: white;
               border: none;
               border-radius: 25px;
               cursor: pointer;
               font-size: 1em;
               transition: background-color 0.2s ease-in-out;
           }
           button:disabled {
               background-color: #cccccc;
               cursor: not-allowed;
               opacity: 0.6;
           }
           button:hover:not(:disabled) {
               background-color: #e08516;
           }

            .disclaimer {
               margin-top: 15px;
               text-align: center;
               font-size: 0.8em;
               color: #6c757d;
           }

           /* --- Styles for Markdown elements within bot messages --- */
           .bot-message p { margin-bottom: 0.5em; }
           .bot-message p:last-child { margin-bottom: 0; }
           .bot-message ul, .bot-message ol { margin-bottom: 0.5em; padding-left: 20px; }
           .bot-message li { margin-bottom: 0.2em; }
            .bot-message li > p { margin-bottom: 0 !important; display: inline; }
            .bot-message code {
                background-color: rgba(0,0,0,0.08);
                padding: 2px 4px;
                border-radius: 4px;
                font-family: Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace;
                font-size: 0.9em;
            }
           .bot-message pre {
                background-color: rgba(0,0,0,0.05);
                padding: 10px;
                border-radius: 4px;
                overflow-x: auto;
                font-family: Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace;
                font-size: 0.9em;
                margin-top: 0.5em;
                margin-bottom: 0.5em;
           }
           .bot-message blockquote {
               border-left: 4px solid #007bff;
               padding-left: 15px;
               margin-left: 0;
               color: #495057;
               font-style: italic;
               margin-top: 0.5em;
               margin-bottom: 0.5em;
           }
            .bot-message table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 0.5em;
                margin-bottom: 0.5em;
            }
             .bot-message th, .bot-message td {
                border: 1px solid #dee2e6;
                padding: 8px;
                text-align: left;
            }
             .bot-message th {
                 background-color: #e9ecef;
                 font-weight: bold;
            }
             .bot-message img {
                 max-width: 100%;
                 height: auto;
                 display: block;
                 margin-top: 0.5em;
                 margin-bottom: 0.5em;
            }

       `}</style>
    </div>
  );
}

export default App;
