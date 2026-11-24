import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as webpush from "jsr:@negrel/webpush@0.5.0";

interface DueReminder {
  reminder_user_id: string;
  push_subscription: webpush.PushSubscription;
}

function isTrustedPushEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    const host = url.hostname.toLowerCase();
    return url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      (host === "fcm.googleapis.com" ||
        host === "push.services.mozilla.com" ||
        host.endsWith(".push.services.mozilla.com") ||
        host === "web.push.apple.com" ||
        host.endsWith(".notify.windows.com"));
  } catch {
    return false;
  }
}

Deno.serve(async request => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const exportedVapidKeys = Deno.env.get("VAPID_KEYS");
  if (!supabaseUrl || !serviceRoleKey || !exportedVapidKeys) {
    console.error("Required reminder function secrets are missing.");
    return Response.json({ error: "Reminder service is not configured." }, { status: 500 });
  }
  if (request.headers.get("apikey") !== serviceRoleKey) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const vapidKeys = await webpush.importVapidKeys(JSON.parse(exportedVapidKeys), {
      extractable: false
    });
    const applicationServer = await webpush.ApplicationServer.new({
      contactInformation: "mailto:v949265289@gmail.com",
      vapidKeys
    });
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data, error } = await supabase.rpc("claim_due_reading_reminders");
    if (error) throw error;

    let sent = 0;
    let expired = 0;
    let failed = 0;
    for (const reminder of (data || []) as DueReminder[]) {
      if (!isTrustedPushEndpoint(reminder.push_subscription.endpoint)) {
        console.error(`Ignoring an untrusted push endpoint for user ${reminder.reminder_user_id}.`);
        const { error: deleteError } = await supabase
          .from("reading_reminders")
          .delete()
          .eq("user_id", reminder.reminder_user_id);
        if (deleteError) throw deleteError;
        failed += 1;
        continue;
      }

      try {
        await applicationServer
          .subscribe(reminder.push_subscription)
          .pushTextMessage(JSON.stringify({
            title: "Time for Bible reading",
            body: "It's time for your daily Bible reading. Open Bible Highlight to read."
          }), { ttl: 3600 });
      } catch (error) {
        if (error instanceof webpush.PushMessageError && error.isGone()) {
          const { error: deleteError } = await supabase
            .from("reading_reminders")
            .delete()
            .eq("user_id", reminder.reminder_user_id);
          if (deleteError) throw deleteError;
          expired += 1;
        } else {
          console.error(`Could not send reminder to user ${reminder.reminder_user_id}:`, error);
          const { error: releaseError } = await supabase.rpc("release_reading_reminder_claim", {
            target_user_id: reminder.reminder_user_id
          });
          if (releaseError) throw releaseError;
          failed += 1;
        }
        continue;
      }

      const { error: completionError } = await supabase.rpc("complete_reading_reminder", {
        target_user_id: reminder.reminder_user_id
      });
      if (completionError) throw completionError;
      sent += 1;
    }

    return Response.json({ sent, expired, failed });
  } catch (error) {
    console.error("Reading reminder delivery failed:", error);
    return Response.json({ error: "Reminder delivery failed." }, { status: 500 });
  }
});
