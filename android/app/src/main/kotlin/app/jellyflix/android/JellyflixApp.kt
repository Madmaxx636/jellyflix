package app.jellyflix.android

import android.app.Application
import android.media.MediaCodecList
import android.os.Build
import app.jellyflix.android.data.Capabilities
import app.jellyflix.android.data.Connector
import app.jellyflix.android.data.Http
import app.jellyflix.android.data.Store
import app.jellyflix.android.data.TrustingClient
import coil.ImageLoader
import coil.ImageLoaderFactory

class JellyflixApp : Application(), ImageLoaderFactory {
    lateinit var store: Store
    lateinit var http: Http
    lateinit var connector: Connector
    lateinit var capabilities: Capabilities

    override fun onCreate() {
        super.onCreate()
        store = Store(this)
        http = Http(TrustingClient(store).builder().build(), store.deviceId, "${Build.MANUFACTURER} ${Build.MODEL}".trim(), BuildConfig.VERSION_NAME)
        connector = Connector(http)
        capabilities = detectCapabilities()
    }

    /** Pictures load through the same client, so a server whose certificate was trusted shows its covers too. */
    override fun newImageLoader(): ImageLoader = ImageLoader.Builder(this).okHttpClient(http.client).build()

    /** Asks the device's decoders what they can play, so the server converts as little as possible. */
    private fun detectCapabilities(): Capabilities {
        val types = try { MediaCodecList(MediaCodecList.ALL_CODECS).codecInfos.filter { !it.isEncoder }.flatMap { it.supportedTypes.toList() }.map { it.lowercase() }.toSet() }
        catch (e: Exception) { emptySet() }
        return Capabilities(
            hevc = "video/hevc" in types, av1 = "video/av01" in types, vp9 = "video/x-vnd.on2.vp9" in types,
            ac3 = "audio/ac3" in types, eac3 = "audio/eac3" in types, dts = false,
        )
    }
}
