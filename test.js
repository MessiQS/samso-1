
const {
    sendUserToEmail
} = require('./sanso/module/report')

function reportForOneDay() {
    // if (moment().format('HH') === 23) {
        console.log(2)
        sendUserToEmail()
        console.log(1)
    // }
    setTimeout(reportForOneDay, 1000 * 60 * 60)
}
reportForOneDay()
// setTimeout(reportForOneDay, 1000 * 60 * 60)