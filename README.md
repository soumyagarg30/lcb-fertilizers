# Agriflow

Frontend: React + Vite.
Backend: FastAPI in `backend_fastapi/`.

This project is a warehouse and inventory management dashboard scaffold with a FastAPI backend and React frontend.

## Getting Started

1. Start the backend:
   - `cd backend_fastapi`
   - `python -m pip install -r requirements.txt`
   - `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`

2. Start the frontend:
   - `cd ..`
   - `npm install`
   - `npm run dev`

3. Open the frontend app in the browser. The React frontend defaults to `http://localhost:8000` for API calls unless `VITE_API_BASE` is set.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
