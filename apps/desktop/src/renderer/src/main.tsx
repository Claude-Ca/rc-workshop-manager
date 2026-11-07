import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import TitleBar from "./TitleBar";
import "./styles.css";
import "./identity.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <>
      <TitleBar />
      <App />
    </>
  </React.StrictMode>,
);
