# Blob Upload Architecture Analysis - Deep Dive

**Date**: February 2026  
**Status**: Analysis Complete  
**Issue**: Mixed Content Error when uploading blobs from web app

---

## Problem Summary

```
HTTPS Web App (noxtiz.com)
    ↓
Tries to upload blob to HTTP server (Tailscale)
    ↓
❌ Browser blocks: Mixed Content Error
```

**Error Message:**
```
Mixed Content: The page at 'https://www.noxtiz.com/tljp/renderer' 
was loaded over HTTPS, but requested an insecure resource 
'http://server-tljp.tail75a421.ts.net:9999/api/blob/upload?business=trucking'. 
This request has been blocked
```

---

## Root Cause Analysis

### 1. Mixed Content Blocking (Primary Issue)

**What is Mixed Content?**
- HTTPS page requesting HTTP resources
- Browser security feature to prevent downgrade attacks
- Automatically blocked by all modern browsers

**Why it happens:**
```
Current Architecture:
┌──────────────────────────────────────────────────────────┐
│ User Browser                                             │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  HTTPS: https://www.noxtiz.com/tljp/renderer            │
│         (Secure - Green Lock)                           │
│                                                          │
│         ↓ (Upload Request)                              │
│                                                          │
│  HTTP: http://server-tljp.tail75a421.ts.net:9999        │
│         (Insecure - Downgrade!)                         │
│                                                          │
│  ❌ BLOCKED by browser security policy                  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 2. CORS Issue (Secondary)

Even if we use HTTPS, CORS will block cross-origin requests:
```
Request Origin: https://www.noxtiz.com
Request Target: https://server-tljp.tail75a421.ts.net:9999

❌ Different domains = CORS error
```

### 3. SSL Certificate Issue (Tertiary)

Tailscale domain has self-signed certificate:
```
https://server-tljp.tail75a421.ts.net:9999
    ↓
Self-signed SSL cert
    ↓
❌ Browser shows security warning
```

---

## Current Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ User's Browser                                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  App: https://www.noxtiz.com/tljp/renderer                │
│       (React Web App - Deployed)                           │
│                                                             │
│       ↓ (API Requests)                                     │
│                                                             │
│  ❌ http://server-tljp.tail75a421.ts.net:9999             │
│     (Tailscale Private Network - Blocked!)                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Problems:**
- ❌ Mixed Content blocking
- ❌ CORS blocking
- ❌ SSL certificate issues
- ❌ Tailscale is private network (not accessible from public internet)

---

## Correct Solution: Reverse Proxy

```
┌──────────────────────────────────────────────────────────────┐
│ User's Browser                                               │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  App: https://www.noxtiz.com/tljp/renderer                 │
│       (React Web App)                                       │
│                                                              │
│       ↓ (API Requests to same domain)                       │
│                                                              │
│  ✅ https://www.noxtiz.com/api/blob/*                       │
│     (Same origin - No CORS, No mixed content)              │
│                                                              │
│       ↓ (Reverse Proxy)                                     │
│                                                              │
│  ✅ http://server-tljp.tail75a421.ts.net:9999/api/blob/*   │
│     (Internal network - Secure tunnel)                      │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Benefits:**
- ✅ Same-origin requests (no CORS)
- ✅ HTTPS throughout (no mixed content)
- ✅ Valid SSL certificate (noxtiz.com)
- ✅ Tailscale server hidden from public internet

---

## Implementation Options

### Option 1: Nginx Reverse Proxy (Recommended)

**Setup at noxtiz.com:**

```nginx
# /etc/nginx/sites-available/tljp-api

upstream tailscale_server {
    server server-tljp.tail75a421.ts.net:9999;
}

server {
    listen 443 ssl http2;
    server_name www.noxtiz.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # Reverse proxy for API
    location /api/blob/ {
        proxy_pass http://tailscale_server;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS headers
        add_header 'Access-Control-Allow-Origin' 'https://www.noxtiz.com' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type' always;
        
        # Timeouts for large files
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Reverse proxy for storage API
    location /api/storage/ {
        proxy_pass http://tailscale_server;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Option 2: Node.js Reverse Proxy

```javascript
// proxy-server.js
const express = require('express');
const { createProxyMiddleware } = require('express-http-proxy');

const app = express();

// Proxy blob uploads
app.use('/api/blob/', createProxyMiddleware({
  target: 'http://server-tljp.tail75a421.ts.net:9999',
  changeOrigin: true,
  pathRewrite: {
    '^/api/blob/': '/api/blob/'
  },
  onProxyRes: (proxyRes) => {
    proxyRes.headers['Access-Control-Allow-Origin'] = 'https://www.noxtiz.com';
  }
}));

// Proxy storage API
app.use('/api/storage/', createProxyMiddleware({
  target: 'http://server-tljp.tail75a421.ts.net:9999',
  changeOrigin: true,
}));

app.listen(3000);
```

### Option 3: Cloudflare Workers (Easiest)

```javascript
// wrangler.toml
name = "tljp-proxy"
main = "src/index.js"
compatibility_date = "2024-01-01"

[[routes]]
pattern = "www.noxtiz.com/api/*"
zone_name = "noxtiz.com"

// src/index.js
export default {
  async fetch(request) {
    const url = new URL(request.url);
    
    // Rewrite to Tailscale server
    url.hostname = 'server-tljp.tail75a421.ts.net';
    url.protocol = 'http:';
    
    const response = await fetch(new Request(url, request));
    
    // Add CORS headers
    const newResponse = new Response(response.body, response);
    newResponse.headers.set('Access-Control-Allow-Origin', 'https://www.noxtiz.com');
    
    return newResponse;
  }
}
```

---

## Frontend Code Changes

Once reverse proxy is setup, update api-client.ts:

```typescript
const getAPIBaseURL = () => {
  // Always use same origin for web app
  if (typeof window !== 'undefined') {
    // Web app - use same origin (reverse proxy handles routing)
    return `${window.location.protocol}//${window.location.host}`;
  }
  
  // Electron app - use Tailscale directly
  return 'http://server-tljp.tail75a421.ts.net:9999';
};
```

---

## Deployment Checklist

- [ ] Setup reverse proxy (Nginx/Node.js/Cloudflare)
- [ ] Configure CORS headers
- [ ] Test blob upload from web app
- [ ] Test blob download from web app
- [ ] Monitor proxy logs for errors
- [ ] Setup SSL certificate renewal
- [ ] Configure rate limiting on proxy
- [ ] Setup monitoring/alerting

---

## Testing

```bash
# Test blob upload
curl -X POST \
  -H "Content-Type: multipart/form-data" \
  -F "file=@test.png" \
  https://www.noxtiz.com/api/blob/upload?business=trucking

# Test blob download
curl -X GET \
  https://www.noxtiz.com/api/blob/download/trucking/FILE_ID

# Test storage API
curl -X GET \
  https://www.noxtiz.com/api/storage/trucking_suratJalan
```

---

## Summary

**Current Issue:** Mixed content blocking + CORS + SSL cert issues

**Root Cause:** Direct connection from HTTPS web app to HTTP Tailscale server

**Solution:** Reverse proxy at noxtiz.com to forward requests to Tailscale server

**Benefit:** Same-origin requests, valid SSL, no CORS issues, Tailscale hidden

**Next Step:** Implement reverse proxy (recommend Nginx or Cloudflare Workers)

