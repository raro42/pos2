# Use back image so we don't pull a new base (back has python, uvicorn, fastapi)
FROM pos2-back:latest

WORKDIR /app

# ws-bridge deps (back may have some; install explicitly)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

EXPOSE 8021
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8021", "--log-level", "info", "--access-log"]
