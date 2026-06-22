import { BrowserRouter, Routes, Route } from "react-router-dom";
import AdminPage from "./components/Admin/AdminPage";
import StudentPage from "./components/Student/StudentPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/student" element={<StudentPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;