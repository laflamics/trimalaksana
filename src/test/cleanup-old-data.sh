#!/bin/bash

# Cleanup old localStorage data files on Laptop Dev

echo ""
echo "============================================"
echo "Deleting old localStorage data files..."
echo "============================================"
echo ""

# Delete all JSON files in data/localStorage/
rm -f data/localStorage/*.json

echo "✓ Deleted all old data files from data/localStorage/"

echo ""
echo "============================================"
echo "Remaining files in data/localStorage:"
echo "============================================"
ls -la data/localStorage/ 2>/dev/null || echo "Directory is empty or doesn't exist"

echo ""
echo "============================================"
echo "Cleanup complete!"
echo "============================================"
echo ""
echo "Next steps:"
echo "1. Open browser DevTools (F12)"
echo "2. Go to Application > Local Storage"
echo "3. Right-click and select 'Clear All'"
echo "4. Reload the page"
echo "5. Test adding new data - should persist to server"
echo ""
