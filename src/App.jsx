import "./App.css";
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
    </div>
  );
}

export default App;
