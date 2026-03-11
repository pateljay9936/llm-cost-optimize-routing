---
title: Ollama LLM Router
emoji: 🦙
colorFrom: blue
colorTo: purple
sdk: docker
app_port: 7860
---

# Ollama for LLM Router

Remote Ollama instance for the LLM Router project.

## Setup

1. Create a new Space on [huggingface.co/new-space](https://huggingface.co/new-space)
2. Choose **Docker** as the SDK
3. Upload this `Dockerfile` and `README.md`
4. Set hardware to **CPU Basic** (free) or **T4 GPU** (faster, paid)
5. Once deployed, your Ollama URL is: `https://<your-username>-ollama-llm-router.hf.space`
6. Set `OLLAMA_BASE_URL` in your Vercel env to that URL

## Test it

```bash
curl https://<your-space>.hf.space/api/tags
curl -X POST https://<your-space>.hf.space/api/chat -d '{"model":"llama3.2:3b","messages":[{"role":"user","content":"hi"}],"stream":false}'
```
