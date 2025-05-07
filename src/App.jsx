import React, { useState, useRef, useEffect } from "react";
// If you move styles to App.css, uncomment the line below:
// import './App.css';
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

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  // Use separate states for overall loading and specific bot typing state
  const [isLoading, setIsLoading] = useState(false); // Overall fetch state
  const [isBotTyping, setIsBotTyping] = useState(false); // Only for the 'Thinking...' state display

  const chatBoxRef = useRef(null); // Ref for the chat box container
  const latestMessageRef = useRef(null); // Ref for the very last message/indicator

  // Effect to scroll to the latest message or indicator whenever messages or loading state changes
  useEffect(() => {
    if (latestMessageRef.current) {
      latestMessageRef.current.scrollIntoView({ behavior: "smooth" }); // Smooth scroll
    }
  }, [messages, isBotTyping]); // Trigger when messages or typing state updates

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
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInput("");
    setIsLoading(true); // Start overall loading
    setIsBotTyping(true); // Show typing indicator

    try {
      const apiUrl = import.meta.env.VITE_API_URL + "/ask";
      if (!apiUrl || apiUrl === "/ask") {
        const errorMsg = "API URL is not configured.";
        console.error(errorMsg);
        // Add an error message bubble
        setMessages((prevMessages) => [
          ...prevMessages,
          { type: "error", text: errorMsg },
        ]);
        return; // Stop execution
      }

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

      // Clear typing indicator once response is received (even if it's an error response)
      setIsBotTyping(false);

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: response.statusText })); // Attempt to parse JSON error, fallback to status text
        const errorMsg = `API Error: ${response.status} - ${
          errorData.error || "Unknown Error"
        }`;
        console.error("Error sending message:", errorMsg);
        // Add an error message bubble
        setMessages((prevMessages) => [
          ...prevMessages,
          { type: "error", text: errorMsg },
        ]);
        return; // Stop execution after handling error
      }

      const data = await response.json(); // Parse the JSON response from Flask
      const botResponse = { type: "bot", text: data.answer };

      // Add bot response to UI
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
      // setIsBotTyping(false); // Ensure typing indicator is off (also done in try/catch)
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
            // Add ref to the last message or the typing indicator
            <div
              key={index}
              className={`message ${message.type}-message`}
              ref={
                index === messages.length - 1 && !isBotTyping
                  ? latestMessageRef
                  : null
              } // Only the last message gets the ref if not typing
            >
              <strong>
                {message.type === "user"
                  ? "You"
                  : message.type === "bot"
                  ? "Chatbot"
                  : "Error"}
                :
              </strong>
              {/* Render Markdown only for bot messages */}
              {message.type === "bot" ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.text}
                </ReactMarkdown>
              ) : (
                // Display user/error message as plain text
                message.text
              )}
            </div>
          ))
        )}
        {/* Loading indicator */}
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
               font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; /* More modern font */
               line-height: 1.6;
               margin: 0;
               background-color: #e9ecef; /* Light grey background */
               color: #343a40; /* Dark grey text */
               min-height: 100vh;
               display: flex;
               justify-content: center;
               align-items: flex-start; /* Align to top */
               padding: 20px;
               box-sizing: border-box;
           }
           .chat-container {
               width: 100%; /* Use max-width below */
               max-width: 800px;
               margin: 0 auto; /* Center horizontally */
               background-color: #ffffff;
               padding: 20px;
               border-radius: 10px; /* More rounded corners */
               box-shadow: 0 5px 15px rgba(0,0,0,0.1); /* Softer shadow */
               display: flex;
               flex-direction: column;
               height: 90vh; /* Keep height */
               box-sizing: border-box;
               overflow: hidden; /* Hide overflow of chat-box */
           }
            @media (max-width: 768px) {
                 .chat-container {
                     height: 95vh; /* Taller on smaller screens */
                     margin: 0;
                     padding: 15px;
                 }
            }


           h1 {
               text-align: center;
               color: #f7931a; /* Bitcoin orange */
               margin-top: 0;
               margin-bottom: 20px;
               font-size: 1.8em; /* Slightly larger heading */
           }
           .chat-box {
               flex-grow: 1;
               border: 1px solid #dee2e6; /* Lighter border */
               padding: 15px;
               margin-bottom: 15px;
               border-radius: 8px; /* More rounded corners */
               overflow-y: auto; /* Add scroll for overflow */
               display: flex;
               flex-direction: column;
               padding-bottom: 15px; /* Add padding at the bottom */
           }
           /* Hide scrollbar for a cleaner look */
            .chat-box::-webkit-scrollbar { display: none; }
            .chat-box { -ms-overflow-style: none; scrollbar-width: none; } /* IE and Edge */


           .message {
               margin-bottom: 15px; /* Increased margin */
               padding: 12px 15px; /* More padding */
               border-radius: 18px; /* Pill-shaped corners */
               max-width: 85%; /* Allow messages to be a bit wider */
               word-wrap: break-word;
               position: relative; /* Needed for potential bubble tails */
               line-height: 1.5;
           }
            .message:last-child {
                 margin-bottom: 0; /* No margin on the very last message */
            }

           .user-message {
               align-self: flex-end;
               background-color: #007bff; /* Primary blue */
               color: white;
               border-bottom-right-radius: 5px; /* Pointy corner */
           }
           .bot-message {
               align-self: flex-start;
               background-color: #e9ecef; /* Light grey */
               color: #343a40; /* Dark text */
               border-bottom-left-radius: 5px; /* Pointy corner */
           }
            .error-message {
                align-self: center; /* Center error messages */
                background-color: #dc3545; /* Danger red */
                color: white;
                font-weight: bold;
                max-width: 90%;
                text-align: center;
                border-radius: 8px; /* Less rounded for errors */
            }

           .message strong {
                display: block;
                margin-bottom: 5px; /* More margin below name */
                font-size: 0.9em; /* Smaller name */
                opacity: 0.8; /* Make name slightly less prominent */
            }
             .user-message strong { color: rgba(255, 255, 255, 0.8); } /* Lighter name for user */
             .bot-message strong { color: rgba(52, 58, 64, 0.8); } /* Slightly lighter name for bot */


           /* Typing Indicator Styles */
            .loading-message {
                font-style: italic;
                color: #555;
                background-color: #e9ecef; /* Match bot bubble */
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
               border-top: 1px solid #dee2e6; /* Lighter separator line */
               gap: 10px; /* Space between input and button */
           }
           input[type="text"] {
               flex-grow: 1;
               padding: 12px 15px; /* Match message padding */
               border: 1px solid #ced4da; /* Lighter border */
               border-radius: 25px; /* Pill shape */
               font-size: 1em;
               outline: none;
               transition: border-color 0.2s ease-in-out;
           }
           input[type="text"]:focus {
               border-color: #007bff; /* Highlight on focus */
           }

           button {
               padding: 12px 25px; /* Match message padding */
               background-color: #f7931a;
               color: white;
               border: none;
               border-radius: 25px; /* Pill shape */
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
               color: #6c757d; /* Grey color */
           }

           /* --- Styles for Markdown elements within bot messages --- */
           /* Target elements only within bot-message */
           .bot-message p { margin-bottom: 0.5em; }
           .bot-message p:last-child { margin-bottom: 0; } /* Remove margin from last paragraph in a message */
           .bot-message ul, .bot-message ol { margin-bottom: 0.5em; padding-left: 20px; }
           .bot-message li { margin-bottom: 0.2em; }
            .bot-message li > p { margin-bottom: 0 !important; display: inline; } /* Remove margin from paragraphs inside lists */
            .bot-message code {
                background-color: rgba(0,0,0,0.08); /* Slightly transparent dark */
                padding: 2px 4px;
                border-radius: 4px;
                font-family: Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace; /* Better monospace stack */
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
               border-left: 4px solid #007bff; /* Blue border */
               padding-left: 15px;
               margin-left: 0;
               color: #495057; /* Darker grey */
               font-style: italic;
               margin-top: 0.5em;
               margin-bottom: 0.5em;
           }
            .bot-message table {
                width: 100%; /* Tables take full width */
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
                 max-width: 100%; /* Prevent images from overflowing */
                 height: auto;
                 display: block; /* Prevent extra space below image */
                 margin-top: 0.5em;
                 margin-bottom: 0.5em;
            }

       `}</style>
    </div>
  );
}

export default App;
