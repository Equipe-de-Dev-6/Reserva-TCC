FROM python:3.11-slim

WORKDIR /app

# Dependências do sistema (precisárias para bcrypt e cryptography)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libffi-dev \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Dependências Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Código da aplicação
COPY . .

# Porta do uvicorn
EXPOSE 8000

# Inicia a aplicação (sem reload para imagem leve; adicione --reload se quiser desenvolvimento)
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
