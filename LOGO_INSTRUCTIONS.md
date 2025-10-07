# TRE Logo Setup Instructions

## 🎯 **To Add Your TRE Logo:**

1. **Save your logo file** as `tre-logo.png` in the main project folder:
   - File path: `C:\Users\Tucke\OneDrive\Desktop\TRE App\tre-logo.png`
   - Format: PNG (recommended) or JPG
   - Size: Any size (will be resized to 40px height)

2. **The logo will appear** in the top-left corner of the website
3. **It will display** next to "CRM" text

## 🎨 **Current Styling:**
- **Height**: 40px (auto-width)
- **Position**: Left side of header
- **Background**: Transparent (will work on dark header)
- **Responsive**: Scales properly on all devices

## 🔧 **If You Need to Adjust:**
- **Size**: Change `height: 40px` in `styles.css` (line 51)
- **Position**: Adjust `gap: 12px` in `styles.css` (line 44)
- **Alignment**: Modify `align-items: center` in `styles.css` (line 43)

## 📁 **File Structure:**
```
TRE App/
├── index.html
├── styles.css
├── script.js
├── tre-logo.png  ← Add your logo here
└── ...
```

**Once you add the logo file, push the changes and it will appear on your live site!**
