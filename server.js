const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const IMAGES_DIR = path.join(__dirname, 'images');

if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR);
}

const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', function connection(ws) {
  console.log('Cliente conectado');

  ws.send('Bem-vindo ao WebSocket Server!');

  ws.on('message', async function incoming(message) {
    const parsedMessage = JSON.parse(message);

    if (parsedMessage.type === 'upload') {
      const { filename, data } = parsedMessage;

      const buffer = Buffer.from(data, 'base64');
      const filePath = path.join(IMAGES_DIR, filename);

      fs.writeFile(filePath, buffer, (err) => {
        if (err) {
          console.error('Erro ao salvar imagem:', err);
          ws.send(
            JSON.stringify({
              status: 'error',
              message: 'Erro ao salvar imagem',
            }),
          );
        } else {
          console.log(`Imagem salva: ${filename}`);
          ws.send(
            JSON.stringify({
              status: 'success',
              message: `Imagem ${filename} recebida e salva!`,
            }),
          );
        }
      });
    } else if (parsedMessage.type === 'list') {
      fs.readdir(IMAGES_DIR, (err, files) => {
        if (err) {
          console.error('Erro ao listar imagens:', err);
          ws.send(
            JSON.stringify({
              status: 'error',
              message: 'Erro ao listar imagens',
            }),
          );
        } else {
          ws.send(JSON.stringify({ status: 'success', images: files }));
        }
      });
    } else if (parsedMessage.type === 'delete') {
      const { filename } = parsedMessage;
      const filePath = path.join(IMAGES_DIR, filename);

      fs.unlink(filePath, (err) => {
        if (err) {
          console.error('Erro ao excluir imagem:', err);
          ws.send(
            JSON.stringify({
              status: 'error',
              message: 'Erro ao excluir imagem',
            }),
          );
        } else {
          console.log(`Imagem excluída: ${filename}`);
          ws.send(
            JSON.stringify({
              status: 'success',
              message: `Imagem ${filename} excluída com sucesso!`,
            }),
          );
        }
      });
    }
  });
});
