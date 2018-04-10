const {
	sqlFormat
} = require('../service/connect');
const sendMail = require('../service/mail')
const moment = require('moment')
const {
	getLengthOfTable
} = new sqlFormat();
const {
	activeUserArray
} = require('./global')

function sendUserToEmail() {
    const date = moment().format('YYYY-MM-DD')
    getLengthOfTable('user').then(response => {
        let length = response && response[0] && response[0]['count(*)']
        let activeLength = activeUserArray.length
        activeUserArray.length = 0
        sendMail('kefu@shuatiapp.cn',
            `${date} 用户数量报告`,
            `${date} 的用户数量为 ${length} 人,/n
            今日活跃人数为 ${activeLength} 人`)
    })
}

module.exports = {
    sendUserToEmail
}