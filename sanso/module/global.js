//链接数据库的类
const {
	sqlFormat
} = require('../service/connect');
const {
	getSql,
	selectFromSql
} = new sqlFormat();

let code = {

};//存储验证码信息


//缓存试卷信息
// let paperObj = null;

//缓存用户刷题信息，防止接触数据库太多
let temporaryQuesInfo = []

async function provinceCache() {
	// if(!!paperObj){
	// 	return paperObj
	// }else{
	let paperObj = {}
	const paperSqlInfo = await selectFromSql('papers');
	paperSqlInfo.forEach(result => {
		paperObj[result.id] = result
	})
	return paperObj
	// }
}
module.exports = {
	codeObj: code,
	provinceCache,//缓存城市
	temporaryQuesInfo,
}