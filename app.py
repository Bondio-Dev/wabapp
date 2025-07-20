#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
WhatsApp <-> AmoCRM Integration MVP
Простая интеграция между Gupshup WhatsApp API и AmoCRM API v4
"""

import os
import json
import time
import hashlib
import requests
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, render_template, redirect, url_for, flash, session
from werkzeug.exceptions import BadRequest
import urllib.parse

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'your-secret-key-change-me')

# === КОНФИГУРАЦИЯ ===
class Config:
    # Gupshup API
    GUPSHUP_API_KEY = os.getenv('GUPSHUP_API_KEY')
    GUPSHUP_APP_NAME = os.getenv('GUPSHUP_APP_NAME') 
    GUPSHUP_SOURCE_NUMBER = os.getenv('GUPSHUP_SOURCE_NUMBER')

    # AmoCRM API
    AMO_SUBDOMAIN = os.getenv('AMO_SUBDOMAIN')
    AMO_CLIENT_ID = os.getenv('AMO_CLIENT_ID')
    AMO_CLIENT_SECRET = os.getenv('AMO_CLIENT_SECRET')
    AMO_REDIRECT_URI = os.getenv('AMO_REDIRECT_URI')
    AMO_AUTH_URL = os.getenv('AMO_AUTH_URL')
    AMO_ACCESS_TOKEN = os.getenv('AMO_ACCESS_TOKEN', '')
    AMO_REFRESH_TOKEN = os.getenv('AMO_REFRESH_TOKEN', '')
    AMO_PIPELINE_ID = os.getenv('AMO_PIPELINE_ID')

    # Базовые URL
    BASE_URL = os.getenv('BASE_URL', 'http://localhost:3001')
    WEBHOOK_SECRET = os.getenv('WEBHOOK_SECRET', 'webhook_secret_key')

config = Config()

# === GUPSHUP API SERVICE ===
class GupshupService:
    def __init__(self):
        self.api_key = config.GUPSHUP_API_KEY
        self.app_name = config.GUPSHUP_APP_NAME
        self.source_number = config.GUPSHUP_SOURCE_NUMBER
        self.base_url = 'https://api.gupshup.io'

    def send_message(self, destination, message):
        """Отправка текстового сообщения через Gupshup API"""
        url = f"{self.base_url}/sm/api/v1/msg"

        headers = {
            'apikey': self.api_key,
            'Content-Type': 'application/x-www-form-urlencoded'
        }

        data = {
            'channel': 'whatsapp',
            'source': self.source_number,
            'destination': destination,
            'src.name': self.app_name,
            'message': json.dumps({
                'type': 'text',
                'text': message
            })
        }

        try:
            response = requests.post(url, headers=headers, data=data)
            return {
                'success': response.status_code == 202,
                'data': response.json() if response.text else {},
                'status_code': response.status_code,
                'error': None if response.status_code == 202 else response.text
            }
        except Exception as e:
            return {
                'success': False,
                'data': {},
                'status_code': 500,
                'error': str(e)
            }

    def test_connection(self):
        """Тестирование подключения к Gupshup API"""
        url = f"{self.base_url}/sm/api/v1/users/{self.app_name}"

        headers = {
            'apikey': self.api_key
        }

        try:
            response = requests.get(url, headers=headers)
            return {
                'success': response.status_code == 200,
                'data': response.json() if response.text else {},
                'status_code': response.status_code,
                'error': None if response.status_code == 200 else response.text
            }
        except Exception as e:
            return {
                'success': False,
                'data': {},
                'status_code': 500,
                'error': str(e)
            }

# === AMOCRM API SERVICE ===
class AmoCRMService:
    def __init__(self):
        self.subdomain = config.AMO_SUBDOMAIN
        self.client_id = config.AMO_CLIENT_ID
        self.client_secret = config.AMO_CLIENT_SECRET
        self.redirect_uri = config.AMO_REDIRECT_URI
        self.auth_url = config.AMO_AUTH_URL
        self.access_token = config.AMO_ACCESS_TOKEN
        self.refresh_token = config.AMO_REFRESH_TOKEN
        self.base_api_url = f'https://{self.subdomain}.amocrm.ru/api/v4'
        self.oauth_url = f'https://{self.subdomain}.amocrm.ru/oauth2/access_token'

    def get_auth_url(self):
        """Получение URL для OAuth авторизации"""
        params = {
            'client_id': self.client_id,
            'redirect_uri': self.redirect_uri,
            'response_type': 'code',
            'state': hashlib.md5(str(time.time()).encode()).hexdigest()
        }

        query_string = urllib.parse.urlencode(params)
        return f"{self.auth_url}?{query_string}"

    def get_token_by_code(self, code):
        """Получение токенов по authorization code"""
        data = {
            'client_id': self.client_id,
            'client_secret': self.client_secret,
            'grant_type': 'authorization_code',
            'code': code,
            'redirect_uri': self.redirect_uri
        }

        try:
            response = requests.post(self.oauth_url, json=data, headers={
                'Content-Type': 'application/json'
            })

            if response.status_code == 200:
                tokens = response.json()
                self.access_token = tokens.get('access_token')
                self.refresh_token = tokens.get('refresh_token')
                return {
                    'success': True,
                    'tokens': tokens,
                    'error': None
                }
            else:
                return {
                    'success': False,
                    'tokens': None,
                    'error': response.text
                }
        except Exception as e:
            return {
                'success': False,
                'tokens': None,
                'error': str(e)
            }

    def refresh_access_token(self):
        """Обновление access token через refresh token"""
        if not self.refresh_token:
            return {'success': False, 'error': 'No refresh token available'}

        data = {
            'client_id': self.client_id,
            'client_secret': self.client_secret,
            'grant_type': 'refresh_token',
            'refresh_token': self.refresh_token,
            'redirect_uri': self.redirect_uri
        }

        try:
            response = requests.post(self.oauth_url, json=data, headers={
                'Content-Type': 'application/json'
            })

            if response.status_code == 200:
                tokens = response.json()
                self.access_token = tokens.get('access_token')
                self.refresh_token = tokens.get('refresh_token')
                return {
                    'success': True,
                    'tokens': tokens,
                    'error': None
                }
            else:
                return {
                    'success': False,
                    'tokens': None,
                    'error': response.text
                }
        except Exception as e:
            return {
                'success': False,
                'tokens': None,
                'error': str(e)
            }

    def make_api_request(self, endpoint, method='GET', data=None):
        """Выполнение запроса к AmoCRM API с автоматическим обновлением токена"""
        if not self.access_token:
            return {'success': False, 'error': 'No access token available'}

        url = f"{self.base_api_url}{endpoint}"
        headers = {
            'Authorization': f'Bearer {self.access_token}',
            'Content-Type': 'application/json'
        }

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, headers=headers, json=data)
            elif method == 'PATCH':
                response = requests.patch(url, headers=headers, json=data)
            else:
                return {'success': False, 'error': f'Unsupported method: {method}'}

            if response.status_code == 401 and self.refresh_token:
                # Токен истек, обновляем
                refresh_result = self.refresh_access_token()
                if refresh_result['success']:
                    # Повторяем запрос с новым токеном
                    headers['Authorization'] = f'Bearer {self.access_token}'
                    if method == 'GET':
                        response = requests.get(url, headers=headers)
                    elif method == 'POST':
                        response = requests.post(url, headers=headers, json=data)
                    elif method == 'PATCH':
                        response = requests.patch(url, headers=headers, json=data)

            return {
                'success': response.status_code in [200, 201, 204],
                'data': response.json() if response.text else {},
                'status_code': response.status_code,
                'error': None if response.status_code in [200, 201, 204] else response.text
            }

        except Exception as e:
            return {
                'success': False,
                'data': {},
                'status_code': 500,
                'error': str(e)
            }

    def test_connection(self):
        """Тестирование подключения к AmoCRM API"""
        return self.make_api_request('/account')

    def create_contact(self, name, phone):
        """Создание контакта в AmoCRM"""
        data = [
            {
                'name': name,
                'custom_fields_values': [
                    {
                        'field_code': 'PHONE',
                        'values': [
                            {
                                'value': phone,
                                'enum_code': 'WORK'
                            }
                        ]
                    }
                ]
            }
        ]

        return self.make_api_request('/contacts', 'POST', data)

    def create_lead(self, name, contact_id, price=0):
        """Создание сделки в AmoCRM"""
        data = [
            {
                'name': name,
                'price': price,
                '_embedded': {
                    'contacts': [
                        {
                            'id': contact_id
                        }
                    ]
                }
            }
        ]

        if config.AMO_PIPELINE_ID:
            data[0]['pipeline_id'] = int(config.AMO_PIPELINE_ID)

        return self.make_api_request('/leads', 'POST', data)

    def add_note_to_lead(self, lead_id, text):
        """Добавление примечания к сделке"""
        data = [
            {
                'entity_id': lead_id,
                'note_type': 'common',
                'params': {
                    'text': text
                }
            }
        ]

        return self.make_api_request('/leads/notes', 'POST', data)

# Инициализация сервисов
gupshup_service = GupshupService()
amocrm_service = AmoCRMService()

# === ROUTES ===

@app.route('/')
def index():
    """Главная страница с интерфейсом"""
    return render_template('index.html')

@app.route('/api/test/gupshup', methods=['GET'])
def test_gupshup():
    """Тестирование подключения к Gupshup"""
    result = gupshup_service.test_connection()
    return jsonify(result)

@app.route('/api/test/amocrm', methods=['GET'])
def test_amocrm():
    """Тестирование подключения к AmoCRM"""
    result = amocrm_service.test_connection()
    return jsonify(result)

@app.route('/api/send-message', methods=['POST'])
def send_message():
    """Отправка сообщения через Gupshup"""
    data = request.get_json()

    if not data or 'phone' not in data or 'message' not in data:
        return jsonify({
            'success': False,
            'error': 'Missing phone or message in request data'
        }), 400

    phone = data['phone']
    message = data['message']

    # Очистка номера телефона
    phone = ''.join(filter(str.isdigit, phone))
    if not phone.startswith('7') and phone.startswith('8'):
        phone = '7' + phone[1:]

    result = gupshup_service.send_message(phone, message)

    # Если сообщение отправлено успешно, создаем контакт и сделку в AmoCRM
    if result['success'] and amocrm_service.access_token:
        contact_result = amocrm_service.create_contact(f'WhatsApp {phone}', phone)
        if contact_result['success'] and contact_result['data'].get('_embedded', {}).get('contacts'):
            contact_id = contact_result['data']['_embedded']['contacts'][0]['id']
            lead_result = amocrm_service.create_lead(f'WhatsApp диалог с {phone}', contact_id)
            if lead_result['success'] and lead_result['data'].get('_embedded', {}).get('leads'):
                lead_id = lead_result['data']['_embedded']['leads'][0]['id']
                amocrm_service.add_note_to_lead(lead_id, f'Отправлено сообщение: {message}')

    return jsonify(result)

@app.route('/api/amo/auth', methods=['GET'])
def amo_auth():
    """Начало OAuth авторизации с AmoCRM"""
    auth_url = amocrm_service.get_auth_url()
    return redirect(auth_url)

@app.route('/api/amo/callback', methods=['GET'])
def amo_callback():
    """Callback для OAuth авторизации"""
    code = request.args.get('code')
    error = request.args.get('error')

    if error:
        flash(f'Ошибка авторизации: {error}', 'error')
        return redirect(url_for('index'))

    if not code:
        flash('Не получен код авторизации', 'error')
        return redirect(url_for('index'))

    result = amocrm_service.get_token_by_code(code)

    if result['success']:
        flash('Успешная авторизация в AmoCRM!', 'success')
    else:
        flash(f'Ошибка получения токена: {result["error"]}', 'error')

    return redirect(url_for('index'))

@app.route('/webhook/gupshup', methods=['POST'])
def gupshup_webhook():
    """Webhook для входящих сообщений от Gupshup"""
    try:
        data = request.get_json()

        if data.get('type') == 'message':
            payload = data.get('payload', {})
            phone = payload.get('source')
            message_text = payload.get('payload', {}).get('text', '')

            # Создаем контакт и сделку в AmoCRM при получении сообщения
            if amocrm_service.access_token:
                contact_result = amocrm_service.create_contact(f'WhatsApp {phone}', phone)
                if contact_result['success'] and contact_result['data'].get('_embedded', {}).get('contacts'):
                    contact_id = contact_result['data']['_embedded']['contacts'][0]['id']
                    lead_result = amocrm_service.create_lead(f'WhatsApp диалог с {phone}', contact_id)
                    if lead_result['success'] and lead_result['data'].get('_embedded', {}).get('leads'):
                        lead_id = lead_result['data']['_embedded']['leads'][0]['id']
                        amocrm_service.add_note_to_lead(lead_id, f'Получено сообщение: {message_text}')

        return jsonify({'success': True})

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/status', methods=['GET'])
def status():
    """Статус системы и конфигурация"""
    return jsonify({
        'status': 'running',
        'config': {
            'gupshup_configured': bool(config.GUPSHUP_API_KEY and config.GUPSHUP_APP_NAME),
            'amocrm_configured': bool(config.AMO_CLIENT_ID and config.AMO_CLIENT_SECRET),
            'amocrm_authorized': bool(amocrm_service.access_token)
        },
        'timestamp': datetime.now().isoformat()
    })

if __name__ == '__main__':
    port = int(os.getenv('PORT', 3001))
    debug = os.getenv('NODE_ENV', 'development') != 'production'
    app.run(host='0.0.0.0', port=port, debug=debug)
