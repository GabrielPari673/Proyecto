const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

const PORT = process.env.PORT || 3000;
const HOST = 'localhost';

// Configuración CORS
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
  'Access-Control-Max-Age': '86400' // Preflight cache por 24 horas
};

// Mapeo de tipos de contenido
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

  // Servir archivos estáticos
  if (method === 'GET') {
    let filePath = path.join(
      __dirname,
      pathname === '/' ? 'index.html' : pathname
    );

    // Prevenir directory traversal
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
          // Archivo no encontrado
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('404 Not Found');
        } else if (err.code === 'EACCES') {
          // Permiso denegado
          res.writeHead(403, { 'Content-Type': 'text/plain' });
          res.end('403 Forbidden');
        } else {
          // Error del servidor
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('500 Internal Server Error');
        }
      } else {
        // Archivo encontrado
        res.writeHead(200, { 
          ...CORS_HEADERS,
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600' 
        });
        res.end(content, 'utf-8');
      }
    });
  }
  // Endpoint de contacto
  else if (method === 'POST' && (pathname === '/api/contacto' || pathname === '/contacto')) {
    let body = '';
    let jsonData = null;

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        jsonData = JSON.parse(body);
        
        // Validación de datos
        if (!jsonData.nombre || !jsonData.email || !jsonData.mensaje) {
          throw new Error('Todos los campos son requeridos');
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(jsonData.email)) {
          throw new Error('El email no tiene un formato válido');
        }

        console.log("Datos recibidos:", jsonData);

        res.writeHead(200, { 
          ...CORS_HEADERS,
          'Content-Type': 'application/json' 
        });

        res.end(JSON.stringify({
          success: true,
          message: "Mensaje recibido correctamente",
          receivedVia: req.headers.host.includes('3000') ? 
            "Node.js directo" : "Apache proxy",
          timestamp: new Date().toISOString(),
          data: {
            nombre: jsonData.nombre,
            email: jsonData.email,
            mensaje: jsonData.mensaje.substring(0, 100) + (jsonData.mensaje.length > 100 ? '...' : '')
          }
        }));

      } catch (error) {
        res.writeHead(400, { 
          ...CORS_HEADERS,
          'Content-Type': 'application/json' 
        });

        res.end(JSON.stringify({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        }));
      }
    });

    req.on('error', (err) => {
      console.error('Error en la solicitud:', err);
      res.writeHead(500, { 
        ...CORS_HEADERS,
        'Content-Type': 'application/json' 
      });
      res.end(JSON.stringify({
        success: false,
        error: 'Error interno del servidor',
        timestamp: new Date().toISOString()
      }));
    });
  }
  // Ruta no encontrada
  else {
    res.writeHead(404, { 
      ...CORS_HEADERS,
      'Content-Type': 'application/json' 
    });
    res.end(JSON.stringify({ 
      success: false,
      error: "Ruta no encontrada",
      timestamp: new Date().toISOString(),
      availableEndpoints: [
        { method: 'GET', path: '/', description: 'Formulario de contacto' },
        { method: 'POST', path: '/contacto', description: 'Enviar mensaje de contacto' },
        { method: 'POST', path: '/api/contacto', description: 'Enviar mensaje (proxy)' }
      ]
    }));
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Servidor ejecutándose en http://${HOST}:${PORT}`);
  console.log(`Accesible via Apache en http://${HOST}/api`);
  console.log('Endpoints disponibles:');
  console.log(`- POST http://${HOST}:${PORT}/contacto`);
  console.log(`- POST http://${HOST}/api/contacto (via proxy)`);
});

// Manejo de errores no capturados
process.on('uncaughtException', (err) => {
  console.error('Excepción no capturada:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Promesa rechazada no manejada:', reason);
});