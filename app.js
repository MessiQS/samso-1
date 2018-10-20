
const Koa = require('koa');
const serve = require('koa-static');
const moment = require('moment')

// 注意require('koa-router')返回的是函数:
const router = require('koa-router')();
//解析post
const bodyParser = require('koa-bodyparser');
//跨域
var cors = require('koa-cors');
//端口
const port = 8080;
//登录模块
const {
    login,
    wxlogin,
    appWxLogin,
    freeRegistration,
    signin,
    getCode,
    updatePassword,
    checkToken,
    checkCode,
    checkPassword,
    updatePhone
} = require('./sanso/module/sign');
const {
    getPaper,
    getSinglePaperInfo,
    getPaperType,
    getPaperTypeByType,
    getSecondType,
    // getProvinceBySecondType,
    getTitleByProvince,
} = require('./sanso/module/questionBank');

const {
    updateUserBuyInfo,
    getUserBuyInfo,
    updateUserQuestionInfo,
    getUpdateInfoCache,
    getUserQuestionInfo,
    getQuestionInfoByPaperid
} = require('./sanso/module/model')


const {
    adminLogin,
    getErrorQuestion,
    checkAdminToken,
    setErrorToTrue,
    fixedErrorQuestion
} = require('./sanso/module/adminController')

//支付
// const {
//     wechatPay
// } = require('./sanso/service/pay')
//ping++支付
const {
    createCharge,
    pingHook,
    applePay
} = require('./sanso/service/pingpp')
//链接数据库的类
const {
    sqlFormat
} = require('./sanso/service/connect');
const {
    selectFromSql
} = new sqlFormat();
const {
    feedback,
    getUpdate,
    getNewVersion,
    wrongFeedBack,
} = require('./sanso/module/customerServer')

//数据报告
const {
    sendUserToEmail
} = require('./sanso/module/report')

const app = new Koa();

app.use(cors())
app.use(bodyParser());
// add router middleware:
app.use(router.routes());
app.use(serve(__dirname + '/static'), { extensions: ['html'] });
router
    .get('/', async (ctx, next) => {
        // 当GET请求时候返回表单页面
        let html = `
      <h1>koa2 request post demo</h1>
      <form method="POST" action="/api/login">
        <p>userName</p>
        <input name="name" /><br/>
        <p>password</p>
        <input name="password" /><br/>
        <button type="submit">submit</button>
      </form>
    `;
        ctx.body = html
    })
    .post('/api/login', login)
    .post('/api/wxlogin', wxlogin)
    .post('/api/appWxLogin', appWxLogin)
    //免注册用户入口
    .post('/api/freeRegistration', freeRegistration)
    .post('/api/signin', signin)
    .post('/api/getcode', getCode)
    .post('/api/checkcode', checkCode)
    .post('/api/updatePassword', updatePassword)
    .post('/api/checkToken', checkToken)
    .post('/api/checkPassword', checkPassword)//改手机号时候用于验证账号密码
    .post('/api/updatephone', updatePhone)
    //支付
    .post('/api/createcharge', createCharge)
    //获取试卷
    .get('/api/getpaper', getPaper)
    .get('/api/papertype', getPaperType)
    .get('/api/getPaperTypeByType', getPaperTypeByType)
    //三步走
    //获取大类和secondType
    .get('/api/getSecondType', getSecondType)
    //通过secondeType获取Privince
    // .get('/api/getProvinceBySecondType',getProvinceBySecondType)
    //通过Privince获取Title
    .get('/api/getTitleByProvince', getTitleByProvince)
    //获取单套时间
    .get('/api/getSinglePaperInfo', getSinglePaperInfo)
    //购买信息更新
    // .post('/api/updateUserBuyInfo', updateUserBuyInfo)
    //获取购买信息
    .post('/api/getUserBuyInfo', getUserBuyInfo)
    //刷题之后的更新
    .post('/api/getUpdateInfoCache', getUpdateInfoCache)
    //获取用户刷题情况
    .get('/api/getUserQuestionInfo', getUserQuestionInfo)
    //获取用户单套题刷题情况
    .get('/api/getQuestionInfoByPaperid', getQuestionInfoByPaperid)
    //用户反馈信息
    .post('/api/feedback', feedback)
    //错题反馈
    .post('/api/wrongFeedBack', wrongFeedBack)
    //获取更新信息
    .get('/api/getUpdate', getUpdate)
    //下载新版本
    .get('/api/getNewVersion', getNewVersion)
    //ping++ hook
    .post('/api/pingHook', pingHook)
    //apply Pay
    .post('/api/applePay', applePay)
    //adminController
    .post('/api/adminLogin', adminLogin) //管理员登录
    .get('/api/getErrorQuestion', getErrorQuestion) //获取错题
    .get('/api/checkAdminToken', checkAdminToken) //检测登录态
    .get('/api/setErrorToTrue',setErrorToTrue) //确认题目本身没问题
    .post('/api/fixedErrorQuestion', fixedErrorQuestion) //修复题目
    

function reportForOneDay() {
    try {
        if (moment().format('HH') === "23") {
            sendUserToEmail()
        }
    } catch (e) {
        console.log('report error')
    }
    setTimeout(reportForOneDay, 1000 * 60 * 60)
}
setTimeout(reportForOneDay, 1000)
// function intervalUpdateUserQuestionInfo() {
//     updateUserQuestionInfo();
//     setTimeout(intervalUpdateUserQuestionInfo, 1000 * 2 * 60)
// }
// intervalUpdateUserQuestionInfo();
app.listen(port);

console.log('app started at port ' + port + '...');