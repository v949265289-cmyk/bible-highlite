# Supabase owner panel and reminders setup

The owner panel and daily background reminders need a Supabase project. Until it is configured, the app keeps its existing local-only behavior and shows setup guidance.

1. Create a Supabase project and run [`setup.sql`](./setup.sql) in its SQL Editor.
2. In Authentication → Providers, enable **Google** sign-in and configure a Google OAuth client. The owner account must use `v949265289@gmail.com`. In Authentication → URL Configuration, add the deployed site URL and local testing URL to Redirect URLs. Enable **Anonymous Sign-Ins** for reminders; the app uses a separate anonymous session and does not ask users for personal information.
3. Enable Realtime for the project. The app uses an anonymous public presence channel to count open browser sessions; it does not send names or email addresses for this count.
4. In Project Settings → API, copy the Project URL and the public anon/publishable key into `supabase-config.js`:

   ```js
   window.BIBLE_SUPABASE_CONFIG = {
     url: "https://YOUR-PROJECT.supabase.co",
     anonKey: "YOUR-PUBLIC-ANON-OR-PUBLISHABLE-KEY"
   };
   ```

5. In Authentication URL configuration, add your deployed site URL to the allowed redirect URLs. For local testing, add the local HTTP URL you use to serve the app.
6. To deploy the reminder function, install the Supabase CLI, link the project, and deploy it with JWT verification disabled. The function separately checks the server-only API key sent by the scheduled job:

   ```text
   supabase link --project-ref YOUR_PROJECT_REF
   supabase functions deploy send-reading-reminders --no-verify-jwt
   ```

7. Generate a VAPID key pair with Deno:

   ```text
   deno run -A https://raw.githubusercontent.com/negrel/webpush/master/cmd/generate-vapid-keys.ts
   ```

   Save the JSON key pair printed by the command as the `VAPID_KEYS` secret in Supabase **Project Settings → Edge Functions → Secrets**. Copy only the separate `application server key` printed by the command into `vapidPublicKey` in `site-config.js`. The private JWK must stay in the Supabase secret and must never be added to the website files.

8. Schedule the function once per minute. In the Supabase SQL Editor, enable the `pg_cron` and `pg_net` extensions if needed:

   ```sql
   create extension if not exists pg_cron;
   create extension if not exists pg_net;
   ```

   Then save the project URL and service-role key in Supabase Vault:

   ```sql
   select vault.create_secret('https://YOUR-PROJECT.supabase.co', 'bible_reminder_project_url');
   select vault.create_secret('YOUR_SERVICE_ROLE_KEY', 'bible_reminder_service_role_key');
   ```

   Then create the recurring job:

   ```sql
   select cron.schedule(
     'send-reading-reminders-every-minute',
     '* * * * *',
     $$
     select net.http_post(
       url := (select decrypted_secret from vault.decrypted_secrets where name = 'bible_reminder_project_url')
         || '/functions/v1/send-reading-reminders',
       headers := jsonb_build_object(
         'Content-Type', 'application/json',
         'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'bible_reminder_service_role_key')
       ),
       body := '{}'::jsonb
     );
     $$
   );
   ```

   Keep the service-role key in Vault only. Do not put it in `supabase-config.js`, `site-config.js`, or any other public website file. The job checks each reminder in its local timezone, retries transient delivery failures, and sends at most once per local day. If you need to create the job again, remove the existing job with `select cron.unschedule(jobid) from cron.job where jobname = 'send-reading-reminders-every-minute';` first.

9. Deploy the site over HTTPS. In Reading Settings, choose a time and select **Enable reminder**, then allow notifications when prompted. The reminder runs in the device's local timezone and is stored against an anonymous account on that browser. Turn it off from the same browser using **Turn off**. Notification sound is controlled by the device and browser; this site cannot force sound when closed.
10. Open Owner panel and sign in with Google using `v949265289@gmail.com`; only that authenticated email can see the owner tools or publish updates.

Never put a Supabase service-role or secret key in this app, and never put the owner password in a file. The app sends the password directly to Supabase Auth and does not save it. The public key is safe to expose because the SQL policies restrict publishing, editing, and deleting to the confirmed owner email. The online count is live and reflects connected browser sessions, not unique people.
