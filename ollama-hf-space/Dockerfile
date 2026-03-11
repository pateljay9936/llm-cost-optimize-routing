FROM ollama/ollama:latest

# Expose the Ollama API port
EXPOSE 7860

# Pull the model at build time so it's ready
RUN ollama serve & sleep 5 && ollama pull qwen2:0.5b && pkill ollama

# Start Ollama on port 7860 (HF Spaces requires this port)
ENV OLLAMA_HOST=0.0.0.0:7860
ENV OLLAMA_KEEP_ALIVE=24h

# Use a startup script that ensures Ollama is ready
RUN echo '#!/bin/bash\nollama serve &\n\n# Wait for Ollama to be ready\nfor i in $(seq 1 30); do\n  if curl -sf http://localhost:7860/api/tags > /dev/null 2>&1; then\n    echo "Ollama is ready!"\n    break\n  fi\n  echo "Waiting for Ollama... ($i)"\n  sleep 2\ndone\n\n# Keep container running\nwait' > /start.sh && chmod +x /start.sh

CMD ["/bin/bash", "/start.sh"]
