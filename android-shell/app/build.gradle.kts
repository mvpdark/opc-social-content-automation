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
        versionCode = 7
        versionName = "0.1.6"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("release")
        }
    }
}

val androidArtifactsDir = rootProject.layout.projectDirectory.dir("../artifacts/android")

tasks.register<Copy>("copyDebugApkToArtifacts") {
    from(layout.buildDirectory.file("outputs/apk/debug/app-debug.apk")) {
        rename { "ompc-workstation-debug.apk" }
    }
    from(layout.buildDirectory.file("outputs/apk/debug/app-debug.apk")) {
        rename { "opc-mobile-webview-debug.apk" }
    }
    into(androidArtifactsDir)
}

tasks.register<Copy>("copyReleaseApkToArtifacts") {
    dependsOn("assembleRelease")
    from(layout.buildDirectory.file("outputs/apk/release/app-release.apk")) {
        rename { "ompc-workstation-release.apk" }
    }
    from(layout.buildDirectory.file("outputs/apk/release/app-release.apk")) {
        rename { "opc-mobile-webview-release.apk" }
    }
    into(androidArtifactsDir)
}

tasks.matching { it.name == "assembleDebug" }.configureEach {
    finalizedBy("copyDebugApkToArtifacts")
}
