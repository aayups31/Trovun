from pathlib import Path
import secrets, tempfile, os
root=Path(tempfile.mkdtemp(prefix='trovun-mail-'))
key=secrets.token_hex(32)
values={line.split('=',1)[0]:line.split('=',1)[1].strip().strip('"').strip("'") for line in Path('.env.local').read_text().splitlines() if '=' in line and not line.startswith('#')}
url=values['NEXT_PUBLIC_SUPABASE_URL']
(root/'worker.env').write_text('MESSAGE_EMAIL_CRON_SECRET='+key+'\nMESSAGE_EMAIL_SITE_URL=https://www.myunimarket.com\n')
(root/'scheduler.sql').write_text("""begin;
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
do $setup$ declare existing uuid; begin
select id into existing from vault.secrets where name='trovun_message_email_cron_secret';
if existing is null then perform vault.create_secret('"""+key+"""','trovun_message_email_cron_secret');
else perform vault.update_secret(existing,'"""+key+"""'); end if;
end $setup$;
select cron.schedule('trovun-message-emails', '* * * * *', $job$
select net.http_post(
  url := '"""+url+"""/functions/v1/message-emails',
  headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='trovun_message_email_cron_secret')),
  body := '{}'::jsonb,
  timeout_milliseconds := 120000
);
$job$);
commit;
""")
for p in root.iterdir(): os.chmod(p,0o600)
Path('/tmp/trovun-mail-setup-path').write_text(str(root))
os.chmod('/tmp/trovun-mail-setup-path',0o600)
print('Prepared private scheduler configuration.')
