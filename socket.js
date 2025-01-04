let io;
module.exports = {
    init: (server)=>{
    io = require('socket.io')(server);
    return io;    
},
    getio:()=>{
        if(!io){
            throw new Error("socket not initialised");
        }
        return io;
    }
}