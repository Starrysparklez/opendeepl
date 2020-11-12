/*
MIT License

Copyright (c) 2020 The-Naomi-Developers

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

const puppeteer = require('puppeteer');
const http = require('http');
const url = require('url');

const PORT = process.env.PORT || 5000;
const COOLDOWN = process.env.COOLDOWN || 1500;

const WAIT_BEFORE_FETCHING = 500;

var busy = [];


class OpenDeepL {
  constructor() {
    this.start();
  }

  async start() {
    this.browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1366, height: 768 }
    });
  }

  async fetchTranslation(from, to, content) {
    if (content.length > 4900) return;

    var page = await this.browser.newPage();
    await page.goto(`https://www.deepl.com/translator#${from}/${to}/${content}`, {waitUntil: 'networkidle0'});

    let getValueAfterTimeout = () => new Promise(function (res, rej) {
      setTimeout(async () => {
        try {
          const element = await page.$('.lmt__target_textarea');
          const text = await page.evaluate(element => element.value, element);
          res(text);
        } catch(err) {
          rej(err);
        }
      }, WAIT_BEFORE_FETCHING);
    });
    const result = await getValueAfterTimeout();
    await page.close();
    return result;
  }
}


async function main() {
  const translator = new OpenDeepL();

  http.createServer((req, res) => {
    var args = url.parse(req.url, true).query || null;
    console.log(`[INFO] Got request from ${req.connection.remoteAddress}`)

    if (!translator.browser) {
      let msg = {
        "msg": "ERR",
        "content": "Chromium is starting up. Please, make your request later. Also don't forget to buy access to DeepL API in the future!"
      };
      res.writeHead(403, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      });
      res.write(JSON.stringify(msg));
      res.end(null);
      return;
    } else if (!args.from || !args.to || !args.content) {
      let msg = {
        "msg": "ERR",
        "content": "Provide 'from', 'to' and 'content' args"
      };
      res.writeHead(404, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      });
      res.write(JSON.stringify(msg));
      res.end(null);
      return;
    } else {
      if (busy.includes(req.connection.remoteAddress)) {
        let msg = {
          "msg": "ERR",
          "content": "You are on cooldown. Please, be patient."
        };
        res.writeHead(403, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        });
        res.write(JSON.stringify(msg));
        res.end(null);
        return;
      } else {
        busy.push(req.connection.remoteAddress);
      }
      translator.fetchTranslation(args.from, args.to, args.content).then(result => {
        result = result || 'Something went wrong.';

        let msg = {
          "msg": "OK",
          "content": result,
          "additional": "Don't forget to buy access to DeepL API in the future!"
        }
        res.writeHead(200, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        })
        res.write(JSON.stringify(msg));
        res.end(null);
        setTimeout(() => busy.splice(busy.indexOf(req.connection.remoteAddress), 1), COOLDOWN);
      }).catch(err => {
        let msg = {"msg": "ERR", "content": `${err}`};
        res.writeHead(500, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        });
        res.write(JSON.stringify(msg));
        res.end(null);
        setTimeout(() => busy.splice(busy.indexOf(req.connection.remoteAddress), 1), COOLDOWN);
      });
    }
  }).listen(PORT);
}
main();
console.log(`[OK] Listening on the port ${PORT}`);
