# Мир Раскола для Android

Оболочка-приложение: игра из `site/` кладётся внутрь APK и открывается в WebView как сайт `https://appassets.androidplatform.net/`. Работает без сети, сохранения живут внутри приложения.

APK собирает GitHub Actions (`.github/workflows/android.yml`) при изменениях в `site/` или `android/` и выкладывает его в релиз `android-latest`:
https://github.com/bunkovde-lab/TKGame/releases/download/android-latest/MirRaskola.apk

## Постоянный ключ подписи

Без ключа APK подписывается временным отладочным ключом сборщика. Каждая сборка получает новый ключ, и Android не даст поставить новую версию поверх старой: старую придётся удалить, а вместе с ней удалится и прогресс. Чтобы обновления ставились поверх, один раз создайте ключ и добавьте его в секреты репозитория (Settings → Secrets and variables → Actions):

```
keytool -genkeypair -keystore mirraskola.keystore -alias mirraskola -keyalg RSA -keysize 2048 -validity 10000
base64 -w0 mirraskola.keystore   # → секрет ANDROID_KEYSTORE_B64
```

Ещё нужны секреты `ANDROID_KEYSTORE_PASSWORD` и `ANDROID_KEY_ALIAS` (`mirraskola`), а `ANDROID_KEY_PASSWORD` — только если пароль ключа отличается. Сам файл ключа не коммитьте и храните в надёжном месте: тот же ключ понадобится для Google Play.
