const express = require("express");
const app = express();
var http = require("http").createServer(app);
var io = require("./socket").init(http);
const cors = require('cors');
const dotenv = require('dotenv');
const morgan = require('morgan');
const mongoose = require('mongoose');
const errorHandler = require('./app/middleware/error');
const connectDB = require('./app/db/mongoose');
const router = express.Router();
const User = require('./app/modules/user/models/user.model');
const routes = require('./route');
const Userchat = require('./app/modules/chat/models/chat.model');
const FILTER = require("bad-words");
const Channel = require('./app/modules/channel/models/channel.model');
const { changeStatusSocket } = require("./app/helper/emitSockets")

//load env variables
dotenv.config({ path: './config/config.env' });
const PORT = process.env.PORT || 4000;

//loading database
connectDB();

app.set("view engine", "ejs");
app.set("views", "views");

//intializing cors
app.use(cors({ credentials: true }));
//setting up morgan for development mode
//middleware to interact with body// body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/static', express.static('./uploads'));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

//mapping routes
app.get('/', function (req, res) {
  console.log('Welcome to Gsocial');
})

routes.map(route => {
  app.use(route.path, route.handler);
});


//our errorHandler middleware(it is after brands route becuase node executes in linear order)
app.use(errorHandler);
let count = 0;

io.on('connection', async (socket) => {
  count += 1;
  console.log("Active sockets", count);

  socket.on(`chatMessage/senderAck`, async (data) => {
    const updatechat = await Userchat.findByIdAndUpdate(data.messageId, {
      received: true,
    });

    await changeStatusSocket(data, data.senderId);
  });

  socket.on('disconnect', () => {
    count -= 1;
    console.log("Active sockets", count);

  });
});

server = http.listen(PORT, console.log(`Server is up and running at port number ${PORT} , Mode=${process.env.NODE_ENV}`));