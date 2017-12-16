var Sequelize = require('sequelize');

var sequelize = new Sequelize('sanso', 'root', null, {
	'dialect': 'mysql',
	'host': 'localhost',
	'port': '3306',
	'define': {
		// 字段以下划线（_）来分割（默认是驼峰命名风格）  
		'underscored': true
	},
	'timestamps': false, //不加时间戳
	'freezeTableName': true, //不允许变化表名
	'logging':false,
	'pool': {
		max: 5000, // 连接池中最大连接数量
		min: 0, // 连接池中最小连接数量
		idle: 10000 // 如果一个线程 10 秒钟内没有被使用过的话，那么就释放线程
	}
});

module.exports = sequelize;