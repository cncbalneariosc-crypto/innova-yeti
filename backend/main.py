import os
import uuid
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client
from dotenv import load_dotenv
from scraper_bcv import obtener_tasa_bcv

# Cargar variables de entorno
load_dotenv()

app = FastAPI(title="Innova Yeti Suministros API")

# --- CONFIGURACIÓN CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- CONFIGURACIÓN DE SUPABASE ---
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE") 
if not url or not key:
    print("❌ Error: Faltan las credenciales en el archivo .env")
else:
    supabase: Client = create_client(url, key)

# ==========================================
#              MODELOS DE DATOS
# ==========================================
class NuevoPedido(BaseModel):
    usuario_id: str
    bidones_a_usar: int
    items_tienda: list  
    monto_extra_usd: float

class ReportePago(BaseModel):
    usuario_id: str
    plan_comprado: str
    cantidad_bidones: int
    monto_usd: float
    metodo_pago: str
    referencia: str

class AprobarPago(BaseModel):
    pago_id: str

class CompletarEntrega(BaseModel):
    qr_token: str

# ==========================================
#                 RUTAS
# ==========================================

# --- 1. INICIO ---
@app.get("/")
def inicio():
    return {"mensaje": "Bienvenido a Innova Yeti Suministros API", "estado": "online"}

# --- 2. ACTUALIZAR TASA BCV ---
@app.get("/actualizar-tasa")
def actualizar_tasa_en_db():
    try:
        tasa = obtener_tasa_bcv()
        if not tasa:
            raise HTTPException(status_code=500, detail="El scraper no devolvió datos")
        supabase.table("configuracion").update({"valor": str(tasa)}).eq("clave", "tasa_bcv").execute()
        return {"status": "Exitoso", "tasa_capturada": tasa}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- 3. VER TIENDA Y PRODUCTOS ---
@app.get("/tienda")
def ver_productos():
    try:
        productos = supabase.table("productos").select("*").execute()
        config = supabase.table("configuracion").select("valor").eq("clave", "tasa_bcv").single().execute()
        tasa = float(config.data['valor'])
        return [{**p, 'precio_bs': round(p['precio_usd'] * tasa, 2)} for p in productos.data]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- 4. OBTENER SALDO DEL CLIENTE ---
@app.get("/mi-saldo/{usuario_id}")
def obtener_saldo(usuario_id: str):
    try:
        res = supabase.table("perfiles").select("saldo_bidones").eq("id", usuario_id).single().execute()
        if not res.data:
            return {"saldo": 0}
        return {"saldo": res.data["saldo_bidones"]}
    except Exception as e:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

# --- 5. CREAR PEDIDO (GENERAR QR) ---
@app.post("/crear-pedido")
def crear_pedido(pedido: NuevoPedido):
    try:
        res_perfil = supabase.table("perfiles").select("saldo_bidones").eq("id", pedido.usuario_id).single().execute()
        perfil = res_perfil.data
        
        if not perfil or perfil["saldo_bidones"] < pedido.bidones_a_usar: 
            raise HTTPException(status_code=400, detail="Saldo insuficiente")
        
        nuevo_saldo = perfil["saldo_bidones"] - pedido.bidones_a_usar
        supabase.table("perfiles").update({"saldo_bidones": nuevo_saldo}).eq("id", pedido.usuario_id).execute()
        
        token_qr = str(uuid.uuid4())
        
        config = supabase.table("configuracion").select("valor").eq("clave", "tasa_bcv").single().execute()
        tasa = float(config.data['valor'])
        
        nueva_orden = {
            "usuario_id": pedido.usuario_id,
            "codigo_qr": token_qr,
            "monto_extra_usd": pedido.monto_extra_usd,
            "tasa_bcv_pago": tasa,
            "productos_adicionales": pedido.items_tienda,
            "estado": "pendiente"
        }
        supabase.table("pedidos").insert(nueva_orden).execute()
        
        return {
            "mensaje": "Pedido creado con éxito", 
            "qr_token": token_qr, 
            "saldo_restante_bidones": nuevo_saldo
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- 6. REPORTAR PAGO (CLIENTE) ---
@app.post("/reportar-pago")
def reportar_pago(pago: ReportePago):
    try:
        config = supabase.table("configuracion").select("valor").eq("clave", "tasa_bcv").single().execute()
        tasa = float(config.data['valor'])
        monto_bs = round(pago.monto_usd * tasa, 2)
        
        # SOLO SE GUARDA EL PAGO COMO PENDIENTE. NO SE SUMAN BIDONES AQUÍ.
        supabase.table("pagos").insert({
            "usuario_id": pago.usuario_id, "plan_comprado": pago.plan_comprado, 
            "cantidad_bidones": pago.cantidad_bidones, "monto_usd": pago.monto_usd, 
            "monto_bs": monto_bs, "metodo_pago": pago.metodo_pago, 
            "referencia": pago.referencia, "estado": "pendiente"
        }).execute()
        
        return {"mensaje": "Pago reportado exitosamente. En revisión.", "monto_procesado_bs": monto_bs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- 7. VER PAGOS PENDIENTES (JEFE) ---
@app.get("/pagos-pendientes")
def ver_pagos_pendientes():
    try:
        res = supabase.table("pagos").select("*").eq("estado", "pendiente").execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- 8. APROBAR PAGO (JEFE) ---
@app.post("/aprobar-pago")
def aprobar_pago_admin(datos: AprobarPago):
    try:
        res_pago = supabase.table("pagos").select("*").eq("id", datos.pago_id).single().execute()
        pago = res_pago.data
        
        if not pago:
            raise HTTPException(status_code=404, detail="Pago no encontrado")
            
        if pago["estado"] == "aprobado": 
            return {"mensaje": "Cuidado: Este pago ya fue aprobado anteriormente."}
        
        res_perfil = supabase.table("perfiles").select("saldo_bidones").eq("id", pago["usuario_id"]).single().execute()
        saldo_actual = res_perfil.data["saldo_bidones"] if res_perfil.data else 0
        
        # AQUÍ ES DONDE SE SUMAN LOS BIDONES REALMENTE
        nuevo_saldo = saldo_actual + pago["cantidad_bidones"]
        
        supabase.table("perfiles").update({"saldo_bidones": nuevo_saldo}).eq("id", pago["usuario_id"]).execute()
        supabase.table("pagos").update({"estado": "aprobado"}).eq("id", datos.pago_id).execute()
        
        return {"mensaje": "¡Pago aprobado con éxito!", "nuevo_saldo_cliente": nuevo_saldo}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- 9. ESCANEAR QR Y ENTREGAR (REPARTIDOR) ---
@app.post("/entregar-pedido")
def entregar_pedido(datos: CompletarEntrega):
    try:
        pedido_res = supabase.table("pedidos").select("*").eq("codigo_qr", datos.qr_token).single().execute()
        
        if not pedido_res.data:
            raise HTTPException(status_code=404, detail="Código QR inválido o no existe en el sistema")
            
        pedido = pedido_res.data
        
        if pedido["estado"] == "entregado":
            return {"mensaje": "¡Cuidado! Este pedido ya fue entregado anteriormente."}
            
        supabase.table("pedidos").update({"estado": "entregado"}).eq("codigo_qr", datos.qr_token).execute()
        
        return {"mensaje": "¡Agua entregada con éxito! El sistema ha sido actualizado."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))