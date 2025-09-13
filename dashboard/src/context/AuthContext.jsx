import { createContext, useState, useContext, useEffect } from "react";
import { jwtDecode } from "jwt-decode"; 

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);

  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    if (savedToken) {
      try {
        const decoded = jwtDecode(savedToken);

        if (decoded.exp * 1000 > Date.now()) {
          setToken(savedToken);
        } else {
          localStorage.removeItem("token"); 
        }
      } catch (err) {
        console.error("Invalid token", err);
        localStorage.removeItem("token");
      }
    }
  }, []);

  const login = (newToken) => {
    try {
      const decoded = jwtDecode(newToken);

      if (decoded.exp * 1000 > Date.now()) {
        setToken(newToken);
        localStorage.setItem("token", newToken);
      } else {
        console.warn("Token expired");
      }
    } catch (err) {
      console.error("Invalid JWT at login", err);
    }
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem("token");
  };

  return (
    <AuthContext.Provider value={{ token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
