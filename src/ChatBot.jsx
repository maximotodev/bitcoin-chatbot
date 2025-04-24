import React, { useState } from "react";
import axios from "axios";

function ChatBox() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = { sender: "user", text: input };
    setMessages([...messages, userMsg]);
    const res = await axios.post("http://127.0.0.1:5000/chat", {
      message: input,
    });
    const botMsg = { sender: "bot", text: res.data.response };
    setMessages((prev) => [...prev, botMsg]);
    setInput("");
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md">
      <div className="space-y-2 mb-4 max-h-96 overflow-y-auto">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`text-${
              msg.sender === "user"
                ? "right text-blue-600"
                : "left text-gray-700"
            }`}
          >
            <p>{msg.text}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          className="flex-1 border border-gray-300 rounded px-3 py-2"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button
          className="bg-blue-500 text-white px-4 rounded"
          onClick={sendMessage}
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default ChatBox;
