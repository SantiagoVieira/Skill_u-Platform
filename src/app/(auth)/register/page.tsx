"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthLeft } from "@/components/auth/AuthLeft";
import { supabase } from "@/lib/supabase";

export default function RegisterPage() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [program, setProgram] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          program,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // El trigger de Supabase crea el perfil automáticamente
    router.push("/materiales");
  }

  return (
    <div className="auth-wrapper">
      <AuthLeft
        headline={
          <>
            Únete a la
            <br />
            comunidad
            <br />
            <em>estudiantil.</em>
          </>
        }
        stats={[
          { value: "Gratis", label: "Siempre" },
          { value: "2 min", label: "Registro" },
          { value: "100%", label: "Estudiantes" },
        ]}
      />

      <div className="auth-right" style={{ paddingTop: 36, paddingBottom: 36 }}>
        <h1 className="auth-form-title">Crear cuenta</h1>
        <p className="auth-form-sub">Completa tu perfil universitario</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-form-row">
            <div className="field-group">
              <label className="field-label" htmlFor="firstName">
                Nombre
              </label>
              <input
                id="firstName"
                className="field-input"
                type="text"
                placeholder="Juan"
                autoComplete="given-name"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="lastName">
                Apellido
              </label>
              <input
                id="lastName"
                className="field-input"
                type="text"
                placeholder="García"
                autoComplete="family-name"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          <div className="field-group">
            <label className="field-label" htmlFor="reg-email">
              Correo electrónico
            </label>
            <input
              id="reg-email"
              className="field-input"
              type="email"
              placeholder="tu@universidad.edu.co"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="field-group">
            <label className="field-label" htmlFor="program">
              Carrera / Programa
            </label>
            <input
              id="program"
              className="field-input"
              type="text"
              placeholder="Ej: Ingeniería de Sistemas"
              value={program}
              onChange={(e) => setProgram(e.target.value)}
            />
          </div>

          <div className="field-group">
            <label className="field-label" htmlFor="reg-password">
              Contraseña
            </label>
            <input
              id="reg-password"
              className="field-input"
              type="password"
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Creando cuenta…" : "Crear mi cuenta"}
          </button>

          <p className="auth-terms">
            Al registrarte aceptas nuestros{" "}
            <Link href="#">Términos de uso</Link> y{" "}
            <Link href="#">Política de privacidad</Link>
          </p>
        </form>

        <p className="auth-switch">
          ¿Ya tienes cuenta? <Link href="/login">Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
}
