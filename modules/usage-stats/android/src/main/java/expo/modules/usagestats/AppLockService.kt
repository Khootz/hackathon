package expo.modules.usagestats

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.provider.Settings
import android.util.TypedValue
import android.view.Gravity
import android.view.WindowManager
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import org.json.JSONArray

class AppLockService : Service() {

    companion object {
        const val ACTION_START = "ACTION_START"
        const val ACTION_STOP = "ACTION_STOP"
        const val ACTION_UPDATE = "ACTION_UPDATE"
        const val EXTRA_LOCKED_PACKAGES = "locked_packages"
        private const val CHANNEL_ID = "auramax_lock_service"
        private const val NOTIFICATION_ID = 9001
        private const val POLL_INTERVAL_MS = 3000L
    }

    private val handler = Handler(Looper.getMainLooper())
    private var lockedPackages = mutableSetOf<String>()
    private var overlayView: FrameLayout? = null
    private var isOverlayShowing = false

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> {
                parseLockedPackages(intent)
                startForeground(NOTIFICATION_ID, buildNotification())
                startPolling()
            }
            ACTION_UPDATE -> {
                parseLockedPackages(intent)
            }
            ACTION_STOP -> {
                hideOverlay()
                handler.removeCallbacksAndMessages(null)
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf()
            }
        }
        return START_STICKY
    }

    override fun onDestroy() {
        hideOverlay()
        handler.removeCallbacksAndMessages(null)
        super.onDestroy()
    }

    // ── Polling loop ────────────────────────────────────────────────────

    private fun startPolling() {
        handler.removeCallbacksAndMessages(null)
        handler.post(object : Runnable {
            override fun run() {
                checkForegroundApp()
                handler.postDelayed(this, POLL_INTERVAL_MS)
            }
        })
    }

    private fun checkForegroundApp() {
        val fgPackage = getCurrentForegroundPackage() ?: return

        // Don't block ourselves
        if (fgPackage == packageName) {
            if (isOverlayShowing) hideOverlay()
            return
        }

        if (lockedPackages.contains(fgPackage)) {
            if (!isOverlayShowing) showOverlay(fgPackage)
        } else {
            if (isOverlayShowing) hideOverlay()
        }
    }

    private fun getCurrentForegroundPackage(): String? {
        val usm = getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        val now = System.currentTimeMillis()
        val events = usm.queryEvents(now - 10_000, now)
        var fg: String? = null
        val event = UsageEvents.Event()
        while (events.hasNextEvent()) {
            events.getNextEvent(event)
            if (event.eventType == UsageEvents.Event.MOVE_TO_FOREGROUND) {
                fg = event.packageName
            }
        }
        return fg
    }

    // ── Overlay (lock screen) ───────────────────────────────────────────

    private fun showOverlay(blockedPackage: String) {
        if (!Settings.canDrawOverlays(this)) return

        val wm = getSystemService(Context.WINDOW_SERVICE) as WindowManager

        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT
        )
        params.gravity = Gravity.CENTER

        // Build the overlay UI programmatically
        val container = FrameLayout(this).apply {
            setBackgroundColor(Color.parseColor("#F0000000"))
            isClickable = true
            isFocusable = true
        }

        val content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(64, 64, 64, 64)
        }

        // Lock icon
        val lockIcon = TextView(this).apply {
            text = "\uD83D\uDD12"
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 64f)
            gravity = Gravity.CENTER
        }

        // Title
        val title = TextView(this).apply {
            text = "App Locked"
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 28f)
            setTextColor(Color.WHITE)
            typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
            setPadding(0, 24, 0, 0)
        }

        // Get blocked app name
        val blockedName = try {
            packageManager.getApplicationLabel(
                packageManager.getApplicationInfo(blockedPackage, 0)
            ).toString()
        } catch (_: Exception) { blockedPackage }

        // Message
        val message = TextView(this).apply {
            text = "$blockedName has been locked by AuraMax.\nGo back or open AuraMax to learn and earn Aura!"
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 15f)
            setTextColor(Color.parseColor("#A0AEC0"))
            gravity = Gravity.CENTER
            setPadding(0, 16, 0, 0)
            setLineSpacing(8f, 1f)
        }

        // "Open AuraMax" button
        val button = Button(this).apply {
            text = "Open AuraMax"
            setTextColor(Color.WHITE)
            setBackgroundColor(Color.parseColor("#6C63FF"))
            setPadding(48, 24, 48, 24)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
            typeface = Typeface.DEFAULT_BOLD

            setOnClickListener {
                // Open AuraMax
                val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
                if (launchIntent != null) {
                    launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                    startActivity(launchIntent)
                }
            }
        }

        content.addView(lockIcon)
        content.addView(title)
        content.addView(message)

        val buttonParams = LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ).apply { topMargin = 48 }
        content.addView(button, buttonParams)

        val contentParams = FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.WRAP_CONTENT,
            FrameLayout.LayoutParams.WRAP_CONTENT
        ).apply { gravity = Gravity.CENTER }
        container.addView(content, contentParams)

        overlayView = container
        wm.addView(container, params)
        isOverlayShowing = true
    }

    private fun hideOverlay() {
        if (overlayView != null) {
            try {
                val wm = getSystemService(Context.WINDOW_SERVICE) as WindowManager
                wm.removeView(overlayView)
            } catch (_: Exception) {}
            overlayView = null
            isOverlayShowing = false
        }
    }

    // ── Notification ────────────────────────────────────────────────────

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "AuraMax App Lock",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Monitors app usage to enforce app locks"
            }
            val nm = getSystemService(NotificationManager::class.java)
            nm.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): Notification {
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, CHANNEL_ID)
                .setContentTitle("AuraMax Active")
                .setContentText("Monitoring app usage \u2022 ${lockedPackages.size} app(s) locked")
                .setSmallIcon(android.R.drawable.ic_lock_lock)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .build()
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(this)
                .setContentTitle("AuraMax Active")
                .setContentText("Monitoring app usage")
                .setSmallIcon(android.R.drawable.ic_lock_lock)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .build()
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    private fun parseLockedPackages(intent: Intent) {
        val json = intent.getStringExtra(EXTRA_LOCKED_PACKAGES) ?: "[]"
        try {
            val arr = JSONArray(json)
            lockedPackages.clear()
            for (i in 0 until arr.length()) {
                lockedPackages.add(arr.getString(i))
            }
        } catch (_: Exception) {}
    }
}
