//链接数据库的类
const {
	sqlFormat
} = require('../service/connect');
const { city, province } = require('../../bin/config');
const {
	getSql,
	selectFromSql,
	insertToSql,
	updateToSql
} = new sqlFormat();
const { checkHeader } = require('../service/check');
const { transObjToProvice, transObjToDriver } = require('./controller/bank.controller')
const { provinceCache, getPaperMenuByType, getAllPaperId } = require('./global');
const sendMail = require('../service/mail')


class QuestionBank {
	static async getPaper(ctx, next) {
		const { user_id, paperId } = ctx.query;
		const isValid = await checkHeader(ctx.request, user_id);
		const provinceObjectCache = await getAllPaperId();

		if (!isValid) {
			ctx.response.body = {
				type: false,
				data: '登录错误，请重新登录'
			}
			return;
		};
		if (!paperId || !provinceObjectCache[paperId]) {
			ctx.response.body = {
				type: false,
				data: '试卷id错误'
			}
			return;
		}
		// checkBuy({ user_id, paperId })
		const questionArray = await selectFromSql('question_banks', {
			'FIND_IN_SET': '("' + provinceObjectCache[paperId].title + '",`title`)',
			'ORDER BY': ` question_number`
		});
		if (!questionArray) {
			ctx.response.body = {
				type: false,
				data: '发生错误，请重试'
			}
			return;
		};
		ctx.response.body = {
			type: true,
			data: questionArray
		}
	}
	//获取单套试卷
	static async getSinglePaperInfo(ctx, next) {
		const { user_id, paperId } = ctx.query;
		const isValid = await checkHeader(ctx.request, user_id);
		if (!isValid) {
			ctx.response.body = {
				type: false,
				data: '登录错误，请重新登录'
			}
			return;
		};
		let returnData = {};
		let paperArray = paperId.split(',');
		if (paperArray.length === 1) {
			returnData = await getOnePaperInfo(paperId)
		} else if (paperArray.length > 1) {
			returnData = await getArrayPaperInfo(paperArray)
		}
		ctx.response.body = {
			type: true,
			data: returnData
		}
	}

	//获取试卷详情
	static async getPaperType(ctx, next) {
		const { user_id, version, system } = ctx.query;
		const isValid = await checkHeader(ctx.request, user_id);
		if (!isValid) {
			ctx.response.body = {
				type: false,
				data: '登录错误，请重新登录'
			}
			return;
		};
		//获取试卷对象
		const paperNameArray = await provinceCache();
		const typeObject = await transObjToProvice(paperNameArray);
		ctx.response.body = {
			type: true,
			data: typeObject
		}
	}
	//获取试卷大类的名称和type
	static async getSecondType(ctx, next) {
		const { user_id, version, system } = ctx.query;
		const isValid = await checkHeader(ctx.request, user_id);
		if (!isValid) {
			ctx.response.body = {
				type: false,
				data: '登录错误，请重新登录'
			}
			return;
		};

		const paperSqlInfo = await getSql('select distinct type,ctype,secondType from papers');
		let returnObject = {}
		paperSqlInfo.forEach(res => {
			const { ctype, secondType } = res
			returnObject[ctype] = returnObject[ctype] || []
			returnObject[ctype].push(secondType)
		})
		ctx.response.body = {
			type: true,
			data: returnObject
		}
	}

	//获取试卷大类的名称和type
	static async getProvinceBySecondType(ctx, next) {
		const { user_id, version, secondType } = ctx.query;
		const isValid = await checkHeader(ctx.request, user_id);
		if (!isValid) {
			ctx.response.body = {
				type: false,
				data: '登录错误，请重新登录'
			}
			return;
		};

		const paperSqlInfo = await getSql('select distinct province from papers where secondType = '
			+ `"${secondType}"`);
		ctx.response.body = {
			type: true,
			data: paperSqlInfo.map(res => res.province)
		}
	}
	//根据省份获取 title
	static async getTitleByProvince(ctx, next) {
		const { user_id, version, province } = ctx.query;
		const isValid = await checkHeader(ctx.request, user_id);
		if (!isValid) {
			ctx.response.body = {
				type: false,
				data: '登录错误，请重新登录'
			}
			return;
		};

		const paperSqlInfo = await getSql('select distinct title,id from papers where province = '
			+ `"${province}"`);
		ctx.response.body = {
			type: true,
			data: paperSqlInfo.map(res => ({
				...res,
				paper_id: res.id
			}))
		}
	}

	//获取试卷详情
	static async getPaperTypeByType(ctx, next) {
		const { user_id, version, system, type } = ctx.query;
		const isValid = await checkHeader(ctx.request, user_id);
		if (!isValid) {
			ctx.response.body = {
				type: false,
				data: '登录错误，请重新登录'
			}
			return;
		};
		if (!type) {
			ctx.response.body = {
				type: false,
				data: '请输入获取试卷的类型'
			}
			return;
		}
		//获取试卷对象
		const paperNameArray = await getPaperMenuByType(type);

		const typeObject = await getMenuTree(type, paperNameArray);

		ctx.response.body = {
			type: true,
			data: typeObject
		}
	}

	//更新试卷版本
	static async updatePaperVersion(id) {
		const paper = await selectFromSql('papers', {
			id: ` = "${id}"`
		})
		if (!paper) {
			return
		}
		let { version } = paper[0]
		version = `${parseInt(version) + 1}.0`
		await updateToSql('papers', {
			version
		}, {
				id: ` = "${id}"`
			})
	}
}
module.exports = QuestionBank;


async function getOnePaperInfo(paperId) {
	try {
		const paperInfo = await selectFromSql('papers', {
			"id": ` = "${paperId}"`
		})
		if (paperInfo && paperInfo[0]) {
			return paperInfo
		} else {
			return []
		}
	} catch (e) {
		return {}
	}

}

async function getArrayPaperInfo(paperId) {
	try {
		const paperInfo = await selectFromSql('papers')
		const returnInfo = paperInfo.filter(oneInfo => {
			return paperId.indexOf(oneInfo['id']) >= 0
		})
		return returnInfo
	} catch (e) {
		return []
	}

}

async function checkBuy({ user_id, paperId }) {
	let userRows = await selectFromSql('user', {
		user_id: ` = "${user_id}"`
	})
	let user = userRows[0];
	console.log(9)
	let dataInfo = user['data_info'] ? JSON.parse(user['data_info']) : {}
	let { buyedInfo } = dataInfo
	buyedInfo = buyedInfo || []
	//获取免费的试卷id
	let freeRows = await selectFromSql('papers', {
		price: ` = "0.00"`
	})
	freeIdArray = freeRows.map(row => row.id)

	if (buyedInfo.indexOf(paperId) < 0 && freeIdArray.indexOf(paperId) < 0) {
		sendMail('kefu@shuatiapp.cn', `用户 ${user_id} 夸权限购买`, `购买内容为 paperId = ${paperId},他已经购买的项目有${buyedInfo.join()}`)
	}
}

async function getMenuTree(type, paperNameArray) {
	let typeObject
	switch (type) {
		case "servant":
			typeObject = await transObjToProvice(paperNameArray)
			break;
		case "driver":
			typeObject = await transObjToDriver(paperNameArray)
			break;
		default:
			typeObject = await transObjToProvice(paperNameArray)
			break;
	}
	return typeObject
}