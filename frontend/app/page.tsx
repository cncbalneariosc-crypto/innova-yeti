"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { QRCodeSVG } from "qrcode.react";
import { Droplet, ShoppingBag, CheckCircle, CreditCard, ArrowLeft, LogOut, Lock, Mail, User } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

// --- INICIALIZAR SUPABASE EN EL FRONTEND ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AppInnovaYeti() {
  // --- ESTADOS DE AUTENTICACIÓN ---
  const [usuario, setUsuario] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [modoRegistro, setModoRegistro] = useState(false);
  const [cargandoAuth, setCargandoAuth] = useState(false);
  const [cargandoApp, setCargandoApp] = useState(true);

  // --- ESTADOS DEL DASHBOARD ---
  const [vista, setVista] = useState("inicio"); 
  const [saldo, setSaldo] = useState(0); 
  const [qrToken, setQrToken] = useState("");
  const [cargandoAccion, setCargandoAccion] = useState(false);
  const [planSeleccionado, setPlanSeleccionado] = useState<any>(null);
  const [referencia, setReferencia] = useState("");
  const [mensajePago, setMensajePago] = useState("");

  const planes = [
    { id: 1, nombre: "Plan Básico", bidones: 5, precio: 10 },
    { id: 2, nombre: "Plan Familiar", bidones: 10, precio: 18 },
    { id: 3, nombre: "Plan Yeti", bidones: 20, precio: 30 },
  ];

  // --- 1. VERIFICAR SESIÓN AL ENTRAR ---
  useEffect(() => {
    const verificarSesion = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUsuario(session?.user || null);
      setCargandoApp(false);
    };
    
    verificarSesion();

    // Escuchar si el usuario inicia o cierra sesión
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUsuario(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- 2. CARGAR SALDO CUANDO HAY USUARIO ---
  useEffect(() => {
    if (usuario) {
      cargarSaldoReal();
    }
  }, [usuario]);

  const cargarSaldoReal = async () => {
    if (!usuario) return;
    try {
      const respuesta = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/mi-saldo/${usuario.id}`);
      setSaldo(respuesta.data.saldo);
    } catch (error) {
      console.error("Error cargando saldo:", error);
    }
  };

  // --- 3. FUNCIONES DE AUTENTICACIÓN ---
  const manejarAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargandoAuth(true);
    try {
      if (modoRegistro) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert("¡Registro exitoso! Ya puedes iniciar sesión.");
        setModoRegistro(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error: any) {
      alert(error.message || "Error en la autenticación");
    } finally {
      setCargandoAuth(false);
    }
  };

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    setVista("inicio");
    setQrToken("");
  };

  // --- 4. FUNCIONES DEL NEGOCIO ---
  const pedirAgua = async () => {
    setCargandoAccion(true);
    try {
      const respuesta = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/crear-pedido`, {
        usuario_id: usuario.id, bidones_a_usar: 1, items_tienda: [], monto_extra_usd: 0
      });
      setQrToken(respuesta.data.qr_token);
      cargarSaldoReal(); 
    } catch (error) {
      alert("Error al pedir agua. Verifica tu saldo.");
    } finally {
      setCargandoAccion(false);
    }
  };

  const enviarPago = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planSeleccionado || !referencia) return;
    setCargandoAccion(true);
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/reportar-pago`, {
        usuario_id: usuario.id, plan_comprado: planSeleccionado.nombre,
        cantidad_bidones: planSeleccionado.bidones, monto_usd: planSeleccionado.precio,
        metodo_pago: "Pago Movil", referencia: referencia
      });
      setMensajePago(`¡Reporte enviado exitosamente!`);
      setReferencia(""); setPlanSeleccionado(null);
    } catch (error) {
      alert("Error al enviar el reporte.");
    } finally {
      setCargandoAccion(false);
    }
  };

  // --- PANTALLA DE CARGA ---
  if (cargandoApp) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Cargando Yeti...</div>;
  }

  // --- PANTALLA DE LOGIN / REGISTRO ---
  if (!usuario) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md bg-slate-800 p-8 rounded-3xl shadow-2xl border border-slate-700">
          <div className="text-center mb-8">
            <Droplet size={48} className="text-blue-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-white">Innova Yeti</h1>
            <p className="text-slate-400 mt-2">{modoRegistro ? "Crea tu cuenta" : "Inicia sesión en tu cuenta"}</p>
          </div>

          <form onSubmit={manejarAuth} className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-slate-300 mb-1 block">Correo Electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-slate-500" size={20} />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-10 p-3 rounded-xl bg-slate-900 border border-slate-600 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" placeholder="tu@correo.com" />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-300 mb-1 block">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-slate-500" size={20} />
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-10 p-3 rounded-xl bg-slate-900 border border-slate-600 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" placeholder="••••••••" />
              </div>
            </div>
            <button type="submit" disabled={cargandoAuth} className="w-full py-3 rounded-xl font-bold text-lg bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/30 transition-all mt-4">
              {cargandoAuth ? "Cargando..." : (modoRegistro ? "Registrarse" : "Entrar")}
            </button>
          </form>

          <p className="text-center mt-6 text-sm text-slate-400">
            {modoRegistro ? "¿Ya tienes cuenta? " : "¿No tienes cuenta? "}
            <button onClick={() => setModoRegistro(!modoRegistro)} className="text-blue-400 font-bold hover:underline">
              {modoRegistro ? "Inicia Sesión" : "Regístrate"}
            </button>
          </p>
        </div>
      </div>
    );
  }

  // --- PANTALLA DEL DASHBOARD (SI HAY USUARIO) ---
  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 md:p-8 flex flex-col items-center font-sans">
      <div className="w-full max-w-md bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700 mb-6 flex justify-between items-center relative">
        {vista === "recargas" ? (
          <button onClick={() => {setVista("inicio"); setMensajePago(""); cargarSaldoReal();}} className="text-slate-400 hover:text-white flex items-center gap-2">
            <ArrowLeft size={20}/> Volver
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-full"><User size={20} /></div>
            <div className="overflow-hidden">
              <h1 className="text-xl font-bold text-white truncate max-w-[200px]">{usuario.email}</h1>
            </div>
          </div>
        )}
        <button onClick={cerrarSesion} title="Cerrar Sesión" className="text-red-400 hover:text-red-300 p-2 bg-red-400/10 rounded-lg">
          <LogOut size={20} />
        </button>
      </div>

      {vista === "inicio" && (
        <>
          <div className="w-full max-w-md bg-gradient-to-br from-blue-600 to-blue-800 p-6 rounded-2xl shadow-xl mb-6 flex items-center justify-between">
            <div>
              <p className="text-blue-200 text-sm font-semibold uppercase tracking-wider">Bidones Disponibles</p>
              <p className="text-5xl font-bold mt-1">{saldo}</p>
            </div>
            <Droplet size={64} className="text-blue-300 opacity-80" />
          </div>

          <div className="w-full max-w-md bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-700 flex flex-col items-center text-center">
            {qrToken ? (
              <div className="flex flex-col items-center">
                <div className="bg-white p-4 rounded-xl mb-4"><QRCodeSVG value={qrToken} size={200} level="H" /></div>
                <h2 className="text-xl font-bold text-green-400 flex items-center gap-2"><CheckCircle /> ¡Pedido Generado!</h2>
                <button onClick={() => setQrToken("")} className="mt-6 text-sm text-blue-400 underline">Hacer otro pedido</button>
              </div>
            ) : (
              <>
                <ShoppingBag size={48} className="text-slate-500 mb-4" />
                <button onClick={pedirAgua} disabled={cargandoAccion || saldo <= 0} className="w-full py-4 rounded-xl font-bold text-lg bg-blue-500 hover:bg-blue-400 text-white shadow-lg mb-4 disabled:bg-slate-700 disabled:text-slate-500 disabled:shadow-none">
                  {cargandoAccion ? "Generando..." : "Pedir 1 Bidón"}
                </button>
                <button onClick={() => setVista("recargas")} className="w-full py-3 rounded-xl font-bold text-md border border-slate-600 hover:bg-slate-700 text-slate-300 flex justify-center items-center gap-2">
                  <CreditCard size={20} /> Recargar Saldo
                </button>
              </>
            )}
          </div>
        </>
      )}

      {vista === "recargas" && (
        <div className="w-full max-w-md bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700">
          {mensajePago ? (
            <div className="text-center p-6 bg-green-900/30 border border-green-500/50 rounded-xl">
              <CheckCircle size={48} className="text-green-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-green-300 mb-2">¡Reporte Recibido!</h2>
              <p className="text-slate-400 text-xs mt-4">Tus bidones aparecerán en tu inicio en cuanto el administrador los apruebe.</p>
            </div>
          ) : (
            <form onSubmit={enviarPago}>
              <h2 className="text-lg font-bold mb-4">1. Elige tu plan:</h2>
              <div className="flex flex-col gap-3 mb-6">
                {planes.map(plan => (
                  <label key={plan.id} className={`p-4 rounded-xl border cursor-pointer flex justify-between items-center ${planSeleccionado?.id === plan.id ? 'bg-blue-600 border-blue-400' : 'bg-slate-700 border-slate-600'}`}>
                    <div className="flex items-center gap-3">
                      <input type="radio" name="plan" className="w-4 h-4" onChange={() => setPlanSeleccionado(plan)} />
                      <div><p className="font-bold">{plan.nombre}</p><p className="text-xs text-slate-300">{plan.bidones} Bidones</p></div>
                    </div>
                    <p className="font-bold text-lg">${plan.precio}</p>
                  </label>
                ))}
              </div>
              {planSeleccionado && (
                <div>
                  <h2 className="text-lg font-bold mb-2">2. Reporta tu pago:</h2>
                  <input type="text" placeholder="Referencia" value={referencia} onChange={(e) => setReferencia(e.target.value)} className="w-full p-4 rounded-xl bg-slate-900 border border-slate-600 mb-4 text-white" required />
                  <button type="submit" disabled={cargandoAccion} className="w-full py-4 rounded-xl font-bold text-lg bg-green-500 hover:bg-green-400 text-white shadow-lg">
                    {cargandoAccion ? "Enviando..." : "Enviar Reporte"}
                  </button>
                </div>
              )}
            </form>
          )}
        </div>
      )}
    </div>
  );
}