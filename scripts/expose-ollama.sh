#!/bin/bash
# Expose your local Ollama to the internet via ngrok
# Usage: ./scripts/expose-ollama.sh
#
# After running, copy the https URL and set it as OLLAMA_BASE_URL
# in your Vercel environment variables.

set -e

# Check if Ollama is running
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
  echo "Ollama is not running. Start it first:"
  echo "  ollama serve"
  exit 1
fi

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
  echo "ngrok not found. Install it:"
  echo "  brew install ngrok"
  exit 1
fi

echo "Starting ngrok tunnel for Ollama (port 11434)..."
echo ""
echo "Once started, copy the https://xxx.ngrok-free.app URL"
echo "and set it as OLLAMA_BASE_URL in your Vercel dashboard."
echo ""
echo "Keep this terminal open while you need remote access."
echo "---"
echo ""

ngrok http 11434
