# tests/test_api_endpoints.py

import os
import requests

# Список эндпоинтов для проверки (будут обращаться не к localhost, а к доменному имени API)
API_BASE = os.getenv("BASE_URL", "http://bondio.ru")  # из .env: BASE_URL=http://bondio.ru

ENDPOINTS = {
    "Gupshup Test": f"{API_BASE}/api/test-gupshup",
    "AmoCRM Test": f"{API_BASE}/api/test-amocrm",
    "Send Message": f"{API_BASE}/api/send-message",
    "Webhook Receiver": f"{API_BASE}/webhook/gupshup",
    "OAuth Callback": f"{API_BASE}/api/amo/callback",
}

def check_endpoint(name, url, timeout=5):
    try:
        resp = requests.get(url, timeout=timeout)
        status = resp.status_code
        ok = resp.ok
    except Exception as e:
        status = None
        ok = False
    mark = "✅" if ok else "❌"
    print(f"{mark} {name}: {url} (status: {status})")
    return ok

def main():
    print("Проверка доступности API Эндпоинтов:\n")
    results = {}
    for name, url in ENDPOINTS.items():
        results[name] = check_endpoint(name, url)
    # Итоговый вывод
    print("\nИтог:")
    for name, ok in results.items():
        mark = "✅" if ok else "❌"
        print(f"{mark} {name}")
    # exit с кодом 0, если все успешны, иначе 1
    exit(0 if all(results.values()) else 1)

if __name__ == "__main__":
    main()
