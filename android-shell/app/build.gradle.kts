plugins {
    id("com.android.application")
}

dependencies {
    implementation("androidx.core:core:1.13.1")
}

android {
    namespace = "top.mvpdark.opc"
    compileSdk = 35

    signingConfigs {
        create("release") {
            val storeFilePath = providers.gradleProperty("OPC_RELEASE_STORE_FILE").orNull
            val storePasswordValue = providers.gradleProperty("OPC_RELEASE_STORE_PASSWORD").orNull
            val keyAliasValue = providers.gradleProperty("OPC_RELEASE_KEY_ALIAS").orNull
            val keyPasswordValue = providers.gradleProperty("OPC_RELEASE_KEY_PASSWORD").orNull
            if (
                storeFilePath != null &&
                storePasswordValue != null &&
                keyAliasValue != null &&
                keyPasswordValue != null
            ) {
                storeFile = file(storeFilePath)
                storePassword = storePasswordValue
                keyAlias = keyAliasValue
                keyPassword = keyPasswordValue
            }
        }
    }

    defaultConfig {
        applicationId = "top.mvpdark.opc"
        minSdk = 23
        targetSdk = 35
        versionCode = 5
        versionName = "0.1.4"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("release")
        }
    }
}
