const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const https = require('https');

const app = express();
app.use(cors()); 
app.use(express.json()); 

const server = http.createServer(app);
const io = new Server(server, { 
    cors: { origin: "*" },
    maxHttpBufferSize: 1e7 
});

// Configuration
const JWT_SECRET = process.env.JWT_SECRET;
const mongoURI = process.env.MONGO_URI;

if (!mongoURI) {
    console.error("CRITICAL: MONGO_URI environment variable is missing.");
}

mongoose.connect(mongoURI).then(() => console.log("Connected to MongoDB")).catch(err => console.error(err));

//Models
const User = mongoose.model('User', new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true }
}));

const Message = mongoose.model('Message', new mongoose.Schema({
    from: String, to: String, text: String, timestamp: { type: Date, default: Date.now }
}));

let onlineUsers = {}; 

//Routes
app.get('/', (req, res) => res.send("🚀 Kartikeya Simple Chat API is Online"));

app.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        await new User({ username, password: hashedPassword }).save();
        io.emit('user registered'); 
        res.status(201).send({ message: "Registered" });
    } catch (err) { res.status(400).send({ error: "Username exists" }); }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (user && await bcrypt.compare(password, user.password)) {
        const token = jwt.sign({ username: user.username }, JWT_SECRET);
        res.json({ token, username: user.username });
    } else { res.status(401).send({ error: "Invalid credentials" }); }
});

app.get('/users', async (req, res) => {
    try {
        const loggedInUser = req.query.currentUser; // Get who is asking

        // 1. Fetch users and deduplicate unique usernames
        const allUsers = await User.find({}, 'username');
        const uniqueUsernames = [...new Set(allUsers.map(u => u.username))];

        // 2. Fetch snippets strictly between the loggedInUser and that user
        const usersWithMeta = await Promise.all(uniqueUsernames.map(async (uname) => {
            let snippet = "No messages yet";

            if (loggedInUser) {
                const lastMsg = await Message.findOne({
                    $or: [
                        { from: uname, to: loggedInUser },
                        { from: loggedInUser, to: uname }
                    ]
                }).sort({ timestamp: -1 });

                if (lastMsg) {
                    snippet = lastMsg.text.startsWith('data:image') 
                        ? "📷 Image" 
                        : (lastMsg.text || "").substring(0, 20) + "...";
                }
            }

            return {
                username: uname,
                isOnline: !!onlineUsers[uname],
                lastSnippet: snippet
            };
        }));

        res.json(usersWithMeta);
    } catch (e) {
        console.error("Error fetching users:", e);
        res.status(500).json([]);
    }
});

//Socket Logic
io.on('connection', (socket) => {
    socket.on('join', (username) => {
        socket.join(username);
        socket.username = username;
        onlineUsers[username] = socket.id;
        io.emit('status change', { username: username, status: 'online' });
    });

    socket.on('private message', async (data) => {
        let savedMsg = { from: data.from, to: data.to, text: data.text, timestamp: new Date() };
        if (!data.text.startsWith('data:image')) {
            const doc = await new Message(savedMsg).save();
            savedMsg._id = doc._id;
        } else {
            savedMsg._id = "img-" + Date.now();
        }
        io.to(data.to).to(data.from).emit('new message', savedMsg);
        io.emit('refresh sidebar'); 
    });

    socket.on('typing', (data) => io.to(data.to).emit('user typing', { from: data.from }));
    socket.on('stop typing', (data) => io.to(data.to).emit('user stop typing', { from: data.from }));

    socket.on('get history', async (data) => {
        const history = await Message.find({
            $or: [{ from: data.from, to: data.to }, { from: data.to, to: data.from }]
        }).sort({ timestamp: 1 });
        socket.emit('load history', history);
    });

    socket.on('delete message', async (id) => {
        if (!id.startsWith('img-')) await Message.findByIdAndDelete(id);
        io.emit('message deleted', id);
        io.emit('refresh sidebar');
    });

    socket.on('clear history', async (data) => {
        await Message.deleteMany({ $or: [{ from: data.from, to: data.to }, { from: data.to, to: data.from }] });
        io.to(data.to).to(data.from).emit('history cleared');
        io.emit('refresh sidebar');
    });

    socket.on('disconnect', () => {
        if (socket.username) {
            delete onlineUsers[socket.username];
            io.emit('status change', { username: socket.username, status: 'offline' });
        }
    });
});

//Ping
const RENDER_URL = "https://simplechat-9zs6.onrender.com";
setInterval(() => {
    https.get(RENDER_URL, (res) => {
        console.log(`Pinged self: Status Code ${res.statusCode}`);
    }).on('error', (e) => {
        console.error(`Ping failed: ${e.message}`);
    });
}, 600000); //10 minutes

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server active on port ${PORT}`));