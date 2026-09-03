package app.finx;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.MediaStore;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import androidx.activity.OnBackPressedCallback;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

/**
 * FinX in a plain WebView.
 *
 * This is deliberately not a Trusted Web Activity. A TWA asks Chrome to render
 * the page, and when Chrome cannot — it is not the default browser, or the
 * device ships its own — Android falls back to a browser tab, address bar and
 * all. A WebView is part of the app process, so there is no browser UI that
 * could appear and nothing to verify with Digital Asset Links.
 *
 * What that costs: web push does not work here, so the inactivity reminders and
 * the scheduled reports will not arrive in this build. Everything else does.
 */
public class MainActivity extends AppCompatActivity {

    private static final int REQ_PERMISSIONS = 100;
    private static final int REQ_FILE_CHOOSER = 101;

    private WebView webView;
    private ValueCallback<Uri[]> fileCallback;
    private PermissionRequest pendingWebPermission;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        FrameLayout root = new FrameLayout(this);
        root.setLayoutParams(new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        // The page draws its own dark or light ground; this only covers the
        // instant before first paint.
        root.setBackgroundColor(0xFF0F0F0D);

        webView = new WebView(this);
        root.addView(webView, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(root);

        // Keep content out from under the status bar and the gesture bar.
        ViewCompat.setOnApplyWindowInsetsListener(root, (v, windowInsets) -> {
            Insets bars = windowInsets.getInsets(
                    WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.ime());
            v.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            return WindowInsetsCompat.CONSUMED;
        });

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);

        // Sessions are cookie-based, so cookies have to survive a restart or
        // you would sign in again every launch.
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                String host = url.getHost();
                String appHost = Uri.parse(BuildConfig.APP_URL).getHost();
                // Our own pages stay in the app; anything else opens in the
                // real browser, where the user can see the address they are on.
                if (host != null && appHost != null && host.equalsIgnoreCase(appHost)) {
                    return false;
                }
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, url));
                } catch (ActivityNotFoundException ignored) {
                    return false;
                }
                return true;
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            /** getUserMedia for the microphone, used by voice logging. */
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> {
                    pendingWebPermission = request;
                    if (hasDevicePermissions()) {
                        request.grant(request.getResources());
                        pendingWebPermission = null;
                    } else {
                        askForDevicePermissions();
                    }
                });
            }

            /** <input type="file"> for receipt photos. */
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                                             FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;

                Intent pick = params.createIntent();
                Intent camera = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);

                Intent chooser = new Intent(Intent.ACTION_CHOOSER);
                chooser.putExtra(Intent.EXTRA_INTENT, pick);
                chooser.putExtra(Intent.EXTRA_TITLE, "Add a receipt");
                // Offering the camera alongside the gallery matters here: a
                // receipt is usually in your hand, not already in your photos.
                chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[]{camera});

                try {
                    startActivityForResult(chooser, REQ_FILE_CHOOSER);
                } catch (ActivityNotFoundException e) {
                    fileCallback = null;
                    return false;
                }
                return true;
            }
        });

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack();
                } else {
                    finish();
                }
            }
        });

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState);
        } else {
            webView.loadUrl(BuildConfig.APP_URL);
        }
    }

    private boolean hasDevicePermissions() {
        return ContextCompat.checkSelfPermission(this, android.Manifest.permission.CAMERA)
                == PackageManager.PERMISSION_GRANTED
                && ContextCompat.checkSelfPermission(this, android.Manifest.permission.RECORD_AUDIO)
                == PackageManager.PERMISSION_GRANTED;
    }

    private void askForDevicePermissions() {
        ActivityCompat.requestPermissions(this, new String[]{
                android.Manifest.permission.CAMERA,
                android.Manifest.permission.RECORD_AUDIO,
        }, REQ_PERMISSIONS);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions,
                                           @NonNull int[] results) {
        super.onRequestPermissionsResult(requestCode, permissions, results);
        if (requestCode != REQ_PERMISSIONS || pendingWebPermission == null) return;

        boolean granted = results.length > 0;
        for (int r : results) {
            if (r != PackageManager.PERMISSION_GRANTED) granted = false;
        }

        if (granted) {
            pendingWebPermission.grant(pendingWebPermission.getResources());
        } else {
            // Denying leaves the page's own fallback in charge — voice logging
            // offers a text box rather than failing outright.
            pendingWebPermission.deny();
        }
        pendingWebPermission = null;
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != REQ_FILE_CHOOSER || fileCallback == null) return;

        Uri[] results = null;
        if (resultCode == Activity.RESULT_OK && data != null) {
            if (data.getDataString() != null) {
                results = new Uri[]{Uri.parse(data.getDataString())};
            } else if (data.getClipData() != null) {
                int count = data.getClipData().getItemCount();
                results = new Uri[count];
                for (int i = 0; i < count; i++) {
                    results[i] = data.getClipData().getItemAt(i).getUri();
                }
            }
        }
        // A null result is how the WebView is told the picker was cancelled;
        // without it the file input stays stuck and never reopens.
        fileCallback.onReceiveValue(results);
        fileCallback = null;
    }

    @Override
    protected void onSaveInstanceState(@NonNull Bundle outState) {
        super.onSaveInstanceState(outState);
        webView.saveState(outState);
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            ((ViewGroup) webView.getParent()).removeView(webView);
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
