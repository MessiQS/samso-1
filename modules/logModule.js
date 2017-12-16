const log4js = require('log4js');

log4js.configure({
	appenders: {
		cheese: {
			type: 'file',
			filename: '../logs/cheese.log'
		}
	},
	categories: {
		default: {
			appenders: ['cheese'],
			level: 'error'
		}
	}
});


const cheeseLogger = log4js.getLogger('cheese');

module.exports = {
	cslogger: cheeseLogger
}