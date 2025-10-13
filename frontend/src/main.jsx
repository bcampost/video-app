// src/main.jsx
import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ToastProvider } from './ui/ToastProvider.jsx';
import { DialogProvider } from './ui/DialogProvider.jsx';
import App from './App.jsx';
import './index.css';

const BranchView = lazy(() => import('./pages/BranchView.jsx'));

const router = createBrowserRouter(
  [
    // Vista TV por sucursal
    {
      path: '/sucursal/:code',
      element: (
        <Suspense fallback={null}>
          <BranchView />
        </Suspense>
      ),
    },
    // Tu app principal (panel)
    { path: '/*', element: <App /> },

    { path: '*', element: <div style={{ padding: 24 }}>404</div> },
  ],
  {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    },
  }
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ToastProvider>
      <DialogProvider>
        <RouterProvider router={router} />
      </DialogProvider>
    </ToastProvider>
  </React.StrictMode>
);
