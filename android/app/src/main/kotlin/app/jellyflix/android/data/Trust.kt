package app.jellyflix.android.data

import okhttp3.OkHttpClient
import java.security.KeyStore
import java.security.MessageDigest
import java.security.cert.CertificateException
import java.security.cert.X509Certificate
import javax.net.ssl.HostnameVerifier
import javax.net.ssl.HttpsURLConnection
import javax.net.ssl.SSLContext
import javax.net.ssl.TrustManager
import javax.net.ssl.TrustManagerFactory
import javax.net.ssl.X509TrustManager

/** A server's certificate that Android doesn't know: made by the owner, or from an authority this device lacks. */
class CertificateNotTrusted(
    val fingerprint: String,
    val subject: String,
    val issuer: String,
    val validFrom: Long,
    val validTo: Long,
) : CertificateException("The server's certificate isn't trusted by this device ($subject).")

fun fingerprint(cert: X509Certificate): String =
    MessageDigest.getInstance("SHA-256").digest(cert.encoded).joinToString(":") { "%02X".format(it) }

/** The untrusted-certificate error somewhere in a chain of causes, if that is what went wrong. */
fun untrustedIn(e: Throwable?): CertificateNotTrusted? {
    var cause = e
    var depth = 0
    while (cause != null && depth++ < 8) { if (cause is CertificateNotTrusted) return cause; cause = cause.cause }
    return null
}

/**
 * Builds the HTTPS client. Certificates Android trusts work as usual. Any other certificate is refused, unless the person has
 * been shown its fingerprint and chose to trust it: that exact certificate is then accepted (also for a host name it wasn't
 * issued for, as with a home server reached by its IP address). A changed certificate is refused again and asked about again.
 */
class TrustingClient(private val store: Store) {
    private val system: X509TrustManager = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm()).run {
        init(null as KeyStore?)
        trustManagers.filterIsInstance<X509TrustManager>().first()
    }

    private val manager = object : X509TrustManager {
        override fun getAcceptedIssuers(): Array<X509Certificate> = system.acceptedIssuers
        override fun checkClientTrusted(chain: Array<X509Certificate>, authType: String) = system.checkClientTrusted(chain, authType)
        override fun checkServerTrusted(chain: Array<X509Certificate>, authType: String) {
            try { system.checkServerTrusted(chain, authType) } catch (e: CertificateException) {
                val leaf = chain.firstOrNull() ?: throw e
                val print = fingerprint(leaf)
                if (print in store.trustedCerts) return
                throw CertificateNotTrusted(print, leaf.subjectX500Principal.name, leaf.issuerX500Principal.name, leaf.notBefore.time, leaf.notAfter.time)
            }
        }
    }

    private val hostnames = HostnameVerifier { host, session ->
        val leaf = try { session.peerCertificates.firstOrNull() as? X509Certificate } catch (e: Exception) { null }
        (leaf != null && fingerprint(leaf) in store.trustedCerts) || HttpsURLConnection.getDefaultHostnameVerifier().verify(host, session)
    }

    fun builder(): OkHttpClient.Builder {
        val context = SSLContext.getInstance("TLS").apply { init(null, arrayOf<TrustManager>(manager), null) }
        return OkHttpClient.Builder().sslSocketFactory(context.socketFactory, manager).hostnameVerifier(hostnames)
    }
}
