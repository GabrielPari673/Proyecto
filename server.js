const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

const PORT = process.env.PORT || 3000;
const HOST = 'localhost';

// Configuración CORS actualizada con nuevos métodos
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
  'Access-Control-Max-Age': '86400'
};

// Mapeo de tipos de contenido (original)
const CONTENT_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Base de datos en memoria para recursos (nuevo)
const db = {
  recursos: {
    1: { id: 1, nombre: "Ejemplo", descripcion: "Recurso de ejemplo" }
  }
};

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method.toUpperCase();

  // Manejo de CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  // Servir archivos estáticos (original sin cambios)
  if (method === 'GET') {
    let filePath = path.join(
      __dirname,
      pathname === '/' ? 'index.html' : pathname
    );

    if (!filePath.startsWith(__dirname + path.sep)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Acceso prohibido');
      return;
    }

    const extname = path.extname(filePath).toLowerCase();
    const contentType = CONTENT_TYPES[extname] || 'text/plain';

    fs.readFile(filePath, (err, content) => {
      if (err) {
        if (err.code === 'ENOENT') {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('404 Not Found');
        } else if (err.code === 'EACCES') {
          res.writeHead(403, { 'Content-Type': 'text/plain' });
          res.end('403 Forbidden');
        } else {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('500 Internal Server Error');
        }
      } else {
        res.writeHead(200, { 
          ...CORS_HEADERS,
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600' 
        });
        res.end(content, 'utf-8');
      }
    });
    return;
  }

  // Procesar body de la petición (común para todos los métodos)
  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });

  req.on('end', () => {
    try {
      const data = body ? JSON.parse(body) : {};

      // Endpoint de contacto (original sin cambios)
      if ((method === 'POST') && (pathname === '/api/contacto' || pathname === '/contacto')) {
        if (!data.nombre || !data.email || !data.mensaje) {
          throw new Error('Todos los campos son requeridos');
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
          throw new Error('El email no tiene un formato válido');
        }

        console.log("Datos recibidos:", data);

        sendResponse(res, 200, {
          success: true,
          message: "Mensaje recibido correctamente",
          receivedVia: req.headers.host.includes('3000') ? 
            "Node.js directo" : "Apache proxy",
          timestamp: new Date().toISOString(),
          data: {
            nombre: data.nombre,
            email: data.email,
            mensaje: data.mensaje.substring(0, 100) + (data.mensaje.length > 100 ? '...' : '')
          }
        });
        return;
      }

      // Nuevo endpoint para recursos
      if (pathname.startsWith('/api/recursos')) {
        handleRecursos(method, pathname, data, res);
        return;
      }

      // Ruta no encontrada (actualizada con nuevos endpoints)
      sendResponse(res, 404, { 
        success: false,
        error: "Ruta no encontrada",
        timestamp: new Date().toISOString(),
        availableEndpoints: [
          { method: 'GET', path: '/', description: 'Formulario de contacto' },
          { method: 'POST', path: '/contacto', description: 'Enviar mensaje de contacto' },
          { method: 'POST', path: '/api/contacto', description: 'Enviar mensaje (proxy)' },
          { method: 'GET,POST', path: '/api/recursos', description: 'CRUD de recursos' },
          { method: 'GET,PUT,PATCH,DELETE', path: '/api/recursos/:id', description: 'Operaciones específicas' }
        ]
      });

    } catch (error) {
      sendResponse(res, 400, {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  req.on('error', (err) => {
    console.error('Error en la solicitud:', err);
    sendResponse(res, 500, {
      success: false,
      error: 'Error interno del servidor',
      timestamp: new Date().toISOString()
    });
  });
});

// Manejador de recursos (nuevo)
function handleRecursos(method, pathname, data, res) {
  const partes = pathname.split('/');
  const id = partes.length > 3 ? partes[3] : null;

  switch(method) {
    case 'GET':
      if (id) {
        db.recursos[id] 
          ? sendResponse(res, 200, db.recursos[id])
          : sendResponse(res, 404, { error: "Recurso no encontrado" });
      } else {
        sendResponse(res, 200, Object.values(db.recursos));
      }
      break;

    case 'POST':
      const nuevoId = Date.now();
      db.recursos[nuevoId] = { id: nuevoId, ...data };
      sendResponse(res, 201, db.recursos[nuevoId]);
      break;

    case 'PUT':
      if (!id || !db.recursos[id]) {
        return sendResponse(res, 404, { error: "Recurso no encontrado" });
      }
      db.recursos[id] = { id: parseInt(id), ...data };
      sendResponse(res, 200, db.recursos[id]);
      break;

    case 'PATCH':
      if (!id || !db.recursos[id]) {
        return sendResponse(res, 404, { error: "Recurso no encontrado" });
      }
      db.recursos[id] = { ...db.recursos[id], ...data };
      sendResponse(res, 200, db.recursos[id]);
      break;

    case 'DELETE':
      if (!id || !db.recursos[id]) {
        return sendResponse(res, 404, { error: "Recurso no encontrado" });
      }
      delete db.recursos[id];
      sendResponse(res, 204, null);
      break;

    default:
      sendResponse(res, 405, { error: "Método no permitido" });
  }
}

// Función auxiliar para respuestas (nueva)
function sendResponse(res, status, data) {
  res.writeHead(status, { 
    ...CORS_HEADERS,
    'Content-Type': 'application/json' 
  });
  res.end(JSON.stringify(data));
}

server.listen(PORT, HOST, () => {
  console.log(`Servidor ejecutándose en http://${HOST}:${PORT}`);
  console.log(`Accesible via Apache en http://${HOST}/api`);
  console.log('Endpoints disponibles:');
  console.log(`- POST http://${HOST}:${PORT}/contacto`);
  console.log(`- POST http://${HOST}/api/contacto (via proxy)`);
  console.log(`- CRUD http://${HOST}:${PORT}/api/recursos`);
});

process.on('uncaughtException', (err) => {
  console.error('Excepción no capturada:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Promesa rechazada no manejada:', reason);
});