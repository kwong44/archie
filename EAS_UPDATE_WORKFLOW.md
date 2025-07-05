# 🚀 EAS Update Workflow - Rapid Frontend Testing

## Overview
EAS Update allows you to push JavaScript/React Native changes to your existing builds **without rebuilding the native binary**. Perfect for testing frontend changes on TestFlight builds!

---

## 🎯 **When to Use EAS Update vs Full Rebuild**

### ✅ **Use EAS Update For:**
- UI component changes
- JavaScript logic updates
- Styling/theme changes
- New screens/navigation
- API integration changes
- State management updates
- Text/content changes
- Most React Native code changes

### ❌ **Requires Full Rebuild For:**
- New native dependencies
- Expo SDK upgrades
- App config changes (app.json)
- Native permissions changes
- Push notification setup changes
- Deep linking scheme changes

---

## 🛠️ **Your New Development Workflow**

### **Step 1: Initial Setup (One Time)**
✅ **Already configured!** Your project now has:
- `expo-updates` plugin installed
- Update channels configured in `eas.json`
- Runtime version policy set

### **Step 2: Build Your Base App (When Needed)**
```bash
# For TestFlight testing
eas build --platform ios --profile preview

# For internal testing  
eas build --platform ios --profile development
```

### **Step 3: Push Updates (For Frontend Changes)**
```bash
# Push to preview channel (TestFlight build)
eas update --branch preview --message "Fixed OAuth redirect issue"

# Push to development channel (development build)
eas update --branch development --message "Updated UI styling"
```

---

## 📱 **Your Specific Workflow for OAuth Testing**

### **Immediate Testing Setup:**
1. **Your current TestFlight build** - Keep using it
2. **Push the OAuth fix** - Use EAS Update:
   ```bash
   eas update --branch preview --message "Fixed OAuth redirect URLs"
   ```
3. **Test on device** - Open TestFlight app, check for updates
4. **Verify OAuth flow** - Should now redirect correctly

---

## ⚡ **Daily Development Commands**

### **Push Frontend Changes:**
```bash
# Quick update to preview (TestFlight)
eas update --branch preview --message "Your change description"

# Update development build
eas update --branch development --message "Your change description"

# Push to production (when ready)
eas update --branch production --message "Production release"
```

### **Check Update Status:**
```bash
# See recent updates
eas update:list --branch preview

# View update details
eas update:view [update-id]
```

### **Rollback if Needed:**
```bash
# Rollback to previous update
eas update:republish [previous-update-id] --branch preview
```

---

## 🔄 **Update Channels Explained**

Your project now has **3 update channels**:

1. **`development`** - For local development builds
2. **`preview`** - For TestFlight and internal testing  
3. **`production`** - For App Store releases

Each channel gets updates independently, so you can:
- Test different features on different channels
- Keep production stable while developing
- Push fixes quickly to testers

---

## 📲 **How Updates Work on Device**

### **Automatic Updates:**
- App checks for updates on launch
- Downloads in background
- Applies on next restart

### **Manual Check (For Testing):**
```javascript
// You can add this to your app for testing
import * as Updates from 'expo-updates';

const checkForUpdates = async () => {
  const update = await Updates.checkForUpdateAsync();
  if (update.isAvailable) {
    await Updates.fetchUpdateAsync();
    await Updates.reloadAsync();
  }
};
```

### **Force Refresh:**
- Force close app (swipe up in app switcher)
- Reopen from home screen
- Update will be applied

---

## 🧪 **Testing Your OAuth Fix Right Now**

### **Immediate Steps:**
1. **Push the fix:**
   ```bash
   eas update --branch preview --message "Fixed OAuth redirect to auth/success"
   ```

2. **On your TestFlight device:**
   - Force close Archie app
   - Reopen the app
   - Try Google OAuth sign in
   - Should now redirect to success page correctly

3. **Verify the flow:**
   - Google OAuth → Success page → Onboarding

---

## 📊 **Monitoring Updates**

### **EAS Dashboard:**
- Go to https://expo.dev/accounts/your-username/projects/archie
- View update history, channels, and rollouts
- Monitor update adoption rates

### **Update Metrics:**
- See how many users downloaded each update
- Track update success/failure rates
- Monitor app performance after updates

---

## 🚨 **Best Practices**

### **Messaging:**
```bash
# Good commit messages for updates
eas update --branch preview --message "Fix: OAuth redirect issue"
eas update --branch preview --message "UI: Updated login screen styling"
eas update --branch preview --message "Feature: Added new dashboard cards"
```

### **Testing Strategy:**
1. **Test locally first** - Always test on development build
2. **Push to preview** - Test on TestFlight build  
3. **Validate thoroughly** - Ensure everything works
4. **Push to production** - When confident

### **Emergency Rollbacks:**
- Always keep track of working update IDs
- Test rollback procedure on preview channel first
- Have a rollback plan for production issues

---

## 💡 **Pro Tips**

### **Faster Development:**
1. **Use development build** for daily work
2. **Push to preview** when testing with team/stakeholders
3. **Only rebuild** when adding native dependencies

### **Update Frequency:**
- Push updates as often as needed for testing
- No limit on update frequency
- Updates are lightweight and fast

### **Branch Strategy:**
- Use descriptive branch names in the future:
  ```bash
  eas update --branch preview-oauth-fix
  eas update --branch preview-ui-redesign
  ```

---

## 🎉 **Your New Superpower**

With EAS Update, your development cycle goes from:
- **Before:** Code → Build → Deploy → Test (30+ minutes)
- **After:** Code → Update → Test (2-3 minutes)

This is perfect for your OAuth testing and all future frontend development!

---

## 🔧 **Next Steps**

1. **Test the OAuth fix immediately** with the commands above
2. **Use EAS Update** for all future frontend changes
3. **Only rebuild** when you add native dependencies or update Expo SDK
4. **Monitor updates** via the EAS dashboard

Your TestFlight build is now **updateable** - no more waiting for builds! 🚀 