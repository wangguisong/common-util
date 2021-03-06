/**
 * Created by ling xue on 2016/3/3.
 */

var serializer = require('serializer');
var httpUtil = require('./HttpUtil.js');
var moduleUtil = require('./ModuleUtil.js');
var resUtil = require('./ResponseUtil.js');

var options ={
    crypt_key: 'mp',
    sign_key: 'biz'
};

var clientType = {
    user : 'user'
};

var headerTokenMeta = "auth-token";
var subParamToken = '_mpToken';



//The expired time 30 days
var expiredTime = 30*24*60*60*1000;

function _extend(dst,src) {

    var srcs = [];
    if ( typeof(src) == 'object' ) {
        srcs.push(src);
    } else if ( typeof(src) == 'array' ) {
        for (var i = src.length - 1; i >= 0; i--) {
            srcs.push(this._extend({},src[i]))
        };
    } else {
        throw new Error("Invalid argument")
    }

    for (var i = srcs.length - 1; i >= 0; i--) {
        for (var key in srcs[i]) {
            dst[key] = srcs[i][key];
        }
    };
    return dst;
}


function createAccessToken(userId,clientType,active){
    var extraData = "";
    var out = _extend({}, {
        access_token: serializer.stringify([userId, clientType, +new Date,active, extraData]),
        refresh_token: null
    });
    return out.access_token;
}

function parseAccessToken(accessToken){
    try{
        var data = serializer.parse(accessToken);
        var tokenInfo ={};
        tokenInfo.userId = data[0];
        tokenInfo.clientType = data[1];
        tokenInfo.grantDate = data[2];
        tokenInfo.active = data[3];
        tokenInfo.extraData = data[4];
        return tokenInfo;
    }catch(e){
        return null;
    }
}

function checkUserAccessToken(req){
    var cookiesToken = req.headers[headerTokenMeta] ;
    if(cookiesToken == undefined){
        return null;
    }
    var tokenInfo = parseAccessToken(cookiesToken);
    if(tokenInfo == undefined){
        return null;
    }
    var resultObj = {};
    if(tokenInfo.clientType == undefined || tokenInfo.clientType != clientType.user){
        return null;
    }else if((tokenInfo.grantDate == undefined) || ((tokenInfo.grantDate + expiredTime)<(new Date().getTime()))){
        return null;
    }else if(tokenInfo.clientType == clientType.user){
        resultObj = {id:tokenInfo.userId,type:clientType.user,active:tokenInfo.active};
        return resultObj;
    }else{
        return  null;
    }
}

function checkUser(req,res,next){
    var params = req.params;
    var cookiesToken = req.headers[headerTokenMeta];
    //var cookiesToken = params.token;
    var userToken = {
        userId:params.userId,
        token:cookiesToken
    }
    var host = moduleUtil.getLoginUrl() ;
    var url ="/api/userToken";

    httpUtil.httpPost(host,url,req,userToken,function(error,result){
        if(error){
            resUtil.resInternalError(res,next,error)
        }else{
            if(result.success){
                return next();
            }else{
                resUtil.resInternalError(res,next,{message:result.msg});
            }
        }
    });
}
function getPathName(url){
    if(url.indexOf('?')>0){
        url = url.substring(0,url.indexOf('?'));
    }
    return url;
}

function getReqParams(req){
    var params = {};
    params.sessionToken = req.headers[headerTokenMeta];
    params.method = req.method.toLowerCase();
    var url = getPathName(req.url);
    params.url = url;
    return params;
}

module.exports = {
    clientType : clientType ,
    expiredTime : expiredTime ,
    headerTokenMeta : headerTokenMeta ,
    subParamToken : subParamToken ,
    createAccessToken : createAccessToken ,
    parseAccessToken : parseAccessToken ,
    checkUserAccessToken : checkUserAccessToken ,
    checkUser : checkUser ,
    getReqParams : getReqParams
}