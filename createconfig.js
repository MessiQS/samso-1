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
async function addConfig() {
	// body...
	const titleArr = await getSql('select distinct title from question_banks'),
		  sskey = 'SP00000';
	let title = new Object();
	titleArr.map((res,index) => {
		index = index + 1;
		let len = index.toString().length,
			key = sskey.slice(0,7 - len) + index.toString();
		title[key] = res.title;
	})
	console.log(title);
}
addConfig();