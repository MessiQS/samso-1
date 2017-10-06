const http = require('http');
const https = require('https');
const qs = require('querystring');
const request = require('request');
const querystring = require('querystring');
const parseString = require('xml2js').parseString;

module.exports = {
		POST: POST,
		GET: GET,
		wechatPost: wechatPost
	}
	//微信支付
function wechatPost(url, params, callback) {
	const postData = parseObjectToXML(params, 'xml');
	request({
		url:url,
		method:"POST",
		body:postData
	},function(error, response, body){
		if(response.body){
			let res = response.toJSON();
			parseString(res.body,(errors,result) => {
				if(null !== errors ){  
					console.log(errors)
					return;
				};
				callback(result.xml)
			})
		}else{
			console.log(error)
		}
	})
}

function POST(urlObj, params, callback) {
	const postData = querystring.stringify(params);
	var post_options = {
		host: urlObj.host,
		port: urlObj.port || "80",
		path: urlObj.path,
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Content-Length': Buffer.byteLength(postData)
		}
	};
	var post_req = http.request(post_options, function(response) {
		var responseText = [];
		var size = 0;
		response.on('data', function(data) {
			responseText.push(data);
			size += data.length;
		});
		response.setEncoding('utf8');
		response.on('end', function() {
			// Buffer 是node.js 自带的库，直接使用
			console.log(responseText, size)
				// responseText = Buffer.concat(responseText,size);
				// callback(responseText);
		});
	});
	post_req.write(postData);
	post_req.end();
}

function GET(urlObj, params, callback) {

}

function parseObjectToXML(obj, rootname) {
	if (typeof rootname === "undefined" || !isNaN(Number(rootname))) {
		rootname = "Object";
	}
	var xml = "<" + rootname + ">";
	if (obj) {
		for (var field in obj) {
			var value = obj[field];
			if (typeof value !== "undefined") {
				if (Array.isArray(value)) {
					xml += parseArrayToXML(value, field);
				} else if (typeof value === "object") {
					xml += _self.parseToXML(value, field);
				} else {
					xml += parseGeneralTypeToXML(value, field);
				}
			}
		}
	}
	xml += "</" + rootname + ">";
	return xml;

	function parseGeneralTypeToXML(value, rootname) {
		if (typeof rootname === "undefined" || !isNaN(Number(rootname))) {
			rootname = typeof value;
		}
		var xml = "<" + rootname + ">" + value + "</" + rootname + ">";
		return xml;
	}
}