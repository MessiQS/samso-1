
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

//获取用户刷题情况
const getUserQuestionInfo = {
    method: "get",
    url: "/api/getUserQuestionInfo",
    params: {
        user_id, //必填
        bankname,//选填 
        dateTime,//选填
        isDataDefault,//选填
        isBankDefault,//选填
    }
    //此api有5种情况
    /**
     * 1.参数只有useri_id
     * 此情况获取该用户所有日期的刷题数据
     * 以及所有题库的刷题数据
     * 
     * 2.user_id + bankname
     * bankname填试卷名称 
     * 具体到某一张试卷的刷题情况
     * 
     * 3.user_id + dateTime
     * dataTime 写时间 例：2017-10-15
     * 具体到某体贴的刷题情况
     * 
     * 4.user_id + isDataDefault
     * isDataDefault为布尔值
     * 为true时获取该用户 所有日期的刷题情况
     * 
     * 5.user_id + isBankDefault
     * isBankDefault为布尔值
     * 为true时获取该用户 所有题库的刷题情况
     */
}