FROM python:3.11-slim

WORKDIR /app

# Cài dependencies trước để tận dụng Docker layer cache
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy toàn bộ code backend (bao gồm agent_adk.py, mcp_server.py, model files...)
COPY . .

EXPOSE 8080

CMD ["python", "main.py"]