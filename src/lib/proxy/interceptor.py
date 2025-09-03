#!/usr/bin/env python3
"""
Sushify mitmproxy interceptor script
Captures HTTP traffic and sends to Sushify dashboard when capture mode is enabled

This script works with any process/language - Python, Node.js, Go, Rust, etc.
The target application just needs to use HTTP_PROXY environment variable.
"""

import os
import requests
import time
import traceback
from mitmproxy import http
from typing import Optional

# Debug logging for development
print("🔥 SUSHIFY INTERCEPTOR LOADED!")
with open("/tmp/sushify-debug.log", "a") as f:
    f.write("🔥 SUSHIFY INTERCEPTOR LOADED!\n")

# Configuration
SUSHIFY_SERVER_URL = os.getenv("SUSHIFY_DASHBOARD_URL", "http://localhost:7331")  # SvelteKit dashboard server
CAPTURE_STATUS_ENDPOINT = f"{SUSHIFY_SERVER_URL}/api/proxy/status"
EXCHANGES_ENDPOINT = f"{SUSHIFY_SERVER_URL}/api/proxy/exchanges"

# AI base URLs to capture
# Can be overridden with LLM_PROVIDER_BASE_URL environment variable
DEFAULT_AI_BASE_URLS = [
    "https://api.openai.com",
    "https://api.anthropic.com", 
    "https://generativelanguage.googleapis.com"
]

# Check for custom LLM provider base URL
CUSTOM_LLM_PROVIDER = os.getenv("LLM_PROVIDER_BASE_URL")
if CUSTOM_LLM_PROVIDER:
    # Use the custom provider as-is, just ensure it has a protocol
    if not CUSTOM_LLM_PROVIDER.startswith('http'):
        AI_BASE_URLS = [f"https://{CUSTOM_LLM_PROVIDER}"]
    else:
        AI_BASE_URLS = [CUSTOM_LLM_PROVIDER]
else:
    AI_BASE_URLS = DEFAULT_AI_BASE_URLS

# Test domains for development (removed - only capture AI domains now)

def request(flow: http.HTTPFlow) -> None:
    """Called when request is made"""
    print(f"🚀 REQUEST INTERCEPTED: {flow.request.method} {flow.request.pretty_url}")
    with open("/tmp/sushify-debug.log", "a") as f:
        f.write(f"🚀 REQUEST INTERCEPTED: {flow.request.method} {flow.request.pretty_url}\n")
    
    # Log request body for debugging (useful for LLM analysis)
    if flow.request.content:
        try:
            body_text = flow.request.content.decode('utf-8')
            with open("/tmp/sushify-debug.log", "a") as f:
                f.write(f"📋 REQUEST BODY: {body_text}\n")
        except UnicodeDecodeError:
            pass  # Skip binary content
    
    # Add timestamp for latency calculation
    flow.metadata["sushify_start_time"] = time.time()

def response(flow: http.HTTPFlow) -> None:
    """Called when response is received - captures complete exchange"""
    print(f"📥 RESPONSE INTERCEPTED: {flow.request.method} {flow.request.pretty_url} -> {flow.response.status_code}")
    with open("/tmp/sushify-debug.log", "a") as f:
        f.write(f"📥 RESPONSE INTERCEPTED: {flow.request.method} {flow.request.pretty_url} -> {flow.response.status_code}\n")
    
    try:
        # Only capture if enabled
        if not is_capture_enabled():
            return
        
        # Check if this is a request we want to capture
        if not should_capture_request(flow.request):
            return
        
        # Calculate latency
        start_time = flow.metadata.get("sushify_start_time", time.time())
        latency_ms = int((time.time() - start_time) * 1000)
        
        # Create exchange object
        exchange = {
            "id": f"exchange_{int(time.time() * 1000)}_{hash(flow.request.pretty_url) % 10000}",
            "timestamp": time.time(),
            "url": flow.request.pretty_url,
            "method": flow.request.method,
            "host": flow.request.host,
            "path": flow.request.path,
            "scheme": flow.request.scheme,
            "request_headers": dict(flow.request.headers),
            "request_body": get_safe_body(flow.request.text),
            "response_status": flow.response.status_code,
            "response_headers": dict(flow.response.headers),
            "response_body": get_safe_body(flow.response.text),
            "latency_ms": latency_ms,
            "captured_at": time.strftime('%Y-%m-%d %H:%M:%S')
            # Note: is_ai_request removed - we only capture AI requests anyway
        }
        
        # Send to Sushify server
        send_exchange_to_server(exchange)
        
        # Log the captured request
        print(f"🤖 Captured: {flow.request.method} {flow.request.pretty_url} -> {flow.response.status_code} ({latency_ms}ms)")
        
    except Exception as e:
        print(f"❌ Error in interceptor: {e}")
        print(f"❌ Full traceback: {traceback.format_exc()}")
        # Don't block the request if something goes wrong

def should_capture_request(request) -> bool:
    """Determine if we should capture this request"""
    # Only capture AI requests that have conversation content (POST with body)
    if matches_ai_base_url(request) and request.method == 'POST' and request.content:
        return True
    
    return False

def matches_ai_base_url(request) -> bool:
    """Check if this request matches any AI base URL"""
    request_url = request.pretty_url
    
    # Simple string matching - check if request URL starts with any AI base URL
    for base_url in AI_BASE_URLS:
        if request_url.startswith(base_url):
            return True
    
    return False

def get_safe_body(text: Optional[str]) -> str:
    """Get request/response body text (full content for LLM analysis)"""
    if not text:
        return ""
    
    # Return full content - we have 1M token context window for analysis
    return text

def is_capture_enabled() -> bool:
    """Check if capture mode is enabled in Sushify dashboard"""
    try:
        response = requests.get(CAPTURE_STATUS_ENDPOINT, timeout=1.0)
        if response.status_code == 200:
            data = response.json()
            return data.get("capturing", False)
    except requests.RequestException:
        # If we can't reach the server, assume capturing is disabled
        pass
    except Exception as e:
        print(f"⚠️ Error checking capture status: {e}")
    
    return False

def send_exchange_to_server(exchange: dict) -> None:
    """Send captured exchange to Sushify server"""
    try:
        response = requests.post(
            EXCHANGES_ENDPOINT,
            json=exchange,
            timeout=3.0,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code != 200:
            print(f"⚠️ Server returned {response.status_code} for exchange {exchange['id']}")
            
    except requests.RequestException as e:
        print(f"❌ Failed to send exchange to server: {e}")
        # Don't block the original request
    except Exception as e:
        print(f"❌ Unexpected error sending exchange: {e}")

# mitmproxy addon registration
addons = []
