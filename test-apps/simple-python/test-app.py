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

def make_request(url, description):
    """Make an HTTP request and show the result"""
    print("Testing {}: {}".format(description, url))
    try:
        # Disable SSL verification when using proxy
        response = requests.get(url, timeout=10, verify=False)
        print("   Success: {} {} ({} chars)".format(response.status_code, response.reason, len(response.text)))
    except Exception as e:
        print("   Error: {}".format(e))
    print()

def main():
    print("Python Test Application")
    print("Making HTTP requests that should be captured by Sushify...")
    print()
    
    # Test requests - mix of AI and regular APIs
    requests_to_make = [
        ("https://httpbin.org/json", "Regular API (httpbin)"),
        ("https://jsonplaceholder.typicode.com/posts/1", "JSON API"), 
        ("https://api.openai.com/v1/models", "OpenAI API (will fail without auth)"),
        ("https://api.anthropic.com/v1/messages", "Anthropic API (will fail without auth)"),
        ("https://httpbin.org/delay/1", "Slow API (1s delay)"),
        ("https://httpbin.org/status/404", "Error API (404)"),
    ]
    
    for i, (url, description) in enumerate(requests_to_make, 1):
        print("Request {}/{}:".format(i, len(requests_to_make)))
        make_request(url, description)
        
        # Wait between requests to see them appear gradually
        if i < len(requests_to_make):
            print("Waiting 3 seconds...")
            time.sleep(3)
    
    print("Test complete! Check the Sushify dashboard for captured requests.")
    print("You should see:")
    print("   - AI requests (OpenAI, Anthropic) marked specially")
    print("   - Regular requests with different status codes")
    print("   - Latency information for each request")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nTest interrupted")
        sys.exit(0)
