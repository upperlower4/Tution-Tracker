# TuitionTracker Logo & Icon Customize Guide

## 🎨 App Logo Change করার Steps

### Option 1: GitHub Actions দিয়ে Automatic (Recommended)

**Step 1: Logo Files তৈরি করুন**

নিচের sizes এ PNG logo তৈরি করুন (transparent background):

```
android/app/src/main/res/
├── mipmap-mdpi/
│   └── ic_launcher.png (48x48)
│   └── ic_launcher_foreground.png (48x48)
├── mipmap-hdpi/
│   └── ic_launcher.png (72x72)
│   └── ic_launcher_foreground.png (72x72)
├── mipmap-xhdpi/
│   └── ic_launcher.png (96x96)
│   └── ic_launcher_foreground.png (96x96)
├── mipmap-xxhdpi/
│   └── ic_launcher.png (144x144)
│   └── ic_launcher_foreground.png (144x144)
├── mipmap-xxxhdpi/
│   └── ic_launcher.png (192x192)
│   └── ic_launcher_foreground.png (192x192)
```

**Step 2: Online Tool ব্যবহার করুন (Easiest)**
1. https://appicon.co/ এ যান
2. আপনার logo upload করুন (1024x1024 recommended)
3. Download করে `android/app/src/main/res/` এ paste করুন

**Step 3: App Name Change করুন**

`capacitor.config.ts`:
```typescript
const config: CapacitorConfig = {
  appId: 'com.yourname.tuitiontracker',  // ← Unique ID
  appName: 'Your App Name',               // ← এটা change করুন
  webDir: 'dist',
};
```

### Option 2: Easy Online Generator

https://www.figma.com/community/plugin/1165821592159049190/App-Icon-Generator

## 📱 APK Build Process

**Manual Trigger (আপনি চাইলে তখনই):**

1. GitHub repository তে যান
2. Actions tab → "Build Android APK" 
3. "Run workflow" button click করুন
4. APK name লিখুন (optional, default: TuitionTracker)
5. Run!

**Automatic নয় - শুধু আপনি চাইলে!**

## 🔄 Update Process

**Version Update:**
1. `package.json` এ version change করুন:
   ```json
   "version": "1.0.1"  // 1.0.0 থেকে বাড়ান
   ```

2. GitHub এ push করুন:
   ```bash
   git add .
   git commit -m "v1.0.1 - New features"
   git push origin main
   ```

3. GitHub Actions এ গিয়ে manually trigger করুন

**Users কে Update দিন:**
- New APK download করুন
- WhatsApp/Bluetooth দিয়ে share করুন
- Phone এ install করুন (auto replace old version)
- Data loss হবে না!

## 📁 Logo Files Structure

```
project/
├── public/
│   ├── icon-192.png      # PWA icon
│   ├── icon-512.png      # PWA icon
│   └── favicon.ico       # Browser icon
├── android/              # GitHub Actions এ auto-create হবে
│   └── app/src/main/res/
│       └── mipmap-*/    # Android icons
```

## ⚡ Quick Tips

- **Logo Size**: Square (1:1 ratio), minimum 512x512
- **Format**: PNG with transparent background
- **Colors**: Simple design, high contrast
- **Text**: না থাকলে ভালো (small icon এ পড়া যায় না)

## 🎯 Example Workflow

1. Logo design করুন (Canva/Figma ব্যবহার করুন)
2. https://appicon.co/ দিয়ে all sizes generate করুন
3. Files GitHub এ upload করুন
4. GitHub Actions trigger করুন
5. APK download করুন!
