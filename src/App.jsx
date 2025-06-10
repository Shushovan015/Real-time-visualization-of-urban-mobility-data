import { Routes, Route } from "react-router-dom";
import "./App.css";
import Home from "./views/Home";
import About from "./views/About";

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </>
  );
}

export default App;
