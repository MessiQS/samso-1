
// 刷题部分api

// 更新用户购买情况
const updateUserBuyInfo = {
    method: "post",
    url: "/api/updateUserBuyInfo",
    params: {
        user_id,//用户信息里有
        bankname,//购买的试卷id
    }
}

//刷题之后的更新
//点击下一题时候发送的请求
const getUpdateInfoCache = {
    method: "post",
    url: "/api/getUpdateInfoCache",
    params: {
        user_id, //用户信息里有
        bankname,//购买的试卷id
        qname,//题目名称
        type,//right or wrong 
        weighted,//本次作答的加权分
    }
}