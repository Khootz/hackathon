package expo.modules.usagestats

import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Process
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.Calendar

class UsageStatsModule : Module() {

    private val ctx: Context
        get() = appContext.reactContext ?: throw Exception("React context unavailable")

    override fun definition() = ModuleDefinition {

        Name("UsageStats")

        // ── Permission helpers ──────────────────────────────────────────

        Function("isUsageAccessGranted") {
            val appOps = ctx.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
            val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                appOps.unsafeCheckOpNoThrow(
                    AppOpsManager.OPSTR_GET_USAGE_STATS,
                    Process.myUid(),
                    ctx.packageName
                )
            } else {
                @Suppress("DEPRECATION")
                appOps.checkOpNoThrow(
                    AppOpsManager.OPSTR_GET_USAGE_STATS,
                    Process.myUid(),
                    ctx.packageName
                )
            }
            mode == AppOpsManager.MODE_ALLOWED
        }

        Function("requestUsageAccess") {
            val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            ctx.startActivity(intent)
        }

        Function("canDrawOverlays") {
            Settings.canDrawOverlays(ctx)
        }

        Function("requestOverlayPermission") {
            val intent = Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:${ctx.packageName}")
            )
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            ctx.startActivity(intent)
        }

        // ── Installed apps ──────────────────────────────────────────────

        AsyncFunction("getInstalledApps") {
            val pm = ctx.packageManager
            pm.getInstalledApplications(PackageManager.GET_META_DATA)
                .filter { app ->
                    pm.getLaunchIntentForPackage(app.packageName) != null &&
                    (app.flags and ApplicationInfo.FLAG_SYSTEM) == 0
                }
                .map { app ->
                    mapOf(
                        "packageName" to app.packageName,
                        "appName" to pm.getApplicationLabel(app).toString()
                    )
                }
                .sortedBy { (it["appName"] as String).lowercase() }
        }

        // ── Usage stats ─────────────────────────────────────────────────

        AsyncFunction("getTodayUsage") {
            val startOfDay = Calendar.getInstance().apply {
                set(Calendar.HOUR_OF_DAY, 0)
                set(Calendar.MINUTE, 0)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
            }.timeInMillis

            val usm = ctx.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
            val stats = usm.queryUsageStats(
                UsageStatsManager.INTERVAL_DAILY,
                startOfDay,
                System.currentTimeMillis()
            )

            val pm = ctx.packageManager
            stats
                .filter { it.totalTimeInForeground > 60_000 } // > 1 min
                .map { stat ->
                    val appName = try {
                        pm.getApplicationLabel(
                            pm.getApplicationInfo(stat.packageName, 0)
                        ).toString()
                    } catch (_: Exception) { stat.packageName }

                    mapOf(
                        "packageName" to stat.packageName,
                        "appName" to appName,
                        "totalMinutes" to (stat.totalTimeInForeground / 60_000.0),
                        "lastTimeUsed" to stat.lastTimeUsed
                    )
                }
                .sortedByDescending { it["totalMinutes"] as Double }
        }

        AsyncFunction("getUsageStats") { startTime: Long, endTime: Long ->
            val usm = ctx.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
            val stats = usm.queryUsageStats(UsageStatsManager.INTERVAL_BEST, startTime, endTime)
            val pm = ctx.packageManager

            stats
                .filter { it.totalTimeInForeground > 0 }
                .map { stat ->
                    val appName = try {
                        pm.getApplicationLabel(
                            pm.getApplicationInfo(stat.packageName, 0)
                        ).toString()
                    } catch (_: Exception) { stat.packageName }

                    mapOf(
                        "packageName" to stat.packageName,
                        "appName" to appName,
                        "totalTimeInForeground" to stat.totalTimeInForeground,
                        "lastTimeUsed" to stat.lastTimeUsed
                    )
                }
                .sortedByDescending { it["totalTimeInForeground"] as Long }
        }

        // ── Current foreground app ─────────────────────────────────────

        AsyncFunction("getForegroundApp") {
            val usm = ctx.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
            val now = System.currentTimeMillis()
            val events = usm.queryEvents(now - 60_000, now)
            var fgPackage: String? = null
            val event = UsageEvents.Event()

            while (events.hasNextEvent()) {
                events.getNextEvent(event)
                if (event.eventType == UsageEvents.Event.MOVE_TO_FOREGROUND) {
                    fgPackage = event.packageName
                }
            }

            if (fgPackage != null) {
                val pm = ctx.packageManager
                val appName = try {
                    pm.getApplicationLabel(pm.getApplicationInfo(fgPackage, 0)).toString()
                } catch (_: Exception) { fgPackage }

                mapOf("packageName" to fgPackage, "appName" to appName)
            } else {
                null
            }
        }

        // ── App lock service control ────────────────────────────────────

        Function("startLockService") { lockedPackagesJson: String ->
            val intent = Intent(ctx, AppLockService::class.java).apply {
                action = AppLockService.ACTION_START
                putExtra(AppLockService.EXTRA_LOCKED_PACKAGES, lockedPackagesJson)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ctx.startForegroundService(intent)
            } else {
                ctx.startService(intent)
            }
        }

        Function("updateLockedApps") { lockedPackagesJson: String ->
            val intent = Intent(ctx, AppLockService::class.java).apply {
                action = AppLockService.ACTION_UPDATE
                putExtra(AppLockService.EXTRA_LOCKED_PACKAGES, lockedPackagesJson)
            }
            ctx.startService(intent)
        }

        Function("stopLockService") {
            val intent = Intent(ctx, AppLockService::class.java).apply {
                action = AppLockService.ACTION_STOP
            }
            ctx.startService(intent)
        }
    }
}
