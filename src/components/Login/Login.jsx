import React, { useState, useEffect, useRef } from "react";
import {
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Shield,
  Building2,
  CheckCircle,
  AlertCircle,
  X,
  BarChart3,
  Package,
  DollarSign,
  Users,
  TrendingUp,
  ClipboardList,
} from "lucide-react";
import axiosInstance from "../../axios/axios";

const ERPLogin = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const canvasRef = useRef(null);

  const cubeFaces = [
    { icon: <BarChart3 className="w-7 h-7" />, label: "Analytics" },
    { icon: <Package className="w-7 h-7" />, label: "Inventory" },
    { icon: <DollarSign className="w-7 h-7" />, label: "Finance" },
    { icon: <Users className="w-7 h-7" />, label: "HR & Team" },
    { icon: <TrendingUp className="w-7 h-7" />, label: "Sales" },
    { icon: <ClipboardList className="w-7 h-7" />, label: "Purchase" },
  ];

  // Token management functions
  const storeTokens = (tokens, data, adminData, rememberMe = false) => {
    const storage = rememberMe ? localStorage : sessionStorage;

    try {
      storage.setItem("accessToken", tokens.accessToken);
      storage.setItem("refreshToken", tokens.refreshToken);
      storage.setItem("adminId", data._id);
      storage.setItem("tokenExpiry", tokens.expiresIn);
      //   storage.setItem('adminData', JSON.stringify(adminData));
      storage.setItem("loginTime", new Date().toISOString());
      storage.setItem("rememberMe", rememberMe.toString());

      // Set up axios default authorization header
      axiosInstance.defaults.headers.common[
        "Authorization"
      ] = `Bearer ${tokens.accessToken}`;

      console.log("Tokens stored successfully");
    } catch (error) {
      console.error("Error storing tokens:", error);
    }
  };

  const getStoredToken = () => {
    return (
      localStorage.getItem("accessToken") ||
      sessionStorage.getItem("accessToken")
    );
  };

  const getStoredRefreshToken = () => {
    return (
      localStorage.getItem("refreshToken") ||
      sessionStorage.getItem("refreshToken")
    );
  };

  //   const getStoredAdminData = () => {
  //     try {
  //       const adminData = localStorage.getItem('adminData') || sessionStorage.getItem('adminData');
  //       return adminData ? JSON.parse(adminData) : null;
  //     } catch (error) {
  //       console.error('Error parsing admin data:', error);
  //       return null;
  //     }
  //   };

  const clearTokens = () => {
    // Clear from both storages
    const items = [
      "accessToken",
      "refreshToken",
      "tokenExpiry",
      "adminData",
      "loginTime",
      "rememberMe",
    ];

    items.forEach((item) => {
      localStorage.removeItem(item);
      sessionStorage.removeItem(item);
    });

    // Remove authorization header
    delete axiosInstance.defaults.headers.common["Authorization"];

    console.log("Tokens cleared");
  };

  // Initialize axios with stored token on component mount
  useEffect(() => {
    const token = getStoredToken();
    if (token) {
      axiosInstance.defaults.headers.common[
        "Authorization"
      ] = `Bearer ${token}`;
    }
  }, []);

  // Refresh token function
  const refreshAccessToken = async () => {
    try {
      const refreshToken = getStoredRefreshToken();
      if (!refreshToken) {
        throw new Error("No refresh token available");
      }

      console.log("Attempting to refresh token...");

      const response = await axiosInstance.post("/auth/refresh", {
        refreshToken: refreshToken,
      });

      if (response.data.success && response.data.data.tokens) {
        const { tokens, admin, data } = response.data.data;
        const rememberMe = localStorage.getItem("rememberMe") === "true";

        // Update stored tokens
        storeTokens(tokens, data, admin || rememberMe);

        console.log("Token refreshed successfully");
        return tokens.accessToken;
      } else {
        throw new Error("Invalid refresh response");
      }
    } catch (error) {
      console.error("Token refresh failed:", error);
      clearTokens();
      setError("Session expired. Please login again.");
      return null;
    }
  };

  // Axios interceptor for handling token refresh
  useEffect(() => {
    const requestInterceptor = axiosInstance.interceptors.request.use(
      (config) => {
        const token = getStoredToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    const responseInterceptor = axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          const newToken = await refreshAccessToken();
          if (newToken) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return axiosInstance(originalRequest);
          } else {
            // Redirect to login or handle logout
            clearTokens();
            window.location.reload();
          }
        }

        return Promise.reject(error);
      }
    );

    return () => {
      axiosInstance.interceptors.request.eject(requestInterceptor);
      axiosInstance.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  // 3D particle canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener("resize", resize);

    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      z: Math.random() * 400,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      vz: (Math.random() - 0.5) * 0.5,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2, cy = canvas.height / 2;
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy; p.z += p.vz;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        if (p.z < 0 || p.z > 400) p.vz *= -1;
        const scale = 400 / (400 + p.z);
        const sx = cx + (p.x - cx) * scale;
        const sy = cy + (p.y - cy) * scale;
        const r = Math.max(1, 3 * scale);
        const alpha = 0.15 + 0.35 * scale;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(99, 102, 241, ${alpha})`;
        ctx.fill();
      }
      // connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(99, 102, 241, ${0.06 * (1 - dist / 120)})`;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);

  // Mouse position tracking
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError("");
        setSuccess("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    // Clear error when user starts typing
    if (error) {
      setError("");
    }
  };

  const validateForm = () => {
    if (!formData.email.trim()) {
      setError("Email is required");
      return false;
    }

    if (!formData.password.trim()) {
      setError("Password is required");
      return false;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      console.log("Attempting login with:", { email: formData.email });

      const response = await axiosInstance.post("/login", {
        email: formData.email.trim(),
        password: formData.password,
      });

      console.log("Login response:", response.data);

      if (response.data.success) {
        const { admin, tokens, loginInfo } = response.data.data;

        // Store tokens and user data
        storeTokens(tokens, admin, formData.rememberMe);

        setSuccess(`Welcome back, ${admin.name}!`);

        // Log successful login
        console.log("Login successful:", {
          user: admin.name,
          email: admin.email,
          lastLogin: loginInfo.lastLogin,
          permissions: admin.permissions,
        });

        // Redirect to dashboard after short delay
        setTimeout(() => {
          // Replace this with your routing logic
          window.location.href = "/dashboard";
          // or if using React Router: navigate('/dashboard');
        }, 1500);
      } else {
        setError(response.data.message || "Login failed. Please try again.");
      }
    } catch (error) {
      console.error("Login error:", error);

      let errorMessage = "Login failed. Please try again.";

      if (error.response) {
        // Server responded with error status
        errorMessage =
          error.response.data?.message || `Error: ${error.response.status}`;
      } else if (error.request) {
        // Network error
        errorMessage =
          "Unable to connect to server. Please check your connection.";
      } else {
        // Other error
        errorMessage = error.message || "An unexpected error occurred.";
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  const dismissMessage = () => {
    setError("");
    setSuccess("");
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex" style={{ background: "linear-gradient(135deg, #0f0c29 0%, #1a1a4e 40%, #24243e 100%)" }}>
      {/* CSS animations */}
      <style>{`
        @keyframes rotateCube {
          0%   { transform: rotateX(-20deg) rotateY(0deg); }
          25%  { transform: rotateX(-20deg) rotateY(90deg); }
          50%  { transform: rotateX(-20deg) rotateY(180deg); }
          75%  { transform: rotateX(-20deg) rotateY(270deg); }
          100% { transform: rotateX(-20deg) rotateY(360deg); }
        }
        @keyframes float3d {
          0%, 100% { transform: translateY(0) translateZ(0) rotateX(0); }
          50% { transform: translateY(-20px) translateZ(20px) rotateX(5deg); }
        }
        @keyframes orbitRing {
          0% { transform: rotateX(70deg) rotateZ(0deg); }
          100% { transform: rotateX(70deg) rotateZ(360deg); }
        }
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.3), 0 0 60px rgba(99, 102, 241, 0.1); }
          50% { box-shadow: 0 0 40px rgba(99, 102, 241, 0.5), 0 0 80px rgba(99, 102, 241, 0.2); }
        }
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        .cube-scene { perspective: 800px; }
        .cube {
          width: 140px; height: 140px; position: relative;
          transform-style: preserve-3d;
          animation: rotateCube 16s linear infinite;
        }
        .cube-face {
          position: absolute; width: 140px; height: 140px;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          background: rgba(99, 102, 241, 0.08);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(129, 140, 248, 0.25);
          border-radius: 16px; color: #a5b4fc;
          font-size: 11px; font-weight: 600; letter-spacing: 0.05em;
        }
        .cube-face.front  { transform: translateZ(70px); }
        .cube-face.back   { transform: rotateY(180deg) translateZ(70px); }
        .cube-face.left   { transform: rotateY(-90deg) translateZ(70px); }
        .cube-face.right  { transform: rotateY(90deg) translateZ(70px); }
        .cube-face.top    { transform: rotateX(90deg) translateZ(70px); }
        .cube-face.bottom { transform: rotateX(-90deg) translateZ(70px); }
        .orbit-ring {
          position: absolute; width: 260px; height: 260px;
          border: 1px solid rgba(129, 140, 248, 0.15);
          border-radius: 50%;
          animation: orbitRing 12s linear infinite;
        }
        .orbit-dot {
          position: absolute; width: 8px; height: 8px;
          background: #818cf8; border-radius: 50%;
          box-shadow: 0 0 12px rgba(129, 140, 248, 0.6);
          top: -4px; left: 50%; margin-left: -4px;
        }
        .glass-card {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
        }
        .input-glass {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 14px;
          transition: all 0.3s;
          color: #e2e8f0;
        }
        .input-glass:focus {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(129, 140, 248, 0.5);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
          outline: none;
        }
        .input-glass::placeholder { color: rgba(148, 163, 184, 0.6); }
        .btn-primary {
          background: linear-gradient(135deg, #6366f1, #818cf8);
          border-radius: 14px; color: white; font-weight: 600;
          transition: all 0.3s; position: relative; overflow: hidden;
        }
        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(99, 102, 241, 0.35);
        }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .animate-slideUp { animation: slideUp 0.6s ease-out both; }
        .delay-1 { animation-delay: 0.1s; }
        .delay-2 { animation-delay: 0.2s; }
        .delay-3 { animation-delay: 0.3s; }
        .delay-4 { animation-delay: 0.4s; }
      `}</style>

      {/* 3D Particle Canvas (background) */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }} />

      {/* Radial glow following mouse */}
      <div className="fixed pointer-events-none transition-all duration-700 ease-out"
        style={{ left: mousePosition.x - 300, top: mousePosition.y - 300, width: 600, height: 600,
          background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)",
          borderRadius: "50%", zIndex: 1 }} />

      {/* Error/Success Toast */}
      {(error || success) && (
        <div className="fixed top-6 right-6 z-50 max-w-sm animate-slideUp">
          <div className={`p-4 rounded-2xl shadow-2xl border backdrop-blur-xl ${
            error ? "bg-red-500/10 border-red-500/30 text-red-300" : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {error ? <AlertCircle className="w-5 h-5 mr-3" /> : <CheckCircle className="w-5 h-5 mr-3" />}
                <span className="text-sm font-medium">{error || success}</span>
              </div>
              <button onClick={dismissMessage} className="ml-3 text-white/40 hover:text-white/70">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LEFT: 3D Showcase */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center" style={{ zIndex: 2 }}>
        <div className="flex flex-col items-center">
          {/* Brand */}
          <div className="mb-14 text-center animate-slideUp">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #6366f1, #818cf8)", animation: "glowPulse 3s ease-in-out infinite" }}>
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white tracking-tight mb-2">ERP NEXUS</h1>
            <p className="text-indigo-300/80 text-sm tracking-wide">Enterprise Resource Planning</p>
          </div>

          {/* 3D Cube + orbit ring */}
          <div className="relative flex items-center justify-center animate-slideUp delay-1" style={{ width: 280, height: 280 }}>
            <div className="orbit-ring" style={{ top: 10, left: 10 }}>
              <div className="orbit-dot"></div>
            </div>
            <div className="orbit-ring" style={{ top: 10, left: 10, animationDirection: "reverse", animationDuration: "18s", opacity: 0.5 }}>
              <div className="orbit-dot" style={{ background: "#c084fc" }}></div>
            </div>
            <div className="cube-scene">
              <div className="cube">
                {["front", "back", "right", "left", "top", "bottom"].map((face, i) => (
                  <div key={face} className={`cube-face ${face}`}>
                    {cubeFaces[i].icon}
                    <span className="mt-2">{cubeFaces[i].label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Stats bar */}
          <div className="mt-14 flex gap-10 animate-slideUp delay-2">
            {[
              { n: "50K+", l: "Users" },
              { n: "99.9%", l: "Uptime" },
              { n: "24/7", l: "Support" },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl font-bold text-white">{s.n}</div>
                <div className="text-xs text-indigo-400/70 mt-1">{s.l}</div>
              </div>
            ))}
          </div>

          {/* Trust strip */}
          <div className="mt-10 flex items-center gap-6 text-indigo-400/60 text-xs animate-slideUp delay-3">
            <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> Encrypted</span>
            <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" /> SOC2 Ready</span>
            <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> GDPR</span>
          </div>
        </div>
      </div>

      {/* RIGHT: Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-10 relative" style={{ zIndex: 2 }}>
        <div className="w-full max-w-md">

          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-10 animate-slideUp">
            <div className="w-14 h-14 mx-auto mb-3 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #6366f1, #818cf8)" }}>
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">ERP NEXUS</h1>
          </div>

          {/* Form Card */}
          <div className="glass-card p-8 sm:p-10 animate-slideUp delay-1">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Welcome Back</h2>
              <p className="text-slate-400 text-sm">Sign in to your ERP dashboard</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div className="animate-slideUp delay-2">
                <label className="block text-xs font-medium text-slate-400 mb-2 ml-1">Email Address</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange}
                    onKeyPress={handleKeyPress} disabled={isLoading} placeholder="you@company.com"
                    autoComplete="email"
                    className="w-full pl-12 pr-4 py-3.5 input-glass text-sm disabled:opacity-50" />
                </div>
              </div>

              {/* Password */}
              <div className="animate-slideUp delay-3">
                <label className="block text-xs font-medium text-slate-400 mb-2 ml-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                  <input type={showPassword ? "text" : "password"} name="password" value={formData.password}
                    onChange={handleInputChange} onKeyPress={handleKeyPress} disabled={isLoading}
                    placeholder="Enter password" autoComplete="current-password"
                    className="w-full pl-12 pr-12 py-3.5 input-glass text-sm disabled:opacity-50" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} disabled={isLoading}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                    {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                  </button>
                </div>
              </div>

              {/* Options row */}
              <div className="flex items-center justify-between animate-slideUp delay-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="rememberMe" checked={formData.rememberMe}
                    onChange={handleInputChange} disabled={isLoading}
                    className="w-3.5 h-3.5 rounded border-slate-600 text-indigo-500 focus:ring-indigo-500/30 bg-transparent" />
                  <span className="text-xs text-slate-400">Remember me</span>
                </label>
                <button type="button" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                  Forgot password?
                </button>
              </div>

              {/* Submit */}
              <button type="submit" disabled={isLoading || !formData.email || !formData.password}
                className="w-full py-3.5 btn-primary text-sm flex items-center justify-center gap-2 mt-2">
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-7 text-center">
              <p className="text-xs text-slate-500">
                Don&apos;t have an account?{" "}
                <button className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                  Contact Administrator
                </button>
              </p>
            </div>
          </div>

          {/* Bottom badge */}
          <div className="mt-6 flex items-center justify-center gap-2 text-slate-600 animate-slideUp delay-4">
            <Shield className="w-3.5 h-3.5" />
            <span className="text-[11px]">Enterprise-grade encryption</span>
          </div>
        </div>
      </div>

      {/* Version / Copyright */}
      <div className="absolute bottom-4 left-5 text-[11px] text-slate-700 z-10">ERP NEXUS v4.0.0</div>
      <div className="absolute bottom-4 right-5 text-[11px] text-slate-700 z-10">&copy; 2026 XENORA Technologies</div>
    </div>
  );
};

export default ERPLogin;
