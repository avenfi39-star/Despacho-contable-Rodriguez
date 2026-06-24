# Despliegue en Vercel

## 1. Prerrequisitos
- Node.js 18+
- Cuenta en vercel.com (gratis)
- Números activados en callmebot.com (un mensaje por número)

## 2. Primera vez en local

```bash
# Instalar dependencias
npm install

# Copiar variables de entorno
cp .env.local.example .env.local
# → Editar .env.local con tu API key de CallMeBot y los números del equipo

# Correr en desarrollo
npm run dev
# Formulario clientes: http://localhost:3000
# Dashboard Saúl:     http://localhost:3000/dashboard
```

## 3. Subir a Vercel

```bash
npm i -g vercel
vercel
```

O conecta el repositorio en vercel.com/new y Vercel lo despliega automáticamente.

## 4. Variables de entorno en Vercel

En el panel de Vercel → Settings → Environment Variables, agrega las mismas
variables que están en .env.local.example.

## 5. URLs finales

- `https://tu-app.vercel.app/`           → formulario público para clientes
- `https://tu-app.vercel.app/dashboard`  → sábana privada de Saúl
