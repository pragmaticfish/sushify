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

# AI vendor domains to capture (expandable list)
AI_DOMAINS = [
    "api.openai.com",
    "api.anthropic.com", 
    "generativelanguage.googleapis.com"
]

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
            "captured_at": time.strftime('%Y-%m-%d %H:%M:%S'),
            "is_ai_request": is_ai_domain(flow.request.host)
        }
        
        # Send to Sushify server
        send_exchange_to_server(exchange)
        
        # Color-coded logging
        emoji = "🤖" if exchange["is_ai_request"] else "🧪"
        print(f"{emoji} Captured: {flow.request.method} {flow.request.pretty_url} -> {flow.response.status_code} ({latency_ms}ms)")
        
    except Exception as e:
        print(f"❌ Error in interceptor: {e}")
        print(f"❌ Full traceback: {traceback.format_exc()}")
        # Don't block the request if something goes wrong

def should_capture_request(request) -> bool:
    """Determine if we should capture this request"""
    host = request.host.lower()
    path = request.path.lower()
    
    # Only capture AI domain requests that have conversation content (POST/PUT with body)
    if is_ai_domain(host) and request.method in ['POST', 'PUT'] and request.content:
        return True
    
    return False

def is_ai_domain(host: str) -> bool:
    """Check if this is an AI vendor domain"""
    return any(domain in host.lower() for domain in AI_DOMAINS)

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
