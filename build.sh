#!/bin/bash
# Build script for Vercel deployment

# Create output directory
mkdir -p .vercel/output/static

# Copy all HTML files and assets to output directory
cp *.html .vercel/output/static/ 2>/dev/null || true
cp -r certificate .vercel/output/static/ 2>/dev/null || true
cp -r audio .vercel/output/static/ 2>/dev/null || true
cp *.jpg .vercel/output/static/ 2>/dev/null || true
cp *.png .vercel/output/static/ 2>/dev/null || true
cp *.css .vercel/output/static/ 2>/dev/null || true
cp *.js .vercel/output/static/ 2>/dev/null || true

# Create config.json
cat > .vercel/output/config.json << 'EOF'
{
  "version": 3,
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ]
}
EOF

echo "Build complete. Static files copied to .vercel/output/static/"