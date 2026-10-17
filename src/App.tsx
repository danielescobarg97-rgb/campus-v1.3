import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { StudentApp } from './apps/student/StudentApp';
import { AdminAuthGuard } from './apps/cafeteria/AdminAuthGuard';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta Raíz: Vista del Estudiante (Menú, Pedido, Carrito y Rastreo en Vivo) */}
        <Route path="/" element={<StudentApp />} />

        {/* Ruta de Administración: Panel de Cocina y Gestión de Menú (Protegido con PIN 1234) */}
        <Route path="/admin" element={<AdminAuthGuard />} />

        {/* Redirección por defecto */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
