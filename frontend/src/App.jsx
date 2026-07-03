import { BrowserRouter, Routes, Route } from "react-router-dom";

import CampusMap from "./components/shared/CampusMap";
import StudentPage from "./components/Student/StudentPage";
import AdminPage from "./components/Admin/AdminPage";

import AdminLogin from "./components/Admin/AdminLogin";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Outdoor Navigation */}
        <Route path="/" element={<CampusMap />} />

        {/* Indoor Navigation */}
        <Route path="/student" element={<StudentPage />} />

        <Route path="/admin-login" element={<AdminLogin />} />

        {/* Admin */}
        <Route path="/admin" element={<AdminPage />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;