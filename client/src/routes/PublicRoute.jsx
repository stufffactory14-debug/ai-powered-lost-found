import { Navigate } from "react-router-dom";
import useAuth from "../context/useAuth";

function PublicRoute({ children }) {
  const { isAuthenticated } = useAuth();

  return isAuthenticated ? <Navigate replace to="/dashboard" /> : children;
}

export default PublicRoute;
