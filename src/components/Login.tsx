import React, { useState, useEffect } from "react";
import { Users, Lock, ArrowLeft, Eye, EyeOff } from "lucide-react";
import cavinKareLogo from "../../assets/images/CavinKare-logo-z3dMoof1.png";

interface LoginProps {
  onLogin: (role: "user" | "admin") => void;
}

export function Login({ onLogin }: LoginProps) {
  const [view, setView] = useState<"login" | "forgot">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!username || !password) {
      setError("Please fill all fields");
      return;
    }

    if (view === "login") {
      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        const data = await response.json();
        if (response.ok && data.success) {
          onLogin(data.role);
        } else {
          setError(data.error || "Invalid username or password");
        }
      } catch (err) {
        setError("Network error, please try again");
      }
    } else if (view === "forgot") {
      try {
        const response = await fetch("/api/auth/reset", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        const data = await response.json();
        if (response.ok && data.success) {
          setSuccess("Password reset successfully!");
          setTimeout(() => setView("login"), 1500);
        } else {
          setError(data.error || "Username not found");
        }
      } catch (err) {
        setError("Network error, please try again");
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8 max-w-md w-full">
        {view !== "login" && (
          <button
            onClick={() => {
              setView("login");
              setError("");
              setSuccess("");
              setShowPassword(false);
            }}
            className="text-slate-500 hover:text-slate-700 flex items-center gap-1 text-sm font-semibold mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Login
          </button>
        )}

        <div className="text-center mb-8">
          <div className="w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <img
              src={cavinKareLogo}
              alt="CavinKare Logo"
              className="w-14 h-14 object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            {view === "login" ? "Login to ID CARD Maker" : "Reset Password"}
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            {view === "login"
              ? "Enter your credentials to continue"
              : "Enter your username and a new password"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border border-slate-300 rounded-md p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Username"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              {view === "forgot" ? "New Password" : "Password"}
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-slate-300 rounded-md py-3 pl-3 pr-10 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-sm font-semibold">{error}</p>
          )}
          {success && (
            <p className="text-green-600 text-sm font-semibold">{success}</p>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-md hover:bg-blue-700 transition-colors"
          >
            {view === "login" ? "Sign In" : "Reset Password"}
          </button>
        </form>

        {view === "login" && (
          <div className="mt-4 flex items-center justify-between text-sm">
            <button
              onClick={() => {
                setView("forgot");
                setError("");
                setSuccess("");
                setShowPassword(false);
              }}
              className="text-blue-600 hover:text-blue-800 font-semibold"
            >
              Forgot Password?
            </button>
          </div>
        )}


      </div>
    </div>
  );
}
