"use client";

import { useState } from "react";
import axios from "axios";
import { Scanner } from '@yudiel/react-qr-scanner';
import { CheckCircle, QrCode, AlertTriangle } from "lucide-react";

export default function RepartidorScanner() {
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [escaneando, setEscaneando] = useState(true);

  const procesarQR = async (texto_qr: string) => {
    if (!escaneando) return; // Evita que escanee 10 veces seguidas por accidente
    
    setEscaneando(false); // Apagamos la cámara mientras procesa

    try {
      const respuesta = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/entregar-pedido`, {
        qr_token: texto_qr
      });
      setMensaje(respuesta.data.mensaje);
      setError("");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Código no reconocido o error de conexión.");
      setMensaje("");
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8 flex flex-col items-center font-sans">
      
      {/* Encabezado */}
      <div className="w-full max-w-md bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700 mb-8 text-center">
        <h1 className="text-3xl font-bold text-blue-400 mb-1">Yeti Driver</h1>
        <p className="text-slate-400 text-sm">Escáner de Entregas</p>
      </div>

      {/* Pantalla del Escáner */}
      <div className="w-full max-w-md bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700">
        {escaneando ? (
          <div className="animation-fade-in">
            <h2 className="text-center font-bold mb-4 flex items-center justify-center gap-2 text-slate-300">
              <QrCode /> Apunta al código del cliente
            </h2>
            <div className="rounded-xl overflow-hidden border-4 border-blue-500 shadow-lg shadow-blue-500/20">
              {/* Este es el componente mágico que abre la cámara */}
              <Scanner 
                onScan={(result) => procesarQR(result[0].rawValue)} 
                formats={['qr_code']}
              />
            </div>
          </div>
        ) : (
          <div className="text-center py-8 animation-fade-in">
            {mensaje ? (
              <div className="text-green-400">
                <CheckCircle size={80} className="mx-auto mb-4 drop-shadow-[0_0_15px_rgba(74,222,128,0.5)]" />
                <h2 className="text-2xl font-bold mb-2">¡Completado!</h2>
                <p className="text-green-100">{mensaje}</p>
              </div>
            ) : (
              <div className="text-red-400">
                <AlertTriangle size={80} className="mx-auto mb-4 drop-shadow-[0_0_15px_rgba(248,113,113,0.5)]" />
                <h2 className="text-2xl font-bold mb-2">Error</h2>
                <p className="text-red-100">{error}</p>
              </div>
            )}
            
            <button
              onClick={() => { setEscaneando(true); setMensaje(""); setError(""); }}
              className="mt-8 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-8 rounded-xl shadow-lg w-full transition-all"
            >
              Escanear Próximo Pedido
            </button>
          </div>
        )}
      </div>

    </div>
  );
}