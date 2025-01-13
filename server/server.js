const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const bcrypt = require('bcrypt');
const path = require('path');
const session = require('express-session');

const app = express();
const PORT = 3000;

// Middleware para processar formulários e sessões
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
    secret: 'chave-secreta-para-sessao',
    resave: false,
    saveUninitialized: true,
}));

// Servir arquivos estáticos (CSS, imagens e páginas HTML)
app.use('/assets', express.static(path.join(__dirname, '../assets')));

// Rota para página inicial
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

// Rotas para login e cadastro
app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../pages/login.html'));
});

app.get('/register.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../pages/cadastro.html'));
});

app.get('/dashboard.html', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login.html');
    }
    res.sendFile(path.join(__dirname, '../dashboard.html'));
});

// Cadastro
app.post('/submit_register', async (req, res) => {
    const { name, email, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
        return res.status(400).send('As senhas não coincidem.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const users = JSON.parse(fs.readFileSync('./db/db.json', 'utf-8'));

    if (users.find(user => user.email === email)) {
        return res.status(400).send('Email já cadastrado.');
    }

    users.push({ name, email, password: hashedPassword, transactions: [] });
    fs.writeFileSync('./db/db.json', JSON.stringify(users, null, 2));

    res.redirect('/login.html');
});

// Login
app.post('/submit_login', async (req, res) => {
    const { email, password } = req.body;

    const users = JSON.parse(fs.readFileSync('./db/db.json', 'utf-8'));
    const user = users.find(user => user.email === email);

    if (!user) {
        return res.status(400).send('Email não encontrado.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
        return res.status(400).send('Senha incorreta.');
    }

    // Salva o usuário na sessão
    req.session.user = { email: user.email, name: user.name };
    res.redirect('/dashboard.html');
});

// Obter transações do usuário logado
app.get('/get_transactions', (req, res) => {
    if (!req.session.user) {
        return res.status(401).send('Usuário não autenticado.');
    }

    const users = JSON.parse(fs.readFileSync('./db/db.json', 'utf-8'));
    const user = users.find(user => user.email === req.session.user.email);

    if (!user) {
        return res.status(400).send('Usuário não encontrado.');
    }

    res.json(user.transactions || []);
});

// Adicionar transação
app.post('/add_transaction', (req, res) => {
    if (!req.session.user) {
        return res.status(401).send('Usuário não autenticado.');
    }

    const { descricao, categoria, valor } = req.body;
    const users = JSON.parse(fs.readFileSync('./db/db.json', 'utf-8'));

    const userIndex = users.findIndex(user => user.email === req.session.user.email);
    if (userIndex === -1) {
        return res.status(400).send('Usuário não encontrado.');
    }

    // Adiciona a transação
    users[userIndex].transactions.push({ descricao, categoria, valor: parseFloat(valor) });

    // Atualiza o arquivo db.json
    fs.writeFileSync('./db/db.json', JSON.stringify(users, null, 2));

    res.status(200).send('Transação salva com sucesso.');
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

// Inicia o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
