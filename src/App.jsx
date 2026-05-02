import { useState, useEffect } from "react";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ChatPage from "./pages/ChatPage";
import { AuthProvider, useAuth } from "./context/AuthContext";

function AppRoutes() {
  const { user } = useAuth();
  const [page, setPage] = useState("login");

  useEffect(() => {
    if (user) setPage("chat");
  }, [user]);

  if (user) return <ChatPage />;
  if (page === "login") return <LoginPage onSwitch={() => setPage("signup")} />;
  return <SignupPage onSwitch={() => setPage("login")} />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
