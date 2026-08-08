import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth";
import { Shell } from "./components/Shell";
import { BorrowPage } from "./pages/Borrow";
import { HistoryPage } from "./pages/History";
import { LoginPage, RegisterPage } from "./pages/Login";
import { LandingPage } from "./pages/Landing";
import { MarketsPage } from "./pages/Markets";
import { NotificationsPage } from "./pages/Notifications";
import { OpsPage } from "./pages/Ops";
import { PositionPage } from "./pages/Position";
import { StressPage } from "./pages/Stress";

function Gate() {
  const { user, ready } = useAuth();
  if (!ready) return <div className="p-10 text-mute">Opening the desk…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Shell />;
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<Gate />}>
        <Route path="/markets" element={<MarketsPage />} />
        <Route path="/position" element={<PositionPage />} />
        <Route path="/borrow" element={<BorrowPage />} />
        <Route path="/stress" element={<StressPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/ops" element={<OpsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
