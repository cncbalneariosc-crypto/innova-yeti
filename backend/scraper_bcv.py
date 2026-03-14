import requests
from bs4 import BeautifulSoup

def obtener_tasa_bcv():
    try:
        url = "https://www.bcv.org.ve/"
        response = requests.get(url, verify=False) # BCV a veces tiene problemas de certificados
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Buscamos el div del Dólar
        tasa = soup.find("div", id="dolar").find("strong").text.strip()
        tasa_limpia = tasa.replace(',', '.')
        return float(tasa_limpia)
    except Exception as e:
        print(f"Error obteniendo tasa: {e}")
        return None

# Prueba rápida
if __name__ == "__main__":
    print(f"La tasa actual es: {obtener_tasa_bcv()}")