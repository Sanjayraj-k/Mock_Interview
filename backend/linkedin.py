
from flask import Flask, request, jsonify
import requests

app = Flask(__name__)

# Constant API key (replace with your actual Lusha API key)
API_KEY = "2da2f628-f465-4564-8987-5d2b101f5736"  # Replace with your actual API key

# Route to handle company data request
@app.route('/api/company', methods=['POST'])
def get_company_data():
    data = request.get_json()
    domain = data.get('domain', 'microsoft.com')  # Default to microsoft.com if not provided

    if not domain:
        return jsonify({"error": "Domain is required"}), 400

    url = f"https://api.lusha.com/v2/company?domain={domain}"
    headers = {
        "api_key": API_KEY,
        "Content-Type": "application/json"
    }

    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()  # Raise an error for bad status codes
        return jsonify(response.json())
    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"Failed to fetch data: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
