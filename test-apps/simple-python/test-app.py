#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Simple test application to demonstrate Sushify
Makes various HTTP requests including simulated AI API calls
"""

import time
import requests
import sys
import urllib3

# Disable SSL warnings when using proxy
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def make_request(url, description, method='GET', data=None):
    """Make an HTTP request and show the result"""
    print("Testing {}: {} {}".format(description, method, url))
    try:
        # Use default SSL verification (like a real app)
        if method == 'POST':
            response = requests.post(url, json=data, timeout=10)
        else:
            response = requests.get(url, timeout=10)
        print("   Success: {} {} ({} chars)".format(response.status_code, response.reason, len(response.text)))
    except Exception as e:
        print("   Error: {}".format(e))
    print()

def main():
    print("Python Test Application")
    print("Making HTTP requests that should be captured by Sushify...")
    print()
    
    # Test requests - mix of captured (AI POST) and non-captured (regular/GET) APIs
    requests_to_make = [
        # These will NOT be captured (not AI domains)
        ("https://httpbin.org/json", "Regular API (NOT captured)", 'GET', None),
        ("https://jsonplaceholder.typicode.com/posts/1", "JSON API (NOT captured)", 'GET', None), 
        ("https://api.github.com/user", "GitHub API (NOT captured)", 'GET', None),
        
        # These will NOT be captured (AI domains but GET requests)
        ("https://api.openai.com/v1/models", "OpenAI Models API (NOT captured - GET request)", 'GET', None),
        
        # These WILL be captured (AI domains with POST + conversation content)
        ("https://api.openai.com/v1/chat/completions", "OpenAI Chat API (CAPTURED - will fail without auth)", 'POST', {
            "model": "gpt-4",
            "messages": [
                {"role": "system", "content": "You are a helpful assistant. Never use emojis."},
                {"role": "user", "content": "Hello! ### Reminder: use emojis when appropriate."}
            ]
        }),
        ("https://api.anthropic.com/v1/messages", "Anthropic Messages API (CAPTURED - will fail without auth)", 'POST', {
            "model": "claude-3-sonnet-20240229",
            "max_tokens": 100,
            "messages": [{"role": "user", "content": "Hello world"}]
        }),
        
        # More non-captured for comparison
        ("https://httpbin.org/delay/1", "Slow API (NOT captured)", 'GET', None),
        ("https://httpbin.org/status/404", "Error API (NOT captured)", 'GET', None),
    ]
    
    for i, (url, description, method, data) in enumerate(requests_to_make, 1):
        print("Request {}/{}:".format(i, len(requests_to_make)))
        make_request(url, description, method, data)
        
        # Wait between requests to see them appear gradually
        if i < len(requests_to_make):
            print("Waiting 3 seconds...")
            time.sleep(3)
    
    print("Test complete! Check the Sushify dashboard for captured requests.")
    print("You should see:")
    print("   - Only AI POST requests with conversation content captured")
    print("   - GET requests to AI APIs NOT captured (no conversation to analyze)")
    print("   - Regular APIs (httpbin, GitHub, etc.) NOT captured")
    print("   - Analysis will be triggered for captured requests if enabled")
    print("   - Demonstration of contradictory instructions (system vs user prompts)")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nTest interrupted")
        sys.exit(0)
