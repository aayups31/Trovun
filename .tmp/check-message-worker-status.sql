select jobname, schedule, active from cron.job where jobname = 'trovun-message-emails';
select status_code, timed_out, error_msg, left(content, 500) as response, created
from net._http_response order by created desc limit 5;
select state, count(*) from public.message_email_jobs group by state;
