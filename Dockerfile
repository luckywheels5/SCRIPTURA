FROM python:3.11-slim

WORKDIR /app

COPY server/requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8080

ENV PORT=8080

CMD ["python3", "server/server.py"]
