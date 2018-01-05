var fs = require('fs');
var Sequelize = require('sequelize');
var file = "./Archive";
var cslogger = require('./modules/logModule').cslogger;

var qbank_create = require('./modules/mysql/questionBank').create;
//链接数据库的类
// const {
// 	sqlFormat
// } = require('./sanso/service/connect');
// const {
// 	selectFromSql,
// 	insertToSql,
// 	updateToSql
// } = new sqlFormat();

var provinceArray = ['安徽', '北京', '上海', '天津', '重庆', '河北', '山西', '内蒙古',
	'辽宁', '吉林', '黑龙江', '江苏', '浙江', '福建', '江西', '山东',
	'河南', '湖北', '湖南', '广东', '广西', '海南', '四川', '贵州',
	'云南', '西藏', '陕西', '甘肃', '宁夏', '青海', '新疆', '香港',
	'澳门', '台湾', '国家'
],
	cityArray = ['北京', '上海', '天津', '重庆'];
var objArray = [];
add();

function add() {
	fs.readdir(file, function (err, files) {
		if (err) {
			console.log(err);
			return;
		}

		var count = files.length,
			length = 0;
		var results = {};
		files.forEach(function (filename, index) {
			let oldFilename = filename,
				paperName = file + '/' + filename;
			if (paperName.indexOf('Store') < 0) {
				fs.readFile(paperName, function (err, data) {
					if (err) {
						console.log(err);
					}
					// body...
					let useData = JSON.parse(data).map(res => {
						res.question = res.question_title.replace(/\"/g, '\"');
						delete res.question_title;
						res.subject = res.subjectType;
						delete res.subjectType;
						res.id = getUid();
						res.created_at = (new Date().getTime()).toString();
						res.updated_at = (new Date().getTime()).toString();
						return {
							id: res.id,
							analysis: res.analysis,
							answer: res.answer,
							category: res.category,
							option_A: res.option_A,
							option_B: res.option_B,
							option_C: res.option_C,
							option_D: res.option_D,
							province: res.province,
							question: res.question,
							question_point: res.question_point,
							subject: res.subject,
							year: res.year,
							title: res.title,
							question_number: res.question_number,
							question_material: res.question_material,
							created_at: res.created_at,
							// updated_at:res.updated_at
						}
					});
					objArray = objArray.concat(useData);
					length++;
					console.log(length ,files.length )
					if (length === files.length ) {
						addToMysql(objArray);
					}
					return;
				})
			}
		});
	});
}

function addToMysql(objArray) {
	console.log(objArray.length)
	// insertToSql('question_banks',objArray);
	objArray.forEach((resuilt, idx) => {
		qbank_create(resuilt).then((res) => {
			if (objArray.length - idx < 2) {
				console.log(resuilt)
			}
		})
	})
}
//获取32位随机串
function getUid() {
	function S4() {
		return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
	}
	return (S4() + S4() + S4() + S4() + S4() + S4() + S4() + S4());
}