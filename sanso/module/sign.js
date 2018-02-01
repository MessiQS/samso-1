const crypto = require('crypto');
const {
	codeObj
} = require('./global');
//链接数据库的类
const {
	sqlFormat
} = require('../service/connect');
const {
	selectFromSql,
	insertToSql,
	updateToSql,
	getLengthOfTable
} = new sqlFormat();
const addLog = require('../serverlog').addLog;
const sendCode = require('../service/sendCode')

class Sign {
	//登录
	static async login(ctx, next) {
		const { account, password } = ctx.request.body;
		let row = await selectFromSql('user', {
			'account': `="${account}"`
		});
		if (!row || !Array.isArray(row) || row.length === 0) {
			ctx.response.body = {
				'type': false,
				'data': '账号不存在'
			};
		} else {
			if (row[0]['password'] !== password) {
				ctx.response.body = {
					'type': false,
					'data': '您输入的密码不正确'
				};
			} else {
				let uid = getUid();
				let updatesql = await updateToSql('user', {
					token: uid
				}, {
						"account": ` = "${account} "`
					});
				if (updatesql) {
					let userInfo,
						user_id = row[0].user_id;
					userInfo = row[0].data_info ? JSON.parse(row[0].data_info) : {};
					ctx.response.body = {
						'type': true,
						'data': {
							'token': uid,
							user_id,
							userInfo
						}
					};
				} else {
					ctx.response.body = {
						'type': false,
						'data': '登录失败请重试'
					};
				}
			}
		}
	};
	static async freeRegistration(ctx, next) {
		const { account, password } = ctx.request.body;
		if (account === "test" && password === "2e4f579dd048d15395eb7d2d3d5b9833") {
			let row = await selectFromSql('user', {
				'account': `="test"`
			});
			ctx.response.body = {
				type: true,
				data: row[0]
			}
		} else {
			ctx.response.body = {
				type: false,
				data: null
			}
		}
	}
	//注册
	static async signin(ctx, next) {
		let data;
		const { account, password, vericode } = ctx.request.body
		//检测是否已经注册
		const selectAccount = await selectFromSql('user', {
			"account": `="${account}"`
		});
		if (selectAccount && Array.isArray(selectAccount) && selectAccount[0]) {
			ctx.response.body = {
				"type": false,
				"data": '此账号已经注册',
			};
			return;
		};
		//检测验证码
		if (codeObj[account] !== vericode) {
			ctx.response.body = {
				"type": false,
				"data": '验证码错误，请重试',
			};
			return;
		}
		let user_id = await setNewUserId();
		data = {
			name: account,
			account: account,
			password: password, //MD5加密密码
			user_id,
		};
		await insertToSql('user', data);
		ctx.response.body = {
			"type": true,
			"data": '注册成功',
		};
	};
	//验证码
	static async getCode(ctx, next) {
		const { account, isRegistered } = ctx.request.body,
			/**
			 * 
			 * {
			 * @param account 账号
			 * @param isRegistered 代表已注册也允许发，默认为不允许
			 * }
			 */
			phoneNumberReg = new RegExp(/^1(3|4|5|7|8)\d{9}$/);
		if (!account) {
			ctx.response.body = {
				type: false,
				data: '请输入手机号'
			};
			return;
		} else if (!phoneNumberReg.test(account)) {
			ctx.response.body = {
				type: false,
				data: '请输入正确的手机号'
			};
			return;
		};
		//检测是否已经注册
		const selectAccount = await selectFromSql('user', {
			"account": `="${account}"`
		});
		if (selectAccount && selectAccount[0] && !isRegistered) {
			ctx.response.body = {
				type: false,
				data: '账号已注册，请选择登录或忘记密码'
			};
			return;
		}

		let code = Array(4).fill(1).map(res => parseInt(Math.random() * 10, 10)).join('');
		codeObj[account] = code;
		const codeResponse = await sendCode({
			code,
			account
		})
		if (codeResponse.errmsg === "OK") {
			ctx.response.body = {
				type: true,
				data: code
			};
		} else {
			ctx.response.body = {
				type: false,
				data: codeResponse.errmsg
			};
		}

		setTimeout(() => {
			if (codeObj[account] === code) {
				delete codeObj[account];
			};
		}, 5 * 60 * 1000)
	}
	//忘记密码，修改密码
	static async updatePassword(ctx, next) {
		let data;
		const { account, oldPassword, password } = ctx.request.body //账号，一般为电话号码,
		//检测是否已经注册
		const selectAccount = await selectFromSql('user', {
			"account": `="${account}"`
		});
		if (!selectAccount || !Array.isArray(selectAccount) || !selectAccount[0]) {
			ctx.response.body = {
				"type": false,
				"data": '此账号未注册',
			};
			return;
		};
		//检测验证码
		if (oldPassword && selectAccount[0].password !== oldPassword) {
			ctx.response.body = {
				"type": false,
				"data": '原密码不正确',
			};
			return;
		}
		data = {
			account: account,
			password: password,
		};
		await updateToSql('user', data, {
			"account": `="${account}"`
		}).catch(res => {
			ctx.response.body = {
				"type": false,
				"data": '发生错误，请重试',
			};
		});
		ctx.response.body = {
			"type": true,
			"data": '修改密码成功',
		};
	}
	//审核验证码
	static async checkCode(ctx, next) {
		const account = ctx.request.body.account || '', //账号，一般为电话号码
			vericode = ctx.request.body.vericode || ''; //验证码
		//检测验证码
		if (codeObj[account] !== vericode) {
			ctx.response.body = {
				"type": false,
				"data": '验证码不正确',
			};
			return;
		} else {
			ctx.response.body = {
				"type": true,
				"data": '验证码正确',
			};
		}
	}
	//进入时检测token
	static async checkToken(ctx, next) {
		const account = ctx.request.body.account || '', //账号，一般为电话号码
			accountToken = ctx.request.body.accountToken || ''; //验证码
		//检测是否已经注册
		const selectAccount = await selectFromSql('user', {
			"account": `="${account}"`
		});
		if (!selectAccount || !Array.isArray(selectAccount) || !selectAccount[0]) {
			ctx.response.body = {
				"type": false,
				"data": '此账号未注册',
			};
			return;
		};
		if (selectAccount[0].token === accountToken) {
			let userInfo;
			if (selectAccount[0].data_info) {
				userInfo = JSON.parse(selectAccount[0].data_info);
			}
			ctx.response.body = {
				"type": true,
				"data": '验证成功',
				userInfo
			};
		} else {
			ctx.response.body = {
				"type": false,
				"data": '验证失败',
			};
		}
	}
	//改手机号时候用于验证账号密码的
	static async checkPassword(ctx, next) {
		const account = ctx.request.body.account || '', //账号，一般为电话号码
			password = ctx.request.body.password || ''; //密码
		//检测是否已经注册
		const selectAccount = await selectFromSql('user', {
			"account": `="${account}"`
		});
		if (selectAccount[0].password === password) {
			ctx.response.body = {
				"type": true,
				"data": "验证成功"
			}
		} else {
			ctx.response.body = {
				"type": false,
				"data": "验证失败"
			}
		}
	}
	//更改手机号
	static async updatePhone(ctx, next) {
		const account = ctx.request.body.account || '', //要变更的账号
			oldAccount = ctx.request.body.oldAccount || ''; //原密码
		//检测是否已经注册
		const selectAccount = await selectFromSql('user', {
			"account": `="${oldAccount}"`
		});
		if (!selectAccount && !Array.isArray(selectAccount) && !selectAccount[0]) {
			ctx.response.body = {
				"type": false,
				"data": "此账号未注册",
			};
			return;
		};
		const isSuccess = await updateToSql('user', {
			"account": account,
		}, {
				"account": ` = ${oldAccount}`
			});
		if (isSuccess) {
			ctx.response.body = {
				"type": true,
				"data": "账号变更成功",
			};
		} else {
			ctx.response.body = {
				"type": false,
				"data": "账号变更失败",
			};
		}
	}
}

function getUid() {
	function S4() {
		return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
	}
	return (S4() + S4() + S4() + S4() + S4() + S4() + S4() + S4());
}
module.exports = Sign

async function setNewUserId() {
	let length = await getLengthOfTable('user');
	length = length[0]['count(*)']
	let zero = '0',
		useridArr = (zero.repeat(8) + length).split('');
	while (useridArr.length > 8) {
		useridArr.shift()
		console.log(useridArr)
	}
	return `SS${useridArr.join('')}`
}