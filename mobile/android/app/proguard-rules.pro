# --- R8 (ativado 04/10/2026: Play Console exigia ofuscação ≥25%, app estava em 2%) ---

# Capacitor: o bridge resolve plugins por reflexão (@CapacitorPlugin) e o JS
# chama métodos nativos pelo nome — não podem ser renomeados/removidos.
-keep class com.getcapacitor.** { *; }
-keepclassmembers class * { @com.getcapacitor.annotation.* <fields>; }
-keepclassmembers class * { @com.getcapacitor.annotation.* <init>(...); }

# Plugins Cordova (capacitor-cordova-android-plugins): classes mapeadas por
# nome em plugin.xml e instanciadas via reflexão em runtime.
-keep class org.apache.cordova.** { *; }
-keep public class * extends org.apache.cordova.CordovaPlugin

# Firebase Messaging: payload de notificação roteia por reflexão em libs de suporte.
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# Warnings benignos de libs de cripto/transporte embutidas em dependências:
-dontwarn org.bouncycastle.**
-dontwarn org.conscrypt.**
-dontwarn org.openjsse.**
