import { useState } from "react";
import { supabase } from "../../config/supabase.js";
import { Sparkles, Loader, CheckCircle, ArrowLeft } from "lucide-react";

export function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Form Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [selectedRole, setSelectedRole] = useState<"client" | "photographer">("client");

  // OTP Verification States
  const [useOtpLogin, setUseOtpLogin] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpType, setOtpType] = useState<"signup" | "email">("signup");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      if (otpSent) {
        // OTP Verification Step
        const { data, error } = await supabase.auth.verifyOtp({
          email,
          token: otpCode,
          type: otpType,
        });

        if (error) throw error;

        // If signup verify succeeded and role was photographer, update database profile role
        if (data.user && isSignUp && selectedRole === "photographer") {
          const { error: roleErr } = await supabase
            .from("profiles")
            .update({ role: "photographer" })
            .eq("id", data.user.id);
          if (roleErr) console.error("Error setting role to photographer:", roleErr);
        }

        setSuccessMsg("Xác thực mã OTP thành công! Đang đăng nhập vào hệ thống...");
        return;
      }

      if (isSignUp) {
        // 1. Sign Up Flow
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });

        if (error) throw error;

        // Display OTP input screen for signup email verification
        setOtpType("signup");
        setOtpSent(true);
        setSuccessMsg("Đăng ký tài khoản thành công! Một mã OTP 6 chữ số đã được gửi tới email của bạn. Vui lòng nhập mã để kích hoạt.");
      } else {
        // 2. Sign In Flow
        if (useOtpLogin) {
          // Passwordless OTP Login
          const { error } = await supabase.auth.signInWithOtp({
            email,
          });

          if (error) throw error;

          setOtpType("email");
          setOtpSent(true);
          setSuccessMsg("Một mã OTP đăng nhập đã được gửi tới email của bạn. Vui lòng nhập mã bên dưới để đăng nhập.");
        } else {
          // Standard password login
          const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) throw error;
        }
      }
    } catch (err: any) {
      console.error("Authentication action failure:", err);
      setErrorMsg(err.message || "Đã xảy ra lỗi trong quá trình xác thực.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetForm = () => {
    setOtpSent(false);
    setOtpCode("");
    setErrorMsg("");
    setSuccessMsg("");
  };

  const handleSocialAuth = async (provider: "google" | "facebook") => {
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin,
          queryParams: provider === "google" ? {
            access_type: "offline",
            prompt: "consent",
          } : undefined,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      console.error(`Social auth (${provider}) error:`, err);
      const providerName = provider === "google" ? "Google" : "Facebook";
      if (err.message?.includes("provider is not enabled") || err.code === 400 || err.error_code === "validation_failed") {
        setErrorMsg(
          `Tính năng đăng nhập bằng ${providerName} chưa được BẬT trên Supabase Dashboard. Vui lòng truy cập Supabase Dashboard -> Authentication -> Providers -> Bật (Enable) ${providerName} và dán Client ID / Secret vào đó.`
        );
      } else {
        setErrorMsg(err.message || `Không thể xác thực bằng ${providerName}.`);
      }
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="min-h-screen bg-photohub-sand flex flex-col justify-center items-center p-4">
      <div className="bg-white border border-photohub-teal/10 rounded-2xl w-full max-w-md p-8 shadow-xl space-y-6 animate-scaleUp">
        {/* Brand Logo Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-photohub-teal text-photohub-sand shadow-md">
            <Sparkles className="w-6 h-6 text-photohub-orange fill-photohub-orange" />
          </div>
          <h2 className="text-3xl font-extrabold text-photohub-teal font-serif">PhotoHub</h2>
          <p className="text-xs text-photohub-muted font-semibold uppercase tracking-wider font-mono">
            {otpSent 
              ? "Xác thực mã OTP" 
              : isSignUp 
                ? "Tạo tài khoản mới" 
                : useOtpLogin 
                  ? "Đăng nhập bằng mã OTP" 
                  : "Đăng nhập hệ sinh thái Studio"
            }
          </p>
        </div>

        {/* Tab Toggle - Only visible when not verifying OTP */}
        {!otpSent && (
          <div className="grid grid-cols-2 bg-photohub-sand p-1.5 rounded-lg text-xs font-semibold text-photohub-teal">
            <button
              onClick={() => {
                setIsSignUp(false);
                setUseOtpLogin(false);
                handleResetForm();
              }}
              className={`py-2 rounded-md transition-all cursor-pointer ${
                !isSignUp ? "bg-white text-photohub-teal shadow-sm font-bold" : "text-photohub-muted"
              }`}
            >
              Đăng Nhập
            </button>
            <button
              onClick={() => {
                setIsSignUp(true);
                handleResetForm();
              }}
              className={`py-2 rounded-md transition-all cursor-pointer ${
                isSignUp ? "bg-white text-photohub-teal shadow-sm font-bold" : "text-photohub-muted"
              }`}
            >
              Đăng Ký
            </button>
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {otpSent ? (
            // OTP Code Screen
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="font-semibold text-photohub-teal">Mã OTP (6 chữ số)</label>
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="123456"
                  maxLength={6}
                  className="w-full bg-photohub-sand border border-photohub-teal/10 rounded-lg p-3 text-photohub-teal text-center text-lg tracking-widest font-mono font-bold focus:border-photohub-orange focus:outline-none"
                  required
                />
                <p className="text-[10px] text-photohub-muted font-semibold mt-1">
                  Vui lòng kiểm tra hộp thư đến (hoặc hòm thư rác) của địa chỉ: <strong className="text-photohub-teal">{email}</strong>
                </p>
              </div>

              <button
                type="button"
                onClick={handleResetForm}
                className="flex items-center gap-1.5 text-photohub-orange hover:underline font-semibold cursor-pointer py-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Quay lại nhập thông tin
              </button>
            </div>
          ) : (
            // standard Fields Screen
            <>
              {isSignUp && (
                <>
                  <div className="space-y-1.5">
                    <label className="font-semibold text-photohub-teal">Họ và Tên</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Nguyễn Văn A"
                      className="w-full bg-photohub-sand border border-photohub-teal/10 rounded-lg p-3 text-photohub-teal focus:border-photohub-orange focus:outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-photohub-teal block">Bạn muốn đăng ký làm:</label>
                    <div className="grid grid-cols-2 gap-3 mt-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedRole("client")}
                        className={`py-2.5 rounded-lg border font-bold text-center transition-all cursor-pointer ${
                          selectedRole === "client"
                            ? "bg-photohub-teal text-white border-photohub-teal shadow-sm"
                            : "bg-photohub-sand/30 text-photohub-muted border-photohub-teal/10 hover:bg-photohub-sand/50"
                        }`}
                      >
                        🙋 Khách Hàng
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedRole("photographer")}
                        className={`py-2.5 rounded-lg border font-bold text-center transition-all cursor-pointer ${
                          selectedRole === "photographer"
                            ? "bg-photohub-teal text-white border-photohub-teal shadow-sm"
                            : "bg-photohub-sand/30 text-photohub-muted border-photohub-teal/10 hover:bg-photohub-sand/50"
                        }`}
                      >
                        📸 Nhiếp Ảnh Gia
                      </button>
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-1.5">
                <label className="font-semibold text-photohub-teal">Địa chỉ Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full bg-photohub-sand border border-photohub-teal/10 rounded-lg p-3 text-photohub-teal focus:border-photohub-orange focus:outline-none"
                  required
                />
              </div>

              {!isSignUp && useOtpLogin ? null : (
                <div className="space-y-1.5">
                  <label className="font-semibold text-photohub-teal">Mật khẩu</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-photohub-sand border border-photohub-teal/10 rounded-lg p-3 text-photohub-teal focus:border-photohub-orange focus:outline-none"
                    required
                  />
                </div>
              )}

              {/* Passwordless OTP Login Switch */}
              {!isSignUp && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => {
                      setUseOtpLogin(!useOtpLogin);
                      setErrorMsg("");
                      setSuccessMsg("");
                    }}
                    className="text-[11px] text-photohub-orange hover:underline font-semibold cursor-pointer"
                  >
                    {useOtpLogin ? "🔑 Đăng nhập bằng mật khẩu thường" : "📧 Đăng nhập không cần mật khẩu (gửi OTP)"}
                  </button>
                </div>
              )}
            </>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-photohub-orange hover:bg-photohub-orange/95 text-white font-bold py-3.5 rounded-lg flex items-center justify-center gap-2 transition-transform active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-md text-sm mt-6"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                <span>Đang xử lý...</span>
              </>
            ) : (
              <span>
                {otpSent 
                  ? "Xác nhận mã OTP" 
                  : isSignUp 
                    ? "Đăng Ký Tài Khoản & Nhận OTP" 
                    : useOtpLogin 
                      ? "Gửi Mã OTP Đăng Nhập" 
                      : "Đăng Nhập"
                }
              </span>
            )}
          </button>
        </form>

        {/* Divider & Social Login Options */}
        {!otpSent && (
          <div className="space-y-4 pt-1">
            <div className="relative flex items-center justify-center">
              <div className="border-t border-photohub-teal/10 w-full"></div>
              <span className="bg-white px-3 text-[11px] text-photohub-muted font-medium uppercase tracking-wider absolute">
                Hoặc tiếp tục với
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleSocialAuth("google")}
                disabled={loading}
                className="flex items-center justify-center gap-2 py-2.5 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer text-xs font-semibold text-gray-700 shadow-sm disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Google</span>
              </button>

              <button
                type="button"
                onClick={() => handleSocialAuth("facebook")}
                disabled={loading}
                className="flex items-center justify-center gap-2 py-2.5 px-4 bg-[#1877F2] hover:bg-[#166FE5] text-white rounded-lg transition-colors cursor-pointer text-xs font-semibold shadow-sm disabled:opacity-50"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span>Facebook</span>
              </button>
            </div>
          </div>
        )}


        {/* Feedback Messages */}
        {successMsg && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-lg text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0 animate-bounce" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-lg text-xs">
            <span className="font-semibold">Lỗi hệ thống:</span> {errorMsg}
          </div>
        )}

        {/* Default Help Notice */}
        {!isSignUp && !otpSent && (
          <div className="bg-photohub-sand/50 p-4 rounded-xl border border-photohub-teal/5 text-[11px] text-photohub-muted leading-relaxed font-mono">
            <span className="font-bold text-photohub-teal">Tài khoản kiểm thử sẵn có:</span>
            <div className="mt-1">Email: <span className="text-photohub-teal font-semibold">client@example.com</span></div>
            <div>Mật khẩu: <span className="text-photohub-teal font-semibold">password123</span></div>
          </div>
        )}
      </div>
    </div>
  );
}
