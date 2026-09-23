import service from "./jobOpeningAlertService";
import { startJobOpeningAlertScheduler as start } from "./jobOpeningAlerts.cjs";

function startJobOpeningAlertScheduler() {
  var handle = start({
    runDigest: function() {
      return service.runDigest({ source: "scheduler" });
    },
  });
  if (handle.started) {
    console.log("[jobOpeningAlerts] scheduler armed for Tuesday 21:00 Asia/Manila (PM2 instance 0, 15-minute tick, catch-up until Wednesday 03:00)");
  } else {
    console.log("[jobOpeningAlerts] scheduler not armed on this process");
  }
  return handle;
}

export { startJobOpeningAlertScheduler };
