const _=require('lodash');

exports.pickRegistrationRequest = data =>{
    var response=_.pick(data,[
        "firstName",
        "lastName",
        "gender",
        "phone",
        "email",
        "password"       
    ]);
    return response;
}

exports.pickRegistrationResponse = data =>{
    var response=_.pick(data,[
        "_id",
        "firstName",
        "lastName",
        "gender",
        "phone",
        "email",
        "avatarUrl",
        "about"
    ]);
    return response;
}

exports.pickLoginResponse = data =>{
    var response=_.pick(data,[
        "_id",
        "role",
        "firstName",
        "lastName",
        "gender",
        "phone",
        "email",
        "isOtpVerified",
        "avatarUrl",
        "about"       
    ]);
    return response;
}

exports.pickPostResponse=data =>{
    var response=_.pick(data,[
        'content',
        'user',
        'postmultimedia',
        'channelId'
    ]);

    return response;
}