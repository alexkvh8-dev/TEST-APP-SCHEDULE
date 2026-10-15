import {Config} from '@remotion/cli/config';

// Lossless frames into a high-quality H.264 encode: the scene is mostly dark
// gradients, which band and block badly with JPEG frames or a high CRF.
Config.setVideoImageFormat('png');
Config.setCodec('h264');
Config.setCrf(14);
Config.setPixelFormat('yuv420p');
Config.setOverwriteOutput(true);

// GPU compositing through SwiftShader. Chrome's default software path
// occasionally drops layers from the 3D scene (the floating cursor).
Config.setChromiumOpenGlRenderer('swangle');
