import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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

const LOCAL_STORAGE_KEY = "bitcoinChatHistory";

// Helper function for adding delay
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function App() {
  const [messages, setMessages] = useState(() => {
    try {
      const savedHistory = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedHistory) {
        const parsedHistory = JSON.parse(savedHistory);
        if (Array.isArray(parsedHistory)) {
          return parsedHistory;
        } else {
          console.error("LocalStorage data was not an array.");
          localStorage.removeItem(LOCAL_STORAGE_KEY);
          return [];
        }
      }
    } catch (error) {
      console.error("Error loading chat history from localStorage:", error);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
    return [];
  });

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isBotTyping, setIsBotTyping] = useState(false);
  // New state to track if the tour is currently playing
  const [isTouring, setIsTouring] = useState(false);

  const chatBoxRef = useRef(null);
  const latestMessageRef = useRef(null);

  // Effect to save messages to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(messages));
    } catch (error) {
      console.error("Error saving chat history to localStorage:", error);
    }
  }, [messages]);

  // Effect to scroll to the latest message or indicator
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
    // Disable sending message if already loading OR if the tour is playing
    if (!userQuestion || isLoading || isTouring) {
      return;
    }

    const userMessage = { type: "user", text: userQuestion };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInput("");
    setIsLoading(true);
    setIsBotTyping(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL + "/ask";
      if (!apiUrl || apiUrl === "/ask") {
        const errorMsg = "API URL is not configured.";
        console.error(errorMsg);
        setIsBotTyping(false);
        setMessages((prevMessages) => [
          ...prevMessages,
          { type: "error", text: errorMsg },
        ]);
        setIsLoading(false);
        return;
      }

      const historyForApi = [...messages, userMessage]; // Include the new user message in history sent to API

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: userQuestion,
          history: historyForApi,
        }),
      });

      setIsBotTyping(false); // Clear typing indicator once response is received

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: response.statusText }));
        const errorMsg = `API Error: ${response.status} - ${
          errorData.error || "Unknown Error"
        }`;
        console.error("Error sending message:", errorMsg);
        setMessages((prevMessages) => [
          ...prevMessages,
          { type: "error", text: errorMsg },
        ]);
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      const botResponse = { type: "bot", text: data.answer };

      setMessages((prevMessages) => [...prevMessages, botResponse]);
    } catch (error) {
      console.error("Error sending message:", error);
      setIsBotTyping(false);
      setMessages((prevMessages) => [
        ...prevMessages,
        { type: "error", text: `Request failed: ${error.message}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([]); // Clear state (triggers save useEffect)
    console.log("Chat history cleared.");
  };

  // New function to handle starting the tour
  const handleStartTour = async () => {
    // Disable starting tour if already loading, typing, or touring
    if (isLoading || isBotTyping || isTouring) {
      return;
    }

    setIsTouring(true); // Set touring state
    setIsBotTyping(true); // Show typing indicator initially for the fetch
    setMessages([]); // Optionally clear existing chat history for the tour

    try {
      const apiUrl = import.meta.env.VITE_API_URL + "/tour"; // Fetch from the new /tour endpoint
      if (!apiUrl || apiUrl === "/tour") {
        const errorMsg = "API URL is not configured for tour.";
        console.error(errorMsg);
        setIsBotTyping(false);
        // Add an error message bubble specific to the tour fetch
        setMessages((prevMessages) => [
          ...prevMessages,
          { type: "error", text: `Tour failed: ${errorMsg}` },
        ]);
        setIsTouring(false);
        return;
      }

      const response = await fetch(apiUrl); // Use GET request
      setIsBotTyping(false); // Clear typing indicator once tour data is fetched

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: response.statusText }));
        const errorMsg = `Tour API Error: ${response.status} - ${
          errorData.error || "Unknown Error"
        }`;
        console.error("Error fetching tour data:", errorMsg);
        setMessages((prevMessages) => [
          ...prevMessages,
          { type: "error", text: `Tour failed: ${errorMsg}` },
        ]);
        setIsTouring(false);
        return;
      }

      const data = await response.json();
      const tourMessages = data.tour; // Expecting the list of messages under 'tour' key

      if (!Array.isArray(tourMessages)) {
        const errorMsg = "Invalid tour data format from API.";
        console.error(errorMsg, data);
        setMessages((prevMessages) => [
          ...prevMessages,
          { type: "error", text: `Tour failed: ${errorMsg}` },
        ]);
        setIsTouring(false);
        return;
      }

      // Display messages one by one with a delay
      for (const msgText of tourMessages) {
        const botMessage = { type: "bot", text: msgText };
        setMessages((prevMessages) => [...prevMessages, botMessage]);
        setIsBotTyping(true); // Show typing indicator between messages
        await delay(msgText.length * 40 + 1000); // Simulate typing delay (adjust factor as needed) + base delay
        setIsBotTyping(false); // Hide indicator after message
      }
    } catch (error) {
      console.error("Error during tour:", error);
      setIsBotTyping(false);
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          type: "error",
          text: `An unexpected error occurred during the tour: ${error.message}`,
        },
      ]);
    } finally {
      setIsTouring(false); // Ensure touring state is off
      setIsBotTyping(false); // Ensure typing indicator is off
    }
  };

  return (
    <div className="chat-container">
      <h1>Bitcoin Chatbot</h1>

      {/* Buttons Area */}
      <div className="button-container">
        <button
          className="tour-button"
          onClick={handleStartTour}
          disabled={isLoading || isTouring}
        >
          Introductory Tour
        </button>
        <button
          className="clear-history-button"
          onClick={handleClearHistory}
          disabled={isLoading || isTouring}
        >
          Clear History
        </button>
      </div>

      <div className="chat-box" ref={chatBoxRef}>
        {messages.length === 0 && !isBotTyping && !isTouring ? ( // Show initial text only when empty and not loading/touring
          <div
            style={{ textAlign: "center", color: "#666", marginTop: "20px" }}
          >
            Ask me anything about Bitcoin!
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`message ${message.type}-message`}
              // Ref goes to the last message if not typing/touring, OR to the typing indicator itself
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
        {/* Loading/Typing indicator - now controlled by isBotTyping */}
        {isBotTyping && (
          <TypingIndicator ref={latestMessageRef} /> // Typing indicator also gets the ref
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSendMessage}>
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          placeholder="Ask me about Bitcoin..."
          disabled={isLoading || isTouring} // Disable input if loading OR touring
        />
        <button type="submit" disabled={isLoading || isTouring}>
          {" "}
          {/* Disable button if loading OR touring */}
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
               position: relative;
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

           /* Container for the buttons */
            .button-container {
                display: flex;
                justify-content: center; /* Center buttons */
                gap: 10px; /* Space between buttons */
                margin-bottom: 15px; /* Space below buttons */
                 flex-wrap: wrap; /* Allow buttons to wrap on smaller screens */
            }

           /* Style for the Tour Button */
            .tour-button {
                padding: 8px 15px;
                background-color: #28a745; /* Success green */
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 0.9em;
                transition: background-color 0.2s ease-in-out;
            }
             .tour-button:hover:not(:disabled) {
                 background-color: #218838; /* Darker green */
             }


           /* Style for the Clear History Button */
            .clear-history-button {
                padding: 8px 15px;
                background-color: #ced4da;
                color: #495057;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 0.9em;
                transition: background-color 0.2s ease-in-out;
            }
            .clear-history-button:hover:not(:disabled) {
                background-color: #adb5bd;
            }
            /* Disable style for buttons */
            .button-container button:disabled {
                 opacity: 0.6;
                 cursor: not-allowed;
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
                margin-top: 10px;
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

           button { /* Applies to form submit button */
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
