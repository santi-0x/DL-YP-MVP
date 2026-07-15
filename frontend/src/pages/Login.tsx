import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { FilmBackdrop } from "../components/FilmBackdrop";

function AuthCard({ mode }: { mode: "login" | "register" }) {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState(mode === "login" ? "demo@lending.dev" : "");
  const [password, setPassword] = useState(mode === "login" ? "demopass123" : "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/markets" replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "login") await login(email, password);
      else await register(email, password);
      navigate("/markets");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <FilmBackdrop>
    <div className="grid min-h-screen md:grid-cols-[1.1fr_0.9fr]">
      <section className="flex flex-col justify-between px-8 py-10 md:px-14">
        <Link to="/" className="font-serif text-3xl">Fathom</Link>
        <div className="max-w-xl rounded-[28px] bg-[#fff4ea]/80 p-6 backdrop-blur-md">
          <p className="font-serif text-5xl leading-[0.95] md:text-6xl">
            The desk is open.
            <span className="italic text-acid"> The chain is not.</span>
          </p>
          <p className="mt-6 max-w-md text-mute">
            Sign in to markets, your position, a simulated loan, the stress book, history, and alerts.
          </p>
        </div>
        <p className="text-xs uppercase tracking-[0.18em] text-mute">Web2 MVP</p>
      </section>
      <section className="flex items-center bg-white/75 px-8 py-12 backdrop-blur-md md:px-14">
        <form onSubmit={submit} className="w-full max-w-sm space-y-4">
          <h1 className="font-serif text-4xl">{mode === "login" ? "Sign in" : "Open an account"}</h1>
          <label className="block text-sm text-mute">
            Email
            <input className="mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="block text-sm text-mute">
            Password
            <input className="mt-1" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          </label>
          {error ? <p className="text-sm text-ember">{error}</p> : null}
          <button type="submit" disabled={busy} className="w-full rounded-full bg-acid px-4 py-3 text-ink disabled:opacity-60">
            {busy ? "Working…" : mode === "login" ? "Enter the desk" : "Create account"}
          </button>
          {mode === "login" ? (
            <>
              <p className="text-sm text-mute">
                Demo desk: demo@lending.dev / demopass123. That login can open the ops console.
              </p>
              <p className="text-sm">
                <Link className="text-acid" to="/register">Create a borrower account</Link>
              </p>
            </>
          ) : (
            <p className="text-sm">
              <Link className="text-acid" to="/login">Already registered</Link>
            </p>
          )}
        </form>
      </section>
    </div>
    </FilmBackdrop>
  );
}

export function LoginPage() {
  return <AuthCard mode="login" />;
}

export function RegisterPage() {
  return <AuthCard mode="register" />;
}
