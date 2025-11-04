# Stage 1 — Build the React application
FROM node:18-alpine AS build

# Set working directory
WORKDIR /app

# Add `/app/node_modules/.bin` to $PATH
ENV PATH=/app/node_modules/.bin:$PATH

# Install dependencies
# Copy package files first for better layer caching
COPY package*.json ./
RUN npm ci --silent --legacy-peer-deps

# Copy application source code
COPY . .

# Build the application
# Note: Adjust if your build output directory is different (e.g., 'dist' for Vite)
RUN npm run build

# Stage 2 — Serve with Nginx
FROM nginx:stable-alpine

# Set labels for metadata
LABEL maintainer="your-email@example.com"
LABEL version="1.0"
LABEL description="Production React application"

# Remove default Nginx configuration
RUN rm /etc/nginx/conf.d/default.conf

# Create optimized Nginx configuration with security headers
RUN cat > /etc/nginx/conf.d/default.conf <<'EOF'
server {
    listen       80;
    server_name  _;
    root   /usr/share/nginx/html;
    index  index.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Serve static files directly, fallback to index.html for SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Don't cache index.html and service workers
    location ~* (index\.html|service-worker\.js)$ {
        expires -1;
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 256;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # Health check endpoint (optional)
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

# Copy built files from build stage
# Adjust source path for Vite (use /app/dist instead of /app/build)
COPY --from=build /app/dist /usr/share/nginx/html

# Set permissions to the nginx user (keep default nginx runtime user)
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown nginx:nginx /var/run/nginx.pid

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]