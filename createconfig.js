//链接数据库的类
const {
	sqlFormat
} = require('./sanso/service/connect');
const {
	selectFromSql,
	getSql,
	insertToSql,
	updateToSql
} = new sqlFormat();
function addConfig() {
	// body...
	getSql('select distinct title,province,year from question_banks').then(titleArr => {
		let sskey = 'SP00000';
		let title = [];
		titleArr.map((res, index) => {
			index = index + 1;
			let len = index.toString().length,
				key = sskey.slice(0, 7 - len) + index.toString();
			title.push({
				id: key,
				title: res.title,
				price: "6.00",
				version: "1.0",
				province: res.province,
				year: res.year
			})
		})
		insertToSql('papers',title)
		console.log(title);
	})

}
addConfig();