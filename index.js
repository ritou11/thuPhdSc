const _ = require('lodash');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const readlineSync = require('readline-sync');
const axiosCookieJarSupport = require('axios-cookiejar-support').default;
const { CookieJar } = require('tough-cookie');

const info = (i) => console.info(i);

const jar = new CookieJar();
const ax = axios.create({
  baseURL: 'http://zhjwxk.cic.tsinghua.edu.cn/',
  timeout: 1000,
  withCredentials: true,
  jar,
});
axiosCookieJarSupport(ax);

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
  ax.post();
};

main();
