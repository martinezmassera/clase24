const express = require('express')
const session = require('express-session')
const http = require('http');
const MongoStore = require('connect-mongo')
const { Server } = require("socket.io");
const switchDao = require('./DAO')

const { normalize, schema } = require('normalizr')

const app = express()
app.set('views', './views')
app.set('view engine', 'ejs')
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const PORT = process.env.PORT || 8080;
const server = http.createServer(app);
const io = new Server(server);

const cart = require('./router/cart_Router');
const prod = require('./router/products_router');
const prodFake = require('./router/product_fake');
const chatDao = switchDao()
app.use(express.static('public'))

app.use(session({
    store: MongoStore.create({ mongoUrl: 'mongodb+srv://martinezmassera:k8bpJCkdfXoCG0o0@cursocoderback.ssztq.mongodb.net/?retryWrites=true&w=majority' }),
    secret: 'thesecret',
    cookie: { maxAge: 600000 },
    resave: true,
    saveUninitialized: true
}))

app.get('/login', (req, res) => {
    if (req.session.username) {
        return res.redirect('/')
    }
    return res.render('login')
})

app.post('/login', (req, res) => {
    req.session.username = req.body.username
    return res.redirect('/')
})

app.get('/', (req, res) => {
    req.session.touch()
    const username = req.session.username
    if (!req.session.username) {
        return res.redirect('/login')
    }
    return res.render('index', { username })
})

app.get('/logout', (req, res) => {
    const username = req.session.username
    req.session.destroy()
    res.render('logout', { username })
})


app.use('/carrito', cart);
app.use('/api/productos-test', prodFake);
app.use('/products', prod);

app.use('*', (req, res) => {
    const rout = req.params[0];
    const method = req.method
    res.json({
        "error": -2,
        "descripción": 'ruta ' + rout + ' metodo ' + method + ' no implementada'
    })
});


io.on('connection', socket => {
    // INICIO PRODUCTOS
    socket.on('add', async (data) => {
        await chatDao.product.add(data)
        io.sockets.emit('show', `new data`)
    })
    // // FIN PRODUCTOS

    // INICIO CHAT
    socket.on('new-message', async (newMessage) => {
        newMessage.time = new Date().toLocaleString();
        await chatDao.chat.add(newMessage)
        const leer = await chatDao.chat.getAll();
        const persona = new schema.Entity('persona')
        const textoSchema = new schema.Entity('texto')
        const msj = new schema.Entity('mensaje', {
            author: persona,
            texto: textoSchema
        }, { idAttribute: 'id' })
        const dataNormalized = normalize(leer, [msj])
        io.sockets.emit('messages', dataNormalized);
    });
    // FIN CHAT

})
server.listen(PORT, () => {
    console.log('Running...')
})