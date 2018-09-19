const _ = require('lodash');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const readlineSync = require('readline-sync');
const axiosCookieJarSupport = require('axios-cookiejar-support').default;
const { CookieJar } = require('tough-cookie');
const querystring = require('querystring');
const iconv = require('iconv-lite');
const cheerio = require('cheerio');

const { username, password } = require('./secret.json');

const SEMESTER = '2018-2019-1';
const TARGET_KCH = '60240103';
const TARGET_KXH = '0';

const info = (i) => console.info(i);

const jar = new CookieJar();
const ax = axios.create({
  baseURL: 'https://zhjwxk.cic.tsinghua.edu.cn/',
  withCredentials: true,
  jar,
  headers: {
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  },
});
axiosCookieJarSupport(ax);

const parseXwk = (xwkData) => {
  const $ = cheerio.load(xwkData);
  const xwkTotal = $('.trr2').length;
  const dict = ['课程号', '课序号', '课程名', '课余量', '上课时间', '课容量', '学分', '任课教师', '说明'];
  const res = [];

  for (let i = 1; i <= xwkTotal; i += 1) {
    const trRes = {};
    $(`#tr_${i}`).children().each((j, el) => {
      if (j !== 0) trRes[dict[j - 1]] = $(el).text().trim();
    });
    res.push(trRes);
  }
  return res;
};

const parseXkMsg = (resData) => {
  const reg = /showMsg\("(.*?)"\)/gi;
  const resM = reg.exec(resData);
  if (resM.length >= 2) return resM[1];
  return '';
};

const main = async () => {
  info('Getting front page...');
  await ax.get('xklogin.do');
  info('Getting verification image...');
  const cahres = await ax.get('login-jcaptcah.jpg', {
    params: {
      captchaflag: 'login1',
    },
    responseType: 'arraybuffer',
  });
  info('Writing verification image...');
  fs.writeFileSync('login-jcaptcah.jpg', cahres.data);
  const code = readlineSync.question('Input the verification code: ').trim().toUpperCase();
  info('Login...');
  await ax.post('j_acegi_formlogin_xsxk.do', querystring.stringify({
    j_username: username,
    j_password: password,
    captchaflag: 'login1',
    _login_image_: code,
  }), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Referer: 'http://zhjwxk.cic.tsinghua.edu.cn/xklogin.do',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.106 Safari/537.36',
    },
  });
  // info(r);
  const xwkData = iconv.decode(
    (await ax.get('xkYjs.vxkYjsXkbBs.do', {
      params: {
        m: 'xwkSearch',
        p_xnxq: SEMESTER,
        tokenPriFlag: 'xwk',
      },
      headers: {
        Referer: 'http://zhjwxk.cic.tsinghua.edu.cn/xklogin.do',
      },
      responseType: 'arraybuffer',
    })).data, 'gb2312',
  );
  fs.writeFileSync('xwk.html', xwkData);

  const $ = cheerio.load(xwkData);
  const token = $('input[name="token"]').val();
  const resData = iconv.decode((await ax.post('xkYjs.vxkYjsXkbBs.do',
    querystring.stringify({
      m: 'saveXwKc',
      token,
      p_xnxq: SEMESTER,
      tokenPriFlag: 'xwk',
      p_xwk_id: `${SEMESTER};${TARGET_KCH};${TARGET_KXH}`,
    }), {
      responseType: 'arraybuffer',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Referer: 'http://zhjwxk.cic.tsinghua.edu.cn/xklogin.do',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.106 Safari/537.36',
      },
    })).data, 'gb2312');
  fs.writeFileSync('res.html', resData);

  const resMsg = parseXkMsg(resData);
  info(resMsg);
};

main();

// const s = fs.readFileSync('xwk.html');
// parseXwk(s);
