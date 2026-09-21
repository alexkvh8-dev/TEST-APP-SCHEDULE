package app.finx;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Matrix;
import android.media.ExifInterface;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
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

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.text.SimpleDateFormat;
import java.util.Date;
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
    private static final int REQ_NATIVE_CAMERA = 102;
    private static final int REQ_CAMERA_PERMISSION = 103;

    /** Longest edge of the JPEG handed back to the page. A receipt is text on
     *  paper; past this the reader gains nothing and the transfer gets slow. */
    private static final int MAX_PHOTO_EDGE = 1400;
    private static final int PHOTO_QUALITY = 82;

    private WebView webView;
    private ValueCallback<Uri[]> fileCallback;
    private PermissionRequest pendingWebPermission;
    /** Where the camera was told to write the photo, so it can be read back
     *  even on devices whose camera app returns no result Intent at all. */
    private Uri cameraPhotoUri;
    /** The file behind {@link #cameraPhotoUri}, kept so it can be deleted once
     *  the bytes are in the page. */
    private File cameraPhotoFile;

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
             * <input type="file"> — picking an existing image.
             *
             * The camera used to be bolted onto this chooser through
             * EXTRA_INITIAL_INTENTS. That never worked reliably: an intent
             * nested inside a chooser does not carry its Uri grant to the app
             * that eventually handles it, so the camera opened and then had
             * nowhere it was allowed to write. Capture now has its own path
             * (see {@link #startNativeCamera}) and this handles only the
             * gallery, which is the one thing a chooser is actually good at.
             */
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                                             FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;

                Intent pick = params.createIntent();
                try {
                    startActivityForResult(
                            Intent.createChooser(pick, "Choose a receipt"), REQ_FILE_CHOOSER);
                } catch (ActivityNotFoundException e) {
                    fileCallback = null;
                    return false;
                }
                return true;
            }
        });

        /*
         * The page asks for the camera through this rather than through a file
         * input. addJavascriptInterface hands the named object to whatever is
         * loaded in the WebView, so it is only safe because shouldOverrideUrlLoading
         * above keeps every other origin out of this WebView — a third-party page
         * can never reach FinXNative.
         */
        webView.addJavascriptInterface(new NativeBridge(), "FinXNative");

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

    /**
     * What the page can call. Everything here arrives on a binder thread, so it
     * only ever hands work to the UI thread.
     */
    private class NativeBridge {
        /** Lets the page show a camera button only where one will actually work. */
        @JavascriptInterface
        public boolean hasCamera() {
            return true;
        }

        /**
         * Opens the camera. The photo comes back asynchronously, as a call to
         * window.__finxCameraResult(dataUrl) — or __finxCameraResult(null) if
         * the capture was cancelled or failed, so the page never hangs waiting.
         */
        @JavascriptInterface
        public void takePhoto() {
            runOnUiThread(MainActivity.this::startNativeCamera);
        }
    }

    private void startNativeCamera() {
        /*
         * An app that declares CAMERA in its manifest must also hold it at
         * runtime before ACTION_IMAGE_CAPTURE will do anything — Android refuses
         * the capture on the app's behalf even though the camera app has the
         * permission itself. We declare CAMERA for getUserMedia, so we have to
         * ask for it here too, and nothing in the old chooser path ever did.
         */
        if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.CAMERA)
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this,
                    new String[]{android.Manifest.permission.CAMERA}, REQ_CAMERA_PERMISSION);
            return;
        }
        launchCamera();
    }

    private void launchCamera() {
        cameraPhotoFile = createEmptyPhotoFile();
        cameraPhotoUri = cameraPhotoFile != null ? safeUriForFile(cameraPhotoFile) : null;
        if (cameraPhotoUri == null) {
            notifyWebCameraResult(null);
            return;
        }

        Intent camera = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
        camera.putExtra(MediaStore.EXTRA_OUTPUT, cameraPhotoUri);
        camera.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                | Intent.FLAG_GRANT_READ_URI_PERMISSION);

        // The flags above cover the app that handles the intent, but only once
        // it has been resolved. Granting to every candidate up front costs
        // nothing and removes the last ordering assumption.
        for (ResolveInfo info : getPackageManager().queryIntentActivities(camera, 0)) {
            grantUriPermission(info.activityInfo.packageName, cameraPhotoUri,
                    Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                            | Intent.FLAG_GRANT_READ_URI_PERMISSION);
        }

        try {
            startActivityForResult(camera, REQ_NATIVE_CAMERA);
        } catch (ActivityNotFoundException e) {
            clearCameraPhoto();
            notifyWebCameraResult(null);
        }
    }

    /**
     * Hands the captured photo to the page, or null when there is none.
     *
     * The payload is a base64 data URL, so it contains only characters that are
     * safe to drop straight into a JavaScript string literal — no quotes, no
     * backslashes, nothing that could break out of it.
     */
    private void notifyWebCameraResult(final String dataUrl) {
        runOnUiThread(() -> {
            if (webView == null) return;
            String arg = dataUrl == null ? "null" : "\"" + dataUrl + "\"";
            webView.evaluateJavascript(
                    "(function(){if(window.__finxCameraResult){window.__finxCameraResult("
                            + arg + ");}})();", null);
        });
    }

    /**
     * Reads the captured file, downscales it and encodes it for the page.
     *
     * Decoding happens off the UI thread: a 12 MP photo is tens of megabytes
     * once decoded, and doing that on the main thread is how you get an ANR
     * right after the shutter. Downscaling here rather than in the page also
     * keeps the string crossing the bridge in the hundreds of kilobytes.
     */
    private void readPhotoAndNotifyWeb(final Uri uri, final File file) {
        new Thread(() -> {
            String dataUrl = null;
            try {
                dataUrl = encodeScaledJpeg(uri);
            } catch (Exception ignored) {
                // Falls through to null: the page shows "could not read that
                // photo" rather than sitting on a spinner forever.
            } finally {
                if (file != null) {
                    //noinspection ResultOfMethodCallIgnored
                    file.delete();
                }
            }
            notifyWebCameraResult(dataUrl);
        }).start();
    }

    private String encodeScaledJpeg(Uri uri) throws IOException {
        BitmapFactory.Options bounds = new BitmapFactory.Options();
        bounds.inJustDecodeBounds = true;
        try (InputStream in = getContentResolver().openInputStream(uri)) {
            BitmapFactory.decodeStream(in, null, bounds);
        }
        int longest = Math.max(bounds.outWidth, bounds.outHeight);
        if (longest <= 0) return null;

        // Subsample on the way in so the full-size bitmap never exists in memory.
        BitmapFactory.Options opts = new BitmapFactory.Options();
        opts.inSampleSize = 1;
        while (longest / opts.inSampleSize > MAX_PHOTO_EDGE * 2) {
            opts.inSampleSize *= 2;
        }

        Bitmap bitmap;
        try (InputStream in = getContentResolver().openInputStream(uri)) {
            bitmap = BitmapFactory.decodeStream(in, null, opts);
        }
        if (bitmap == null) return null;

        bitmap = applyExifRotation(uri, bitmap);

        float scale = Math.min(1f,
                (float) MAX_PHOTO_EDGE / Math.max(bitmap.getWidth(), bitmap.getHeight()));
        if (scale < 1f) {
            Bitmap scaled = Bitmap.createScaledBitmap(bitmap,
                    Math.round(bitmap.getWidth() * scale),
                    Math.round(bitmap.getHeight() * scale), true);
            if (scaled != bitmap) bitmap.recycle();
            bitmap = scaled;
        }

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        bitmap.compress(Bitmap.CompressFormat.JPEG, PHOTO_QUALITY, out);
        bitmap.recycle();

        return "data:image/jpeg;base64," + Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP);
    }

    /**
     * Most phones store the photo in sensor orientation and record the rotation
     * in EXIF. The reader sees raw pixels, so a receipt photographed upright
     * would reach it lying on its side and read as gibberish.
     */
    private Bitmap applyExifRotation(Uri uri, Bitmap bitmap) {
        int degrees;
        try (InputStream in = getContentResolver().openInputStream(uri)) {
            if (in == null) return bitmap;
            int orientation = new ExifInterface(in).getAttributeInt(
                    ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL);
            switch (orientation) {
                case ExifInterface.ORIENTATION_ROTATE_90: degrees = 90; break;
                case ExifInterface.ORIENTATION_ROTATE_180: degrees = 180; break;
                case ExifInterface.ORIENTATION_ROTATE_270: degrees = 270; break;
                default: return bitmap;
            }
        } catch (IOException e) {
            return bitmap;
        }

        Matrix matrix = new Matrix();
        matrix.postRotate(degrees);
        Bitmap rotated = Bitmap.createBitmap(
                bitmap, 0, 0, bitmap.getWidth(), bitmap.getHeight(), matrix, true);
        if (rotated != bitmap) bitmap.recycle();
        return rotated;
    }

    private void clearCameraPhoto() {
        if (cameraPhotoUri != null) {
            revokeUriPermission(cameraPhotoUri,
                    Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
        }
        cameraPhotoUri = null;
        cameraPhotoFile = null;
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

        if (requestCode == REQ_CAMERA_PERMISSION) {
            boolean ok = results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED;
            if (ok) {
                launchCamera();
            } else {
                // Tell the page rather than leaving its button spinning; it
                // offers the gallery instead.
                notifyWebCameraResult(null);
            }
            return;
        }

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

        if (requestCode == REQ_NATIVE_CAMERA) {
            Uri uri = cameraPhotoUri;
            File file = cameraPhotoFile;
            // The grants are no longer needed once the shutter has closed; the
            // file itself stays readable to us because it is ours.
            clearCameraPhoto();

            boolean captured = resultCode == Activity.RESULT_OK
                    && uri != null && file != null && file.length() > 0;
            if (captured) {
                readPhotoAndNotifyWeb(uri, file);
            } else {
                if (file != null) {
                    //noinspection ResultOfMethodCallIgnored
                    file.delete();
                }
                notifyWebCameraResult(null);
            }
            return;
        }

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
