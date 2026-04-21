# Arquitectura de Plataforma: Simplificia (Multi-tenant)

Este documento detalla la estructura técnica para una plataforma SaaS (Software as a Service) centralizada, diseñada para gestionar múltiples rubros de negocios (Pádel, Peluquerías, Consultorios, etc.) mediante una única aplicación de React, n8n y Supabase.

---

## 1. Stack Tecnológico

* **Frontend:** React (Vite) + Tailwind CSS + PWA (Vite-plugin-pwa).
* **Backend & Lógica:** n8n (Orquestación de mensajes y automatización).
* **Base de Datos & Auth:** Supabase (PostgreSQL).
* **Despliegue:** PWA (Sin necesidad de App Stores).

---

## 2. Estructura de URLs (Rutas Dinámicas)

Utilizaremos un enfoque de **un solo proyecto de React** que se adapta dinámicamente según la URL visitada.

### A. Lado del Cliente (Chat / Reservas)
* `app.simplificia.com.ar/:rubro/:comercio_slug`
    * *Ejemplo:* `/padel/cancha-central`
    * *Ejemplo:* `/peluqueria/estilo-urbano`
* **Funcionamiento:** React captura el `slug`, consulta a Supabase la configuración visual (colores, logo, rubro) y carga la interfaz de chat personalizada.

### B. Lado del Dueño (Dashboard de Gestión)
* `app.simplificia.com.ar/login`: Acceso unificado para todos los dueños.
* `app.simplificia.com.ar/dashboard`: Panel privado. Los datos mostrados están filtrados por el `negocio_id` del usuario logueado usando **Row Level Security (RLS)** de Supabase.

### C. Lado Administrativo (Tu Panel)
* `app.simplificia.com.ar/admin`: Panel exclusivo para los fundadores.
* **Funcionalidad:** Creación de nuevos negocios, edición de rubros y estadísticas globales de la plataforma.

---

## 3. Modelo de Datos (Supabase)

Tablas principales para soportar el modelo multi-inquilino:

1.  **`negocios`**: Almacena configuración (ID, nombre, rubro, slug, colores, logo, webhook_n8n).
2.  **`usuarios`**: Perfiles de dueños vinculados a un `negocio_id`.
3.  **`citas_reservas`**: Almacena todas las interacciones, diferenciadas por la columna `negocio_id`.
4.  **`push_tokens`**: Almacena los tokens de los navegadores de los clientes para enviar ofertas desde el dashboard.

---

## 4. Flujo de Trabajo (Workflows)

### Registro de Negocio (Escalabilidad)
1.  Desde el **Panel Admin**, completas el formulario de "Nuevo Comercio".
2.  Supabase guarda el registro.
3.  Automáticamente, la nueva ruta `/rubro/nuevo-comercio` queda habilitada sin tocar código.

### Comunicación (n8n)
1.  El cliente escribe en la PWA (React).
2.  React envía el mensaje a **n8n** incluyendo el `negocio_id`.
3.  n8n procesa con IA y responde al cliente, guardando la analítica en **Supabase**.
4.  El Dashboard del dueño se actualiza en **tiempo real** gracias a las suscripciones de Supabase.

---

## 5. Implementación PWA (App Móvil)

Para evitar las tiendas de aplicaciones (Google/Apple), el proyecto incluye:

* **Manifest.json:** Configurado como `display: standalone` para eliminar la barra del navegador.
* **Service Worker:** Gestiona el caché y permite que la app sea instalada en el escritorio del celular.
* **Web Push API:** Permite que los dueños envíen notificaciones de ofertas directamente al celular de sus clientes desde el Dashboard.

---

## 6. Dashboard Administrativo (Tu visión)

El panel `/admin` permitirá:
* **Estadísticas Globales:** Total de mensajes enviados, total de citas agendadas en toda la red de Simplificia.
* **Gestión de Altas:** Botón "Agregar Negocio" que dispara la configuración inicial de base de datos y genera el slug de acceso.
* **Control de Suscripciones:** Bloqueo de acceso a dashboards de dueños que no estén al día con el pago (integración con Mercado Pago vía n8n).

---

> **Nota:** Esta estructura monolítica permite mantener un solo código fuente. Si se agrega una mejora al sistema de chat, todos los rubros y negocios se benefician instantáneamente de la actualización.