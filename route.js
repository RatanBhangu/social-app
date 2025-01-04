const user_route = require('./app/modules/user/routes/user.route');
const post_route = require('./app/modules/post/routes/post.route');
const channel_route = require('./app/modules/channel/routes/channel.route');
const product_support = require('./app/modules/Product_Support/routes/productsupport.route');
const send_feedback = require('./app/modules/feedback/routes/feedback.route');
const chat = require('./app/modules/chat/routes/chat.route');

module.exports = [
    {
        path: '/api/v1/user',
        handler: user_route
    },
    {
        path: '/api/v1/user',
        handler: send_feedback
    },
    {
        path: '/api/v1/user',
        handler: product_support
    },
    {
        path: '/api/v1/chat',
        handler: chat
    },
    {
        path: '/api/v1/post',
        handler: post_route
    },
    {
        path: '/api/v1/channel',
        handler: channel_route
    }
]