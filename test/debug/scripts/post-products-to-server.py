#!/usr/bin/env python3
"""
Script untuk post cleaned products ke server
Usage: python3 post-products-to-server.py [server_url]
"""

import json
import sys
import requests
from pathlib import Path

def load_cleaned_products():
    """Load cleaned products from local storage"""
    products_file = Path('data/localStorage/products.json')
    if not products_file.exists():
        print(f"❌ File not found: {products_file}")
        sys.exit(1)
    
    with open(products_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    products = data.get('value', []) if isinstance(data, dict) else data
    print(f"✅ Loaded {len(products)} cleaned products")
    return products

def find_server_url():
    """Try to find server URL from common locations"""
    common_urls = [
        'http://localhost:8888',
        'http://127.0.0.1:8888',
        'http://192.168.1.100:8888',
    ]
    
    print("🔍 Checking for server...")
    for url in common_urls:
        try:
            response = requests.get(f"{url}/api/storage/products", timeout=2)
            if response.status_code in [200, 404]:
                print(f"✅ Found server at: {url}")
                return url
        except:
            continue
    
    return None

def post_to_server(products, server_url):
    """Post products to server"""
    payload = {
        "value": products,
        "timestamp": int(__import__('time').time() * 1000)
    }
    
    url = f"{server_url}/api/storage/products"
    print(f"\n📤 Posting to: {url}")
    print(f"   Products: {len(products)}")
    
    try:
        response = requests.post(
            url,
            json=payload,
            headers={'Content-Type': 'application/json'},
            timeout=30
        )
        
        if response.status_code == 200:
            print(f"✅ Successfully posted {len(products)} products to server!")
            try:
                result = response.json()
                print(f"   Server response: {result}")
            except:
                print(f"   Server response: {response.text[:200]}")
            return True
        else:
            print(f"❌ Error: {response.status_code} {response.reason}")
            print(f"   Response: {response.text[:500]}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Network error: {e}")
        return False

def main():
    # Get server URL from argument or auto-detect
    if len(sys.argv) > 1:
        server_url = sys.argv[1]
        if not server_url.startswith('http'):
            server_url = f"http://{server_url}"
    else:
        server_url = find_server_url()
        if not server_url:
            print("\n❌ Server not found automatically.")
            print("   Please provide server URL:")
            print("   Usage: python3 post-products-to-server.py <server_url>")
            print("   Example: python3 post-products-to-server.py http://192.168.1.100:8888")
            sys.exit(1)
    
    # Load products
    products = load_cleaned_products()
    
    # Post to server
    success = post_to_server(products, server_url)
    
    if success:
        print("\n✅ Done! Data sudah di-post ke server.")
        print("   Refresh aplikasi untuk melihat perubahan.")
    else:
        print("\n❌ Failed to post to server.")
        sys.exit(1)

if __name__ == '__main__':
    main()
