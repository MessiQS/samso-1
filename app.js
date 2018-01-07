
const Koa = require('koa');
const serve = require('koa-static');

// 注意require('koa-router')返回的是函数:
const router = require('koa-router')();
//解析post
const bodyParser = require('koa-bodyparser');
//端口
const port = 8080;
//登录模块
const {
    login,
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
    getPaperType
} = require('./sanso/module/questionBank');

const {
    updateUserBuyInfo,
    getUserBuyInfo,
    updateUserQuestionInfo,
    getUpdateInfoCache,
    getUserQuestionInfo
} = require('./sanso/module/model')

//支付
// const {
//     wechatPay
// } = require('./sanso/service/pay')
//ping++支付
const {
    createCharge,
    pingHook
} = require('./sanso/service/pingpp')
//链接数据库的类
const {
    sqlFormat
} = require('./sanso/service/connect');
const {
    selectFromSql
} = new sqlFormat();
const {
    feedback
} = require('./sanso/module/customerServer')

const app = new Koa();

app.use(bodyParser());
// add router middleware:
app.use(router.routes());
app.use(serve(__dirname + '/static'));

router
    .get('/', async(ctx, next) => {
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
    .post('/api/signin', signin)
    .post('/api/getcode',getCode)
    .post('/api/checkcode',checkCode)
    .post('/api/updatePassword',updatePassword)
    .post('/api/checkToken',checkToken)
    .post('/api/checkPassword',checkPassword)//改手机号时候用于验证账号密码
    .post('/api/updatephone',updatePhone)
    //支付
    .post('/api/createcharge',createCharge)
    //获取试卷
    .get('/api/getpaper',getPaper)
    .get('/api/papertype',getPaperType)
    //获取单套时间
    .get('/api/getSinglePaperInfo',getSinglePaperInfo)
        //购买信息更新
    .post('/api/updateUserBuyInfo', updateUserBuyInfo)
    //获取购买信息
    .post('/api/getUserBuyInfo', getUserBuyInfo)
    //刷题之后的更新
    .post('/api/getUpdateInfoCache', getUpdateInfoCache)
    //获取用户刷题情况
    .get('/api/getUserQuestionInfo', getUserQuestionInfo)
    //用户反馈信息
    .post('/api/feedback', feedback)
    //ping++ hook
    .post('/api/pingHook', pingHook)

function intervalUpdateUserQuestionInfo(){
    updateUserQuestionInfo();
    setTimeout(intervalUpdateUserQuestionInfo,1000*2*60)
}
intervalUpdateUserQuestionInfo();
app.listen(port);

console.log('app started at port ' + port + '...');