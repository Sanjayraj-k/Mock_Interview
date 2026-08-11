import os
import hmac
import hashlib
import json
from flask import Flask, request, abort
from dotenv import load_dotenv
import requests
from groq import Groq
from pyngrok import ngrok  # Add this import

load_dotenv()

app = Flask(__name__)
# Env vars
PHONENUMBERID = os.getenv('PHONENUMBERID')
ACCESS_TOKEN = os.getenv('ACCESS_TOKEN')
VERIFY_TOKEN = os.getenv('VERIFY_TOKEN')
GROQ_API_KEY = os.getenv('GROQ_API_KEY')
APP_SECRET = os.getenv('APP_SECRET')  # Optional
NGROK_AUTHTOKEN = os.getenv('NGROK_AUTHTOKEN')  # Add this
VERSION = 'v19.0'  # Update if needed

groq_client = Groq(api_key=GROQ_API_KEY)

def verify_signature(payload, signature):
    if not APP_SECRET:
        return True
    computed = hmac.new(
        APP_SECRET.encode('utf-8'),
        payload,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(f"sha256={computed}", signature)

def get_ai_response(message_text):
    try:
        chat_completion = groq_client.chat.completions.create(
            model="llama3.1-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a helpful WhatsApp assistant. Keep responses concise and friendly."},
                {"role": "user", "content": message_text}
            ],
            max_tokens=150,
            temperature=0.7
        )
        return chat_completion.choices[0].message.content.strip()
    except Exception as e:
        return f"Sorry, I encountered an error: {str(e)}"

def send_message(to_phone, message_text):
    url = f"https://graph.facebook.com/{VERSION}/{PHONENUMBERID}/messages"
    headers = {
        "Authorization": f"Bearer {ACCESS_TOKEN}",
        "Content-Type": "application/json"
    }
    data = {
        "messaging_product": "whatsapp",
        "to": to_phone,
        "type": "text",
        "text": {"body": message_text}
    }
    response = requests.post(url, headers=headers, json=data)
    response.raise_for_status()
    return response.json()

@app.route('/webhook', methods=['GET'])
def verify():
    mode = request.args.get('hub.mode')
    token = request.args.get('hub.verify_token')
    challenge = request.args.get('hub.challenge')
    if mode == 'subscribe' and token == VERIFY_TOKEN:
        return challenge, 200
    else:
        abort(403)

@app.route('/webhook', methods=['POST'])
def webhook():
    payload = request.get_data(as_text=True)
    signature = request.headers.get('X-Hub-Signature-256')

    if not verify_signature(payload, signature):
        abort(401)

    try:
        data = json.loads(payload)
        if 'entry' in data and len(data['entry']) > 0:
            change = data['entry'][0]['changes'][0]
            if change['field'] == 'messages' and 'value' in change:
                message = change['value']['messages'][0]
                if message['type'] == 'text':
                    from_phone = message['from']
                    user_message = message['text']['body']
                    ai_response = get_ai_response(user_message)
                    send_message(from_phone, ai_response)
        return 'OK', 200
    except Exception as e:
        print(f"Error: {e}")
        abort(400)

if __name__ == '__main__':
    # Auto-start ngrok tunnel
    if NGROK_AUTHTOKEN:
        ngrok.set_auth_token(NGROK_AUTHTOKEN)
        public_url = ngrok.connect(5000)
        print(f"ngrok tunnel started: {public_url}")
        print(f"Use this for Meta webhook: {public_url}/webhook")
    else:
        print("Warning: NGROK_AUTHTOKEN not set—run without tunnel (local only).")

    app.run(debug=True, port=5000)