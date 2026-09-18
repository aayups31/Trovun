import { readFileSync } from 'node:fs';
const dir = readFileSync('/tmp/trovun-mail-setup-path','utf8').trim();
const config = Object.fromEntries(readFileSync(`${dir}/worker.env`,'utf8').trim().split('\n').map(line=>{const i=line.indexOf('=');return [line.slice(0,i),line.slice(i+1)];}));
const env = Object.fromEntries(readFileSync('.env.local','utf8').split('\n').filter(line=>line.includes('=')).map(line=>{const i=line.indexOf('=');return [line.slice(0,i),line.slice(i+1).replace(/^['"]|['"]$/g,'')];}));
const url = `${env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/message-emails`;
for (const authorized of [false,true]) {
 const response=await fetch(url,{method:'POST',headers:authorized?{Authorization:`Bearer ${config.MESSAGE_EMAIL_CRON_SECRET}`}:{}});
 console.log(JSON.stringify({authorized,status:response.status,result:await response.json()}));
}
