import express, { Request, Response } from 'express';
import "dotenv/config"
import session from 'express-session';
import axios from 'axios';
import path from 'path';
import mongoose from 'mongoose';

const app = express();
const PORT = process.env.PORT;

const CLIENT_ID = process.env.CLIENTID as string;
const CLIENT_SECRET = process.env.CLIENTSECRET as string;
const REDIRECT_URI = process.env.REDIRECTURI as string;
const MONGOURI = process.env.MONGOURI as string;

mongoose.connect(MONGOURI, {})
    .then(() => console.log('Conectado ao banco syncbot'))
    .catch(err => console.error('Erro ao conectar ao banco:', err));

const userSQL = new mongoose.Schema({
    discordId: String,
    username: String,
    email: String,
    money: Number
}, { collection: 'users' });

const User = mongoose.model('User', userSQL);

app.use(session({
    secret: process.env.SESSIONSECRET as string,
    resave: false,
    saveUninitialized: true,
}));

app.use(express.static(path.join(__dirname, '../site')));

app.get('/', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '../site/index.html'));
});

app.get('/callback', async (req: Request, res: Response) => {
    const code = req.query.code;

    if (!code) {
        return res.status(400).send('Código não encontrado');
    }

    try {
        const tokenResponse = await axios.post('https://discord.com/api/v10/oauth2/token', new URLSearchParams({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            grant_type: 'authorization_code',
            code: code as string,
            redirect_uri: REDIRECT_URI
        }), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const accessToken = tokenResponse.data.access_token;

        req.session.accessToken = accessToken;

        res.redirect('/profile');
    } catch (error) {
        console.error('Erro ao pegar o token:', error);
        res.status(500).send('Erro ao pegar o token.');
    }
});

app.get('/profile', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '../site/profile.html'));
});

app.get('/auth', (req: Request, res: Response) => {
    const discordAuthUrl = `https://discord.com/oauth2/authorize?client_id=1280969013635190834&response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fcallback&scope=guilds+email+identify`;
    res.redirect(discordAuthUrl);
});

app.get('/profile-data', async (req: Request, res: Response) => {
    const accessToken = req.session.accessToken;

    if (!accessToken) {
        return res.redirect('/auth');
    }

    try {
        const userResponse = await axios.get('https://discord.com/api/v10/users/@me', {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        const userData = userResponse.data;

        let userInDb = await User.findOne({ discordId: userData.id });

        if (!userInDb) {
            userInDb = new User({
                discordId: userData.id,
                username: userData.username,
                email: userData.email,
                money: 0
            });

            await userInDb.save();
        }

        const responseData = {
            ...userData,
            money: userInDb.money 
        };

        res.json(responseData);
    } catch (error) {
        console.error('Erro ao pegar os dados da pessoa:', error);
        res.status(500).send('Erro ao pegar os dados.');
    }
});

app.get('/database/money', async (req: Request, res: Response) => {
    const discordId = req.query.id as string;
    const password = req.query.password as string;

    if (!password || password !== "syncbotpassword") {
        return res.status(400).json({ error: 'SENHA INVÁLIDA OU NÃO FORNECIDA.' });
    }

    if (!discordId) {
        return res.status(400).json({ error: 'ID do Discord não fornecido.' });
    }

    try {
        const user = await User.findOne({ discordId });

        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        res.json(user);
    } catch (error) {
        console.error('Erro ao buscar dados do usuário no banco:', error);
        res.status(500).send('Erro ao buscar dados do usuário.');
    }
});

app.get('/database/money/addUser', async (req: Request, res: Response) => {
    const discordId = req.query.id as string;
    const money = parseInt(req.query.money as string, 10);
    const password = req.query.password as string;

    if (!password || password !== "syncbotpassword") {
        return res.status(400).json({ error: 'SENHA INVÁLIDA OU NÃO FORNECIDA.' });
    }

    if (!discordId || isNaN(money)) {
        return res.status(400).json({ error: 'ID do Discord ou valor de dinheiro inválido.' });
    }

    try {
        let user = await User.findOne({ discordId });

        if (user) {
            return res.status(400).json({ error: 'Usuário já existe no banco.' });
        }

        user = new User({ discordId, money });

        await user.save();

        console.log(`Usuário ${discordId} criado com ${money} de dinheiro.`);

        res.status(201).json({ message: 'Usuário adicionado com sucesso.' });
    } catch (error) {
        console.error('Erro ao adicionar usuário:', error);
        res.status(500).send('Erro ao adicionar usuário.');
    }
});

app.get('/guilds', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '../site/guilds.html'));
});

app.get('/guilds/redirect', (req: Request, res: Response) => {
    const id = req.query.id as string;
    res.redirect("https://discord.com/channels/" + id)
});

app.get('/guilds/data', async (req: Request, res: Response) => {
    const accessToken = req.session.accessToken;

    if (!accessToken) {
        return res.status(401).json({ error: 'Usuário não autenticado. Faça login novamente.' });
    }

    try {
        const guildsResponse = await axios.get('https://discord.com/api/v10/users/@me/guilds', {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        const guildsData = guildsResponse.data;

        res.json(guildsData);
    } catch (error) {
        console.error('Erro ao buscar guildas do usuário:', error);
        res.status(500).send('Erro ao buscar guildas.');
    }
});


app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});