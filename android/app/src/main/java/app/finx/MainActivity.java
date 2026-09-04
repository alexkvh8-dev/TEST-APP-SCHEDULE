package app.finx;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
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
import androidx.core.content.FileProvider;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import java.io.File;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.Locale;

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
    /** Where the camera was told to write the photo, so it can be read back
     *  even on devices whose camera app returns no result Intent at all. */
    private Uri cameraPhotoUri;

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

            /**
             * <input type="file"> for receipt photos.
             *
             * The camera branch needs somewhere to save to before it launches —
             * without EXTRA_OUTPUT the camera app has nowhere to put the photo,
             * so onActivityResult comes back with no data and the whole capture
             * is silently discarded. cameraPhotoUri is where we told it to write;
             * onActivityResult reads the file back from there.
             */
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                                             FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                cameraPhotoUri = null;

                Intent pick = params.createIntent();
                Intent chooser = new Intent(Intent.ACTION_CHOOSER);
                chooser.putExtra(Intent.EXTRA_INTENT, pick);
                chooser.putExtra(Intent.EXTRA_TITLE, "Add a receipt");

                // Offering the camera alongside the gallery matters here: a
                // receipt is usually in your hand, not already in your photos.
                // If the photo file cannot be prepared for some reason, the
                // camera option is simply left out — gallery picking still works.
                File photoFile = createEmptyPhotoFile();
                Uri photoUri = photoFile != null ? safeUriForFile(photoFile) : null;

                if (photoUri != null) {
                    cameraPhotoUri = photoUri;

                    Intent camera = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
                    camera.putExtra(MediaStore.EXTRA_OUTPUT, photoUri);
                    camera.addFlags(
                            Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);

                    // A permission granted only via those flags does not reliably
                    // reach the resolved app when the intent sits inside
                    // EXTRA_INITIAL_INTENTS rather than being launched directly —
                    // a well-documented Android quirk, not a device-specific one.
                    // The camera opens, the write silently fails, and it closes
                    // with nothing captured. Granting explicitly to every package
                    // that can handle the capture is the reliable fix.
                    for (ResolveInfo info : getPackageManager().queryIntentActivities(camera, 0)) {
                        grantUriPermission(info.activityInfo.packageName, photoUri,
                                Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                                        | Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    }

                    chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[]{camera});
                }

                try {
                    startActivityForResult(chooser, REQ_FILE_CHOOSER);
                } catch (ActivityNotFoundException e) {
                    fileCallback = null;
                    cameraPhotoUri = null;
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
        if (resultCode == Activity.RESULT_OK) {
            if (data != null && data.getDataString() != null) {
                results = new Uri[]{Uri.parse(data.getDataString())};
            } else if (data != null && data.getClipData() != null) {
                int count = data.getClipData().getItemCount();
                results = new Uri[count];
                for (int i = 0; i < count; i++) {
                    results[i] = data.getClipData().getItemAt(i).getUri();
                }
            } else if (cameraPhotoUri != null) {
                // A successful camera capture returns no data Intent at all —
                // the photo is exactly where we told MediaStore to write it.
                results = new Uri[]{cameraPhotoUri};
            }
        }
        // A null result is how the WebView is told the picker was cancelled;
        // without it the file input stays stuck and never reopens.
        fileCallback.onReceiveValue(results);
        fileCallback = null;

        if (cameraPhotoUri != null) {
            // Undo the explicit per-package grants made when the chooser opened —
            // no reason to leave several apps holding write access to our files
            // directory longer than the one capture needed.
            revokeUriPermission(cameraPhotoUri,
                    Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
            cameraPhotoUri = null;
        }
    }

    /** A fresh, empty jpg the camera app can write the receipt photo into. */
    private File createEmptyPhotoFile() {
        try {
            File dir = getExternalFilesDir(Environment.DIRECTORY_PICTURES);
            if (dir == null) return null;
            if (!dir.exists() && !dir.mkdirs()) return null;
            String name = "receipt-" + new SimpleDateFormat("yyyyMMdd-HHmmss", Locale.US).format(new Date());
            return File.createTempFile(name, ".jpg", dir);
        } catch (IOException e) {
            return null;
        }
    }

    /** FileProvider throws if the file falls outside the declared paths — this
     *  just means "no camera option" rather than breaking the whole chooser. */
    private Uri safeUriForFile(File file) {
        try {
            return FileProvider.getUriForFile(this, getPackageName() + ".fileprovider", file);
        } catch (IllegalArgumentException e) {
            return null;
        }
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
