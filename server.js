const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const IMAGES_DIR = path.join(__dirname, 'images');
const CHUNK_SIZE = 1024 * 8; // Tamanho de cada chunk (8KB)

// Criação do diretório de imagens, se não existir
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR);
}

const wss = new WebSocket.Server({ port: 8080 });

let uploadChunks = {};

wss.on('connection', function connection(ws) {
  console.log('Cliente conectado');

  ws.send('Bem-vindo ao WebSocket Server!');

  ws.on('message', async function incoming(message) {
    const parsedMessage = JSON.parse(message);

    if (parsedMessage.type === 'upload_chunk') {
      const { filename, chunk, chunkIndex, totalChunks } = parsedMessage;

      if (!uploadChunks[filename]) {
        uploadChunks[filename] = [];
      }

      uploadChunks[filename][chunkIndex] = chunk;

      // Verifica se todos os chunks foram recebidos
      if (uploadChunks[filename].length === totalChunks) {
        const fullImageData = uploadChunks[filename].join('');
        const buffer = Buffer.from(fullImageData, 'base64');
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
            // Limpa o buffer temporário
            delete uploadChunks[filename];
          }
        });
      }
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
    } else if (parsedMessage.type === 'download') {
      const { filename } = parsedMessage;
      const filePath = path.join(IMAGES_DIR, filename);

      fs.readFile(filePath, (err, data) => {
        if (err) {
          console.error('Erro ao ler a imagem:', err);
          ws.send(
            JSON.stringify({
              status: 'error',
              message: 'Erro ao ler a imagem',
            }),
          );
        } else {
          const base64Data = data.toString('base64');
          const totalChunks = Math.ceil(base64Data.length / CHUNK_SIZE);

          for (let i = 0; i < totalChunks; i++) {
            const chunk = base64Data.slice(
              i * CHUNK_SIZE,
              (i + 1) * CHUNK_SIZE,
            );
            ws.send(
              JSON.stringify({
                status: 'download_chunk',
                filename: filename,
                chunk: chunk,
                chunkIndex: i,
                totalChunks: totalChunks,
              }),
            );
          }
        }
      });
    }
  });
});
