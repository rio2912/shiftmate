import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import WidgetApp from "./WidgetApp.jsx";
import "./App.css";

// The desktop app opens the round floating timer as "index.html#widget"
const isWidget = window.location.hash === "#widget";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>{isWidget ? <WidgetApp /> : <App />}</React.StrictMode>
);
