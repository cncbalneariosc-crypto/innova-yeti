"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { CheckCircle, Clock, DollarSign, ShieldAlert } from "lucide-react";

export default function PanelAdministrador() {
  const [pagos, setPagos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);

  // 1. Cargar los pagos al abrir la página
  const cargarPagos = async () => {
    try {
      const respuesta = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/pagos-pendientes`);
      setPagos(respuesta.data);
    } catch (error) {
      console.error("Error al cargar pagos:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarPagos();
  }, []);

  // 2. Función del botón "Aprobar"
  const aprobarPago = async (idPago: string) => {
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/aprobar-pago`, {
        pago_id: idPago
      });
      alert("¡Pago aprobado y bidones sumados al cliente!");
      cargarPagos(); // Recargar la lista para que desaparezca el que ya aprobamos
    } catch (error) {
      alert("Error al aprobar el pago");
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8 font-sans">
      
      {/* Encabezado del Jefe */}
      <div className="max-w-4xl mx-auto bg-slate-800 p-6 rounded-2xl shadow-xl border border-blue-500/30 mb-8 flex items-center gap-4">
        <ShieldAlert size={40} className="text-blue-400" />
        <div>
          <h1 className="text-3xl font-bold text-blue-400">Centro de Mando Yeti</h1>
          <p className="text-slate-400 text-sm">Aprobación de Recargas y Pagos</p>
        </div>
      </div>

      {/* Lista de Pagos Pendientes */}
      <div className="max-w-4xl mx-auto">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Clock className="text-yellow-400" /> Pagos en Revisión ({pagos.length})
        </h2>

        {cargando ? (
          <p className="text-slate-400">Buscando transferencias...</p>
        ) : pagos.length === 0 ? (
          <div className="bg-slate-800 p-8 rounded-2xl text-center border border-slate-700">
            <p className="text-slate-400">¡Todo al día! No hay pagos pendientes por revisar.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {pagos.map((pago) => (
              <div key={pago.id} className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-lg flex flex-col md:flex-row justify-between items-center gap-4 hover:border-blue-500/50 transition-all">
                
                <div className="w-full md:w-auto flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg text-white">{pago.plan_comprado}</h3>
                    <span className="bg-yellow-500/20 text-yellow-400 text-xs px-3 py-1 rounded-full border border-yellow-500/30 uppercase tracking-wider font-bold">
                      Pendiente
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm mb-1">
                    <span className="font-semibold text-slate-300">Método:</span> {pago.metodo_pago}
                  </p>
                  <p className="text-slate-400 text-sm mb-1">
                    <span className="font-semibold text-slate-300">Referencia:</span> {pago.referencia}
                  </p>
                  <p className="text-slate-400 text-sm mb-1 truncate max-w-[200px]" title={pago.usuario_id}>
                    <span className="font-semibold text-slate-300">Cliente ID:</span> {pago.usuario_id}
                  </p>
                </div>

                <div className="w-full md:w-auto flex items-center justify-between md:flex-col gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-400 flex items-center justify-end gap-1">
                      <DollarSign size={20}/>{pago.monto_usd}
                    </p>
                    <p className="text-xs text-slate-400">{pago.monto_bs} Bs.</p>
                  </div>
                  <button 
                    onClick={() => aprobarPago(pago.id)}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-lg shadow-lg shadow-blue-500/30 flex items-center gap-2 transition-all"
                  >
                    <CheckCircle size={18} /> Aprobar
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}