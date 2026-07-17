package net.jcode.jtype.securestorage

import android.app.Activity
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import java.nio.charset.StandardCharsets
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

@InvokeArg
class SecretKeyArgs {
    lateinit var key: String
}

@InvokeArg
class SecretValueArgs {
    lateinit var key: String
    lateinit var value: String
}

@TauriPlugin
class SecureStoragePlugin(private val activity: Activity) : Plugin(activity) {
    private val preferences by lazy {
        activity.getSharedPreferences(PREFERENCES_NAME, Activity.MODE_PRIVATE)
    }

    @Command
    fun getSecret(invoke: Invoke) {
        try {
            val args = invoke.parseArgs(SecretKeyArgs::class.java)
            val encoded = preferences.getString(args.key, null)
            resolve(invoke, encoded?.let(::decrypt))
        } catch (error: Exception) {
            invoke.reject("Unable to read secure value: ${error.message}")
        }
    }

    @Command
    fun setSecret(invoke: Invoke) {
        try {
            val args = invoke.parseArgs(SecretValueArgs::class.java)
            check(preferences.edit().putString(args.key, encrypt(args.value)).commit()) {
                "Encrypted preferences commit failed"
            }
            resolve(invoke, args.value)
        } catch (error: Exception) {
            invoke.reject("Unable to store secure value: ${error.message}")
        }
    }

    @Command
    fun deleteSecret(invoke: Invoke) {
        try {
            val args = invoke.parseArgs(SecretKeyArgs::class.java)
            check(preferences.edit().remove(args.key).commit()) {
                "Encrypted preferences commit failed"
            }
            resolve(invoke, null)
        } catch (error: Exception) {
            invoke.reject("Unable to delete secure value: ${error.message}")
        }
    }

    private fun resolve(invoke: Invoke, value: String?) {
        val response = JSObject()
        response.put("value", value)
        invoke.resolve(response)
    }

    private fun secretKey(): SecretKey {
        val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
        (keyStore.getKey(KEY_ALIAS, null) as? SecretKey)?.let { return it }
        val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE)
        generator.init(
            KeyGenParameterSpec.Builder(
                KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setRandomizedEncryptionRequired(true)
                .build(),
        )
        return generator.generateKey()
    }

    private fun encrypt(value: String): String {
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.ENCRYPT_MODE, secretKey())
        val ciphertext = cipher.doFinal(value.toByteArray(StandardCharsets.UTF_8))
        return listOf(cipher.iv, ciphertext)
            .joinToString(":") { Base64.encodeToString(it, Base64.NO_WRAP) }
    }

    private fun decrypt(value: String): String {
        val parts = value.split(":", limit = 2)
        require(parts.size == 2) { "Invalid encrypted value" }
        val iv = Base64.decode(parts[0], Base64.NO_WRAP)
        val ciphertext = Base64.decode(parts[1], Base64.NO_WRAP)
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.DECRYPT_MODE, secretKey(), GCMParameterSpec(128, iv))
        return String(cipher.doFinal(ciphertext), StandardCharsets.UTF_8)
    }

    companion object {
        private const val ANDROID_KEYSTORE = "AndroidKeyStore"
        private const val KEY_ALIAS = "net.jcode.jtype.securestorage.master"
        private const val PREFERENCES_NAME = "jtype-secure-storage"
        private const val TRANSFORMATION = "AES/GCM/NoPadding"
    }
}
