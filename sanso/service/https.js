var https = require('https');

var qs = require('querystring');

module.exports = {
    get: function (url, query) {
        return new Promise((resolve, reject) => {
            var content = qs.stringify(query);
            https.get(`${url}?${content}`, function (res) {
                var json = '';
                res.on('data', function (d) {
                    json += d;
                });
                res.on('end', function () {
                    //获取到的数据
                    json = JSON.parse(json);
                    resolve(json)
                });
            }).on('error', function (e) {
                console.error(e);
            });
        })
    }
}